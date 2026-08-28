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

// ── The customer communication path ────────────────────────────────────────
//
// Worse than a log line or a blog post, because these go to a STUDIO'S OWN CLIENTS under the
// studio's name. Five services carried the origin studio into them:
//
//   - abandonedCheckout mailed a "finish your order" button whose URL fell back to
//     newagefotografie.com, sending a buyer's own customers to a different photographer.
//     It also built its own transport hardcoded to smtp.easyname.com, the origin studio's
//     provider, with no override — so for any studio not hosted there, this never sent at all.
//   - brevoService fell back to a REAL mailbox at the origin domain, so replies went to them.
//   - smsService signed a studio's texts with the origin studio's name.
//   - WorkflowExecutionService used it whenever a studio left a template field blank.
//   - enhancedEmailService and smsService each carried a whole set of German templates
//     signed "Ihr Team von New Age Fotografie" — dead exports with no callers, so removed
//     rather than translated.
const commsFiles = [
  'server/services/enhancedEmailService.ts',
  'server/services/smsService.ts',
  'server/services/abandonedCheckout.ts',
  'server/services/brevoService.ts',
  'server/services/WorkflowExecutionService.ts',
];
const commsLeaks = commsFiles.filter((f) => /New Age Fotografie|newagefotografie/i.test(codeOnly(read(f))));
check('nothing sent to a studio\'s clients names the origin studio',
  commsLeaks.length === 0,
  commsLeaks.join(', ') || `${commsFiles.length} services clean`);

// The link is the dangerous half. A missing name is embarrassing; a working button pointing
// at another studio is a transfer of the customer.
const abandoned = read('server/services/abandonedCheckout.ts');
check('a recovery email with nowhere to link is not sent at all',
  /if \(!origin\) \{/.test(abandoned) && /skipping reminders/.test(abandoned),
  'no default is safe here, so there is no default');

check('and it posts through the studio\'s own SMTP, not a hardcoded provider',
  /getSmtpTransporter\(\)/.test(abandoned) && !/smtp\.easyname\.com/.test(codeOnly(abandoned)),
  'the hardcoded host made this a delivery bug as well as a branding one');

// ── Ratchets ───────────────────────────────────────────────────────────────
//
// NOT a clean bill of health. Both markers are still present in live server code and clearing
// them is separate work — autoblog.ts alone has 13, including fetchReviews('New Age Fotografie
// Wien'), which pulls a NAMED THIRD PARTY'S reviews into a tenant's generated content.
//
// Some remaining hits are correct and must stay: vite.ts rewrites the old domain when
// migrating the origin instance, and routes.ts uses it in a regex whose whole job is to DETECT
// origin branding. A ratchet records the number without claiming every line is a bug.
//
// A file may shrink, never grow; a marker in a new file fails outright.
const NAME_BASELINE = {
  'server/autoblog.ts': 13,
  'server/autoblog-content-fixes.ts': 5,
  'server/routes.ts': 5,
  'server/autoblog-assistant-first.ts': 3,
  'server/autoblog-fixed.ts': 2,
  'server/storage.ts': 2,
  'server/routes/questionnaires.ts': 1,
  'server/services/socialSnippets.ts': 1,
  'server/togninja-sophisticated-prompt.ts': 1,
  'server/vite.ts': 1,
};
const DOMAIN_BASELINE = {
  'server/autoblog.ts': 5,
  'server/routes.ts': 4,
  'server/autoblog-utils.ts': 1,
  'server/index.production.ts': 1,
  'server/index.ts': 1,
  'server/routes/shootcleaner.ts': 1,
  'server/services/indexNow.ts': 1,
  'server/services/socialDistribution.ts': 1,
  'server/services/socialSnippets.ts': 1,
  'server/services/TavilySearchService.ts': 1,
  'server/services/zernio.ts': 1,
  'server/vite.ts': 1,
};
const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
  const full = `${dir}/${e.name}`;
  return e.isDirectory() ? walk(full) : /\.ts$/.test(e.name) ? [full] : [];
});
const ratchet = (label, rx, baseline, note) => {
  const grew = [];
  let remaining = 0;
  for (const f of walk('server')) {
    const n = codeOnly(read(f)).split(/\r?\n/).filter((l) => rx.test(l)).length;
    remaining += n;
    if (n > (baseline[f] || 0)) grew.push(`${f} ${baseline[f] || 0}→${n}`);
  }
  check(label, grew.length === 0, grew.join(', ') || `${remaining} line(s) of known debt — ${note}`);
};
ratchet('the origin studio\'s name is not spreading', /New Age Fotografie/, NAME_BASELINE,
  'was 58 before the communication path was cleared');
ratchet('nor is its domain', /newagefotografie|newage-fotografie/i, DOMAIN_BASELINE,
  'a domain fallback is a working link to another studio');

console.log(`\n  ${failed === 0 ? 'all checks passed' : failed + ' FAILED'}\n`);
process.exit(failed === 0 ? 0 : 1);
