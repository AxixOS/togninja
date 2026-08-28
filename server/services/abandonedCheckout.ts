/**
 * Abandoned-checkout recovery.
 *
 * Lifecycle:
 *   1. recordAbandonedCheckout() — called when a Stripe Checkout session is
 *      created (the visitor entered their email but hasn't paid yet).
 *   2. markCheckoutConverted() — called from the Stripe webhook when payment
 *      completes, so we never remind someone who actually bought.
 *   3. sendAbandonedCheckoutReminders() — a cron finds sessions that are still
 *      "pending" after a grace period and emails one reminder.
 *
 * IMPORTANT: every function is fully guarded. Until the `abandoned_checkouts`
 * table is created (`npm run db:push`) each call logs and returns quietly, so
 * this feature is inert-but-harmless rather than a source of errors. It also
 * never affects the checkout/payment path — recording is best-effort.
 */

import { getSiteIdentity } from '../lib/siteIdentity';

const GRACE_MS = 60 * 60 * 1000; // remind 1h after an abandoned start
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // don't remind sessions older than a week

/**
 * The studio's own site.
 *
 * The fallback here was the ORIGIN studio's live domain. On any instance without
 * PUBLIC_SITE_URL set, a buyer's abandoned customers were emailed a "finish your order"
 * button pointing at newagefotografie.com — their own recovery campaign handing their
 * traffic to a different photographer.
 *
 * There is no safe default for this, so there is no longer one. An unconfigured instance
 * returns '' and the reminder is SKIPPED below rather than sent somewhere wrong: a
 * reminder never sent costs one sale, a reminder sent to a competitor costs the customer.
 */
function siteOrigin(): string {
  return String(getSiteIdentity().url || '').replace(/\/+$/, '');
}

// fromAddress() was removed: it hardcoded the origin studio as the display name, and
// duplicated a decision getFromAddress() in utils/smtp-helper already makes — including the
// part about most providers rejecting a From that is not the authenticated account.

/** Record a started-but-unpaid checkout. Best-effort; never throws. */
export async function recordAbandonedCheckout(input: {
  sessionId: string;
  email?: string | null;
  amountCents?: number | null;
  currency?: string | null;
}): Promise<void> {
  try {
    if (!input.sessionId || !input.email) return;
    const { db } = await import('../db');
    const { abandonedCheckouts } = await import('@shared/schema');
    await db
      .insert(abandonedCheckouts)
      .values({
        sessionId: input.sessionId,
        email: input.email,
        amountCents: typeof input.amountCents === 'number' ? input.amountCents : null,
        currency: (input.currency || 'EUR').toUpperCase(),
        status: 'pending',
        reminded: false,
      })
      .onConflictDoNothing({ target: abandonedCheckouts.sessionId });
  } catch (err) {
    console.warn('[abandoned-cart] record skipped:', err instanceof Error ? err.message : err);
  }
}

/** Mark a checkout as converted so it is never reminded. Best-effort. */
export async function markCheckoutConverted(sessionId: string): Promise<void> {
  try {
    if (!sessionId) return;
    const { db } = await import('../db');
    const { abandonedCheckouts } = await import('@shared/schema');
    const { eq } = await import('drizzle-orm');
    await db
      .update(abandonedCheckouts)
      .set({ status: 'converted' })
      .where(eq(abandonedCheckouts.sessionId, sessionId));
  } catch (err) {
    console.warn('[abandoned-cart] convert skipped:', err instanceof Error ? err.message : err);
  }
}

/**
 * Send one reminder for each pending checkout past the grace period. Returns the
 * number of reminders sent. Best-effort and isolated per-row.
 */
export async function sendAbandonedCheckoutReminders(reason = 'tick'): Promise<number> {
  try {
    const { db } = await import('../db');
    const { abandonedCheckouts, emailAutomations, emailAutomationLogs } = await import('@shared/schema');
    const { and, eq, lt, gt } = await import('drizzle-orm');

    const now = Date.now();
    const cutoff = new Date(now - GRACE_MS);
    const floor = new Date(now - MAX_AGE_MS);

    const due = await db
      .select()
      .from(abandonedCheckouts)
      .where(
        and(
          eq(abandonedCheckouts.status, 'pending'),
          eq(abandonedCheckouts.reminded, false),
          lt(abandonedCheckouts.createdAt, cutoff),
          gt(abandonedCheckouts.createdAt, floor),
        ),
      );

    if (!due.length) {
      console.log(`[abandoned-cart] none due (${reason}).`);
      return 0;
    }

    // Optional studio-authored template (Automations → trigger "abandoned_cart").
    let tpl: any = null;
    try {
      const rows = await db
        .select()
        .from(emailAutomations)
        .where(and(eq(emailAutomations.triggerType, 'abandoned_cart'), eq(emailAutomations.enabled, true)))
        .limit(1);
      tpl = rows[0] || null;
    } catch { /* templates optional */ }

    // This built its own transport hardcoded to smtp.easyname.com — the ORIGIN studio's mail
    // provider, with no environment override. Every other tenant's reminders were posted to
    // easyname using the tenant's own credentials, which fails for anyone not hosted there.
    // So this was a delivery bug wearing a branding bug's clothes.
    //
    // getSmtpTransporter() is the seam the rest of the app already sends through: it reads the
    // studio's configured host from the database first, then SMTP_HOST.
    const { getSmtpTransporter, getFromAddress } = await import('../utils/smtp-helper');
    const transporter = await getSmtpTransporter();
    const from = await getFromAddress();

    const origin = siteOrigin();
    if (!origin) {
      console.warn(
        '[abandoned-cart] no site URL configured (PUBLIC_SITE_URL / APP_URL) — skipping reminders.\n'
        + '                A recovery email is worthless without a link back, and the old default\n'
        + '                pointed at the origin studio.',
      );
      return;
    }
    const shopUrl = `${origin}/vouchers`;

    // The studio's own name and language, for the built-in copy below. A studio that wrote its
    // own template in Automations never reaches this.
    const identity = getSiteIdentity();
    const studio = identity.name;
    const german = String(identity.lang || 'en').toLowerCase().startsWith('de');

    let sent = 0;

    for (const row of due) {
      try {
        const name = row.email.split('@')[0] || 'there';
        const render = (s: string) =>
          (s || '')
            .replace(/\{\{clientName\}\}/g, name)
            .replace(/\{\{clientEmail\}\}/g, row.email)
            .replace(/\{\{shopUrl\}\}/g, shopUrl);

        const subject = tpl?.emailSubject
          ? render(tpl.emailSubject)
          : german
          ? 'Sie waren fast fertig – Ihr Fotoshooting wartet 🎁'
          : 'You were nearly done — your photo session is waiting 🎁';
        const html = tpl?.emailBodyHtml
          ? render(tpl.emailBodyHtml)
          : `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
               <h2 style="color:#7C3AED;">${german ? 'Sie waren fast fertig!' : 'You were nearly done!'}</h2>
               <p>${german ? 'Hallo' : 'Hi'} ${name},</p>
               <p>${german
                 ? `Sie haben kürzlich einen Kauf bei ${studio} begonnen, aber nicht abgeschlossen. Ihr Wunsch-Fotoshooting wartet noch auf Sie.`
                 : `You started an order with ${studio} recently but did not finish it. Your session is still waiting for you.`}</p>
               <p style="margin:28px 0;">
                 <a href="${shopUrl}" style="background:#7C3AED;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">
                   ${german ? 'Jetzt abschließen' : 'Complete your order'}
                 </a>
               </p>
               <p>${german ? 'Bei Fragen sind wir gerne für Sie da.' : 'If you have any questions, just reply to this email.'}</p>
               <p>${german ? `Ihr ${studio} Team` : `The ${studio} team`}</p>
             </div>`;

        await transporter.sendMail({ from, to: row.email, subject, html });

        // Mark reminded (guard against a race with the webhook: only if still pending).
        await db
          .update(abandonedCheckouts)
          .set({ reminded: true, remindedAt: new Date() })
          .where(and(eq(abandonedCheckouts.id, row.id), eq(abandonedCheckouts.status, 'pending')));

        if (tpl) {
          try {
            await db.insert(emailAutomationLogs).values({
              automationId: tpl.id,
              bookingId: `abandoned-${row.sessionId}`,
              clientEmail: row.email,
              clientName: name,
              status: 'sent',
            });
          } catch { /* logging best-effort */ }
        }

        sent++;
      } catch (rowErr) {
        console.warn('[abandoned-cart] reminder failed for', row.email, rowErr instanceof Error ? rowErr.message : rowErr);
      }
    }

    console.log(`[abandoned-cart] sent ${sent}/${due.length} reminder(s) (${reason}).`);
    return sent;
  } catch (err) {
    // Table missing / DB unreachable — stay quiet and inert.
    console.warn('[abandoned-cart] reminder run skipped:', err instanceof Error ? err.message : err);
    return 0;
  }
}

let started = false;

/** Register the reminder cron (every 15 min) plus a delayed boot run. Safe to
 *  call once at startup; self-guards so it can never crash boot. */
export function startAbandonedCheckoutScheduler(): void {
  if (started) return;
  started = true;
  (async () => {
    try {
      const cron = (await import('node-cron')).default;
      cron.schedule('*/15 * * * *', () => { void sendAbandonedCheckoutReminders('cron'); }, {
        timezone: process.env.TZ || 'UTC',
      });
      console.log('[abandoned-cart] reminder scheduler registered (every 15 min).');
    } catch (err) {
      console.warn('[abandoned-cart] failed to register scheduler:', err instanceof Error ? err.message : err);
    }
  })();
  // Boot catch-up shortly after startup (unref so it never holds the process).
  setTimeout(() => { void sendAbandonedCheckoutReminders('boot'); }, 30_000).unref?.();
}
