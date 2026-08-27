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
// The own-host half. The LEADING DOT is the whole point: `endsWith(siteHost)` without it
// accepts evilnickdalephotography.com for a studio at nickdalephotography.com.
check('the studio\'s own host is matched with a leading dot',
  /host\.endsWith\('\.' \+ siteHost\)/.test(lib),
  'without it, siteHost as a plain suffix lets an attacker-registered domain through');

// The other half, added when the own-host rule turned out to exclude most real studios: a
// Squarespace site keeps its photographs on images.squarespace-cdn.com, so the check that was
// exactly right for a self-hosted site returned ZERO images for the builders photographers
// actually use. Measured on a real site: 1,774 photographs captured, none offered.
//
// Widening an SSRF boundary is the kind of change that must not be done by pattern. These URLs
// are FETCHED server-side by use-crawled-image, so the list has to stay a closed set of literal
// hosts. A suffix match on 'cdn.com', or anything built from the crawled page's own host, would
// turn a database lookup into an open fetch-anything proxy.
check('the builder CDN list is a closed set, not a pattern',
  /const BUILDER_IMAGE_CDNS = new Set\(\[/.test(lib)
  && /BUILDER_IMAGE_CDNS\.has\(host\)/.test(lib)
  && !/BUILDER_IMAGE_CDNS[\s\S]{0,400}endsWith|isBuilderImageCdn[\s\S]{0,200}endsWith/.test(lib),
  'exact host equality only — a suffix match here is an open proxy');

// And nothing gets in by BOTH doors being open at once.
check('a host must pass one of the two, not neither',
  /if \(!ownSite && !isBuilderImageCdn\(host\)\) continue;/.test(lib),
  'the skip must fire when neither rule matches');

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

// ── The content photographs actually appear on the page ─────────────────────
//
// The wizard asks for three images and stored three. `content-1` and `content-2` were read by
// exactly one file — client/src/pages/HomePage.tsx, the built-in template — while onboarding
// sets homepage_landing_slug so "/" serves the GENERATED landing page instead. So a studio
// uploaded three photographs, paid to store them, and saw one.
const renderer = read('client/src/features/landing-pages/components/public/PublicLandingPageRenderer.tsx');
const contentHook = read('client/src/hooks/useHomepageContentImages.ts');

check('the two content photographs reach the generated page',
  renderer.includes('image={contentImages.one}') && renderer.includes('image={contentImages.two}'),
  'otherwise they are stored, charged for, and rendered nowhere');

// The same renderer draws every pillar page. Handing it homepage images unconditionally would
// put one studio's two photographs on "Wildlife Prints", "Photography Courses" and every other
// service — which is worse than showing none, because it looks deliberate.
check('and only on the page that IS the homepage',
  contentHook.includes('slug === homeSlug') && contentHook.includes('enabled: isHomepage'),
  'gated on studio_configs.homepage_landing_slug, and not fetched at all elsewhere');

// ── Both doors into homepage_images copy the bytes ──────────────────────────
//
// The setup picker has always downloaded and re-uploaded. POST /api/homepage/images — the admin
// "Use URL" tab — stored whatever URL it was handed, so a studio pasting an address from their
// existing site got a homepage rendering off someone else's server. Observed live: three images
// pointing at images.squarespace-cdn.com, on an instance whose entire purpose is to replace that
// Squarespace site. They break the week the studio cancels the hosting they are migrating away
// from. Two doors into one table behaving oppositely is how the wrong one gets used.
const adminRoutes = read('server/routes.ts');

check('there is one copy-into-storage helper, and it uploads',
  /async function copyImageIntoStorage\(/.test(adminRoutes)
  && /copyImageIntoStorage[\s\S]*?PutObjectCommand/.test(adminRoutes),
  'two copies of this decision is how the two doors drifted apart in the first place');

// BOTH tables. The homepage one was found hotlinking; the portfolio one had the identical
// shape and is the gallery a studio shows clients, so it is the worse one to have go blank.
const copyCallers = (adminRoutes.match(/await copyImageIntoStorage\(/g) || []).length;
check('both image tables copy before they record',
  copyCallers >= 2,
  `${copyCallers} caller(s) — homepage and portfolio`);

// And the copy is pointless if the row still records where the bytes came from.
check('the rows record where the bytes now live',
  /\[section, storedUrl, alt \|\| null/.test(adminRoutes)
  && /\[category, copied\.url, alt \|\| null/.test(adminRoutes),
  'inserting the original url would be a no-op with extra steps');

console.log(`
  ${failed === 0 ? 'all checks passed' : failed + ' FAILED'}
`);
process.exit(failed === 0 ? 0 : 1);
