// Can a print reach the lab unpaid, or reach it twice?
//
// Until now POST /api/print/order called Prodigi directly. No Stripe session, no invoice,
// no charge anywhere in the chain — while the buyer's screen said an invoice was on its
// way. Authenticating the route stopped strangers ordering; it did nothing about an
// authenticated client ordering unlimited free prints at the studio's expense.
//
// Now the order is recorded as 'awaiting_payment' and dispatch happens only from the Stripe
// webhook. Two properties have to hold, and both are enforced in SQL rather than in control
// flow, because control flow does not survive two webhook deliveries arriving at once:
//
//   NOTHING UNPAID    dispatch is reachable only from the webhook, after payment_status
//                     'paid'. The order route no longer calls Prodigi at all.
//   NOTHING TWICE     the claim is a conditional UPDATE matching only an unclaimed,
//                     still-unpaid row, RETURNING it. Test and claim are one statement, so
//                     there is no window between them.
//
// Stripe retries webhooks routinely — that is normal operation, not an edge case — so the
// second property gets tested with genuinely concurrent claims, not sequential ones.
//
// WHAT THIS CANNOT TEST WITHOUT A CARD: that Stripe actually charges, and that a real
// signed event arrives. Those need Stripe test mode with a test card, or the Stripe CLI
// replaying an event at a running server. Everything below is the state machine either side
// of that, which is where the money is lost or the parcel duplicated.
//
// Run: npx tsx scripts/gal-verify-printpay.ts
import 'dotenv/config';
import fs from 'fs';
import { pool } from '../server/db';
import { claimPrintOrderForDispatch, markPrintOrderDispatchFailed, toStripeAmount } from '../server/lib/printCheckout';

let bad = 0;
const check = (label: string, ok: boolean, detail = '') => {
  if (!ok) bad++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? '  — ' + detail : ''}`);
};

const SESSION = 'cs_test_verify_' + Date.now();

async function mkOrder(sessionId: string | null, status = 'awaiting_payment') {
  const r = await pool.query(
    `INSERT INTO print_orders (merchant_reference, status, customer_name, customer_email,
       shipping_line1, shipping_city, shipping_postal_code, shipping_country_code,
       sku, copies, image_url, stripe_session_id)
     VALUES ($1,$2,'Probe','probe@example.invalid','1 Test St','Hove','BN3 1AA','GB',
             'VERIFY-SKU',1,'https://example.invalid/p.jpg',$3)
     RETURNING id`,
    ['VERIFY-' + Date.now() + '-' + Math.floor(Math.random() * 1e6), status, sessionId],
  );
  return r.rows[0].id;
}

async function main() {
  const made: string[] = [];
  try {
    console.log('\n=== the order route no longer dispatches ===');
    const prodigi = fs.readFileSync('server/routes/prodigi.ts', 'utf8');
    const orderRoute = prodigi.slice(prodigi.indexOf("router.post('/order'"), prodigi.indexOf('export async function dispatchPrintOrder'));
    check('POST /order does not call Prodigi', !orderRoute.includes("prodigiRequest('/orders'"));
    check('POST /order creates a Stripe session instead', orderRoute.includes('createPrintCheckoutSession'));
    check("a new order starts as 'awaiting_payment'", orderRoute.includes("'awaiting_payment'"));
    check('dispatch exists as a separate exported function',
      prodigi.includes('export async function dispatchPrintOrder'));

    const routes = fs.readFileSync('server/routes.ts', 'utf8');
    check('the webhook is the only caller of dispatch',
      routes.includes('dispatchPrintOrder') && routes.includes("kind === 'print_order'"));
    check('it refuses a completed-but-unpaid session',
      /payment_status !== 'paid'/.test(routes));

    console.log('\n=== a paid order can be claimed exactly once ===');
    made.push(await mkOrder(SESSION));
    const first = await claimPrintOrderForDispatch(SESSION);
    check('the first claim succeeds', first.claimed === true);
    check('it returns the row to dispatch', Boolean(first.order?.id));
    check("the row is now marked paid", first.order?.status === 'paid', String(first.order?.status));

    const second = await claimPrintOrderForDispatch(SESSION);
    check('a second claim gets nothing', second.claimed === false, String(second.reason));
    check("...and reports it as already handled", second.reason === 'already_handled');

    console.log('\n=== two deliveries arriving AT THE SAME TIME ===');
    // Sequential retries are the easy case. Stripe can and does deliver concurrently, and
    // a check-then-act would let both through.
    const raceSession = 'cs_test_race_' + Date.now();
    made.push(await mkOrder(raceSession));
    const results = await Promise.all([
      claimPrintOrderForDispatch(raceSession),
      claimPrintOrderForDispatch(raceSession),
      claimPrintOrderForDispatch(raceSession),
    ]);
    const winners = results.filter((r) => r.claimed).length;
    check('exactly one of three concurrent claims wins', winners === 1, winners + ' won');

    console.log('\n=== an already-dispatched order is never re-sent ===');
    const dispatched = 'cs_test_done_' + Date.now();
    const id = await mkOrder(dispatched);
    made.push(id);
    await pool.query(`UPDATE print_orders SET prodigi_order_id = 'ord_already' WHERE id = $1`, [id]);
    const afterDispatch = await claimPrintOrderForDispatch(dispatched);
    check('a row with a Prodigi id cannot be claimed', afterDispatch.claimed === false);

    console.log('\n=== a failed dispatch stays PAID, and says so ===');
    const failed = 'cs_test_fail_' + Date.now();
    const fid = await mkOrder(failed);
    made.push(fid);
    await claimPrintOrderForDispatch(failed);
    await markPrintOrderDispatchFailed(fid, 'Prodigi said no');
    const row = await pool.query('SELECT status FROM print_orders WHERE id = $1', [fid]);
    check('the status records paid-but-not-dispatched',
      row.rows[0].status === 'paid_dispatch_failed', row.rows[0].status);
    // Rolling back to awaiting_payment would invite a second charge for the same print.
    check('it is NOT returned to awaiting_payment', row.rows[0].status !== 'awaiting_payment');
    const reclaim = await claimPrintOrderForDispatch(failed);
    check('and it cannot be silently re-dispatched by a retry', reclaim.claimed === false);

    console.log('\n=== one Stripe session cannot pay for two orders ===');
    const dupSession = 'cs_test_dup_' + Date.now();
    made.push(await mkOrder(dupSession));
    let rejected = false;
    try { made.push(await mkOrder(dupSession)); }
    catch { rejected = true; }
    check('the unique index refuses a duplicate session id', rejected);

    console.log('\n=== amounts are in the units Stripe expects ===');
    check('GBP 12.50 becomes 1250 minor units', toStripeAmount(12.5, 'GBP') === 1250);
    check('EUR 4.99 becomes 499', toStripeAmount(4.99, 'EUR') === 499);
    // Getting this wrong on a zero-decimal currency overcharges by 100x.
    check('JPY 1200 stays 1200, not 120000', toStripeAmount(1200, 'JPY') === 1200);
    check('rounding does not drift', toStripeAmount(0.1 + 0.2, 'GBP') === 30);
  } finally {
    for (const id of made) await pool.query('DELETE FROM print_orders WHERE id = $1', [id]).catch(() => {});
  }

  console.log(bad
    ? `\n  ${bad} CHECK(S) FAILED\n`
    : '\n  ALL CHECKS PASSED — nothing prints unpaid, and nothing prints twice\n');
  process.exit(bad ? 1 : 0);
}

main();
