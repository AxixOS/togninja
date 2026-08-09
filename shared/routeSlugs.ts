// Public URLs in the studio's own language.
//
// The image shipped German public routes — /fotoshootings, /gutschein, /preise — because
// the studio it was built for was Viennese. A Brighton boudoir photographer's visitors
// should not be sent to /warteliste, and a Madrid studio's certainly should not.
//
// The German paths remain the CANONICAL ids used throughout the codebase: they are what
// ~420 link literals across ~50 files already point at, and rewriting all of those is a
// large mechanical change with real regression risk. Instead this registry maps each
// canonical path to a slug per language, and two thin layers do the rest:
//
//   • the router registers the localised path as the real route, and redirects the
//     canonical path to it, so a link written in German still lands on the right URL;
//   • nav, sitemap and canonical tags localise up front, so the common paths are correct
//     the first time rather than after a redirect.
//
// A German studio is unaffected — its localised slug IS the canonical one.

export interface RouteSlugDef {
  /** The path as registered in App.tsx — the id everything else refers to. */
  canonical: string;
  /** Slug (no slashes) per language. A language with no entry keeps the canonical. */
  slugs: Record<string, string>;
}

// Only whole first-level page paths belong here. Nested paths (/gutschein/family) are
// handled by prefix, so they follow their parent automatically.
export const ROUTE_SLUGS: RouteSlugDef[] = [
  { canonical: '/fotoshootings', slugs: { de: 'fotoshootings', en: 'sessions', fr: 'seances', es: 'sesiones' } },
  { canonical: '/gutschein',     slugs: { de: 'gutschein', en: 'gift-vouchers', fr: 'cartes-cadeaux', es: 'tarjetas-regalo' } },
  { canonical: '/warteliste',    slugs: { de: 'warteliste', en: 'waitlist', fr: 'liste-attente', es: 'lista-de-espera' } },
  { canonical: '/kontakt',       slugs: { de: 'kontakt', en: 'contact', fr: 'contact', es: 'contacto' } },
  { canonical: '/ueber-uns',     slugs: { de: 'ueber-uns', en: 'about', fr: 'a-propos', es: 'sobre-nosotros' } },
  { canonical: '/preise',        slugs: { de: 'preise', en: 'pricing', fr: 'tarifs', es: 'precios' } },
  { canonical: '/kundenstimmen', slugs: { de: 'kundenstimmen', en: 'reviews', fr: 'avis', es: 'opiniones' } },
  { canonical: '/impressum',     slugs: { de: 'impressum', en: 'imprint', fr: 'mentions-legales', es: 'aviso-legal' } },
  { canonical: '/agb',           slugs: { de: 'agb', en: 'terms', fr: 'cgv', es: 'condiciones' } },
  { canonical: '/datenschutz',   slugs: { de: 'datenschutz', en: 'privacy', fr: 'confidentialite', es: 'privacidad' } },
  // Deliberately NOT localised: /blog, /faq and /galleries read the same in all four
  // languages, and /vouchers, /galleries, /case-studies are already English. Renaming a
  // path that is already right only breaks links.
];

const trimSlashes = (s: string) => String(s || '').replace(/^\/+|\/+$/g, '');

/** Normalise to a leading slash and no trailing slash. '/' stays '/'. */
export function normalizePath(p: string): string {
  const body = trimSlashes(p);
  return body ? `/${body}` : '/';
}

const BY_CANONICAL = new Map(ROUTE_SLUGS.map((r) => [normalizePath(r.canonical), r]));

/**
 * The path this studio should actually use for a canonical route.
 * Preserves any nested remainder: /gutschein/family -> /gift-vouchers/family.
 */
export function localizePath(path: string, lang: string): string {
  const norm = normalizePath(path);
  const code = String(lang || 'en').slice(0, 2).toLowerCase();

  for (const [canonical, def] of BY_CANONICAL) {
    if (norm !== canonical && !norm.startsWith(`${canonical}/`)) continue;
    const slug = def.slugs[code];
    if (!slug) return norm; // language we have no slug for — leave the path alone
    const rest = norm.slice(canonical.length); // '' or '/family'
    return `/${slug}${rest}`;
  }
  return norm;
}

/**
 * The inverse: the canonical path a localised one refers to. Used by the router to
 * resolve an incoming localised URL back to the route that renders it.
 * Returns null when the path is not a localised form of anything.
 */
export function canonicalizePath(path: string, lang: string): string | null {
  const norm = normalizePath(path);
  const code = String(lang || 'en').slice(0, 2).toLowerCase();

  for (const def of ROUTE_SLUGS) {
    const slug = def.slugs[code];
    if (!slug) continue;
    const localised = `/${slug}`;
    if (norm === localised || norm.startsWith(`${localised}/`)) {
      const canonical = normalizePath(def.canonical);
      return `${canonical}${norm.slice(localised.length)}`;
    }
  }
  return null;
}

/**
 * Every localisable canonical path paired with this studio's path for it, skipping the
 * ones where they are the same (a German studio changes nothing). The router and the
 * server's redirect layer both walk this.
 */
export function localizedRouteMap(lang: string): Array<{ canonical: string; localized: string }> {
  return ROUTE_SLUGS
    .map((def) => ({
      canonical: normalizePath(def.canonical),
      localized: localizePath(def.canonical, lang),
    }))
    .filter((r) => r.canonical !== r.localized);
}
