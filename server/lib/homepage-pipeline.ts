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

/**
 * Something true that just happened, for the person watching the screen.
 *
 * The setup wizard showed a spinner and a stage word while this pipeline crawled a whole
 * website, pulled the studio's services out of it and wrote them a homepage — a minute or
 * more of real work, presented as though nothing was going on. A studio watching a spinner
 * assumes it has hung; a studio reading "Read 12 pages — found weddings, newborn,
 * headshots" knows exactly what it bought.
 *
 * Every entry is a fact this pipeline actually established. Nothing here is padding or a
 * fake tick — if the crawl found four galleries it says four, and if it found none it does
 * not mention galleries.
 */
export interface GenFinding {
  at: string;
  text: string;
  kind: 'reading' | 'found' | 'writing' | 'done' | 'problem';
}

export interface HomepageGenState {
  status: HomepageGenStatus;
  stage: HomepageGenStage | null;
  pagesCrawled: number;
  /** Append-only. The client renders these in order as they arrive. */
  findings: GenFinding[];
  draftId: string | null;
  slug: string | null;
  previewToken: string | null;
  error: string | null;
  startedAt: string | null;
  website: string | null;
}

/** Append a finding and flush, so the client sees it on its next poll. */
async function note(state: HomepageGenState, kind: GenFinding['kind'], text: string): Promise<void> {
  state.findings = [...(state.findings || []), { at: new Date().toISOString(), kind, text }].slice(-40);
  await writeGenState(state);
}

async function writeGenState(state: HomepageGenState): Promise<void> {
  await pool.query(
    `UPDATE studio_configs SET homepage_gen_state = $1::jsonb, updated_at = now()
     WHERE id = (SELECT id FROM studio_configs LIMIT 1)`,
    [JSON.stringify(state)],
  );
}

const GENERIC_PAGE = /^(home|homepage|about|about us|contact|contact us|blog|news|privacy|privacy policy|terms|cookies|imprint|impressum|faq|search|shop|cart|checkout|login|account|sitemap)$/i;

/**
 * Subjects this studio has pages about, in their own words.
 *
 * Titles are cleaned of the site-name suffix every CMS appends ("Weddings | Jane Doe",
 * "Headshots - Studio"), and the boilerplate pages every site has are dropped, because
 * \"found: Home, About, Contact\" tells a photographer nothing they did not know.
 */
function subjectsFromPages(rows: Array<{ url: string; title: string | null }>): string[] {
  const titleCase = (v: string) => v
    .split(' ')
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');

  const out = new Set<string>();
  for (const r of rows) {
    // The homepage title is the SITE NAME, not something they shoot. Left in, the line read
    // "You shoot Edinburgh Photographer, Weddings, Headshots" — the first item being the
    // studio itself.
    try { const p = new URL(r.url).pathname; if (p === '/' || p === '') continue; } catch {}

    let t = String(r.title || '').trim();

    // Drop the site-name suffix every CMS appends: "Weddings | Jane Doe" -> "Weddings".
    for (const sep of [' | ', ' - ', ' – ', ' — ']) {
      const at = t.indexOf(sep);
      if (at > 0) t = t.slice(0, at).trim();
    }

    if (!t) {
      // No title: the slug is still the studio's own word for the page.
      try {
        const last = new URL(r.url).pathname.split('/').filter(Boolean).pop() || '';
        t = decodeURIComponent(last).split('-').join(' ').split('_').join(' ').trim();
      } catch { /* not a URL we can parse; skip this row */ }
    }

    if (!t || t.length > 40 || GENERIC_PAGE.test(t)) continue;
    out.add(titleCase(t));
    if (out.size >= 6) break;
  }
  return [...out];
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
  // The wizard asks for the city directly, so use the answer. deriveCity takes the LAST
  // comma-separated segment of the address, which on any normally-written address is the
  // COUNTRY: a Brighton studio's pillar pages and landing_pages.city were all built around
  // "United Kingdom". It stays as the fallback for a studio that gave an address but no city.
  const city = (config?.city || '').trim() || deriveCity(address);

  const keywordsSet = new Set<string>();
  rows.forEach((r) => {
    const kw = r?.meta?.keywords;
    if (kw) String(kw).split(',').forEach((k) => { const t = k.trim(); if (t) keywordsSet.add(t); });
  });

  // 2,000 characters per page was set when text_content was tag-stripped HTML, i.e. mostly
  // nav and tracking debris — a small window was a reasonable defence against feeding the
  // model rubbish. The crawler now leads each page with a STRUCTURED FACTS block and strips
  // chrome, comments and stray CSS, so the window is real content and being stingy with it
  // is just discarding the studio's own words. Measured on a live site, the first sentence
  // the business wrote used to begin at character 2,648 — past the old cut.
  const PER_PAGE = Number(process.env.CRAWL_CONTEXT_PER_PAGE || 6000);
  const TOTAL = Number(process.env.CRAWL_CONTEXT_TOTAL || 40000);
  const aggregated = rows
    .map((r) => `## ${r.title || r.url}\n${(r.text_content || '').slice(0, PER_PAGE)}`)
    .join('\n\n')
    .slice(0, TOTAL);

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
    // config.language does NOT exist on studio_configs — the column is site_language. The
    // dead first term was harmless here (undefined falls through) but the same expression
    // downstream decided which language row the generated copy was written to, so every
    // studio's content was filed under 'en' while its site read another row. Named
    // explicitly now so the two cannot drift apart again.
    language: config?.siteLanguage || process.env.SITE_LANG || 'en',
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
    status: 'running', stage: 'crawling', pagesCrawled: 0, findings: [],
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
    // The hostname, not the raw URL — nobody needs to read https:// on a progress line.
    const host = (() => { try { return new URL(website).host; } catch { return website; } })();
    await note(state, 'reading', `Opening ${host}`);

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
    await note(state, 'found', `Read ${crawled} page${crawled === 1 ? '' : 's'} from your site`);

    // Aggregate crawled text -> generator context.
    const pages = await pool.query(
      `SELECT url, title, text_content, meta FROM website_pages WHERE crawl_job_id = $1 AND status = 'ok' ORDER BY created_at`,
      [jobId],
    );

    // STOP if the crawl produced nothing to write from.
    //
    // Nothing used to check this, and the consequence is not a thin page — it is a
    // confident, fully-formed website about a business that does not exist. Observed
    // 15 Aug against mariotestino.com: the fetch failed, one row was stored with
    // status='error' and zero characters, crawl_jobs recorded 'completed' with no error,
    // and generation ran on a context containing only a name and a city. The model did
    // what a model does with no facts — it invented some. The resulting Authority Map was
    //
    //     /plumbing-services/  /electrical-services/  /hvac-services/  /landscaping-services/
    //
    // for a fashion photographer, and the pipeline reported status 'ready'. Homepage copy
    // was generated too, plausible enough to pass a glance and entirely fabricated: it
    // offered "family portraits to corporate events" for a man who shoots Vogue covers.
    //
    // A studio is far better served by "we could not read your site" than by a polished
    // site about somebody else's trade. Fail loudly, name the reason, publish nothing.
    const usableChars = pages.rows.reduce((n, r: any) => n + (r.text_content || '').trim().length, 0);
    const MIN_CHARS = Number(process.env.CRAWL_MIN_USABLE_CHARS || 400);
    if (pages.rows.length === 0 || usableChars < MIN_CHARS) {
      const { rows: attempted } = await pool.query(
        `SELECT count(*)::int AS n, count(*) FILTER (WHERE status <> 'ok')::int AS failed
         FROM website_pages WHERE crawl_job_id = $1`,
        [jobId],
      );
      const n = attempted[0]?.n ?? 0;
      const failed = attempted[0]?.failed ?? 0;
      // What the pages that DID come back actually were. A host that refuses crawlers
      // returns a real HTTP response containing a refusal, so "we read a page" and "we read
      // their page" are not the same thing, and the studio deserves to be told which.
      const { rows: refusals } = await pool.query(
        `SELECT count(*)::int AS blocked FROM website_pages
          WHERE crawl_job_id = $1
            AND (http_status IN (401, 403, 406, 429, 503)
                 OR lower(coalesce(title, '')) ~ '(403|forbidden|access denied|attention required|just a moment)')`,
        [jobId],
      ).catch(() => ({ rows: [{ blocked: 0 }] }));
      const blocked = refusals[0]?.blocked ?? 0;
      state.status = 'error';
      state.stage = 'error';
      state.findings = [...(state.findings || []),
        { at: new Date().toISOString(), kind: 'problem' as const, text: 'Could not read your site' }];
      state.error = n === 0
        ? `Could not read ${website} — no pages were retrieved. Check the URL is correct and publicly reachable.`
        : failed === n
          ? `Could not read ${website} — all ${n} page(s) failed to fetch. The site may be blocking automated requests.`
          : blocked > 0
            // Named separately because the advice is completely different, and the wrong
            // advice cost a real onboarding: a studio whose site was blocking us was told it
            // "may render with JavaScript" and went looking for a problem with their site.
            // There was none — 4,503 characters of it were sitting there behind a bot filter.
            ? `${website} is turning our reader away — ${blocked} of ${n} page(s) came back as a refusal rather than the page. This is your host blocking automated readers, not a problem with your site. Try again in a moment, or paste your About text and we will write from that.`
            : `Read ${n} page(s) from ${website} but found only ${usableChars} characters of text. If your pages are built by JavaScript in the browser, there may be nothing for us to read in the page itself.`;
      await writeGenState(state);
      await pool.query(
        `UPDATE crawl_jobs SET status = 'failed', error = $2 WHERE id = $1`,
        [jobId, String(state.error).slice(0, 500)],
      ).catch(() => {});
      console.warn(`[homepage-pipeline] refusing to generate: ${state.error}`);
      return;
    }

    const subjects = subjectsFromPages(pages.rows as any[]);
    if (subjects.length) {
      await note(state, 'found', `You shoot ${subjects.slice(0, 4).join(', ')}${subjects.length > 4 ? ` and ${subjects.length - 4} more` : ''}`);
    }

    const context = buildContext(config, pages.rows);

    // Generate.
    state.stage = 'writing';
    await note(state, 'writing', 'Writing your homepage in your own words');
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

        // A voucher shop stocked with the studio's OWN services, from the same map.
        // Created inactive and unpriced — see starter-products for why nothing here
        // invents a price.
        const { seedStarterProductsFromServices } = await import('./starter-products.js');
        const sp = await seedStarterProductsFromServices();
        console.log(`[homepage-pipeline] starter voucher products: ${sp.created} created (inactive, awaiting prices), ${sp.skipped} already existed`);
      })
      .catch((err) => console.warn('[homepage-pipeline] authority map / pillar pages failed:', err?.message || err));

    // Land the generated copy in the pages the studio actually edits. Until now the
    // output existed only as a landing page, so Website Studio still showed neutral
    // defaults after onboarding and the optimised text was effectively invisible.
    // Best-effort: a failure here must not fail the pipeline.
    try {
      // THE bug that made onboarding look like it did nothing for a non-English studio.
      // config.language is not a column on studio_configs, so this was always 'en': the
      // copy was generated correctly in the studio's language and then written to the
      // language='en' row, while the public site reads the row matching site_language.
      // Correct German copy, generated and then made invisible. Reuse the language the
      // context was actually built with so the two can never disagree.
      const seeded = await seedManualPagesFromGenerated(content, (context.language || 'en'), { overwrite: !!opts.force });
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

    await note(state, 'done', 'Your homepage is ready to look at');
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
