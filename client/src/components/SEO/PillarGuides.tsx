import React from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, ArrowRight } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuthorityMap } from '../../hooks/useAuthorityMap';

interface Guide {
  slug: string;
  title: string;
}

/**
 * Pillar money page → informational cluster articles (the blog "Ratgeber").
 *
 * Closes the pillar→cluster DOWN-link direction of the topical-authority loop:
 * the money page sends authority/visitors down to its supporting guides, and
 * each guide links back UP via the "Passende Fotoshootings" block in
 * BlogPostPage. Add slugs here as new cluster articles are published.
 */
const GUIDES: Record<string, Guide[]> = {
  '/familienfotos-wien/': [
    { slug: 'familienfotos-locations-wien', title: 'Familienfotos im Studio in Wien – authentische Portraits' },
    { slug: 'familienfotos-in-wien-preise-ablauf-perfekte-vorbereitung', title: 'Familienfotos Wien: Preise, Ablauf & perfekte Vorbereitung' },
    { slug: 'familienfotos-im-studio-vs-outdoor-in-wien-was-passt-zu-euch', title: 'Studio vs. Outdoor – was passt zu euren Familienfotos?' },
    { slug: 'die-besten-outfits-fuer-familienfotos-in-wien', title: 'Die besten Outfits für Familienfotos in Wien' },
  ],
  '/business-portrait-wien/': [
    { slug: 'businessportraits-in-wien-preise-kleidung-erfolgstipps-f-r-starke-auftritte', title: 'Businessportraits Wien: Preise, Kleidung & Erfolgstipps' },
  ],
  '/schwangerschaftsfotos-wien/': [
    { slug: 'schwangerschaftsfotos-in-wien-ideen-kleidung-der-beste-zeitpunkt', title: 'Schwangerschaftsfotos Wien: Ideen, Kleidung & der beste Zeitpunkt' },
  ],
  '/neugeborenenfotos-wien/': [
    { slug: 'tipps-fuer-neugeborenenfotos-wien', title: 'Neugeborenenfotos Wien: Wann, wie & was Eltern wissen müssen' },
  ],
};

export const PillarGuides: React.FC<{ pillar: string }> = ({ pillar }) => {
  const { language } = useLanguage();
  // Studios with their own Authority Map render that pillar's cluster articles; New Age
  // (default map) keeps its exact hard-coded German guides.
  const { map, isCustom } = useAuthorityMap();
  const norm = (h: string) => (h.endsWith('/') ? h : `${h}/`);
  const customPillar = isCustom ? map.pillars.find((p) => norm(p.href) === norm(pillar)) : null;
  const guides: { to: string; title: string }[] = isCustom
    ? (customPillar?.clusters || []).map((c) => ({ to: c.href, title: c.label }))
    : (GUIDES[pillar] || []).map((g) => ({ to: `/blog/${g.slug}`, title: g.title }));
  // The legacy guide articles exist only in German — hide the block on EN. A studio's own
  // generated clusters are shown in whatever language they were generated in.
  if (!isCustom && language !== 'de') return null;
  if (!guides || guides.length === 0) return null;

  return (
    <section className="py-12 bg-white border-t border-gray-100">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-2xl md:text-3xl font-bold text-purple-900 mb-6 flex items-center gap-2">
          <BookOpen className="h-6 w-6" /> Ratgeber &amp; Tipps
        </h2>
        <ul className="space-y-3">
          {guides.map((g) => (
            <li key={g.to}>
              <Link
                to={g.to}
                className="group flex items-center justify-between rounded-lg border border-gray-100 p-4 hover:border-purple-200 hover:bg-purple-50 transition-colors"
              >
                <span className="font-medium text-purple-800 group-hover:text-purple-900">{g.title}</span>
                <ArrowRight className="h-4 w-4 text-purple-500 flex-shrink-0 ml-3" />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};

export default PillarGuides;
