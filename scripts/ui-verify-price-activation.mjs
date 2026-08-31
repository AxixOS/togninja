// Does "Activate & Add to Price List" do anything?
//
// A studio ran the Price Wizard, got a researched recommendation of 1.595,00 € for Wedding
// Photography, pressed the green confirm button, and nothing happened. No message, no error,
// the dialog still open. Reported as: "when i click confirm, nothing happens".
//
// TWO FAULTS, one behind the other.
//
// The endpoint's UPDATE named four columns the table did not have — user_adjusted_price,
// activated_product_id, activated_at, updated_at — so it threw on every attempt and returned
// 500. The client had `if (response.ok)` and NO ELSE, so a 500 was met with total silence.
//
// And the price_list_items INSERT runs BEFORE that UPDATE, with no transaction, so every
// attempt created a price-list item and left the suggestion pending. The live demo showed two
// orphaned items against three suggestions still marked pending_review: one row per click.
import fs from 'fs';

let bad = 0;
const check = (label, ok, detail = '') => {
  if (!ok) bad++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? '  — ' + detail : ''}`);
};

const read = (p) => fs.readFileSync(p, 'utf8');
const route = read('server/routes/price-wizard.ts');
const boot = read('server/index.ts');
const page = read('client/src/pages/admin/AdminPriceWizardPage.tsx');

const handler = (() => {
  const at = route.indexOf("router.post('/activate-suggestion'");
  if (at < 0) return '';
  const end = route.indexOf('router.post(', at + 10);
  return route.slice(at, end > 0 ? end : at + 4000);
})();

console.log('\n=== the columns it writes actually exist ===');

check('the activate handler was found', handler.length > 0);
// Derived: every column the UPDATE sets must be created somewhere. Four were not, which is why
// the button did nothing — and a fifth added later with the same oversight would do the same.
// `= $n` AND `= NOW()`. Matching only the placeholders found two of the four columns and
// missed activated_at and updated_at — which are just as capable of throwing, and were among
// the four that did.
const setCols = [...handler.matchAll(/^\s*([a-z_]+) = (?:\$\d|NOW\(\))/gm)].map((m) => m[1]);
check('the UPDATE columns were parsed', setCols.length >= 3, setCols.join(', '));
const created = new Set([
  ...[...boot.matchAll(/ALTER TABLE price_list_suggestions ADD COLUMN IF NOT EXISTS ([a-z_]+)/g)].map((m) => m[1]),
  ...(() => {
    const at = boot.indexOf('CREATE TABLE IF NOT EXISTS price_list_suggestions');
    if (at < 0) return [];
    return [...boot.slice(at, at + 1200).matchAll(/^\s*([a-z_]+)\s+(?:text|uuid|numeric|integer|timestamptz|boolean|decimal)/gim)].map((m) => m[1]);
  })(),
]);
const uncreated = setCols.filter((c) => !created.has(c));
check('every column the activation writes is created somewhere',
  uncreated.length === 0,
  uncreated.length ? uncreated.join(', ') + ' — the UPDATE will throw' : 'all present');

console.log('\n=== a failure cannot leave half an activation behind ===');

check('the two writes share a transaction',
  /await tx\.query\('BEGIN'\)/.test(handler) && /await tx\.query\('COMMIT'\)/.test(handler));
check('and roll back together', /ROLLBACK/.test(handler));
check('the connection is always released', /tx\.release\(\)/.test(handler));
// Both writes must be on the transaction, or the rollback covers nothing.
check('the price-list insert is on the transaction', /const priceListResult = await tx\.query/.test(handler));
check('and so is the suggestion update', /await tx\.query\(`\s*UPDATE price_list_suggestions/.test(handler));

console.log('\n=== a failed request says so ===');

// `if (response.ok)` with no else is why a 500 looked like a dead button.
check('a non-OK response is handled', /if \(!response\.ok\)/.test(page));
check('and the server\'s reason is shown', /body\?\.error/.test(page));
check('and the studio is told nothing changed', /Nothing has been changed/.test(page));

console.log(bad ? `\n${bad} FAILING\n` : '\nall good\n');
process.exit(bad ? 1 : 0);
