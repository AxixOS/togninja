// Put the voucher images back.
//
// The upload handler used to resolve the storage config independently for the PUT, for the
// URL and again for the thumbnail. getS3Config() refreshes itself in the background — it
// fires refreshStorageConfig() without awaiting and returns the OLD object, and the
// refresh REPLACES the module-level config on a later tick. In an upload handler, "a later
// tick" is any tick after an await.
//
// So this studio, migrated Supabase -> Backblaze, had a voucher image PUT to the old
// Supabase bucket and a Backblaze URL written to the database. The studio saw "upload
// successful" and a blank picture, and the stored URL has 404'd since the moment it was
// written. The handler is fixed (server/lib/storage-snapshot.ts), but a code fix cannot
// repair a row that is already wrong.
//
// This finds every voucher_products image URL that does not resolve, hunts for the object
// wherever it actually landed, copies it into the CURRENT bucket, and repoints the row.
//
// It never deletes anything. The worst case is an extra object in the current bucket.
//
//   npx tsx scripts/gal-repair-voucher-images.ts           report only
//   npx tsx scripts/gal-repair-voucher-images.ts --apply   recover and repoint
import 'dotenv/config';
import { pool } from '../server/db';
import { getStorageSnapshot, publicUrlFor, putObjectVerified, storageKeyFromUrl } from '../server/lib/storage-snapshot';

const APPLY = process.argv.includes('--apply');

interface Row {
  id: string;
  name: string;
  image_url: string | null;
  thumbnail_url: string | null;
}

/** Does this URL actually serve an image? */
async function probe(url: string): Promise<{ ok: boolean; status: number; type: string; bytes: number }> {
  try {
    // HEAD first — cheap. Some object stores answer HEAD differently to GET, so a
    // non-2xx HEAD is confirmed with a ranged GET before being called a failure.
    const h = await fetch(url, { method: 'HEAD' });
    if (h.ok) {
      return { ok: true, status: h.status, type: h.headers.get('content-type') || '', bytes: Number(h.headers.get('content-length') || 0) };
    }
    const g = await fetch(url, { headers: { Range: 'bytes=0-0' } });
    return { ok: g.ok, status: g.status, type: g.headers.get('content-type') || '', bytes: 0 };
  } catch (e: any) {
    return { ok: false, status: 0, type: String(e?.message || 'fetch failed'), bytes: 0 };
  }
}

/**
 * Where else might this object be?
 *
 * The key is the stable part — it was chosen before the provider drifted — so the same key
 * is tried against the other providers this tenant has been configured with, and against
 * the extensions the pipeline could have written (it re-encodes to WebP but used to name
 * the key after the source filename, so a `.jpg` key can hold WebP bytes and vice versa).
 */
async function hunt(originalUrl: string, thumbUrl: string | null): Promise<{ url: string; via: string } | null> {
  const candidates: Array<{ url: string; via: string }> = [];

  // Every storage endpoint this studio has ever been pointed at, newest first.
  const { rows } = await pool.query(
    `SELECT DISTINCT storage_provider, storage_bucket, storage_endpoint
       FROM studio_integrations
      WHERE storage_bucket IS NOT NULL AND storage_bucket <> ''`,
  ).catch(() => ({ rows: [] as any[] }));

  // studio_integrations only holds the CURRENT provider — a migration overwrites it. The
  // provider the object actually went to may exist nowhere but in the URLs already
  // stored on other rows. This tenant's old Supabase bucket, which is where the missing
  // voucher original really is, survives only in studio_configs.logo_url.
  //
  // So harvest live URL prefixes from the database and try the key against each. A prefix
  // is everything up to and including the bucket: Supabase publishes objects under
  // /storage/v1/object/public/<bucket>/, everyone else uses the origin directly.
  const prefixes = new Map<string, string>();
  for (const [label, sql] of [
    ['studio_configs.logo_url', `SELECT logo_url AS u FROM studio_configs WHERE logo_url LIKE 'http%'`],
    ['homepage_images', `SELECT url AS u FROM homepage_images WHERE url LIKE 'http%'`],
    ['voucher_products', `SELECT thumbnail_url AS u FROM voucher_products WHERE thumbnail_url LIKE 'http%'`],
    ['galleries', `SELECT url AS u FROM gallery_images WHERE url LIKE 'http%' LIMIT 50`],
  ] as const) {
    const r = await pool.query(sql).catch(() => ({ rows: [] as any[] }));
    for (const row of r.rows) {
      try {
        const u = new URL(String(row.u));
        const m = u.pathname.match(/^\/storage\/v1\/object\/public\/([^/]+)\//);
        const prefix = m ? `${u.origin}/storage/v1/object/public/${m[1]}/` : `${u.origin}/`;
        if (!prefixes.has(prefix)) prefixes.set(prefix, label);
      } catch { /* not a URL we can learn from */ }
    }
  }

  // Which part of the path is the key? It depends on the URL style, and guessing is how
  // this class of bug happens in the first place — a virtual-hosted URL
  // (bucket.host/key) puts the whole path in the key, while a path-style one
  // (host/bucket/key) does not, and the hostname alone does not reliably tell you which.
  // So do not guess: generate BOTH readings and let the network decide. Two extra HEADs
  // is a trivial price for removing an assumption.
  const keys: string[] = [];
  try {
    const u = new URL(originalUrl);
    const dec = (p: string) => { try { return decodeURIComponent(p); } catch { return p; } };
    const parts = u.pathname.replace(/^\/+/, '').split('/').map(dec).filter(Boolean);
    const supa = parts.indexOf('public');
    if (supa >= 0 && parts[supa - 1] === 'object') {
      keys.push(parts.slice(supa + 2).join('/')); // …/public/<bucket>/<key>
    } else {
      keys.push(parts.join('/'));                  // virtual-hosted: the path IS the key
      if (parts.length > 1) keys.push(parts.slice(1).join('/')); // path-style: drop the bucket
    }
  } catch { /* unusable URL */ }

  for (const key of keys.filter(Boolean)) {
    const exts = ['', '.webp', '.jpg', '.jpeg', '.png'];
    const base = key.replace(/\.(webp|jpe?g|png|avif|gif)$/i, '');
    for (const r of rows) {
      for (const ext of exts) {
        const k = ext ? `${base}${ext}` : key;
        candidates.push({ url: publicUrlFor({ bucket: r.storage_bucket, endpoint: r.storage_endpoint } as any, k), via: `${r.storage_provider}:${r.storage_bucket}` });
      }
    }
    // And the URL as stored, with a different extension, on its own host.
    for (const ext of ['.webp', '.jpg', '.jpeg', '.png']) {
      candidates.push({ url: originalUrl.replace(/\.(webp|jpe?g|png|avif|gif)$/i, ext), via: 'same host, different extension' });
    }

    // The same key under every prefix this tenant demonstrably uses. This is the branch
    // that finds an object left behind by a provider migration.
    const encode = (k: string) => k.split('/').map(encodeURIComponent).join('/');
    for (const [prefix, label] of prefixes) {
      for (const ext of exts) {
        const k = ext ? `${base}${ext}` : key;
        const url = `${prefix}${encode(k)}`;
        if (url !== originalUrl) candidates.push({ url, via: `${prefix} (learned from ${label})` });
      }
    }
  }

  // Last resort: the thumbnail. Lower resolution, but a real picture beats a broken one.
  if (thumbUrl) candidates.push({ url: thumbUrl, via: 'thumbnail (reduced resolution)' });

  const seen = new Set<string>();
  for (const c of candidates) {
    if (c.url === originalUrl || seen.has(c.url)) continue;
    seen.add(c.url);
    const p = await probe(c.url);
    if (p.ok && /^image\//.test(p.type)) return c;
  }
  return null;
}

async function main() {
  const snap = getStorageSnapshot();
  console.log(`\n  Current bucket: ${snap.bucket || '(none)'} @ ${snap.endpoint || '(default)'}`);
  if (!snap.isConfigured) console.log('  WARNING: storage is not configured, so recovery cannot copy anything.');

  const { rows } = await pool.query<Row>(
    `SELECT id, name, image_url, thumbnail_url FROM voucher_products
      WHERE image_url IS NOT NULL OR thumbnail_url IS NOT NULL
      ORDER BY created_at`,
  );

  if (!rows.length) { console.log('\n  No voucher products carry an image.\n'); return 0; }

  let broken = 0, recovered = 0, unrecoverable = 0;

  for (const r of rows) {
    const checks: Array<{ col: 'image_url' | 'thumbnail_url'; url: string }> = [];
    if (r.image_url) checks.push({ col: 'image_url', url: r.image_url });
    if (r.thumbnail_url) checks.push({ col: 'thumbnail_url', url: r.thumbnail_url });

    const results = await Promise.all(checks.map(async (c) => ({ ...c, probe: await probe(c.url) })));
    const bad = results.filter((x) => !x.probe.ok);
    if (!bad.length) {
      console.log(`\n  OK        ${r.name}`);
      continue;
    }

    broken++;
    console.log(`\n  BROKEN    ${r.name}`);
    for (const x of results) {
      console.log(`    ${x.probe.ok ? 'live   ' : `HTTP ${String(x.probe.status).padEnd(3)}`} ${x.col.padEnd(13)} ${x.url.slice(0, 96)}`);
    }

    for (const x of bad) {
      const found = await hunt(x.url, x.col === 'image_url' ? r.thumbnail_url : null);
      if (!found) {
        unrecoverable++;
        console.log(`    -> ${x.col}: the object could not be found anywhere. Re-upload it in the admin.`);
        continue;
      }
      console.log(`    -> found via ${found.via}`);
      console.log(`       ${found.url.slice(0, 110)}`);

      if (!APPLY) { recovered++; continue; }

      // Copy it into the CURRENT bucket so the row stops depending on a provider this
      // studio has already migrated off, then repoint. If the copy fails we still
      // repoint at the URL that works — a live image on the old host beats a 404.
      let finalUrl = found.url;
      const key = storageKeyFromUrl(x.url, snap);
      if (snap.isConfigured && key) {
        try {
          const res = await fetch(found.url);
          if (!res.ok) throw new Error(`source returned HTTP ${res.status}`);
          const body = Buffer.from(await res.arrayBuffer());
          const type = res.headers.get('content-type') || 'image/webp';
          const put = await putObjectVerified(snap, { key, body, contentType: type, cacheControl: 'public, max-age=31536000' });
          finalUrl = put.url;
          console.log(`       copied ${body.length} bytes into ${snap.bucket} as ${key}`);
        } catch (e: any) {
          console.log(`       could not copy into the current bucket (${e?.message}); repointing at the working URL instead`);
        }
      }

      await pool.query(`UPDATE voucher_products SET ${x.col} = $1, updated_at = now() WHERE id = $2`, [finalUrl, r.id]);
      console.log(`       ${x.col} repointed`);
      recovered++;
    }
  }

  console.log(`\n  ${rows.length} product(s) checked, ${broken} with a broken image.`);
  if (!APPLY && recovered) {
    console.log(`  ${recovered} recoverable. Re-run with --apply to fix them.\n`);
    return 0;
  }
  if (APPLY) {
    console.log(`  ${recovered} repaired, ${unrecoverable} need a fresh upload.\n`);
    return unrecoverable ? 1 : 0;
  }
  console.log(unrecoverable ? `  ${unrecoverable} could not be located.\n` : '  Nothing to do.\n');
  return unrecoverable ? 1 : 0;
}

main()
  .then(async (code) => { await pool.end().catch(() => {}); process.exit(code); })
  .catch(async (e) => { console.error('\n  FAILED:', e?.message || e, '\n'); await pool.end().catch(() => {}); process.exit(1); });
