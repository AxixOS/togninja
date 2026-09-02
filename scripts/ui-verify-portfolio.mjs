// Does a studio's whole body of work reach a page?
//
// The crawl records forty-odd photographs from a studio's existing site. Nine get placed in
// named slots — a hero, two content blocks, one per service — and the other thirty-one were
// offered in a picker and otherwise did nothing. A photographer's life's work sat in the
// database while their new site showed nine pictures.
//
// /portfolio, portfolio_images, the admin CRUD and the route all already existed. Nothing had
// ever put a crawled photograph into them.
import fs from 'fs';

let bad = 0;
const check = (label, ok, detail = '') => {
  if (!ok) bad++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? '  — ' + detail : ''}`);
};

const codeOnly = (src) =>
  src.split(/\r?\n/).filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
const read = (p) => fs.readFileSync(p, 'utf8');

const seed = codeOnly(read('server/lib/seedPortfolioFromCrawl.ts'));
const pipeline = codeOnly(read('server/lib/homepage-pipeline.ts'));
const gridRaw = read('client/src/pages/PortfolioGrid.tsx');
const grid = codeOnly(gridRaw);
const page = codeOnly(read('client/src/pages/PortfolioPage.tsx'));

console.log('\n=== the crawled photographs reach the portfolio ===');

check('there is a seeder', /export async function seedPortfolioFromCrawl/.test(seed));
check('the pipeline runs it', /seedPortfolioFromCrawl\(\{ stillCurrent \}\)/.test(pipeline));
// LAST: the named slots get first refusal on photographs whose filenames match a service.
const galleriesAt = pipeline.indexOf("assignCrawledSiteImages('galleries'");
const portfolioAt = pipeline.indexOf('seedPortfolioFromCrawl');
check('after the slots that match by name',
  galleriesAt > 0 && portfolioAt > galleriesAt,
  portfolioAt < 0 ? 'not called' : `galleries@${galleriesAt} portfolio@${portfolioAt}`);
// It copies forty files one at a time — the widest window in this pipeline for a reset.
check('and is fenced against a reset landing mid-run', /opts\.stillCurrent/.test(seed));

console.log('\n=== the bytes are the studio\'s own, and cheaply had ===');

// "We copy it into your own storage, so it keeps working after your old site goes." A
// portfolio pointing at the site they are replacing breaks the day they cancel it.
// The SEND, not the import. /PutObjectCommand/ matched the destructured import, so gutting
// the upload left this green over a portfolio pointing at the site being replaced.
check('the photographs are copied, not hotlinked', /s3\.send\(new PutObjectCommand\(/.test(seed));
// storeSiteImage runs a vision call per image and prices it: "Nine vision calls is roughly
// 5p." Nine is worth it for the studio's public face; forty is not, and would more than
// triple the slowest phase of a pipeline that already writes for three minutes.
check('no vision call per photograph', !/analyzeVision/.test(seed));
check('the alt text comes from the crawl instead', /img\.label/.test(seed));
// Re-running must not duplicate, and must never touch what the studio uploaded themselves.
check('an existing image is never duplicated', /have\.has\(src\)/.test(seed));
check('and storage being absent is not treated as a failure',
  /file storage is not configured/.test(read('server/lib/seedPortfolioFromCrawl.ts')));

console.log('\n=== they land on a page that will actually show them ===');

// categoryConfig is six hardcoded ids — family, newborn, maternity, wedding, business, event
// — each linking to /fotoshootings. That is the ORIGIN studio's taxonomy, in their language,
// and an image filed under anything else rendered NOWHERE. Forty crawled photographs would
// have been invisible on the page built to show them.
check('images outside the hardcoded categories are collected', /const uncategorised/.test(page));
check('and rendered as a grid', /<PortfolioGrid images=\{uncategorised\}/.test(page));
check('the seeder does not file them under the origin studio\'s headings',
  /'portfolio',/.test(seed) && !/'family'|'newborn'|'maternity'/.test(seed));

console.log('\n=== the grid is built for photographs ===');

// A grid of equal cells crops every photograph to one shape: a portrait becomes a square, a
// panorama a postage stamp. Columns let each keep its own aspect ratio.
check('columns, so aspect ratios survive', /columns-1 sm:columns-2/.test(grid));
// Inside a className, not anywhere in the file. codeOnly strips lines beginning with // or *,
// which does NOT catch a JSX {/* … */} block whose continuation lines are plain prose — and
// the comment above this very class names it. So the check was reading the explanation of the
// class rather than the class, and stayed green after the class was removed.
check('and no picture is sliced across a column break',
  /className="[^"]*break-inside-avoid/.test(grid));
check('the image is not cropped to a fixed height', !/auto-rows-\[/.test(grid) && /h-auto/.test(grid));
// At forty pictures, chrome is what you see.
check('no cards, shadows or rounded corners',
  !/shadow-|rounded-lg|rounded-xl/.test(grid));
// Forty full-size photographs is a lot of bytes.
check('below-the-fold images load lazily', /loading=\{i < 6 \? 'eager' : 'lazy'\}/.test(grid));
// A dialog dismissable only by clicking its backdrop is a trap for keyboard users.
check('the lightbox closes on Escape', /e\.key === 'Escape'/.test(gridRaw));

console.log(bad ? `\n${bad} FAILING\n` : '\nall good\n');
process.exit(bad ? 1 : 0);
