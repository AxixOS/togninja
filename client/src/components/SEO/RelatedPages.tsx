import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';

interface RelatedLink {
  href: string;
  label: string;
}

// EN display translations for the German link labels/heading below. The data
// map keeps its German keyword anchors; only rendered text is swapped on EN.
const EN: Record<string, string> = {
  'Weitere Leistungen': 'More Services',
  'Preise & Pakete': 'Pricing & Packages',
  'Termin buchen': 'Book a session',
  'Geschenkgutscheine': 'Gift Vouchers',
  'Gift Vouchers (EN)': 'Gift Vouchers',
  'Warteliste': 'Waitlist',
  'Kontakt & Beratung': 'Contact & advice',
  'Kundenstimmen': 'Testimonials',
  'Über uns': 'About us',
  'Kontakt': 'Contact',
  'Persönliche Beratung': 'Personal advice',
  'Familien-Gutschein': 'Family Voucher',
  'Neugeborenen-Gutschein': 'Newborn Voucher',
  'Schwangerschafts-Gutschein': 'Maternity Voucher',
  'Alle Gutscheine': 'All Vouchers',
  'Familienfotos Wien': 'Family Photos Vienna',
  'Familien-Fotoshooting Wien': 'Family Photo Session Vienna',
  'Neugeborenenfotos Wien': 'Newborn Photos Vienna',
  'Schwangerschaftsfotos Wien': 'Maternity Photos Vienna',
  'Babyfotos Wien': 'Baby Photos Vienna',
  'Kinderfotografie Wien': 'Children’s Photography Vienna',
  'Business Portrait Wien': 'Business Portraits Vienna',
  'Bewerbungsfotos Wien': 'Application Headshots Vienna',
  'Teamfotos Wien': 'Team Photos Vienna',
  'Portraitfotografie Wien': 'Portrait Photography Vienna',
  'Eventfotografie Wien': 'Event Photography Vienna',
  'Hochzeitsfotografie Wien': 'Wedding Photography Vienna',
  'Studio-Fotografie Wien': 'Studio Photography Vienna',
  'Produktfotografie Wien': 'Product Photography Vienna',
  'Immobilienfotografie Wien': 'Real Estate Photography Vienna',
  'Schul- & Hochschulfotografie Wien': 'School & University Photography Vienna',
};

// Site structure: maps each page to its relevant internal links
const SITE_LINKS: Record<string, RelatedLink[]> = {
  // Homepage
  '/': [
    { href: '/familienfotos-wien/', label: 'Familienfotos Wien' },
    { href: '/neugeborenenfotos-wien/', label: 'Neugeborenenfotos Wien' },
    { href: '/schwangerschaftsfotos-wien/', label: 'Schwangerschaftsfotos Wien' },
    { href: '/business-portrait-wien/', label: 'Business Portrait Wien' },
    { href: '/hochzeitsfotografie-wien/', label: 'Hochzeitsfotografie Wien' },
    { href: '/preise/', label: 'Preise & Pakete' },
    { href: '/warteliste/', label: 'Termin buchen' },
    { href: '/vouchers/', label: 'Geschenkgutscheine' },
  ],

  // --- FAMILY CLUSTER (Pillar: /familienfotos-wien/) ---
  '/familienfotos-wien/': [
    { href: '/familien-fotoshooting-wien/', label: 'Familien-Fotoshooting Wien' },
    { href: '/neugeborenenfotos-wien/', label: 'Neugeborenenfotos Wien' },
    { href: '/babyfotos-wien/', label: 'Babyfotos Wien' },
    { href: '/kinder-fotografie-wien/', label: 'Kinderfotografie Wien' },
    { href: '/schwangerschaftsfotos-wien/', label: 'Schwangerschaftsfotos Wien' },
    { href: '/studio-fotografie-wien/', label: 'Studio-Fotografie Wien' },
    { href: '/preise/', label: 'Preise & Pakete' },
    { href: '/warteliste/', label: 'Termin buchen' },
  ],
  '/familien-fotoshooting-wien/': [
    { href: '/familienfotos-wien/', label: 'Familienfotos Wien' },
    { href: '/neugeborenenfotos-wien/', label: 'Neugeborenenfotos Wien' },
    { href: '/kinder-fotografie-wien/', label: 'Kinderfotografie Wien' },
    { href: '/babyfotos-wien/', label: 'Babyfotos Wien' },
    { href: '/schwangerschaftsfotos-wien/', label: 'Schwangerschaftsfotos Wien' },
    { href: '/preise/', label: 'Preise & Pakete' },
    { href: '/warteliste/', label: 'Termin buchen' },
  ],
  '/neugeborenenfotos-wien/': [
    { href: '/familienfotos-wien/', label: 'Familienfotos Wien' },
    { href: '/babyfotos-wien/', label: 'Babyfotos Wien' },
    { href: '/schwangerschaftsfotos-wien/', label: 'Schwangerschaftsfotos Wien' },
    { href: '/kinder-fotografie-wien/', label: 'Kinderfotografie Wien' },
    { href: '/studio-fotografie-wien/', label: 'Studio-Fotografie Wien' },
    { href: '/gutschein/newborn/', label: 'Neugeborenen-Gutschein' },
    { href: '/preise/', label: 'Preise & Pakete' },
    { href: '/warteliste/', label: 'Termin buchen' },
  ],
  '/babyfotos-wien/': [
    { href: '/neugeborenenfotos-wien/', label: 'Neugeborenenfotos Wien' },
    { href: '/familienfotos-wien/', label: 'Familienfotos Wien' },
    { href: '/kinder-fotografie-wien/', label: 'Kinderfotografie Wien' },
    { href: '/schwangerschaftsfotos-wien/', label: 'Schwangerschaftsfotos Wien' },
    { href: '/preise/', label: 'Preise & Pakete' },
    { href: '/warteliste/', label: 'Termin buchen' },
  ],
  '/baby-fotografie-wien/': [
    { href: '/neugeborenenfotos-wien/', label: 'Neugeborenenfotos Wien' },
    { href: '/familienfotos-wien/', label: 'Familienfotos Wien' },
    { href: '/schwangerschaftsfotos-wien/', label: 'Schwangerschaftsfotos Wien' },
    { href: '/kinder-fotografie-wien/', label: 'Kinderfotografie Wien' },
    { href: '/preise/', label: 'Preise & Pakete' },
    { href: '/warteliste/', label: 'Termin buchen' },
  ],
  '/kinder-fotografie-wien/': [
    { href: '/familienfotos-wien/', label: 'Familienfotos Wien' },
    { href: '/neugeborenenfotos-wien/', label: 'Neugeborenenfotos Wien' },
    { href: '/babyfotos-wien/', label: 'Babyfotos Wien' },
    { href: '/familien-fotoshooting-wien/', label: 'Familien-Fotoshooting Wien' },
    { href: '/preise/', label: 'Preise & Pakete' },
    { href: '/warteliste/', label: 'Termin buchen' },
  ],
  '/schwangerschaftsfotos-wien/': [
    { href: '/neugeborenenfotos-wien/', label: 'Neugeborenenfotos Wien' },
    { href: '/familienfotos-wien/', label: 'Familienfotos Wien' },
    { href: '/babyfotos-wien/', label: 'Babyfotos Wien' },
    { href: '/kinder-fotografie-wien/', label: 'Kinderfotografie Wien' },
    { href: '/gutschein/maternity/', label: 'Schwangerschafts-Gutschein' },
    { href: '/preise/', label: 'Preise & Pakete' },
    { href: '/warteliste/', label: 'Termin buchen' },
  ],

  // --- BUSINESS CLUSTER (Pillar: /business-portrait-wien/) ---
  '/business-portrait-wien/': [
    { href: '/teamfotos-wien/', label: 'Teamfotos Wien' },
    { href: '/bewerbungsfotos-wien/', label: 'Bewerbungsfotos Wien' },
    { href: '/portrait-fotografie-wien/', label: 'Portraitfotografie Wien' },
    { href: '/schul-und-hochschulfotografie-wien/', label: 'Schul- & Hochschulfotografie Wien' },
    { href: '/eventfotografie-wien/', label: 'Eventfotografie Wien' },
    { href: '/preise/', label: 'Preise & Pakete' },
    { href: '/warteliste/', label: 'Termin buchen' },
  ],
  '/schul-und-hochschulfotografie-wien/': [
    { href: '/business-portrait-wien/', label: 'Business Portrait Wien' },
    { href: '/teamfotos-wien/', label: 'Teamfotos Wien' },
    { href: '/bewerbungsfotos-wien/', label: 'Bewerbungsfotos Wien' },
    { href: '/eventfotografie-wien/', label: 'Eventfotografie Wien' },
    { href: '/kontakt', label: 'Kontakt & Beratung' },
    { href: '/warteliste/', label: 'Termin buchen' },
  ],
  '/teamfotos-wien/': [
    { href: '/business-portrait-wien/', label: 'Business Portrait Wien' },
    { href: '/bewerbungsfotos-wien/', label: 'Bewerbungsfotos Wien' },
    { href: '/eventfotografie-wien/', label: 'Eventfotografie Wien' },
    { href: '/portrait-fotografie-wien/', label: 'Portraitfotografie Wien' },
    { href: '/studio-fotografie-wien/', label: 'Studio-Fotografie Wien' },
    { href: '/preise/', label: 'Preise & Pakete' },
    { href: '/warteliste/', label: 'Termin buchen' },
  ],
  '/bewerbungsfotos-wien/': [
    { href: '/business-portrait-wien/', label: 'Business Portrait Wien' },
    { href: '/portrait-fotografie-wien/', label: 'Portraitfotografie Wien' },
    { href: '/teamfotos-wien/', label: 'Teamfotos Wien' },
    { href: '/studio-fotografie-wien/', label: 'Studio-Fotografie Wien' },
    { href: '/preise/', label: 'Preise & Pakete' },
    { href: '/warteliste/', label: 'Termin buchen' },
  ],
  '/portrait-fotografie-wien/': [
    { href: '/business-portrait-wien/', label: 'Business Portrait Wien' },
    { href: '/bewerbungsfotos-wien/', label: 'Bewerbungsfotos Wien' },
    { href: '/familienfotos-wien/', label: 'Familienfotos Wien' },
    { href: '/studio-fotografie-wien/', label: 'Studio-Fotografie Wien' },
    { href: '/preise/', label: 'Preise & Pakete' },
    { href: '/warteliste/', label: 'Termin buchen' },
  ],

  // --- EVENT / WEDDING CLUSTER (Pillar: /hochzeitsfotografie-wien/) ---
  '/eventfotografie-wien/': [
    { href: '/hochzeitsfotografie-wien/', label: 'Hochzeitsfotografie Wien' },
    { href: '/business-portrait-wien/', label: 'Business Portrait Wien' },
    { href: '/teamfotos-wien/', label: 'Teamfotos Wien' },
    { href: '/portrait-fotografie-wien/', label: 'Portraitfotografie Wien' },
    { href: '/preise/', label: 'Preise & Pakete' },
    { href: '/warteliste/', label: 'Termin buchen' },
  ],
  '/hochzeitsfotografie-wien/': [
    { href: '/eventfotografie-wien/', label: 'Eventfotografie Wien' },
    { href: '/portrait-fotografie-wien/', label: 'Portraitfotografie Wien' },
    { href: '/familienfotos-wien/', label: 'Familienfotos Wien' },
    { href: '/studio-fotografie-wien/', label: 'Studio-Fotografie Wien' },
    { href: '/preise/', label: 'Preise & Pakete' },
    { href: '/warteliste/', label: 'Termin buchen' },
  ],
  '/fotoshootings/wedding/': [
    { href: '/hochzeitsfotografie-wien/', label: 'Hochzeitsfotografie Wien' },
    { href: '/eventfotografie-wien/', label: 'Eventfotografie Wien' },
    { href: '/preise/', label: 'Preise & Pakete' },
    { href: '/warteliste/', label: 'Termin buchen' },
  ],
  '/fotoshootings/event/': [
    { href: '/eventfotografie-wien/', label: 'Eventfotografie Wien' },
    { href: '/hochzeitsfotografie-wien/', label: 'Hochzeitsfotografie Wien' },
    { href: '/preise/', label: 'Preise & Pakete' },
    { href: '/warteliste/', label: 'Termin buchen' },
  ],
  '/fotoshootings/business/': [
    { href: '/business-portrait-wien/', label: 'Business Portrait Wien' },
    { href: '/teamfotos-wien/', label: 'Teamfotos Wien' },
    { href: '/bewerbungsfotos-wien/', label: 'Bewerbungsfotos Wien' },
    { href: '/preise/', label: 'Preise & Pakete' },
    { href: '/warteliste/', label: 'Termin buchen' },
  ],

  // --- STUDIO / PRODUCT CLUSTER (Pillar: /studio-fotografie-wien/) ---
  '/produkt-fotografie-wien/': [
    { href: '/studio-fotografie-wien/', label: 'Studio-Fotografie Wien' },
    { href: '/immobilien-fotografie-wien/', label: 'Immobilienfotografie Wien' },
    { href: '/business-portrait-wien/', label: 'Business Portrait Wien' },
    { href: '/preise/', label: 'Preise & Pakete' },
    { href: '/warteliste/', label: 'Termin buchen' },
  ],
  '/immobilien-fotografie-wien/': [
    { href: '/produkt-fotografie-wien/', label: 'Produktfotografie Wien' },
    { href: '/studio-fotografie-wien/', label: 'Studio-Fotografie Wien' },
    { href: '/business-portrait-wien/', label: 'Business Portrait Wien' },
    { href: '/preise/', label: 'Preise & Pakete' },
    { href: '/warteliste/', label: 'Termin buchen' },
  ],
  '/studio-fotografie-wien/': [
    { href: '/portrait-fotografie-wien/', label: 'Portraitfotografie Wien' },
    { href: '/business-portrait-wien/', label: 'Business Portrait Wien' },
    { href: '/familienfotos-wien/', label: 'Familienfotos Wien' },
    { href: '/neugeborenenfotos-wien/', label: 'Neugeborenenfotos Wien' },
    { href: '/produkt-fotografie-wien/', label: 'Produktfotografie Wien' },
    { href: '/preise/', label: 'Preise & Pakete' },
    { href: '/warteliste/', label: 'Termin buchen' },
  ],

  // --- FOTOSHOOTINGS HUB ---
  '/fotoshootings/': [
    { href: '/familienfotos-wien/', label: 'Familienfotos Wien' },
    { href: '/neugeborenenfotos-wien/', label: 'Neugeborenenfotos Wien' },
    { href: '/business-portrait-wien/', label: 'Business Portrait Wien' },
    { href: '/hochzeitsfotografie-wien/', label: 'Hochzeitsfotografie Wien' },
    { href: '/schwangerschaftsfotos-wien/', label: 'Schwangerschaftsfotos Wien' },
    { href: '/studio-fotografie-wien/', label: 'Studio-Fotografie Wien' },
    { href: '/preise/', label: 'Preise & Pakete' },
    { href: '/warteliste/', label: 'Termin buchen' },
  ],

  // --- SUPPORT / INFO ---
  '/preise/': [
    { href: '/familienfotos-wien/', label: 'Familienfotos Wien' },
    { href: '/business-portrait-wien/', label: 'Business Portrait Wien' },
    { href: '/neugeborenenfotos-wien/', label: 'Neugeborenenfotos Wien' },
    { href: '/schwangerschaftsfotos-wien/', label: 'Schwangerschaftsfotos Wien' },
    { href: '/studio-fotografie-wien/', label: 'Studio-Fotografie Wien' },
    { href: '/gutschein/', label: 'Geschenkgutscheine' },
    { href: '/vouchers/', label: 'Gift Vouchers (EN)' },
    { href: '/warteliste/', label: 'Termin buchen' },
  ],
  '/kundenstimmen/': [
    { href: '/familienfotos-wien/', label: 'Familienfotos Wien' },
    { href: '/neugeborenenfotos-wien/', label: 'Neugeborenenfotos Wien' },
    { href: '/business-portrait-wien/', label: 'Business Portrait Wien' },
    { href: '/hochzeitsfotografie-wien/', label: 'Hochzeitsfotografie Wien' },
    { href: '/gutschein/', label: 'Geschenkgutscheine' },
    { href: '/preise/', label: 'Preise & Pakete' },
    { href: '/warteliste/', label: 'Termin buchen' },
  ],
  '/ueber-uns/': [
    { href: '/familienfotos-wien/', label: 'Familienfotos Wien' },
    { href: '/neugeborenenfotos-wien/', label: 'Neugeborenenfotos Wien' },
    { href: '/portfolio/', label: 'Portfolio' },
    { href: '/kundenstimmen/', label: 'Kundenstimmen' },
    { href: '/preise/', label: 'Preise & Pakete' },
    { href: '/warteliste/', label: 'Termin buchen' },
  ],
  '/portfolio/': [
    { href: '/familienfotos-wien/', label: 'Familienfotos Wien' },
    { href: '/neugeborenenfotos-wien/', label: 'Neugeborenenfotos Wien' },
    { href: '/hochzeitsfotografie-wien/', label: 'Hochzeitsfotografie Wien' },
    { href: '/business-portrait-wien/', label: 'Business Portrait Wien' },
    { href: '/schwangerschaftsfotos-wien/', label: 'Schwangerschaftsfotos Wien' },
    { href: '/preise/', label: 'Preise & Pakete' },
    { href: '/warteliste/', label: 'Termin buchen' },
  ],
  '/kontakt/': [
    { href: '/familienfotos-wien/', label: 'Familienfotos Wien' },
    { href: '/neugeborenenfotos-wien/', label: 'Neugeborenenfotos Wien' },
    { href: '/business-portrait-wien/', label: 'Business Portrait Wien' },
    { href: '/preise/', label: 'Preise & Pakete' },
    { href: '/vouchers/', label: 'Geschenkgutscheine' },
    { href: '/warteliste/', label: 'Warteliste' },
  ],
  '/warteliste/': [
    { href: '/familienfotos-wien/', label: 'Familienfotos Wien' },
    { href: '/neugeborenenfotos-wien/', label: 'Neugeborenenfotos Wien' },
    { href: '/business-portrait-wien/', label: 'Business Portrait Wien' },
    { href: '/schwangerschaftsfotos-wien/', label: 'Schwangerschaftsfotos Wien' },
    { href: '/hochzeitsfotografie-wien/', label: 'Hochzeitsfotografie Wien' },
    { href: '/preise/', label: 'Preise & Pakete' },
  ],
  '/faq/': [
    { href: '/preise/', label: 'Preise & Pakete' },
    { href: '/familienfotos-wien/', label: 'Familienfotos Wien' },
    { href: '/neugeborenenfotos-wien/', label: 'Neugeborenenfotos Wien' },
    { href: '/business-portrait-wien/', label: 'Business Portrait Wien' },
    { href: '/kontakt/', label: 'Kontakt & Beratung' },
    { href: '/warteliste/', label: 'Termin buchen' },
  ],
  '/galleries/': [
    { href: '/portfolio/', label: 'Portfolio' },
    { href: '/familienfotos-wien/', label: 'Familienfotos Wien' },
    { href: '/neugeborenenfotos-wien/', label: 'Neugeborenenfotos Wien' },
    { href: '/preise/', label: 'Preise & Pakete' },
    { href: '/warteliste/', label: 'Termin buchen' },
  ],

  // --- VOUCHERS / GUTSCHEINE ---
  '/vouchers/': [
    { href: '/gutschein/family/', label: 'Familien-Gutschein' },
    { href: '/gutschein/newborn/', label: 'Neugeborenen-Gutschein' },
    { href: '/gutschein/maternity/', label: 'Schwangerschafts-Gutschein' },
    { href: '/familienfotos-wien/', label: 'Familienfotos Wien' },
    { href: '/neugeborenenfotos-wien/', label: 'Neugeborenenfotos Wien' },
    { href: '/preise/', label: 'Preise & Pakete' },
    { href: '/warteliste/', label: 'Termin buchen' },
  ],
  '/gutschein/': [
    { href: '/gutschein/family/', label: 'Familien-Gutschein' },
    { href: '/gutschein/newborn/', label: 'Neugeborenen-Gutschein' },
    { href: '/gutschein/maternity/', label: 'Schwangerschafts-Gutschein' },
    { href: '/familienfotos-wien/', label: 'Familienfotos Wien' },
    { href: '/preise/', label: 'Preise & Pakete' },
    { href: '/warteliste/', label: 'Termin buchen' },
  ],
  '/gutschein/family/': [
    { href: '/familienfotos-wien/', label: 'Familienfotos Wien' },
    { href: '/gutschein/newborn/', label: 'Neugeborenen-Gutschein' },
    { href: '/gutschein/maternity/', label: 'Schwangerschafts-Gutschein' },
    { href: '/vouchers/', label: 'Alle Gutscheine' },
    { href: '/preise/', label: 'Preise & Pakete' },
    { href: '/warteliste/', label: 'Termin buchen' },
  ],
  '/gutschein/newborn/': [
    { href: '/neugeborenenfotos-wien/', label: 'Neugeborenenfotos Wien' },
    { href: '/gutschein/family/', label: 'Familien-Gutschein' },
    { href: '/gutschein/maternity/', label: 'Schwangerschafts-Gutschein' },
    { href: '/vouchers/', label: 'Alle Gutscheine' },
    { href: '/preise/', label: 'Preise & Pakete' },
    { href: '/warteliste/', label: 'Termin buchen' },
  ],
  '/gutschein/maternity/': [
    { href: '/schwangerschaftsfotos-wien/', label: 'Schwangerschaftsfotos Wien' },
    { href: '/gutschein/newborn/', label: 'Neugeborenen-Gutschein' },
    { href: '/gutschein/family/', label: 'Familien-Gutschein' },
    { href: '/vouchers/', label: 'Alle Gutscheine' },
    { href: '/preise/', label: 'Preise & Pakete' },
    { href: '/warteliste/', label: 'Termin buchen' },
  ],

  // --- CALCULATOR ---
  '/calculator/': [
    { href: '/preise/', label: 'Preise & Pakete' },
    { href: '/familienfotos-wien/', label: 'Familienfotos Wien' },
    { href: '/business-portrait-wien/', label: 'Business Portrait Wien' },
    { href: '/neugeborenenfotos-wien/', label: 'Neugeborenenfotos Wien' },
    { href: '/kontakt/', label: 'Persönliche Beratung' },
    { href: '/warteliste/', label: 'Termin buchen' },
  ],

  // --- BLOG ---
  '/blog/': [
    { href: '/familienfotos-wien/', label: 'Familienfotos Wien' },
    { href: '/neugeborenenfotos-wien/', label: 'Neugeborenenfotos Wien' },
    { href: '/business-portrait-wien/', label: 'Business Portrait Wien' },
    { href: '/preise/', label: 'Preise & Pakete' },
    { href: '/warteliste/', label: 'Termin buchen' },
  ],

  // --- LEGAL ---
  '/model-release/': [
    { href: '/familienfotos-wien/', label: 'Familienfotos Wien' },
    { href: '/ueber-uns/', label: 'Über uns' },
    { href: '/kontakt/', label: 'Kontakt' },
  ],
};

// Pages to skip (no related section needed)
const SKIP_PATHS = new Set([
  '/', '/en', '/en/', // home — has its own consolidated service block, avoid duplicate link lists
  '/admin', '/checkout', '/cart', '/order-complete',
  '/vouchers/success', '/voucher/thank-you',
  '/impressum/', '/agb/', '/datenschutz/',
  '/account', '/my-archive', '/galleries/', '/gallery/',
]);

const RelatedPages: React.FC = () => {
  const { pathname } = useLocation();
  const { language } = useLanguage();
  const tr = (s: string) => (language === 'de' ? s : (EN[s] ?? s));

  // Skip admin and transactional pages
  if (SKIP_PATHS.has(pathname) || pathname.startsWith('/admin') || pathname.startsWith('/checkout') || pathname.startsWith('/gallery/') || pathname.startsWith('/invoice/')) {
    return null;
  }

  // Find matching links — try exact match, then strip trailing slash
  const links = SITE_LINKS[pathname]
    || SITE_LINKS[pathname.replace(/\/$/, '')]
    || SITE_LINKS[pathname + '/'];

  if (!links || links.length === 0) return null;

  // Filter out current page
  const filtered = links.filter(l => l.href !== pathname && l.href !== pathname + '/' && l.href + '/' !== pathname);

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
