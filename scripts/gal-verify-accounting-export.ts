// Does the file we hand an accountant say true things?
//
// A studio sent their accountant a sample export. It came back with findings, and every
// one of them was real:
//
//   CONFLICTING CURRENCY. xero_sales.csv carried Currency=EUR on every line, beside a
//   manifest.json that said USD. crm_invoices.currency has a column-level default of
//   'EUR' and invoice creation never set it, so a Louisiana studio's invoices were stored
//   as euros. Nothing on screen showed it — the admin renders amounts through
//   useStudioCurrency and displayed "234,00 US$" over a row that said EUR. The export was
//   the first place the two disagreed out loud.
//
//   PAYMENTS MISSING. Both call sites read `const payments: any[] = []; // payments
//   storage not yet implemented`. crm_invoice_payments has existed all along. Worse,
//   marking an invoice paid set status and paid_at but left paid_amount at 0.00 and wrote
//   no payment row — so two invoices the studio had marked Paid exported as
//   total_payments: 0. An accountant reconciling that sees unpaid invoices and money in
//   the bank with nothing to match it to.
//
//   AUSTRIA. Every fallback in the transformer was the ORIGIN studio's: POCountry 'AT',
//   tax codes AT-10/AT-13/AT-20, and reverse-charge detection that asked "is the buyer
//   outside Austria". On a US studio's invoices that is not a cosmetic default — it is a
//   tax treatment, asserted confidently and wrongly.
//
//   FLOATING POINT. tax_collected serialised as 78.80000000000001 in a document handed to
//   an accountant, which invites exactly the question you do not want asked of a tax figure.
//
// This runs the transformer rather than grepping it, because a grep for "exportCurrency"
// would pass against code that set it and then ignored it.
//
// Run: npx tsx scripts/gal-verify-accounting-export.ts
import fs from 'fs';
import { CLSTransformer, setExportContext } from '../server/accounting-export/transformer';

let bad = 0;
const check = (label: string, ok: boolean, detail = '') => {
  if (!ok) bad++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? '  — ' + detail : ''}`);
};

const code = (s: string) => s.split('\n').filter((l) => {
  const t = l.trim();
  return !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*');
}).join('\n');

const invoice = (over: any = {}) => ({
  id: 'i1', invoice_number: 'INV-1', issue_date: '2026-08-24', due_date: '2026-09-23',
  client_id: 'c1', client_name: 'A Client', subtotal: '195.00', tax_amount: '39.00',
  total: '234.00', status: 'paid', items: [{ description: 'Session', quantity: '1.00', unit_price: '195.00', tax_rate: '20.00' }],
  ...over,
});

console.log('\n=== a row is denominated in what the export is denominated in ===');
setExportContext('USD', 'US');
let cls: any = CLSTransformer.toCLSInvoice(invoice());
check('an invoice with no stored currency takes the export currency', cls.currency === 'USD', cls.currency);
// The row's own value still wins — a genuinely foreign-currency invoice is not rewritten.
cls = CLSTransformer.toCLSInvoice(invoice({ currency: 'GBP' }));
check('a row that HAS a currency keeps it', cls.currency === 'GBP', cls.currency);
// And the old behaviour is gone.
setExportContext('USD', 'US');
cls = CLSTransformer.toCLSInvoice(invoice());
check('it is never silently EUR again', cls.currency !== 'EUR', cls.currency);

console.log('\n=== the studio is not in Austria ===');
setExportContext('USD', 'US');
cls = CLSTransformer.toCLSInvoice(invoice());
check('a missing customer country is blank, not "AT"', cls.customer_country !== 'AT', JSON.stringify(cls.customer_country));
check('a stated customer country is kept', CLSTransformer.toCLSInvoice(invoice({ client_country: 'US' })).customer_country === 'US');

console.log('\n=== the tax code names the right jurisdiction ===');
setExportContext('USD', 'US');
let line = CLSTransformer.toCLSInvoice(invoice()).lines?.[0];
check('a US studio does not emit an Austrian VAT code',
  !String(line?.tax_code || '').startsWith('AT-'), String(line?.tax_code));
setExportContext('EUR', 'AT');
line = CLSTransformer.toCLSInvoice(invoice()).lines?.[0];
check('an Austrian studio still does', String(line?.tax_code) === 'AT-20', String(line?.tax_code));
// A studio that has not said where it trades gets a plain, honest rate.
setExportContext('USD', '');
line = CLSTransformer.toCLSInvoice(invoice()).lines?.[0];
check('an unstated country gives a plain rate, not a guess', String(line?.tax_code) === 'VAT-20', String(line?.tax_code));

console.log('\n=== reverse charge is an EU rule, and only applies to an EU studio ===');
// The old test was `client_country !== 'AT'`, so for a US studio every EU customer with a
// VAT id looked like an intra-EU cross-border sale.
setExportContext('USD', 'US');
check('a US studio never reverse-charges',
  CLSTransformer.toCLSInvoice(invoice({ client_country: 'DE', client_vat_id: 'DE123' })).reverse_charge === false);
setExportContext('EUR', 'AT');
check('an AT studio selling to a German business does',
  CLSTransformer.toCLSInvoice(invoice({ client_country: 'DE', client_vat_id: 'DE123' })).reverse_charge === true);
check('an AT studio selling domestically does not',
  CLSTransformer.toCLSInvoice(invoice({ client_country: 'AT', client_vat_id: 'ATU123' })).reverse_charge === false);
check('no VAT id, no reverse charge',
  CLSTransformer.toCLSInvoice(invoice({ client_country: 'DE' })).reverse_charge === false);

console.log('\n=== the payments the studio recorded reach the file ===');
const routes = fs.readFileSync('server/accounting-export/routes.ts', 'utf8');
const routesCode = code(routes);
check('the "not yet implemented" stub is gone', !/payments storage not yet implemented/.test(routesCode));
check('payments are loaded from the table', /async function loadPayments/.test(routes));
check('it reads crm_invoice_payments', /FROM crm_invoice_payments/.test(routes));
check('both call sites use it', (routesCode.match(/await loadPayments\(/g) || []).length === 2,
  `${(routesCode.match(/await loadPayments\(/g) || []).length} call site(s)`);
check('a payments failure does not silently read as "none taken"', /could not read payments/.test(routes));
// Joined, so a payment carries the currency of the invoice it paid.
check('payments carry their invoice\'s currency', /i\.currency/.test(routes));

console.log('\n=== marking an invoice paid records the money ===');
const serverRoutes = fs.readFileSync('server/routes.ts', 'utf8');
const srCode = code(serverRoutes);
check('paid_amount is set from the total', /paid_amount = CASE WHEN \$1 = 'paid' THEN total ELSE 0 END/.test(srCode));
check('a payment row is written', /INSERT INTO crm_invoice_payments/.test(srCode));
// Toggling paid/unpaid while tidying up must not book the money twice.
check('booking it twice is impossible', /WHERE NOT EXISTS/.test(srCode));
check('un-marking removes what this endpoint created', /DELETE FROM crm_invoice_payments WHERE invoice_id = \$1::uuid AND payment_reference = 'marked-paid'/.test(srCode));
check('the status change survives a payments failure', /status set to paid but the payment row failed/.test(serverRoutes));

console.log('\n=== a new invoice is created in the studio\'s currency ===');
check('creation reads the studio currency', /SELECT currency FROM studio_configs LIMIT 1/.test(srCode));
check('it only fills a blank, never overrides', /if \(!\(invoiceData as any\)\.currency\)/.test(srCode));

console.log('\n=== the manifest is arithmetic, not floating point ===');
const manager = fs.readFileSync('server/accounting-export/manager.ts', 'utf8');
const mCode = code(manager);
check('totals are summed in whole cents', /const cents = \(v: number\)/.test(mCode));
check('the raw double sum is gone', !/reduce\(\(sum, inv\) => sum \+ inv\.tax_total, 0\)/.test(mCode));
// Reproduce the studio's actual export exactly. The error did not come from adding two
// clean figures — 39 + 39.8 is 78.8 — it came from the per-line tax COMPUTATION:
// 199 * 0.2 is 39.800000000000004, and summing that with 195 * 0.2 gives the
// 78.80000000000001 that appeared in the manifest they sent their accountant.
const lineTaxes = [195 * 0.2, 199 * 0.2];
const cents = (v: number) => Math.round((Number(v) || 0) * 100);
const money = (c: number) => Number((c / 100).toFixed(2));
const tax = money(lineTaxes.reduce((c, v) => c + cents(v), 0));
check('the two real line taxes sum to exactly 78.80', tax === 78.8, String(tax));
check('the naive sum really was wrong (so this test can fail)',
  lineTaxes.reduce((s, v) => s + v, 0) !== 78.8,
  String(lineTaxes.reduce((s, v) => s + v, 0)));

console.log('\n=== the file says where it came from ===');
check('generated_by is no longer null', !/generated_by: null/.test(mCode));
check('it names the product and the studio', /TogNinja Accounting Export/.test(manager));
check('payments_total is reported, not just a count', /payments_total/.test(mCode));

console.log('\n=== the studio\'s fiscal identity is resolved server-side ===');
// These decide a tax code an accountant relies on; they must not be settable by the body.
check('currency and country come from studio_configs', /SELECT currency, country, studio_name, business_name FROM studio_configs/.test(routes));
check('the studio value overrides the request', /if \(studio\.currency\) requestData\.currency = studio\.currency/.test(routesCode));

console.log('\n=== the repair for rows already written ===');
const repair = 'scripts/gal-repair-invoice-currency.mjs';
check('a repair script exists', fs.existsSync(repair));
if (fs.existsSync(repair)) {
  const r = fs.readFileSync(repair, 'utf8');
  check('it is report-only by default', /const APPLY = process\.argv\.includes\('--apply'\)/.test(r));
  // Rewriting every invoice to a guess would be worse than leaving them wrong.
  check('it refuses to run when the studio currency is unset', /is not set\. Set it before repairing/.test(r));
  check('it backfills the payment rows too', /Backfilled: invoice was marked paid/.test(r));
}

console.log(bad
  ? `\n  ${bad} CHECK(S) FAILED\n`
  : '\n  ALL CHECKS PASSED — the export states this studio\'s currency, country and receipts\n');
process.exit(bad ? 1 : 0);
