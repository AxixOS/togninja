// Zernio API connector (Phase 2 — "thereafter by API"). The initial bulk load
// is via CSV (make-zernio-csv.ts); this is the programmatic path.
//
// CONFIRM FROM HANDOFF DOC before enabling:
//   - ZERNIO_API_BASE (base URL) and the create/bulk-schedule endpoint path
//   - auth header format (Bearer vs x-api-key) — set below to match
//   - exact JSON payload shape (we mirror the CSV field names, which Zernio accepts)
//
// Secret: ZERNIO_API_KEY lives in .env (gitignored) — never commit it.
import { buildPreparedSocialPack, type SocialPostInput } from './socialSnippets.js';

const BASE = process.env.ZERNIO_API_BASE || 'https://api.zernio.com'; // TODO confirm
const KEY = process.env.ZERNIO_API_KEY || '';
const CHANNELS = (process.env.ZERNIO_CHANNELS || 'facebook,instagram,threads,googlebusiness,pinterest,linkedin');
const ORIGIN = process.env.PUBLIC_SITE_URL || 'https://www.newagefotografie.com';

function resolveZernioUrl(): string | null {
  const endpoint = process.env.ZERNIO_ENDPOINT || '';
  if (!process.env.ZERNIO_API_BASE || !endpoint) return null;
  if (/^https?:\/\//i.test(endpoint)) return endpoint;

  const base = BASE.replace(/\/+$/, '');
  const path = endpoint.replace(/^\/+/, '');
  return `${base}/${path}`;
}

export interface ZernioPostRow {
  title: string;
  content: string;
  isDraft: boolean;
  timezone: string;
  mediaItems?: Array<{
    type: 'image';
    url: string;
    title?: string;
  }>;
  tags?: string[];
  hashtags?: string[];
  metadata?: {
    source: string;
    blogUrl: string;
    channels: string[];
  };
}

/** Build a Zernio draft payload for one blog post. */
export async function buildZernioRow(post: {
  slug: string; title: string; excerpt?: string | null; contentHtml?: string | null; content?: string | null;
  imageUrl?: string | null; imageUrl2?: string | null; imageUrl3?: string | null;
}): Promise<ZernioPostRow> {
  const url = `${ORIGIN}/blog/${post.slug}`;
  const input: SocialPostInput = { title: post.title, excerpt: post.excerpt || undefined, body: post.contentHtml || post.content || undefined, url };
  const preparedPack = await buildPreparedSocialPack(input);
  const mediaItems = [post.imageUrl, post.imageUrl2, post.imageUrl3]
    .filter((value): value is string => Boolean(value))
    .map((imageUrl, index) => ({
      type: 'image' as const,
      url: imageUrl,
      title: index === 0 ? post.title : `${post.title} ${index + 1}`,
    }));

  return {
    title: post.title,
    content: preparedPack.facebook,
    isDraft: true,
    timezone: 'Europe/Vienna',
    ...(mediaItems.length ? { mediaItems } : {}),
    hashtags: preparedPack.hashtags,
    tags: preparedPack.hashtags,
    metadata: {
      source: 'newage-blog-admin',
      blogUrl: url,
      channels: CHANNELS.split(',').map(channel => channel.trim()).filter(Boolean),
    },
  };
}

/**
 * Schedule one or more posts via the Zernio API. ENDPOINT + AUTH are placeholders
 * until the handoff doc confirms them — guarded so it can't fire half-configured.
 */
export async function schedulePosts(rows: ZernioPostRow[]): Promise<{ ok: boolean; status?: number; body?: unknown; error?: string }> {
  if (!KEY) return { ok: false, error: 'ZERNIO_API_KEY not set' };
  const requestUrl = resolveZernioUrl();
  if (!requestUrl) {
    return { ok: false, error: 'Zernio API endpoint not configured yet — confirm base URL + path from the handoff doc (ZERNIO_API_BASE, ZERNIO_ENDPOINT).' };
  }
  const [draft] = rows;
  if (!draft) return { ok: false, error: 'No Zernio draft payload provided' };
  try {
    const res = await fetch(requestUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // TODO confirm auth scheme from handoff (Bearer vs x-api-key):
        'Authorization': `Bearer ${KEY}`,
      },
      body: JSON.stringify(draft),
    });
    const body = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, body };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'request failed' };
  }
}
