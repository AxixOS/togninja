import React from 'react';
import { Link } from 'react-router-dom';
import { SITE } from '../../config/site';
import { useLanguage } from '../../context/LanguageContext';
import { useAuthorityMap } from '../../hooks/useAuthorityMap';

/**
 * Additive "Das könnte Sie auch interessieren" block.
 * - Pure, no styling beyond Tailwind utility classes already in use.
 * - Page-aware: provide `pathname` (defaults to no-op when no mapping).
 * - Bilingual via the optional `language` prop (default: 'de').
 *
 * Safe to drop into any page just before </Layout>. Does NOT alter
 * existing layout, components, or behavior.
 */

type Lang = 'de' | 'en';

interface LinkItem {
  to: string;
  de: string;
  en: string;
}

interface RelatedTopicsBlockProps {
  pathname: string;
  language?: Lang;
  /** Optional override of the default mapping for this pathname. */
  links?: LinkItem[];
  /** Optional title override. */
  title?: { de: string; en: string };
}

// Reusable anchor-rich link entries (German labels are keyword-rich)
const FAMILIE: LinkItem = {
  to: '/familienfotos-wien/',
  de: 'Familienfotografie – Studio & Outdoor',
  en: 'Family Photography – Studio & Outdoor',
};
const NEUGEBORENE: LinkItem = {
  to: '/neugeborenenfotos-wien/',
  de: 'Neugeborenenfotos – natürlich & sicher',
  en: 'Newborn Photography – natural & safe',
};
const BABY: LinkItem = {
  to: '/babyfotos-wien/',
  de: 'Babyfotografie – die ersten Monate',
  en: 'Baby Photography – the first months',
};
const SCHWANGER: LinkItem = {
  to: '/schwangerschaftsfotos-wien/',
  de: 'Schwangerschaftsfotos – Babybauch-Shooting',
  en: 'Maternity Photoshoots – baby bump session',
};
const BUSINESS: LinkItem = {
  to: '/business-portrait-wien/',
  de: 'Business Portraits – LinkedIn & Bewerbung',
  en: 'Business Headshots – LinkedIn & applications',
};
const PORTFOLIO: LinkItem = {
  to: '/portfolio',
  de: 'Portfolio – ausgewählte Fotoarbeiten',
  en: 'Portfolio – selected photo work',
};
const PREISE: LinkItem = {
  to: '/preise/',
  de: 'Preise & Pakete für Ihr Shooting',
  en: 'Pricing & packages for your shoot',
};
// Consolidated on /preise/ — /fotoshooting-preise-wien/ 301s there (duplicate
// pricing pages were splitting authority; July 2026 SEO audit).
const PREISE_WIEN: LinkItem = {
  to: '/preise/',
  de: 'Fotoshooting Preise – transparenter Überblick',
  en: 'Photoshoot Pricing – transparent overview',
};
const KONTAKT: LinkItem = {
  to: '/kontakt',
  de: 'Kontakt – Termin oder Beratung anfragen',
  en: 'Contact – book a session or ask for advice',
};
const WARTELISTE: LinkItem = {
  to: '/warteliste',
  de: 'Warteliste – als Erste/r über freie Termine erfahren',
  en: 'Waitlist – be first to hear about new dates',
};
const GUTSCHEIN: LinkItem = {
  to: '/vouchers',
  de: 'Geschenkgutscheine – Fotoshooting verschenken',
  en: 'Gift vouchers – give a photoshoot as a gift',
};
const KUNDENSTIMMEN: LinkItem = {
  to: '/kundenstimmen/',
  de: 'Kundenstimmen – echte Bewertungen',
  en: 'Testimonials – real reviews',
};
const UEBER_UNS: LinkItem = {
  to: '/ueber-uns/',
  de: `Über uns – das Team von ${SITE.name}`,
  en: `About us – the ${SITE.name} team`,
};
const GEWERBLICH: LinkItem = {
  to: '/gewerbliche-fotografie-wien/',
  de: 'Gewerbliche Fotografie – Produkte, Immobilien & Events',
  en: 'Commercial photography – products, real estate & events',
};
const WARUM: LinkItem = {
  to: '/warum-new-age-fotografie/',
  de: `Warum ${SITE.name}? Bewertungen, Team & FAQ`,
  en: `Why ${SITE.name}? Reviews, team & FAQ`,
};
const BLOG: LinkItem = {
  to: '/blog',
  de: 'Fotografie-Blog – Tipps & Inspiration',
  en: 'Photography blog – tips & inspiration',
};

// Per-pathname default mapping (matches Step 2 of the IA prompt)
const DEFAULTS: Record<string, LinkItem[]> = {
  // WARTELISTE removed from these mappings (SEO audit: the waitlist page was
  // the most-linked page on the site — a utility page absorbing the equity
  // that should flow to service/money pages). The header nav still links it
  // sitewide; these blocks now push equity to services, pricing and reviews.
  '/portfolio':       [FAMILIE, BABY, BUSINESS, PREISE],
  '/ueber-uns/':      [FAMILIE, KUNDENSTIMMEN, WARUM, KONTAKT, PREISE_WIEN],
  '/kundenstimmen/':  [PORTFOLIO, WARUM, PREISE, FAMILIE, BUSINESS],
  '/kontakt':         [FAMILIE, BUSINESS, KUNDENSTIMMEN, GUTSCHEIN],
  '/preise/':         [FAMILIE, NEUGEBORENE, BUSINESS, GUTSCHEIN],
  '/fotoshooting-preise-wien/': [FAMILIE, BABY, BUSINESS, PREISE, KONTAKT],
  '/familienfotos-wien/':       [BABY, NEUGEBORENE, SCHWANGER, PREISE_WIEN, GUTSCHEIN],
  '/babyfotos-wien/':           [NEUGEBORENE, FAMILIE, SCHWANGER, PREISE_WIEN, GUTSCHEIN],
  '/neugeborenenfotos-wien/':   [BABY, FAMILIE, SCHWANGER, PREISE_WIEN, GUTSCHEIN],
  '/schwangerschaftsfotos-wien/': [BABY, NEUGEBORENE, FAMILIE, PREISE_WIEN, GUTSCHEIN],
  '/business-portrait-wien/':   [BUSINESS, GEWERBLICH, PORTFOLIO, KONTAKT, PREISE_WIEN],
  '/galerie':         [PORTFOLIO, FAMILIE, BUSINESS, PREISE],
  '/galleries':       [PORTFOLIO, FAMILIE, BUSINESS, PREISE],
  '/blog':            [FAMILIE, BABY, BUSINESS, KUNDENSTIMMEN, PREISE_WIEN],
};

const FALLBACK: LinkItem[] = [FAMILIE, BABY, BUSINESS, KONTAKT, PREISE_WIEN];

export const RelatedTopicsBlock: React.FC<RelatedTopicsBlockProps> = ({
  pathname,
  language: languageProp,
  links,
  title,
}) => {
  // Self-aware: a page that forgets to pass the prop still renders in the
  // selected language. An explicit prop wins if given.
  const { language: contextLanguage } = useLanguage();
  const language = languageProp ?? contextLanguage;

  // Every table above is the origin studio's internal-link map: /familienfotos-wien/,
  // /babyfotos-wien/, /gewerbliche-fotografie-wien/ and — worst — a link labelled
  // "Why <studio>?" pointing at /warum-new-age-fotografie/, another business's name
  // in the buyer's own URL. None of those routes exist for a studio with its own
  // Authority Map, so they fell through the catch-all and returned the visitor to
  // the homepage: a "you might also be interested in" list where most entries go
  // nowhere.
  //
  // A studio with its OWN map gets its own services here, plus only the pages every
  // instance really has. The legacy tables stay for the origin studio, whose map is
  // the default one and whose routes those are. Same isCustom test PillarLinksBlock
  // uses, so the two blocks cannot disagree about whose services these are.
  const { map: authorityMap, isCustom } = useAuthorityMap();

  const fromMap: LinkItem[] = isCustom
    ? (authorityMap?.pillars || [])
        .filter((p: any) => p?.href && p?.label && p.hasPage !== false)
        .slice(0, 3)
        .map((p: any) => ({ to: p.href, de: p.label, en: p.label }))
    : [];

  const items =
    links ??
    (isCustom
      ? [...fromMap, KUNDENSTIMMEN, PREISE, KONTAKT].filter(
          (item, i, all) => all.findIndex((x) => x.to === item.to) === i && item.to !== pathname,
        )
      : DEFAULTS[pathname] ??
        DEFAULTS[pathname.endsWith('/') ? pathname.slice(0, -1) : pathname + '/'] ??
        FALLBACK);

  // Nothing worth linking to — say nothing, rather than a heading over an empty list.
  if (!items.length) return null;

  const heading = title
    ? title[language]
    : language === 'de'
    ? 'Das könnte Sie auch interessieren'
    : 'You might also be interested in';

  return (
    <section
      className="bg-white border-t border-gray-100"
      aria-labelledby="related-topics-heading"
    >
      <div className="container mx-auto px-4 py-10 max-w-4xl">
        <h2
          id="related-topics-heading"
          className="text-xl md:text-2xl font-bold text-purple-900 mb-5 text-center"
        >
          {heading}
        </h2>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {items.map((item) => (
            <li key={item.to}>
              <Link
                to={item.to}
                className="block py-2 px-4 rounded-lg text-purple-700 hover:bg-purple-50 hover:text-purple-900 font-medium transition-colors"
              >
                {language === 'de' ? item.de : item.en}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};

export default RelatedTopicsBlock;
