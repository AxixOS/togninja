// Probe the running server the way an attacker would.
//
// Before this fix, three of these requests succeeded against the live product:
//   GET   /api/galleries/<slug>/images    with the header "Authorization: Bearer x"
//   GET   /api/galleries/<slug>/download  with no header at all — a ZIP of every
//                                         full-resolution photograph in the gallery
//   PATCH /api/galleries/<id>/images/<id>/rating  with no header — overwriting the
//                                         client's own selects and rejects
//
// A gallery slug was the entire security. Anyone forwarded a link, or anyone who guessed
// a slug, had the shoot.
//
// This creates its own throwaway galleries, probes them, and deletes them again, so it
// can be re-run on any instance without needing one to exist.
//
// Run:  node scripts/gal-verify-live.mjs [baseUrl]
import 'dotenv/config';
import pg from 'pg';
import crypto from 'crypto';
import fs from 'fs';

const BASE = process.argv[2] || 'http://localhost:5199';
const PASSWORD = 'probe-password-' + crypto.randomBytes(4).toString('hex');

let bad = 0;
const check = (label, ok, detail = '') => {
  if (!ok) bad++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? '  — ' + detail : ''}`);
};

// IS THE SERVER WE ARE PROBING ACTUALLY RUNNING THE CODE WE JUST WROTE?
//
// A previous run of this suite reported three real-looking FAILs that were nothing of the
// sort: the new server had logged "Server instance exists but NOT listening!" because a
// process from an earlier boot still held the port, so every request went to the old
// binary. The reverse is far worse — a stale server can just as easily report PASS for a
// fix that was never loaded, and a security suite that passes for the wrong reason is
// worse than no suite.
//
// startedAt comes from /api/version. Compare it with the source files under test.
async function assertServerIsFresh() {
  const SOURCES = ['server/routes.ts', 'server/lib/galleryToken.ts', 'server/index.ts'];
  let newest = 0;
  let newestFile = '';
  for (const f of SOURCES) {
    try {
      const m = fs.statSync(f).mtimeMs;
      if (m > newest) { newest = m; newestFile = f; }
    } catch { /* not run from the repo root — skip the guard rather than fail wrongly */ }
  }
  if (!newest) return;

  let version;
  try { version = await fetch(BASE + '/api/version').then((r) => r.json()); }
  catch { console.log('  note: /api/version unreachable, cannot check server freshness\n'); return; }

  const startedAt = Date.parse(version?.startedAt || '');
  if (!startedAt) { console.log('  note: /api/version has no startedAt, cannot check freshness\n'); return; }

  if (startedAt < newest) {
    console.log('\n  STALE SERVER — REFUSING TO RUN');
    console.log(`  ${BASE} started ${new Date(startedAt).toISOString()}`);
    console.log(`  but ${newestFile} was modified ${new Date(newest).toISOString()}`);
    console.log('  Every result would describe the OLD code. Free the port and reboot:');
    console.log('    Get-NetTCPConnection -LocalPort 5199 -State Listen | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }\n');
    process.exit(2);
  }
  console.log(`  server started ${new Date(startedAt).toISOString()}, newer than every source file under test`);
}

await assertServerIsFresh();

const db = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
for (let i = 0; ; i++) {
  // Supabase's pooler resolves intermittently from here; a single attempt is a coin toss.
  try { await db.connect(); break; }
  catch (e) { if (i >= 6) throw e; await new Promise((r) => setTimeout(r, 2500)); }
}

const ids = { a: null, b: null, c: null, imgA: null };
try {
  // Two galleries: the one we hold a token for, and a second to try that token on.
  const mk = async (slug, title) => {
    const r = await db.query(
      `INSERT INTO galleries (title, slug, is_password_protected, password, is_public, download_enabled, status)
       VALUES ($1, $2, true, $3, false, true, 'ACTIVE') RETURNING id`,
      [title, slug, PASSWORD]);
    return r.rows[0].id;
  };
  ids.a = await mk('probe-gallery-a', 'Probe Gallery A');
  ids.b = await mk('probe-gallery-b', 'Probe Gallery B');
  // The state the admin could actually save: protection ON, password never typed.
  const cRow = await db.query(
    `INSERT INTO galleries (title, slug, is_password_protected, password, is_public, download_enabled, status)
     VALUES ('Probe Gallery C', 'probe-gallery-c', true, NULL, false, true, 'ACTIVE') RETURNING id`);
  ids.c = cRow.rows[0].id;

  const img = await db.query(
    `INSERT INTO gallery_images (gallery_id, filename, url)
     VALUES ($1, 'probe.jpg', 'https://example.invalid/probe.jpg') RETURNING id`,
    [ids.a]);
  ids.imgA = img.rows[0].id;

  const hit = (method, path, opts = {}) =>
    fetch(BASE + path, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(opts.token ? { Authorization: 'Bearer ' + opts.token } : {}),
      },
      ...(opts.body ? { body: JSON.stringify(opts.body) } : {}),
    });

  console.log('\n=== the three requests that used to work ===');

  const noHeader = await hit('GET', '/api/galleries/probe-gallery-a/images');
  check('images: no Authorization header is refused', noHeader.status === 401, 'got ' + noHeader.status);

  // The header the old code accepted. It checked presence, never content.
  const junk = await hit('GET', '/api/galleries/probe-gallery-a/images', { token: 'x' });
  check('images: the literal string "x" no longer opens a gallery', junk.status === 403, 'got ' + junk.status);

  // The old token, forged by hand — what an attacker would build after reading the
  // source comment "For now, return a simple token".
  const legacy = Buffer.from(`${ids.a}:attacker@example.com:${Date.now()}`).toString('base64');
  const legacyRes = await hit('GET', '/api/galleries/probe-gallery-a/images', { token: legacy });
  check('images: a hand-built old-format token is refused', legacyRes.status === 403, 'got ' + legacyRes.status);

  const dl = await hit('GET', '/api/galleries/probe-gallery-a/download');
  check('download: no header no longer streams the whole shoot', dl.status === 401, 'got ' + dl.status);
  check('download: the refusal is not a ZIP', !(dl.headers.get('content-type') || '').includes('zip'));

  const dlJunk = await hit('GET', '/api/galleries/probe-gallery-a/download', { token: 'x' });
  check('download: a junk token is refused', dlJunk.status === 403, 'got ' + dlJunk.status);

  const rate = await hit('PATCH', `/api/galleries/${ids.a}/images/${ids.imgA}/rating`, { body: { rating: 'reject' } });
  check('rating: anonymous callers cannot overwrite the selects', rate.status === 401, 'got ' + rate.status);

  console.log('\n=== the wrong password still gets nothing ===');
  const wrong = await hit('POST', '/api/galleries/probe-gallery-a/auth', {
    body: { email: 'c@example.com', password: 'wrong' },
  });
  check('auth: the wrong password is refused', wrong.status === 401, 'got ' + wrong.status);

  console.log('\n=== ...and the real client still gets in ===');
  const authRes = await hit('POST', '/api/galleries/probe-gallery-a/auth', {
    body: { email: 'c@example.com', password: PASSWORD },
  });
  const { token } = await authRes.json().catch(() => ({}));
  check('auth: the right password returns a token', authRes.status === 200 && Boolean(token), 'status ' + authRes.status);
  check('auth: the token is signed, not bare base64', String(token || '').includes('.'));

  if (token) {
    const imgs = await hit('GET', '/api/galleries/probe-gallery-a/images', { token });
    check('images: the issued token opens the gallery', imgs.status === 200, 'got ' + imgs.status);
    const body = await imgs.json().catch(() => []);
    check('images: and returns the image', Array.isArray(body) && body.length === 1, 'length ' + (body?.length ?? '?'));

    // The probe image URL is deliberately unreachable, so a 404/500 here still means
    // the auth passed. Only 401/403 would be a failure.
    const dlOk = await hit('GET', '/api/galleries/probe-gallery-a/download', { token });
    check('download: the issued token is accepted', dlOk.status !== 401 && dlOk.status !== 403, 'got ' + dlOk.status);

    const rateOk = await hit('PATCH', `/api/galleries/${ids.a}/images/${ids.imgA}/rating`, {
      token, body: { rating: 'love' },
    });
    check('rating: the issued token is accepted', rateOk.status === 200, 'got ' + rateOk.status);

    console.log('\n=== a token is good for ONE gallery ===');
    // Gallery B has the same password, but this token was not issued for it. Swapping
    // the slug in the URL is the cheapest attack there is.
    const crossImgs = await hit('GET', '/api/galleries/probe-gallery-b/images', { token });
    check('a token for gallery A does not open gallery B', crossImgs.status === 403, 'got ' + crossImgs.status);
    const crossDl = await hit('GET', '/api/galleries/probe-gallery-b/download', { token });
    check('a token for gallery A does not download gallery B', crossDl.status === 403, 'got ' + crossDl.status);
    const crossRate = await hit('PATCH', `/api/galleries/${ids.b}/images/${ids.imgA}/rating`, {
      token, body: { rating: 'reject' },
    });
    check('a token for gallery A cannot rate gallery B', crossRate.status === 403, 'got ' + crossRate.status);
  }

  console.log('\n=== a gallery marked protected with no password fails CLOSED ===');
  // The admin form let a studio switch protection on and save without typing a password.
  // The check was `isPasswordProtected && gallery.password`, so a NULL password skipped
  // it entirely: the gallery showed as protected in the admin and anyone could walk in
  // with only an email address.
  const misconf = await hit('POST', '/api/galleries/probe-gallery-c/auth', {
    body: { email: 'anyone@example.com' },
  });
  check('an empty password does not open the gallery', misconf.status === 403, 'got ' + misconf.status);
  const misconfBody = await misconf.json().catch(() => ({}));
  check('...and no token is handed out', !misconfBody.token);
  check('...and the visitor is told to contact the photographer',
    String(misconfBody.message || '').includes('photographer'), misconfBody.message || '');

  console.log('\n=== the studio cannot save that state any more ===');
  // This probe is unauthenticated, so a 401 here proves the route is GATED and nothing
  // more — the password guard inside it never runs. Labelled honestly rather than left
  // to read as proof: a check that passes by never executing is worse than no check,
  // and this suite has been bitten by exactly that before.
  const badCreate = await hit('POST', '/api/galleries', {
    body: { title: 'x', isPasswordProtected: true, password: '' },
  });
  check('POST /api/galleries is gated (the guard itself needs a session to exercise)',
    badCreate.status === 400 || badCreate.status === 401, 'got ' + badCreate.status);

  console.log('\n=== the locked gallery gives nothing away before the password ===');
  const meta = await fetch(BASE + '/api/galleries/probe-gallery-a').then((r) => r.json()).catch(() => ({}));
  check('the password is not in the response', !('password' in meta));
  // This endpoint has to stay public — it renders the password prompt — but it was
  // attaching one full-resolution image URL to the reply.
  check('no featured image is attached to a locked gallery', !meta.featuredImage);
  check('the prompt still knows the gallery is locked', meta.isPasswordProtected === true);
  check('...and still knows its title', meta.title === 'Probe Gallery A');

  console.log('\n=== the public list does not publish client email addresses ===');
  const list = await fetch(BASE + '/api/galleries').then((r) => r.json()).catch(() => []);
  const leaks = Array.isArray(list) && list.some((g) => 'clientEmail' in g);
  check('GET /api/galleries carries no clientEmail', !leaks,
    Array.isArray(list) ? list.length + ' public galleries listed' : 'not a list');
} finally {
  // Always clean up, including after a failed assertion — this writes to the real DB.
  if (ids.imgA) await db.query('DELETE FROM gallery_images WHERE id = $1', [ids.imgA]).catch(() => {});
  for (const id of [ids.a, ids.b, ids.c]) if (id) await db.query('DELETE FROM galleries WHERE id = $1', [id]).catch(() => {});
  await db.end().catch(() => {});
}

console.log(bad ? `\n  ${bad} CHECK(S) FAILED\n` : '\n  ALL CHECKS PASSED — the slug is no longer the security\n');
process.exit(bad ? 1 : 0);
