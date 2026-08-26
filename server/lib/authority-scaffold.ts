// Phase 2 — scaffold a landing-page DRAFT for each pillar in the studio's Authority Map.
// Reuses the landing-page engine (generateLandingContent -> mapGeneratedToLandingPage ->
// neonDb.createLandingPage), the same path the onboarding homepage pipeline uses. Pages are
// created as drafts with a preview token, reachable at /lp/<slug> and editable in the admin
// editor. Idempotent: a pillar whose slug already has a page is skipped.
import crypto from 'crypto';
import { generateLandingContent, NoOpenAIError, type LandingContext } from './landing-generator';
import { mapGeneratedToLandingPage, slugify } from './landing-mapping';
import { getAuthorityMap } from './authority-map';
import { pool } from '../db';

const neonDb = require('../../database.js');

/**
 * The studio's own words, selected for ONE pillar.
 *
 * The pillar pages are the money pages, and they were being written from six strings:
 * the pillar label, a keyphrase and a city. The sibling homepage path hands the model a
 * 40,000-character block of the studio's crawled site (homepage-pipeline buildContext) —
 * this path handed it "Fashion Photography" and "London" and asked for a page. A model
 * given no facts writes the only thing it can, which is generic marketing, and until
 * v1.9.12 the prompt then told it to invent the testimonials too.
 *
 * The crawl already stored the whole site. This reads it back and picks the pages that
 * actually concern this service, so each pillar page is written from what the studio
 * genuinely says about that service rather than from its title.
 *
 * Scored rather than filtered: a page mentioning the service in its title or URL leads,
 * body mentions follow, and if nothing matches we fall back to the largest pages so the
 * model still has the business's voice, tone and offering rather than nothing at all.
 */
async function crawledContextForPillar(
  pillar: { label: string; keyphrase?: string; match?: string; href?: string },
  perPageChars = 4000,
  totalChars = 24000,
): Promise<string> {
  let rows: any[] = [];
  try {
    const r = await pool.query(
      `SELECT url, title, text_content
         FROM website_pages
        WHERE status = 'ok' AND coalesce(text_content, '') <> ''
        ORDER BY created_at DESC
        LIMIT 40`,
    );
    rows = r.rows || [];
  } catch {
    return '';
  }
  if (!rows.length) return '';

  // Terms that identify this pillar: its label words, its keyphrase, its slug, and the
  // regex alternation the map already carries for routing related content.
  const terms = new Set<string>();
  for (const src of [pillar.label, pillar.keyphrase, String(pillar.href || '').replace(/[^a-z0-9]+/gi, ' ')]) {
    for (const w of String(src || '').toLowerCase().split(/[^a-z0-9]+/)) {
      if (w.length > 3) terms.add(w);
    }
  }
  try {
    for (const w of String(pillar.match || '').toLowerCase().split('|')) {
      const t = w.replace(/[^a-z0-9]+/g, '');
      if (t.length > 3) terms.add(t);
    }
  } catch { /* a malformed match must not cost us the page */ }

  const scored = rows.map((row) => {
    const title = String(row.title || '').toLowerCase();
    const url = String(row.url || '').toLowerCase();
    const body = String(row.text_content || '').toLowerCase();
    let score = 0;
    for (const t of terms) {
      if (title.includes(t)) score += 10;
      if (url.includes(t)) score += 6;
      if (body.includes(t)) score += 1;
    }
    return { row, score };
  });

  const relevant = scored.filter((s) => s.score > 0).sort((a, b) => b.score - a.score);
  const chosen = (relevant.length ? relevant : scored.sort(
    (a, b) => String(b.row.text_content).length - String(a.row.text_content).length,
  )).slice(0, 6);

  return chosen
    .map(({ row }) => `## ${row.title || row.url}\n${String(row.text_content || '').slice(0, perPageChars)}`)
    .join('\n\n')
    .slice(0, totalChars);
}

export interface ScaffoldResult {
  pillar: string;
  slug: string;
  status: 'created' | 'published' | 'skipped' | 'error';
  id?: string;
  previewUrl?: string;
  editUrl?: string;
  error?: string;
}

export async function scaffoldPillarPages(
  opts: { city?: string; limit?: number; publish?: boolean; language?: string } = {},
): Promise<{ results: ScaffoldResult[]; created: number; published: number; skipped: number; remaining: number }> {
  const map = await getAuthorityMap();
  const cap = Math.max(1, Math.min(opts.limit || 6, 8)); // bound OpenAI cost/latency per call
  const results: ScaffoldResult[] = [];
  let created = 0;
  let published = 0;
  let skipped = 0;
  let processed = 0;

  for (const pillar of map.pillars) {
    const slug = slugify(pillar.href.replace(/^\/+|\/+$/g, '') || pillar.label);

    // Idempotent: if a landing page with this slug already exists, skip building it.
    const available = await neonDb.checkSlugAvailable(slug);
    if (!available) {
      // …but "already exists" and "already live" are different things, and skipping both
      // made the operation impossible to complete. A page built by an earlier run — or by
      // a run that predated the publish option — sits as a DRAFT, which the public site
      // never serves. Asking again to publish then hit this guard and reported "skipped",
      // so the studio had five pages it could not get live by any route short of
      // publishing each by hand. When publishing is what was asked for, finish the job.
      if (opts.publish) {
        try {
          const { pool } = await import('../db');
          const upd = await pool.query(
            `UPDATE landing_pages SET status = 'published', published_at = COALESCE(published_at, NOW()), updated_at = NOW()
              WHERE slug = $1 AND status IS DISTINCT FROM 'published' RETURNING id`,
            [slug],
          );
          if (upd.rowCount) {
            results.push({ pillar: pillar.label, slug, status: 'published' });
            published++;
            continue;
          }
        } catch (e: any) {
          console.warn(`[authority-scaffold] could not publish existing "${slug}":`, e?.message || e);
        }
      }
      results.push({ pillar: pillar.label, slug, status: 'skipped' });
      skipped++;
      continue;
    }

    if (processed >= cap) continue; // leave the rest for a follow-up "Build" click
    processed++;

    try {
      // What this studio actually says about THIS service, from its own site.
      const crawled = await crawledContextForPillar(pillar as any);

      const context: LandingContext = {
        primaryService: pillar.label,
        city: opts.city || undefined,
        // Without this the generator defaulted to English regardless of the studio, so a
        // Spanish or German studio got English pillar pages under its own nav.
        language: opts.language || undefined,
        tone: 'warm',
        pageType: 'landing',
        keywords: pillar.keyphrase || undefined,
        offerSummary: pillar.keyphrase ? `${pillar.label} — ${pillar.keyphrase}` : pillar.label,
        // The field the homepage path uses to hand over the studio's own words, and which
        // this path left empty. Without it the page could only ever be written from the
        // service's NAME.
        extras: crawled
          ? [
              `This is a page about ONE service: ${pillar.label}.`,
              '',
              'Below is content from the studio\'s existing website. Write only what it',
              'supports. Use their own service names, their process, their inclusions and',
              'their turnaround. Where it states a price, keep the figure exactly. Do not',
              'add facts it does not contain — no invented reviews, awards or statistics.',
              'If it says nothing about a section, leave that section short rather than',
              'filling it with generic copy.',
              '',
              crawled,
            ].join('\n')
          : undefined,
      };
      const gen = await generateLandingContent(context);
      const payload = mapGeneratedToLandingPage(gen.content, context, { userId: null });
      payload.slug = slug; // pin to the pillar slug (confirmed available above)
      payload.page_type = 'landing';

      const page = await neonDb.createLandingPage(payload);
      const previewToken = crypto.randomBytes(24).toString('hex');
      await neonDb.updateLandingPage(page.id, {
        preview_token: previewToken,
        preview_token_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        // Onboarding publishes; the admin "Build pillar pages" button does not.
        //
        // Pages are drafts by default so a studio reviews additions before they go live.
        // During ONBOARDING that default produced the opposite of what the wizard
        // promises: the nav listed the studio's five services, every one of them resolved
        // to a page with no copy, because getLandingPageBySlug only ever returns
        // published rows. Onboarding already publishes the five main pages it generates;
        // pillars are the same kind of output and belong in the same state.
        ...(opts.publish ? { status: 'published', published_at: new Date().toISOString() } : {}),
      });
      results.push({
        pillar: pillar.label, slug: page.slug, status: 'created', id: page.id,
        previewUrl: `/lp/${page.slug}?preview=${previewToken}`,
        editUrl: `/admin/landing-pages/${page.id}`,
      });
      created++;
    } catch (e: any) {
      // Abort the whole run, not this pillar. If the platform cannot generate, pillars 2..N
      // will fail identically, and each attempt is a real cost: the gateway counts FAILED
      // attempts against the studio's cap, so grinding through six doomed pillars burns six
      // attempts to produce nothing and returns ok:true with a list of six errors.
      if (e instanceof NoOpenAIError || e?.name === 'PlatformAIRefusal') throw e;
      results.push({ pillar: pillar.label, slug, status: 'error', error: String(e?.message || e).slice(0, 200) });
    }
  }

  return { results, created, published, skipped, remaining: Math.max(0, map.pillars.length - results.length) };
}
