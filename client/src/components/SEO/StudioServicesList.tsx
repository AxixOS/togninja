import React from 'react';
import { Link } from 'react-router-dom';
import { useAuthorityMap } from '../../hooks/useAuthorityMap';

/**
 * The studio's own services, wherever a page wants to list them.
 *
 * Three pages — contact, waitlist and vouchers — each carried their own hardcoded trio or
 * quartet: Family Photos, Newborn Photos, Business Portraits, Maternity, all pointing at
 * /fotoshootings. Those are the origin studio's services, and they survived every earlier
 * pass because they live in translation keys rather than as visible literals, so a search
 * for "Vienna" or "New Age" never found them. A fashion photographer's contact page offered
 * newborn sessions.
 *
 * Reads the Authority Map, like the homepage grid and the pillar blocks, so all of them
 * name the same services. Renders nothing at all when the studio has no map yet — the rule
 * every other block has kept since v1.9.0.
 */
export const StudioServicesList: React.FC<{
  heading?: string;
  /** 'cards' for the contact page's boxed grid, 'links' for the simple lists. */
  variant?: 'cards' | 'links';
  limit?: number;
}> = ({ heading, variant = 'links', limit = 6 }) => {
  const { map, loading } = useAuthorityMap();
  if (loading) return null;

  const services = (map?.pillars || [])
    .filter((p: any) => p?.href && p?.label && p.hasPage !== false)
    .slice(0, limit);
  if (!services.length) return null;

  return (
    <div>
      {heading && (
        <h3 className="text-xl font-bold text-gray-900 mb-4 text-center">{heading}</h3>
      )}
      {variant === 'cards' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {services.slice(0, 3).map((s: any) => (
            <Link
              key={s.href}
              to={s.href}
              className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow group"
            >
              <h3 className="font-semibold text-gray-900 group-hover:text-purple-600 mb-2">{s.label}</h3>
              {s.keyphrase && <p className="text-gray-600 text-sm">{s.keyphrase}</p>}
            </Link>
          ))}
        </div>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl mx-auto">
          {services.map((s: any) => (
            <li key={s.href}>
              <Link
                to={s.href}
                className="block py-2 px-4 rounded-lg text-purple-700 hover:bg-purple-50 hover:text-purple-900 font-medium transition-colors text-center"
              >
                {s.label}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default StudioServicesList;
