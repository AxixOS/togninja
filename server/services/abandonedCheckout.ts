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

const GRACE_MS = 60 * 60 * 1000; // remind 1h after an abandoned start
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // don't remind sessions older than a week

function siteOrigin(): string {
  return (process.env.PUBLIC_SITE_URL || 'https://www.newagefotografie.com').replace(/\/+$/, '');
}

function fromAddress(): string {
  const email = process.env.BUSINESS_MAILBOX_USER || process.env.SMTP_USER || 'no-reply@localhost';
  const name = process.env.BUSINESS_NAME || 'New Age Fotografie';
  return `"${name}" <${email}>`;
}

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
    const nodemailer = (await import('nodemailer')).default;

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

    const transporter = nodemailer.createTransport({
      host: 'smtp.easyname.com',
      port: 465,
      secure: true,
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
      auth: {
        user: process.env.BUSINESS_MAILBOX_USER || process.env.SMTP_USER || '',
        pass: process.env.EMAIL_PASSWORD || process.env.SMTP_PASS || '',
      },
    });

    const shopUrl = `${siteOrigin()}/vouchers`;
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
          : 'Sie waren fast fertig – Ihr Fotoshooting wartet 🎁';
        const html = tpl?.emailBodyHtml
          ? render(tpl.emailBodyHtml)
          : `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
               <h2 style="color:#7C3AED;">Sie waren fast fertig!</h2>
               <p>Hallo ${name},</p>
               <p>Sie haben kürzlich einen Kauf bei New Age Fotografie begonnen, aber nicht abgeschlossen.
               Ihr Wunsch-Fotoshooting wartet noch auf Sie.</p>
               <p style="margin:28px 0;">
                 <a href="${shopUrl}" style="background:#7C3AED;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">
                   Jetzt abschließen
                 </a>
               </p>
               <p>Bei Fragen sind wir gerne für Sie da.</p>
               <p>Ihr New Age Fotografie Team</p>
             </div>`;

        await transporter.sendMail({ from: fromAddress(), to: row.email, subject, html });

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
