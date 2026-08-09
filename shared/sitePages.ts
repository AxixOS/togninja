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

  // ---- Second-language mirror set. ---------------------------------------
  // The origin studio ran German AND English. A single-language studio gets these as
  // duplicates of the canonical pages above, so they are off by default and redirect to
  // the canonical route — which the localisation layer then serves at the studio's own
  // path (/kontakt -> /contact for an English studio).
  { id: 'contact-en', route: '/en/contact/', label: 'Contact (second language)', group: 'locale-en', defaultEnabled: false, redirectTo: '/kontakt' },
  { id: 'waitlist-en', route: '/en/waitlist/', label: 'Waitlist (second language)', group: 'locale-en', defaultEnabled: false, redirectTo: '/warteliste' },
  { id: 'vouchers-en', route: '/en/vouchers/', label: 'Vouchers (second language)', group: 'locale-en', defaultEnabled: false, redirectTo: '/vouchers' },
  { id: 'about-us-en', route: '/en/about-us/', label: 'About Us (second language)', group: 'locale-en', defaultEnabled: false, redirectTo: '/ueber-uns' },
  // The other three /en/ mirrors. They were registered as routes and listed in the
  // shipped sitemap but never here, so the visibility system could not reach them and a
  // single-language studio advertised /en/ alongside / — the same page at two URLs.
  { id: 'home-en', route: '/en/', label: 'Homepage (second language)', group: 'locale-en', defaultEnabled: false, redirectTo: '/' },
  { id: 'case-studies-en', route: '/en/case-studies/', label: 'Case Studies (second language)', group: 'locale-en', defaultEnabled: false, redirectTo: '/case-studies' },
  { id: 'pricing-en', route: '/en/pricing/', label: 'Pricing (second language)', group: 'locale-en', defaultEnabled: false, redirectTo: '/preise' },

  // ---- Leftovers from the studio the image was built for. -----------------
  { id: 'preise-wien', route: '/fotoshooting-preise-wien/', label: 'Pricing (legacy city pillar)', group: 'legacy', defaultEnabled: false, redirectTo: '/preise' },

  // ---- Service pillar pages. -------------------------------------------
  // Fourteen city-specific service pages from the studio the image was built for,
  // hardcoded into the nav. A Brighton boudoir studio was advertising "School &
  // University Photography" in Vienna. OFF by default: they remain in the codebase
  // as templates, and a studio whose services genuinely match can switch one on.
  // Replacing them with pillars generated from the studio's OWN services is the
  // follow-up; disabling them stops the misrepresentation now.
  { id: 'pillar-family', route: '/familienfotos-wien/', label: 'Family Photos', group: 'legacy', defaultEnabled: false, redirectTo: '/fotoshootings' },
  { id: 'pillar-newborn', route: '/neugeborenenfotos-wien/', label: 'Newborn Photos', group: 'legacy', defaultEnabled: false, redirectTo: '/fotoshootings' },
  { id: 'pillar-baby', route: '/babyfotos-wien/', label: 'Baby Photos', group: 'legacy', defaultEnabled: false, redirectTo: '/fotoshootings' },
  { id: 'pillar-maternity', route: '/schwangerschaftsfotos-wien/', label: 'Maternity Photos', group: 'legacy', defaultEnabled: false, redirectTo: '/fotoshootings' },
  { id: 'pillar-business', route: '/business-portrait-wien/', label: 'Business Portraits', group: 'legacy', defaultEnabled: false, redirectTo: '/fotoshootings' },
  { id: 'pillar-team', route: '/teamfotos-wien/', label: 'Team & Employee Photos', group: 'legacy', defaultEnabled: false, redirectTo: '/fotoshootings' },
  { id: 'pillar-linkedin', route: '/bewerbungsfotos-wien/', label: 'LinkedIn & Headshots', group: 'legacy', defaultEnabled: false, redirectTo: '/fotoshootings' },
  { id: 'pillar-portrait', route: '/portrait-fotografie-wien/', label: 'Portrait Photography', group: 'legacy', defaultEnabled: false, redirectTo: '/fotoshootings' },
  { id: 'pillar-product', route: '/produkt-fotografie-wien/', label: 'Product Photography', group: 'legacy', defaultEnabled: false, redirectTo: '/fotoshootings' },
  { id: 'pillar-realestate', route: '/immobilien-fotografie-wien/', label: 'Real Estate Photography', group: 'legacy', defaultEnabled: false, redirectTo: '/fotoshootings' },
  { id: 'pillar-studio', route: '/studio-fotografie-wien/', label: 'Studio Photography', group: 'legacy', defaultEnabled: false, redirectTo: '/fotoshootings' },
  { id: 'pillar-wedding', route: '/hochzeitsfotografie-wien/', label: 'Wedding Photography', group: 'legacy', defaultEnabled: false, redirectTo: '/fotoshootings' },
  { id: 'pillar-event', route: '/eventfotografie-wien/', label: 'Event Photography', group: 'legacy', defaultEnabled: false, redirectTo: '/fotoshootings' },
  { id: 'pillar-school', route: '/schul-und-hochschulfotografie-wien/', label: 'School & University Photography', group: 'legacy', defaultEnabled: false, redirectTo: '/fotoshootings' },
  // Four more of the same, found still in the shipped sitemap because they were never
  // registered here — so the visibility system could not switch them off and they stayed
  // both crawlable and advertised on a studio that offers none of them.
  { id: 'pillar-family-session', route: '/familien-fotoshooting-wien/', label: 'Family Session', group: 'legacy', defaultEnabled: false, redirectTo: '/fotoshootings' },
  { id: 'pillar-baby-photography', route: '/baby-fotografie-wien/', label: 'Baby Photography', group: 'legacy', defaultEnabled: false, redirectTo: '/fotoshootings' },
  { id: 'pillar-children', route: '/kinder-fotografie-wien/', label: 'Children Photography', group: 'legacy', defaultEnabled: false, redirectTo: '/fotoshootings' },
  { id: 'pillar-commercial', route: '/gewerbliche-fotografie-wien/', label: 'Commercial Photography', group: 'legacy', defaultEnabled: false, redirectTo: '/fotoshootings' },

  // ---- Duplicate gallery routes. One canonical, the rest redirect. --------
  { id: 'galerie-alias', route: '/galerie', label: 'Galerie (alias)', group: 'alias', defaultEnabled: false, redirectTo: '/galleries' },
  { id: 'gallery-alias', route: '/gallery', label: 'Gallery (alias)', group: 'alias', defaultEnabled: false, redirectTo: '/galleries' },
];

/**
 * Pages that only make sense if the studio takes money online. A studio that answered
 * "I'm not selling online" in the wizard should not be left with a voucher shop that
 * cannot complete a purchase — worse than not having one, because a visitor tries.
 */
export const ECOMMERCE_PAGE_IDS = ['vouchers', 'vouchers-en', 'gutschein-de', 'voucher-success'];

/**
 * Fold the studio's e-commerce choice into its page visibility, so nav, the sitemap, the
 * route gate and the admin list all read the same answer from one place. `null`/undefined
 * for ecommerceEnabled means "not answered" — left enabled, which is what every studio
 * configured before this existed already had.
 */
export function applyEcommerceVisibility(
  enabled: Record<string, boolean> | null | undefined,
  ecommerceEnabled: boolean | null | undefined,
  lang = 'en',
): Record<string, boolean> {
  const base = { ...defaultEnabledPages(lang), ...(enabled || {}) };
  if (ecommerceEnabled === false) {
    for (const id of ECOMMERCE_PAGE_IDS) base[id] = false;
  }
  return base;
}

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

/**
 * Defaults for a studio that has chosen nothing.
 *
 * The 'locale-de' group is no longer "the German pages" — it is the CANONICAL set, and
 * shared/routeSlugs.ts serves each of them at a path in the studio's own language
 * (/kontakt -> /contact, /contact, /contacto). So it is always on.
 *
 * The 'locale-en' group is the origin studio's SECOND-language mirror (/en/contact/,
 * /en/about-us/). Bilingual was New Age Fotografie's requirement, not every buyer's, and
 * on a single-language studio those pages are pure duplicates of the canonical ones —
 * two URLs for one page, splitting the ranking the visibility system exists to protect.
 * Off by default; they stay in the codebase, so a genuinely bilingual studio switches
 * them back on and its stored enabled_pages overrides this.
 */
export function defaultEnabledPages(lang = 'en'): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const p of SITE_PAGES) {
    if (p.group === 'locale-de') out[p.id] = true;
    else if (p.group === 'locale-en') out[p.id] = false;
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
