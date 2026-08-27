import { pool } from '../db';

/**
 * The studio's own photographs, taken from the site they already have.
 *
 * The crawler has been recording every image URL it meets in website_pages.assets since it
 * shipped, and nothing has ever read them back. Meanwhile the wizard asked a photographer to
 * upload nine images by hand before their new site looked like anything, and a studio that
 * skipped it got a site with empty image blocks.
 *
 * The alternative everyone reaches for is stock, and this product must not: shipping
 * placeholder photography is precisely how the origin studio's pictures ended up on every
 * buyer's homepage. A photographer's own website is a better source than any stock library
 * anyway — it is their actual work, it is already licensed to them, and the filenames a
 * photographer gives their images usually say what is in them.
 *
 * Measured against a real studio site: 12 usable photographs, named things like
 * "edinburgh-military-tattoo" and "professional-headshot-studio".
 */

export interface CrawledImage {
  /** Absolute URL on the studio's own site. */
  url: string;
  /** A human label derived from the filename, for alt text and for the picker. */
  label: string;
  /** Which crawled page it appeared on — useful for matching an image to a pillar. */
  fromPage: string;
}

// Not photographs, whatever the extension says. Every one of these is something a site has
// dozens of and a studio has no interest in seeing offered as their hero.
const NOT_A_PHOTOGRAPH =
  /(logo|icon|favicon|sprite|badge|avatar|placeholder|pixel|spacer|blank|arrow|chevron|bullet|divider|pattern|texture|watermark|loader|loading|thumb-?nail-?default)/i;

const IMAGE_EXT = /\.(jpe?g|png|webp|avif)(\?|#|$)/i;

/**
 * The image CDNs of the site builders photographers actually use.
 *
 * WHY THIS EXISTS. The host check below was "the studio's own domain, or a subdomain of it",
 * which is a correct SSRF boundary and was silently useless for most of the people it serves.
 * A self-hosted site does put its images on images.example.com. Squarespace, Wix, Format and
 * Pixieset put every customer's images on ONE shared CDN, so the studio's own photographs are
 * on a host that has nothing to do with their domain.
 *
 * Measured on a real Squarespace site: the crawl captured 1,774 photograph URLs on
 * images.squarespace-cdn.com and this function returned ZERO. The feature that exists so a
 * photographer never has to hand-upload nine images showed them an empty list.
 *
 * THIS IS STILL A BOUNDARY, and it has to be, because use-crawled-image FETCHES these URLs
 * server-side. It is an explicit, closed list of hosts that serve nothing but site-builder
 * customer media — not a pattern, not a suffix match on "cdn", and nothing that resolves to an
 * internal address. Adding to it is a deliberate act. What it must never become is "any host a
 * crawled page linked to", which is an open fetch-anything proxy wearing a database lookup.
 *
 * Stock libraries are deliberately absent. A studio's own site may well embed a stock photo,
 * and offering it back as "your photograph" is exactly the failure this product exists to avoid.
 */
const BUILDER_IMAGE_CDNS = new Set([
  'images.squarespace-cdn.com',
  'static1.squarespace.com',
  'static.wixstatic.com',
  'images-wixmp-ed30a86b8c4ca887773594c2.wixmp.com',
  'cdn.format.com',
  'images.format.com',
  'photos.smugmug.com',
  'cdn.pixieset.com',
  'images.pixieset.com',
]);

function isBuilderImageCdn(host: string): boolean {
  return BUILDER_IMAGE_CDNS.has(host);
}

/** "edinburgh-military-tattoo-2024.jpg" -> "Edinburgh military tattoo" */
function labelFromUrl(u: string): string {
  try {
    const last = decodeURIComponent(new URL(u).pathname.split('/').filter(Boolean).pop() || '');
    const stem = last.replace(/\.[a-z0-9]+$/i, '');
    const words = stem
      // '+' too. Squarespace names uploads "Dark+Waters.jpg", and decodeURIComponent leaves a
      // literal plus alone — it only means "space" in form encoding, not in a path. Without
      // this the picker offered a photograph called "Dark+Waters".
      .split(/[-_.+]+/)
      // Drop the size and hash noise a CMS appends: 1024x768, scaled, e1699887, v2.
      .filter((w) => w && !/^\d{2,}(x\d{2,})?$/i.test(w) && !/^(scaled|copy|final|small|medium|large|thumb|min|opt)$/i.test(w))
      .filter((w) => !/^[0-9a-f]{8,}$/i.test(w));
    if (!words.length) return '';
    const text = words.join(' ').trim();
    return text ? text[0].toUpperCase() + text.slice(1) : '';
  } catch {
    return '';
  }
}

/**
 * Candidate photographs from the most recent crawl.
 *
 * `sameHostAs` is the anti-SSRF boundary and it is not optional: these URLs are fed back to
 * an endpoint that FETCHES them server-side, so anything that is not on the studio's own
 * site must never reach this list. A crawled page can link to anywhere — a third-party CDN,
 * an ad network, an internal address — and "it came out of our own database" is not the same
 * as "it is safe to fetch".
 */
export async function crawledImages(limit = 40): Promise<CrawledImage[]> {
  const job = await pool.query(
    `SELECT id, seed_url FROM crawl_jobs ORDER BY created_at DESC LIMIT 1`,
  ).catch(() => ({ rows: [] as any[] }));
  if (!job.rows.length) return [];

  let siteHost = '';
  try { siteHost = new URL(String(job.rows[0].seed_url || '')).host.replace(/^www\./i, '').toLowerCase(); } catch {}
  if (!siteHost) return [];

  const pages = await pool.query(
    `SELECT url, assets FROM website_pages WHERE crawl_job_id = $1 AND status = 'ok' ORDER BY created_at`,
    [job.rows[0].id],
  ).catch(() => ({ rows: [] as any[] }));

  const seen = new Set<string>();
  const out: CrawledImage[] = [];

  for (const p of pages.rows as any[]) {
    const assets: string[] = Array.isArray(p.assets) ? p.assets : [];
    for (const raw of assets) {
      if (out.length >= limit) return out;
      if (!raw || String(raw).startsWith('data:')) continue;

      let abs: URL;
      try { abs = new URL(String(raw), p.url); } catch { continue; }

      if (abs.protocol !== 'http:' && abs.protocol !== 'https:') continue;
      // The boundary. Subdomains of the studio's own site are allowed because a photography
      // site's images very often live on one (images.example.com, cdn.example.com) — and so are
      // the image CDNs of the site builders photographers actually use.
      const host = abs.host.replace(/^www\./i, '').toLowerCase();
      const ownSite = host === siteHost || host.endsWith('.' + siteHost);
      if (!ownSite && !isBuilderImageCdn(host)) continue;

      const url = abs.toString();
      if (!IMAGE_EXT.test(abs.pathname)) continue;
      if (NOT_A_PHOTOGRAPH.test(url)) continue;

      // Deduplicate on the PHOTOGRAPH, not the URL.
      //
      // Two things multiply one picture into many URLs. Every site builder serves it at a dozen
      // widths — Squarespace appends ?format=2500w and a responsive srcset lists all of them —
      // and the same file uploaded twice gets two asset ids, so even the paths differ. Measured
      // on a real site: forty offered slots held five actual pictures, the first eight of them
      // identical.
      //
      // So the identity is the FILENAME. The trade-off is deliberate and worth naming: a site
      // that names every gallery image `1.jpg` will have distinct photographs collapsed into
      // one. Offering a studio the same picture eight times is the worse failure — this list
      // exists so they can pick nine images quickly, and a picker full of duplicates is one
      // they close.
      const filename = decodeURIComponent(abs.pathname.split('/').filter(Boolean).pop() || '').toLowerCase();
      const identity = filename || abs.origin + abs.pathname;
      if (seen.has(identity)) continue;
      seen.add(identity);
      out.push({ url, label: labelFromUrl(url), fromPage: String(p.url || '') });
    }
  }

  return out;
}

/** True when this URL is one the most recent crawl actually found. Checked before fetching. */
export async function isCrawledImage(url: string): Promise<boolean> {
  const list = await crawledImages(500);
  return list.some((i) => i.url === url);
}
