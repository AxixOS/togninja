// Ask Stripe about payments the studio never heard about.
//
// The webhook is the right mechanism and refuses to run without STRIPE_WEBHOOK_SECRET, which
// is unset on the live tenant — so an invoice is marked paid only when the buyer's browser
// returns from Stripe. Close the tab and the money is taken and the invoice stays unpaid
// forever. This closes that hole from the other side.
//
// Modelled on server/jobs/blogScheduler.ts, deliberately: hourly cron plus a boot catch-up,
// with a `started` guard so a double import cannot register two crons. That pattern is
// already running in production here, so it is copied rather than invented.
import cron from 'node-cron';
import { reconcileInvoicePayments } from '../lib/reconcileInvoicePayments';

let started = false;

function log(message: string, extra?: unknown): void {
  if (extra !== undefined) console.log('[JOB:reconcile]', message, extra);
  else console.log('[JOB:reconcile]', message);
}

export async function runReconciliation(reason = 'tick'): Promise<number> {
  try {
    const r = await reconcileInvoicePayments();
    if (r.problem) {
      // Not an error worth shouting about on every tick: an instance with no Stripe
      // configured is a perfectly normal instance.
      log(`${reason}: ${r.problem}`);
      return 0;
    }
    if (r.recovered > 0) {
      log(`${reason}: ${r.recovered} payment(s) recovered that Stripe had and this instance did not — ${r.recoveredInvoices.join(', ')}`);
    } else if (r.checked > 0) {
      log(`${reason}: ${r.checked} pending checkout(s) examined, none had completed.`);
    }
    return r.recovered;
  } catch (e: any) {
    log(`${reason}: failed`, e?.message || e);
    return 0;
  }
}

export function startPaymentReconciler(): void {
  if (started) return;
  started = true;

  try {
    // Hourly at :20, offset from the blog scheduler's :00 so two jobs are not competing for
    // the same connection pool at the same instant on a small instance.
    cron.schedule('20 * * * *', () => { void runReconciliation('hourly'); }, {
      timezone: process.env.TZ || 'UTC',
    });
    log('Hourly payment reconciliation registered.');
  } catch (err) {
    log('Failed to register cron', err instanceof Error ? err.message : err);
  }

  // Boot catch-up. A studio restarting after a deploy is exactly when an abandoned checkout
  // is most likely to be sitting unrecorded, and waiting until :20 to find out is a payment
  // the studio might chase in the meantime.
  //
  // NOTE for anyone reading this on a sleeping instance: render.yaml declares plan: free,
  // which sleeps when idle, and a cron in-process does not fire while the instance is
  // asleep. The boot catch-up is what makes this useful there — it runs on the next wake.
  setTimeout(() => { void runReconciliation('boot-catchup'); }, 20_000).unref?.();
}
