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

// 'skipped' is "the platform cannot generate" — ours to fix, nothing the studio can do.
// 'quota_exceeded' is "the studio has had what was included" — a different sentence entirely,
// and the one state here that is neither a fault nor a failure.
export type HomepageGenStatus = 'idle' | 'running' | 'ready' | 'error' | 'skipped' | 'quota_exceeded';
export type HomepageGenStage = 'crawling' | 'distilling' | 'writing' | 'ready' | 'error' | 'skipped' | 'quota_exceeded';

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
  /**
   * WHICH PATH PAID, and what the studio has left.
   *
   * complete() returns this and every caller discarded it, so a run that fell back to a direct
   * OpenAI call looked identical to one that went through the AxixOS gateway — the integration
   * could be silently inert and every screen would still say "ready". Discovered on the day the
   * gateway went live, trying to prove a successful generation had actually used it.
   */
  via: 'gateway' | 'openai' | null;
  quota: { budget: number; used: number; remaining: number } | null;

  /**
   * How many times this instance has started a generation, ever.
   *
   * Carried across runs deliberately. It is what bounds POST /api/setup/homepage/generate,
   * which is open to anonymous callers for as long as onboarding is unfinished — and one run
   * spends a homepage, a profile distil, an authority map and a pillar page per pillar, all
   * platform-funded. Without a number that survives the next run there is nothing to count.
   */
  runs: number;

  /**
   * WHAT BECAME OF THE SERVICE PAGES, which is the half of this run nobody could see.
   *
   * buildServicesAndPages() is fired without await — deliberately, so the homepage does not
   * wait on it — and its only failure handling was `.catch(err => console.warn(...))`. So the
   * status went to 'ready' whatever happened to it, and every reason it might have failed
   * ended up in a log line on the host that nobody reading this product can reach.
   *
   * Observed on newagefotografie.com, a site with eleven services in its navigation: status
   * 'ready', authority_map null, one landing page, and a wizard panel waiting for service
   * pages that were never coming. Nothing anywhere recorded why, so the first question —
   * did the authority map refuse, throw, or never run — could not be answered at all.
   *
   * 'ready' here means the pages were built. It is deliberately separate from the top-level
   * status, because the homepage genuinely can succeed while this fails.
   */
  services: {
    status: 'running' | 'ready' | 'failed';
    /** Said plainly enough to show a studio, when there is something to say. */
    reason: string | null;
    pillarsCreated: number;
  } | null;
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
  // Everything else is reset per run; `runs` is not. It is the only field that has to survive,
  // because it is what the open generate endpoint counts against.
  const priorRuns = Number((config?.homepageGenState as any)?.runs || 0);
  const state: HomepageGenState = {
    status: 'running', stage: 'crawling', pagesCrawled: 0, findings: [],
    draftId: null, slug: null, previewToken: null, error: null,
    startedAt: new Date().toISOString(), website: website || null,
    via: null, quota: null,
    runs: priorRuns + 1,
    // Reset per run like everything except `runs`: last run's outcome says nothing about this
    // one, and a stale 'ready' here would tell the wizard to stop waiting for pages that this
    // run has not built yet.
    services: null,
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

    const { crawled } = await crawlSite({
      jobId,
      startUrl: website,
      maxPages: 10,
      // The crawl can spend half a minute getting past a host that blocks datacentre
      // addresses. That is worth saying out loud rather than leaving on "Working...".
      onProgress: (kind, text) => note(state, kind, text),
    });
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
            -- Only pages we never recovered. A page the partner crawler rescued carries the
            -- refusing http_status but status = ok, and reporting it as blocked would tell a
            -- studio their host turned us away on a page we actually read.
            AND status <> 'ok'
            -- 202 belongs here even though it is a success code. A bot manager returns it
            -- with a near-empty body while it decides about the caller, and counting it as a
            -- page we read is what told a studio their own site had no text in it.
            AND (http_status IN (202, 401, 403, 406, 429, 503)
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

    /**
     * Everything downstream of the crawl that is NOT the homepage: the authority map, the
     * service pages behind it, their photographs, and the starter voucher products.
     *
     * A FUNCTION, because two paths need it. It used to sit inline below the homepage
     * generation, and the quota branch returns before reaching it — so a studio who had used
     * their ten included homepage generations got no service map, no service pages, no
     * images and no products either.
     *
     * That is throwing away work that is separately funded. ai.landing, ai.authority_from_crawl
     * and ai.pillar carry their OWN budgets on the gateway — ai.pillar is sixty — so a spent
     * homepage allowance says nothing about whether the rest can be built. Observed live: a
     * studio whose crawl read ten pages and named six services finished onboarding with zero
     * pillars persisted, because the homepage refusal returned three lines before this ran.
     *
     * If these are also out of allowance they refuse on their own and say so. Being refused
     * twice is a fair outcome; not being attempted is not.
     */
    const buildServicesAndPages = () => {
      // Recorded from the moment it starts, so "still going" and "finished badly" are
      // distinguishable by anything reading the state — which, before this, they were not.
      state.services = { status: 'running', reason: null, pillarsCreated: 0 };
      void writeGenState(state);
      import('./authority-from-crawl.js')
        .then((m) => m.generateAuthorityMapFromCrawl(jobId))
        .then(async () => {
          const { scaffoldPillarPages } = await import('./authority-scaffold.js');
          // The SAME city and language the homepage was written from, so the pillar pages
          // cannot describe a different place or arrive in a different language than the
          // page linking to them.
          const r = await scaffoldPillarPages('platform', {
            city: context.city,
            language: context.language,
            publish: true,
          });
          console.log(`[homepage-pipeline] pillar pages: ${r.created} created, ${r.skipped} already existed, ${r.remaining} left for a later build`);

          // Now, and not before: storeSiteImage mirrors a service photograph onto the pillar
          // page's own hero_image_url, and a landing_pages row that does not exist yet matches
          // nothing. Running this earlier would have filled the wizard's slots while leaving
          // every service page exactly as blank as it was.
          //
          // Without it a studio reached the end of onboarding with a homepage full of their own
          // work and service pages that were flat colour under a heading — the photographs were
          // in the database the whole time and only the choice was missing.
          try {
            const { assignCrawledSiteImages } = await import('./assignCrawledImages');
            const imgs = await assignCrawledSiteImages('pillars');
            // And then everything still unused, spread across every page. Runs last on purpose:
            // the hero and content slots get first refusal on the photographs whose names match
            // a service, and the gallery takes what is left rather than competing for them.
            const extra = await assignCrawledSiteImages('galleries');
            if (extra.filled > 0) {
              console.log(`[homepage-pipeline] galleries: ${extra.filled} further photograph(s) placed`);
            }
            if (imgs.filled > 0) {
              console.log(`[homepage-pipeline] service pages: ${imgs.filled} photograph(s) assigned from the crawl`);
              await note(
                state,
                'found',
                `Added a photograph to ${imgs.filled} of your service page${imgs.filled === 1 ? '' : 's'}`,
              );
            }
          } catch (e: any) {
            console.warn('[homepage-pipeline] service page images skipped:', e?.message || e);
          }
          if (r.aborted) {
            // Says it in the log AND on the studio's own progress list, because the alternative
            // is a menu that is quietly two services shorter than the site it was built from,
            // with nothing anywhere explaining why. The nav filters unbuilt pillars out (see the
            // hasPage flag on /api/authority-map), so the failure is invisible without this.
            console.warn(`[homepage-pipeline] pillar build stopped after "${r.aborted.afterPillar}": ${r.aborted.code}`);
            await note(
              state,
              'problem',
              `${r.created + r.published} service page(s) built — the rest can be finished from Website Studio`,
            );
          }

          // A voucher shop stocked with the studio's OWN services, from the same map.
          // Created inactive and unpriced — see starter-products for why nothing here
          // invents a price.
          const { seedStarterProductsFromServices } = await import('./starter-products.js');
          const sp = await seedStarterProductsFromServices();
          console.log(`[homepage-pipeline] starter voucher products: ${sp.created} created (inactive, awaiting prices), ${sp.skipped} already existed`);
        })
        .then(async () => {
          if (state.services?.status === 'running') {
            state.services = { ...state.services, status: 'ready' };
            await writeGenState(state);
          }
        })
        .catch(async (err) => {
          // THE WHOLE POINT OF THIS BRANCH. It used to console.warn and stop, so a studio sat
          // in front of a spinner while the only record of what went wrong went to a log on
          // the host. Written down now, and shown.
          const reason = String(err?.message || err || 'unknown error').slice(0, 300);
          console.warn('[homepage-pipeline] authority map / pillar pages failed:', reason);
          state.services = {
            status: 'failed',
            reason,
            pillarsCreated: state.services?.pillarsCreated || 0,
          };
          try {
            await writeGenState(state);
          } catch {
            /* the run is already over; a failed write here must not throw into an unhandled
               rejection and take the process with it */
          }
        });
    };


    // Generate.
    state.stage = 'writing';
    await note(state, 'writing', 'Writing your homepage in your own words');
    let content: any;
    try {
      const gen = await generateLandingContent(context, 'platform', 'ai.landing');
      content = gen.content;
      state.via = gen.via;
      state.quota = gen.quota;
    } catch (e: any) {
      // The fourth state, and the only one that needed new words. A spent allowance is not a
      // fault: the platform works, the studio has used what was included. Calling it "not
      // configured" would be false, and calling it a failure would be worse — they got the
      // sites they were given.
      if (e?.name === 'PlatformAIRefusal' && e?.code === 'quota_exceeded') {
        state.status = 'quota_exceeded'; state.stage = 'quota_exceeded';
        state.error = e?.message || 'This studio has used its included site generations';
        await writeGenState(state);
        // The HOMEPAGE allowance is spent. That says nothing about the rest.
        //
        // ai.landing, ai.authority_from_crawl and ai.pillar carry separate budgets on the
        // gateway — ai.pillar is sixty — so returning here threw away a service map, service
        // pages, their photographs and the starter products, none of which had been refused
        // anything. Observed live: a crawl that read ten pages and named six services finished
        // with zero pillars persisted, because this return ran first.
        //
        // If these are also out of allowance they refuse individually and say so. Being
        // refused twice is a fair outcome; not being asked is not.
        buildServicesAndPages();
        return;
      }
      // "Not right now" is not "not switched on".
      //
      // upstream_timeout, metering_unavailable and some upstream_errors are transient, and the
      // gateway says so in a `retryable` flag we were parsing and then throwing away. Every one
      // of them landed on the 'skipped' panel — which says the platform is not configured and
      // deliberately offers no Try again, because for a missing credential a retry is theatre.
      // For a timeout it is the entire fix, and we were telling the studio something false and
      // stranding a run that would have succeeded on the next click.
      //
      // 'error' is the right home: that panel already exists, already says "this won't hold up
      // your setup", and already has the button.
      if (e?.name === 'PlatformAIRefusal' && e?.retryable === true) {
        state.status = 'error'; state.stage = 'error';
        state.error = e?.message || 'Generation could not finish just now — please try again.';
        await writeGenState(state);
        return;
      }
      // Every remaining platform refusal is OURS and is NOT transient — an unfunded key, a
      // revoked key. The studio can act on none of them, so they land on the same "not
      // available yet" panel rather than being spelled out as separate faults.
      if (e instanceof NoOpenAIError || e?.name === 'NoOpenAIError' || e?.name === 'PlatformAIRefusal') {
        state.status = 'skipped'; state.stage = 'skipped';
        state.error = e?.message || 'AI is not configured on this instance';
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
    // The map, the service pages, their photographs and the starter products. Runs here on
    // the normal path, and ALSO from the quota branch above — see the note there.
    buildServicesAndPages();

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

    // A hero the studio uploaded BEFORE this finished. The photographs step now runs while
    // this pipeline does, so by the time a draft is written there may already be a picture
    // waiting for it — and a generated homepage that ignores an image the studio has
    // already given us is the same empty preview by a different route.
    try {
      const hero = await pool.query(
        `SELECT url FROM homepage_images WHERE section = 'hero' AND is_active = true ORDER BY sort_order LIMIT 1`,
      );
      const heroUrl = hero.rows[0]?.url;
      if (heroUrl) {
        (payload as any).hero_image_url = heroUrl;
        await note(state, 'found', 'Using the photograph you uploaded');
      }
    } catch { /* the draft is worth more than the picture */ }
    payload.slug = await uniqueSlug(payload.slug);
    const page = await neonDb.createLandingPage(payload);

    const previewToken = crypto.randomBytes(24).toString('hex');
    await neonDb.updateLandingPage(page.id, {
      preview_token: previewToken,
      preview_token_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    });

    // ── Their own photographs, put where they belong ─────────────────────────
    //
    // The crawl has just read their website and recorded every photograph on it. Leaving
    // those in a table nobody reads and then showing the studio an empty page is the worst
    // of both: we have their work and we are not using it.
    //
    // Only fills EMPTY slots, so a photograph the studio uploaded themselves at the
    // photographs step always wins — this is a floor, not an override. And it is their own
    // work, so it does not touch the rule against shipping placeholder photography: no stock
    // is involved and never will be.
    // This used to INSERT the crawled URL straight into homepage_images. Three consequences,
    // all of them live on the demo until now: the homepage HOTLINKED images.squarespace-cdn.com
    // on an instance whose whole purpose is to replace that Squarespace site; the pictures had
    // no alt text beyond a filename; and the files carried no byline or copyright. The wizard's
    // own picker did all three correctly, so the studio got worse images by NOT choosing.
    //
    // assignCrawledSiteImages goes through storeSiteImage, the same door the picker uses:
    // downloaded into the studio's own bucket, described by the vision model, stamped with
    // their identity, and the hero mirrored onto the draft the renderer actually reads.
    try {
      const { assignCrawledSiteImages } = await import('./assignCrawledImages');
      // page.id, NOT the draft id in homepage_gen_state — that is written ~70 lines below
      // this, so at this moment the lookup inside storeSiteImage returns null and the hero
      // never reaches the page. Same trap the old code avoided by passing page.id directly,
      // walked straight back into when this moved behind a shared helper.
      const r = await assignCrawledSiteImages('site', { heroPageId: page.id });
      if (r.filled > 0) {
        await note(
          state,
          'found',
          `Used ${r.filled} of your own photograph${r.filled === 1 ? '' : 's'} from your website`,
        );
      }
    } catch (e: any) {
      console.warn('[homepage-pipeline] could not reuse crawled photographs:', e?.message || e);
    }

    // ── Make it the homepage, if there is not one already ────────────────────
    //
    // The pipeline wrote a draft and stopped, and the studio was told they would "review,
    // edit and publish it from your dashboard after setup". Nobody did, so
    // studio_configs.homepage_landing_slug stayed NULL and "/" fell through to the built-in
    // HomePage — which is not a landing page, does not go through the theme/layout
    // providers, and therefore shows none of the arrangement the studio picked in step one.
    // A studio who chose Editorial saw a page that could not be Editorial and reasonably
    // concluded the feature did not work.
    //
    // ONLY when there is no homepage yet. This cannot overwrite a studio's existing "/" —
    // it fills an empty slot on a brand-new instance, where a generated page written from
    // their own website beats the placeholder it is replacing by every measure.
    // …AND when the studio asked for this one specifically, during setup.
    //
    // `if (!existing)` alone made Regenerate a button that could not work. The first run
    // publishes a page and claims "/", so every later run wrote a page nobody would ever see:
    // the wizard showed the new draft in its preview frame, implying the site had changed,
    // while "/" went on serving the first attempt. A studio unhappy with their homepage could
    // press Regenerate as often as they liked and never alter their site — and each press
    // accumulated another published page nothing linked to.
    //
    // Bounded to a FORCED run before setup completes. `force` means the studio pressed the
    // button rather than the wizard firing automatically, and creative_setup_complete being
    // false means this is still a page they are choosing rather than a live homepage they have
    // been running. After setup, an automatic overwrite of "/" is the studio's call to make in
    // Website Studio, not this pipeline's while their site is public.
    let published = false;
    try {
      const { rows } = await pool.query(
        `SELECT homepage_landing_slug AS slug, creative_setup_complete AS done FROM studio_configs LIMIT 1`,
      );
      const existing = String(rows[0]?.slug || '').trim();
      const stillInSetup = rows[0]?.done !== true;
      if (!existing || (opts.force && stillInSetup)) {
        await neonDb.updateLandingPage(page.id, { status: 'published' });
        await pool.query(
          `UPDATE studio_configs SET homepage_landing_slug = $1, updated_at = now() WHERE id = (SELECT id FROM studio_configs LIMIT 1)`,
          [page.slug],
        );
        published = true;
      }
    } catch (e: any) {
      // The draft still exists and is still previewable; publishing is the bonus, not the
      // point. Never lose the page over this.
      console.warn('[homepage-pipeline] could not publish as homepage:', e?.message || e);
    }

    await note(
      state,
      'done',
      published
        ? 'Your new homepage is live — you can edit it any time'
        : 'Your homepage is ready to look at',
    );
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
