import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ChevronRight } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { SITE } from '../../config/site';

/**
 * Route-driven breadcrumbs: renders a visible trail AND BreadcrumbList JSON-LD
 * (breadcrumbs still produce rich results in Google). Derived from the URL so it
 * works on every service page / blog post / case study with no per-page wiring.
 * Hidden on the homepage and on app/utility routes.
 */
const ORIGIN = (SITE.url || 'https://www.newagefotografie.com').replace(/\/+$/, '');

// Nice labels for known segments; unknown slugs are prettified from the URL.
const LABELS: Record<string, { de: string; en: string }> = {
  'blog': { de: 'Blog', en: 'Blog' },
  'case-studies': { de: 'Fallstudien', en: 'Case Studies' },
  'vouchers': { de: 'Gutscheine', en: 'Vouchers' },
  'preise': { de: 'Preise', en: 'Prices' },
  'pricing': { de: 'Preise', en: 'Prices' },
  'kontakt': { de: 'Kontakt', en: 'Contact' },
  'contact': { de: 'Kontakt', en: 'Contact' },
  'warteliste': { de: 'Warteliste', en: 'Waitlist' },
  'waitlist': { de: 'Warteliste', en: 'Waitlist' },
  'ueber-uns': { de: 'Über uns', en: 'About Us' },
  'about-us': { de: 'Über uns', en: 'About Us' },
  'portfolio': { de: 'Portfolio', en: 'Portfolio' },
  'fotoshootings': { de: 'Fotoshootings', en: 'Photo Shoots' },
  'galleries': { de: 'Galerien', en: 'Galleries' },
  'faq': { de: 'FAQ', en: 'FAQ' },
  'kundenstimmen': { de: 'Kundenstimmen', en: 'Reviews' },
  'warum-new-age-fotografie': { de: 'Warum New Age Fotografie?', en: 'Why New Age Fotografie?' },
};

const SKIP_PREFIXES = ['/admin', '/checkout', '/cart', '/gallery/', '/invoice/', '/account', '/my-archive', '/order-complete'];

function prettify(slug: string): string {
  return slug
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

const Breadcrumbs: React.FC = () => {
  const { pathname } = useLocation();
  const { language } = useLanguage();
  const de = language === 'de';

  // Home / app routes → no breadcrumbs.
  if (pathname === '/' || pathname === '/en' || pathname === '/en/') return null;
  if (SKIP_PREFIXES.some((p) => pathname.startsWith(p))) return null;

  let segments = pathname.split('/').filter(Boolean);
  const isEn = segments[0] === 'en';
  if (isEn) segments = segments.slice(1);
  if (segments.length === 0) return null;

  const homeUrl = isEn ? '/en/' : '/';
  const label = (seg: string) => {
    const hit = LABELS[seg];
    return hit ? (de ? hit.de : hit.en) : prettify(seg);
  };

  // Build cumulative crumbs. The last one is the current page (not a link).
  const crumbs: Array<{ name: string; url: string }> = [
    { name: de ? 'Startseite' : 'Home', url: homeUrl },
  ];
  let acc = isEn ? '/en' : '';
  segments.forEach((seg) => {
    acc += `/${seg}`;
    crumbs.push({ name: label(seg), url: `${acc}/` });
  });

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      // Google recommends omitting `item` on the last (current) crumb.
      ...(i < crumbs.length - 1 ? { item: `${ORIGIN}${c.url}` } : {}),
    })),
  };

  return (
    <nav aria-label="Breadcrumb" className="container mx-auto px-4 pt-4 text-sm text-gray-500">
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>
      <ol className="flex flex-wrap items-center gap-1">
        {crumbs.map((c, i) => {
          const isLast = i === crumbs.length - 1;
          return (
            <li key={c.url} className="flex items-center gap-1">
              {isLast ? (
                <span className="text-gray-700 font-medium" aria-current="page">{c.name}</span>
              ) : (
                <>
                  <Link to={c.url} className="hover:text-purple-700 transition-colors">{c.name}</Link>
                  <ChevronRight size={14} className="text-gray-400" aria-hidden="true" />
                </>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export default Breadcrumbs;
