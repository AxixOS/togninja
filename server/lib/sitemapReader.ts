// Every page the studio's existing site claims to have.
//
// WHY THIS MATTERS MORE THAN THE CRAWL. crawlSite fetches at most 25 pages and is called
// with 10, which is plenty to understand what a studio DOES — you learn that from the
// homepage, the about page and a services page. It is nowhere near enough to know what they
// would LOSE by moving.
//
// A photographer with a hundred indexed pages who points their domain at this product orphans
// ninety of them. Today those URLs would not even 404: server/vite.ts serves the prerendered
// homepage with HTTP 200 for any unmatched path, so Google sees ninety URLs of identical
// content rather than ninety pages that have gone. Duplicate content at that scale can
// suppress a whole domain, which is a worse outcome than a clean 404 — we would be doing
// something actively harmful rather than nothing.
//
// So before anybody moves a domain, we need the inventory. A sitemap gives it for the cost of
// ONE request where crawling would take a hundred, and almost every site built this decade
// has one.
//
// This reads the inventory ONLY — urls, and lastmod if offered. It does not fetch the pages.

const MAX_URLS = 5000;
const MAX_SITEMAPS = 25;
const TIMEOUT_MS = 15000;

export interface SitemapResult {
  urls: string[];
  /** Where they were found, for a screen that has to explain itself. */
  sources: string[];
  /** Set when no sitemap could be read at all — the caller must not treat that as "no pages". */
  problem?: string;
}

async function fetchText(url: string): Promise<string | null> {
  try {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
    const res = await fetch(url, {
      signal: ctl.signal,
      headers: {
        // The same courtesy the crawler extends: say who is asking.
        'User-Agent': 'TogNinja-SiteMigration/1.0 (+https://togninja.com)',
      },
    }).finally(() => clearTimeout(timer));
    if (!res.ok) return null;
    const type = String(res.headers.get('content-type') || '');
    // A site with no sitemap often serves its HTML 404 page with a 200. That is not a sitemap.
    if (type.includes('html')) return null;
    return await res.text();
  } catch {
    return null;
  }
}

/** Pull <loc> values. Deliberately not an XML parser: sitemaps are simple and often malformed. */
function locations(xml: string): string[] {
  return [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((m) => m[1].trim()).filter(Boolean);
}

function isIndex(xml: string): boolean {
  return /<sitemapindex/i.test(xml);
}

/**
 * Read a studio's sitemap, following an index one level.
 *
 * @param siteUrl their existing site, any form — https://x.com, x.com/, http://www.x.com
 */
export async function readSitemap(siteUrl: string): Promise<SitemapResult> {
  let origin: string;
  try {
    const u = new URL(/^https?:\/\//i.test(siteUrl) ? siteUrl : `https://${siteUrl}`);
    origin = u.origin;
  } catch {
    return { urls: [], sources: [], problem: `"${siteUrl}" is not a usable web address.` };
  }

  // In order of likelihood. robots.txt is last because it costs an extra hop, but it is the
  // only one that finds a sitemap living somewhere unusual.
  const candidates = [
    `${origin}/sitemap.xml`,
    `${origin}/sitemap_index.xml`,
    `${origin}/sitemap-index.xml`,
    `${origin}/wp-sitemap.xml`,
  ];

  const robots = await fetchText(`${origin}/robots.txt`);
  if (robots) {
    for (const m of robots.matchAll(/^\s*sitemap:\s*(\S+)/gim)) {
      const u = m[1].trim();
      if (u && !candidates.includes(u)) candidates.unshift(u);
    }
  }

  const urls = new Set<string>();
  const sources: string[] = [];
  let read = 0;

  for (const candidate of candidates) {
    if (read >= MAX_SITEMAPS || urls.size >= MAX_URLS) break;
    const xml = await fetchText(candidate);
    if (!xml) continue;
    read++;
    sources.push(candidate);

    if (isIndex(xml)) {
      // An index points at more sitemaps. Followed ONE level: nesting deeper than that is
      // rare, and an index that points at itself would otherwise loop.
      for (const child of locations(xml)) {
        if (read >= MAX_SITEMAPS || urls.size >= MAX_URLS) break;
        const childXml = await fetchText(child);
        if (!childXml) continue;
        read++;
        sources.push(child);
        for (const loc of locations(childXml)) {
          if (urls.size >= MAX_URLS) break;
          urls.add(loc);
        }
      }
    } else {
      for (const loc of locations(xml)) {
        if (urls.size >= MAX_URLS) break;
        urls.add(loc);
      }
    }

    // One good sitemap is enough. Trying the rest would only add duplicates.
    if (urls.size > 0) break;
  }

  if (!urls.size) {
    return {
      urls: [],
      sources,
      // NOT "they have no pages". A site can be perfectly healthy with no sitemap, and a
      // migration screen that says "we found 0 pages" would be telling the studio something
      // false about their own website.
      problem: 'No sitemap could be read, so the page list is unknown. It may not exist, or it '
        + 'may be somewhere unusual — this does not mean the site has no pages.',
    };
  }

  return { urls: [...urls], sources };
}

/** The path part, normalised for comparison. Query strings and fragments are not pages. */
export function pathOf(url: string): string | null {
  try {
    const u = new URL(url);
    let p = u.pathname || '/';
    if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);
    return p.toLowerCase();
  } catch {
    return null;
  }
}
