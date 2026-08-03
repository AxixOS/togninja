/**
 * German ⇄ English URL pairs for the pages that have a real, separately
 * indexable English URL. This is the single source of truth for:
 *   - which /en/... routes exist (App.tsx),
 *   - the language toggle's target URL (Header),
 *   - reciprocal canonical + hreflang (SEOHead),
 *   - the prerender list (vite.config keeps its own copy in sync).
 *
 * Rollout is intentionally staged: start with the pages English-speaking Vienna
 * clients search for most, prove the ROI, then add more pairs here.
 */
export interface LocalePair {
  de: string;
  en: string;
}

export const LOCALE_ROUTES: LocalePair[] = [
  { de: '/', en: '/en/' },
  // Service pages
  { de: '/familienfotos-wien/', en: '/en/family-photography-vienna/' },
  { de: '/neugeborenenfotos-wien/', en: '/en/newborn-photography-vienna/' },
  { de: '/schwangerschaftsfotos-wien/', en: '/en/maternity-photography-vienna/' },
  { de: '/business-portrait-wien/', en: '/en/business-portraits-vienna/' },
  { de: '/bewerbungsfotos-wien/', en: '/en/application-photos-vienna/' },
  { de: '/hochzeitsfotografie-wien/', en: '/en/wedding-photography-vienna/' },
  { de: '/babyfotos-wien/', en: '/en/baby-photos-vienna/' },
  { de: '/portrait-fotografie-wien/', en: '/en/portrait-photography-vienna/' },
  { de: '/case-studies', en: '/en/case-studies/' },
  // Functional / conversion pages
  { de: '/preise/', en: '/en/pricing/' },
  { de: '/vouchers', en: '/en/vouchers/' },
  { de: '/kontakt', en: '/en/contact/' },
  { de: '/warteliste', en: '/en/waitlist/' },
  { de: '/ueber-uns/', en: '/en/about-us/' },
];

/** Normalise a path for comparison: ensure a single trailing slash (root = "/"). */
function norm(path: string): string {
  if (!path) return '/';
  const clean = path.split('?')[0].split('#')[0];
  if (clean === '/' || clean === '') return '/';
  return clean.endsWith('/') ? clean : `${clean}/`;
}

/** The English URL paired with `path`, or null if none. */
export function toEnglishPath(path: string): string | null {
  const p = norm(path);
  const hit = LOCALE_ROUTES.find((r) => norm(r.de) === p || norm(r.en) === p);
  return hit ? hit.en : null;
}

/** The German URL paired with `path`, or null if none. */
export function toGermanPath(path: string): string | null {
  const p = norm(path);
  const hit = LOCALE_ROUTES.find((r) => norm(r.de) === p || norm(r.en) === p);
  return hit ? hit.de : null;
}

/** True when the path is (or begins with) the English URL tree. */
export function isEnglishPath(path: string): boolean {
  const p = norm(path);
  return p === '/en/' || p.startsWith('/en/');
}

export interface Alternates {
  /** Canonical (self) path for the CURRENT url. */
  canonical: string;
  /** rel=alternate hreflang entries, incl. x-default. */
  hreflang: Array<{ lang: string; url: string }>;
}

/**
 * For a mapped page, return the self-canonical + reciprocal hreflang (de, en,
 * x-default→de). Returns null for unmapped paths so callers keep their existing
 * behaviour.
 */
export function getAlternates(path: string): Alternates | null {
  const p = norm(path);
  const pair = LOCALE_ROUTES.find((r) => norm(r.de) === p || norm(r.en) === p);
  if (!pair) return null;
  const onEnglish = norm(pair.en) === p;
  return {
    canonical: onEnglish ? pair.en : pair.de,
    hreflang: [
      { lang: 'de', url: pair.de },
      { lang: 'en', url: pair.en },
      { lang: 'x-default', url: pair.de },
    ],
  };
}
