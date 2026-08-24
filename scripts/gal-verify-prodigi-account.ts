// Whose Prodigi account buys the parcel?
//
// A photographer will not create a Prodigi account, generate an API key, export a pricing
// sheet and import it before they can see a single print product. That is four steps of
// setup in front of a feature they have not been shown, and it is why print_products has
// been empty since the feature shipped.
//
// The fix is to let the CATALOGUE be read on a platform account, so the shop is populated
// on day one. The trap is that the same key, one frame deeper, silently makes the PLATFORM
// the merchant of record for physical goods — reprints, chargebacks, and B2B sales tax in
// whichever country the buyer lives in. That is cheap to set up and expensive to unwind.
//
// So the rule is: READING the catalogue may use the platform account; PLACING AN ORDER may
// not. This file exists because that rule is one careless `await getProdigiConfig()` away
// from being false, and it already was:
//
//   dispatchPrintOrder resolved the studio account, refused to run without one, and then
//   POSTed /orders through prodigiRequest() — which resolved its OWN key and would have
//   bought the parcel on the platform's card. The guard was there; the helper walked
//   straight past it.
//
// Run: npx tsx scripts/gal-verify-prodigi-account.ts
import fs from 'fs';

let bad = 0;
const check = (label: string, ok: boolean, detail = '') => {
  if (!ok) bad++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? '  — ' + detail : ''}`);
};

const acct = fs.readFileSync('server/lib/prodigiAccount.ts', 'utf8');
const routes = fs.readFileSync('server/routes/prodigi.ts', 'utf8');

// Comments here necessarily describe the old behaviour.
const code = (s: string) => s.split('\n').filter((l) => {
  const t = l.trim();
  return !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*');
}).join('\n');
const routesCode = code(routes);

/** A function body, bounded at its own closing brace at column 0. */
const fnBody = (src: string, marker: string) => {
  const a = src.indexOf(marker);
  if (a < 0) return '';
  const b = src.indexOf('\n}', a);
  return b < 0 ? src.slice(a) : src.slice(a, b);
};

console.log('\n=== the two accounts are distinct, and only one can sell ===');
check('a studio-only resolver exists', /export async function studioProdigiAccount/.test(acct));
check('a catalogue resolver exists', /export async function catalogueProdigiAccount/.test(acct));
// The safety property: the studio resolver must NOT fall back.
const studioFn = fnBody(acct, 'export async function studioProdigiAccount');
check('the studio resolver never falls back to the platform key',
  !/PRODIGI_PLATFORM_API_KEY/.test(studioFn) && !/platformKey/.test(studioFn));
check('the catalogue resolver prefers the studio\'s own account first',
  /const own = await studioProdigiAccount\(\);[\s\S]{0,80}if \(own\.apiKey\) return own;/.test(acct));

console.log('\n=== the platform key cannot become a studio key by accident ===');
// config-reader maps PRODIGI_API_KEY as the env fallback for the studio's own key, so a
// platform value in THAT variable would silently become this instance's studio account.
check('the platform key uses a distinct variable name', /PRODIGI_PLATFORM_API_KEY/.test(acct));
check('and it is not PRODIGI_API_KEY', !/process\.env\.PRODIGI_API_KEY/.test(code(acct)));
const cfg = fs.readFileSync('server/config-reader.ts', 'utf8');
check('config-reader still maps PRODIGI_API_KEY to the studio\'s own key',
  /prodigi_api_key: 'PRODIGI_API_KEY'/.test(cfg));

console.log('\n=== every path that bills a human uses the studio account ===');
// The order endpoint refuses outright.
check('the order endpoint requires the studio account',
  /const studioAccount = await requireStudioProdigi\(res\)/.test(routesCode));
check('and returns a 402 rather than proceeding', /res\.status\(402\)\.json\(connectAccountRequired\(\)\)/.test(routesCode));
check('the refusal explains why the account must be theirs', /ship under your name/.test(acct));

// Dispatch is the one that actually buys the parcel.
const dispatch = fnBody(routes, 'export async function dispatchPrintOrder');
check('dispatch resolves the studio account', /await studioProdigiAccount\(\)/.test(dispatch));
check('dispatch never resolves the catalogue account', !/catalogueProdigiAccount|getProdigiConfig/.test(code(dispatch)));

// THE BUG THIS FILE EXISTS FOR. A helper that re-resolves discards the caller's decision.
console.log('\n=== a helper cannot discard the caller\'s account ===');
check('prodigiRequest accepts an explicit account',
  /account\?: \{ apiKey: string; baseUrl: string \}/.test(routes));
check('and only defaults when none is given',
  /const \{ apiKey, baseUrl \} = account \|\| \(await catalogueProdigiAccount\(\)\)/.test(routesCode));
// The POST that buys the parcel must pass one.
check('the order POST passes the studio account explicitly',
  /prodigiRequest\('\/orders', 'POST', prodigiOrder, \{ apiKey, baseUrl \}\)/.test(routesCode));

console.log('\n=== reading an existing order uses the account that placed it ===');
// The platform account cannot see an order placed on the studio's — asking with the wrong
// key returns "not found" for an order that exists, which reads as a lost parcel.
check('order status reads use the studio account',
  /const \{ apiKey: statusApiKey \} = await studioProdigiAccount\(\)/.test(routesCode));

console.log('\n=== the catalogue is still readable without any studio setup ===');
// If this breaks, the whole point is lost: the studio sees an empty shop again.
check('catalogue browsing uses the shared resolver', /await catalogueProdigiAccount\(\)/.test(routesCode));
check('the platform catalogue reads production prices, not sandbox',
  /sandbox prices are not real/.test(acct));

console.log(bad
  ? `\n  ${bad} CHECK(S) FAILED — an order could be placed on the wrong account\n`
  : '\n  ALL CHECKS PASSED — the catalogue is shared, the selling is not\n');
process.exit(bad ? 1 : 0);
