// Is there a real icon in the browser tab, and is it the right studio's?
//
// Every raster icon in client/public/ shipped as a horizontal SLIVER. favicon.ico declared
// 16x5, favicon-16x16.png was really 16x5, favicon-32x32.png was 32x10, apple-touch-icon
// was 180x55. All ~3.2:1 — the aspect of the WIDE wordmark, resized to the target WIDTH
// with the height left to fall where it may. Every icon a browser could pick rendered as a
// blank smear, and nobody could tell, because a binary asset with no generator is a file
// you can only replace, never audit.
//
// So this parses the actual bytes. A check that only asserted the files EXIST would have
// passed against all four slivers.
//
// Run: node scripts/ui-verify-favicon.mjs
import fs from 'fs';

let bad = 0;
const check = (label, ok, detail = '') => {
  if (!ok) bad++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? '  — ' + detail : ''}`);
};

/** Real pixel dimensions from a PNG's IHDR. */
function pngSize(buf) {
  if (buf.length < 24 || buf.readUInt32BE(0) !== 0x89504e47) return null;
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
}

console.log('\n=== every PNG icon is square, and the size its name claims ===');
for (const [file, want] of [
  ['client/public/favicon-16x16.png', 16],
  ['client/public/favicon-32x32.png', 32],
  ['client/public/favicon-48x48.png', 48],
  ['client/public/apple-touch-icon.png', 180],
  ['client/public/icon-192.png', 192],
  ['client/public/icon-512.png', 512],
  ['client/public/brand-icon.png', null],
]) {
  if (!fs.existsSync(file)) { check(file.replace('client/public/', ''), false, 'missing'); continue; }
  const size = pngSize(fs.readFileSync(file));
  if (!size) { check(file.replace('client/public/', ''), false, 'not a PNG'); continue; }
  const square = size.w === size.h;
  const right = want === null || (size.w === want && size.h === want);
  check(file.replace('client/public/', ''), square && right,
    `${size.w}x${size.h}${square ? '' : ' NOT SQUARE'}${right ? '' : ` (name says ${want})`}`);
}

console.log('\n=== favicon.ico is a valid multi-size container ===');
const ico = fs.existsSync('client/public/favicon.ico') ? fs.readFileSync('client/public/favicon.ico') : null;
check('favicon.ico exists', !!ico);
if (ico) {
  check('the header is an icon, not a cursor', ico.readUInt16LE(0) === 0 && ico.readUInt16LE(2) === 1);
  const count = ico.readUInt16LE(4);
  check('it carries several sizes', count >= 3, `${count} entr${count === 1 ? 'y' : 'ies'}`);
  // The original declared 16x5. Declared dimensions must match the real payload, or a
  // browser scales something that is not what it asked for.
  const sizes = [];
  let allMatch = true;
  for (let i = 0; i < count; i++) {
    const o = 6 + i * 16;
    const dw = ico[o] || 256, dh = ico[o + 1] || 256;
    const len = ico.readUInt32LE(o + 8), off = ico.readUInt32LE(o + 12);
    if (off + len > ico.length) { allMatch = false; sizes.push(`${dw}x${dh}(truncated)`); continue; }
    const payload = ico.slice(off, off + len);
    const real = pngSize(payload);
    if (!real) { sizes.push(`${dw}x${dh}(BMP)`); continue; } // a BMP entry is legal, just unverified here
    sizes.push(`${dw}x${dh}`);
    if (real.w !== dw || real.h !== dh) { allMatch = false; sizes[sizes.length - 1] = `${dw}x${dh}!=${real.w}x${real.h}`; }
    if (real.w !== real.h) { allMatch = false; sizes[sizes.length - 1] += ' NOT SQUARE'; }
  }
  check('every entry\'s declared size matches its real payload', allMatch, sizes.join(' '));
  check('16px is present', sizes.some((s) => s.startsWith('16x16')));
  check('32px is present', sizes.some((s) => s.startsWith('32x32')));
}

console.log('\n=== the head points at them, in a sensible order ===');
const html = fs.readFileSync('client/index.html', 'utf8');
// The SVG is the sharpest option and modern browsers prefer it; it was not linked at all,
// so the one good asset in the folder went unused while the broken .ico won.
check('the SVG icon is linked', /rel="icon"[^>]*type="image\/svg\+xml"/.test(html));
check('the .ico is still linked for older browsers', /rel="icon"[^>]*href="\/favicon\.ico"/.test(html));
check('an apple-touch-icon is linked', /rel="apple-touch-icon"/.test(html));
check('a manifest is linked', /rel="manifest"/.test(html));

console.log('\n=== /site.webmanifest is a manifest, not the SPA shell ===');
// It returned index.html at HTTP 200, so every page logged a manifest syntax error.
check('a static manifest ships as a fallback', fs.existsSync('client/public/site.webmanifest'));
if (fs.existsSync('client/public/site.webmanifest')) {
  let parsed = null;
  try { parsed = JSON.parse(fs.readFileSync('client/public/site.webmanifest', 'utf8')); } catch { /* invalid */ }
  check('it is valid JSON', !!parsed);
  if (parsed) {
    check('it declares icons', Array.isArray(parsed.icons) && parsed.icons.length > 0);
    // A checked-in file cannot know the studio's name, so the static one must stay
    // neutral; the route below is what makes it per-tenant.
    check('the static fallback does not hardcode a studio name',
      !/new age|fotografie|kristina/i.test(JSON.stringify(parsed)));
  }
}

console.log('\n=== the public site shows the STUDIO\'s mark, not the vendor\'s ===');
const icons = fs.existsSync('server/routes/site-icons.ts') ? fs.readFileSync('server/routes/site-icons.ts', 'utf8') : '';
check('a per-tenant icon route exists', icons.length > 0);
if (icons) {
  check('it serves the manifest', /site\.webmanifest/.test(icons));
  check('it renders the studio logo into a square', /squareIcon|fit: 'contain'|extend/.test(icons));
  check('it caps how much it will fetch', /MAX_LOGO_BYTES/.test(icons));
  check('the fetch cannot hang forever', /FETCH_TIMEOUT_MS/.test(icons));
  check('it falls back to the product mark when a studio has no logo', /brand-icon|DEFAULT/.test(icons));
}
// A module nothing imports is the shape of half this repo's dead code.
const routes = fs.readFileSync('server/routes.ts', 'utf8');
check('the route is actually registered', /registerSiteIcons\(app\)/.test(routes));
check('it is imported', /from '\.\/routes\/site-icons'/.test(routes));
// Registration must beat serveStatic's '*' catch-all, or /site.webmanifest 200s as
// index.html again. That ordering is CROSS-FILE — server/index.ts calls registerRoutes()
// and only later serveStatic() — so checking the order of two strings inside routes.ts
// tests nothing (its only mentions of serveStatic are in the comment explaining this).
const boot = fs.readFileSync('server/index.ts', 'utf8');
const iRegister = boot.indexOf('await registerRoutes(app)');
const iStatic = boot.indexOf('serveStatic(app)');
check('the boot sequence registers routes before mounting static',
  iRegister > 0 && iStatic > 0 && iRegister < iStatic,
  iRegister > 0 && iStatic > 0 ? `registerRoutes then serveStatic` : 'could not locate both calls');
check('the icon routes are inside registerRoutes, so they inherit that ordering',
  routes.indexOf('registerSiteIcons(app)') > routes.indexOf('export async function registerRoutes'));

console.log('\n=== the icons can be regenerated, not just replaced ===');
check('a generator is committed', fs.existsSync('scripts/gen-favicons.mjs'));
if (fs.existsSync('scripts/gen-favicons.mjs')) {
  const gen = fs.readFileSync('scripts/gen-favicons.mjs', 'utf8');
  check('it forces a square canvas', /squareIcon/.test(gen));
  check('it explains the sliver bug it exists to prevent', /sliver/i.test(gen));
}

console.log(bad
  ? `\n  ${bad} CHECK(S) FAILED\n`
  : '\n  ALL CHECKS PASSED — a real icon, square at every size, and the studio\'s own on their own site\n');
process.exit(bad ? 1 : 0);
