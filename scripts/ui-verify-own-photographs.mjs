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

// Passing the image down is not the same as drawing it, and the check above cannot tell the
// difference — it passed for a fortnight while an editorial site rendered neither photograph.
//
// Both sections early-return for the editorial layout, and both had their `{image && ...}`
// block AFTER that return, so it belonged to the classic branch alone. The image was fetched,
// gated on the homepage slug, threaded through the renderer and then dropped on the floor.
//
// The layout it was dropped by describes itself as: "Photographs run edge to edge and carry
// the page. Best when you have a strong set of images to show."
//
// So: each section must draw the image once per layout branch, not once in total.
for (const name of ['PublicLandingPageProblemSection', 'PublicLandingPageOfferSection']) {
  const src = read(`client/src/features/landing-pages/components/public/${name}.tsx`);
  const branches = (src.match(/src=\{image\.url\}/g) || []).length;
  const hasEditorial = /if \(editorial\) \{/.test(src);
  check(`${name.replace('PublicLandingPage', '')} draws the photograph in BOTH layouts`,
    !hasEditorial || branches >= 2,
    `${branches} render site(s) — editorial returns early, so one is classic-only`);
}


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

// ── The rest of the crawl is reachable after onboarding ─────────────────────
//
// The crawl captures up to 40 photographs and the wizard consumes three. The other 37 were
// visible for one screen and then unreachable forever, which is the wrong way round: the
// portfolio is the gallery a studio shows clients, and it starts empty on a brand-new site.
// So a studio was choosing between an empty portfolio and re-uploading by hand the pictures
// this instance had already found, listed, and then thrown away.
//
// The half that matters is WHERE a chosen photograph is sent. Rendering the list in the admin
// is easy to do wrongly: drop the url straight into portfolio_images and the gallery hotlinks
// the site they are migrating away from — the exact bug fixed above on the other two doors.
const manual = read('client/src/pages/admin/ManualWebsiteUpdatePage.tsx');

check('the admin portfolio offers the rest of the crawl',
  /\/api\/setup\/crawled-images/.test(manual),
  'onboarding used 3 of up to 40 and the remainder had no second door');

check('and a chosen one is POSTed to the endpoint that copies',
  /addOwnPhoto[\s\S]{0,700}?'\/api\/portfolio\/images'[\s\S]{0,200}?method: 'POST'/.test(manual),
  'writing the crawled url anywhere else re-creates the hotlink this file exists to prevent');

// ── A pillar page can be given one of the studio's own photographs ──────────
//
// The hero column and the renderer that draws it both existed; the only way to fill it was to
// upload a file. So every generated service page — "Boudoir Photography", "Intimate
// Portraiture" — shipped as pure type on a photographer's website, while onboarding had
// already crawled, listed and stored the addresses of dozens of that studio's pictures and
// used three of them.
const settings = read('client/src/features/landing-pages/components/editor/LandingPageSettingsPanel.tsx');

check('a pillar hero can be picked from the crawl, not only uploaded',
  /\/api\/setup\/crawled-images/.test(settings) && /chooseCrawledHero/.test(settings),
  'the column and the renderer were both already there — only the way in was missing');

// The third door into an image table, and it must behave like the other two.
check('and choosing one copies the bytes into the studio\'s bucket',
  /data\.hero_image_url[\s\S]{0,400}?await copyImageIntoStorage\(/.test(adminRoutes),
  'a pillar page hotlinking the old site goes blank the week it is cancelled');

// The copy means the stored url is NOT the one that was sent. The panel's generic savePatch
// writes back the patch it sent, so reusing it here would leave the old site's address on
// screen — looking exactly like the hotlink the copy just prevented.
check('and the panel shows where the bytes actually landed',
  /saved\?\.hero_image_url \|\| img\.url/.test(settings),
  'the server\'s answer, not the request');

// ── Every page arrives with a photograph on it ──────────────────────────────
//
// Onboarding offered six slots — a hero, two content blocks, one per service — and a real
// studio filled three. So they finished with a homepage full of their own work and service
// pages that were flat colour under headings like "Discover the Empowerment of Boudoir
// Photography". The photographs were in the database the entire time; only the decision
// about which went where was missing, and for a photographer's own files that decision is
// often written on the tin: BoudoirPhotographyNYC.jpg, QueerWeddingPhotographyNYC.jpg.
const assign = read('server/lib/assignCrawledImages.ts');
const pipeline = read('server/lib/homepage-pipeline.ts');
const store = read('server/lib/siteImageStore.ts');

check('empty slots are filled from the crawl automatically',
  /export async function assignCrawledSiteImages/.test(assign)
  && /assignCrawledSiteImages\('site'\)/.test(pipeline)
  && /assignCrawledSiteImages\('pillars'\)/.test(pipeline),
  'both halves — the homepage slots and the service pages');

// THE property. An automatic path that wrote rows directly would produce the WORST images on
// the site: hotlinked to the old site, no alt text, no byline — precisely the pictures nobody
// ever revisits. It was doing exactly that, and the demo hotlinked images.squarespace-cdn.com
// on all three homepage slots as a result.
check('and go through the same door a hand-picked one does',
  /storeSiteImage\(/.test(assign)
  && !/INSERT INTO homepage_images/.test(pipeline),
  'downloaded into their bucket, described, and stamped — not an INSERT of someone else\'s URL');

check('the shared store is what carries the metadata',
  /analyzeVision\(/.test(store) && /writeIptc\(/.test(store) && /buildImageFilename\(/.test(store),
  'alt text from the picture, IPTC from the tenant, an SEO filename');

// A studio's own choice must always outrank a guess, and re-running must never overwrite it.
check('a slot the studio filled themselves is never touched',
  /filledSections\.has\(w\.section\)/.test(assign),
  'this is a floor, not an override');

// Three services showing one photograph reads as broken in a way three empty blocks do not.
check('and no photograph is used on two pages',
  /claimed\.add\(/.test(assign) && /claimed\.has\(/.test(assign));

// Ordering is the subtle one, and the obvious check for it is worthless. storeSiteImage
// mirrors a service photograph onto the pillar page's own hero_image_url, and a landing_pages
// row that does not exist yet matches nothing — so the pillar pass has to run AFTER
// authority-scaffold. But the scaffold is fire-and-forget inside a .then(), so it sits EARLIER
// in the file than code that runs before it: comparing text offsets proves nothing, and the
// first version of this check passed while the call had been moved into a different block.
//
// So match braces from the callback that awaited the scaffold, and require the call to be
// inside it. That is the actual property — "runs after the pages exist" — rather than a proxy.
const scaffoldBlock = (() => {
  const awaitAt = pipeline.indexOf('await scaffoldPillarPages(');
  if (awaitAt < 0) return '';
  const openAt = pipeline.lastIndexOf('.then(async () => {', awaitAt);
  if (openAt < 0) return '';
  let depth = 0;
  for (let i = pipeline.indexOf('{', openAt); i < pipeline.length; i++) {
    if (pipeline[i] === '{') depth++;
    else if (pipeline[i] === '}' && --depth === 0) return pipeline.slice(openAt, i);
  }
  return '';
})();
check('service images are assigned only once those pages exist',
  /assignCrawledSiteImages\('pillars'\)/.test(scaffoldBlock),
  scaffoldBlock ? 'inside the callback that awaited the scaffold' : 'could not locate the scaffold callback');

console.log(`
  ${failed === 0 ? 'all checks passed' : failed + ' FAILED'}
`);
process.exit(failed === 0 ? 0 : 1);
