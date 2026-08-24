/**
 * Per-tenant browser icons and the web app manifest.
 *
 * REGISTRATION (required — nothing here runs until it is done):
 *
 *     import { registerSiteIcons } from './routes/site-icons';
 *     registerSiteIcons(app);            // inside registerRoutes(), server/routes.ts
 *
 * Order matters and is already satisfied by registerRoutes: server/index.ts calls
 * it at :1054, long before serveStatic() at :1184 mounts express.static and the
 * '*' catch-all. Both paths below therefore beat the SPA fallback, which would
 * otherwise answer /site.webmanifest with index.html at HTTP 200 and make every
 * page log a manifest syntax error.
 *
 * UNREGISTERED IS ALSO SAFE, on purpose. client/public/ ships a static
 * brand-icon.png and site.webmanifest, so if this file is never mounted
 * express.static answers both with the neutral product versions. That is why the
 * <link> tags could be added in the same change as the routes instead of waiting.
 *
 * WHY A ROUTE AT ALL, when siteIdentity.ts already stamps %SITE_*% into the head:
 *
 *   - site.webmanifest is a separate document, not part of index.html, so the
 *     placeholder machinery cannot reach it. A checked-in static file cannot carry
 *     name / short_name / theme_color, which are per-studio by definition — it
 *     would ship "TogNinja" into every buyer's Android home screen, the exact
 *     white-label leak this work exists to close.
 *   - /brand-icon.png re-encodes the studio's uploaded logo into a SQUARE PNG on
 *     our own origin. Linking the stored URL straight from <head> fails four ways:
 *     the demo tenant's logo is a WebP (Safari will not render a WebP favicon),
 *     it is 500x472 (a browser scaling a non-square source to a target width is
 *     precisely the sliver bug this change fixes), it is on a third-party bucket,
 *     and /api/proxy-image cannot be reused because its host allow-list
 *     (server/routes.ts) rejects that bucket and it outputs JPEG, which flattens a
 *     transparent logo onto black.
 */

import type { Express, Request, Response } from 'express';
import sharp from 'sharp';
import { pool } from '../db';
import { getSiteIdentity, shortHash } from '../lib/siteIdentity';
import { peekStudioAddress } from '../lib/site-address';

/** Sizes the icon route will render. Anything else falls back to DEFAULT_SIZE. */
const SIZES = new Set([16, 32, 48, 64, 96, 180, 192, 256, 512]);
const DEFAULT_SIZE = 192;

/** A logo is a logo, not a payload. Nothing legitimate is bigger than this. */
const MAX_LOGO_BYTES = 5 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 5000;

const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };
// iOS strips alpha from apple-touch-icon and composites the remainder on black.
const IOS_BACKDROP = { r: 255, g: 255, b: 255, alpha: 1 };

// The admin form (server/routes/studio-branding.ts) shows this same value when
// primary_color is unset. Diverging here would put one colour in the settings
// page and a different one on the visitor's home screen.
const DEFAULT_THEME_COLOR = '#7C3AED';

interface StudioBrand {
  logo: string;
  themeColor: string;
}

const EMPTY_BRAND: StudioBrand = { logo: '', themeColor: '' };
const BRAND_TTL_MS = 60_000;

let brandCache: { value: StudioBrand; at: number } | null = null;
let brandLoading: Promise<StudioBrand> | null = null;

/** Only a literal hex colour reaches the manifest; anything else is ignored. */
function hexColor(value: unknown): string {
  const s = String(value ?? '').trim();
  return /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(s) ? s : '';
}

async function loadBrand(): Promise<StudioBrand> {
  let next = EMPTY_BRAND;
  try {
    const { rows } = await pool.query(
      `SELECT logo_url, primary_color FROM studio_configs LIMIT 1`,
    );
    const row = rows?.[0];
    if (row) {
      next = {
        logo: String(row.logo_url ?? '').trim(),
        themeColor: hexColor(row.primary_color),
      };
    }
  } catch {
    // Missing column, missing table, or a DB blip. An unbranded manifest and the
    // product icon are exactly what this instance served before, so degrading to
    // them is the safe outcome — never a 500 on a tab icon.
  }
  brandCache = { value: next, at: Date.now() };
  return next;
}

/**
 * The studio's branding, cached for a minute.
 *
 * Async (unlike site-address's sync peek) because these handlers are async and
 * nothing here feeds the memoised HTML shells — so there is no version counter
 * to keep in step, and a first request can simply wait for the row.
 */
async function studioBrand(): Promise<StudioBrand> {
  if (brandCache && Date.now() - brandCache.at < BRAND_TTL_MS) return brandCache.value;
  if (!brandLoading) {
    brandLoading = loadBrand().finally(() => { brandLoading = null; });
  }
  try {
    return await brandLoading;
  } catch {
    return brandCache ? brandCache.value : EMPTY_BRAND;
  }
}

/**
 * The logo URL in force. Env beats the row, matching siteIdentity: LOGO_URL is an
 * operator override and, unlike BUSINESS_NAME, is never a boot snapshot of this
 * same row (config-reader has no ENV_MAP entry for logo_url), so there is no
 * stale copy that could outrank the value it was copied from.
 */
async function activeLogoUrl(): Promise<string> {
  const fromEnv = (process.env.LOGO_URL || '').trim();
  if (fromEnv) return fromEnv;
  return (await studioBrand()).logo;
}

/**
 * Download the logo under a hard time and byte budget.
 *
 * The URL comes out of a database row rather than from a request, but an
 * unbounded server-side fetch sitting behind a tab-icon request is still the
 * hang class the 1.5s races in server/vite.ts were written to stop: one slow
 * bucket would tie up a worker on every cold cache. Streamed rather than
 * arrayBuffer()'d so a missing or lying Content-Length cannot get past the cap.
 */
async function fetchLogo(url: string): Promise<Buffer | null> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  // https only: the icon is embedded in an https page, and an http hop would be a
  // mixed-content fetch made by our own server on the studio's behalf.
  if (parsed.protocol !== 'https:') return null;

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(parsed, { signal: ac.signal, redirect: 'follow' });
    if (!res.ok || !res.body) return null;
    const declared = Number(res.headers.get('content-length') || 0);
    if (declared > MAX_LOGO_BYTES) return null;

    const chunks: Buffer[] = [];
    let total = 0;
    const reader = (res.body as ReadableStream<Uint8Array>).getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_LOGO_BYTES) {
        await reader.cancel().catch(() => {});
        return null;
      }
      chunks.push(Buffer.from(value));
    }
    return Buffer.concat(chunks);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// Derived icons, keyed on logo URL + size + flat. Bounded, and dropped wholesale
// when the logo URL changes so a re-upload cannot serve the old mark from memory.
const derived = new Map<string, Buffer>();
let derivedFor = '';

/**
 * Square the logo. fit:'contain' onto a square canvas is the whole point — a
 * studio that uploads a 3:1 wordmark and gets it resized to a target WIDTH
 * reproduces the 16x5 sliver this change exists to remove.
 */
async function renderBrandIcon(source: Buffer, size: number, flat: boolean): Promise<Buffer> {
  const pad = Math.round(size * 0.04);
  const inner = Math.max(1, size - pad * 2);
  const background = flat ? IOS_BACKDROP : TRANSPARENT;
  const contained = await sharp(source)
    .resize(inner, inner, { fit: 'contain', background: TRANSPARENT })
    .toBuffer();
  return sharp(contained)
    .extend({ top: pad, bottom: pad, left: pad, right: pad, background })
    .flatten(flat ? { background: IOS_BACKDROP } : false)
    .png({ compressionLevel: 9 })
    .toBuffer();
}

/**
 * The product icon to fall back to, chosen so the browser still gets a PNG of
 * roughly the size it asked for. Redirecting a rel=icon PNG link to /favicon.svg
 * would hand an SVG to a link that declared type="image/png".
 */
function productIconFor(size: number, flat: boolean): string {
  if (flat || size === 180) return '/apple-touch-icon.png';
  if (size <= 16) return '/favicon-16x16.png';
  if (size <= 32) return '/favicon-32x32.png';
  if (size <= 48) return '/favicon-48x48.png';
  if (size >= 256) return '/icon-512.png';
  return '/icon-192.png';
}

async function brandIconHandler(req: Request, res: Response): Promise<void> {
  const requested = Number.parseInt(String(req.query.s ?? ''), 10);
  const size = SIZES.has(requested) ? requested : DEFAULT_SIZE;
  const flat = String(req.query.flat ?? '') === '1';
  const versioned = !!String(req.query.v ?? '').trim();

  const fallback = () => {
    // no-store on the redirect itself: a transient bucket outage must not pin the
    // product icon in the browser's cache for as long as the success path is cached.
    res.setHeader('Cache-Control', 'no-store');
    res.redirect(302, productIconFor(size, flat));
  };

  try {
    const logoUrl = await activeLogoUrl();
    if (!logoUrl) return fallback();

    if (derivedFor !== logoUrl) {
      derived.clear();
      derivedFor = logoUrl;
    }
    const key = `${size}|${flat ? 1 : 0}`;
    let png = derived.get(key);
    if (!png) {
      const source = await fetchLogo(logoUrl);
      if (!source) return fallback();
      png = await renderBrandIcon(source, size, flat);
      derived.set(key, png);
    }

    // immutable only when the caller supplied a ?v= — siteIdentity derives that
    // from the logo URL, so a re-upload produces a different URL and the day-long
    // cache cannot serve the previous studio's mark. Without it, a short TTL.
    res.setHeader(
      'Cache-Control',
      versioned ? 'public, max-age=86400, immutable' : 'public, max-age=300',
    );
    res.setHeader('ETag', `"${shortHash(logoUrl)}-${size}-${flat ? 1 : 0}"`);
    res.type('image/png').send(png);
  } catch {
    fallback();
  }
}

/**
 * short_name is what Android puts under the home-screen icon, where a long
 * business name is truncated with an ellipsis anyway. Prefer the leading word
 * over a hard slice so "Kristina Banks Photography" becomes "Kristina", not
 * "Kristina Ban".
 */
function shortNameOf(name: string): string {
  if (name.length <= 12) return name;
  const first = name.split(/\s+/)[0] || name;
  return first.slice(0, 12);
}

async function manifestHandler(_req: Request, res: Response): Promise<void> {
  try {
    const identity = getSiteIdentity();
    let studioName = '';
    try {
      studioName = peekStudioAddress()?.name || '';
    } catch {
      /* address cache unavailable — env identity is enough for a manifest */
    }
    // Same precedence server/vite.ts uses when it stamps the tenant name into the
    // served HTML. A manifest naming a different business to the <title> two lines
    // above it is the bug this ordering exists to avoid.
    const name = (process.env.BUSINESS_NAME || '').trim() || studioName || identity.name;

    const brand = await studioBrand();
    const themeColor =
      hexColor(process.env.THEME_COLOR) || brand.themeColor || DEFAULT_THEME_COLOR;

    const logoUrl = await activeLogoUrl();
    const v = logoUrl ? shortHash(logoUrl) : '';
    const icon = (size: number) =>
      logoUrl ? `/brand-icon.png?v=${v}&s=${size}` : `/icon-${size}.png`;

    const manifest = {
      name,
      short_name: shortNameOf(name),
      start_url: '/',
      scope: '/',
      // NOT "standalone". The app registers no service worker — client/index.html
      // actively unregisters legacy ones — so there is no offline story, and a
      // standalone window would strip the back button off a site that needs it.
      display: 'browser',
      background_color: '#ffffff',
      theme_color: themeColor,
      lang: identity.lang,
      icons: [
        { src: icon(192), sizes: '192x192', type: 'image/png' },
        { src: icon(512), sizes: '512x512', type: 'image/png' },
      ],
    };

    res.type('application/manifest+json');
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.send(JSON.stringify(manifest, null, 2));
  } catch {
    // A broken manifest logs a console error on every page of the site. Serving a
    // minimal valid one beats letting the SPA catch-all answer with index.html.
    res.type('application/manifest+json');
    res.setHeader('Cache-Control', 'no-store');
    res.send(JSON.stringify({
      name: 'My Studio',
      short_name: 'Studio',
      start_url: '/',
      display: 'browser',
      icons: [{ src: '/icon-192.png', sizes: '192x192', type: 'image/png' }],
    }));
  }
}

/** Drop the cached row + derived icons after a branding save. */
export function invalidateStudioBrand(): void {
  brandCache = null;
  derived.clear();
  derivedFor = '';
}

export function registerSiteIcons(app: Express): void {
  app.get('/brand-icon.png', brandIconHandler);
  app.get('/site.webmanifest', manifestHandler);
}

export default registerSiteIcons;
