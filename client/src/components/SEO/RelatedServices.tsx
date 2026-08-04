import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Euro, Calendar } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuthorityMap } from '../../hooks/useAuthorityMap';

// EN display translations for the German card titles/descriptions below. The
// data map keeps its German keyword-rich anchors (SEO); only the rendered text
// is swapped when EN is selected. Unknown strings fall through unchanged.
const EN: Record<string, string> = {
  'Weitere Fotoshootings in Wien': 'More Photo Sessions in Vienna',
  'Mehr erfahren': 'Learn more',
  'Preise & Pakete': 'Pricing & Packages',
  'Termin buchen': 'Book a session',
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
  'Klassenfotos, Matura & Sponsion': 'Class photos, Matura & graduation',
  'Firmen- & Privatevents': 'Corporate & private events',
  'Babybauch-Shooting im Studio': 'Baby bump shoot in the studio',
  'Ab 5 Tage nach der Geburt': 'From 5 days after birth',
  'Für Babys 3–12 Monate': 'For babies aged 3–12 months',
  'Kinder natürlich fotografiert': 'Children photographed naturally',
  'Transparente Preise ab €95': 'Transparent prices from €95',
  'Jetzt auf die Warteliste': 'Join the waitlist now',
  'Unser Pillar für Familienfotografie': 'Our hub for family photography',
  'Für die ersten Lebenstage': 'For the very first days',
  'Für die ganze Familie': 'For the whole family',
  'Babybauch-Shooting': 'Baby bump shoot',
  'Unser modernes Studio': 'Our modern studio',
  'Für die ersten 14 Tage': 'For the first 14 days',
  'Mit der ganzen Familie': 'With the whole family',
  'Im professionellen Studio': 'In our professional studio',
  'Nach der Geburt': 'After the birth',
  'Im modernen Studio': 'In our modern studio',
  'Für Neugeborene': 'For newborns',
  'Für Karriere & HR': 'For careers & HR',
  'Einheitliche Mitarbeiterbilder': 'Consistent staff headshots',
  'Persönliche Portraits': 'Personal portraits',
  'Für LinkedIn & Website': 'For LinkedIn & website',
  'Einheitlicher Look fürs Team': 'A consistent look for the team',
  'Einzelportraits für Profis': 'Individual portraits for professionals',
  'Für Firmenevents': 'For corporate events',
  'Professioneller Auftritt': 'A professional presence',
  'Für Bewerbungen': 'For job applications',
  'Für euren großen Tag': 'For your big day',
  'Mitarbeiterfotos vor Ort': 'Staff photos on location',
  'Für andere Events': 'For other events',
  'Für Familientreffen': 'For family gatherings',
  'Professionelle Businessfotos': 'Professional business photos',
  'Familienshooting im Studio': 'Family shoot in the studio',
  'Professionelle Produktbilder': 'Professional product images',
  'Für Immobilien & Räume': 'For properties & interiors',
  'Mitarbeiterfotos': 'Staff photos',
  'Für Produkte & Objekte': 'For products & objects',
  'Für Makler-Portraits': 'For agent portraits',
  'Professionelle Portraits': 'Professional portraits',
};

export interface RelatedServiceLink {
  title: string;
  path: string;
  description?: string;
}

interface RelatedServicesProps {
  currentPath: string;
  title?: string;
}

// Internal links map for SEO cross-linking between service pages
// Each page: 3 cluster siblings + /preise/ + /warteliste/ = 5 links minimum
const serviceLinks: Record<string, RelatedServiceLink[]> = {

  // --- FAMILY CLUSTER (Pillar: /familienfotos-wien/) ---
  '/familienfotos-wien/': [
    { title: 'Schwangerschaftsfotos Wien', path: '/schwangerschaftsfotos-wien/', description: 'Babybauch-Shooting im Studio' },
    { title: 'Neugeborenenfotos Wien', path: '/neugeborenenfotos-wien/', description: 'Ab 5 Tage nach der Geburt' },
    { title: 'Babyfotos Wien', path: '/babyfotos-wien/', description: 'Für Babys 3–12 Monate' },
    { title: 'Kinderfotografie Wien', path: '/kinder-fotografie-wien/', description: 'Kinder natürlich fotografiert' },
    { title: 'Preise & Pakete', path: '/preise/', description: 'Transparente Preise ab €95' },
    { title: 'Termin buchen', path: '/warteliste/', description: 'Jetzt auf die Warteliste' },
  ],
  '/familien-fotoshooting-wien/': [
    { title: 'Familienfotos Wien', path: '/familienfotos-wien/', description: 'Unser Pillar für Familienfotografie' },
    { title: 'Neugeborenenfotos Wien', path: '/neugeborenenfotos-wien/', description: 'Für die ersten Lebenstage' },
    { title: 'Babyfotos Wien', path: '/babyfotos-wien/', description: 'Für Babys 3–12 Monate' },
    { title: 'Kinderfotografie Wien', path: '/kinder-fotografie-wien/', description: 'Kinder natürlich fotografiert' },
    { title: 'Preise & Pakete', path: '/preise/', description: 'Transparente Preise ab €95' },
    { title: 'Termin buchen', path: '/warteliste/', description: 'Jetzt auf die Warteliste' },
  ],
  '/neugeborenenfotos-wien/': [
    { title: 'Familienfotos Wien', path: '/familienfotos-wien/', description: 'Für die ganze Familie' },
    { title: 'Schwangerschaftsfotos Wien', path: '/schwangerschaftsfotos-wien/', description: 'Babybauch-Shooting' },
    { title: 'Babyfotos Wien', path: '/babyfotos-wien/', description: 'Für Babys 3–12 Monate' },
    { title: 'Studio-Fotografie Wien', path: '/studio-fotografie-wien/', description: 'Unser modernes Studio' },
    { title: 'Preise & Pakete', path: '/preise/', description: 'Transparente Preise ab €95' },
    { title: 'Termin buchen', path: '/warteliste/', description: 'Jetzt auf die Warteliste' },
  ],
  '/babyfotos-wien/': [
    { title: 'Neugeborenenfotos Wien', path: '/neugeborenenfotos-wien/', description: 'Für die ersten 14 Tage' },
    { title: 'Familienfotos Wien', path: '/familienfotos-wien/', description: 'Mit der ganzen Familie' },
    { title: 'Kinderfotografie Wien', path: '/kinder-fotografie-wien/', description: 'Kinder natürlich fotografiert' },
    { title: 'Studio-Fotografie Wien', path: '/studio-fotografie-wien/', description: 'Im professionellen Studio' },
    { title: 'Preise & Pakete', path: '/preise/', description: 'Transparente Preise ab €95' },
    { title: 'Termin buchen', path: '/warteliste/', description: 'Jetzt auf die Warteliste' },
  ],
  '/schwangerschaftsfotos-wien/': [
    { title: 'Neugeborenenfotos Wien', path: '/neugeborenenfotos-wien/', description: 'Nach der Geburt' },
    { title: 'Familienfotos Wien', path: '/familienfotos-wien/', description: 'Mit der ganzen Familie' },
    { title: 'Babyfotos Wien', path: '/babyfotos-wien/', description: 'Für Babys 3–12 Monate' },
    { title: 'Studio-Fotografie Wien', path: '/studio-fotografie-wien/', description: 'Im modernen Studio' },
    { title: 'Preise & Pakete', path: '/preise/', description: 'Transparente Preise ab €95' },
    { title: 'Termin buchen', path: '/warteliste/', description: 'Jetzt auf die Warteliste' },
  ],
  '/kinder-fotografie-wien/': [
    { title: 'Familienfotos Wien', path: '/familienfotos-wien/', description: 'Mit der ganzen Familie' },
    { title: 'Neugeborenenfotos Wien', path: '/neugeborenenfotos-wien/', description: 'Für Neugeborene' },
    { title: 'Babyfotos Wien', path: '/babyfotos-wien/', description: 'Für Babys 3–12 Monate' },
    { title: 'Studio-Fotografie Wien', path: '/studio-fotografie-wien/', description: 'Im professionellen Studio' },
    { title: 'Preise & Pakete', path: '/preise/', description: 'Transparente Preise ab €95' },
    { title: 'Termin buchen', path: '/warteliste/', description: 'Jetzt auf die Warteliste' },
  ],

  // --- BUSINESS CLUSTER (Pillar: /business-portrait-wien/) ---
  '/business-portrait-wien/': [
    { title: 'Bewerbungsfotos Wien', path: '/bewerbungsfotos-wien/', description: 'Für Karriere & HR' },
    { title: 'Teamfotos Wien', path: '/teamfotos-wien/', description: 'Einheitliche Mitarbeiterbilder' },
    { title: 'Portraitfotografie Wien', path: '/portrait-fotografie-wien/', description: 'Persönliche Portraits' },
    { title: 'Schul- & Hochschulfotografie Wien', path: '/schul-und-hochschulfotografie-wien/', description: 'Klassenfotos, Matura & Sponsion' },
    { title: 'Preise & Pakete', path: '/preise/', description: 'Transparente Preise ab €95' },
    { title: 'Termin buchen', path: '/warteliste/', description: 'Jetzt auf die Warteliste' },
  ],
  // --- EDUCATION CLUSTER (Pillar: /schul-und-hochschulfotografie-wien/) ---
  '/schul-und-hochschulfotografie-wien/': [
    { title: 'Business Portrait Wien', path: '/business-portrait-wien/', description: 'Professionelle Portraits' },
    { title: 'Teamfotos Wien', path: '/teamfotos-wien/', description: 'Einheitliche Mitarbeiterbilder' },
    { title: 'Bewerbungsfotos Wien', path: '/bewerbungsfotos-wien/', description: 'Für Karriere & HR' },
    { title: 'Eventfotografie Wien', path: '/eventfotografie-wien/', description: 'Firmen- & Privatevents' },
    { title: 'Termin buchen', path: '/warteliste/', description: 'Jetzt auf die Warteliste' },
  ],
  '/bewerbungsfotos-wien/': [
    { title: 'Business Portrait Wien', path: '/business-portrait-wien/', description: 'Für LinkedIn & Website' },
    { title: 'Teamfotos Wien', path: '/teamfotos-wien/', description: 'Einheitlicher Look fürs Team' },
    { title: 'Portraitfotografie Wien', path: '/portrait-fotografie-wien/', description: 'Persönliche Portraits' },
    { title: 'Studio-Fotografie Wien', path: '/studio-fotografie-wien/', description: 'Im professionellen Studio' },
    { title: 'Preise & Pakete', path: '/preise/', description: 'Transparente Preise ab €95' },
    { title: 'Termin buchen', path: '/warteliste/', description: 'Jetzt auf die Warteliste' },
  ],
  '/teamfotos-wien/': [
    { title: 'Business Portrait Wien', path: '/business-portrait-wien/', description: 'Einzelportraits für Profis' },
    { title: 'Bewerbungsfotos Wien', path: '/bewerbungsfotos-wien/', description: 'Für Karriere & HR' },
    { title: 'Eventfotografie Wien', path: '/eventfotografie-wien/', description: 'Für Firmenevents' },
    { title: 'Portraitfotografie Wien', path: '/portrait-fotografie-wien/', description: 'Persönliche Portraits' },
    { title: 'Preise & Pakete', path: '/preise/', description: 'Transparente Preise ab €95' },
    { title: 'Termin buchen', path: '/warteliste/', description: 'Jetzt auf die Warteliste' },
  ],
  '/portrait-fotografie-wien/': [
    { title: 'Business Portrait Wien', path: '/business-portrait-wien/', description: 'Professioneller Auftritt' },
    { title: 'Bewerbungsfotos Wien', path: '/bewerbungsfotos-wien/', description: 'Für Bewerbungen' },
    { title: 'Familienfotos Wien', path: '/familienfotos-wien/', description: 'Für die ganze Familie' },
    { title: 'Studio-Fotografie Wien', path: '/studio-fotografie-wien/', description: 'Im professionellen Studio' },
    { title: 'Preise & Pakete', path: '/preise/', description: 'Transparente Preise ab €95' },
    { title: 'Termin buchen', path: '/warteliste/', description: 'Jetzt auf die Warteliste' },
  ],

  // --- EVENT / WEDDING CLUSTER (Pillar: /hochzeitsfotografie-wien/) ---
  '/eventfotografie-wien/': [
    { title: 'Hochzeitsfotografie Wien', path: '/hochzeitsfotografie-wien/', description: 'Für euren großen Tag' },
    { title: 'Business Portrait Wien', path: '/business-portrait-wien/', description: 'Für Firmenevents' },
    { title: 'Teamfotos Wien', path: '/teamfotos-wien/', description: 'Mitarbeiterfotos vor Ort' },
    { title: 'Portraitfotografie Wien', path: '/portrait-fotografie-wien/', description: 'Persönliche Portraits' },
    { title: 'Preise & Pakete', path: '/preise/', description: 'Transparente Preise ab €95' },
    { title: 'Termin buchen', path: '/warteliste/', description: 'Jetzt auf die Warteliste' },
  ],
  '/hochzeitsfotografie-wien/': [
    { title: 'Eventfotografie Wien', path: '/eventfotografie-wien/', description: 'Für andere Events' },
    { title: 'Familienfotos Wien', path: '/familienfotos-wien/', description: 'Für Familientreffen' },
    { title: 'Portraitfotografie Wien', path: '/portrait-fotografie-wien/', description: 'Persönliche Portraits' },
    { title: 'Studio-Fotografie Wien', path: '/studio-fotografie-wien/', description: 'Im modernen Studio' },
    { title: 'Preise & Pakete', path: '/preise/', description: 'Transparente Preise ab €95' },
    { title: 'Termin buchen', path: '/warteliste/', description: 'Jetzt auf die Warteliste' },
  ],

  // --- STUDIO / PRODUCT CLUSTER (Pillar: /studio-fotografie-wien/) ---
  '/studio-fotografie-wien/': [
    { title: 'Business Portrait Wien', path: '/business-portrait-wien/', description: 'Professionelle Businessfotos' },
    { title: 'Familienfotos Wien', path: '/familienfotos-wien/', description: 'Familienshooting im Studio' },
    { title: 'Portraitfotografie Wien', path: '/portrait-fotografie-wien/', description: 'Persönliche Portraits' },
    { title: 'Produktfotografie Wien', path: '/produkt-fotografie-wien/', description: 'Professionelle Produktbilder' },
    { title: 'Preise & Pakete', path: '/preise/', description: 'Transparente Preise ab €95' },
    { title: 'Termin buchen', path: '/warteliste/', description: 'Jetzt auf die Warteliste' },
  ],
  '/produkt-fotografie-wien/': [
    { title: 'Studio-Fotografie Wien', path: '/studio-fotografie-wien/', description: 'Unser modernes Studio' },
    { title: 'Immobilienfotografie Wien', path: '/immobilien-fotografie-wien/', description: 'Für Immobilien & Räume' },
    { title: 'Business Portrait Wien', path: '/business-portrait-wien/', description: 'Für LinkedIn & Website' },
    { title: 'Teamfotos Wien', path: '/teamfotos-wien/', description: 'Mitarbeiterfotos' },
    { title: 'Preise & Pakete', path: '/preise/', description: 'Transparente Preise ab €95' },
    { title: 'Termin buchen', path: '/warteliste/', description: 'Jetzt auf die Warteliste' },
  ],
  '/immobilien-fotografie-wien/': [
    { title: 'Produktfotografie Wien', path: '/produkt-fotografie-wien/', description: 'Für Produkte & Objekte' },
    { title: 'Studio-Fotografie Wien', path: '/studio-fotografie-wien/', description: 'Im professionellen Studio' },
    { title: 'Business Portrait Wien', path: '/business-portrait-wien/', description: 'Für Makler-Portraits' },
    { title: 'Teamfotos Wien', path: '/teamfotos-wien/', description: 'Mitarbeiterfotos' },
    { title: 'Preise & Pakete', path: '/preise/', description: 'Transparente Preise ab €95' },
    { title: 'Termin buchen', path: '/warteliste/', description: 'Jetzt auf die Warteliste' },
  ],
};

// Default links if page not in map
const defaultLinks: RelatedServiceLink[] = [
  { title: 'Familienfotos Wien', path: '/familienfotos-wien/', description: 'Für die ganze Familie' },
  { title: 'Business Portrait Wien', path: '/business-portrait-wien/', description: 'Professionelle Portraits' },
  { title: 'Neugeborenenfotos Wien', path: '/neugeborenenfotos-wien/', description: 'Ab 5 Tage nach der Geburt' },
  { title: 'Preise & Pakete', path: '/preise/', description: 'Transparente Preise ab €95' },
  { title: 'Termin buchen', path: '/warteliste/', description: 'Jetzt auf die Warteliste' },
];

export function RelatedServices({ currentPath, title }: RelatedServicesProps) {
  const { language } = useLanguage();
  const de = language === 'de';
  // Translate a German data string for display when EN is selected.
  const tr = (s?: string) => (!s ? s : de ? s : (EN[s] ?? s));
  const headingText = title ?? tr('Weitere Fotoshootings in Wien')!;
  // Normalize path (ensure trailing slash)
  const normalizedPath = currentPath.endsWith('/') ? currentPath : `${currentPath}/`;
  // Studios with their OWN Authority Map render from it; New Age (default map) keeps its
  // exact hard-coded links below.
  const { map, isCustom } = useAuthorityMap();
  let links = serviceLinks[normalizedPath] || defaultLinks;
  if (isCustom) {
    const norm = (h: string) => (h.endsWith('/') ? h : `${h}/`);
    const pillar = map.pillars.find((p) => norm(p.href) === normalizedPath);
    const sibs = (pillar?.siblings || map.defaultPillar.siblings || []).map((s) => ({ title: s.label, path: s.href, description: '' }));
    const conv = (map.conversionLinks || []).map((c) => ({ title: c.label, path: c.href, description: '' }));
    links = [...sibs, ...conv];
  }

  // Filter out current page from links
  const filteredLinks = links.filter(link => {
    const linkPath = link.path.endsWith('/') ? link.path : `${link.path}/`;
    return linkPath !== normalizedPath;
  });

  if (filteredLinks.length === 0) return null;

  // Separate CTA links from service links
  const serviceItems = filteredLinks.filter(l => l.path !== '/preise/' && l.path !== '/warteliste/');
  const ctaItems = filteredLinks.filter(l => l.path === '/preise/' || l.path === '/warteliste/');

  return (
    <section className="py-14 bg-gray-50" data-seo="related-services">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-2xl md:text-3xl font-bold text-purple-900 mb-8 text-center">
          {headingText}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          {serviceItems.map((link, index) => (
            <Link
              key={index}
              to={link.path}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md hover:border-purple-200 transition-all group"
            >
              <h3 className="text-base font-semibold text-purple-800 mb-1.5 group-hover:text-purple-600 transition-colors leading-snug">
                {tr(link.title)}
              </h3>
              {link.description && (
                <p className="text-gray-500 text-sm mb-3 leading-snug">{tr(link.description)}</p>
              )}
              <span className="inline-flex items-center text-purple-600 text-sm font-medium group-hover:text-purple-700">
                {tr('Mehr erfahren')} <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </span>
            </Link>
          ))}
        </div>
        {ctaItems.length > 0 && (
          <div className="flex flex-col sm:flex-row justify-center gap-4 pt-2">
            {ctaItems.map((link, index) => (
              <Link
                key={index}
                to={link.path}
                className={`inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full font-semibold text-sm transition-all ${
                  link.path === '/warteliste/'
                    ? 'bg-purple-600 text-white hover:bg-purple-700 shadow-md hover:shadow-lg'
                    : 'bg-white border-2 border-purple-300 text-purple-700 hover:border-purple-500 hover:bg-purple-50'
                }`}
              >
                {link.path === '/warteliste/' ? <Calendar className="h-4 w-4" /> : <Euro className="h-4 w-4" />}
                {tr(link.title)}
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export default RelatedServices;
