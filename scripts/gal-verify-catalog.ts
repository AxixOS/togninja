// Can a studio fill an empty print store without typing ninety SKUs?
//
// Prodigi's Print API has no endpoint that lists the catalogue — confirmed against their
// v4 reference: GET /products/{sku} needs a SKU you already know, and the only other
// product endpoint calculates photobook spines. The catalogue is a download under
// "Pricing sheets" in their dashboard. So the sheet is the import path, and the parser has
// to cope with whatever a spreadsheet export or a hand-pasted list actually looks like.
//
// print_products had ZERO rows and no way to fill it in bulk, which is why the in-gallery
// store was empty out of the box regardless of everything else being built.
//
// Run: npx tsx scripts/gal-verify-catalog.ts
import 'dotenv/config';
import { parseProdigiSheet, applyMarkup } from '../server/lib/prodigiSheet';
import { pool } from '../server/db';

let bad = 0;
const check = (label: string, ok: boolean, detail = '') => {
  if (!ok) bad++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? '  — ' + detail : ''}`);
};

async function main() {
  console.log('\n=== a normal CSV export ===');
  const csv = [
    'SKU,Description,Price,Currency',
    'GLOBAL-FAP-16X24,Fine Art Print 16x24,12.50,GBP',
    'GLOBAL-CFPM-16X20,Framed Print 16x20,28.00,GBP',
  ].join('\n');
  const a = parseProdigiSheet(csv);
  check('both rows parsed', a.rows.length === 2, a.rows.length + ' rows');
  check('the SKU column was identified', a.columns.sku === 'SKU', String(a.columns.sku));
  check('the price column was identified', a.columns.cost === 'Price', String(a.columns.cost));
  check('the cost is a number', a.rows[0].cost === 12.5, String(a.rows[0].cost));
  check('the label came through', a.rows[0].label === 'Fine Art Print 16x24', String(a.rows[0].label));

  console.log('\n=== a spreadsheet pasted straight in (tab separated) ===');
  const tsv = 'Product Code\tName\tCost\nGLOBAL-FAP-A4\tA4 Print\t4.20';
  const b = parseProdigiSheet(tsv);
  check('tabs are handled', b.rows.length === 1 && b.rows[0].sku === 'GLOBAL-FAP-A4', JSON.stringify(b.rows[0] || {}));
  check('"Product Code" is recognised as the SKU column', b.columns.sku === 'Product Code');
  check('"Cost" is recognised as the price', b.rows[0].cost === 4.2);
  // 'Product Code' contains 'product', so the label search used to resolve back to the
  // SKU column and every label was a repeat of the SKU. The first version of this suite
  // passed because it never asserted the label here.
  check('the label is the name, not a repeat of the SKU', b.rows[0].label === 'A4 Print', String(b.rows[0].label));

  console.log('\n=== a bare list with no header at all ===');
  const bare = 'GLOBAL-FAP-A4\nGLOBAL-FAP-A3\nGLOBAL-FAP-A2';
  const c = parseProdigiSheet(bare);
  check('three SKUs found', c.rows.length === 3, c.rows.length + '');
  check('no price invented', c.rows[0].cost === null);

  console.log('\n=== the messy realities ===');
  const messy = [
    'SKU,Description,Price',
    '"GLOBAL-FAP-16X24","Fine Art, matte finish","£12.50"',   // quoted commas + currency symbol
    'GLOBAL-FAP-A4,A4,"1.234,56"',                             // European decimals
    ',,,',                                                     // an empty row
    'GLOBAL-FAP-16X24,Duplicate of the first,99.00',           // a duplicate SKU
    'TOTAL,,111.00',                                           // a trailing totals row
  ].join('\n');
  const d = parseProdigiSheet(messy);
  const skus = d.rows.map((r) => r.sku);
  check('a quoted comma does not split the row', skus.includes('GLOBAL-FAP-16X24'));
  check('a currency symbol is stripped from the price',
    d.rows.find((r) => r.sku === 'GLOBAL-FAP-16X24')?.cost === 12.5,
    String(d.rows.find((r) => r.sku === 'GLOBAL-FAP-16X24')?.cost));
  check('European decimals parse as 1234.56',
    d.rows.find((r) => r.sku === 'GLOBAL-FAP-A4')?.cost === 1234.56,
    String(d.rows.find((r) => r.sku === 'GLOBAL-FAP-A4')?.cost));
  check('the empty row is skipped', !skus.includes(''));
  check('the duplicate SKU is dropped, keeping the first',
    skus.filter((s) => s === 'GLOBAL-FAP-16X24').length === 1);
  check('rows were counted as skipped', d.skipped >= 2, d.skipped + ' skipped');

  console.log('\n=== markup ===');
  check('100% doubles the cost', applyMarkup(12.5, 100) === 25);
  check('a fractional result is rounded to the penny', applyMarkup(4.99, 35) === 6.74, String(applyMarkup(4.99, 35)));
  check('no cost means no invented price', applyMarkup(null, 100) === null);
  // A zero-cost row would otherwise be published as a free print.
  check('a zero cost is not marked up to zero', applyMarkup(0, 100) === null);

  console.log('\n=== the upsert the importer relies on ===');
  // ON CONFLICT (sku) throws outright without a unique index — not a silent no-dedupe,
  // an error. The index is created at boot; this proves it is actually there.
  const sku = 'VERIFY-CATALOG-' + Date.now();
  try {
    await pool.query(
      `INSERT INTO print_products (sku, name, base_price, currency, is_active)
       VALUES ($1,'First',10,'GBP',true)
       ON CONFLICT (sku) DO UPDATE SET name = EXCLUDED.name, base_price = EXCLUDED.base_price`,
      [sku]);
    await pool.query(
      `INSERT INTO print_products (sku, name, base_price, currency, is_active)
       VALUES ($1,'Second',20,'GBP',true)
       ON CONFLICT (sku) DO UPDATE SET name = EXCLUDED.name, base_price = EXCLUDED.base_price`,
      [sku]);
    const rows = await pool.query('SELECT name, base_price FROM print_products WHERE sku = $1', [sku]);
    check('re-importing updates rather than duplicating', rows.rows.length === 1, rows.rows.length + ' row(s)');
    check('the newer values win', rows.rows[0]?.name === 'Second', String(rows.rows[0]?.name));
  } catch (e: any) {
    check('ON CONFLICT (sku) works', false, e.message);
  } finally {
    await pool.query('DELETE FROM print_products WHERE sku = $1', [sku]).catch(() => {});
  }

  console.log(bad ? `\n  ${bad} CHECK(S) FAILED\n` : '\n  ALL CHECKS PASSED — a pricing sheet becomes a stocked store\n');
  process.exit(bad ? 1 : 0);
}

main();
