// Does "What everyone else charges" actually look?
//
// Observed live on 31 Aug 2026: nothing found in Hoi An, then nothing in Vienna — a city with
// hundreds of photographers who publish their prices. Two cities, two continents, zero both
// times. That is not a market, it is a wiring fault.
//
// POST /api/price-wizard/discover — the endpoint the ONBOARDING pricing step calls — used
// CompetitorDiscoveryService and nothing else. That service fetches google.com/search from the
// server, so from a datacenter IP it gets a consent page rather than results, and its own
// comment says so: "real discovery is handled by Tavily (see PriceResearchService); this direct
// Google-scrape [is best-effort]". The working providers were one function call away, in
// /research, which this step never calls.
//
// Worse than empty: the screen reported it as a finding. "We could not find other photographers
// listed in Wien. That is worth knowing too." — a configuration gap dressed up as a fact about
// the studio's market, which is the opposite of what this feature is for.
import fs from 'fs';

let bad = 0;
const check = (label, ok, detail = '') => {
  if (!ok) bad++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? '  — ' + detail : ''}`);
};

const codeOnly = (src) =>
  src.split(/\r?\n/).filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
const read = (p) => fs.readFileSync(p, 'utf8');

const routeRaw = read('server/routes/price-wizard.ts');
const route = codeOnly(routeRaw);
const phaseRaw = read('client/src/pages/setup/phases/PricingPhase.tsx');
const phase = codeOnly(phaseRaw);

// Just the /discover handler — /research legitimately does its own thing.
const discover = (() => {
  const at = route.indexOf("router.post('/discover'");
  if (at < 0) return '';
  const end = route.indexOf('router.post(', at + 10);
  return route.slice(at, end > 0 ? end : at + 4000);
})();

console.log('\n=== the onboarding step uses the real search ===');

check('the /discover handler was found', discover.length > 0);
check('it resolves a search provider', /await searchProvider\(\)/.test(discover));
check('and asks that provider first', /searchCompetitors\(location, services, maxResults\)/.test(discover));
// Both kinds: a studio's own key resolves to tavily, the platform's to axixos.
check('both provider kinds are handled',
  /AxixosSearchService/.test(discover) && /TavilySearchService/.test(discover));
// The scrape stays, as a last resort rather than the only resort.
const providerAt = discover.indexOf('await searchProvider()');
const scrapeAt = discover.indexOf('discovery.discoverCompetitors');
check('the google scrape is the fallback, not the path',
  providerAt > 0 && scrapeAt > 0 && providerAt < scrapeAt,
  providerAt < 0 || scrapeAt < 0 ? 'one of the two is gone' : `provider@${providerAt} scrape@${scrapeAt}`);

console.log('\n=== an empty result is not reported as a market finding ===');

check('the endpoint says whether a search was possible', /searchable,/.test(discover));
check('the screen reads it', /setSearchable\(found\?\.searchable !== false\)/.test(phase));
check('and only claims a finding when it actually looked',
  /: searchable\s*\?/.test(phase));
check('otherwise it says the search did not run',
  /this is not a finding about/.test(phaseRaw));

console.log('\n=== the studio is not shown the platform\'s plumbing ===');

// searchProvider.ts: "Names no environment variable. The old copy said 'set
// AXIXOS_INTERNAL_API_KEY (or a Tavily key)' to a photographer, which is both unactionable
// and a leak of how the platform is wired."
// Scoped to `message:` — what a studio reads. The diagnostics endpoint reports
// `reason: 'AXIXOS_INTERNAL_API_KEY not set'`, which is operator-facing and exactly right:
// whoever is debugging the platform's own wiring needs the variable's name. Checking the whole
// file failed on that, which would have taught someone to weaken the check rather than the
// copy — so it asks the narrower question that actually matters.
const studioMessages = [...routeRaw.matchAll(/message:\s*(['"`])([\s\S]*?)\1/g)].map((m) => m[2]);
const leaky = studioMessages.filter((m) => /[A-Z][A-Z0-9_]{6,}_(KEY|TOKEN|SECRET|URL)/.test(m));
check('no environment variable is named at a studio',
  leaky.length === 0,
  leaky.length ? leaky[0].slice(0, 70) : `${studioMessages.length} messages checked`);

console.log(bad ? `\n${bad} FAILING\n` : '\nall good\n');
process.exit(bad ? 1 : 0);
