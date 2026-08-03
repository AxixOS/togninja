// Pulse / AxixOS Social ingest connector.
//
// Pushes a blog post's Social Pack into Pulse (https://axixos-social.de) via its
// public ingest API (POST /api/v1/posts), so Pulse schedules + publishes to the
// connected social accounts (Facebook, Instagram, Threads, LinkedIn, Google Business,
// Pinterest, …) on its own due-cron.
//
// Contract (v1, stable): one row per platform. Auth is Bearer <pls_live_...>.
// See the Pulse repo docs/ingest-api.md for the full schema.
//
// SAFETY: even with a key configured, auto-distribution stays OFF until
// PULSE_AUTODISTRIBUTE is truthy, and defaults to "draft" mode so nothing is posted
// to real accounts until an operator flips PULSE_MODE to "schedule" or "now".
//
// Secret PULSE_API_KEY lives in the environment (never commit it).
import type { PreparedSocialPack } from './socialSnippets.js';

const BASE = (process.env.PULSE_API_BASE || 'https://axixos-social.de').replace(/\/+$/, '');
const AUTO = /^(1|true|yes|on)$/i.test(process.env.PULSE_AUTODISTRIBUTE || '');
const TZ = process.env.PULSE_TZ || 'Europe/Vienna';
const PLATFORMS = (process.env.PULSE_PLATFORMS || 'facebook,instagram,threads,linkedin,googlebusiness,pinterest')
  .split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);

/**
 * Per-tenant Pulse credentials. Each studio we sell to connects THEIR OWN
 * social accounts through the setup wizard (stored encrypted in
 * studio_integrations); the host env var remains a fallback.
 */
export async function getPulseKey(): Promise<string> {
  try {
    const { config } = await import('../config-reader.js');
    const fromDb = await config.get('pulse_api_key');
    if (fromDb) return String(fromDb).trim();
  } catch { /* fall through to env */ }
  return (process.env.PULSE_API_KEY || '').trim();
}

/** Per-platform account pin, e.g. {"instagram":"1784…"}. Without it Pulse uses
 *  the workspace DEFAULT account — the cause of posts landing on the wrong IG. */
export async function getPulseProfiles(): Promise<Record<string, string>> {
  try {
    const { config } = await import('../config-reader.js');
    const raw = await config.get('pulse_profiles');
    if (raw) {
      const obj = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (obj && typeof obj === 'object') {
        return Object.fromEntries(
          Object.entries(obj as Record<string, unknown>)
            .filter(([, v]) => v != null && String(v).trim())
            .map(([k, v]) => [k.toLowerCase(), String(v).trim()]),
        );
      }
    }
  } catch { /* fall through to env */ }
  // Env fallback: PULSE_PROFILE_INSTAGRAM, PULSE_PROFILE_FACEBOOK, …
  const out: Record<string, string> = {};
  for (const p of PLATFORMS) {
    const v = process.env[`PULSE_PROFILE_${p.toUpperCase()}`];
    if (v && v.trim()) out[p] = v.trim();
  }
  return out;
}

export async function getPulseMode(): Promise<string> {
  try {
    const { config } = await import('../config-reader.js');
    const fromDb = await config.get('pulse_mode');
    if (fromDb) return String(fromDb).toLowerCase();
  } catch { /* fall through to env */ }
  // draft (default, safe) | schedule (at publish time) | now (immediately)
  return (process.env.PULSE_MODE || 'draft').toLowerCase();
}

/** True once a Pulse API key is present (distribution is technically possible). */
export async function isPulseConfigured(): Promise<boolean> {
  return !!(await getPulseKey());
}

/** True only when a key is present AND auto-distribution has been explicitly enabled. */
export async function isPulseAutoEnabled(): Promise<boolean> {
  return !!(await getPulseKey()) && AUTO;
}

export interface PulseRow {
  external_id: string;
  post_content: string;
  platform: string;
  profile?: string;
  title?: string;
  hashtags?: string;
  media_urls?: string[];
  group_key?: string;
  tz?: string;
  schedule_time?: string;
  publish_now?: boolean;
  is_draft?: boolean;
}

interface PostLike {
  id: string;
  slug: string;
  title: string;
  imageUrl?: string | null;
  imageUrl2?: string | null;
  imageUrl3?: string | null;
  publishedAt?: Date | string | null;
  scheduledFor?: Date | string | null;
}

/** Format a Date as a wall-clock "YYYY-MM-DD HH:mm" in the given IANA time zone (Pulse's schedule_time format). */
function toWallClock(d: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value || '';
  // hour12:false can emit "24" for midnight on some runtimes — normalise to "00".
  const hh = get('hour') === '24' ? '00' : get('hour');
  return `${get('year')}-${get('month')}-${get('day')} ${hh}:${get('minute')}`;
}

/**
 * Turn a blog post + its Social Pack into one Pulse ingest row per platform.
 * Platforms not in PULSE_PLATFORMS, or with empty copy, are skipped. Instagram and
 * Pinterest are skipped when the post has no image (both require media).
 */
export function buildPulseRows(
  post: PostLike,
  sp: PreparedSocialPack,
  opts?: { mode?: string; when?: Date; platforms?: string[]; profiles?: Record<string, string> },
): PulseRow[] {
  // Optional per-send channel picker: when a non-empty list is passed, only
  // those platforms are built (still intersected with PULSE_PLATFORMS below).
  const pick = Array.isArray(opts?.platforms) && opts!.platforms!.length
    ? new Set(opts!.platforms!.map((p) => p.toLowerCase()))
    : null;
  const images = [post.imageUrl, post.imageUrl2, post.imageUrl3].filter((v): v is string => Boolean(v));
  const hashtags = (sp.hashtags || []).map((h) => (h.startsWith('#') ? h : `#${h}`)).join(' ');
  const groupKey = `newage-blog-${post.id}`;
  // Caller resolves the per-tenant mode (getPulseMode) and passes it in.
  const mode = (opts?.mode || 'draft').toLowerCase();
  const when = opts?.when
    || (post.publishedAt ? new Date(post.publishedAt) : (post.scheduledFor ? new Date(post.scheduledFor) : new Date()));

  const scheduleFields = (): Partial<PulseRow> => {
    if (mode === 'now') return { publish_now: true };
    if (mode === 'schedule') return { schedule_time: toWallClock(when, TZ), tz: TZ };
    return { is_draft: true }; // draft (default): stored in Pulse for review, not delivered
  };

  const defs: Array<{ platform: string; content: string; title?: string; needsMedia?: boolean }> = [
    { platform: 'facebook', content: sp.facebook },
    { platform: 'instagram', content: sp.instagramCaption, needsMedia: true },
    { platform: 'threads', content: sp.threads },
    { platform: 'linkedin', content: sp.linkedin },
    { platform: 'googlebusiness', content: sp.googlebusiness },
    { platform: 'pinterest', content: sp.pinterestDescription, title: sp.pinterestTitle, needsMedia: true },
  ];

  const rows: PulseRow[] = [];
  for (const d of defs) {
    if (!PLATFORMS.includes(d.platform)) continue;
    if (pick && !pick.has(d.platform)) continue;
    if (!d.content || !d.content.trim()) continue;
    if (d.needsMedia && images.length === 0) continue;
    // Per-platform account pin (per-tenant, resolved by the caller). Without it
    // Pulse posts to the workspace DEFAULT account for that platform.
    // Omitted when unset — Pulse then uses the single connected account for that platform.
    const profile = opts?.profiles?.[d.platform];
    rows.push({
      external_id: `newage-${post.id}-${d.platform}`, // stable → idempotent retries (Pulse dedupes)
      post_content: d.content,
      platform: d.platform,
      ...(profile ? { profile } : {}),
      ...(d.title ? { title: d.title } : {}),
      ...(hashtags ? { hashtags } : {}),
      ...(images.length ? { media_urls: images } : {}),
      group_key: groupKey,
      ...scheduleFields(),
    });
  }
  return rows;
}

/** POST the built rows to Pulse's ingest endpoint. Best-effort; never throws. */
export async function distributeToPulse(
  rows: PulseRow[],
): Promise<{ ok: boolean; status?: number; summary?: any; results?: any[]; error?: string }> {
  const key = await getPulseKey();
  if (!key) return { ok: false, error: 'Pulse is not connected — add your Pulse API key in Settings.' };
  if (!rows.length) return { ok: false, error: 'No eligible rows to send (no matching platforms / empty copy).' };
  try {
    const res = await fetch(`${BASE}/api/v1/posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`,
      },
      body: JSON.stringify({ posts: rows }),
    });
    const body: any = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, summary: body?.summary, results: body?.results };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'request failed' };
  }
}
