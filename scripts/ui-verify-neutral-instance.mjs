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

import { readFileSync } from 'fs';

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

console.log(`\n  ${failed === 0 ? 'all checks passed' : failed + ' FAILED'}\n`);
process.exit(failed === 0 ? 0 : 1);
