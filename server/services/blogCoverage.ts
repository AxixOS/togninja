// What has this studio already published, and would a new article compete with it?
//
// Two problems, one index.
//
// INTERNAL LINKS. The writer was handed a hardcoded list of the origin studio's Viennese
// service pages. For anyone else every suggestion was a 404, and the model was being
// actively instructed to produce them. The studio's real pages are in landing_pages and
// blog_posts; nothing was reading them.
//
// CANNIBALISATION. Nothing anywhere checked whether a new article targets a query the
// studio already ranks for. Two of your own pages competing for "maternity photography
// shreveport" do not double your chances — they split the signal, and the weaker one
// usually wins, which is the worst outcome. A studio publishing weekly will do this to
// themselves within a couple of months and have no way to see it happening.
//
// The scoring below is deliberately dull. Token overlap, with common tokens discounted —
// no embeddings, no model call, nothing that can be confidently wrong. A gate that cries
// wolf gets clicked past, and then the real collision goes through with it.
// Imported lazily inside the loaders. The pure functions in this file — the ones a
// verification script needs — must be importable WITHOUT a database, or the guard can
// only run where a live connection string exists, which is to say almost nowhere.
const getPool = async () => (await import('../db')).pool;

export interface CoverageItem {
  url: string;
  title: string;
  kind: 'page' | 'post';
  /** Everything this item is trying to rank for, already normalised. */
  terms: string[];
}

export interface Conflict {
  item: CoverageItem;
  /** 0..1. Above OVERLAP_WARN the studio is told; above OVERLAP_BLOCK it is told loudly. */
  score: number;
  /** The distinctive words both share — what to show the studio. */
  shared: string[];
}

// Words that carry no distinguishing signal for a photography studio. Every page has
// them, so counting them would make every page look like every other page.
const STOP = new Set([
  'the', 'a', 'an', 'and', 'or', 'of', 'in', 'on', 'at', 'for', 'to', 'with', 'your', 'you',
  'our', 'we', 'is', 'are', 'best', 'top', 'guide', 'how', 'what', 'why', 'when', 'where',
  'der', 'die', 'das', 'und', 'oder', 'von', 'im', 'in', 'für', 'mit', 'ihr', 'ihre', 'wir',
  'photography', 'photographer', 'photo', 'photos', 'shoot', 'shooting', 'session', 'studio',
  'fotografie', 'fotograf', 'fotos', 'foto', 'shootings',
]);

const OVERLAP_WARN = 0.5;
const OVERLAP_BLOCK = 0.75;

function tokens(...parts: Array<string | null | undefined>): string[] {
  return parts
    .flatMap((p) => String(p || '').toLowerCase().split(/[^a-z0-9äöüß]+/))
    .map((t) => t.trim())
    .filter((t) => t.length > 2 && !STOP.has(t));
}

/**
 * Everything the studio has published that a search engine can see.
 *
 * Drafts are excluded on purpose: an unpublished page competes with nothing, and warning
 * about it would train the studio to ignore the warning.
 */
export async function loadCoverage(): Promise<CoverageItem[]> {
  const items: CoverageItem[] = [];

  const pages = await (await getPool()).query(
    `SELECT slug, title, meta_description FROM landing_pages WHERE status = 'published'`,
  ).catch(() => ({ rows: [] as any[] }));
  for (const p of pages.rows) {
    if (!p.slug) continue;
    items.push({
      url: `/${String(p.slug).replace(/^\/+/, '')}`,
      title: String(p.title || p.slug),
      kind: 'page',
      terms: tokens(p.title, p.slug, p.meta_description),
    });
  }

  const posts = await (await getPool()).query(
    `SELECT slug, title, seo_title, meta_description, tags FROM blog_posts WHERE published = true`,
  ).catch(() => ({ rows: [] as any[] }));
  for (const p of posts.rows) {
    if (!p.slug) continue;
    const tags = Array.isArray(p.tags) ? p.tags : [];
    items.push({
      url: `/blog/${String(p.slug).replace(/^\/+/, '')}`,
      title: String(p.title || p.slug),
      kind: 'post',
      terms: tokens(p.title, p.seo_title, p.slug, p.meta_description, ...tags),
    });
  }

  return items;
}

/**
 * How much of the candidate's distinctive vocabulary is already spoken for.
 *
 * Asymmetric on purpose: the question is "is this new article redundant", not "are these
 * two the same length". A short new post entirely contained in a long existing pillar
 * page IS a collision; the reverse is not, and a symmetric measure would miss it.
 *
 * Terms shared by MOST of the site are discounted to nothing — "shreveport" appears on
 * every page of a Shreveport studio, so treating it as evidence would flag every article
 * against every other one.
 */
export function findConflicts(
  candidateTitle: string,
  candidateKeyword: string | undefined,
  coverage: CoverageItem[],
  tagList: string[] = [],
): Conflict[] {
  const cand = new Set(tokens(candidateTitle, candidateKeyword, ...tagList));
  if (!cand.size || !coverage.length) return [];

  // A term on more than half the site distinguishes nothing.
  const freq = new Map<string, number>();
  for (const item of coverage) {
    for (const t of new Set(item.terms)) freq.set(t, (freq.get(t) || 0) + 1);
  }
  const ubiquitous = (t: string) => (freq.get(t) || 0) > Math.max(1, coverage.length * 0.5);

  const distinctive = [...cand].filter((t) => !ubiquitous(t));
  if (!distinctive.length) return [];

  const out: Conflict[] = [];
  for (const item of coverage) {
    const theirs = new Set(item.terms.filter((t) => !ubiquitous(t)));
    if (!theirs.size) continue;
    const shared = distinctive.filter((t) => theirs.has(t));
    if (!shared.length) continue;
    const score = shared.length / distinctive.length;
    if (score >= OVERLAP_WARN) out.push({ item, score, shared });
  }

  return out.sort((a, b) => b.score - a.score);
}

export const CONFLICT_THRESHOLDS = { warn: OVERLAP_WARN, block: OVERLAP_BLOCK };

/**
 * The lines the writer is given about what already exists.
 *
 * Two jobs at once: real internal link targets (so it stops inventing URLs), and an
 * explicit instruction not to re-target a query the studio already holds. Capped, because
 * a studio with 200 posts would otherwise push the actual brief out of the context.
 */
export function coverageRules(
  coverage: CoverageItem[],
  conflicts: Conflict[],
  lang: 'de' | 'en',
  // Pages every install has (contact, vouchers). They are real link targets but are
  // never cannibalisation candidates, so they are kept out of the scoring above.
  alwaysAllowed: string[] = [],
): string[] {
  if (!coverage.length && !alwaysAllowed.length) return [];
  const de = lang === 'de';
  const out: string[] = [];

  const listed = [
    ...coverage.slice(0, 30).map((c) => `${c.url} (${c.title})`),
    ...alwaysAllowed,
  ].join('; ');
  out.push(de
    ? `BEREITS VERÖFFENTLICHT — diese Seiten existieren und sind die EINZIGEN erlaubten internen Links: ${listed}.`
    : `ALREADY PUBLISHED — these pages exist and are the ONLY permitted internal links: ${listed}.`);

  if (conflicts.length) {
    const near = conflicts.slice(0, 3)
      .map((c) => `${c.item.url} („${c.item.title}", ${de ? 'gemeinsam' : 'shared'}: ${c.shared.join(', ')})`)
      .join('; ');
    out.push(de
      ? `KEIN KANNIBALISMUS: Zu diesem Thema gibt es schon ${near}. Ziele NICHT auf dieselbe Suchanfrage. Wähle einen klar anderen Blickwinkel (ein Detail, ein Ablauf, eine Entscheidung) und VERLINKE die bestehende Seite als Hauptquelle, statt sie zu wiederholen.`
      : `DO NOT CANNIBALISE: this topic is already covered by ${near}. Do NOT target the same query. Take a clearly different angle — one detail, one part of the process, one decision — and LINK to the existing page as the authority rather than repeating it.`);
  }

  return out;
}
