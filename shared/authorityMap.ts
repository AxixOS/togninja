/**
 * Authority Map — the per-studio topical-cluster + internal-linking structure that
 * TogNinja delivers as standard (the "IA Growth Engine" / topical-authority loop).
 *
 * The app already implements the model — pillar (money) pages ↔ cluster (blog) articles,
 * with bidirectional internal links — but historically it was HARD-CODED to New Age
 * Fotografie's Vienna photography niche. This module lifts that into data the studio owns:
 * every instance resolves its own map (studio_configs.authority_map), falling back to the
 * New Age seed below so nothing changes for the reference studio.
 *
 * Shared by client (SEO link components) and server (SSR blog uplinks, generation).
 * `match` is a regex SOURCE string (JSON-safe); build with `new RegExp(match, 'i')`.
 */

export interface AuthorityLink {
  href: string;
  label: string;
}

export interface AuthorityPillar {
  /** Stable id (used for editing / sibling references). */
  id: string;
  /** Case-insensitive regex source matching a cluster topic (title/slug/excerpt) to this pillar. */
  match: string;
  /** The pillar (money) page path. */
  href: string;
  /** Human label used in link anchors. */
  label: string;
  /** Primary keyphrase for the pillar (used by generation; optional). */
  keyphrase?: string;
  /** Sibling cross-links (exact anchor labels preserved). */
  siblings: AuthorityLink[];
  /** Pillar → cluster down-links ("Ratgeber" guides). Optional; grows as content is published. */
  clusters?: AuthorityLink[];
}

export interface AuthorityMap {
  /** Ordered pillar (money) pages. */
  pillars: AuthorityPillar[];
  /** Fallback pillar when a topic matches none. */
  // Nullable on purpose. A studio with no map of its own has no default pillar to fall
  // back to — the alternative was one specific studio's German route, rendered into
  // everybody else's blog. Consumers must handle null; strictNullChecks is OFF in this
  // repo, so the type will not enforce that for you.
  defaultPillar: { href: string; label: string; siblings: AuthorityLink[] } | null;
  /** Conversion links appended to internal-link blocks (prices, contact, etc.). */
  conversionLinks: AuthorityLink[];
}

/**
 * What a studio with no map of its own gets: nothing. An empty map renders no pillars,
 * which is correct until the crawl builds a real one. Every consumer must treat this as
 * a terminal state and render nothing — NOT as a cue to substitute another studio's map.
 */
export const EMPTY_AUTHORITY_MAP: AuthorityMap = {
  pillars: [],
  // NO default pillar. This used to be { href: '/fotoshootings', label: 'Sessions' } — a
  // German route belonging to the studio this product grew out of, which pillarForTopic()
  // then handed to every blog post on any studio without a map of its own. An internal
  // link to a page that does not exist on that studio's site, server-rendered into the
  // markup a crawler reads. A missing uplink is a smaller failure than a broken one.
  defaultPillar: null,
  conversionLinks: [],
};

/**
 * New Age Fotografie's map — the Vienna studio this product was built for.
 *
 * This is TENANT DATA that happens to live in the repo, not a default. It is exported for
 * exactly one purpose: seeding that studio's own deployment (see scripts/seed-authority-map.mjs),
 * so it holds the pillar/sibling graph their live SSR output depends on.
 *
 * Do NOT import this into a component, a hook or a request path. It named one studio's
 * Vienna services on every buyer's site for months, because "sensible default" and
 * "another company's data" looked identical at the call site. If you want a value when a
 * studio has no map, the answer is EMPTY_AUTHORITY_MAP and rendering nothing.
 */
export const NEW_AGE_AUTHORITY_MAP: AuthorityMap = {
  pillars: [
    {
      id: 'hochzeit',
      match: 'hochzeit|braut|trauung|standesamt',
      href: '/hochzeitsfotografie-wien/',
      label: 'Hochzeitsfotografie Wien',
      siblings: [
        { href: '/schwangerschaftsfotos-wien/', label: 'Paar- & Babybauch-Shooting' },
        { href: '/gewerbliche-fotografie-wien/', label: 'Eventfotografie & mehr' },
      ],
    },
    {
      id: 'neugeboren',
      match: 'neugeboren|newborn',
      href: '/neugeborenenfotos-wien/',
      label: 'Neugeborenenfotos Wien',
      siblings: [
        { href: '/babyfotos-wien/', label: 'Babyfotos Wien' },
        { href: '/familienfotos-wien/', label: 'Familienfotos Wien' },
      ],
    },
    {
      id: 'schwanger',
      match: 'schwanger|babybauch|maternity',
      href: '/schwangerschaftsfotos-wien/',
      label: 'Schwangerschaftsfotos Wien',
      siblings: [
        { href: '/neugeborenenfotos-wien/', label: 'Neugeborenenfotos Wien' },
        { href: '/familienfotos-wien/', label: 'Familienfotos Wien' },
      ],
    },
    {
      id: 'baby',
      match: '\\bbaby|babyfoto',
      href: '/babyfotos-wien/',
      label: 'Babyfotos Wien (3–12 Monate)',
      siblings: [
        { href: '/neugeborenenfotos-wien/', label: 'Neugeborenenfotos Wien' },
        { href: '/kinder-fotografie-wien/', label: 'Kinder-Fotografie Wien' },
      ],
    },
    {
      id: 'kinder',
      match: 'kinder|kids',
      href: '/kinder-fotografie-wien/',
      label: 'Kinder-Fotografie Wien',
      siblings: [
        { href: '/familienfotos-wien/', label: 'Familienfotos Wien' },
        { href: '/babyfotos-wien/', label: 'Babyfotos Wien' },
      ],
    },
    {
      id: 'business',
      match: 'business|bewerbung|linkedin|portrait|headshot|team',
      href: '/business-portrait-wien/',
      label: 'Business Portraits Wien',
      siblings: [
        { href: '/gewerbliche-fotografie-wien/', label: 'Gewerbliche Fotografie Wien' },
        { href: '/teamfotos-wien/', label: 'Teamfotos Wien' },
      ],
    },
    {
      id: 'gewerblich',
      match: 'produkt|immobilie|event|firmen',
      href: '/gewerbliche-fotografie-wien/',
      label: 'Gewerbliche Fotografie Wien',
      siblings: [
        { href: '/business-portrait-wien/', label: 'Business Portraits Wien' },
        { href: '/teamfotos-wien/', label: 'Teamfotos Wien' },
      ],
    },
  ],
  defaultPillar: {
    href: '/familienfotos-wien/',
    label: 'Familienfotos Wien',
    siblings: [
      { href: '/babyfotos-wien/', label: 'Babyfotos Wien' },
      { href: '/schwangerschaftsfotos-wien/', label: 'Schwangerschaftsfotos Wien' },
    ],
  },
  conversionLinks: [
    { href: '/preise/', label: 'Preise & Pakete' },
    { href: '/kundenstimmen/', label: 'Kundenstimmen' },
    { href: '/kontakt', label: 'Termin anfragen' },
    { href: '/vouchers', label: 'Gutscheine' },
  ],
};

/** Pick the pillar + sibling links for a cluster topic (matches title/slug/excerpt text). */
export function pillarForTopic(
  map: AuthorityMap,
  haystack: string,
): { pillar: AuthorityLink | null; siblings: AuthorityLink[] } {
  const hit = (map.pillars || []).find((p) => {
    try { return new RegExp(p.match, 'i').test(haystack); } catch { return false; }
  });
  if (hit) return { pillar: { href: hit.href, label: hit.label }, siblings: hit.siblings || [] };
  const d = map.defaultPillar;
  // No match and no default. Returning null is the honest answer, and the callers render
  // nothing rather than an uplink to a page that does not exist. This used to read
  // `d.href` unguarded, which on a studio with no map is a TypeError thrown while
  // server-rendering a blog post — the whole page, not just the uplink.
  if (!d || !d.href) return { pillar: null, siblings: [] };
  return { pillar: { href: d.href, label: d.label }, siblings: d.siblings || [] };
}

/** Best-effort validation used when reading a stored map; returns null if unusable. */
export function normalizeAuthorityMap(input: any): AuthorityMap | null {
  if (!input || typeof input !== 'object') return null;
  // A map with pillars but no defaultPillar is valid now — the default was the origin
  // studio's route and is gone. Rejecting the whole map for its absence would discard a
  // studio's real pillars over a field that should not have existed.
  if (!Array.isArray(input.pillars)) return null;
  return {
    pillars: input.pillars,
    defaultPillar: input.defaultPillar,
    // Was DEFAULT_AUTHORITY_MAP.conversionLinks — so a studio whose stored map omitted
    // conversionLinks silently inherited the Vienna studio's German "Kundenstimmen /
    // Termin anfragen / Gutscheine" anchors. An absent list means no conversion links.
    conversionLinks: Array.isArray(input.conversionLinks) ? input.conversionLinks : [],
  };
}
