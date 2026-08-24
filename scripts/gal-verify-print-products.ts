// Can a studio find, stock and price their print products — without buying anything on
// somebody else's account, and without being lied to on the day the shelf is empty?
//
// print_products has been empty since the feature shipped. The catalogue lived at the
// bottom of a settings page about API keys, there is no starter catalogue in this build
// yet, and the markup a studio sets was request-scoped, so it survived nothing. This file
// guards the three ways the new Print Products page can quietly go wrong:
//
//   1. STOCKING BUYS SOMETHING. Seeding is a file copy plus an INSERT. The moment any
//      Prodigi call creeps into it, a free action starts spending — and if it resolves
//      the catalogue account, it spends the PLATFORM's key. That is the trap
//      server/lib/prodigiAccount.ts exists to prevent.
//   2. THE MARGIN BECOMES ZERO IN SILENCE. applyMarkup treats a non-finite percentage as
//      0%, i.e. sell at cost. strictNullChecks is off in this project, so a parameter
//      typed `number` catches nothing and one unset setting seeds a whole catalogue at
//      cost. The failure is invisible until an accountant finds it.
//   3. THE EMPTY SHELF LIES. With no starter catalogue in the build, a "Stock my shop"
//      button does nothing. Offering it anyway — or claiming products are waiting — is
//      worse than saying so.
//
// A note on how these are checked. Where a claim can be made by CALLING the code, it is;
// the seeding path is not, because seeding writes to print_products and a verification
// script must not stock the live studio's shop. Those claims are checked against the
// source of ONE function or ONE route handler, never the whole file — a whole-file scan
// for "does a mailer appear anywhere" is the check that passes no matter what.
//
// Run: npx tsx scripts/gal-verify-print-products.ts
import 'dotenv/config';
import fs from 'fs';
import { applyMarkup } from '../server/lib/prodigiSheet';
import { hasStarterCatalogue, seedPrintCatalogue } from '../server/lib/seedPrintCatalogue';
import { connectAccountRequired } from '../server/lib/prodigiAccount';

let bad = 0;
const check = (label: string, ok: boolean, detail = '') => {
  if (!ok) bad++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? '  — ' + detail : ''}`);
};

const read = (p: string) => fs.readFileSync(p, 'utf8');
/** Comments describe intentions, including abandoned ones. Assert against code only. */
const code = (s: string) => s.split('\n').filter((l) => {
  const t = l.trim();
  return !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*');
}).join('\n');

/**
 * The body of one function or one route handler, bounded by matching braces.
 *
 * Returns '' when the marker is absent, and callers must treat that as a FAILURE rather
 * than as an empty body that satisfies every "does not contain" check. An extractor that
 * silently returns nothing is how a guard starts passing forever.
 */
function blockAfter(src: string, marker: string): string {
  const start = src.indexOf(marker);
  if (start < 0) return '';
  const open = src.indexOf('{', start + marker.length - 1);
  if (open < 0) return '';
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') {
      depth--;
      if (depth === 0) return src.slice(open, i + 1);
    }
  }
  return '';
}

async function main() {
  const routesSrc = read('server/routes/prodigi.ts');
  const routes = code(routesSrc);
  const seederSrc = read('server/lib/seedPrintCatalogue.ts');
  const page = read('client/src/pages/admin/PrintProductsPage.tsx');
  const app = read('client/src/App.tsx');
  const sidebar = read('client/src/components/admin/AdminLayout.tsx');

  console.log('\n=== the page exists and is reachable ===');
  check('the sidebar has a Print Products entry',
    /path: '\/admin\/print-products'/.test(code(sidebar)));
  check('and the route is registered', /path="\/admin\/print-products"/.test(app));
  check('it is behind the admin guard, not open to the internet',
    /path="\/admin\/print-products"[\s\S]{0,200}<NeonProtectedRoute>/.test(app));
  check('the catalogue is no longer duplicated on the Prodigi settings page',
    !/\/api\/print\/catalog/.test(read('client/src/pages/admin/settings/ProdigiSettingsPage.tsx')));

  console.log('\n=== stocking the shop cannot spend anybody\'s money ===');
  const seedRoute = blockAfter(routes, "router.post('/catalog/seed'");
  check('the seed handler was found (premise)', seedRoute.length > 100, `${seedRoute.length} chars`);
  const spend = ['prodigiRequest', 'catalogueProdigiAccount', 'getProdigiConfig', 'PRODIGI_PLATFORM_API_KEY', 'fetch('];
  const spendInSeed = spend.filter((s) => seedRoute.includes(s));
  check('no Prodigi call of any kind inside it', spendInSeed.length === 0, spendInSeed.join(', ') || 'none');

  const markupRoute = blockAfter(routes, "router.post('/catalog/markup'");
  check('the markup handler was found (premise)', markupRoute.length > 100, `${markupRoute.length} chars`);
  const spendInMarkup = spend.filter((s) => markupRoute.includes(s));
  check('and none inside the markup handler either', spendInMarkup.length === 0, spendInMarkup.join(', ') || 'none');

  // The account split as a whole: adding routes must not add a second way to sell.
  const four02 = routes.match(/res\.status\(402\)/g) || [];
  check('there is still exactly one 402 in the file', four02.length === 1, `${four02.length} found`);
  const requireCalls = routes.match(/requireStudioProdigi\(res\)/g) || [];
  check('and the studio-only gate still has exactly one caller', requireCalls.length === 1, `${requireCalls.length} found`);

  console.log('\n=== the margin cannot silently become zero ===');
  check('100% markup doubles the lab cost', applyMarkup(12.5, 100) === 25, String(applyMarkup(12.5, 100)));
  // The hazard itself, stated as a fact rather than assumed: this is what an unset
  // setting would do if it reached applyMarkup untouched.
  check('a non-finite markup would sell AT COST (the hazard)',
    applyMarkup(12.5, null as any) === 12.5, String(applyMarkup(12.5, null as any)));
  check('an unpriced product stays unpriced rather than free',
    applyMarkup(0, 100) === null && applyMarkup(null, 100) === null);

  const seedFn = blockAfter(seederSrc, 'export async function seedPrintCatalogue');
  check('the seeder body was found (premise)', seedFn.length > 200, `${seedFn.length} chars`);
  check('the seeder does not hand its raw parameter to applyMarkup',
    !/applyMarkup\([^)]*markupPercent\s*\)/.test(code(seedFn)));
  check('it guards the value first', /Number\.isFinite\(markupPercent\)/.test(code(seedFn)));

  console.log('\n=== the studio\'s markup survives the request that set it ===');
  const getMarkup = blockAfter(routesSrc, 'async function getMarkupPercent');
  const setMarkup = blockAfter(routesSrc, 'async function setMarkupPercent');
  check('a reader and a writer both exist (premise)',
    getMarkup.length > 50 && setMarkup.length > 50, `${getMarkup.length}/${setMarkup.length} chars`);
  // Drizzle silently drops keys that are not table properties, and there is no
  // prodigi_markup_percent in shared/schema.ts — so a Drizzle write would be a no-op that
  // never errors, and config.get() cannot read the column back either.
  check('the writer names the column in SQL rather than going through Drizzle',
    /pool\.query/.test(setMarkup) && !/db\.(update|insert|select)/.test(setMarkup));
  check('so does the reader',
    /pool\.query/.test(getMarkup) && !/db\.(update|insert|select)/.test(getMarkup));
  check('the column is created idempotently, not assumed',
    /ADD COLUMN IF NOT EXISTS prodigi_markup_percent/.test(routesSrc));
  check('seeding prices at the stored markup, not a literal',
    /seedPrintCatalogue\(markupPercent\)/.test(seedRoute) && /getMarkupPercent\(\)/.test(seedRoute));

  console.log('\n=== the connect prompt links somewhere that exists ===');
  // The server names the settings path so one string cannot drift across screens. That
  // only works if a route answers it: it named /admin/settings/technical-setup, which
  // nothing in App.tsx has ever registered, so every screen that followed it hit a 404.
  const settingsPath = connectAccountRequired().settingsPath;
  check('the refusal carries a settings path', typeof settingsPath === 'string' && settingsPath.length > 1, settingsPath);
  check('and App.tsx registers a route for exactly that path',
    app.includes(`path="${settingsPath}"`), settingsPath);
  check('the page follows the server\'s path instead of spelling its own',
    /to=\{connect\.settingsPath\}/.test(page) && !/\/admin\/settings\/technical-setup/.test(page));
  check('a 402 is recognised by its code, not just its status',
    /res\.status === 402/.test(page) && /prodigi_account_required/.test(page));
  check('and the prompt says why the account has to be theirs',
    /bills your card/.test(page) && /under your studio name/.test(page));

  console.log('\n=== an empty shelf says something true ===');
  // With no starter catalogue in the build there is nothing to copy in, so the action must
  // not be offered. Checked structurally: the button must sit in the "available" branch.
  const TERNARY = 'starterAvailable ? (';
  let cursor = 0;
  let ternaries = 0;
  let inTrueBranch = 0;
  while (true) {
    const t = page.indexOf(TERNARY, cursor);
    if (t < 0) break;
    ternaries++;
    const elseAt = page.indexOf(') : (', t);
    if (elseAt < 0) { cursor = t + TERNARY.length; continue; }
    inTrueBranch += (page.slice(t, elseAt).match(/onClick=\{stockShop\}/g) || []).length;
    cursor = elseAt + 1;
  }
  const stockButtons = (page.match(/onClick=\{stockShop\}/g) || []).length;
  check('the page offers stocking at all (premise)', stockButtons > 0, `${stockButtons} button(s)`);
  check('the branch it is offered in was found (premise)', ternaries > 0, `${ternaries} found`);
  // A button in the else-branch is a button offered when nothing can be stocked.
  check('every stock button sits inside the "a catalogue ships" branch',
    inTrueBranch === stockButtons, `${inTrueBranch} of ${stockButtons}`);
  check('the empty-build copy names the real reason',
    /No starter catalogue/i.test(page) && /nothing to (copy in|stock)/i.test(page));

  // Behavioural, and safe: with no catalogue file the seeder returns before it touches the
  // database, so this runs no queries and stocks nothing.
  if (!hasStarterCatalogue()) {
    const r = await seedPrintCatalogue(100);
    check('seeding an empty build changes nothing', r.seeded === 0 && r.skipped === 0);
    check('and gives the page a reason to show, not silence',
      typeof r.reason === 'string' && r.reason.trim().length > 0, r.reason || '(none)');
  } else {
    console.log('  SKIP  a starter catalogue ships in this build, so the empty-shelf path is not exercised here');
  }

  console.log(bad
    ? `\n  ${bad} CHECK(S) FAILED — the print shop is not safe to hand a studio\n`
    : '\n  ALL CHECKS PASSED — stocking is free, the margin is kept, and the empty shelf is honest\n');
  process.exit(bad ? 1 : 0);
}

main();
