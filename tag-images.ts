// Audit + tag site images (blog covers/in-post + gallery covers) with descriptive
// alt/IPTC/keywords and studio geo, using OpenAI Vision + ExifTool.
//
//   npx tsx -r dotenv/config tag-images.ts            # DRY RUN: audit only, no writes
//   npx tsx -r dotenv/config tag-images.ts --execute  # process + re-upload to B2
//
// Only touches images on OUR Backblaze bucket (skips Unsplash/Pexels/external).
// Studio-type images get Wien-Margareten GPS; wedding/event/on-location get city only.
import { db, pool } from './server/db.js';
import { blogPosts, galleries } from './shared/schema.js';
import {
  analyzeVision, writeIptc, STUDIO_GPS, STUDIO_CITY, STUDIO_SUBLOCATION,
  endExifTool, sniffImageExt, contentTypeFor,
} from './server/services/blogImageAnalysis.js';
import { uploadBufferToB2, fetchImageBuffer } from './server/services/b2Upload.js';
import { exiftool } from 'exiftool-vendored';
import { writeFile, unlink } from 'fs/promises';

const EXECUTE = process.argv.includes('--execute');
const BUCKET = process.env.AWS_S3_BUCKET || '';

type Target = { url: string; context: string; onLocation: boolean; source: string };

const isOurB2 = (url: string) =>
  !!url && (url.includes(`${BUCKET}.`) || url.includes('backblazeb2.com')) && /\.(jpe?g|png|webp)(\?|$)/i.test(url);

const keyFromUrl = (url: string) => decodeURIComponent(new URL(url).pathname).replace(/^\//, '');

// Wedding/event/on-location shoots are not at the studio → no studio GPS.
const isOnLocation = (text: string) => /hochzeit|wedding|event|standesamt|reportage|location|business|corporate|team/i.test(text);

async function readMeta(buf: Buffer) {
  await writeFile('_audit_tmp.jpg', buf);
  try {
    const t: any = await exiftool.read('_audit_tmp.jpg');
    return {
      caption: t['Caption-Abstract'] || t.Description || '',
      keywords: t.Keywords ? (Array.isArray(t.Keywords) ? t.Keywords.length : 1) : 0,
      geo: !!(t.City || t.Location || t['Sub-location'] || t.GPSLatitude),
    };
  } finally { await unlink('_audit_tmp.jpg').catch(() => {}); }
}

async function main() {
  const targets: Target[] = [];

  const posts = await db.select().from(blogPosts);
  for (const p of posts) {
    if (p.status === 'ARCHIVED') continue;
    const ctx = `${p.title}${(p.tags && p.tags.length) ? ' — ' + p.tags.join(', ') : ''}`;
    const onLoc = isOnLocation(`${p.title} ${(p.tags || []).join(' ')}`);
    for (const u of [p.imageUrl, p.imageUrl2, p.imageUrl3]) {
      if (u && isOurB2(u)) targets.push({ url: u, context: ctx, onLocation: onLoc, source: `blog:${p.slug}` });
    }
  }

  const gals = await db.select().from(galleries);
  for (const g of gals) {
    if (g.coverImage && isOurB2(g.coverImage)) {
      const title = (g as any).title || (g as any).name || 'Galerie';
      targets.push({ url: g.coverImage, context: `Galerie: ${title}`, onLocation: isOnLocation(title), source: `gallery:${(g as any).id}` });
    }
  }

  // de-dupe by url
  const seen = new Set<string>();
  const unique = targets.filter(t => (seen.has(t.url) ? false : (seen.add(t.url), true)));

  console.log(`\n=== IMAGE TAGGING ${EXECUTE ? '(EXECUTE)' : '(DRY RUN — no writes)'} ===`);
  console.log(`Targets on our B2: ${unique.length} (blog + gallery covers)\n`);

  let missingMeta = 0, processed = 0, failed = 0;
  for (const t of unique) {
    try {
      const buf = await fetchImageBuffer(t.url);
      const before = await readMeta(buf);
      const lacks = !before.caption || !before.geo;
      if (lacks) missingMeta++;

      if (!EXECUTE) {
        console.log(`${lacks ? '⚠️ ' : '✓ '} [${t.source}] caption:${before.caption ? 'yes' : 'NO'} kw:${before.keywords} geo:${before.geo ? 'yes' : 'NO'}  ${t.url.slice(0, 70)}`);
        continue;
      }

      const vision = await analyzeVision(t.url, t.context);
      const keywords = Array.from(new Set([...(vision.sceneKeywords || []), 'wien', 'new age fotografie'])).slice(0, 12);
      const out = await writeIptc(buf, {
        caption: vision.altText || vision.description || t.context,
        keywords,
        location: STUDIO_CITY,
        sublocation: t.onLocation ? undefined : STUDIO_SUBLOCATION,
        country: 'Österreich',
        gps: t.onLocation ? null : STUDIO_GPS,
        aiGenerated: true,
      });
      await uploadBufferToB2(keyFromUrl(t.url), out, contentTypeFor(sniffImageExt(out)));
      processed++;
      console.log(`✅ [${t.source}] alt="${vision.altText}" gps:${t.onLocation ? 'none(on-location)' : 'studio'}`);
    } catch (e: any) {
      failed++;
      console.log(`❌ [${t.source}] ${e?.message || e}  ${t.url.slice(0, 70)}`);
    }
  }

  console.log(`\n--- ${EXECUTE ? 'Processed' : 'Audit'} ---`);
  console.log(`Total targets: ${unique.length} | missing caption or geo: ${missingMeta}` + (EXECUTE ? ` | tagged: ${processed} | failed: ${failed}` : ''));
  if (!EXECUTE) console.log(`Run with --execute to tag them.`);

  await endExifTool();
  await pool.end();
  process.exit(0);
}
main().catch(async (e) => { console.error('❌ failed:', e); try { await endExifTool(); } catch {} process.exit(1); });
