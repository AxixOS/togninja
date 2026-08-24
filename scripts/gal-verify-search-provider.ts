// Can a studio give the Price Wizard a key, and does the platform pay when they have not?
//
// THE BUG THIS FILE EXISTS FOR. server/routes/price-wizard.ts called config.get() exactly
// zero times and read process.env thirteen times. Every other credential in this product
// resolves DB-first through config.get(), which is what makes the Technical Setup screen
// work — the Price Wizard opted out, so the only way to give it a key was a host environment
// variable that a photographer who bought this product cannot reach. There was not even a
// column for their key to live in.
//
// The studio saw: sessions filed 'manual entry', zero competitors, zero prices, and a message
// telling them to "set AXIXOS_INTERNAL_API_KEY in your environment".
//
// The two properties that must stay true:
//   1. A studio key, wherever they entered it, REACHES the crawl.
//   2. With no studio key, the PLATFORM key is used — so the feature works on day one.
// And the one that must never become true:
//   3. A platform key must never be mistaken for the studio's own. It is read from its own
//      variable, never through config.get(), which resolves the studio's column first.
//
// Run: npx tsx scripts/gal-verify-search-provider.ts
import 'dotenv/config';
import fs from 'fs';

let bad = 0;
const check = (label: string, ok: boolean, detail = '') => {
  if (!ok) bad++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? '  — ' + detail : ''}`);
};

const read = (p: string) => fs.readFileSync(p, 'utf8');
/** Comments necessarily describe the old behaviour, so claims are checked against CODE. */
const code = (s: string) => s.split('\n').filter((l) => {
  const t = l.trim();
  return !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*');
}).join('\n');

const provider = read('server/lib/searchProvider.ts');
const wizard = code(read('server/routes/price-wizard.ts'));
const research = code(read('server/services/PriceResearchService.ts'));
const tavily = code(read('server/services/TavilySearchService.ts'));
const cfg = read('server/config-reader.ts');
const boot = read('server/index.ts');

console.log('\n=== the studio has somewhere to put a key ===');
check('a column exists for it', /ADD COLUMN IF NOT EXISTS search_api_key_encrypted/.test(boot));
check('config-reader maps it to that column',
  /search_api_key: \{ table: 'studio_integrations', column: 'search_api_key_encrypted' \}/.test(cfg));
check('and gives it an env fallback for the studio\'s own key',
  /search_api_key: 'TAVILY_API_KEY'/.test(cfg));

console.log('\n=== the key actually reaches the crawl ===');
// The whole failure was a resolver that existed nowhere near the code doing the searching.
check('the route resolves through config.get, not process.env',
  /config\.get\('openai_api_key'\)/.test(wizard) && !/process\.env\.OPENAI_API_KEY/.test(wizard));
check('no raw Tavily env read is left in the route', !/process\.env\.TAVILY_API_KEY/.test(wizard));
check('no raw Tavily env read is left in the research service',
  !/process\.env\.TAVILY_API_KEY/.test(research));
check('the search client takes its key from the caller',
  /constructor\(apiKey\?: string \| null\)/.test(tavily) && !/process\.env\.TAVILY_API_KEY/.test(tavily));
check('the research service resolves once per run',
  /await this\.ensureProvider\(\)/.test(research));
check('and hands the resolved key to the client',
  /new TavilySearchService\(this\.provider\.apiKey\)/.test(research));

console.log('\n=== the studio\'s own key WINS over the platform\'s ===');
// If this inverts, a studio who pays for their own quota is silently ignored.
// Positions compared in the CODE, not the raw file: the header comment names
// AXIXOS_INTERNAL_API_KEY while explaining the split, which sits above everything and
// would always look like it came first.
const providerCode = code(provider);
const ownFirst = providerCode.indexOf('const own = await studioSearchKey()');
const platformAfter = providerCode.indexOf('AXIXOS_INTERNAL_API_KEY');
check('the studio key is checked before any platform key',
  ownFirst > 0 && platformAfter > ownFirst, `own@${ownFirst} platform@${platformAfter}`);
check('and returning it short-circuits the platform path',
  /if \(own\) \{[\s\S]{0,200}source: 'studio'/.test(provider));

console.log('\n=== a platform key can never become a studio key ===');
// config.get() resolves the studio's column FIRST, so a platform value read through it would
// be indistinguishable from one the studio entered. Platform keys are env-only, by name.
check('the platform keys are read from process.env directly',
  /process\.env\.AXIXOS_INTERNAL_API_KEY/.test(provider));
check('and never through config.get',
  !/config\.get\('AXIXOS|config\.get\('TAVILY_PLATFORM/.test(provider));
check('the platform Tavily variable is distinct from the studio\'s',
  /TAVILY_PLATFORM_API_KEY/.test(provider) && /search_api_key: 'TAVILY_API_KEY'/.test(cfg));

console.log('\n=== nothing tells a photographer to set an environment variable ===');
const clientPage = read('client/src/pages/admin/AdminPriceWizardPage.tsx');
// searchUnavailable() only — not the whole module. The file DOCUMENTS the variable names
// in its header, which is where they belong; what must not name them is the text a studio
// reads. Checking the module wholesale failed on its own explanation.
const refusal = provider.slice(provider.indexOf('export function searchUnavailable'));
for (const [label, src] of [
  ['the Price Wizard page', clientPage],
  ['the refusal a studio is shown', refusal],
  ['the research service', research],
] as const) {
  check(`${label} names no env var`, !/AXIXOS_INTERNAL_API_KEY|TAVILY_API_KEY/.test(code(src)));
}

console.log('\n=== no key is ever printed ===');
// This logged the first eight characters of a live credential on every search.
check('the search client logs presence, not a prefix',
  !/apiKey\.substring|apiKey\.slice/.test(tavily));

// ── The live answer ─────────────────────────────────────────────────────────
(async () => {
  console.log('\n=== what THIS instance would use right now ===');
  try {
    const { searchProvider } = await import('../server/lib/searchProvider');
    const p = await searchProvider();
    console.log(`  provider: ${p.kind || 'none'}  source: ${p.source || 'none'}  key: ${p.apiKey ? 'present' : 'ABSENT'}`);
    if (!p.apiKey) {
      console.log('  (no key resolved here — expected locally unless the platform vars are in .env)');
    }
  } catch (e: any) {
    console.log('  could not resolve: ' + e?.message);
  }

  console.log(bad
    ? `\n  ${bad} CHECK(S) FAILED — a studio cannot switch this on, or the platform is paying when it should not\n`
    : '\n  ALL CHECKS PASSED — the studio\'s key wins, the platform\'s covers everyone else, and neither is mistaken for the other\n');
  process.exit(bad ? 1 : 0);
})();
