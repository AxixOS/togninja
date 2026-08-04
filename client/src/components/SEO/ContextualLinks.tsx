import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { useAuthorityMap } from '../../hooks/useAuthorityMap';

interface LinkSpec {
  to: string;
  label: string;
}

interface PageContext {
  intro: string;
  introEn?: string;
  links: LinkSpec[];
  closer?: string;
  closerEn?: string;
}

// Each entry: keyword-rich in-body anchors — pillar + siblings + /preise/ + /warteliste/
const CONTEXTS: Record<string, PageContext> = {
  // ==== HOMEPAGE ====
  '/': {
    intro: 'Unser Fotostudio in Wien ist spezialisiert auf',
    introEn: 'Our photo studio in Vienna specializes in',
    links: [
      { to: '/familienfotos-wien/', label: 'Familienfotos Wien' },
      { to: '/neugeborenenfotos-wien/', label: 'Neugeborenenfotos Wien' },
      { to: '/schwangerschaftsfotos-wien/', label: 'Schwangerschaftsfotos Wien' },
      { to: '/business-portrait-wien/', label: 'Business Portrait Wien' },
      { to: '/hochzeitsfotografie-wien/', label: 'Hochzeitsfotografie Wien' },
      { to: '/studio-fotografie-wien/', label: 'Studio-Fotografie Wien' },
    ],
  },

  // ==== FAMILY CLUSTER ====
  '/familienfotos-wien/': {
    intro: 'Ergänzend zu Familienfotos Wien bieten wir auch',
    introEn: 'In addition to family photos in Vienna, we also offer',
    links: [
      { to: '/familien-fotoshooting-wien/', label: 'Familien-Fotoshooting Wien' },
      { to: '/neugeborenenfotos-wien/', label: 'Neugeborenenfotos Wien' },
      { to: '/schwangerschaftsfotos-wien/', label: 'Schwangerschaftsfotos Wien' },
      { to: '/babyfotos-wien/', label: 'Babyfotos Wien' },
      { to: '/kinder-fotografie-wien/', label: 'Kinderfotografie Wien' },
      { to: '/studio-fotografie-wien/', label: 'Studio-Fotografie Wien' },
    ],
    closer: 'Alle Pakete & Preise auf der /preise/ – oder direkt /warteliste/.',
  },
  '/familien-fotoshooting-wien/': {
    intro: 'Als Pillar bieten unsere Familien-Fotoshootings den perfekten Rahmen – sehen Sie auch',
    introEn: 'Our family photo sessions are the ideal starting point — take a look at',
    links: [
      { to: '/familienfotos-wien/', label: 'Familienfotos Wien' },
      { to: '/kinder-fotografie-wien/', label: 'Kinderfotografie Wien' },
      { to: '/neugeborenenfotos-wien/', label: 'Neugeborenenfotos Wien' },
      { to: '/babyfotos-wien/', label: 'Babyfotos Wien' },
      { to: '/schwangerschaftsfotos-wien/', label: 'Schwangerschaftsfotos Wien' },
      { to: '/studio-fotografie-wien/', label: 'Studio-Fotografie Wien' },
    ],
  },
  '/babyfotos-wien/': {
    intro: 'Zu unseren Babyfotos Wien passen perfekt',
    introEn: 'Our baby photos in Vienna pair perfectly with',
    links: [
      { to: '/neugeborenenfotos-wien/', label: 'Neugeborenenfotos Wien' },
      { to: '/schwangerschaftsfotos-wien/', label: 'Schwangerschaftsfotos Wien' },
      { to: '/familienfotos-wien/', label: 'Familienfotos Wien' },
      { to: '/kinder-fotografie-wien/', label: 'Kinderfotografie Wien' },
      { to: '/baby-fotografie-wien/', label: 'Baby-Fotografie Wien' },
      { to: '/studio-fotografie-wien/', label: 'Studio-Fotografie Wien' },
    ],
  },
  '/baby-fotografie-wien/': {
    intro: 'Unsere Baby-Fotografie Wien ergänzt sich ideal mit',
    introEn: 'Our baby photography in Vienna combines ideally with',
    links: [
      { to: '/babyfotos-wien/', label: 'Babyfotos Wien' },
      { to: '/neugeborenenfotos-wien/', label: 'Neugeborenenfotos Wien' },
      { to: '/familienfotos-wien/', label: 'Familienfotos Wien' },
      { to: '/kinder-fotografie-wien/', label: 'Kinderfotografie Wien' },
      { to: '/schwangerschaftsfotos-wien/', label: 'Schwangerschaftsfotos Wien' },
    ],
  },
  '/neugeborenenfotos-wien/': {
    intro: 'Ergänzend zu Neugeborenenfotos Wien passen',
    introEn: 'Alongside newborn photos in Vienna, a great fit is',
    links: [
      { to: '/schwangerschaftsfotos-wien/', label: 'Schwangerschaftsfotos Wien' },
      { to: '/babyfotos-wien/', label: 'Babyfotos Wien' },
      { to: '/familienfotos-wien/', label: 'Familienfotos Wien' },
      { to: '/familien-fotoshooting-wien/', label: 'Familien-Fotoshooting Wien' },
      { to: '/studio-fotografie-wien/', label: 'Studio-Fotografie Wien' },
    ],
  },
  '/schwangerschaftsfotos-wien/': {
    intro: 'Nach Ihren Schwangerschaftsfotos Wien buchen viele Familien anschließend',
    introEn: 'After maternity photos in Vienna, many families go on to book',
    links: [
      { to: '/neugeborenenfotos-wien/', label: 'Neugeborenenfotos Wien' },
      { to: '/babyfotos-wien/', label: 'Babyfotos Wien' },
      { to: '/familienfotos-wien/', label: 'Familienfotos Wien' },
      { to: '/familien-fotoshooting-wien/', label: 'Familien-Fotoshooting Wien' },
      { to: '/studio-fotografie-wien/', label: 'Studio-Fotografie Wien' },
    ],
  },
  '/kinder-fotografie-wien/': {
    intro: 'Zu unserer Kinderfotografie Wien passen auch',
    introEn: 'Our kids photography in Vienna also pairs well with',
    links: [
      { to: '/familienfotos-wien/', label: 'Familienfotos Wien' },
      { to: '/babyfotos-wien/', label: 'Babyfotos Wien' },
      { to: '/familien-fotoshooting-wien/', label: 'Familien-Fotoshooting Wien' },
      { to: '/neugeborenenfotos-wien/', label: 'Neugeborenenfotos Wien' },
      { to: '/studio-fotografie-wien/', label: 'Studio-Fotografie Wien' },
    ],
  },

  // ==== BUSINESS CLUSTER ====
  '/business-portrait-wien/': {
    intro: 'Neben Business Portrait Wien bieten wir auch',
    introEn: 'Alongside business portraits in Vienna, we also offer',
    links: [
      { to: '/teamfotos-wien/', label: 'Teamfotos Wien' },
      { to: '/bewerbungsfotos-wien/', label: 'Bewerbungsfotos Wien' },
      { to: '/portrait-fotografie-wien/', label: 'Portraitfotografie Wien' },
      { to: '/eventfotografie-wien/', label: 'Eventfotografie Wien' },
      { to: '/studio-fotografie-wien/', label: 'Studio-Fotografie Wien' },
    ],
  },
  '/teamfotos-wien/': {
    intro: 'Ergänzend zu Teamfotos Wien empfehlen wir',
    introEn: 'To complement team photos in Vienna, we recommend',
    links: [
      { to: '/business-portrait-wien/', label: 'Business Portrait Wien' },
      { to: '/bewerbungsfotos-wien/', label: 'Bewerbungsfotos Wien' },
      { to: '/portrait-fotografie-wien/', label: 'Portraitfotografie Wien' },
      { to: '/eventfotografie-wien/', label: 'Eventfotografie Wien' },
      { to: '/studio-fotografie-wien/', label: 'Studio-Fotografie Wien' },
    ],
  },
  '/bewerbungsfotos-wien/': {
    intro: 'Nach den Bewerbungsfotos Wien passen perfekt',
    introEn: 'After application headshots in Vienna, a perfect match is',
    links: [
      { to: '/business-portrait-wien/', label: 'Business Portrait Wien' },
      { to: '/portrait-fotografie-wien/', label: 'Portraitfotografie Wien' },
      { to: '/teamfotos-wien/', label: 'Teamfotos Wien' },
      { to: '/studio-fotografie-wien/', label: 'Studio-Fotografie Wien' },
    ],
  },

  // ==== EVENT CLUSTER ====
  '/eventfotografie-wien/': {
    intro: 'Zu unserer Eventfotografie Wien passen auch',
    introEn: 'Our event photography in Vienna also works well with',
    links: [
      { to: '/hochzeitsfotografie-wien/', label: 'Hochzeitsfotografie Wien' },
      { to: '/business-portrait-wien/', label: 'Business Portrait Wien' },
      { to: '/teamfotos-wien/', label: 'Teamfotos Wien' },
      { to: '/portrait-fotografie-wien/', label: 'Portraitfotografie Wien' },
      { to: '/familienfotos-wien/', label: 'Familienfotos Wien' },
    ],
  },
  '/hochzeitsfotografie-wien/': {
    intro: 'Neben Hochzeitsfotografie Wien bieten wir auch',
    introEn: 'Alongside wedding photography in Vienna, we also offer',
    links: [
      { to: '/eventfotografie-wien/', label: 'Eventfotografie Wien' },
      { to: '/familienfotos-wien/', label: 'Familienfotos Wien' },
      { to: '/portrait-fotografie-wien/', label: 'Portraitfotografie Wien' },
      { to: '/business-portrait-wien/', label: 'Business Portrait Wien' },
    ],
  },

  // ==== STUDIO / PORTRAIT / PRODUCT / REAL ESTATE ====
  '/studio-fotografie-wien/': {
    intro: 'In unserem Fotostudio Wien entstehen',
    introEn: 'In our Vienna photo studio we create',
    links: [
      { to: '/familienfotos-wien/', label: 'Familienfotos Wien' },
      { to: '/neugeborenenfotos-wien/', label: 'Neugeborenenfotos Wien' },
      { to: '/business-portrait-wien/', label: 'Business Portrait Wien' },
      { to: '/portrait-fotografie-wien/', label: 'Portraitfotografie Wien' },
      { to: '/produkt-fotografie-wien/', label: 'Produktfotografie Wien' },
    ],
  },
  '/portrait-fotografie-wien/': {
    intro: 'Unsere Portraitfotografie Wien umfasst auch',
    introEn: 'Our portrait photography in Vienna also includes',
    links: [
      { to: '/business-portrait-wien/', label: 'Business Portrait Wien' },
      { to: '/bewerbungsfotos-wien/', label: 'Bewerbungsfotos Wien' },
      { to: '/familienfotos-wien/', label: 'Familienfotos Wien' },
      { to: '/studio-fotografie-wien/', label: 'Studio-Fotografie Wien' },
      { to: '/teamfotos-wien/', label: 'Teamfotos Wien' },
    ],
  },
  '/produkt-fotografie-wien/': {
    intro: 'Neben Produktfotografie Wien bieten wir',
    introEn: 'Alongside product photography in Vienna, we offer',
    links: [
      { to: '/studio-fotografie-wien/', label: 'Studio-Fotografie Wien' },
      { to: '/business-portrait-wien/', label: 'Business Portrait Wien' },
      { to: '/immobilien-fotografie-wien/', label: 'Immobilienfotografie Wien' },
      { to: '/eventfotografie-wien/', label: 'Eventfotografie Wien' },
    ],
  },
  '/immobilien-fotografie-wien/': {
    intro: 'Ergänzend zur Immobilienfotografie Wien bieten wir',
    introEn: 'To complement real estate photography in Vienna, we offer',
    links: [
      { to: '/produkt-fotografie-wien/', label: 'Produktfotografie Wien' },
      { to: '/business-portrait-wien/', label: 'Business Portrait Wien' },
      { to: '/studio-fotografie-wien/', label: 'Studio-Fotografie Wien' },
      { to: '/eventfotografie-wien/', label: 'Eventfotografie Wien' },
    ],
  },
};

interface ContextualLinksProps {
  pathname: string;
  language?: 'de' | 'en';
}

/**
 * Renders a keyword-rich in-body contextual links paragraph.
 * Purpose: satisfy IA Growth Engine — add topical internal links
 * with semantic anchor text directly in prose, NOT in nav/footer.
 */
export const ContextualLinks: React.FC<ContextualLinksProps> = ({ pathname, language: languageProp }) => {
  // Self-aware: honour the selected language even if a page forgets the prop.
  const { language: contextLanguage } = useLanguage();
  const language = languageProp ?? contextLanguage;
  const { map, isCustom } = useAuthorityMap();

  // Studios with their own Authority Map: build the in-body anchors from the matching
  // pillar's siblings + conversion links. New Age (default seed) keeps its exact hand-
  // written per-page prose below.
  if (isCustom) {
    const norm = (h: string) => (h.endsWith('/') ? h : `${h}/`);
    const pillar = map.pillars.find((p) => norm(p.href) === norm(pathname));
    const links = (pillar?.siblings || []).map((s) => ({ to: s.href, label: s.label }));
    if (!links.length) return null;
    const conv = (map.conversionLinks || []).slice(0, 2);
    const anchor = 'text-purple-600 hover:text-purple-700 underline underline-offset-2 font-medium';
    return (
      <section className="py-8 bg-purple-50 border-y border-purple-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-base text-gray-700 leading-relaxed">
            {language === 'de' ? 'Sehen Sie auch' : 'You may also like'}{' '}
            {links.map((link, i) => (
              <React.Fragment key={link.to}>
                <Link to={link.to} className={anchor}>{link.label}</Link>
                {i < links.length - 2 ? ', ' : i === links.length - 2 ? (language === 'de' ? ' und ' : ' and ') : '.'}
              </React.Fragment>
            ))}
            {conv.length > 0 && (
              <>
                {' '}
                {conv.map((c, i) => (
                  <React.Fragment key={c.href}>
                    <Link to={c.href} className={anchor}>{c.label}</Link>
                    {i < conv.length - 1 ? (language === 'de' ? ' · ' : ' · ') : '.'}
                  </React.Fragment>
                ))}
              </>
            )}
          </p>
        </div>
      </section>
    );
  }

  const ctx = CONTEXTS[pathname];
  if (!ctx) return null;

  const intro = language === 'en' && ctx.introEn ? ctx.introEn : ctx.intro;
  const linkCount = ctx.links.length;

  return (
    <section className="py-8 bg-purple-50 border-y border-purple-100">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-xl md:text-2xl font-semibold text-gray-900 mb-3">
          {language === 'de' ? 'Weitere Fotoshootings in Wien' : 'More Photo Sessions in Vienna'}
        </h2>
        <p className="text-base text-gray-700 leading-relaxed">
          {intro}{' '}
          {ctx.links.map((link, i) => (
            <React.Fragment key={link.to}>
              <Link
                to={link.to}
                className="text-purple-600 hover:text-purple-700 underline underline-offset-2 font-medium"
              >
                {link.label}
              </Link>
              {i < linkCount - 2 ? ', ' : i === linkCount - 2 ? (language === 'de' ? ' und ' : ' and ') : '.'}
            </React.Fragment>
          ))}
          {' '}
          {/* Closer links to /kontakt (not /warteliste): the audit found the
              waitlist page absorbing the most link equity sitewide; kontakt is
              the designated conversion page and was comparatively under-linked. */}
          {language === 'de' ? (
            <>
              Alle <Link to="/preise/" className="text-purple-600 hover:text-purple-700 underline underline-offset-2 font-medium">Preise ansehen</Link>{' '}
              oder direkt <Link to="/kontakt" className="text-purple-600 hover:text-purple-700 underline underline-offset-2 font-medium">Termin anfragen</Link>.
              Ansehen im <Link to="/portfolio/" className="text-purple-600 hover:text-purple-700 underline underline-offset-2 font-medium">Portfolio</Link>.
            </>
          ) : (
            <>
              View all <Link to="/preise/" className="text-purple-600 hover:text-purple-700 underline underline-offset-2 font-medium">prices</Link>{' '}
              or <Link to="/kontakt" className="text-purple-600 hover:text-purple-700 underline underline-offset-2 font-medium">request a session</Link>.
              See our <Link to="/portfolio/" className="text-purple-600 hover:text-purple-700 underline underline-offset-2 font-medium">portfolio</Link>.
            </>
          )}
        </p>
      </div>
    </section>
  );
};

export default ContextualLinks;
