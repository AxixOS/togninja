// Shared BFS website crawler.
//
// Extracted from the inline loop in server/routes/onboarding.ts so the onboarding
// homepage pipeline can crawl in-process (the /api/onboarding HTTP endpoints key off
// a session_id the setup wizard doesn't have). Writes to the same `website_pages`
// table and drives the same `crawl_jobs` row, so /run-crawl and the pipeline are
// interchangeable. Self-contained (its own url helpers) to avoid rewiring onboarding.ts.

import { pool } from '../db';

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

export async function fetchWithTimeout(u: string, ms = 12000): Promise<Response> {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), ms);
  try {
    return await fetch(u, { signal: ac.signal, redirect: 'follow' });
  } finally {
    clearTimeout(t);
  }
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

export function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
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
      const resp = await fetchWithTimeout(current, 12000);
      const ct = String(resp.headers.get('content-type') || '');
      const http_status = resp.status;
      let html = '';
      if (ct.includes('text/html')) html = await resp.text();
      const { title, links, assets, meta } = html
        ? extractTitleAndLinks(html, current)
        : { title: null, links: [] as string[], assets: [] as string[], meta: {} as Record<string, string> };
      const text_content = html ? htmlToText(html).slice(0, 20000) : null;
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

  await pool.query(
    `UPDATE crawl_jobs SET status = 'completed', pages_discovered = $2, pages_crawled = $3, completed_at = now(), updated_at = now() WHERE id = $1`,
    [jobId, discovered, crawled],
  );
  return { crawled, discovered };
}
