/// <reference types="node" />
// Hourly inbox polling + existing jobs
// NOTE: Requires IMAP env vars (INBOX_IMAP_HOST, INBOX_IMAP_USER, INBOX_IMAP_PASS)
import cron from "node-cron";
import { sendEmail } from "../../agent/integrations/email";
import { storage } from "../storage";
import { importEmailsFromIMAP } from "../email-import";

// Helper: safe log wrapper for jobs
function jobLog(label: string, message: string, extra?: any) {
  const prefix = `[JOB:${label}]`;
  if (extra) {
    console.log(prefix, message, extra);
  } else {
    console.log(prefix, message);
  }
}

/* daily report 07:00 */
cron.schedule("0 7 * * *", async () => {
  const leads = await storage.getCrmLeads();
  const leadCount = leads.length;
  await sendEmail({
    to: "owner@studio.com",
    subject: "Daily report",
    html: `<h3>Total leads: ${leadCount}</h3>`
  });
}, { timezone: process.env.TZ || "UTC" });

/* flush email queue every minute */
// DISABLED - was flooding console and causing crashes
// cron.schedule("*/1 * * * *", async () => {
//   // Email queue functionality will be implemented when needed
//   // For now, emails are sent immediately via the CRM agent
//   console.log('Email queue check - direct sending active');
// });

/* hourly inbox sync (top of hour) */
cron.schedule("0 * * * *", async () => {
  // Resolve IMAP from the wizard config (DB) first, env fallback — so auto-sync works for
  // studios that set up email in the wizard, not only env-configured instances.
  const { getImapConfig } = await import("../utils/smtp-helper.js");
  const imap = await getImapConfig();
  const IMAP_HOST = imap.host, IMAP_USER = imap.user, IMAP_PASS = imap.password, IMAP_PORT = imap.port, IMAP_TLS = imap.tls;

  if (!IMAP_HOST || !IMAP_USER || !IMAP_PASS) {
    jobLog('INBOX', 'Skipped hourly sync - IMAP not configured');
    return;
  }

  jobLog('INBOX', `Starting hourly IMAP sync for ${IMAP_USER}@${IMAP_HOST}`);
  try {
    // Determine since date based on most recent stored email (avoid full fetch each time)
    let since: Date | undefined = undefined;
    try {
      const existing = await storage.getCrmMessages(); // ordered desc by createdAt in storage implementation
      const latestEmail = existing.find(m => m.messageType === 'email');
      if (latestEmail && latestEmail.createdAt) {
        // subtract 2 minutes overlap to catch any near-boundary arrivals
        const d = new Date(latestEmail.createdAt as any);
        if (!isNaN(d.getTime())) {
          d.setMinutes(d.getMinutes() - 2);
          since = d;
        }
      }
    } catch (e) {
      jobLog('INBOX', 'Could not determine latest email timestamp, performing recent fetch only', e instanceof Error ? e.message : e);
    }

  const importedRaw = await importEmailsFromIMAP({
      host: IMAP_HOST,
      port: IMAP_PORT,
      username: IMAP_USER,
      password: IMAP_PASS,
      useTLS: IMAP_TLS,
      since
    });
  const imported = importedRaw as any[];

    jobLog('INBOX', `Fetched ${imported.length} emails from IMAP`);

    if (imported.length === 0) return;

    // Get current messages once for duplication check
    const existingMessages = await storage.getCrmMessages();
    let created = 0;
  for (const email of imported as any[]) {
      const isDuplicate = existingMessages.some(msg =>
        msg.subject === email.subject &&
        msg.senderEmail === email.from &&
        msg.createdAt && Math.abs(new Date(msg.createdAt).getTime() - new Date(email.date).getTime()) < 300000
      );
      if (isDuplicate) continue;
      try {
        await storage.createCrmMessage({
          senderName: email.fromName,
          senderEmail: email.from,
          subject: email.subject,
            content: email.body,
          status: email.isRead ? 'read' : 'unread'
        });
        created++;
      } catch (err) {
        jobLog('INBOX', 'Failed to persist email', err instanceof Error ? err.message : err);
      }
    }
    jobLog('INBOX', `Stored ${created} new emails (of ${imported.length} fetched)`);
  } catch (err) {
    jobLog('INBOX', 'Hourly IMAP sync failed', err instanceof Error ? err.message : err);
  }
}, { timezone: process.env.TZ || 'UTC' });

/* hourly auto-publish scheduled blog posts */
cron.schedule("0 * * * *", async () => {
  jobLog('BLOG', 'Checking for scheduled blog posts to publish');
  try {
    const { db } = await import("../db");
    const { blogPosts } = await import("@shared/schema");
    const { eq, and, lte } = await import("drizzle-orm");
    
    const now = new Date();
    
    // Find all scheduled posts where scheduled_for <= now
    const scheduledPosts = await db
      .select()
      .from(blogPosts)
      .where(
        and(
          eq(blogPosts.status, 'SCHEDULED'),
          lte(blogPosts.scheduledFor, now)
        )
      );
    
    if (scheduledPosts.length === 0) {
      jobLog('BLOG', 'No scheduled posts ready to publish');
      return;
    }
    
    jobLog('BLOG', `Found ${scheduledPosts.length} post(s) ready to publish`);
    
    const { ideaNeedsConsent } = await import("../services/blogConsent.js");

    // Publish each post
    let published = 0;
    for (const post of scheduledPosts) {
      try {
        // GDPR: never auto-publish a photo-derived post without recorded consent.
        if (ideaNeedsConsent(post)) {
          jobLog('BLOG', `Skipped (consent missing): "${post.title}" (${post.slug})`);
          continue;
        }
        await db
          .update(blogPosts)
          .set({
            status: 'PUBLISHED',
            published: true,
            publishedAt: now,
            updatedAt: now
          })
          .where(eq(blogPosts.id, post.id));

        published++;
        jobLog('BLOG', `Published: "${post.title}" (${post.slug})`);

        // Close the topical loop: register this cluster under its pillar (custom maps only).
        try {
          const { registerClusterForPost } = await import("../lib/authority-map.js");
          await registerClusterForPost(post.slug, post.title);
        } catch { /* best-effort */ }

        // Best-effort: push the post's Social Pack into Pulse (AxixOS) for social
        // distribution. Auto-generates the pack if missing. Gated by PULSE_AUTODISTRIBUTE
        // so it stays dormant until explicitly enabled; never blocks the publish.
        try {
          const { isPulseAutoEnabled, buildPulseRows, distributeToPulse, getPulseProfiles, getPulseMode } = await import("../services/pulse.js");
          if (await isPulseAutoEnabled()) {
            const { ensureSocialPack } = await import("../services/socialDistribution.js");
            const sp = await ensureSocialPack(post as any);
            if (!sp) {
              jobLog('BLOG', `Pulse skipped (no content for social pack): ${post.slug}`);
            } else {
              // Per-tenant account pins + mode (wizard → DB, env fallback).
              const rows = buildPulseRows(post as any, sp, {
                when: now,
                profiles: await getPulseProfiles(),
                mode: await getPulseMode(),
              });
              const r = await distributeToPulse(rows);
              const detail = r.summary ? `${r.summary.accepted}/${r.summary.received} accepted` : (r.error || `status ${r.status}`);
              jobLog('BLOG', `Pulse ${r.ok ? 'distributed' : 'failed'} (${rows.length} row(s)) for ${post.slug}: ${detail}`);
            }
          }
        } catch (pErr) {
          jobLog('BLOG', `Pulse distribute error for ${post.slug}`, pErr instanceof Error ? pErr.message : pErr);
        }
      } catch (err) {
        jobLog('BLOG', `Failed to publish post ${post.id}`, err instanceof Error ? err.message : err);
      }
    }
    
    jobLog('BLOG', `Auto-publish complete: ${published} of ${scheduledPosts.length} posts published`);
  } catch (err) {
    jobLog('BLOG', 'Auto-publish job failed', err instanceof Error ? err.message : err);
  }
}, { timezone: process.env.TZ || 'UTC' });

/* ShootCleaner invoice.paid webhook — announce paid SC orders within ~1 min */
cron.schedule("*/1 * * * *", async () => {
  try {
    const { sweepPaidInvoices } = await import("../lib/shootcleaner-webhook.js");
    await sweepPaidInvoices(); // no-op unless a webhook is registered
  } catch (err) {
    jobLog('SC-WEBHOOK', 'invoice.paid sweep failed', err instanceof Error ? err.message : err);
  }
}, { timezone: process.env.TZ || 'UTC' });

// NOTE: Supabase realtime/live update paths deprecated; hourly polling via Neon is now active.