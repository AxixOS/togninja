import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuthorityMap } from '../../hooks/useAuthorityMap';
import { SITE } from '../../config/site';

interface PillarLink {
  title: string;
  titleEn: string;
  path: string;
  description: string;
  descriptionEn: string;
  badge?: string;
  badgeEn?: string;
}

// All primary pillar + cluster pages grouped for cross-linking from support pages
const ALL_PILLARS: PillarLink[] = [
  { title: 'Familienfotos Wien', titleEn: 'Family Photos Vienna', path: '/familienfotos-wien/', description: 'Studio & Outdoor, bis 12 Personen', descriptionEn: 'Studio & outdoor, up to 12 people', badge: 'Beliebt', badgeEn: 'Popular' },
  { title: 'Neugeborenenfotos Wien', titleEn: 'Newborn Photos Vienna', path: '/neugeborenenfotos-wien/', description: 'Ab 5 Tage nach der Geburt', descriptionEn: 'From 5 days after birth', badge: 'Top', badgeEn: 'Top' },
  { title: 'Schwangerschaftsfotos Wien', titleEn: 'Maternity Photos Vienna', path: '/schwangerschaftsfotos-wien/', description: 'Babybauch-Shooting im Studio', descriptionEn: 'Baby bump shoot in the studio' },
  { title: 'Babyfotos Wien', titleEn: 'Baby Photos Vienna', path: '/babyfotos-wien/', description: 'Babys von 3–12 Monaten', descriptionEn: 'Babies aged 3–12 months' },
  { title: 'Kinderfotografie Wien', titleEn: 'Children’s Photography Vienna', path: '/kinder-fotografie-wien/', description: 'Natürliche Kinderportraits', descriptionEn: 'Natural portraits of children' },
  { title: 'Business Portrait Wien', titleEn: 'Business Portraits Vienna', path: '/business-portrait-wien/', description: 'LinkedIn, Website & HR', descriptionEn: 'LinkedIn, website & HR', badge: 'Business', badgeEn: 'Business' },
  { title: 'Teamfotos Wien', titleEn: 'Team Photos Vienna', path: '/teamfotos-wien/', description: 'Einheitliche Mitarbeiterbilder', descriptionEn: 'Consistent staff headshots' },
  { title: 'Bewerbungsfotos Wien', titleEn: 'Application Headshots Vienna', path: '/bewerbungsfotos-wien/', description: 'Professionelle Bewerbungsbilder', descriptionEn: 'Professional application photos' },
  { title: 'Hochzeitsfotografie Wien', titleEn: 'Wedding Photography Vienna', path: '/hochzeitsfotografie-wien/', description: 'Für euren besonderen Tag', descriptionEn: 'For your special day' },
  { title: 'Eventfotografie Wien', titleEn: 'Event Photography Vienna', path: '/eventfotografie-wien/', description: 'Firmen- & Privatevent-Reportagen', descriptionEn: 'Corporate & private event coverage' },
  { title: 'Studio-Fotografie Wien', titleEn: 'Studio Photography Vienna', path: '/studio-fotografie-wien/', description: 'Modernes Fotostudio Wien 5', descriptionEn: 'Modern photo studio in Vienna 5' },
  { title: 'Portraitfotografie Wien', titleEn: 'Portrait Photography Vienna', path: '/portrait-fotografie-wien/', description: 'Persönliche Portraits', descriptionEn: 'Personal portraits' },
  { title: 'Produktfotografie Wien', titleEn: 'Product Photography Vienna', path: '/produkt-fotografie-wien/', description: 'E-Commerce & Amazon Produktfotos', descriptionEn: 'E-commerce & Amazon product photos' },
  { title: 'Immobilienfotografie Wien', titleEn: 'Real Estate Photography Vienna', path: '/immobilien-fotografie-wien/', description: 'Architektur- & Immobilienfotos', descriptionEn: 'Architecture & real estate photos' },
  { title: 'Schul- & Hochschulfotografie Wien', titleEn: 'School & University Photography Vienna', path: '/schul-und-hochschulfotografie-wien/', description: 'Klassenfotos, Matura & Sponsion', descriptionEn: 'Class photos, Matura & graduation', badge: 'Bildung', badgeEn: 'Education' },
];

interface PillarLinksBlockProps {
  /** Exclude the current page from the list */
  currentPath?: string;
  title?: string;
  /** Show only top N pillars (default: all) */
  limit?: number;
}

export function PillarLinksBlock({
  currentPath,
  title,
  limit,
}: PillarLinksBlockProps) {
  const { language } = useLanguage();
  const de = language === 'de';
  const headingText = title ?? (de ? 'Alle Fotoshootings in Wien' : 'All Photo Sessions in Vienna');
  const normalizedCurrent = currentPath
    ? currentPath.endsWith('/') ? currentPath : `${currentPath}/`
    : null;

  // Studios with their own Authority Map list their pillars; New Age (default map) keeps
  // its full hard-coded pillar grid.
  const { map, isCustom } = useAuthorityMap();
  const pillarSource: PillarLink[] = isCustom
    ? map.pillars.map((p) => ({ title: p.label, titleEn: p.label, path: p.href, description: '', descriptionEn: '' }))
    : ALL_PILLARS;

  const links = pillarSource.filter(l => {
    const lp = l.path.endsWith('/') ? l.path : `${l.path}/`;
    return lp !== normalizedCurrent;
  }).slice(0, limit ?? pillarSource.length);

  return (
    <section className="py-14 bg-white border-t border-gray-100" data-seo="pillar-links">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-2xl md:text-3xl font-bold text-purple-900 mb-3 text-center">
          {headingText}
        </h2>
        {/* Was a fixed "Studio Wehrgasse 11A/2+5, 1050 Wien" strapline on every page. */}
        <p className="text-center text-gray-500 mb-8 text-sm">
          {de
            ? `Professionelle Fotografie${SITE.address.city ? ` in ${SITE.address.city}` : ''} – ${SITE.name}`
            : `Professional photography${SITE.address.city ? ` in ${SITE.address.city}` : ''} – ${SITE.name}`}
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {links.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className="group relative bg-gray-50 rounded-xl border border-gray-100 p-4 hover:bg-purple-50 hover:border-purple-200 transition-all"
            >
              {(de ? link.badge : link.badgeEn) && (
                <span className="absolute top-3 right-3 text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">
                  {de ? link.badge : link.badgeEn}
                </span>
              )}
              <h3 className="text-sm font-semibold text-gray-800 group-hover:text-purple-700 transition-colors leading-snug mb-1 pr-12">
                {de ? link.title : link.titleEn}
              </h3>
              <p className="text-xs text-gray-500 leading-snug mb-2">{de ? link.description : link.descriptionEn}</p>
              <span className="inline-flex items-center text-purple-600 text-xs font-medium group-hover:text-purple-700">
                {de ? 'Mehr' : 'More'} <ArrowRight className="ml-0.5 h-3 w-3" />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

export default PillarLinksBlock;
