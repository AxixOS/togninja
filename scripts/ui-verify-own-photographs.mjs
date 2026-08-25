// A new site fills itself with the studio's OWN photographs, never with stock.
//
// There is a policy written into SiteImagesPhase that predates this work:
//
//     "What it must never do is ship placeholder photography, which is how another
//      studio's pictures ended up on every buyer's homepage in the first place."
//
// That is not a style preference, it is the record of a real incident. The pressure to
// break it is constant, because a brand-new site with empty image blocks looks broken and
// stock is the obvious fix. The answer is that the crawler has been recording every image
// on the studio's existing website since it shipped and nothing ever read them back.
//
// The second thing checked here is the SSRF boundary, because the endpoint that uses those
// photographs FETCHES a URL server-side on an unauthenticated mount. Both halves have to
// hold: the URL must be one this crawl produced, and the crawl list must be restricted to
// the studio's own host.

import { readFileSync, existsSync, readdirSync } from 'fs';

const read = (p) => readFileSync(p, 'utf8');
const lib = read('server/lib/crawledImages.ts');
const routes = read('server/setup-routes.ts');
const phase = read('client/src/pages/setup/phases/SiteImagesPhase.tsx');
const crawler = read('server/lib/site-crawler.ts');

let failed = 0;
const check = (label, ok, detail = '') => {
  console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${label}${detail ? '  — ' + detail : ''}`);
  if (!ok) failed++;
};

console.log('\nTheir own photographs\n');

// ── No stock, anywhere ──────────────────────────────────────────────────────
const STOCK = /unsplash|pexels|pixabay|shutterstock|istockphoto|gettyimages|stock\.adobe/i;
const stockIn = [];
for (const dir of ['client/src/pages/setup/phases', 'server/lib']) {
  if (!existsSync(dir)) continue;
  for (const f of readdirSync(dir).filter((n) => /\.(tsx?|ts)$/.test(n))) {
    const src = read(`${dir}/${f}`);
    // Comments may name the policy; code may not reach a stock library.
    const code = src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
    if (STOCK.test(code)) stockIn.push(`${dir}/${f}`);
  }
}
check('no setup path reaches a stock photography library',
  stockIn.length === 0, stockIn.join(', ') || 'none');

check('the policy is still written down where it applies',
  /must never do is ship placeholder photography/.test(phase));

// ── The images come from the crawl ──────────────────────────────────────────
check('the crawl list exists', /export async function crawledImages/.test(lib));
check('it is offered on the images step', /OwnPhotographs/.test(phase) && /crawled-images/.test(phase));

check('lazy and responsive images are captured',
  /data-\(\?:src\|original\|lazy-src\)/.test(crawler) && /srcset/.test(crawler),
  'a lazy-loading theme hides the real photograph behind a 1x1 placeholder in src');

// ── SSRF ────────────────────────────────────────────────────────────────────
//
// Assert both halves. Either one alone leaves the endpoint open.
check('the crawl list is restricted to the studio\'s own host',
  /host !== siteHost && !host\.endsWith\('\.' \+ siteHost\)/.test(lib),
  'leading dot matters: without it siteHost.evil.com passes');

check('only http and https are ever fetched',
  /abs\.protocol !== 'http:' && abs\.protocol !== 'https:'/.test(lib));

check('the fetch endpoint re-checks the URL against that list',
  /isCrawledImage\(url\)/.test(routes));

check('the response content type is verified, not trusted from the extension',
  /image\\\/\(png\|jpe\?g\|webp\|avif\)/.test(routes) && /content-type/.test(routes));

check('the size ceiling is applied after download',
  /buffer\.length > 12 \* 1024 \* 1024/.test(routes),
  'content-length is whatever the remote server says it is');

// ── One storage path, not two ───────────────────────────────────────────────
check('both entry points share the same store handler',
  /async function storeSectionImage/.test(routes)
  && (routes.match(/storeSectionImage\(req, res\)/g) || []).length >= 2,
  'upload and use-crawled must not each write their own S3, alt text and landing-page hero');

check('the chosen image is copied into the studio\'s own storage',
  /await r\.arrayBuffer\(\)/.test(routes),
  'hotlinking breaks the day they take the old site down');

console.log(`\n  ${failed === 0 ? 'all checks passed' : failed + ' FAILED'}\n`);
process.exit(failed === 0 ? 0 : 1);
