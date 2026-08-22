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
  'components/admin/InvoiceTemplate.tsx':
    'explanatory comment about the bug this replaced',
  'pages/admin/ComprehensiveReportsPage.tsx':
    'explanatory comment about the bug this replaced',
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
  'client/src/pages/admin',
  'client/src/components/admin',
  'client/src/components/galleries',
];

for (const f of TREES.flatMap(walk).filter((x) => /\.tsx?$/.test(x))) {
  const src = fs.readFileSync(f, 'utf8');
  const rel = f.split(path.sep).join('/').replace('client/src/', '');

  // Subtract mojibake em-dashes before counting euros.
  const mojibake = (src.match(/â€/g) || []).length;

  for (const [sym, name] of SYMBOLS) {
    let count = (src.match(new RegExp(sym, 'g')) || []).length;
    if (sym === '€') count -= mojibake;
    if (count <= 0) continue;

    if (ALLOW[rel]) { allowed += count; continue; }
    if (!isReachable(f, imported)) {
      unreachable.push(`${rel}  ${count} hardcoded ${name} sign(s)`);
      continue;
    }
    bad += count;
    console.log(`  FAIL  ${rel}  ${count} hardcoded ${name} sign(s)`);
    const line = src.split('\n').findIndex((l) => l.includes(sym) && !l.includes('â€'));
    if (line >= 0) console.log(`          ${line + 1}: ${src.split('\n')[line].trim().slice(0, 84)}`);
  }
}

reportUnreachable(unreachable);

console.log(`\n  ${allowed} symbol(s) in files with a documented reason`);
if (bad) {
  console.log(`  ${bad} HARDCODED CURRENCY SYMBOL(S) — use useStudioCurrency()'s format()\n`);
  process.exit(1);
}
console.log('  no screen prints a currency symbol it chose for itself\n');
