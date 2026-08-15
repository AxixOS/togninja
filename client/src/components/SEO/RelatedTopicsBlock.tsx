import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { useAuthorityMap } from '../../hooks/useAuthorityMap';

/**
 * "You might also be interested in" — the internal-link block that carries topical
 * authority between a studio's pages.
 *
 * Everything here now comes from the studio's own Authority Map plus the handful of
 * pages every instance genuinely has. What used to be here was a table of fifteen
 * LinkItem constants pointing at /familienfotos-wien/, /babyfotos-wien/,
 * /gewerbliche-fotografie-wien/ and — worst of the set — a link labelled "Why <studio>?"
 * whose href was /warum-new-age-fotografie/: another business's name inside the buyer's
 * own URL. None of those routes exist on a buyer's site, so they fell through the
 * catch-all to the homepage, making this a "related topics" list where most entries went
 * nowhere.
 *
 * Those pages belong to the Vienna studio and are now that studio's own map rows. If you
 * are tempted to reintroduce a per-pathname default table here, note that the previous
 * one was keyed on paths only one tenant has.
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
  /** Optional explicit list, still honoured — a page that knows better than the map. */
  links?: LinkItem[];
  /** Optional title override. */
  title?: { de: string; en: string };
}

// The only routes that exist on EVERY instance, so the only ones safe to name in code.
// Anything service-shaped has to come from the map.
const UNIVERSAL: LinkItem[] = [
  { to: '/kundenstimmen/', de: 'Kundenstimmen – echte Bewertungen', en: 'Testimonials – real reviews' },
  { to: '/preise/', de: 'Preise & Pakete für Ihr Shooting', en: 'Pricing & packages for your shoot' },
  { to: '/kontakt', de: 'Kontakt – Termin oder Beratung anfragen', en: 'Contact – book a session or ask for advice' },
];

export const RelatedTopicsBlock: React.FC<RelatedTopicsBlockProps> = ({
  pathname,
  language: languageProp,
  links,
  title,
}) => {
  // Self-aware: a page that forgets to pass the prop still renders in the selected
  // language. An explicit prop wins if given.
  const { language: contextLanguage } = useLanguage();
  const language = languageProp ?? contextLanguage;

  const { map, loading } = useAuthorityMap();

  // Same reasoning as PillarLinksBlock: the prerenderer snapshots this component before
  // the map query resolves, so the loading state is what ships in the static file.
  if (loading && !links) return null;

  const norm = (p: string) => (p.endsWith('/') ? p : `${p}/`);

  const fromMap: LinkItem[] = (map.pillars || [])
    .filter((p: any) => p?.href && p?.label)
    .slice(0, 3)
    .map((p: any) => ({ to: p.href, de: p.label, en: p.label }));

  const items = (links ?? [...fromMap, ...UNIVERSAL]).filter(
    (item, i, all) =>
      all.findIndex((x) => x.to === item.to) === i && norm(item.to) !== norm(pathname),
  );

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
