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

// The fifteen "… Wien" cards that used to live here have moved to studio_configs as the
// Vienna studio's OWN Authority Map (shared/authorityMap.ts NEW_AGE_AUTHORITY_MAP, loaded
// by scripts/seed-authority-map.mjs). They were never a default — they were one tenant's
// service catalogue standing in for everybody's, and because this block renders on nine
// prerendered routes they were baked into static HTML shipped to every buyer.

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
  // Same guard as the strapline below: the city and its preposition live or die
  // together, so an unset city yields "Alle Fotoshootings" rather than a dangling
  // "in " — and a studio in Hove is not advertised as being in Vienna.
  const inCity = SITE.address.city ? ` in ${SITE.address.city}` : '';
  const headingText = title ?? (de ? `Alle Fotoshootings${inCity}` : `All Photo Sessions${inCity}`);
  const normalizedCurrent = currentPath
    ? currentPath.endsWith('/') ? currentPath : `${currentPath}/`
    : null;

  const { map, loading } = useAuthorityMap();

  // Render nothing until the map has actually loaded. The prerenderer fires 'ready' two
  // animation frames after mount, well before /api/authority-map resolves, so whatever
  // this returns during loading is what gets written into the static HTML for nine public
  // routes. Returning null here means those files contain no pillar grid at all rather
  // than the wrong studio's.
  if (loading) return null;

  const pillarSource: PillarLink[] = map.pillars.map((p) => ({
    title: p.label, titleEn: p.label, path: p.href, description: '', descriptionEn: '',
  }));

  const links = pillarSource.filter(l => {
    const lp = l.path.endsWith('/') ? l.path : `${l.path}/`;
    return lp !== normalizedCurrent;
  }).slice(0, limit ?? pillarSource.length);

  // No pillars, no section. A studio mid-onboarding, or one whose crawl found no
  // services, gets silence rather than a heading and strapline over an empty grid —
  // the same contract PartnerLogos and GoogleReviews already keep.
  if (links.length === 0) return null;

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
