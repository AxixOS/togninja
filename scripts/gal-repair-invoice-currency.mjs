// Invoices stored in a currency the studio does not trade in.
//
// crm_invoices.currency carries a column-level default of 'EUR', and invoice creation
// never set it from studio_configs.currency. So a Louisiana studio billing in USD had
// rows that said EUR — while the admin list rendered them through useStudioCurrency and
// displayed "234,00 US$". The screen and the database disagreed, and only the accounting
// export was honest about it: xero_sales.csv carried Currency=EUR on every line beside a
// manifest that said USD.
//
// Marking an invoice paid also only set status and paid_at, leaving paid_amount at 0.00,
// so this repairs that too — otherwise the export reports money it can see was received
// as zero.
//
//   node scripts/gal-repair-invoice-currency.mjs           report only
//   node scripts/gal-repair-invoice-currency.mjs --apply   fix the rows
import 'dotenv/config';
import pg from 'pg';

const APPLY = process.argv.includes('--apply');
const db = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
for (let i = 0; ; i++) {
  try { await db.connect(); break; }
  catch (e) { if (i >= 6) throw e; await new Promise((r) => setTimeout(r, 2500)); }
}

const cfg = (await db.query(`SELECT currency FROM studio_configs LIMIT 1`)).rows[0] || {};
const studioCurrency = String(cfg.currency || '').trim().toUpperCase();
if (!studioCurrency) {
  console.log('\n  studio_configs.currency is not set. Set it before repairing, or every row\n  would be rewritten to a guess.\n');
  await db.end();
  process.exit(1);
}
console.log(`\n  This studio bills in ${studioCurrency}.\n`);

const wrong = (await db.query(
  `SELECT id, invoice_number, currency, status, total, paid_amount
     FROM crm_invoices
    WHERE upper(coalesce(currency, '')) <> $1
    ORDER BY created_at`, [studioCurrency])).rows;

const unpaid = (await db.query(
  `SELECT id, invoice_number, total, paid_amount
     FROM crm_invoices
    WHERE status = 'paid' AND coalesce(paid_amount, 0) = 0
    ORDER BY created_at`)).rows;

console.log(`  ${wrong.length} invoice(s) stored in another currency:`);
for (const r of wrong) console.log(`    ${r.invoice_number}  ${r.currency} -> ${studioCurrency}   ${r.total}`);
console.log(`\n  ${unpaid.length} invoice(s) marked paid with paid_amount 0.00:`);
for (const r of unpaid) console.log(`    ${r.invoice_number}  total ${r.total}, recorded ${r.paid_amount}`);

if (!wrong.length && !unpaid.length) { console.log('\n  Nothing to repair.\n'); await db.end(); process.exit(0); }
if (!APPLY) { console.log('\n  Re-run with --apply to fix them.\n'); await db.end(); process.exit(0); }

const c = await db.query(
  `UPDATE crm_invoices SET currency = $1, updated_at = now()
    WHERE upper(coalesce(currency, '')) <> $1 RETURNING id`, [studioCurrency]);
console.log(`\n  ${c.rowCount} invoice(s) repointed to ${studioCurrency}.`);

const p = await db.query(
  `UPDATE crm_invoices SET paid_amount = total, updated_at = now()
    WHERE status = 'paid' AND coalesce(paid_amount, 0) = 0 RETURNING id, total, coalesce(paid_at, now()) AS paid_at`);
console.log(`  ${p.rowCount} paid invoice(s) had their amount recorded.`);

// And a payment row for each, so the export has something to report. Guarded, so running
// this twice does not book the money twice.
let booked = 0;
for (const row of p.rows) {
  const r = await db.query(
    `INSERT INTO crm_invoice_payments (invoice_id, amount, payment_method, payment_reference, payment_date, notes)
     SELECT $1::uuid, $2, 'manual', 'marked-paid', $3::date, 'Backfilled: invoice was marked paid before payments were recorded'
      WHERE NOT EXISTS (
        SELECT 1 FROM crm_invoice_payments WHERE invoice_id = $1::uuid AND payment_reference = 'marked-paid'
      ) RETURNING id`,
    [row.id, row.total, new Date(row.paid_at).toISOString().slice(0, 10)]);
  booked += r.rowCount;
}
console.log(`  ${booked} payment record(s) created.`);

const left = (await db.query(
  `SELECT count(*)::int n FROM crm_invoices WHERE upper(coalesce(currency,'')) <> $1
      OR (status = 'paid' AND coalesce(paid_amount,0) = 0)`, [studioCurrency])).rows[0].n;
console.log(left === 0 ? '\n  Verified: every invoice is in the studio\'s currency and records what was paid.\n'
                       : `\n  STILL WRONG: ${left} invoice(s).\n`);
await db.end();
process.exit(left === 0 ? 0 : 1);
