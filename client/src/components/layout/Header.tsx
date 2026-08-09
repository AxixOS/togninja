import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { toEnglishPath, toGermanPath } from '../../config/localeRoutes';
import { Menu, Globe, ChevronDown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import LanguageSelector from '../common/LanguageSelector';
import { useManualPageContent } from '../../hooks/useManualPageContent';
import { SITE } from '../../config/site';
import { pageForRoute, isPageEnabled } from '../../../../shared/sitePages';
import { localizePath } from '../../../../shared/routeSlugs';
import { useAuthorityMap } from '../../hooks/useAuthorityMap';

const Header: React.FC = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [fotoshootingsOpen, setFotoshootingsOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { language, setLanguage, t } = useLanguage();
  
  // Get logo. Priority: studio_configs (Studio Customization) → CMS site.logo
  // override → env-injected SITE.logo → bundled default.
  const [dbLogo, setDbLogo] = useState<string | null>(null);
  useEffect(() => {
    fetch('/api/studio/public-branding')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d?.logoUrl) setDbLogo(d.logoUrl); })
      .catch(() => {});
  }, []);

  const tSite = useManualPageContent('site-settings');
  const customLogo = tSite('site.logo');
  // No bundled default: the old fallback was /frontend-logo.jpg — New Age Fotografie's
  // logo — so any studio that hadn't uploaded one wore another studio's brand in the
  // header of every page. With no logo configured we render the studio's NAME instead.
  const logoUrl = dbLogo
    || (customLogo && customLogo !== 'site.logo' ? customLogo : (SITE.logo || ''));

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  const toggleLanguage = () => {
    const target = language === 'en' ? 'de' : 'en';
    setLanguage(target);
    // If this page has a paired localized URL, move to it so the language choice
    // is reflected in the address (and stays put on refresh / for sharing).
    const localized = target === 'en' ? toEnglishPath(location.pathname) : toGermanPath(location.pathname);
    if (localized && localized !== location.pathname) navigate(localized);
  };

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const handleNavClick = (path: string) => {
    // Scroll to top when navigating
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Unified Fotoshootings navigation matching footer (SEO cornerstone pages)
  // Which service pages this studio actually runs. Without this the dropdown listed
  // all fourteen regardless — so a studio advertised services it does not offer, and
  // every link led to a page that only redirects.
  const [enabledPages, setEnabledPages] = useState<Record<string, boolean> | null>(null);
  const [siteLang, setSiteLang] = useState<string>('en');
  // The studio's EXPLICIT language choice, or '' when it has never made one. Nav links
  // are localised only on this: an instance that predates the language question keeps
  // pointing at the paths it already has.
  const [routeLang, setRouteLang] = useState<string>('');
  useEffect(() => {
    let cancelled = false;
    fetch('/api/studio-config')
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        setEnabledPages(d?.enabledPages || {});
        setSiteLang(d?.lang || d?.siteLanguage || 'en');
        setRouteLang(d?.routeLanguage || '');
      })
      .catch(() => { if (!cancelled) setEnabledPages({}); });
    return () => { cancelled = true; };
  }, []);

  const allFotoshootingItems = [
    { path: '/familienfotos-wien/', label: t('nav.familyPhotos') },
    { path: '/neugeborenenfotos-wien/', label: t('nav.newbornPhotos') },
    { path: '/babyfotos-wien/', label: t('nav.babyPhotos') },
    { path: '/schwangerschaftsfotos-wien/', label: t('nav.maternityPhotos') },
    { path: '/business-portrait-wien/', label: t('nav.businessPortraits') },
    { path: '/teamfotos-wien/', label: t('nav.teamPhotos') },
    { path: '/bewerbungsfotos-wien/', label: t('nav.linkedinPhotos') },
    { path: '/portrait-fotografie-wien/', label: t('nav.portraitPhotography') },
    { path: '/produkt-fotografie-wien/', label: t('nav.productPhotography') },
    { path: '/immobilien-fotografie-wien/', label: t('nav.realEstatePhotography') },
    { path: '/studio-fotografie-wien/', label: t('nav.studioPhotography') },
    { path: '/hochzeitsfotografie-wien/', label: t('nav.weddingPhotography') },
    { path: '/eventfotografie-wien/', label: t('nav.eventPhotography') },
    { path: '/schul-und-hochschulfotografie-wien/', label: t('nav.schoolPhotography') },
  ];

  // The studio's OWN services drive this menu, via the Authority Map the onboarding
  // crawl builds. The list above is the legacy hardcoded set, kept only as a fallback
  // for an instance that has a map matching those routes (New Age), and still filtered
  // by page visibility so disabled pages never appear as links that merely redirect.
  //
  // Until both the map and the visibility config load we show NOTHING: briefly
  // flashing services a studio does not offer is worse than a menu that fills a
  // moment later.
  const { map: authorityMap, loading: authorityLoading } = useAuthorityMap();

  const fotoshootingItems = (() => {
    if (enabledPages === null || authorityLoading) return [];

    const fromMap = (authorityMap?.pillars || [])
      .filter((p) => p.href && p.label)
      .map((p) => ({ path: p.href, label: p.label }));

    const source = fromMap.length ? fromMap : allFotoshootingItems;

    return source.filter((item) => {
      const def = pageForRoute(item.path);
      // Pages we don't gate (a studio's own generated pillars) always show.
      return def ? isPageEnabled(def.id, enabledPages, siteLang) : true;
    });
  })();

  // Nav paths are written with the canonical (German) routes the route table uses.
  // Localise them here so a visitor to an English studio sees /contact in the status bar
  // and lands there directly, instead of being bounced off /kontakt by the redirect.
  const L = (p: string) => (routeLang ? localizePath(p, routeLang) : p);

  const aboutItems = [
    { path: L('/ueber-uns/'), label: t('nav.about') },
    { path: L('/kontakt'), label: t('nav.contact') },
  ];

  const navItems = [
    { path: '/', label: t('nav.home') },
    { path: '/vouchers', label: t('nav.vouchers') },
    { path: '/blog', label: t('nav.blog') },
    { path: '/case-studies', label: t('nav.caseStudies') },
    { path: L('/warteliste'), label: t('nav.waitlist') },
  ];

  return (
    <header className="bg-white shadow-sm sticky top-0 z-50 relative">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <Link to="/" className="flex items-center">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={SITE.name}
              className="h-24 w-auto"
            />
          ) : (
            <span className="text-2xl font-semibold tracking-wide text-gray-900">{SITE.name}</span>
          )}
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-8">
          {navItems.map(item => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => handleNavClick(item.path)}
              className={`text-gray-700 hover:text-purple-600 transition-colors ${
                isActive(item.path) ? 'text-purple-600 font-semibold' : ''
              }`}
            >
              {item.label}
            </Link>
          ))}

          {/* Fotoshootings Dropdown */}
          {fotoshootingItems.length > 0 && (<div className="relative group"
            onMouseEnter={() => setFotoshootingsOpen(true)}
            onMouseLeave={() => setFotoshootingsOpen(false)}
          >
            <button className="text-gray-700 hover:text-purple-600 transition-colors flex items-center pointer-events-auto">
              {t('nav.photoshoots')}
              <ChevronDown size={16} className="ml-1" />
            </button>
            {fotoshootingsOpen && (
              <div className="absolute top-full left-0 pt-2 w-56 z-[100]">
                <div className="bg-white shadow-xl rounded-lg py-2 border border-gray-200">
                  {fotoshootingItems.map(item => (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => {
                        handleNavClick(item.path);
                        setFotoshootingsOpen(false);
                      }}
                      className={`block px-4 py-2 text-gray-700 hover:bg-purple-50 hover:text-purple-600 transition-colors ${
                        isActive(item.path) ? 'text-purple-600 font-semibold bg-purple-50' : ''
                      }`}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
          )}

          {/* About Dropdown */}
          <div 
            className="relative group"
            onMouseEnter={() => setAboutOpen(true)}
            onMouseLeave={() => setAboutOpen(false)}
          >
            <button 
              onClick={() => setAboutOpen(!aboutOpen)}
              className="text-gray-700 hover:text-purple-600 transition-colors flex items-center pointer-events-auto"
            >
              {t('nav.aboutUs')}
              <ChevronDown size={16} className="ml-1" />
            </button>
            {aboutOpen && (
              <div className="absolute top-full left-0 pt-2 w-48 z-[100]">
                <div className="bg-white shadow-xl rounded-lg py-2 border border-gray-200">
                  {aboutItems.map(item => (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => {
                        handleNavClick(item.path);
                        setAboutOpen(false);
                      }}
                      className={`block px-4 py-2 text-gray-700 hover:bg-purple-50 hover:text-purple-600 transition-colors ${
                        isActive(item.path) ? 'text-purple-600 font-semibold bg-purple-50' : ''
                      }`}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          <LanguageSelector
            className="text-gray-700"
            onSelect={(target) => {
              setLanguage(target as any);
              // en/de have paired localized URLs — move to the matching one.
              if (target === 'en' || target === 'de') {
                const localized = target === 'en' ? toEnglishPath(location.pathname) : toGermanPath(location.pathname);
                if (localized && localized !== location.pathname) navigate(localized);
              }
            }}
          />

          {/* Primary conversion CTA — the header's most-viewed real estate. */}
          <Link
            to={L('/warteliste')}
            onClick={() => handleNavClick('/warteliste')}
            className="inline-flex items-center rounded-full bg-purple-600 px-5 py-2.5 font-semibold text-white shadow-sm transition-colors hover:bg-purple-700"
          >
            {t('nav.bookSession')}
          </Link>

        </nav>

        {/* Mobile: always-visible CTA + menu button */}
        <div className="md:hidden flex items-center gap-3">
          <Link
            to={L('/warteliste')}
            onClick={() => handleNavClick('/warteliste')}
            className="inline-flex items-center rounded-full bg-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-purple-700"
          >
            {t('nav.bookSession')}
          </Link>
          <button
            className="text-gray-700 focus:outline-none"
            onClick={toggleMenu}
            aria-label="Toggle menu"
          >
            <Menu size={24} />
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="md:hidden bg-white shadow-lg">
          <div className="container mx-auto px-4 py-2 flex flex-col">
            {navItems.map(item => (
              <Link
                key={item.path}
                to={item.path}
                className={`py-2 text-gray-700 hover:text-purple-600 transition-colors ${
                  isActive(item.path) ? 'text-purple-600 font-semibold' : ''
                }`}
                onClick={() => {
                  handleNavClick(item.path);
                  setMenuOpen(false);
                }}
              >
                {item.label}
              </Link>
            ))}

            {/* Mobile Fotoshootings Submenu */}
            <div className="py-2">
              <button
                onClick={() => setFotoshootingsOpen(!fotoshootingsOpen)}
                className="w-full text-left text-gray-700 hover:text-purple-600 transition-colors flex items-center justify-between"
              >
                {t('nav.photoshoots')}
                <ChevronDown size={16} className={`transition-transform ${fotoshootingsOpen ? 'rotate-180' : ''}`} />
              </button>
              {fotoshootingsOpen && (
                <div className="pl-4 mt-2 space-y-2">
                  {fotoshootingItems.map(item => (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`block py-1 text-gray-600 hover:text-purple-600 transition-colors ${
                        isActive(item.path) ? 'text-purple-600 font-semibold' : ''
                      }`}
                      onClick={() => {
                        handleNavClick(item.path);
                        setMenuOpen(false);
                        setFotoshootingsOpen(false);
                      }}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Mobile About Submenu */}
            <div className="py-2">
              <button
                onClick={() => setAboutOpen(!aboutOpen)}
                className="w-full text-left text-gray-700 hover:text-purple-600 transition-colors flex items-center justify-between"
              >
                {t('nav.aboutUs')}
                <ChevronDown size={16} className={`transition-transform ${aboutOpen ? 'rotate-180' : ''}`} />
              </button>
              {aboutOpen && (
                <div className="pl-4 mt-2 space-y-2">
                  {aboutItems.map(item => (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`block py-1 text-gray-600 hover:text-purple-600 transition-colors ${
                        isActive(item.path) ? 'text-purple-600 font-semibold' : ''
                      }`}
                      onClick={() => {
                        handleNavClick(item.path);
                        setMenuOpen(false);
                        setAboutOpen(false);
                      }}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <div className="py-2">
              <LanguageSelector
                className="text-gray-700"
                onSelect={(target) => {
                  setLanguage(target as any);
                  setMenuOpen(false);
                  if (target === 'en' || target === 'de') {
                    const localized = target === 'en' ? toEnglishPath(location.pathname) : toGermanPath(location.pathname);
                    if (localized && localized !== location.pathname) navigate(localized);
                  }
                }}
              />
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
