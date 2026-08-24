// No screen may print a currency symbol it chose for itself.
//
// The admin carried 177 hardcoded euro signs while studio_configs held GBP — every money
// figure a Hove studio saw was in euros. The helper (client/src/hooks/useStudioCurrency)
// already existed and the public site already used it; the admin simply never asked.
// This guards the sweep.
//
// COUNTING IS NOT AS SIMPLE AS GREPPING FOR THE SYMBOL. Two traps, both hit during the
// sweep itself:
//
//  1. MOJIBAKE. A UTF-8 em-dash read as Latin-1 becomes the three characters "â€" — which
//     contains a euro byte. Ten of the original "177" were em-dashes in comments and
//     success messages, not currency at all, and one file appeared entirely unconverted
//     because of it.
//
//  2. LEGITIMATE USES. A currency PICKER should show <option value="EUR">EUR (€)</option>.
//     A translation map keyed on existing German data must keep its keys verbatim or the
//     lookup breaks. And the product's own subscription pricing is in the product's own
//     currency, not the tenant's.
import fs from 'fs';
import path from 'path';
import { walk, importedModuleNames, isReachable, reportUnreachable } from './lib/reachable.mjs';

// Files nothing imports are reported as cleanup rather than failures — see
// scripts/lib/reachable.mjs for why a permanently-red guard is worse than none.
const imported = importedModuleNames();
const unreachable = [];

// Files whose remaining symbols are correct, each with the reason. Adding to this list is
// a decision someone has to justify in writing, which is the point.
const ALLOW = {
  'pages/admin/AdminAutomationsPage.tsx':
    'German→English translation map keyed on existing data; changing the keys breaks the lookup',
  'pages/admin/ProDigitalFilesPage.tsx':
    "TogNinja's own subscription pricing, not the tenant's",
  'pages/admin/accounting/AccountingExportPage.tsx':
    'currency picker — an EUR option should show a euro sign',
  'components/admin/AdvancedInvoiceForm.tsx':
    'currency picker — an EUR option should show a euro sign',
  // NOTE: components/admin/InvoiceTemplate.tsx was allowed here until it was deleted as
  // unreachable. Its key is gone with it. Do NOT re-add it for the LIVE
  // components/invoice/InvoiceTemplate.tsx — different file, and TREES does not walk
  // components/invoice at all, so it needs no entry.
  // NOTE: pages/admin/ComprehensiveReportsPage.tsx was allowed here for 'an explanatory
  // comment about the bug this replaced'. Comment lines are now stripped before counting,
  // for every file, so the entry exempted nothing — while still standing ready to swallow
  // a real price added to that file later. Removed. Do not re-add it for a comment.

  // TogNinja's own plan ladder — the same EUR 9.99 / 19.99 / 39.99 as ProDigitalFilesPage
  // above. What the studio pays US does not move when the studio sells in dollars, and
  // running it through the tenant's format() would relabel a euro charge as USD 9.99.
  'pages/MySubscriptionPage.tsx':
    "TogNinja's own subscription pricing, not the tenant's",
  'pages/StorageDemoPage.tsx':
    "mock of TogNinja's own subscription pricing, not the tenant's",
  'pages/StorageDemoIndexPage.tsx':
    "mock of TogNinja's own subscription pricing, not the tenant's",

  'pages/setup/phases/BasicsPhase.tsx':
    'currency picker — the wizard asks which currency the studio sells in, so the EUR and ' +
    'GBP options have to show their own signs; there is no tenant currency yet to follow',

  // The one file here whose symbols are never rendered at all. formatPrice() tests whether
  // the photographer already typed a currency into the offer field and, if so, leaves their
  // wording alone; the class is a matcher, and narrowing it would start double-formatting
  // prices the photographer wrote by hand.
  'features/landing-pages/components/public/PublicLandingPageOfferSection.tsx':
    'character class that DETECTS a currency the photographer typed; never printed',
};

const SYMBOLS = [
  ['€', 'euro'],
  ['£', 'pound'],
  ['¥', 'yen'],
];

let bad = 0;
let allowed = 0;

// Scope note: this used to walk only the admin trees, on the reasoning that the sweep was
// an admin sweep. But the people most affected by a wrong currency are the ones being
// ASKED FOR MONEY — and client/src/components/galleries holds the buyer's print-order
// modal, which was still printing seven euro signs at a studio configured in GBP. This
// guard stayed green throughout, because it never looked there.
const TREES = [
  // The comment above says the people most affected are the ones being ASKED FOR MONEY,
  // and then this list still did not walk the pages where a client is asked. The booking
  // page (pages/public/PublicSchedulerPage.tsx) printed a hardcoded euro sign beside a
  // lucide DollarSign icon, and quoted the demo studio's USD session as EUR95. This guard
  // was green the whole time, for the second time, for the same reason.
  // Was pages/admin only, then pages/admin + pages/public. Both times the list named
  // individual leaves while the sweep moved across the whole customer-facing surface, and
  // both times the guard was green over screens that still printed a euro sign. The whole
  // pages tree is walked now — support/, legal/, settings/, setup/ and the top-level buyer
  // pages (CartPage, CheckoutPage, Voucher*Page, Account*Page) were never covered either.
  'client/src/pages',
  'client/src/components/admin',
  'client/src/components/galleries',
  // The components the buyer pages are assembled from. A price rendered in a child
  // component is the same price on the same screen; walking only the page files meant a
  // symbol moved one file down the import graph left the guard with nothing to see.
  'client/src/components/account',
  'client/src/components/cart',
  'client/src/components/checkout',
  'client/src/components/fotoshootings',
  'client/src/components/voucher',
  'client/src/components/vouchers',
  'client/src/features/landing-pages',
];

// Deduped: TREES may name a directory and one of its ancestors, and walking a file twice
// would double its count and double-charge the allowlist total.
const FILES = [...new Set(TREES.flatMap(walk))].filter((x) => /\.tsx?$/.test(x));

for (const f of FILES) {
  const src = fs.readFileSync(f, 'utf8');
  const rel = f.split(path.sep).join('/').replace('client/src/', '');

  // Comment lines are not prices. This sweep leaves a note wherever a hardcoded symbol was
  // removed, so widening the trees above would otherwise turn every correct fix into a
  // failure — and a guard that fails on correct code gets switched off.
  //
  // Only whole comment LINES are dropped: a line that opens a comment, or one inside a
  // block already opened. Cutting from a mid-line '//' instead would eat the tail of any
  // line holding a URL, and a price sitting after one would vanish with it.
  //
  // A leading '*' counts only INSIDE a block. Treating it as a comment marker on its own
  // looks right for a JSDoc body, but a JSDoc body is already inside a block — and it also
  // matched wrapped JSX text such as '* All prices include VAT', which is a line a price
  // really can sit on. A guard must not go quiet on real markup to tidy up comments.
  let inBlock = false;
  const code = src.split(/\r?\n/).filter((raw) => {
    const l = raw.trim();
    if (inBlock) {
      if (l.includes('*/')) inBlock = false;
      return false;
    }
    if (l.startsWith('/*') || l.startsWith('{/*')) {
      if (!l.includes('*/')) inBlock = true;
      return false;
    }
    return !l.startsWith('//');
  }).join('\n');

  // Subtract mojibake em-dashes before counting euros.
  const mojibake = (code.match(/â€/g) || []).length;

  for (const [sym, name] of SYMBOLS) {
    let count = code.split(sym).length - 1;
    if (sym === '€') count -= mojibake;
    if (count <= 0) continue;

    if (ALLOW[rel]) { allowed += count; continue; }
    if (!isReachable(f, imported)) {
      unreachable.push(`${rel}  ${count} hardcoded ${name} sign(s)`);
      continue;
    }
    bad += count;
    console.log(`  FAIL  ${rel}  ${count} hardcoded ${name} sign(s)`);
    // Reported from the ORIGINAL source so the number is the number in the editor, and
    // matched against the stripped text so it never points at a comment.
    const kept = new Set(code.split('\n'));
    const all = src.split(/\r?\n/);
    const line = all.findIndex((l) => l.includes(sym) && !l.includes('â€') && kept.has(l));
    if (line >= 0) {
      // Centre the excerpt on the symbol. A flat slice(0, 84) printed DraftsPhase's
      // failure as a line of text with no currency sign anywhere in it, which reads as a
      // bug in the guard rather than a finding.
      const t = all[line].trim();
      const from = Math.max(0, t.indexOf(sym) - 40);
      const excerpt = (from ? '...' : '') + t.slice(from, from + 84) + (from + 84 < t.length ? '...' : '');
      console.log(`          ${line + 1}: ${excerpt}`);
    }
  }
}

reportUnreachable(unreachable);

console.log(`\n  ${allowed} symbol(s) in files with a documented reason`);
if (bad) {
  console.log(`  ${bad} HARDCODED CURRENCY SYMBOL(S) — use useStudioCurrency()'s format()\n`);
  process.exit(1);
}
console.log('  no screen prints a currency symbol it chose for itself\n');
