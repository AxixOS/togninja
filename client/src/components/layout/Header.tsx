import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { toEnglishPath, toGermanPath } from '../../config/localeRoutes';
import { Menu, Globe, ChevronDown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useManualPageContent } from '../../hooks/useManualPageContent';
import { SITE } from '../../config/site';

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
  const logoUrl = dbLogo
    || (customLogo && customLogo !== 'site.logo' ? customLogo : (SITE.logo || '/frontend-logo.jpg'));

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
  const fotoshootingItems = [
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

  const aboutItems = [
    { path: '/ueber-uns/', label: t('nav.about') },
    { path: '/kontakt', label: t('nav.contact') },
  ];

  const navItems = [
    { path: '/', label: t('nav.home') },
    { path: '/vouchers', label: t('nav.vouchers') },
    { path: '/blog', label: t('nav.blog') },
    { path: '/case-studies', label: t('nav.caseStudies') },
    { path: '/warteliste', label: t('nav.waitlist') },
  ];

  return (
    <header className="bg-white shadow-sm sticky top-0 z-50 relative">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <Link to="/" className="flex items-center">
          <img
            src={logoUrl}
            alt={SITE.name}
            className="h-24 w-auto"
          />
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
          <div 
            className="relative group"
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

          <button
            onClick={toggleLanguage}
            className="text-gray-700 hover:text-purple-600 transition-colors flex items-center"
            aria-label="Toggle language"
          >
            <Globe size={18} className="mr-1" />
            <span className="uppercase">{language}</span>
          </button>

          {/* Primary conversion CTA — the header's most-viewed real estate. */}
          <Link
            to="/warteliste"
            onClick={() => handleNavClick('/warteliste')}
            className="inline-flex items-center rounded-full bg-purple-600 px-5 py-2.5 font-semibold text-white shadow-sm transition-colors hover:bg-purple-700"
          >
            {t('nav.bookSession')}
          </Link>

        </nav>

        {/* Mobile: always-visible CTA + menu button */}
        <div className="md:hidden flex items-center gap-3">
          <Link
            to="/warteliste"
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

            <button
              onClick={() => {
                toggleLanguage();
                setMenuOpen(false);
              }}
              className="py-2 text-left text-gray-700 hover:text-purple-600 transition-colors flex items-center"
            >
              <Globe size={18} className="mr-1" />
              <span className="uppercase">{language}</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;