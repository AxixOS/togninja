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

console.log(`\n  ${failed === 0 ? 'all checks passed' : failed + ' FAILED'}\n`);
process.exit(failed === 0 ? 0 : 1);
