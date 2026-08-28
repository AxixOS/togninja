// A freshly provisioned tenant must not inherit the origin studio's language.
//
// Measured on togninja-studio, minutes after the Blueprint created it:
//
//     GET /api/i18n/settings   ->  {"defaultLanguage":"de","enabledLanguages":["en","de"]}
//
// while the same instance's injected site identity said lang "en" and name "My Studio". The
// language provider fetches that endpoint on mount and applies defaultLanguage over the
// correct value, so the whole UI flipped to German — the cookie banner is simply where it
// was visible first.
//
// The reasoning behind the German default was sound for the ORIGIN instance, which has been
// running in German since before the question existed and must not be flipped to English by
// a code change. It conflated that with an instance provisioned five minutes ago, which has
// answered nothing because nobody has been asked yet. A stored 'de' still wins; only the
// ambient default moved.

import { readFileSync, readdirSync } from 'fs';

const read = (p) => readFileSync(p, 'utf8');
const i18n = read('server/routes/i18n.ts');
const banner = read('client/src/components/CookieConsent.tsx');
const app = read('client/src/App.tsx');

let failed = 0;
const check = (label, ok, detail = '') => {
  console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${label}${detail ? '  — ' + detail : ''}`);
  if (!ok) failed++;
};

console.log('\nNeutral instance\n');

// ── The language a new tenant starts in ─────────────────────────────────────
check('a new i18n_settings row defaults to English',
  i18n.includes("default_language text DEFAULT 'en'"));

check('and so do both read-time fallbacks',
  !i18n.includes("|| 'de',"),
  "an unanswered instance is not evidence of German");

// The safety property the original German default existed to protect. A studio that has
// STORED a language keeps it; only the absence of an answer changed meaning.
check('a stored language still wins over the default',
  i18n.includes('explicit || r.default_language'));

// ── The banner that made it visible ─────────────────────────────────────────
check('the accept button uses the theme, not a fixed gradient',
  !banner.includes('from-purple-600 to-pink-500')
  && banner.includes("var(--tn-primary"),
  'it was the same unthemed brand pair fixed across the landing sections');

// Labels translated and hrefs did not, so an English studio got "Privacy Policy" pointing
// at /datenschutz/.
check('the legal links follow the language too',
  banner.includes('const privacyHref') && banner.includes('/privacy/'));

// Impressum is a German and Austrian legal requirement. Offering it elsewhere offers a
// link to a route that does not exist.
check('no imprint link where there is no imprint',
  banner.includes('imprintHref && (') && banner.includes('de ? "/impressum/" : null'));

check('the call site no longer hardcodes German paths',
  !app.includes('privacyPolicyUrl="/datenschutz/"'));

// ── Seeded shop data must be in the buyer's language ────────────────────────
//
// The starter vouchers were the origin studio's own German list and were inserted into every
// tenant unconditionally. Observed live on a Buckinghamshire photographer's instance:
//
//     ✅ Found voucher products: 3
//     📋 First product: Familie Fotoshooting - €299.00
//
// Worse than the i18n default above, because vouchers are not chrome — they are a public shop
// page the studio's own customers buy from, so the leak is visible to people who have never
// heard of the origin studio.
const initDb = read('scripts/init-database.ts');
// Comments may NAME the rule; only code may satisfy it. The first version of the check below
// passed on the word getSiteLanguage() appearing in a comment three lines above the code that
// no longer called it. Line-based, so unlike a character walker it can never delete code.
const codeOnly = (src) => src.split(/\r?\n/).filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
const initDbCode = codeOnly(initDb);

check('the voucher seed asks what language the studio publishes in',
  /getSiteLanguage\(\)/.test(initDbCode),
  'it inserted the German list regardless of who the tenant was');

check('and English is what a studio gets unless German is asked for',
  /const vouchers = german \? germanVouchers : englishVouchers;/.test(initDbCode),
  'the fallback direction matters: en is the product default, de is the exception');

// The German set is deliberately preserved byte-for-byte — those slugs are live public URLs
// on studios already trading in German. This asserts the English set exists ALONGSIDE it,
// not that the German one was translated away.
check('both sets exist, so no German studio loses its slugs',
  /const germanVouchers = \[/.test(initDbCode) && /const englishVouchers = \[/.test(initDbCode)
  && /slug: 'familie-fotoshooting'/.test(initDbCode) && /slug: 'family-photo-session'/.test(initDbCode));

// Currency is the same class of leak wearing different clothes. A coupon carries its amount
// in discountValue and its kind in discountType; restating "€25" in prose put euros on a
// sterling studio's coupon list, where nothing would ever correct it.
check('no seeded copy hardcodes a currency symbol',
  !/description: '[^']*[€$£¥][^']*'/.test(initDbCode),
  'the amount belongs in discountValue, where the UI can render it in the studio\'s currency');

// ── A studio's own edits must come back in their own language ───────────────
//
// Every handler in manual-pages defaulted to 'de' — the origin studio's language — while the
// editor's toggle defaults to the STUDIO's. On an English studio that is a split brain: the
// editor saves under 'en', anything omitting the parameter reads 'de', and the studio writes
// a page, reloads their site and finds the work missing. GET /published/all is the one that
// bites, because it is what the public site reads to overlay their edits onto the built-in
// copy. Seen on togninja-studio (site_language 'en') reading site-settings and contact as 'de'.
const manualPages = codeOnly(read('server/routes/manual-pages.ts'));

check('no handler assumes the origin studio\'s language',
  !/=\s*'de'\s*[,}]/.test(manualPages),
  'a bare \'de\' default is the origin studio leaking into every tenant');

// Counting CALL SITES, not the helper's existence. The first version of this check passed
// with every `await defaultLanguage()` replaced by 'de', because the unused function still
// matched the pattern — a guard that a dead definition satisfies proves nothing.
const languageCallSites = (manualPages.match(/\(await defaultLanguage\(\)\)/g) || []).length;
check('the default is the language this studio publishes in',
  languageCallSites >= 6 && /getSiteLanguage/.test(manualPages),
  `${languageCallSites} handler(s) resolve it from studio_configs.site_language`);

// The dangerous half of this fix. A studio that edited while the default was 'de' has rows
// under 'de' whatever language it publishes in, so switching reads to 'en' without a fallback
// turns a mislabelling bug into apparent DATA LOSS — visibly worse than the bug.
check('correcting the default cannot blank what the old default wrote',
  /async function readLanguage\(/.test(manualPages)
  && /langs\.includes\(requested\)\) return requested;/.test(manualPages),
  'reads fall back to a language this studio actually has rows in');

// ...and writes must NOT fall back, or an English studio's edits stay filed under German for
// ever and the content never migrates.
check('but writes still file under the studio\'s real language',
  /const language = req\.body\?\.language \|\| \(await defaultLanguage\(\)\);/.test(manualPages),
  'the first save after this change is what migrates the page');

// ── The origin studio's name must not reach a buyer's instance ──────────────
//
// Read from a live customer's Render log, on the instance of a Buckinghamshire photographer:
//
//     🚀 Starting New Age Fotografie CRM server...
//     ✅ New Age Fotografie CRM post-init. Environment: production
//
// Log lines are the mildest form of this. The same name was also stamped into the Author field
// of every accounting-export PDF a studio hands their accountant, and into the subject of the
// test email they send while setting up their own SMTP.
//
// Two names, two different rules, and confusing them is how this gets "fixed" wrongly:
//   - Operator surfaces (boot logs) name the PRODUCT. TogNinja is correct there.
//   - Anything a studio's own customers or accountant see names the STUDIO, via
//     getSiteIdentity(). site-icons.ts already warns that shipping "TogNinja" into a buyer's
//     home screen is the same bug wearing the other hat.
const ORIGIN = /New Age Fotografie/;

const bootFiles = ['server/index.ts', 'server/index.production.ts'];
check('no boot log names the origin studio',
  bootFiles.every((f) => !ORIGIN.test(codeOnly(read(f)))),
  'a customer reading their own deploy should not see someone else\'s studio');

check('exported PDF metadata carries the STUDIO\'s name',
  /Author: getSiteIdentity\(\)\.name/.test(read('server/accounting-export/adapters/pdf-report.ts')),
  'Document Properties on the books a studio sends their accountant');

check('the SMTP test email comes from the studio, in their language',
  /subject: german[\s\S]{0,120}?identity\.name/.test(read('server/controllers/communicationController.ts')),
  'it was hardcoded German and signed with the origin studio');

// A RATCHET, not a clean bill of health.
//
// The origin studio's name is still in 58 lines of live server code. It is NOT mostly the
// autoblog files, which is what a truncated grep suggested — 35 of those lines are in the
// customer COMMUNICATION path: enhancedEmailService, smsService, abandonedCheckout,
// brevoService, WorkflowExecutionService. Those are worse than the blog, because they are
// sent to a studio's own clients under the studio's name.
//
// The single worst line is autoblog.ts:221, fetchReviews('New Age Fotografie Wien'), which
// pulls a NAMED THIRD PARTY'S reviews into a tenant's generated content.
//
// Clearing that is a separate piece of work. What this does is fix the debt at its current
// size: a file may shrink, never grow, and a name appearing in a new file fails outright.
const BASELINE = {
  'server/autoblog.ts': 13,
  'server/autoblog-content-fixes.ts': 5,
  'server/autoblog-assistant-first.ts': 3,
  'server/autoblog-fixed.ts': 2,
  'server/services/enhancedEmailService.ts': 9,
  'server/services/smsService.ts': 7,
  'server/routes.ts': 5,
  'server/services/abandonedCheckout.ts': 3,
  'server/services/brevoService.ts': 3,
  'server/services/WorkflowExecutionService.ts': 2,
  'server/storage.ts': 2,
  'server/routes/questionnaires.ts': 1,
  'server/services/socialSnippets.ts': 1,
  'server/togninja-sophisticated-prompt.ts': 1,
  'server/vite.ts': 1,
};
const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
  const full = `${dir}/${e.name}`;
  return e.isDirectory() ? walk(full) : /\.ts$/.test(e.name) ? [full] : [];
});
const grew = [];
let remaining = 0;
for (const f of walk('server')) {
  const n = codeOnly(read(f)).split(/\r?\n/).filter((l) => ORIGIN.test(l)).length;
  remaining += n;
  const allowed = BASELINE[f] || 0;
  if (n > allowed) grew.push(`${f} ${allowed}→${n}`);
}
check('the origin studio\'s name is not spreading',
  grew.length === 0,
  grew.length ? grew.join(', ') : `${remaining} line(s) of known debt, none growing`);

console.log(`\n  ${failed === 0 ? 'all checks passed' : failed + ' FAILED'}\n`);
process.exit(failed === 0 ? 0 : 1);
