// Catch payments Stripe took that nothing ever told the invoice about.
//
// HOW AN INVOICE GETS PAID TODAY, AND WHY THAT IS NOT ENOUGH.
//
// There is a webhook — POST /api/stripe/webhook — and it is the right mechanism. It also
// refuses to run without STRIPE_WEBHOOK_SECRET, returning 500, and that secret is unset on
// the live tenant. So what actually marks an invoice paid is the SUCCESS REDIRECT: the buyer
// returns from Stripe, PublicInvoicePage calls GET /api/invoices/:id/payment-status with the
// session id, the server re-reads the session and records the payment.
//
// That works, right up until the buyer closes the tab. Then Stripe has the money, the studio
// has an invoice that still says unpaid, and nothing anywhere will ever correct it. Worse
// once payment reminders exist: the studio chases a client who has already paid.
//
// This sweep asks the other direction. For every unpaid invoice that HAS a Stripe session id
// — persisted at checkout creation — it asks Stripe what happened and records anything that
// completed. Configuring the webhook is still the better answer and this does not replace it;
// it means a studio who has not configured one does not quietly lose payments.
//
// IDEMPOTENT BY CONSTRUCTION. It only looks at invoices that are not already paid, and it
// records through the same storage calls the redirect path uses, so a payment recorded by
// either route is invisible to the other.
import { pool } from '../db';
import { storage } from '../storage';
import { getStripe } from './stripeClient';

export interface ReconcileResult {
  checked: number;
  recovered: number;
  /** Invoice numbers that were paid at Stripe and unpaid here. */
  recoveredInvoices: string[];
  problem?: string;
}

/**
 * @param limit how many invoices to examine in one pass. Stripe is rate-limited and this
 *   runs on a timer, so a studio with a long tail of abandoned checkouts works through it
 *   over several passes rather than hammering the API once.
 */
export async function reconcileInvoicePayments(limit = 25): Promise<ReconcileResult> {
  const out: ReconcileResult = { checked: 0, recovered: 0, recoveredInvoices: [] };

  const stripe = await getStripe();
  if (!stripe) {
    out.problem = 'Stripe is not configured, so there is nothing to reconcile against.';
    return out;
  }

  // Unpaid, but somebody started a checkout. An invoice with no session id was never taken
  // to Stripe at all and is simply unpaid — not something to chase the API about.
  //
  // Ordered oldest first: a payment that has been missing longest is the one most likely to
  // be chased by a reminder, and the one the studio most needs corrected.
  const rows = await pool.query(
    `SELECT id, invoice_number, total, stripe_payment_intent_id
       FROM crm_invoices
      WHERE stripe_payment_intent_id IS NOT NULL
        AND coalesce(status, '') <> 'paid'
      ORDER BY created_at ASC
      LIMIT $1`,
    [limit],
  ).catch((e: any) => {
    out.problem = `Could not read invoices: ${e?.message}`;
    return { rows: [] as any[] };
  });

  for (const inv of rows.rows as any[]) {
    const sessionId = String(inv.stripe_payment_intent_id || '').trim();
    // Checkout sessions are cs_*. The column has also held real payment-intent ids (pi_*)
    // from other paths, and retrieving a pi_ as a session is an error, not a miss.
    if (!sessionId.startsWith('cs_')) continue;

    out.checked++;
    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      if (session?.payment_status !== 'paid') continue;

      const totalAmount = parseFloat(String(inv.total ?? '0')) || 0;
      await storage.updateCrmInvoice(inv.id, {
        status: 'paid',
        paidAmount: totalAmount.toString(),
      });
      await storage.createCrmInvoicePayment({
        invoiceId: inv.id,
        amount: totalAmount.toString(),
        paymentMethod: 'stripe',
        paymentReference: (session.payment_intent as string) || sessionId,
        paymentDate: new Date().toISOString(),
        // Says which route found it. A studio auditing later should be able to tell a
        // payment the buyer's browser reported from one this sweep went looking for.
        notes: `Stripe payment recovered by reconciliation - Session: ${sessionId}`,
      });

      out.recovered++;
      out.recoveredInvoices.push(String(inv.invoice_number || inv.id));
      console.log(`[reconcile] invoice ${inv.invoice_number} was paid at Stripe and unpaid here — corrected`);
    } catch (e: any) {
      // One unreadable session must not stop the sweep. A deleted or expired session throws,
      // and that invoice simply stays unpaid, which is what it already was.
      console.warn(`[reconcile] could not check session for ${inv.invoice_number}:`, e?.message || e);
    }
  }

  return out;
}
