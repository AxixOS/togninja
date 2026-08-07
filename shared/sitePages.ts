// Which public pages a studio actually runs.
//
// The image ships a bilingual site with German and English versions of the same
// pages, plus leftovers from the studio it was built for. A single-language studio
// needs one set, not both, and an unlinked-but-live page still competes with the
// real one in search. Disabled pages are NOT deleted — they stay as templates a
// studio can switch on later, arriving pre-filled from its onboarding data.

export type SitePageGroup = 'core' | 'locale-de' | 'locale-en' | 'legacy' | 'alias';

export interface SitePageDef {
  /** Stable id — what gets stored in studio_configs.enabled_pages. */
  id: string;
  /** Public route as registered in App.tsx. */
  route: string;
  label: string;
  group: SitePageGroup;
  /** On for a new studio? */
  defaultEnabled: boolean;
  /**
   * Where to send visitors when this page is disabled. A 301 to the live
   * equivalent beats a 404: inbound links and any existing ranking carry over,
   * and Google treats it as consolidation rather than a dead end.
   */
  redirectTo?: string;
}

export const SITE_PAGES: SitePageDef[] = [
  // ---- Core. Every studio needs these. -----------------------------------
  { id: 'home', route: '/', label: 'Homepage', group: 'core', defaultEnabled: true },
  { id: 'sessions', route: '/fotoshootings', label: 'Sessions / Fotoshootings', group: 'core', defaultEnabled: true },
  { id: 'vouchers', route: '/vouchers', label: 'Vouchers', group: 'core', defaultEnabled: true },
  { id: 'galleries', route: '/galleries', label: 'Galleries', group: 'core', defaultEnabled: true },
  { id: 'blog', route: '/blog', label: 'Blog', group: 'core', defaultEnabled: true },
  { id: 'case-studies', route: '/case-studies', label: 'Case Studies', group: 'core', defaultEnabled: true },
  { id: 'voucher-success', route: '/voucher/success', label: 'Voucher Success', group: 'core', defaultEnabled: true },

  // ---- German-locale set. On for a German studio, redirected for others. --
  { id: 'kontakt-de', route: '/kontakt', label: 'Kontakt (DE)', group: 'locale-de', defaultEnabled: true, redirectTo: '/en/contact/' },
  { id: 'warteliste-de', route: '/warteliste', label: 'Warteliste (DE)', group: 'locale-de', defaultEnabled: true, redirectTo: '/en/waitlist/' },
  { id: 'gutschein-de', route: '/gutschein', label: 'Gutschein (DE)', group: 'locale-de', defaultEnabled: true, redirectTo: '/vouchers' },
  { id: 'ueber-uns-de', route: '/ueber-uns', label: 'Über uns (DE)', group: 'locale-de', defaultEnabled: true, redirectTo: '/en/about-us/' },

  // ---- English-locale set. -----------------------------------------------
  { id: 'contact-en', route: '/en/contact/', label: 'Contact (EN)', group: 'locale-en', defaultEnabled: true, redirectTo: '/kontakt' },
  { id: 'waitlist-en', route: '/en/waitlist/', label: 'Waitlist (EN)', group: 'locale-en', defaultEnabled: true, redirectTo: '/warteliste' },
  { id: 'vouchers-en', route: '/en/vouchers/', label: 'Vouchers (EN)', group: 'locale-en', defaultEnabled: true, redirectTo: '/vouchers' },
  { id: 'about-us-en', route: '/en/about-us/', label: 'About Us (EN)', group: 'locale-en', defaultEnabled: true, redirectTo: '/ueber-uns' },

  // ---- Leftovers from the studio the image was built for. -----------------
  { id: 'preise-wien', route: '/fotoshooting-preise-wien/', label: 'Pricing (legacy city pillar)', group: 'legacy', defaultEnabled: false, redirectTo: '/preise' },

  // ---- Duplicate gallery routes. One canonical, the rest redirect. --------
  { id: 'galerie-alias', route: '/galerie', label: 'Galerie (alias)', group: 'alias', defaultEnabled: false, redirectTo: '/galleries' },
  { id: 'gallery-alias', route: '/gallery', label: 'Gallery (alias)', group: 'alias', defaultEnabled: false, redirectTo: '/galleries' },
];

/**
 * Locale pairs: enabling one side of a pair disables the other, so a studio never
 * publishes the same page twice in two languages and splits its own ranking.
 */
export const LOCALE_PAIRS: Array<[string, string]> = [
  ['kontakt-de', 'contact-en'],
  ['warteliste-de', 'waitlist-en'],
  ['gutschein-de', 'vouchers-en'],
  ['ueber-uns-de', 'about-us-en'],
];

/** Defaults for a studio that has chosen nothing, keyed by its site language. */
export function defaultEnabledPages(lang = 'en'): Record<string, boolean> {
  const german = String(lang).toLowerCase().startsWith('de');
  const out: Record<string, boolean> = {};
  for (const p of SITE_PAGES) {
    if (p.group === 'locale-de') out[p.id] = german;
    else if (p.group === 'locale-en') out[p.id] = !german;
    else out[p.id] = p.defaultEnabled;
  }
  return out;
}

const BY_ROUTE = new Map(SITE_PAGES.map(p => [p.route.replace(/\/+$/, '') || '/', p]));

/** The page definition for a request path, if it is one we gate. */
export function pageForRoute(pathname: string): SitePageDef | undefined {
  return BY_ROUTE.get(pathname.replace(/\/+$/, '') || '/');
}

/** Resolve enablement, falling back to the language default for unknown ids. */
export function isPageEnabled(
  id: string,
  enabled: Record<string, boolean> | null | undefined,
  lang = 'en',
): boolean {
  if (enabled && Object.prototype.hasOwnProperty.call(enabled, id)) return !!enabled[id];
  return defaultEnabledPages(lang)[id] ?? true;
}
