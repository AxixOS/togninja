/// <reference types="node" />
/**
 * Blog auto-publish scheduler.
 *
 * The legacy `server/jobs/index.ts` bundle (daily report email + hourly IMAP
 * sync + this publish job) was disabled at boot "to prevent startup issues", so
 * scheduled posts never went live. This module is the focused, defensive
 * replacement: it ONLY publishes due blog posts, is wrapped so it can never
 * crash boot, and runs both hourly AND once shortly after startup so an overdue
 * backlog clears immediately instead of waiting for the next top-of-hour.
 *
 * Publish rule (matches the create/update path in routes.ts):
 *   status === 'SCHEDULED' AND scheduledFor <= now  →  PUBLISHED.
 * GDPR: photo-derived idea posts without recorded consent are never
 * auto-published (see blogConsent.ideaNeedsConsent).
 */
import cron from 'node-cron';

function log(message: string, extra?: any) {
  if (extra !== undefined) console.log('[JOB:BLOG]', message, extra);
  else console.log('[JOB:BLOG]', message);
}

/**
 * Publish every scheduled post whose time has come. Best-effort and isolated:
 * a failure on one post never affects the others, and the whole call swallows
 * its own errors so a caller (cron tick or boot catch-up) can't be brought down.
 * Returns the number of posts published.
 */
export async function publishDueBlogPosts(reason = 'tick'): Promise<number> {
  try {
    const { db } = await import('../db');
    const { blogPosts } = await import('@shared/schema');
    const { eq, and, lte } = await import('drizzle-orm');
    const { ideaNeedsConsent } = await import('../services/blogConsent.js');

    const now = new Date();
    const due = await db
      .select()
      .from(blogPosts)
      .where(and(eq(blogPosts.status, 'SCHEDULED'), lte(blogPosts.scheduledFor, now)));

    if (due.length === 0) {
      log(`No scheduled posts ready to publish (${reason}).`);
      return 0;
    }

    log(`Found ${due.length} post(s) ready to publish (${reason}).`);
    let published = 0;

    for (const post of due) {
      try {
        // GDPR: never auto-publish a photo-derived post without recorded consent.
        if (ideaNeedsConsent(post)) {
          log(`Skipped (consent missing): "${post.title}" (${post.slug})`);
          continue;
        }

        await db
          .update(blogPosts)
          .set({ status: 'PUBLISHED', published: true, publishedAt: now, updatedAt: now })
          .where(eq(blogPosts.id, post.id));

        published++;
        log(`Published: "${post.title}" (${post.slug})`);

        // Best-effort: tell search engines immediately via IndexNow so a newly
        // live post gets crawled in minutes/hours instead of days. Never blocks.
        try {
          const { pingBlogPost } = await import('../services/indexNow.js');
          void pingBlogPost(post.slug);
        } catch (inErr) {
          log(`IndexNow ping error for ${post.slug}`, inErr instanceof Error ? inErr.message : inErr);
        }

        // Best-effort: push the post's Social Pack into Pulse (AxixOS). Gated by
        // PULSE_AUTODISTRIBUTE so it stays dormant until enabled; never blocks.
        try {
          const { isPulseAutoEnabled, buildPulseRows, distributeToPulse, getPulseProfiles, getPulseMode } =
            await import('../services/pulse.js');
          if (await isPulseAutoEnabled()) {
            const { ensureSocialPack } = await import('../services/socialDistribution.js');
            const sp = await ensureSocialPack(post as any);
            if (!sp) {
              log(`Pulse skipped (no content for social pack): ${post.slug}`);
            } else {
              const rows = buildPulseRows(post as any, sp, {
                when: now,
                profiles: await getPulseProfiles(),
                mode: await getPulseMode(),
              });
              const r = await distributeToPulse(rows);
              const detail = r.summary
                ? `${r.summary.accepted}/${r.summary.received} accepted`
                : (r.error || `status ${r.status}`);
              log(`Pulse ${r.ok ? 'distributed' : 'failed'} (${rows.length} row(s)) for ${post.slug}: ${detail}`);
            }
          }
        } catch (pErr) {
          log(`Pulse distribute error for ${post.slug}`, pErr instanceof Error ? pErr.message : pErr);
        }
      } catch (err) {
        log(`Failed to publish post ${post.id}`, err instanceof Error ? err.message : err);
      }
    }

    log(`Auto-publish complete (${reason}): ${published} of ${due.length} posts published.`);
    return published;
  } catch (err) {
    log('Auto-publish run failed', err instanceof Error ? err.message : err);
    return 0;
  }
}

let started = false;

/** Register the hourly cron and run a one-shot catch-up shortly after boot. */
export function startBlogScheduler(): void {
  if (started) return;
  started = true;

  // Hourly, at the top of the hour.
  try {
    cron.schedule('0 * * * *', () => { void publishDueBlogPosts('hourly'); }, {
      timezone: process.env.TZ || 'UTC',
    });
    log('Hourly auto-publish scheduler registered.');
  } catch (err) {
    log('Failed to register hourly cron', err instanceof Error ? err.message : err);
  }

  // Boot catch-up: clear any already-overdue backlog without waiting for :00.
  // Delayed so it never contends with the rest of startup.
  setTimeout(() => { void publishDueBlogPosts('boot-catchup'); }, 15_000).unref?.();
}
