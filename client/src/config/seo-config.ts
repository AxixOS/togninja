/**
 * Centralized SEO Configuration for the studio
 *
 * Each public page must have unique:
 * - title: 55-60 chars, format "{Primary Keyword in Wien} | New Age Fotografie"
 * - h1: Human-readable, service-first, NOT repeating title verbatim
 * - description: 140-160 chars, includes service + location + emotional hook
 *
 * Following Google E-E-A-T and local SEO best practices for Austria.
 */

import { SITE } from './site';

export interface PageSEO {
  title: string;
  h1: string;
  description: string;
  keywords?: string;
  canonical: string;
  ogImage?: string;
}

// Brand suffix for consistent title format
export const BRAND_SUFFIX = ` | ${SITE.name}`;

/**
 * SEO configurations for all public-facing pages
 * Keys match the route paths
 */
export const seoConfig: Record<string, PageSEO> = {
  // ==================== HOMEPAGE ====================
  '/': {
    title: 'Fotograf in Wien für Familie, Baby & Business' + BRAND_SUFFIX,
    h1: 'Ihr Fotograf für unvergessliche Momente in Wien',
    description: 'Professionelle Fotografie in Wien: Familien-, Baby-, Neugeborenen- und Businessfotos. Buchen Sie jetzt Ihr Shooting in unserem Wiener Studio.',
    keywords: 'Fotograf Wien, Familienfotograf, Babyfotograf, Businessfotografie Wien',
    canonical: '/',
  },

  // ==================== MAIN FOTOSHOOTING PAGES ====================
  '/fotoshootings': {
    title: 'Fotoshootings in Wien buchen' + BRAND_SUFFIX,
    h1: 'Unsere Fotoshooting-Pakete in Wien',
    description: 'Entdecken Sie unsere Fotoshooting-Angebote in Wien: Familie, Baby, Business, Hochzeit und mehr. Flexible Pakete für jeden Anlass.',
    keywords: 'Fotoshooting Wien, Fotoshooting buchen, Fotograf Pakete Wien',
    canonical: '/fotoshootings',
  },

  // ==================== VOUCHERS / GUTSCHEINE ====================
  '/vouchers': {
    title: 'Fotoshooting Gutscheine in Wien' + BRAND_SUFFIX,
    h1: 'Verschenken Sie ein Fotoshooting in Wien',
    description: 'Fotoshooting Gutscheine als perfektes Geschenk. Wählen Sie aus Familie, Baby oder Business Paketen. Sofort per E-Mail!',
    keywords: 'Fotoshooting Gutschein Wien, Geschenkgutschein Fotograf, Gutschein Fotoshooting',
    canonical: '/vouchers',
  },

  '/gutschein': {
    title: 'Gutscheine für Fotoshootings' + BRAND_SUFFIX,
    h1: 'Gutscheine für unvergessliche Fotomomente',
    description: `Fotoshooting-Gutscheine von ${SITE.name}. Das perfekte Geschenk für Familie und Freunde in Wien.`,
    keywords: 'Gutschein Fotoshooting, Geschenk Fotograf Wien, Erlebnisgutschein Foto',
    canonical: '/gutschein',
  },

  '/gutschein/family': {
    title: 'Familien-Fotoshooting Gutschein' + BRAND_SUFFIX,
    h1: 'Gutschein für ein Familien-Fotoshooting',
    description: 'Schenken Sie Familienglück! Gutschein für ein professionelles Familien-Fotoshooting in Wien. Sofort per E-Mail.',
    keywords: 'Familien Fotoshooting Gutschein, Familienfotos Geschenk, Gutschein Familie',
    canonical: '/gutschein/family',
  },

  '/gutschein/newborn': {
    title: 'Neugeborenen-Fotoshooting Gutschein' + BRAND_SUFFIX,
    h1: 'Gutschein für Neugeborenenfotos',
    description: 'Das perfekte Geschenk für werdende Eltern: Gutschein für ein professionelles Neugeborenen-Fotoshooting in Wien.',
    keywords: 'Neugeborenen Fotoshooting Gutschein, Newborn Geschenk, Baby Gutschein',
    canonical: '/gutschein/newborn',
  },

  '/gutschein/maternity': {
    title: 'Schwangerschafts-Fotoshooting Gutschein' + BRAND_SUFFIX,
    h1: 'Gutschein für Schwangerschaftsfotos',
    description: 'Verschenken Sie Erinnerungen: Gutschein für ein einfühlsames Schwangerschafts-Fotoshooting in Wien.',
    keywords: 'Schwangerschaft Fotoshooting Gutschein, Babybauch Geschenk, Maternity Gutschein',
    canonical: '/gutschein/maternity',
  },

  // ==================== SUPPORT PAGES ====================
  '/ueber-uns/': {
    title: 'Über uns | Fotostudio Wien seit 2012' + BRAND_SUFFIX,
    h1: `Über uns – ${SITE.name} Wien`,
    description: `Lerne ${SITE.name} kennen – dein Fotostudio in Wien seit 2012 für Familienfotografie, Babybauch, Neugeborene und Business Portraits. Persönlich, modern und authentisch.`,
    keywords: `Fotostudio Wien, ${SITE.name} Wien, Familienfotografie Wien, Babybauch Wien, Neugeborene Wien, Business Portrait Wien`,
    canonical: '/ueber-uns/',
  },

  '/preise/': {
    title: 'Preise für Fotoshootings in Wien' + BRAND_SUFFIX,
    h1: 'Unsere Preise und Pakete',
    description: 'Transparente Preise für alle Fotoshootings in Wien. Familien, Baby, Business - finden Sie das passende Paket.',
    keywords: 'Fotoshooting Preise Wien, Fotograf Kosten Wien, Preisliste Fotografie',
    canonical: '/preise/',
  },

  '/faq/': {
    title: 'FAQ - Häufige Fragen' + BRAND_SUFFIX,
    h1: 'Häufig gestellte Fragen',
    description: `Antworten auf Ihre Fragen zu Fotoshootings bei ${SITE.name} Wien. Ablauf, Preise, Termine und mehr.`,
    keywords: 'FAQ Fotoshooting, Fragen Fotograf Wien, Fotoshooting Ablauf',
    canonical: '/faq/',
  },

  '/kundenstimmen/': {
    title: 'Kundenstimmen & Bewertungen' + BRAND_SUFFIX,
    h1: 'Das sagen unsere Kunden',
    description: 'Lesen Sie echte Bewertungen und Erfahrungen unserer Kunden. Über 27.000 Familien in Wien fotografiert.',
    keywords: `Kundenstimmen Fotograf Wien, Bewertungen ${SITE.name}, Erfahrungen`,
    canonical: '/kundenstimmen/',
  },

  // ==================== CONTACT & MISC ====================
  '/kontakt': {
    title: 'Kontakt - Fotograf in Wien' + BRAND_SUFFIX,
    h1: 'Kontaktieren Sie uns',
    description: `Kontaktieren Sie ${SITE.name} in Wien. Rufen Sie an oder schreiben Sie uns. Wir freuen uns auf Sie!`,
    keywords: `Kontakt Fotograf Wien, Fotostudio Kontakt, ${SITE.name} Adresse`,
    canonical: '/kontakt',
  },

  '/warteliste': {
    title: 'Warteliste für Fotoshootings' + BRAND_SUFFIX,
    h1: 'Auf die Warteliste eintragen',
    description: 'Tragen Sie sich auf unsere Warteliste ein und erfahren Sie als Erste/r von freien Terminen und Aktionen.',
    keywords: 'Warteliste Fotoshooting, Termin Fotograf Wien, Benachrichtigung',
    canonical: '/warteliste',
  },

  '/blog': {
    title: 'Fotografie Blog' + BRAND_SUFFIX,
    h1: 'Unser Fotografie-Blog',
    description: 'Tipps, Inspiration und Neuigkeiten rund um Fotografie in Wien. Familien-, Baby- und Business-Fotografie Insights.',
    keywords: 'Fotografie Blog Wien, Fotoshooting Tipps, Fotograf Inspiration',
    canonical: '/blog',
  },

  '/galleries': {
    title: 'Fotogalerie' + BRAND_SUFFIX,
    h1: 'Unsere Fotogalerie',
    description: 'Entdecken Sie unsere Fotogalerie mit Arbeitsproben aus Familien-, Baby- und Business-Fotoshootings in Wien.',
    keywords: 'Fotogalerie Wien, Portfolio Fotograf, Arbeitsproben Fotografie',
    canonical: '/galleries',
  },

  '/galerie': {
    title: 'Galerie & Portfolio' + BRAND_SUFFIX,
    h1: 'Unser Portfolio',
    description: 'Sehen Sie sich unser Portfolio an. Familien-, Neugeborenen- und Businessfotos aus unserem Wiener Studio.',
    keywords: 'Portfolio Fotograf Wien, Galerie Fotoshooting, Beispielbilder',
    canonical: '/galerie',
  },
};

/**
 * Helper function to get SEO config for a path
 * Returns default config if path not found
 */
export function getSEOConfig(path: string): PageSEO {
  // Normalize path (ensure trailing slash consistency)
  const normalizedPath = path.endsWith('/') && path !== '/' 
    ? path 
    : (seoConfig[path + '/'] ? path + '/' : path);
  
  return seoConfig[normalizedPath] || seoConfig[path] || {
    title: `${SITE.name} | Fotograf in Wien`,
    h1: SITE.name,
    description: 'Professionelle Fotografie in Wien für Familie, Baby und Business.',
    canonical: path,
  };
}

/**
 * Validation helper - use in development to catch missing SEO
 */
export function validateSEO(path: string): { isValid: boolean; warnings: string[] } {
  const warnings: string[] = [];
  const config = seoConfig[path];
  
  if (!config) {
    warnings.push(`Missing SEO config for path: ${path}`);
    return { isValid: false, warnings };
  }
  
  if (config.title.length > 60) {
    warnings.push(`Title too long (${config.title.length} chars): ${config.title}`);
  }
  
  if (config.description.length < 140 || config.description.length > 160) {
    warnings.push(`Description length (${config.description.length} chars) should be 140-160`);
  }
  
  return { isValid: warnings.length === 0, warnings };
}
