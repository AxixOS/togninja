// Every photograph the crawl found, on a portfolio page, in the studio's own storage.
//
// The crawl records forty-odd images from a real studio's existing site. Nine of them get
// placed in named slots by assignCrawledImages — a hero, two content blocks, one per service
// — and the rest were offered in a picker and otherwise did nothing. A photographer's whole
// body of work sat in the database and their new site showed nine pictures.
//
// WHY THIS IS NOT storeSiteImage. That path runs a VISION CALL PER IMAGE to write alt text
// and IPTC metadata, and its own comment prices the decision: "Nine vision calls is roughly
// 5p." Nine is the right number to spend it on, because those nine ARE the studio's public
// face. Forty is not — it would more than triple the slowest phase of a pipeline that already
// writes for three minutes after the wizard says it has finished, for alt text on a grid
// where each picture is one of forty rather than the first thing a visitor sees.
//
// So this copies the bytes and skips the description. The alt text comes from what the
// crawler recorded, which is the studio's own words from their own page.
//
// THE BYTES ARE COPIED, NOT HOTLINKED. The picker's own note says why: "We copy it into your
// own storage, so it keeps working after your old site goes." A portfolio page pointing at
// the site they are replacing breaks on the day they cancel it.
import crypto from 'crypto';
import path from 'path';
import { pool } from '../db';

const MAX_BYTES = 12 * 1024 * 1024;

export interface SeedPortfolioResult {
  added: number;
  skipped: number;
  reason?: string;
}

/**
 * Copy the crawled photographs into portfolio_images.
 *
 * `stillCurrent` is the same run fence assignCrawledSiteImages takes, and for the same
 * reason: this downloads and uploads forty files one at a time, so a reset can easily land
 * in the middle of it and everything written afterwards belongs to the previous studio.
 */
export async function seedPortfolioFromCrawl(
  opts: { stillCurrent?: () => Promise<boolean> } = {},
): Promise<SeedPortfolioResult> {
  const out: SeedPortfolioResult = { added: 0, skipped: 0 };
  try {
    const { getS3Client, getS3Config, buildPublicUrl } = await import('../services/s3-storage');
    const cfg = getS3Config();
    if (!cfg.isConfigured) {
      // Not a failure: a studio who has not connected storage yet simply has no portfolio
      // until they do. Hotlinking their old site instead would look like it worked.
      return { ...out, reason: 'file storage is not configured' };
    }

    const { crawledImages } = await import('./crawledImages');
    const found = await crawledImages(60);
    if (!found.length) return { ...out, reason: 'the crawl found no photographs' };

    // Anything already here is the studio's own doing — an upload, or a previous run. Never
    // duplicated, and never overwritten.
    const existing = await pool.query('SELECT url FROM portfolio_images');
    const have = new Set((existing.rows || []).map((r: any) => String(r.url)));

    const { PutObjectCommand } = await import('@aws-sdk/client-s3');
    const s3 = getS3Client();

    let order = 0;
    for (const img of found) {
      if (opts.stillCurrent && !(await opts.stillCurrent())) {
        console.log('[portfolio-seed] abandoning — the instance was reset mid-run');
        return out;
      }

      const src = String(img.url || '');
      if (!src || have.has(src)) { out.skipped++; continue; }

      try {
        const r = await fetch(src, { redirect: 'follow' });
        if (!r.ok) { out.skipped++; continue; }
        const mime = String(r.headers.get('content-type') || '').split(';')[0].trim();
        // The content type is what the server actually sent; the extension is whatever the
        // path happened to say. Only the former decides.
        if (!/^image\/(png|jpe?g|webp|avif)$/.test(mime)) { out.skipped++; continue; }
        const buffer = Buffer.from(await r.arrayBuffer());
        if (!buffer.length || buffer.length > MAX_BYTES) { out.skipped++; continue; }

        const ext = path.extname(new URL(src).pathname)
          || (mime === 'image/png' ? '.png' : mime === 'image/webp' ? '.webp' : mime === 'image/avif' ? '.avif' : '.jpg');
        const key = `Portfolio/${crypto.randomUUID()}${ext}`;

        await s3.send(new PutObjectCommand({
          Bucket: cfg.bucket,
          Key: key,
          Body: buffer,
          ContentType: mime,
        }));

        await pool.query(
          `INSERT INTO portfolio_images (category, url, alt, title, description, sort_order, is_active)
           VALUES ($1, $2, $3, $4, $5, $6, true)`,
          [
            // 'portfolio', not one of the six hardcoded categories the page used to group by
            // — those are the ORIGIN studio's taxonomy (family, newborn, maternity, wedding,
            // business, event, all linking to /fotoshootings). A crawled photograph belongs
            // to whatever this studio shoots, which we do not know, so it is not filed under
            // somebody else's headings.
            'portfolio',
            buildPublicUrl(cfg.bucket, cfg.endpoint, key),
            String(img.label || '').slice(0, 200) || null,
            null,
            null,
            order++,
          ],
        );
        out.added++;
      } catch (e: any) {
        console.warn(`[portfolio-seed] skipped ${src.slice(0, 70)}: ${e?.message || e}`);
        out.skipped++;
      }
    }

    console.log(`[portfolio-seed] ${out.added} photograph(s) copied into the portfolio, ${out.skipped} skipped`);
    return out;
  } catch (e: any) {
    console.warn('[portfolio-seed] failed:', e?.message || e);
    return { ...out, reason: String(e?.message || e).slice(0, 200) };
  }
}
