// Onboarding homepage pipeline: crawl the studio's existing website -> aggregate its
// content -> AI-generate a landing page -> persist a DRAFT with a preview token.
//
// Runs OFF the request path (fire-and-forget from POST /api/setup/homepage/generate)
// because a crawl + AI call takes 10-40s. Progress is written to the dedicated
// studio_configs.homepage_gen_state jsonb column (NOT onboarding_state, whose
// normalizeState() would strip it). The Scan step polls GET /api/setup/homepage/status.

import crypto from 'crypto';
import { pool } from '../db';
import { crawlSite } from './site-crawler';
import { generateLandingContent, NoOpenAIError, type LandingContext } from './landing-generator';
import { mapGeneratedToLandingPage } from './landing-mapping';
import { seedManualPagesFromGenerated } from './generated-to-manual-pages';
import { ensureOnboardingSchema } from '../routes/onboarding';

const neonDb = require('../../database.js');

export type HomepageGenStatus = 'idle' | 'running' | 'ready' | 'error' | 'skipped';
export type HomepageGenStage = 'crawling' | 'distilling' | 'writing' | 'ready' | 'error' | 'skipped';

export interface HomepageGenState {
  status: HomepageGenStatus;
  stage: HomepageGenStage | null;
  pagesCrawled: number;
  draftId: string | null;
  slug: string | null;
  previewToken: string | null;
  error: string | null;
  startedAt: string | null;
  website: string | null;
}

async function writeGenState(state: HomepageGenState): Promise<void> {
  await pool.query(
    `UPDATE studio_configs SET homepage_gen_state = $1::jsonb, updated_at = now()
     WHERE id = (SELECT id FROM studio_configs LIMIT 1)`,
    [JSON.stringify(state)],
  );
}

/** Best-effort city from a free-text address ("1050 Wien, Austria" -> "Wien"). */
function deriveCity(address: string): string | undefined {
  if (!address) return undefined;
  const seg = address.split(/[,\n]/).map((s) => s.trim()).filter(Boolean);
  const last = seg[seg.length - 1] || '';
  const city = last.replace(/^\d{3,6}\s*/, '').replace(/\d+/g, '').trim();
  return city || undefined;
}

/** Build the generator context from the studio config + crawled page text. */
function buildContext(config: any, rows: Array<{ url: string; title: string | null; text_content: string | null; meta: any }>): LandingContext {
  const businessName = config?.businessName || config?.studioName || '';
  const tagline = config?.metaDescription || '';
  const address = config?.address || '';
  const city = deriveCity(address);

  const keywordsSet = new Set<string>();
  rows.forEach((r) => {
    const kw = r?.meta?.keywords;
    if (kw) String(kw).split(',').forEach((k) => { const t = k.trim(); if (t) keywordsSet.add(t); });
  });

  const aggregated = rows
    .map((r) => `## ${r.title || r.url}\n${(r.text_content || '').slice(0, 2000)}`)
    .join('\n\n')
    .slice(0, 12000);

  const extras = [
    businessName ? `Business name: ${businessName}` : '',
    tagline ? `Tagline: ${tagline}` : '',
    address ? `Address: ${address}` : '',
    '',
    `Write the new homepage in the SAME LANGUAGE as the source content below. Reflect the`,
    `studio's real services, style and location. Keep the business name accurate. This is`,
    `content extracted from their existing website — use it as the factual basis:`,
    '',
    aggregated,
  ].filter((l) => l !== undefined).join('\n');

  return {
    // The studio's configured language, so the generated copy is written for its
    // market rather than matching whatever language the crawled pages happened to
    // be in. A Brighton studio was getting German copy without this.
    language: config?.language || config?.siteLanguage || process.env.SITE_LANG || 'en',
    primaryService: tagline || 'Photography',
    city: city || undefined,
    tone: 'warm',
    pageType: 'homepage',
    ctaText: 'Book Now',
    keywords: Array.from(keywordsSet).slice(0, 12).join(', ') || undefined,
    extras,
  };
}

/**
 * Normalize a user-entered website into a crawlable absolute URL. Studios often type
 * "susangracehinman.com" with no scheme — `new URL()` then throws and the whole crawl
 * silently errors. Prepend https:// when there's no scheme; return '' if unusable.
 */
export function normalizeWebsiteUrl(raw: string): string {
  const s = String(raw || '').trim();
  if (!s) return '';
  const withScheme = /^https?:\/\//i.test(s) ? s : `https://${s.replace(/^\/+/, '')}`;
  try {
    const u = new URL(withScheme);
    if (!u.hostname.includes('.')) return ''; // not a real domain
    return u.toString();
  } catch {
    return '';
  }
}

async function uniqueSlug(base: string): Promise<string> {
  let slug = base || 'home';
  let n = 1;
  // eslint-disable-next-line no-await-in-loop
  while (!(await neonDb.checkSlugAvailable(slug))) {
    n += 1;
    slug = `${base}-${n}`;
    if (n > 50) { slug = `${base}-${crypto.randomBytes(3).toString('hex')}`; break; }
  }
  return slug;
}

/**
 * Run the full pipeline for the given studio_configs row. Fire-and-forget: never
 * throws to the caller — all failures are captured into homepage_gen_state.
 */
export async function runHomepagePipeline(config: any, opts: { force?: boolean } = {}): Promise<void> {
  const website = normalizeWebsiteUrl(config?.website || config?.frontendUrl || '');
  const state: HomepageGenState = {
    status: 'running', stage: 'crawling', pagesCrawled: 0,
    draftId: null, slug: null, previewToken: null, error: null,
    startedAt: new Date().toISOString(), website: website || null,
  };

  try {
    if (!website) {
      state.status = 'skipped'; state.stage = 'skipped'; state.error = 'No website URL';
      await writeGenState(state);
      return;
    }

    await writeGenState(state);
    await ensureOnboardingSchema();

    // Create a crawl session + job, then crawl in-process.
    const sess = await pool.query(
      `INSERT INTO onboarding_sessions(customer_email, start_url, status, crawl_status)
       VALUES ($1, $2, 'started', 'pending') RETURNING id`,
      [config?.ownerEmail || null, website],
    );
    const sessionId = sess.rows[0].id;
    const job = await pool.query(
      `INSERT INTO crawl_jobs(onboarding_session_id, seed_url, status) VALUES ($1, $2, 'pending') RETURNING id`,
      [sessionId, website],
    );
    const jobId = job.rows[0].id;

    const { crawled } = await crawlSite({ jobId, startUrl: website, maxPages: 10 });
    await pool.query(`UPDATE onboarding_sessions SET crawl_status = 'completed', updated_at = now() WHERE id = $1`, [sessionId]);
    state.pagesCrawled = crawled;
    state.stage = 'distilling';
    await writeGenState(state);

    // Aggregate crawled text -> generator context.
    const pages = await pool.query(
      `SELECT url, title, text_content, meta FROM website_pages WHERE crawl_job_id = $1 AND status = 'ok' ORDER BY created_at`,
      [jobId],
    );
    const context = buildContext(config, pages.rows);

    // Generate.
    state.stage = 'writing';
    await writeGenState(state);
    let content: any;
    try {
      const gen = await generateLandingContent(context);
      content = gen.content;
    } catch (e) {
      if (e instanceof NoOpenAIError) {
        state.status = 'skipped'; state.stage = 'skipped'; state.error = 'AI is not configured on this instance';
        await writeGenState(state);
        return;
      }
      throw e;
    }

    // Build the studio's Authority Map from the SAME crawl. This only ever ran from
    // POST /onboarding/run-crawl, a different route — so a studio that came through
    // the wizard (which uses this pipeline) had its site crawled but no map generated.
    // studio_configs.authority_map stayed NULL, and every consumer fell back to the
    // seed: the nav, the pillar blocks and RelatedServices all advertised the seed
    // studio's Vienna services. Fire-and-forget; a failure must not fail the pipeline.
    //
    // …and then BUILD THE PAGES those pillars point at. The map alone puts the studio's
    // services in the nav; it creates nothing behind them. Scaffolding only ever ran from
    // the admin's "Build pillar pages" button, so a studio finished the wizard with a nav
    // full of its own services where every link led to a page with no copy — the pillars
    // landed, the content did not. Published, not drafted, for the reason given in
    // authority-scaffold: onboarding publishes what it generates.
    //
    // Chained, because the scaffold reads the map the previous step writes. Both are
    // fire-and-forget: a failure here must not fail the pipeline, and the studio can
    // still click "Build pillar pages" afterwards.
    import('./authority-from-crawl.js')
      .then((m) => m.generateAuthorityMapFromCrawl(jobId))
      .then(async () => {
        const { scaffoldPillarPages } = await import('./authority-scaffold.js');
        // The SAME city and language the homepage was written from, so the pillar pages
        // cannot describe a different place or arrive in a different language than the
        // page linking to them.
        const r = await scaffoldPillarPages({
          city: context.city,
          language: context.language,
          publish: true,
        });
        console.log(`[homepage-pipeline] pillar pages: ${r.created} created, ${r.skipped} already existed, ${r.remaining} left for a later build`);
      })
      .catch((err) => console.warn('[homepage-pipeline] authority map / pillar pages failed:', err?.message || err));

    // Land the generated copy in the pages the studio actually edits. Until now the
    // output existed only as a landing page, so Website Studio still showed neutral
    // defaults after onboarding and the optimised text was effectively invisible.
    // Best-effort: a failure here must not fail the pipeline.
    try {
      const seeded = await seedManualPagesFromGenerated(content, (config?.language || 'en'), { overwrite: !!opts.force });
      if (seeded) {
        console.log(`[homepage-pipeline] seeded ${seeded.written} homepage field(s) into Website Studio (${seeded.skipped} already set)`);
      }
    } catch (seedErr: any) {
      console.warn('[homepage-pipeline] could not seed Website Studio fields:', seedErr?.message || seedErr);
    }

    // Persist a DRAFT with a preview token (30 days — onboarding->login gap).
    const payload = mapGeneratedToLandingPage(content, context, { userId: null });
    payload.slug = await uniqueSlug(payload.slug);
    const page = await neonDb.createLandingPage(payload);

    const previewToken = crypto.randomBytes(24).toString('hex');
    await neonDb.updateLandingPage(page.id, {
      preview_token: previewToken,
      preview_token_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    });

    state.status = 'ready'; state.stage = 'ready';
    state.draftId = page.id; state.slug = page.slug; state.previewToken = previewToken;
    await writeGenState(state);

    await pool.query(
      `UPDATE studio_configs SET homepage_draft_landing_id = $1, updated_at = now() WHERE id = (SELECT id FROM studio_configs LIMIT 1)`,
      [page.id],
    );
  } catch (e: any) {
    console.error('[homepage-pipeline] failed:', e?.message || e);
    state.status = 'error'; state.stage = 'error';
    state.error = String(e?.message || e).slice(0, 200);
    try { await writeGenState(state); } catch { /* best effort */ }
  }
}
