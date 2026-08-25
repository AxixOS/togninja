// Where should every page of the studio's old site point once the domain moves here?
//
// THE PROBLEM THIS SOLVES. Onboarding rebuilds roughly a dozen pages. A working photographer
// often has eighty or more indexed, and pointing their domain at this product orphans the
// rest. Today those URLs do not even 404 — server/vite.ts answers any unmatched path with the
// prerendered homepage at HTTP 200, so eighty dead pages become eighty copies of one page.
// Google reads that as duplication across the whole domain, which is a worse outcome than a
// clean 404: at least a 404 says "this is gone".
//
// A 301 is better than either. It says "this moved HERE", and the authority the old page
// earned transfers to the new one instead of evaporating.
//
// WHAT THIS DELIBERATELY DOES NOT DO: apply anything. It produces a PLAN for a human to look
// at. Rewriting where somebody's eighty indexed pages point is not a thing to do silently on
// their behalf, and the one screen in this product that most needs to demonstrate competence
// is the one where a photographer hands over their domain.
import { pool } from '../db';
import { getAuthorityMap } from './authority-map';
// pillarForTopic is deliberately NOT used here. It falls back to the studio's
// defaultPillar when nothing matches, and a planner cannot tell that apart from a real
// match — which produced a first run where all 75 pages of an 80-page site were proposed
// to point at /maternity-photography/, because that happened to be the default. A
// redirect plan has to know the difference between "this matches" and "nothing matched".
import { readSitemap, pathOf } from './sitemapReader';

export type Confidence = 'strong' | 'likely' | 'fallback';

export interface RedirectProposal {
  fromPath: string;
  toPath: string;
  confidence: Confidence;
  reason: string;
}

export interface MigrationPlan {
  /** Everything their old site claims to have. */
  discovered: number;
  /** Paths that already exist here and need no redirect. */
  kept: string[];
  proposals: RedirectProposal[];
  problem?: string;
}

/** Paths this product serves itself. A redirect over one of these would break the new site. */
async function livePaths(): Promise<Set<string>> {
  const out = new Set<string>(['/', '/blog', '/kontakt', '/contact', '/book', '/vouchers', '/preise', '/pricing']);
  try {
    const r = await pool.query(
      `SELECT slug FROM landing_pages WHERE coalesce(status, '') <> 'deleted'`,
    ).catch(() => ({ rows: [] as any[] }));
    for (const row of r.rows as any[]) {
      const s = String(row.slug || '').trim().replace(/^\/+|\/+$/g, '');
      if (s) out.add('/' + s.toLowerCase());
    }
  } catch { /* an unreadable page list is not a reason to refuse the whole plan */ }
  try {
    const b = await pool.query(`SELECT slug FROM blog_posts WHERE published = true`)
      .catch(() => ({ rows: [] as any[] }));
    for (const row of b.rows as any[]) {
      const s = String(row.slug || '').trim().replace(/^\/+|\/+$/g, '');
      if (s) out.add('/blog/' + s.toLowerCase());
    }
  } catch { /* same */ }
  return out;
}

/**
 * Words from a URL path, for matching against a pillar.
 *
 * The path is usually the best summary of a page that exists: /familienfotos-locations-wien
 * says more about that article than most of its body text would in a keyword match.
 */
function pathWords(p: string): string {
  return p.replace(/[/_-]+/g, ' ').replace(/\.(html?|php|aspx?)$/i, '').trim();
}

export async function buildMigrationPlan(siteUrl: string): Promise<MigrationPlan> {
  const sitemap = await readSitemap(siteUrl);
  if (sitemap.problem) {
    return { discovered: 0, kept: [], proposals: [], problem: sitemap.problem };
  }

  const live = await livePaths();
  const map = await getAuthorityMap();

  // The old pages' own titles, where the crawl already fetched them. Better evidence than a
  // path alone, and free — we have it already.
  const titles = new Map<string, string>();
  try {
    const r = await pool.query(`SELECT url, title FROM website_pages WHERE title IS NOT NULL`);
    for (const row of r.rows as any[]) {
      const p = pathOf(String(row.url));
      if (p) titles.set(p, String(row.title));
    }
  } catch { /* titles are a bonus, not a requirement */ }

  const kept: string[] = [];
  const proposals: RedirectProposal[] = [];
  const seen = new Set<string>();

  for (const url of sitemap.urls) {
    const from = pathOf(url);
    if (!from || seen.has(from)) continue;
    seen.add(from);

    // Already served here. The commonest and best outcome — no redirect, no loss.
    if (live.has(from)) { kept.push(from); continue; }

    const haystack = `${pathWords(from)} ${titles.get(from) || ''}`.trim();

    // A BLOG POST BELONGS WITH THE BLOG. Sending an article about family photo locations
    // to a maternity service page is a worse answer than the blog index — the visitor
    // wanted to read something, not buy something, and Google reads the mismatch too.
    if (/^\/blog(\/|$)|^\/news(\/|$)|^\/journal(\/|$)/.test(from)) {
      proposals.push({
        fromPath: from,
        toPath: '/blog',
        confidence: 'likely',
        reason: 'An article — points at the blog rather than a service page',
      });
      continue;
    }

    // Matched against each pillar EXPLICITLY, so a match is a match and a miss is a miss.
    const pillars = Array.isArray((map as any)?.pillars) ? (map as any).pillars : [];
    const matched = pillars.find((p: any) => {
      const pattern = typeof p?.match === 'string' ? p.match.trim() : '';
      if (!pattern) return false;
      try { return new RegExp(pattern, 'i').test(haystack); } catch { return false; }
    });

    if (matched) {
      proposals.push({
        fromPath: from,
        toPath: matched.href,
        // A title AND a path agreeing is stronger evidence than a path alone.
        confidence: titles.has(from) ? 'strong' : 'likely',
        reason: `Matches "${matched.label}"`,
      });
      continue;
    }

    // NOT dropped. A page with nowhere obvious to go still earned its authority, and sending
    // it to the homepage as a 301 keeps that — where leaving it to the catch-all would serve
    // it as a duplicate of the homepage at 200, which is the thing this exists to prevent.
    proposals.push({
      fromPath: from,
      toPath: '/',
      confidence: 'fallback',
      reason: 'No close match — points at the homepage so the page still resolves',
    });
  }

  return { discovered: sitemap.urls.length, kept, proposals };
}

/**
 * Store a plan for review. Nothing is served until a human approves it.
 *
 * `approved` defaults false in the table, and the middleware only reads approved rows — so
 * saving a plan can never change what a visitor sees.
 */
export async function saveMigrationPlan(proposals: RedirectProposal[]): Promise<number> {
  let saved = 0;
  for (const p of proposals) {
    // Never redirect a path onto itself: that is an infinite loop served to a crawler.
    if (p.fromPath === p.toPath) continue;
    try {
      await pool.query(
        `INSERT INTO site_redirects (from_path, to_path, status, reason, confidence, approved)
         VALUES ($1, $2, 301, $3, $4, false)
         ON CONFLICT (from_path) DO UPDATE
           SET to_path = EXCLUDED.to_path,
               reason = EXCLUDED.reason,
               confidence = EXCLUDED.confidence`,
        [p.fromPath, p.toPath, p.reason, p.confidence],
      );
      saved++;
    } catch { /* one bad row must not cost the other seventy-nine */ }
  }
  return saved;
}

/** The approved redirects, for the middleware. */
export async function activeRedirects(): Promise<Map<string, { to: string; status: number }>> {
  const out = new Map<string, { to: string; status: number }>();
  try {
    const r = await pool.query(
      `SELECT from_path, to_path, status FROM site_redirects WHERE approved = true`,
    );
    for (const row of r.rows as any[]) {
      out.set(String(row.from_path), { to: String(row.to_path), status: Number(row.status) || 301 });
    }
  } catch { /* no table yet, or a blip: serve no redirects rather than throwing on every request */ }
  return out;
}
