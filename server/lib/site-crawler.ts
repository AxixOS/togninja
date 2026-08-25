// Shared BFS website crawler.
//
// Extracted from the inline loop in server/routes/onboarding.ts so the onboarding
// homepage pipeline can crawl in-process (the /api/onboarding HTTP endpoints key off
// a session_id the setup wizard doesn't have). Writes to the same `website_pages`
// table and drives the same `crawl_jobs` row, so /run-crawl and the pipeline are
// interchangeable. Self-contained (its own url helpers) to avoid rewiring onboarding.ts.

import { existsSync } from 'fs';
import { pool } from '../db';

// ---------------------------------------------------------------------------
// Rendering a client-side site.
//
// The crawl was a plain fetch(), and htmlToText() strips <script> before
// extracting — which on a JavaScript-rendered site removes the only thing that
// would ever have produced content. A candidate buyer's site built with Vite or
// similar returns a shell with an empty <div id="root">, so the crawl yielded
// its <title> and nothing else: one page, no links, 69 characters. The whole
// site would then be generated from a title and a meta description, i.e. made
// up. That is not a copywriting problem, it is a sourcing one.
//
// So: fetch first, because it is cheap and most photographers' sites are
// server-rendered and crawl perfectly well. Only when the result looks like an
// empty shell do we pay for a browser.
//
// Fails CLOSED. If no browser is available — the deploy may have no Chromium,
// which is why the Dockerfile pins PUPPETEER_EXECUTABLE_PATH — we keep the
// fetched HTML and carry on. A thin crawl is the status quo; a crash is not.
// ---------------------------------------------------------------------------

/** Same candidate order the build uses to find a browser (see vite.config.ts). */
function resolveChromePath(): string | undefined {
  const rel = '.chrome-for-testing/chrome-linux64/chrome';
  const candidates = [
    `${process.cwd()}/${rel}`,
    `/app/${rel}`,
    process.env.PUPPETEER_EXECUTABLE_PATH,
    process.env.GOOGLE_CHROME_BIN,
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/google-chrome',
  ].filter(Boolean) as string[];
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  return undefined;
}

/**
 * Does this HTML look like a shell whose content only exists after JavaScript?
 * Deliberately conservative: a page with real text or real links is left alone,
 * so a server-rendered site never pays for a browser.
 */
export function looksClientRendered(html: string): boolean {
  if (!html) return false;
  const text = htmlToText(html);
  const anchors = (html.match(/<a\s+[^>]*href=/gi) || []).length;
  return text.length < 600 && anchors < 3;
}

let browserPromise: Promise<any> | null = null;
let browserUnavailable = false;

async function getBrowser(): Promise<any | null> {
  if (browserUnavailable) return null;
  if (!browserPromise) {
    browserPromise = (async () => {
      const puppeteer: any = await import('puppeteer');
      const executablePath = resolveChromePath();
      return (puppeteer.default || puppeteer).launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-dev-shm-usage'],
        ...(executablePath ? { executablePath } : {}),
      });
    })().catch((e: any) => {
      // No browser on this host. Say so once, loudly enough to find in a log,
      // then never retry — 25 pages should not each pay a failed launch.
      console.warn('[site-crawler] no browser available, client-rendered sites will crawl thin:', e?.message || e);
      browserUnavailable = true;
      browserPromise = null;
      return null;
    });
  }
  return browserPromise;
}

/** Render `url` and return its post-JavaScript HTML, or null if that is not possible. */
export async function renderHtml(url: string, timeoutMs = 20000): Promise<string | null> {
  try {
    const browser = await getBrowser();
    if (!browser) return null;
    const page = await browser.newPage();
    try {
      await page.setUserAgent('Mozilla/5.0 (compatible; TogNinjaSetupBot/1.0; +onboarding site import)');
      await page.goto(url, { waitUntil: 'networkidle2', timeout: timeoutMs });
      return await page.content();
    } finally {
      await page.close().catch(() => {});
    }
  } catch (e: any) {
    console.warn(`[site-crawler] render failed for ${url}:`, e?.message || e);
    return null;
  }
}

/** Close the shared browser once a crawl finishes. Safe to call when none was opened. */
export async function closeCrawlBrowser(): Promise<void> {
  const p = browserPromise;
  browserPromise = null;
  if (!p) return;
  try {
    const b = await p;
    if (b) await b.close();
  } catch { /* already gone */ }
}

export function normalizeUrl(u: string): string {
  try {
    const parsed = new URL(u);
    parsed.hash = '';
    const p = parsed.pathname.replace(/\/$/, '');
    parsed.pathname = p || '/';
    return parsed.toString();
  } catch {
    return u;
  }
}

export function sameHost(a: string, b: string): boolean {
  try {
    return new URL(a).host === new URL(b).host;
  } catch {
    return false;
  }
}

/**
 * Identify the crawler like a browser, and say who we are.
 *
 * This request carried NO headers, so Node sent its default User-Agent — which
 * Squarespace, Wix, Cloudflare and most managed hosts reject outright. The buyer's site
 * is then recorded as a failed page and, before the guard in homepage-pipeline, the
 * whole site was written from nothing. Measured against mariotestino.com: the bare
 * fetch fails, the same URL with these headers returns HTTP 200 and 169 KB.
 *
 * The UA names the product and links to it, which is what a well-behaved crawler does
 * and is also what gets it allowed rather than blocked. Accept-Language asks for the
 * studio's own language where the site serves several.
 */
const CRAWL_HEADERS: Record<string, string> = {
  'user-agent': 'Mozilla/5.0 (compatible; TogNinjaBot/1.0; +https://togninja.com/bot)',
  accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'accept-language': 'en,de;q=0.8,*;q=0.5',
};

/**
 * The second attempt, for hosts that refuse to serve a crawler at all.
 *
 * Naming ourselves honestly is the right default and it is what most hosts want. It is
 * also, on some of them, exactly what gets us nothing. Measured against
 * davidmollisonphotography.com — a real studio site a buyer tried to onboard with:
 *
 *     TogNinjaBot user-agent  ->  403 Forbidden, 105 characters, title "403 - Forbidden"
 *     browser user-agent      ->  200 OK, 4,503 characters, title "Edinburgh Photographer"
 *
 * The studio was told their site "may render with JavaScript" and the onboarding stopped
 * there. Their site was fine. We were the ones being turned away.
 *
 * So: ask politely first, every time. Only when that yields nothing usable do we ask again
 * as a browser — which is what the person who owns the site would see, and what they are
 * asking us to read on their behalf.
 */
const BROWSER_HEADERS: Record<string, string> = {
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'accept-language': 'en,de;q=0.8,*;q=0.5',
  'upgrade-insecure-requests': '1',
  'sec-fetch-dest': 'document',
  'sec-fetch-mode': 'navigate',
  'sec-fetch-site': 'none',
};

export async function fetchWithTimeout(u: string, ms = 12000, headers = CRAWL_HEADERS): Promise<Response> {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), ms);
  try {
    return await fetch(u, { signal: ac.signal, redirect: 'follow', headers });
  } finally {
    clearTimeout(t);
  }
}

/** How much text has to come back before we accept the answer as the real page. */
const USABLE_TEXT = 400;

/**
 * Fetch a page, and if what comes back is a refusal or an empty shell, ask once more as a
 * browser. Returns whichever attempt actually produced a page.
 */
export async function fetchPageHtml(
  u: string,
  ms = 12000,
): Promise<{ resp: Response; html: string; usedBrowserUA: boolean }> {
  const resp = await fetchWithTimeout(u, ms);
  const ct = String(resp.headers.get('content-type') || '');
  const html = ct.includes('text/html') ? await resp.text() : '';

  const refused = resp.status < 200 || resp.status >= 400;
  const empty = !html || htmlToText(html).length < USABLE_TEXT;
  if (!refused && !empty) return { resp, html, usedBrowserUA: false };

  try {
    const retry = await fetchWithTimeout(u, ms, BROWSER_HEADERS);
    const rct = String(retry.headers.get('content-type') || '');
    const rhtml = rct.includes('text/html') ? await retry.text() : '';
    // Only take the retry if it is genuinely better. A second refusal is not an answer.
    if (retry.status >= 200 && retry.status < 400 && htmlToText(rhtml).length > htmlToText(html).length) {
      console.log(`[site-crawler] ${u}: polite UA gave ${resp.status}/${htmlToText(html).length} chars, browser UA gave ${retry.status}/${htmlToText(rhtml).length}`);
      return { resp: retry, html: rhtml, usedBrowserUA: true };
    }
  } catch { /* the first answer stands */ }

  return { resp, html, usedBrowserUA: false };
}

export function extractTitleAndLinks(
  html: string,
  baseUrl: string,
): { title: string | null; links: string[]; assets: string[]; meta: Record<string, string> } {
  const out = { title: null as string | null, links: [] as string[], assets: [] as string[], meta: {} as Record<string, string> };
  try {
    const t = html.match(/<title>([\s\S]*?)<\/title>/i);
    out.title = t ? t[1].trim().slice(0, 300) : null;
  } catch {}
  try {
    const hrefRe = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>/gi;
    const srcRe = /<img\s+[^>]*src=["']([^"']+)["'][^>]*>/gi;
    const linkCssRe = /<link\s+[^>]*rel=["'][^"']*stylesheet[^"']*["'][^>]*href=["']([^"']+)["'][^>]*>/gi;
    let m: RegExpExecArray | null;
    const urls = new Set<string>();
    while ((m = hrefRe.exec(html))) urls.add(m[1]);
    while ((m = linkCssRe.exec(html))) out.assets.push(m[1]);
    while ((m = srcRe.exec(html))) out.assets.push(m[1]);

    // Lazy-loaded and responsive images.
    //
    // Only a bare src= was captured, and on a modern photography site that is often the
    // least interesting attribute on the tag: a lazy-loading theme puts a transparent
    // placeholder in src and the real photograph in data-src, and a responsive one lists
    // every size in srcset. A studio whose site does either had their own work recorded as
    // a handful of 1x1 spacers.
    //
    // srcset entries are "url 800w, url 1600w" — take the URL, drop the descriptor, and let
    // the consumer decide which size it wants.
    const lazyRe = /<img\s+[^>]*?data-(?:src|original|lazy-src)=["']([^"']+)["'][^>]*>/gi;
    while ((m = lazyRe.exec(html))) out.assets.push(m[1]);

    const srcsetRe = /<(?:img|source)\s+[^>]*?(?:data-)?srcset=["']([^"']+)["'][^>]*>/gi;
    while ((m = srcsetRe.exec(html))) {
      for (const part of m[1].split(',')) {
        const url = part.trim().split(/\s+/)[0];
        if (url) out.assets.push(url);
      }
    }
    const resolved: string[] = [];
    urls.forEach((raw) => {
      try { resolved.push(new URL(raw, baseUrl).toString()); } catch {}
    });
    out.links = resolved;
    try {
      const metaRe = /<meta\s+([^>]*?)>/gi;
      let mm: RegExpExecArray | null;
      while ((mm = metaRe.exec(html))) {
        const tag = mm[1] || '';
        const nameMatch = tag.match(/\bname=["']([^"']+)["']/i);
        const propMatch = tag.match(/\bproperty=["']([^"']+)["']/i);
        const contentMatch = tag.match(/\bcontent=["']([^"']+)["']/i);
        const key = (nameMatch?.[1] || propMatch?.[1] || '').toLowerCase();
        const val = contentMatch?.[1] || '';
        if (key && val) out.meta[key] = val;
      }
    } catch {}
  } catch {}
  return out;
}

/**
 * Pull schema.org JSON-LD out of a page BEFORE htmlToText destroys it.
 *
 * This is the single richest thing on most photography sites and it was being thrown
 * away: htmlToText's <script> strip removes application/ld+json along with the
 * analytics, taking the studio's exact service names, phone, email, address, opening
 * hours and often their aggregate rating with it. Everything downstream then had to
 * infer those from prose.
 *
 * Returns a compact, human-readable FACTS block — the generator reads text, so there is
 * no point handing it raw JSON.
 */
export function extractStructuredFacts(html: string): string {
  const blocks: any[] = [];
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    try {
      const parsed = JSON.parse(m[1].trim());
      blocks.push(...(Array.isArray(parsed) ? parsed : [parsed]));
    } catch { /* a malformed block must not cost us the rest of the page */ }
  }
  // @graph is how most CMSs (Yoast, RankMath) wrap their nodes.
  const nodes = blocks.flatMap((b) => (Array.isArray(b?.['@graph']) ? b['@graph'] : [b])).filter(Boolean);

  const facts: string[] = [];
  const seen = new Set<string>();
  const add = (label: string, value: unknown) => {
    if (value === undefined || value === null) return;
    const v = typeof value === 'string' ? value.trim() : String(value);
    if (!v || v.length > 300) return;
    const key = `${label}:${v}`;
    if (seen.has(key)) return;
    seen.add(key);
    facts.push(`${label}: ${v}`);
  };

  for (const n of nodes) {
    const type = Array.isArray(n['@type']) ? n['@type'].join('/') : n['@type'];
    if (!type) continue;
    if (/Organization|LocalBusiness|ProfessionalService|Photograph/i.test(type)) {
      add('Business name', n.name);
      add('Description', n.description);
      add('Telephone', n.telephone);
      add('Email', n.email);
      if (n.address) {
        add('Street', n.address.streetAddress);
        add('Locality', n.address.addressLocality);
        add('Region', n.address.addressRegion);
        add('Postcode', n.address.postalCode);
        add('Country', n.address.addressCountry?.name || n.address.addressCountry);
      }
      const area = Array.isArray(n.areaServed) ? n.areaServed : n.areaServed ? [n.areaServed] : [];
      for (const a of area) add('Serves', typeof a === 'string' ? a : a?.name);
      if (n.aggregateRating) {
        add('Rating', n.aggregateRating.ratingValue);
        add('Review count', n.aggregateRating.reviewCount || n.aggregateRating.ratingCount);
      }
      const hours = Array.isArray(n.openingHoursSpecification) ? n.openingHoursSpecification : [];
      for (const h of hours) {
        const days = Array.isArray(h.dayOfWeek) ? h.dayOfWeek.join(', ') : h.dayOfWeek;
        if (days) add('Opening hours', `${days} ${h.opens || ''}–${h.closes || ''}`.trim());
      }
    }
    if (/Service|Product|Offer/i.test(type)) {
      add('Service', n.name);
      const price = n.offers?.price ?? n.price;
      const cur = n.offers?.priceCurrency ?? n.priceCurrency;
      if (price) add('Price', `${n.name || 'item'} — ${price}${cur ? ` ${cur}` : ''}`);
    }
    if (/BreadcrumbList/i.test(type) && Array.isArray(n.itemListElement)) {
      const trail = n.itemListElement.map((i: any) => i?.name || i?.item?.name).filter(Boolean).join(' > ');
      add('Section', trail);
    }
  }
  return facts.length ? `[STRUCTURED FACTS FROM THE SITE]\n${facts.join('\n')}` : '';
}

export function htmlToText(html: string): string {
  return html
    // Comments FIRST. Without this, "<!-- Facebook Pixel Code -->" and every other
    // tracking-snippet comment survives the tag strip as body text — and because the
    // generator only reads the first couple of thousand characters, that debris was
    // consuming the window before a single word the studio wrote reached the model.
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    // Chrome, not content. A mega-nav repeated in header, drawer and footer was being
    // counted three times ahead of the page's own copy. Measured on a real studio site,
    // the first sentence the business actually wrote began at character 2,648 — past the
    // point where the context builder stops reading.
    .replace(/<header[\s\S]*?<\/header>/gi, ' ')
    .replace(/<nav[\s\S]*?<\/nav>/gi, ' ')
    .replace(/<footer[\s\S]*?<\/footer>/gi, ' ')
    .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
    // Keep block boundaries as line breaks so headings do not run into body text.
    .replace(/<\/(h[1-6]|p|li|div|section|article|br)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    // CSS that reached the text layer anyway. Squarespace and several page builders emit
    // rules outside <style> (injected, or trailing a malformed comment), so stripping the
    // tag is not enough: a selector plus a declaration block reads as prose to the model
    // and eats the context window. Matches "<selector> { prop: value }" only — a brace
    // pair with no colon inside is left alone.
    .replace(/[.#@][^{}\n]{0,120}\{[^{}]*:[^{}]*\}/g, ' ')
    // Collapse whitespace LAST and in the right order. Doing \n{3,} first never fired:
    // closing every nested <div> yields "\n \n \n" with spaces between, which that
    // pattern does not match, so a deeply nested page came out as hundreds of blank lines.
    .replace(/[ \t]+/g, ' ')
    .replace(/[ \t]*\n[ \t]*/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * BFS crawl `startUrl` (same-host only, up to maxPages), writing each page into
 * `website_pages` under `jobId` and flipping the `crawl_jobs` row running→completed.
 * Synchronous per page; the caller should run it off the request path (background).
 */
export async function crawlSite(
  { jobId, startUrl, maxPages }: { jobId: string; startUrl: string; maxPages: number },
): Promise<{ crawled: number; discovered: number }> {
  const cap = Math.min(25, Math.max(1, Number(maxPages || 10)));
  await pool.query(`UPDATE crawl_jobs SET status = 'running', started_at = now(), error = NULL WHERE id = $1`, [jobId]);

  const queue: string[] = [normalizeUrl(startUrl)];
  const visited = new Set<string>();
  let crawled = 0;
  let discovered = 1;
  const origin = new URL(startUrl).toString();

  while (queue.length && crawled < cap) {
    const current = queue.shift()!;
    if (!current || visited.has(current)) continue;
    visited.add(current);
    try {
      const fetched = await fetchPageHtml(current, 12000);
      const resp = fetched.resp;
      const ct = String(resp.headers.get('content-type') || '');
      const http_status = resp.status;
      let html = fetched.html;
      // A shell with no text and no links is a site whose content is built by
      // JavaScript. Render it rather than importing its <title> and calling that
      // the studio's website. Returns null when no browser exists, in which case
      // we keep exactly what fetch gave us.
      if (html && looksClientRendered(html)) {
        const rendered = await renderHtml(current);
        if (rendered && htmlToText(rendered).length > htmlToText(html).length) {
          html = rendered;
        }
      }
      const { title, links, assets, meta } = html
        ? extractTitleAndLinks(html, current)
        : { title: null, links: [] as string[], assets: [] as string[], meta: {} as Record<string, string> };
      // Facts first, prose second. The context builder reads from the FRONT of this
      // column and stops after a couple of thousand characters, so anything the studio
      // stated machine-readably has to lead — otherwise it is truthful data that never
      // reaches the model.
      const facts = html ? extractStructuredFacts(html) : '';
      const prose = html ? htmlToText(html) : '';
      const text_content = html ? `${facts ? `${facts}\n\n` : ''}${prose}`.slice(0, 20000) : null;
      const trimmedHtml = html ? html.slice(0, 200000) : null;
      await pool.query(
        `INSERT INTO website_pages(crawl_job_id, url, status, http_status, content_type, title, html, text_content, links, assets, meta)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10::jsonb, $11::jsonb)`,
        [
          jobId,
          current,
          http_status >= 200 && http_status < 400 ? 'ok' : 'error',
          http_status,
          ct,
          title,
          trimmedHtml,
          text_content,
          JSON.stringify(links),
          JSON.stringify(assets),
          JSON.stringify(meta),
        ],
      );
      crawled++;
      for (const link of links) {
        if (!sameHost(link, origin)) continue;
        const n = normalizeUrl(link);
        if (!visited.has(n) && queue.length + crawled < cap * 2) {
          queue.push(n);
          discovered++;
        }
      }
    } catch {
      await pool.query(
        `INSERT INTO website_pages(crawl_job_id, url, status, http_status, content_type, title, html, text_content, links, assets)
         VALUES ($1, $2, 'error', $3, NULL, NULL, NULL, NULL, '[]'::jsonb, '[]'::jsonb)`,
        [jobId, current, null],
      );
    }
  }

  // One browser is shared across the whole crawl; release it here rather than
  // per page, and never let a failure to close mask the crawl's own result.
  await closeCrawlBrowser();

  await pool.query(
    `UPDATE crawl_jobs SET status = 'completed', pages_discovered = $2, pages_crawled = $3, completed_at = now(), updated_at = now() WHERE id = $1`,
    [jobId, discovered, crawled],
  );
  return { crawled, discovered };
}
