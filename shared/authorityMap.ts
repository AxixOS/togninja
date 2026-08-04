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
  defaultPillar: { href: string; label: string; siblings: AuthorityLink[] };
  /** Conversion links appended to internal-link blocks (prices, contact, etc.). */
  conversionLinks: AuthorityLink[];
}

/**
 * New Age Fotografie seed — byte-for-byte the pillar/sibling graph previously hard-coded in
 * server/vite.ts (BLOG_PILLARS + DEFAULT_BLOG_PILLAR) and the blog CTA footer links. Keeping
 * these values verbatim guarantees NAF's live SSR output is unchanged.
 */
export const DEFAULT_AUTHORITY_MAP: AuthorityMap = {
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
): { pillar: AuthorityLink; siblings: AuthorityLink[] } {
  const hit = (map.pillars || []).find((p) => {
    try { return new RegExp(p.match, 'i').test(haystack); } catch { return false; }
  });
  if (hit) return { pillar: { href: hit.href, label: hit.label }, siblings: hit.siblings || [] };
  const d = map.defaultPillar;
  return { pillar: { href: d.href, label: d.label }, siblings: d.siblings || [] };
}

/** Best-effort validation used when reading a stored map; returns null if unusable. */
export function normalizeAuthorityMap(input: any): AuthorityMap | null {
  if (!input || typeof input !== 'object') return null;
  if (!Array.isArray(input.pillars) || !input.defaultPillar) return null;
  return {
    pillars: input.pillars,
    defaultPillar: input.defaultPillar,
    conversionLinks: Array.isArray(input.conversionLinks) ? input.conversionLinks : DEFAULT_AUTHORITY_MAP.conversionLinks,
  };
}
