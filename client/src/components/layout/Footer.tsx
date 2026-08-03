import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Facebook, Instagram, Twitter, User, LogIn, Mail } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { submitNewsletterForm } from '../../lib/forms';
import { SITE } from '../../config/site';

const Footer: React.FC = () => {
  const { t, language } = useLanguage();
  const { user, signOut } = useAuth();
  const [email, setEmail] = useState('');
  // Known active profiles — used when the tenant's SOCIAL_LINKS env doesn't
  // already provide them, so the footer icons always render. A configured
  // SOCIAL_LINKS entry still takes precedence.
  const SOCIAL_FALLBACK: Record<string, string> = {
    facebook: 'https://www.facebook.com/NewAgeFotografie',
    instagram: 'https://www.instagram.com/newagefotografie/',
  };
  // Match a configured social link by platform keyword; fall back to the known
  // profile (empty string → icon hidden).
  const socialUrl = (kw: string) =>
    SITE.social.find((u) => u.toLowerCase().includes(kw)) || SOCIAL_FALLBACK[kw] || '';
  // Known studio phone (Google Business Profile); env SITE.phone overrides.
  const phone = SITE.phone || '+43 677 63399210';
  const phoneDigits = phone.replace(/[^0-9]/g, '');

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subscribed, setSubscribed] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      setError(language === 'en' ? 'Please enter a valid email address.' : 'Bitte geben Sie eine gültige E-Mail-Adresse ein.');
      return;
    }

    // Simple email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError(language === 'en' ? 'Please enter a valid email address.' : 'Bitte geben Sie eine gültige E-Mail-Adresse ein.');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await submitNewsletterForm(email.trim(), { consent: true, sourcePath: window.location.pathname });
      
      if (result.success) {
        setSubscribed(true);
        setEmail('');
        // Reset after 5 seconds to allow new signups
        setTimeout(() => setSubscribed(false), 5000);
      } else {
        throw new Error(result.message || 'Signup failed');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : (language === 'en' ? 'An error occurred. Please try again later.' : 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.');
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <footer className="bg-gray-800 text-white mt-12">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company Info */}
          <div>
            <Link 
              to="/" 
              onClick={scrollToTop}
              className="text-white text-xl font-bold mb-4 block"
            >
              {SITE.name}
            </Link>
            <p className="text-gray-300 mb-4">
              {t('footer.tagline')}
            </p>
            <div className="flex space-x-4">
              {socialUrl('facebook') && (
                <a href={socialUrl('facebook')} target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-white transition-colors">
                  <Facebook size={20} />
                </a>
              )}
              {socialUrl('instagram') && (
                <a href={socialUrl('instagram')} target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-white transition-colors">
                  <Instagram size={20} />
                </a>
              )}
            </div>
          </div>
          
          {/* Photography Services */}
          <div>
            <h3 className="text-lg font-semibold mb-4">{t('footer.photoshoots')}</h3>
            <ul className="space-y-2">
              <li>
                <Link 
                  to="/familienfotos-wien/" 
                  onClick={scrollToTop}
                  className="text-gray-300 hover:text-white transition-colors text-sm"
                >
                  {t('footer.familyPhotos')}
                </Link>
              </li>
              <li>
                <Link 
                  to="/neugeborenenfotos-wien/" 
                  onClick={scrollToTop}
                  className="text-gray-300 hover:text-white transition-colors text-sm"
                >
                  {t('footer.newbornPhotos')}
                </Link>
              </li>
              <li>
                <Link 
                  to="/babyfotos-wien/" 
                  onClick={scrollToTop}
                  className="text-gray-300 hover:text-white transition-colors text-sm"
                >
                  {t('footer.babyPhotos')}
                </Link>
              </li>
              <li>
                <Link 
                  to="/schwangerschaftsfotos-wien/" 
                  onClick={scrollToTop}
                  className="text-gray-300 hover:text-white transition-colors text-sm"
                >
                  {t('footer.maternityPhotos')}
                </Link>
              </li>
              <li>
                <Link
                  to="/business-portrait-wien/"
                  onClick={scrollToTop}
                  className="text-gray-300 hover:text-white transition-colors text-sm"
                >
                  {t('footer.businessPortraits')}
                </Link>
              </li>
              <li>
                <Link
                  to="/schul-und-hochschulfotografie-wien/"
                  onClick={scrollToTop}
                  className="text-gray-300 hover:text-white transition-colors text-sm"
                >
                  {t('footer.schoolPhotography')}
                </Link>
              </li>
              <li>
                <Link 
                  to="/teamfotos-wien/" 
                  onClick={scrollToTop}
                  className="text-gray-300 hover:text-white transition-colors text-sm"
                >
                  {t('footer.teamPhotos')}
                </Link>
              </li>
              <li>
                <Link 
                  to="/bewerbungsfotos-wien/" 
                  onClick={scrollToTop}
                  className="text-gray-300 hover:text-white transition-colors text-sm"
                >
                  {t('footer.applicationPhotos')}
                </Link>
              </li>
              <li>
                <Link 
                  to="/portrait-fotografie-wien/" 
                  onClick={scrollToTop}
                  className="text-gray-300 hover:text-white transition-colors text-sm"
                >
                  {t('footer.portraitPhotography')}
                </Link>
              </li>
              <li>
                <Link 
                  to="/produkt-fotografie-wien/" 
                  onClick={scrollToTop}
                  className="text-gray-300 hover:text-white transition-colors text-sm"
                >
                  {t('footer.productPhotography')}
                </Link>
              </li>
              <li>
                <Link 
                  to="/immobilien-fotografie-wien/" 
                  onClick={scrollToTop}
                  className="text-gray-300 hover:text-white transition-colors text-sm"
                >
                  {t('footer.realEstatePhotography')}
                </Link>
              </li>
              <li>
                <Link 
                  to="/studio-fotografie-wien/" 
                  onClick={scrollToTop}
                  className="text-gray-300 hover:text-white transition-colors text-sm"
                >
                  {t('footer.studioPhotography')}
                </Link>
              </li>
              <li>
                <Link 
                  to="/hochzeitsfotografie-wien/" 
                  onClick={scrollToTop}
                  className="text-gray-300 hover:text-white transition-colors text-sm"
                >
                  {t('footer.weddingPhotography')}
                </Link>
              </li>
              <li>
                <Link 
                  to="/eventfotografie-wien/" 
                  onClick={scrollToTop}
                  className="text-gray-300 hover:text-white transition-colors text-sm"
                >
                  {t('footer.eventPhotography')}
                </Link>
              </li>
            </ul>
          </div>
          
          {/* Support & Info */}
          <div>
            <h3 className="text-lg font-semibold mb-4">{t('footer.supportInfo')}</h3>
            <ul className="space-y-2">
              <li>
                <Link 
                  to="/ueber-uns/" 
                  onClick={scrollToTop}
                  className="text-gray-300 hover:text-white transition-colors text-sm"
                >
                  {t('footer.aboutUs')}
                </Link>
              </li>
              <li>
                <Link 
                  to="/kontakt" 
                  onClick={scrollToTop}
                  className="text-gray-300 hover:text-white transition-colors text-sm"
                >
                  {t('footer.contactUs')}
                </Link>
              </li>
              <li>
                <Link 
                  to="/vouchers" 
                  onClick={scrollToTop}
                  className="text-gray-300 hover:text-white transition-colors text-sm"
                >
                  {t('footer.vouchers')}
                </Link>
              </li>
              <li>
                <Link
                  to="/blog"
                  onClick={scrollToTop}
                  className="text-gray-300 hover:text-white transition-colors text-sm"
                >
                  {t('footer.blogTips')}
                </Link>
              </li>
              <li>
                <Link
                  to="/case-studies"
                  onClick={scrollToTop}
                  className="text-gray-300 hover:text-white transition-colors text-sm"
                >
                  {language === 'de' ? 'Fallstudien' : 'Case Studies'}
                </Link>
              </li>
              {/* /warteliste intentionally NOT in the footer: it's already in the
                  sitewide header nav, and the SEO audit found the waitlist page
                  absorbing more link equity than any service page. */}
              <li>
                <Link
                  to="/portfolio"
                  onClick={scrollToTop}
                  className="text-gray-300 hover:text-white transition-colors text-sm"
                >
                  {t('footer.portfolio')}
                </Link>
              </li>
              <li>
                <Link 
                  to="/impressum/" 
                  onClick={scrollToTop}
                  className="text-gray-300 hover:text-white transition-colors text-sm"
                >
                  {t('footer.imprintPrivacy')}
                </Link>
              </li>
              <li>
                <Link 
                  to="/agb/" 
                  onClick={scrollToTop}
                  className="text-gray-300 hover:text-white transition-colors text-sm"
                >
                  {t('footer.termsConditions')}
                </Link>
              </li>
              <li>
                <Link 
                  to="/datenschutz/" 
                  onClick={scrollToTop}
                  className="text-gray-300 hover:text-white transition-colors text-sm"
                >
                  {t('footer.privacyPolicy')}
                </Link>
              </li>
              <li>
                <Link 
                  to="/model-release/" 
                  onClick={scrollToTop}
                  className="text-gray-300 hover:text-white transition-colors text-sm"
                >
                  {t('footer.modelRelease')}
                </Link>
              </li>
              <li>
                <Link
                  to="/preise/"
                  onClick={scrollToTop}
                  className="text-gray-300 hover:text-white transition-colors text-sm"
                >
                  {language === 'de' ? 'Fotoshooting Preise Wien' : 'Photoshoot Prices Vienna'}
                </Link>
              </li>
              <li>
                <Link
                  to="/kundenstimmen/"
                  onClick={scrollToTop}
                  className="text-gray-300 hover:text-white transition-colors text-sm"
                >
                  {language === 'de' ? 'Kundenstimmen – 4.9★ auf Google' : 'Reviews – 4.9★ on Google'}
                </Link>
              </li>
              <li>
                <Link
                  to="/warum-new-age-fotografie/"
                  onClick={scrollToTop}
                  className="text-gray-300 hover:text-white transition-colors text-sm"
                >
                  {language === 'de' ? 'Warum New Age Fotografie?' : 'Why New Age Fotografie?'}
                </Link>
              </li>
              <li>
                <Link
                  to="/gewerbliche-fotografie-wien/"
                  onClick={scrollToTop}
                  className="text-gray-300 hover:text-white transition-colors text-sm"
                >
                  {language === 'de' ? 'Gewerbliche Fotografie Wien' : 'Commercial Photography Vienna'}
                </Link>
              </li>
            </ul>
          </div>
          
          {/* Contact Info */}
          <div>
            <h3 className="text-lg font-semibold mb-4">{t('footer.contact')}</h3>
            <ul className="space-y-2 text-gray-300">
              <li className="text-sm">
                {t('contact.studioAddress')}
              </li>
              <li className="text-sm">
                {t('contact.addressNote')}
              </li>
              <li>
                <a
                  href={`tel:${phone.replace(/[^0-9+]/g, '')}`}
                  className="text-sm hover:text-purple-300 transition-colors"
                >
                  {language === 'de' ? 'Telefon' : 'Phone'}: {phone}
                </a>
              </li>
              <li>
                <a
                  href={`https://wa.me/${phoneDigits}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm hover:text-purple-300 transition-colors"
                >
                  WhatsApp: {phone}
                </a>
              </li>
              {SITE.email && (
                <li>
                  <a
                    href={`mailto:${SITE.email}`}
                    className="text-sm hover:text-purple-300 transition-colors"
                  >
                    {SITE.email}
                  </a>
                </li>
              )}
              {user ? (
                <>
                  <li className="pt-2">
                    <Link 
                      to="/gallery" 
                      onClick={scrollToTop}
                      className="text-purple-400 hover:text-purple-300 transition-colors flex items-center text-sm"
                    >
                      <User size={16} className="mr-2" />
                      {t('nav.gallery')}
                    </Link>
                  </li>
                  <li>
                    <button 
                      onClick={() => signOut()}
                      className="text-gray-300 hover:text-white transition-colors flex items-center text-sm"
                    >
                      <LogIn size={16} className="mr-2" />
                      {t('nav.logout')}
                    </button>
                  </li>
                </>
              ) : (
                <>
                  <li className="pt-2">
                    <Link
                      to="/galleries"
                      onClick={scrollToTop}
                      className="text-gray-300 hover:text-white transition-colors flex items-center text-sm"
                    >
                      <User size={16} className="mr-2" />
                      {t('footer.clientGallery')}
                    </Link>
                  </li>
                  <li className="pt-2">
                    {/* rel=nofollow so we don't advertise the login endpoint to crawlers. */}
                    <Link
                      to="/admin"
                      onClick={scrollToTop}
                      rel="nofollow"
                      className="text-purple-400 hover:text-purple-300 transition-colors flex items-center text-sm"
                    >
                      <LogIn size={16} className="mr-2" />
                      {t('footer.adminLogin')}
                    </Link>
                  </li>
                </>
              )}
            </ul>
          </div>

          {/* Newsletter Signup */}
          <div className="md:col-span-2 lg:col-span-4 mt-8">
            <div className="bg-gray-700 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-1">{t('newsletter.signup')}</h3>
              <p className="text-sm text-gray-300 mb-3">{t('newsletter.subtitle')}</p>
              {subscribed ? (
                <div className="text-green-400 flex items-center">
                  <Mail className="mr-2" />
                  {t('newsletter.thanks')}
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t('newsletter.placeholder')}
                    required
                    className="flex-1 px-4 py-2 rounded-lg bg-gray-600 text-white placeholder-gray-400 border border-gray-500 focus:outline-none focus:border-purple-500"
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className={`px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-500 text-white rounded-lg hover:opacity-90 transition-opacity ${
                      loading ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    {loading ? t('footer.sending') : t('newsletter.button')}
                  </button>
                </form>
              )}
              {error && (
                <p className="mt-2 text-red-400 text-sm">{error}</p>
              )}
            </div>
          </div>
        </div>
        
        {/* Copyright */}
        <div className="border-t border-gray-700 mt-8 pt-8 text-center text-gray-300">
          <p>&copy; {new Date().getFullYear()} {SITE.name}. {t('footer.copyright')}</p>
          <p className="mt-2 text-sm space-x-3">
            <button
              type="button"
              onClick={() => (window as any).openCookiePreferences?.()}
              className="text-gray-400 hover:text-purple-300 transition-colors underline hover:no-underline"
            >
              {t('footer.cookieSettings')}
            </button>
            <span className="text-gray-600">·</span>
            <a 
              href="https://www.togninja.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-purple-400 hover:text-purple-300 transition-colors"
            >
              Powered By TogNinja
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;