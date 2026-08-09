// What a VISITOR actually sees.
//
// Grepping client/src counts every default string in the codebase, including ones no
// studio ever renders — onboarding overwrites the five main pages, and disabled pages
// never load at all. This renders each public page in a real browser and searches the
// visible text, so the list is what a leak actually looks like on Susan's site.
import puppeteer from 'puppeteer';

// Usage: node scripts/check-visible-leaks.mjs [baseUrl]
// Exits non-zero if anything is visible, so it can gate a release.
const BASE = process.argv[2] || 'http://localhost:5000';
const PAGES = [
  '/', '/sessions/', '/pricing/', '/contact/', '/waitlist/', '/about/',
  '/gift-vouchers/', '/reviews/', '/vouchers/', '/blog/', '/portfolio/',
  '/faq/', '/case-studies/', '/imprint/', '/terms/', '/privacy/',
  '/gift-vouchers/family', '/gift-vouchers/newborn', '/gift-vouchers/maternity',
  '/calculator', '/galleries/', '/sessions/business/', '/sessions/wedding/',
];
const PATTERN = /(New Age|NewAge|newagefotografie|in Vienna|in Wien\b|Vienna|Wien\b|Wehrgasse|\+43)/gi;

// Third-party embed ids belonging to the origin studio. An <iframe> renders somebody
// else's prices and packages while contributing NOTHING to innerText, so a visible-text
// sweep once called the homepage clean while it displayed another studio's price list.
const FOREIGN_EMBEDS = [
  'embed_ai_1780913691468_2effx16uy',
  'embed_ai_1772535371344_q0lkcwv9x',
];

const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 900 });

let total = 0;
const report = [];

for (const path of PAGES) {
  try {
    await page.goto(BASE + path, { waitUntil: 'networkidle2', timeout: 45000 });
    await new Promise(r => setTimeout(r, 1200)); // let client-rendered copy settle
    const text = await page.evaluate(() => {
      const parts = [document.body.innerText || ''];
      // Attribute text a reader never sees but a crawler does.
      for (const el of document.querySelectorAll('[title],[alt],[aria-label]')) {
        parts.push(el.getAttribute('title') || '', el.getAttribute('alt') || '', el.getAttribute('aria-label') || '');
      }
      // Every embedded source, so a foreign widget cannot hide inside an iframe.
      for (const el of document.querySelectorAll('iframe,embed,object')) {
        parts.push(el.getAttribute('src') || el.getAttribute('data') || '');
      }
      parts.push(document.title || '');
      const meta = document.querySelector('meta[name="description"]');
      if (meta) parts.push(meta.getAttribute('content') || '');
      return parts.join('\n');
    });
    const hits = [...text.matchAll(PATTERN), ...FOREIGN_EMBEDS.flatMap(id => text.includes(id) ? [{ 0: id, index: text.indexOf(id) }] : [])];
    // Keep the surrounding sentence so each hit is actionable, not just a count.
    const contexts = [...new Set(hits.map(m => {
      const start = Math.max(0, m.index - 60);
      return text.slice(start, m.index + m[0].length + 60).replace(/\s+/g, ' ').trim();
    }))];
    total += hits.length;
    report.push({ path, count: hits.length, contexts: contexts.slice(0, 4) });
  } catch (e) {
    report.push({ path, count: -1, contexts: [`(failed to load: ${e.message.slice(0, 80)})`] });
  }
}

await browser.close();

console.log('\n=== VISIBLE origin-studio references, by page ===\n');
for (const r of report) {
  const mark = r.count === 0 ? 'clean' : r.count < 0 ? 'ERROR' : `${r.count} hit(s)`;
  console.log(`${r.path.padEnd(18)} ${mark}`);
  if (r.count > 0) r.contexts.forEach(c => console.log(`    … ${c}`));
}
console.log(`\nTOTAL visible: ${total}`);

// A page that ERRORED was never inspected, so "0 visible" says nothing about it. This
// script reported a clean zero across 23 pages while every single one had failed on a
// ReferenceError — a false all-clear is worse than no check, because it gets believed.
const errored = report.filter((r) => r.count < 0);
if (errored.length) {
  console.log(`\n${errored.length} page(s) could NOT be checked — this run proves nothing:`);
  errored.forEach((r) => console.log(`  ${r.path}  ${r.contexts[0] || ''}`));
}

// Non-zero exit so this can gate a release: a leak that reaches a visitor should fail
// the build, unlike a source-level default that no studio renders. An unchecked page
// fails too.
process.exit(total > 0 || errored.length ? 1 : 0);
