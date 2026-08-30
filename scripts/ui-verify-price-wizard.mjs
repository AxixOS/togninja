// The Price Wizard says things to a photographer about their own market. Every check here
// exists because it said something untrue.
//
//   "Your price is higher than Infinity% of competitors" — one price found, so max === min,
//   so the percentile divided by zero. NaN and -Infinity came out of the same line.
//
//   Every suggestion in the database was 250 / 400 / 600, for event, corporate, newborn and
//   wedding alike, against medians of 400, 125, 1199 and 2499. Those are the placeholder
//   numbers in the prompt's own JSON example; the model answered the example.
//
//   A newborn "market" with a minimum of 30 and a maximum of 10,000, because when nothing
//   matched "newborn" the code pooled every price from every competitor and labelled the
//   result newborn.
//
//   And prompts that named Austria, Vienna and EUR to studios in Louisiana.
import { readFileSync } from 'fs';

const read = (p) => readFileSync(p, 'utf8');
const wiz = read('client/src/pages/setup/UnifiedSetupWizard.tsx');
const page = read('client/src/pages/admin/AdminPriceWizardPage.tsx');
const extractor = read('server/services/OpenAIPriceExtractor.ts');
const research = read('server/services/PriceResearchService.ts');
const route = read('server/routes/price-wizard.ts');
const filter = read('server/lib/competitorFilter.ts');

let failed = 0;
const check = (label, ok, detail = '') => {
  console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${label}${detail ? '  — ' + detail : ''}`);
  if (!ok) failed++;
};

console.log('\nPrice Wizard\n');

// ── The division ────────────────────────────────────────────────────────────
// Computing the spread is fine; dividing by it without knowing it is non-zero is not. So
// assert the property that matters — every division by the spread sits behind canPlace,
// which requires spread > 0 — rather than the easier proxy of banning the subtraction,
// which fails on correct code.
const SPREAD_DIV = '/ spread';
const divisions = page.split(SPREAD_DIV).length - 1;
check('the market spread is divided by exactly once', divisions === 1, divisions + ' site(s)');

const guardAt = page.indexOf('const rangePosition = canPlace');
check('that one division sits behind the canPlace guard',
  guardAt >= 0 && page.indexOf(SPREAD_DIV) > guardAt
    && page.indexOf(SPREAD_DIV) - guardAt < 260);

check('the page never claims a share of competitors',
  !/% of competitors/i.test(page));

check('the market position is gated on having a market to position against',
  /const canPlace\s*=/.test(page) && /spread > 0/.test(page) && /sampleSize >= 2/.test(page));

check('the bar marker cannot be given a non-finite offset',
  /left: `\$\{rangePosition\}%`/.test(page) && /Math\.min\(100, Math\.max\(0,/.test(page));

// ── The evidence behind the claim ───────────────────────────────────────────
check('sample size is stored',
  /ADD COLUMN IF NOT EXISTS sample_size/.test(read('server/index.ts')));

const inserts = (research.match(/INSERT INTO price_list_suggestions/g) || []).length
  + (route.match(/INSERT INTO price_list_suggestions/g) || []).length;
const withSample = (research.match(/market_max, sample_size/g) || []).length
  + (route.match(/market_max, sample_size/g) || []).length;
check('every insert of a suggestion records it', inserts > 0 && inserts === withSample,
  `${withSample}/${inserts} insert sites`);

check('the page shows how many prices are behind the chart',
  /price\$\{sampleSize === 1 \? '' : 's'\} found/.test(page));

// ── Placeholder numbers in prompts ──────────────────────────────────────────
//
// A literal price in a JSON shape example is a number the model can return instead of
// thinking. Any "suggestedPrice": <digits> in a prompt is the bug that shipped.
const literalTiers = extractor.match(/"suggestedPrice":\s*\d+/g) || [];
check('no prompt example offers a price for the model to copy', literalTiers.length === 0,
  literalTiers.join(', ') || 'none');

const literalStats = extractor.match(/"(min|max|median|average|quartile25|quartile75)":\s*\d+/g) || [];
check('no prompt example offers market statistics to copy', literalStats.length === 0,
  literalStats.join(', ') || 'none');

check('recommendations are checked against the data before being stored',
  /recommendationsTrackTheMarket/.test(extractor));

check('the check is applied on both analysis paths',
  (extractor.match(/this\.recommendationsTrackTheMarket\(/g) || []).length >= 2);

// ── Category contamination ──────────────────────────────────────────────────
check('pooling every service is disclosed rather than silent',
  /mixedCategories/.test(extractor) && /no prices specific to \$\{serviceType\} were found/.test(extractor));

check('prices far outside the range are dropped and the drop is disclosed',
  /OUTLIER_FACTOR/.test(extractor) && /left out/.test(extractor));

// ── Nobody's market but the studio's own ────────────────────────────────────
for (const [name, src] of [['extractor', extractor], ['research', research], ['route', route]]) {
  check(`${name} names no country of its own`,
    !/\b(Austrian|Austria|Vienna|Wien)\b/.test(src.replace(/^\s*(\/\/|\*).*$/gm, '')),
    'comments excluded');
  check(`${name} prints no hardcoded currency symbol`,
    !/[\u20ac\u00a3\u0024]\$\{/.test(src));
}

// ── One blocklist, not two ──────────────────────────────────────────────────
check('the competitor filter lives in one place',
  !/const irrelevant = \[/.test(research)
  && !/const irrelevant = \[/.test(read('server/services/TavilySearchService.ts'))
  && !/const irrelevant = \[/.test(read('server/services/AxixosSearchService.ts')));

check('both providers exclude the studio\'s own site',
  /isIrrelevantSite\(domain, own\)/.test(read('server/services/TavilySearchService.ts'))
  && /isIrrelevantSite\(domain, own\)/.test(read('server/services/AxixosSearchService.ts')));

check('review aggregators and cost guides are excluded',
  /trustanalytica\./.test(filter) && /latestcost\./.test(filter));


// ── The market research runs during setup ──────────────────────────────────
//
// Finding the photographers working in a studio's own town is one of the few genuinely
// uncommon things this product does, and it lived at /admin/price-wizard behind a
// 1,768-line management screen — reachable only by a studio who already knew to look.
const pricing = read('client/src/pages/setup/phases/PricingPhase.tsx');
// Comments may NAME the endpoints this deliberately does not call — the file explains at
// length why /research and /scrape cannot run here. Testing the prose failed the check for
// the very sentence that documents the rule being followed.
const pricingCode = pricing
  .split(/\r?\n/)
  .filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l))
  .join('\n');

check('the setup wizard shows the price research',
  /key: 'pricing'/.test(wiz) && /PricingPhase/.test(wiz));

// ORDERING IS LOAD-BEARING. /api/price-wizard sits behind authenticateUser, and the admin
// account is created by the step before. Placed any earlier, every call 401s.
const securityAt = wiz.indexOf("key: 'security'");
const pricingAt = wiz.indexOf("key: 'pricing'");
check('and only after there is an admin to be',
  securityAt > 0 && pricingAt > securityAt,
  'the price-wizard API is authenticated; before the account step it cannot be called at all');

// It calls DISCOVERY, which runs on this instance's own gateway key under search.competitor.
// /research and /scrape refuse without the STUDIO's OpenAI key, correctly — reading a
// competitor's prices is use, not show — so a step built on those would fail on every new
// instance, which is every instance that reaches this screen.
check('it uses the half that needs no key of the studio\'s',
  /price-wizard\/discover/.test(pricingCode) && !/price-wizard\/(research|scrape)/.test(pricingCode),
  'research and scrape require the studio\'s own OpenAI key and would 400 here');

// And says so, rather than offering a button that fails.
check('and says plainly what the other half needs',
  /your own OpenAI key/.test(pricing));

// The studio pays for competitor research "because they asked for it" — the words are in
// AxixosSearchService. Running it unprompted during setup would make that untrue.
check('the research is asked for, never automatic',
  /onClick=\{run\}/.test(pricing) && !/useEffect\([^)]*run\(\)/.test(pricing),
  'an automatic run bills a studio for something they did not request');

// Every other step in the essentials path can be passed through; this one is optional by
// nature and must not become a wall in front of the finish line.
check('and the step can always be skipped',
  /Skip for now/.test(pricing));
console.log(`\n  ${failed === 0 ? 'all checks passed' : failed + ' FAILED'}\n`);
process.exit(failed === 0 ? 0 : 1);
