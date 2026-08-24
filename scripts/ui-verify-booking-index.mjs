// Does the booking index actually work for the two people who touch it?
//
// A studio could only ever share per-session deep links (/book/:slug). There was no page
// listing what a client can book, so there was nothing to put in an email signature. The
// fix is one public page at /book plus one endpoint feeding it — and almost everything
// that can go wrong with it fails SILENTLY, which is why this file exists:
//
//   THE ENDPOINT PATH. `/api/schedulers/public/_index` is the only shape that works.
//   Drop the '_index' segment and the auth gate in server/routes.ts (which exempts
//   exactly `req.path.startsWith('/public/')`, with the slash) stops matching and every
//   anonymous visitor gets a 401 that reads like a broken session. Use one segment and
//   `router.get('/:id')` above catches it first and 404s. Register it BELOW
//   `/public/:slug` and that param route swallows it and 404s the same way.
//   scripts/route-dupes.mjs compares literal path strings and sees none of the three.
//
//   THE PROJECTION. Drizzle silently DROPS a `.select({...})` key that is not a property
//   of the table, so one typo removes a field from the payload with no error at all and
//   the card renders a blank line. So the projected names are checked against
//   shared/schema.ts rather than trusted.
//
//   THE EMPTY STATE. `is_active` is the entire notion of "published" and a fresh tenant
//   has no schedulers at all — the demo database has zero rows — so the empty state is
//   the DEFAULT view of this page, not an edge case. It must not carry a call to action
//   that a white-label install cannot honour, and the admin must not offer to copy a link
//   to a page listing nothing.
//
//   THE TRANSLATIONS. There are no locale files: en and de are two object literals in
//   LanguageContext.tsx and there is no parity guard anywhere. A key added to one and
//   forgotten in the other renders the raw key string on screen. So every key the page
//   asks for is looked up in BOTH dictionaries.
//
// Run: node scripts/ui-verify-booking-index.mjs
import fs from 'fs';

let bad = 0;
const check = (label, ok, detail = '') => {
  if (!ok) bad++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? '  — ' + detail : ''}`);
};

const read = (f) => (fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : '');

const SCHEDULER_ROUTES = 'server/routes/scheduler.ts';
const ROUTES = 'server/routes.ts';
const SCHEMA = 'shared/schema.ts';
const APP = 'client/src/App.tsx';
const PAGE = 'client/src/pages/public/BookingIndexPage.tsx';
const LANG = 'client/src/context/LanguageContext.tsx';
const ADMIN = 'client/src/pages/admin/AdminSchedulersPage.tsx';

const server = read(SCHEDULER_ROUTES);
const routes = read(ROUTES);
const schema = read(SCHEMA);
const app = read(APP);
const page = read(PAGE);
const lang = read(LANG);
const admin = read(ADMIN);

// A handler's body, bounded at ITS OWN closing brace rather than by a fixed character
// window — a window either cuts the handler in half or spills into the next one, and both
// produce confident nonsense. Comment tails are stripped first so that a comment
// *explaining* a trap (they all quote the thing they warn about) cannot satisfy a check
// meant to inspect code.
const bodyOf = (src, marker) => {
  const start = src.indexOf(marker);
  if (start < 0) return '';
  const open = src.indexOf('{', start);
  if (open < 0) return '';
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') {
      depth--;
      if (depth === 0) return src.slice(start, i + 1);
    }
  }
  return '';
};
const stripComments = (s) =>
  s
    .split('\n')
    .map((l) => {
      const t = l.trim();
      if (t.startsWith('//') || t.startsWith('*') || t.startsWith('/*')) return '';
      return l.replace(/\s\/\/.*$/, '');
    })
    .join('\n');

// ── The endpoint exists, and in the only place it can work ───────────────────
console.log('\n=== the public index endpoint is reachable by an anonymous visitor ===');

const iIndex = server.indexOf("router.get('/public/_index'");
const iSlug = server.indexOf("router.get('/public/:slug'");
const iById = server.indexOf("router.get('/:id'");

check('the endpoint is registered', iIndex > 0);
check('it sits UNDER /public/ so the auth gate exempts it',
  /router\.get\('\/public\/[^']+'/.test(server.slice(Math.max(iIndex, 0), iIndex + 40)),
  iIndex > 0 ? server.slice(iIndex + 11, server.indexOf("'", iIndex + 12) + 1) : 'missing');
// Read the gate itself rather than trusting the comment about it: the exemption is a
// startsWith on a literal, and the endpoint path has to satisfy that literal.
const exemption = (routes.match(/req\.path\.startsWith\('([^']+)'\)\) return next\(\);/) || [])[1];
check('the gate in server/routes.ts still exempts a prefix', !!exemption, exemption || 'not found');
check('and the endpoint path starts with that exact prefix',
  !!exemption && "/public/_index".startsWith(exemption), `${exemption} + _index`);
check('it is registered ABOVE /public/:slug, or that param route swallows it',
  iIndex > 0 && iSlug > 0 && iIndex < iSlug);
check('it has two segments, so router.get(\'/:id\') cannot catch it first',
  iById > 0 && iById < iIndex && "/public/_index".split('/').length === 3);
check('the literal path is registered exactly once',
  (server.match(/'\/public\/_index'/g) || []).length === 1);
// '_index' is safe forever only because no slug can contain an underscore. Read the
// character classes rather than pattern-matching one spelling of them: the two writers do
// NOT use the same class (POST strips to [^a-z0-9], PUT keeps hyphens with [^a-z0-9-]),
// and an earlier version of this check failed on correct code for exactly that reason.
// What matters is only that no class permits '_'.
const slugClasses = [...server.matchAll(/replace\(\/\[\^([^\]]*)\]\+\/g,\s*'-'\)/g)].map((m) => m[1]);
check('both slug writers normalise through a character class',
  slugClasses.length >= 2, slugClasses.map((c) => `[^${c}]`).join(' ') || 'none found');
check('and no class permits an underscore, so no slug can ever be "_index"',
  slugClasses.length >= 2 && slugClasses.every((c) => !c.includes('_')));

// ── What the endpoint sends back ─────────────────────────────────────────────
console.log('\n=== the payload is cheap, correct, and safe to hand to a stranger ===');

const handler = stripComments(bodyOf(server, "router.get('/public/_index'"));
check('the handler body was located', handler.length > 0, `${handler.length} chars`);

// The columns that really exist on the table. Drizzle drops anything else in silence.
const tableBlock = bodyOf(schema, 'export const schedulers = pgTable(');
const columns = new Set([...tableBlock.matchAll(/^\s{2}(\w+):\s*(?:text|integer|decimal|boolean|timestamp|jsonb)\(/gm)].map((m) => m[1]));
check('the schedulers table was parsed', columns.size > 10, `${columns.size} columns`);

const projected = [...handler.matchAll(/^\s+(\w+):\s*schedulers\.(\w+)\s*,?$/gm)].map((m) => ({ key: m[1], col: m[2] }));
check('the handler projects a column list at all', projected.length > 0, projected.map((p) => p.key).join(', '));
// EVERY negative assertion from here on is gated on its input being present. Without that
// gate a deleted handler or a deleted page satisfies "does not leak the row id" and "has
// no currency symbol" trivially, and the guard would report green on the code being gone.
const unknown = projected.filter((p) => !columns.has(p.col));
check('every projected column exists on the table (a typo would vanish silently)',
  projected.length > 0 && unknown.length === 0, unknown.map((p) => p.col).join(', ') || 'all real');
const renamed = projected.filter((p) => p.key !== p.col);
check('no projected key is renamed away from its column',
  projected.length > 0 && renamed.length === 0, renamed.map((p) => `${p.key}!=${p.col}`).join(', ') || 'names match');

// The page renders a card; it needs no row id, and this response is public.
check('it does NOT leak the row id', projected.length > 0 && !projected.some((p) => p.col === 'id'));
check('it does NOT leak questionnaireId',
  projected.length > 0 && !projected.some((p) => p.col === 'questionnaireId'));
for (const needed of ['name', 'slug', 'duration', 'price']) {
  check(`the card's ${needed} is projected`, projected.some((p) => p.col === needed), needed);
}

check('isActive is the filter — the only notion of "published" this table has',
  /\.where\(eq\(schedulers\.isActive,\s*true\)\)/.test(handler));
check('the list is ordered by name, not by insertion order',
  /\.orderBy\(asc\(schedulers\.name\)\)/.test(handler));
// A bare array, like GET / above it, not an envelope the client would have to unwrap.
check('it answers with a bare array', /res\.json\(\s*[A-Za-z_$][\w$]*\s*\)/.test(handler));

// The whole reason this is a separate endpoint from /public/:slug.
check('it makes NO Google Calendar call (that would be N per page view)',
  handler.length > 0 && !/getGoogleCalendarBusyTimes|schedulerGoogleCalendar|availability/i.test(handler));

// ── The route the studio shares ──────────────────────────────────────────────
console.log('\n=== /book is a route in its own right ===');

const registered = [...app.matchAll(/path="([^"]+)"/g)].map((m) => m[1]);
// scripts/ui-verify-links.mjs builds its route set from FIRST SEGMENTS only, so its
// existing "/book is registered" assertion has been passing on the strength of
// /book/:slug alone since long before this page existed. This is the check it cannot make.
check('/book is registered as a LITERAL route, not merely as the /book/:slug prefix',
  registered.includes('/book'));
check('/book/:slug is still registered beside it', registered.includes('/book/:slug'));
check('the index page is imported statically, matching every other public page',
  /^import BookingIndexPage from '\.\/pages\/public\/BookingIndexPage';$/m.test(app));
check('it is NOT lazy-loaded (that is the admin convention here)',
  app.length > 0 && !/lazyWithRetry\(\(\) => import\('\.\/pages\/public\/BookingIndexPage'\)\)/.test(app));

// ── The page itself ──────────────────────────────────────────────────────────
console.log('\n=== the page matches the page it links to ===');

check('the page exists', page.length > 0, PAGE);
const pageCode = stripComments(page);
// The destination (PublicSchedulerPage) is a bare shell. A header here that disappears on
// the next click reads as having been thrown onto a different website mid-booking.
check('it uses the same standalone shell as PublicSchedulerPage',
  /min-h-screen bg-gray-50 py-8 px-4/.test(pageCode) && /max-w-2xl mx-auto/.test(pageCode));
check('it is NOT wrapped in the marketing Layout', pageCode.length > 0 && !/<Layout/.test(pageCode));
check('it fetches the index endpoint', /['"`]\/api\/schedulers\/public\/_index['"`]/.test(pageCode));
check('it does not fetch availability per row', pageCode.length > 0 && !/\/availability/.test(pageCode));
// This literal is what keeps the link inside scripts/ui-verify-links.mjs's NAV_PATTERNS.
check('each card links with the literal /book/ + slug that ui-verify-links matches',
  /to=\{`\/book\/\$\{[\w.]+\}`\}/.test(pageCode));

console.log('\n=== nobody is shown the wrong currency ===');
check('the page reads the studio currency', /useStudioCurrency\(\)/.test(pageCode));
check('prices go through format(), not toFixed()', /formatPrice\(/.test(pageCode) && !/toFixed\(/.test(pageCode));
// Strip template-literal openers before looking for a dollar sign, or every `${...}` in
// the file reports as hardcoded currency — a guard with false positives is worse than none.
const noInterp = pageCode.split('${').join('');
const symbols = (noInterp.match(/[€£$¥]/g) || []).length;
check('no currency symbol is written into the JSX', pageCode.length > 0 && symbols === 0, `${symbols} found`);

console.log('\n=== the empty state is built for the tenant that has nothing ===');
// Bounded at the ternary's own alternate branch, not a character window.
const emptyStart = pageCode.indexOf('list.length === 0 ?');
const emptyEnd = pageCode.indexOf(') : (', emptyStart);
const emptyBranch = emptyStart > 0 && emptyEnd > emptyStart ? pageCode.slice(emptyStart, emptyEnd) : '';
check('an empty branch exists and was located', emptyBranch.length > 0);
check('it says plainly that nothing is open for booking', /bookIndex\.empty/.test(emptyBranch));
check('it offers NO link out', emptyBranch.length > 0 && !/<Link|href=/.test(emptyBranch));
check('it offers NO button', emptyBranch.length > 0 && !/<button|onClick=/.test(emptyBranch));
// Zero rows is a legitimate answer, not a failure — it must not fall into the error state.
check('an empty array reaches the empty state rather than the error state',
  /Array\.isArray\(data\)\s*\?\s*data\s*:\s*\[\]/.test(pageCode));

// ── Translations ─────────────────────────────────────────────────────────────
console.log('\n=== every string the page asks for exists in BOTH dictionaries ===');

const enStart = lang.indexOf('\n  en: {');
const deStart = lang.indexOf('\n  de: {');
const enBlock = enStart >= 0 && deStart > enStart ? lang.slice(enStart, deStart) : '';
const deBlock = deStart >= 0 ? lang.slice(deStart) : '';
check('both dictionaries were located', enBlock.length > 0 && deBlock.length > 0);

const usedKeys = [...new Set([...pageCode.matchAll(/\bt\('([^']+)'\)/g)].map((m) => m[1]))];
check('the page asks for translated strings at all', usedKeys.length > 0, `${usedKeys.length} key(s)`);
const missingEn = usedKeys.filter((k) => !enBlock.includes(`'${k}':`));
const missingDe = usedKeys.filter((k) => !deBlock.includes(`'${k}':`));
check('every key is in en',
  usedKeys.length > 0 && missingEn.length === 0, missingEn.join(', ') || `${usedKeys.length}/${usedKeys.length}`);
check('every key is in de — a missing one renders the raw key string',
  usedKeys.length > 0 && missingDe.length === 0, missingDe.join(', ') || `${usedKeys.length}/${usedKeys.length}`);
// And nothing was added to one dict on its own, either.
const enBookIndex = [...enBlock.matchAll(/'(bookIndex\.[\w.]+)':/g)].map((m) => m[1]).sort();
const deBookIndex = [...deBlock.matchAll(/'(bookIndex\.[\w.]+)':/g)].map((m) => m[1]).sort();
check('the bookIndex.* sets are identical in both dictionaries',
  enBookIndex.length > 0 && enBookIndex.join('|') === deBookIndex.join('|'),
  `en ${enBookIndex.length} / de ${deBookIndex.length}`);
check('the de values are not just the English copied across',
  deBookIndex.length > 0 && deBookIndex.every((k) => {
    const en = (enBlock.match(new RegExp(`'${k.replace('.', '\\.')}':\\s*'([^']*)'`)) || [])[1];
    const de = (deBlock.match(new RegExp(`'${k.replace('.', '\\.')}':\\s*'([^']*)'`)) || [])[1];
    return en && de && en !== de;
  }));

// ── Discovery ────────────────────────────────────────────────────────────────
console.log('\n=== the studio can find the URL without being told it ===');
// A page nobody can discover repeats the exact problem the page was built to fix.
// The URL is no longer BUILT here — it comes from client/src/lib/bookingUrl.ts, which
// exists because this path was written inline in seven places across two files and has
// already shipped wrong twice (/schedule/<slug> from the calendar page, and a gallery
// slug re-derived in the browser). Assert the SOURCE, not the literal.
check('the Schedulers page uses the shared booking-URL helper',
  /lib\/bookingUrl/.test(admin) && /bookingIndexUrl\(\)/.test(admin));
check('and shows it on screen', /\{bookingIndexHref\}/.test(admin));
check('there is a Copy button for it', /copyBookingIndexLink/.test(admin));
check('with its own copied flag, not copiedSlug overloaded',
  /const \[copiedIndex, setCopiedIndex\]/.test(admin) && /\{copiedIndex \?/.test(admin));
check('and a preview link that opens /book', /href="\/book"/.test(admin));
// The per-scheduler links must still be there — this bar is an addition, not a swap.
check('the per-scheduler copy buttons are untouched', /copyBookingLink\(scheduler\.slug\)/.test(admin));

console.log('\n=== the admin never offers a link to a page that lists nothing ===');
check('the page counts what is Active', /const activeSchedulerCount = schedulers\.filter\(s => s\.isActive\)\.length;/.test(admin));
check('the Copy button is disabled when nothing is Active',
  /disabled=\{activeSchedulerCount === 0\}/.test(admin));
check('and the studio is told why, pointing at the fix',
  /Nothing is listed yet/.test(admin) && /Active/.test(admin));
// The bar's promise and the endpoint's filter have to be the same predicate, or the studio
// is told "3 session types" and the client is shown a different number.
check('the admin count and the endpoint filter agree on isActive',
  /schedulers\.filter\(s => s\.isActive\)/.test(admin) && /eq\(schedulers\.isActive,\s*true\)/.test(handler));

console.log(bad
  ? `\n  ${bad} CHECK(S) FAILED — the booking index is not the page it claims to be\n`
  : '\n  ALL CHECKS PASSED — /book lists what is bookable, says so honestly when nothing is, and the studio can find it\n');
process.exit(bad ? 1 : 0);
