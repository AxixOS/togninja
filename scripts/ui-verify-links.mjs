// Does every link we hand a customer point at a route that exists?
//
// Twice now the answer was no, and both times the link was the whole point of the feature:
//
//   the gallery admin built /gallery/<uuid> and a slug re-derived in the browser with a
//   different algorithm than the server's, so accented titles 404'd
//
//   the calendar page's "Share Booking Link" copied /schedule/<slug> to the clipboard while
//   the only registered booking route was /book/:slug — so every customer sent a booking
//   link from that page landed on the catch-all handler. The Schedulers page used /book/
//   correctly, which is exactly why it survived: the two disagreed, and the wrong one was
//   on the page people actually use.
//
// Neither was catchable by a build, a type check or any test that did not know what
// App.tsx registers. So this compares the two directly.
//
// Run: node scripts/ui-verify-links.mjs
import fs from 'fs';
import path from 'path';
import { walk } from './lib/reachable.mjs';

let bad = 0;
const check = (label, ok, detail = '') => {
  if (!ok) bad++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? '  — ' + detail : ''}`);
};

// ── What does App.tsx actually register? ────────────────────────────────────
const app = fs.readFileSync('client/src/App.tsx', 'utf8');
const routes = [...app.matchAll(/path="([^"]+)"/g)].map((m) => m[1]);
// Only the first segment matters for this check: a link built as `/book/${slug}` can be
// compared against the registered `/book/:slug` by its literal prefix.
const registered = new Set(
  routes.map((r) => '/' + String(r).replace(/^\//, '').split('/')[0]).filter((r) => r !== '/' && r !== '/*'),
);

console.log(`\n  App.tsx registers ${registered.size} top-level path(s)\n`);

// ── What do we build links to? ──────────────────────────────────────────────
//
// NAVIGATION ONLY — not "any string that looks like a path".
//
// The first version of this matched /segment/${...} anywhere and reported nineteen
// failures, of which exactly one was real. Every other hit was a fragment of an API URL or
// a path assembled in pieces — /thumb/, /threads/, /variants/. A guard with nineteen false
// positives is worse than no guard, because the one real hit gets skimmed past with the
// noise, which is precisely how the /schedule/ link survived in the first place.
//
// So match the four ways this codebase actually sends somebody somewhere.
const NAV_PATTERNS = [
  /navigate\(\s*[`'"]\/([a-z][a-z0-9-]{2,})\//g,
  /window\.open\(\s*[`'"]\/([a-z][a-z0-9-]{2,})\//g,
  /window\.location\.origin\s*\}\/([a-z][a-z0-9-]{2,})\//g,
  /(?:href|to)=\{?[`'"]\/([a-z][a-z0-9-]{2,})\//g,
];

const files = walk('client/src').filter((f) => /\.tsx?$/.test(f));
const found = new Map(); // prefix -> [file:line]

for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  src.split('\n').forEach((line, i) => {
    // Skip comments — this file's own explanation mentions /schedule/.
    const t = line.trim();
    if (t.startsWith('//') || t.startsWith('*') || t.startsWith('/*')) return;
    // Skip API calls; those are Express routes, not client routes.
    if (line.includes('/api/')) return;
    for (const re of NAV_PATTERNS) {
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(line))) {
        const prefix = '/' + m[1];
        if (!found.has(prefix)) found.set(prefix, []);
        found.get(prefix).push(f.split(path.sep).join('/').replace('client/src/', '') + ':' + (i + 1));
      }
    }
  });
}

console.log('=== every customer-facing link resolves to a registered route ===');
if (!found.size) {
  console.log('  (no dynamic in-product links found — check the pattern still matches)');
}
for (const [prefix, sites] of [...found].sort()) {
  const ok = registered.has(prefix);
  if (!ok) bad++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${prefix.padEnd(14)} ${ok ? 'registered' : 'NO SUCH ROUTE'}  ${sites.slice(0, 3).join(', ')}`);
}

console.log('\n=== the two links that were actually broken ===');
const cal = fs.readFileSync('client/src/pages/admin/PhotographyCalendarPageSimple.tsx', 'utf8');
const sched = fs.readFileSync('client/src/pages/admin/AdminSchedulersPage.tsx', 'utf8');
// Compare the pages against each other, not just against App.tsx: two pages sharing the
// same link must not disagree, which is the shape of the bug that shipped.
const calUses = /\/book\/\$\{scheduler\.slug\}/.test(cal) || /origin\}\/book\//.test(cal);
check('the calendar page builds /book/', calUses);
check('the calendar page no longer builds /schedule/', !/['"`/]schedule\/\$\{/.test(cal));
check('the schedulers page builds /book/', /\/book\//.test(sched));
check('/book is a registered route', registered.has('/book'));
check('/schedule is NOT registered, confirming the old link was dead', !registered.has('/schedule'));

console.log('\n=== the gallery link helper is still the only way galleries are addressed ===');
const admin = files.filter((f) => /[\\/]admin[\\/]/.test(f));
let rawGallery = 0;
for (const f of admin) {
  const src = fs.readFileSync(f, 'utf8');
  src.split('\n').forEach((line) => {
    const t = line.trim();
    if (t.startsWith('//') || t.startsWith('*')) return;
    if (/\/gallery\/\$\{(id|gallery\.id|galleryId)\}/.test(line)) rawGallery++;
  });
}
check('no admin screen links a gallery by raw id', rawGallery === 0, rawGallery + ' found');

console.log(bad
  ? `\n  ${bad} BROKEN LINK(S) — a customer following one lands on the 404 handler\n`
  : '\n  every in-product link points at a route that exists\n');
process.exit(bad ? 1 : 0);
