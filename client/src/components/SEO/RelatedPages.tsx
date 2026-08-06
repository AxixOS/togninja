import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';

interface RelatedLink {
  href: string;
  label: string; // German label; EN swapped below
}

// Neutral "explore more" links shown at the foot of content pages. This used to be a large
// New-Age-specific Vienna internal-link map; the per-studio Authority Map (generated from
// the studio's OWN site, see server/lib/authority-from-crawl.ts) is the source of richer,
// studio-specific internal linking. Until a page consumes that, keep a small brand-agnostic
// conversion block (all links point to core pages every studio has).
const CONVERSION_LINKS: RelatedLink[] = [
  { href: '/preise/', label: 'Preise & Pakete' },
  { href: '/vouchers', label: 'Geschenkgutscheine' },
  { href: '/kontakt', label: 'Kontakt' },
  { href: '/warteliste', label: 'Termin buchen' },
];

const EN: Record<string, string> = {
  'Weitere Leistungen': 'Explore more',
  'Preise & Pakete': 'Pricing & Packages',
  'Geschenkgutscheine': 'Gift Vouchers',
  'Kontakt': 'Contact',
  'Termin buchen': 'Book a session',
};

// Home + admin + transactional pages never show the block.
const SKIP_PATHS = new Set<string>([
  '/', '/en', '/en/',
  '/admin', '/checkout', '/cart', '/order-complete',
  '/vouchers/success', '/voucher/thank-you',
  '/impressum/', '/agb/', '/datenschutz/',
  '/account', '/my-archive', '/galleries/', '/gallery/',
]);

const RelatedPages: React.FC = () => {
  const { pathname } = useLocation();
  const { language } = useLanguage();
  const tr = (s: string) => (language === 'de' ? s : (EN[s] ?? s));

  if (
    SKIP_PATHS.has(pathname) ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/checkout') ||
    pathname.startsWith('/gallery/') ||
    pathname.startsWith('/invoice/')
  ) {
    return null;
  }

  // Don't link to the page you're already on.
  const filtered = CONVERSION_LINKS.filter(
    (l) => l.href !== pathname && l.href !== pathname.replace(/\/$/, ''),
  );
  if (filtered.length === 0) return null;

  return (
    <section className="bg-gray-50 border-t border-gray-200 py-8">
      <div className="container mx-auto px-4">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
          {tr('Weitere Leistungen')}
        </h2>
        <ul className="flex flex-wrap gap-3">
          {filtered.map((link) => (
            <li key={link.href}>
              <Link
                to={link.href}
                className="inline-block px-4 py-2 bg-white border border-purple-200 text-purple-700 rounded-full text-sm font-medium hover:bg-purple-50 hover:border-purple-400 transition-colors"
              >
                {tr(link.label)}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};

export default RelatedPages;
