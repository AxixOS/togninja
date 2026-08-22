// Charge for a print before it is printed.
//
// Until now POST /api/print/order went straight to Prodigi. There was no Stripe session, no
// invoice and no charge anywhere in the chain, while the buyer's confirmation screen told
// them an invoice was on its way. Authenticating the route stopped strangers ordering; it
// did nothing about an authenticated client ordering unlimited free prints at the studio's
// expense. That is why PRINT_STORE_ENABLED exists and why it defaults to off.
//
// TWO THINGS MUST BE TRUE AND BOTH ARE ENFORCED IN SQL, not in control flow:
//
//   1. Nothing reaches Prodigi unpaid.
//      Dispatch happens ONLY from the Stripe webhook, after payment_status === 'paid'. The
//      order route no longer calls Prodigi at all.
//
//   2. Nothing reaches Prodigi twice.
//      Stripe retries webhooks — that is normal, not exceptional. Fulfilment claims the row
//      with a conditional UPDATE that matches only an unclaimed order and RETURNS it. A
//      retry matches zero rows and stops. The claim and the check are the same statement,
//      so there is no window between them.
//
// The price comes from print_products.base_price, which is the studio's SELL price, never
// from the browser. The voucher checkout is the closest existing precedent and was the
// obvious thing to copy, but it honours a client-supplied `discount` verbatim down to zero
// (stripeVoucherService.ts:208-211, applied at :377-389) and its authoritativePrice() falls
// back to the submitted figure when no product matches (:352-356). Copying either would
// reproduce the free-print hole through a different door.
import type Stripe from 'stripe';
import { getStripe } from './stripeClient';
import { pool } from '../db';

/** Currencies Stripe expects in whole units rather than cents. */
const ZERO_DECIMAL = new Set(['BIF', 'CLP', 'DJF', 'GNF', 'JPY', 'KMF', 'KRW', 'MGA', 'PYG', 'RWF', 'UGX', 'VND', 'VUV', 'XAF', 'XOF', 'XPF']);

/** Stripe wants minor units for most currencies and whole units for a handful. */
export function toStripeAmount(amount: number, currency: string): number {
  const c = String(currency || 'GBP').toUpperCase();
  return ZERO_DECIMAL.has(c) ? Math.round(amount) : Math.round(amount * 100);
}

async function baseUrl(): Promise<string> {
  // The studio's own public address, so the buyer returns to the site they were on.
  const r = await pool.query(
    `SELECT public_site_base_url, frontend_url, app_url FROM studio_configs LIMIT 1`,
  ).catch(() => ({ rows: [] as any[] }));
  const row: any = r.rows?.[0] || {};
  const candidate = row.public_site_base_url || row.frontend_url || row.app_url
    || process.env.PUBLIC_SITE_BASE_URL || process.env.FRONTEND_URL || process.env.APP_URL;
  return String(candidate || 'http://localhost:5000').replace(/\/+$/, '');
}

export interface PrintCheckoutResult {
  ok: boolean;
  checkoutUrl?: string;
  sessionId?: string;
  error?: string;
  message?: string;
}

/**
 * Create the Stripe session that pays for an already-recorded print order.
 *
 * The order row must already exist with status 'awaiting_payment'. Its price is looked up
 * here from the catalogue — the caller does not get to pass an amount.
 */
export async function createPrintCheckoutSession(opts: {
  orderId: string;
  sku: string;
  copies: number;
  gallerySlug?: string | null;
  customerEmail?: string | null;
  productName?: string | null;
}): Promise<PrintCheckoutResult> {
  const stripe = await getStripe();
  if (!stripe) {
    return { ok: false, error: 'payments_not_configured', message: 'Payments are not set up for this studio yet.' };
  }

  // THE PRICE COMES FROM THE CATALOGUE. Not from the request, not from a quote the browser
  // held on to, not from a discount the browser calculated.
  const p = await pool.query(
    `SELECT name, base_price, currency FROM print_products WHERE sku = $1 AND is_active = true LIMIT 1`,
    [opts.sku],
  );
  if (!p.rows.length) {
    return { ok: false, error: 'unknown_product', message: 'That print is no longer available.' };
  }
  const unit = Number(p.rows[0].base_price);
  if (!Number.isFinite(unit) || unit <= 0) {
    // A product with no price must not be sold for nothing. This is the state the
    // catalogue importer leaves behind when a pricing sheet carried no cost column.
    return { ok: false, error: 'product_not_priced', message: 'That print is not priced yet.' };
  }

  const copies = Math.max(1, Math.min(100, Math.floor(Number(opts.copies) || 1)));
  const currency = String(p.rows[0].currency || 'GBP').toUpperCase();
  const site = await baseUrl();

  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{
        quantity: copies,
        price_data: {
          currency: currency.toLowerCase(),
          unit_amount: toStripeAmount(unit, currency),
          product_data: { name: String(opts.productName || p.rows[0].name || opts.sku).slice(0, 250) },
        },
      }],
      customer_email: opts.customerEmail || undefined,
      // The webhook routes on `kind`. Everything else here is for the studio reading
      // the payment in Stripe's dashboard.
      metadata: {
        kind: 'print_order',
        printOrderId: opts.orderId,
        sku: String(opts.sku).slice(0, 64),
        copies: String(copies),
      },
      success_url: `${site}/gallery/${opts.gallerySlug || ''}?print_order=success`,
      cancel_url: `${site}/gallery/${opts.gallerySlug || ''}?print_order=cancelled`,
    });
  } catch (err: any) {
    console.error('[print-checkout] could not create a session:', err?.message);
    return { ok: false, error: 'checkout_failed', message: 'Could not start the payment.' };
  }

  await pool.query(
    `UPDATE print_orders
        SET stripe_session_id = $1, currency = $2, amount_charged = $3, updated_at = NOW()
      WHERE id = $4`,
    [session.id, currency, unit * copies, opts.orderId],
  );

  return { ok: true, checkoutUrl: session.url || undefined, sessionId: session.id };
}

export interface ClaimResult {
  claimed: boolean;
  order?: any;
  reason?: 'not_found' | 'already_handled';
}

/**
 * Claim a paid print order for dispatch, exactly once.
 *
 * The WHERE clause is the whole safety property. It matches only a row that is still
 * awaiting payment and has never been sent to Prodigi; the UPDATE and the test are one
 * statement, so two concurrent webhook deliveries cannot both win. The loser gets zero rows
 * and returns 'already_handled', which is a success from Stripe's point of view — the
 * webhook must answer 200 or Stripe keeps retrying.
 */
export async function claimPrintOrderForDispatch(sessionId: string): Promise<ClaimResult> {
  const r = await pool.query(
    `UPDATE print_orders
        SET status = 'paid', paid_at = NOW(), updated_at = NOW()
      WHERE stripe_session_id = $1
        AND prodigi_order_id IS NULL
        AND status = 'awaiting_payment'
      RETURNING *`,
    [sessionId],
  );
  if (r.rows.length) return { claimed: true, order: r.rows[0] };

  const exists = await pool.query(
    `SELECT id, status FROM print_orders WHERE stripe_session_id = $1 LIMIT 1`,
    [sessionId],
  );
  return { claimed: false, reason: exists.rows.length ? 'already_handled' : 'not_found' };
}

/**
 * Record that dispatch failed after the money was taken.
 *
 * Deliberately a distinct status rather than rolling back to 'awaiting_payment': the client
 * HAS paid, and a state that says otherwise would invite a second charge. This one is
 * meant to be visible and retried by the studio.
 */
export async function markPrintOrderDispatchFailed(orderId: string, reason: string): Promise<void> {
  await pool.query(
    `UPDATE print_orders SET status = 'paid_dispatch_failed', prodigi_response = $2, updated_at = NOW()
      WHERE id = $1`,
    [orderId, JSON.stringify({ dispatchError: String(reason).slice(0, 500) })],
  ).catch(() => {});
}
