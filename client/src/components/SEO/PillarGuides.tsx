import React from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, ArrowRight } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuthorityMap } from '../../hooks/useAuthorityMap';

/**
 * Pillar money page → informational cluster articles (the blog "Ratgeber").
 *
 * Closes the pillar→cluster DOWN-link direction of the topical-authority loop: the money
 * page sends authority and visitors down to its supporting guides, and each guide links
 * back UP via the "Passende Fotoshootings" block in BlogPostPage.
 *
 * The GUIDES table that used to sit here mapped four Vienna pillar paths to specific
 * German blog slugs. Those are the Vienna studio's articles and they are now that
 * studio's own map rows — a pillar carries its own `clusters`, which is the whole point
 * of the structure. Nothing about this loop needed hardcoding; it needed the map.
 */
export const PillarGuides: React.FC<{ pillar: string }> = ({ pillar }) => {
  const { language } = useLanguage();
  const { map, loading } = useAuthorityMap();
  if (loading) return null;

  const norm = (h: string) => (h.endsWith('/') ? h : `${h}/`);
  const matched = map.pillars.find((p) => norm(p.href) === norm(pillar));
  const guides: { to: string; title: string }[] = (matched?.clusters || []).map((c) => ({
    to: c.href,
    title: c.label,
  }));
  if (!guides.length) return null;

  return (
    <section className="py-12 bg-white border-t border-gray-100">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-2xl md:text-3xl font-bold text-purple-900 mb-6 flex items-center gap-2">
          {/* Was German-only, which was safe while the block was German-only content.
              Now that any studio's clusters render here, the heading follows the site. */}
          <BookOpen className="h-6 w-6" /> {language === 'de' ? 'Ratgeber & Tipps' : 'Guides & Tips'}
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
