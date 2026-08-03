import { SEOHead } from '../../components/SEO/SEOHead';
import { RelatedServices } from '../../components/SEO/RelatedServices';
import { PillarGuides } from '../../components/SEO/PillarGuides';
import { ReviewsBlock } from '../../components/SEO/ReviewsBlock';
import Layout from '../../components/layout/Layout';
import GoogleReviews from '../../components/layout/GoogleReviews';
import { Link } from 'react-router-dom';
import { ContextualLinks } from '../../components/SEO/ContextualLinks';
import { Heart, Sparkles, Camera, ArrowRight, Check, Users } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useManualPageContent } from '../../hooks/useManualPageContent';
import MarkdownCopySlot from '../../components/MarkdownCopySlot';
import { newageCopyMap } from '../../content/newageCopyMap';
import { SITE } from '../../config/site';

export default function SchwangerschaftsfotosWienPage() {
  const { language } = useLanguage();
  const t = useManualPageContent('schwangerschaftsfotos');

  // Language-aware fallbacks
  const fallbacks = {
    en: {
      heroTitle: 'Maternity Photography in Vienna',
      heroSubtitle: 'Celebrate the Beauty of Pregnancy',
      heroDescription: 'Professional, stylish maternity photos that capture this special time forever. Partner and siblings are warmly welcome.',
      primaryCta: 'Book a Session',
      secondaryCta: 'Give a Maternity Voucher',
    },
    de: {
      heroTitle: 'Schwangerschaftsfotografie in Wien',
      heroSubtitle: 'Die Schönheit der Schwangerschaft feiern',
      heroDescription: 'Professionelle, stilvolle Schwangerschaftsfotos, die diese besondere Zeit für immer festhalten. Partner und Geschwisterkinder sind herzlich willkommen.',
      primaryCta: 'Termin buchen',
      secondaryCta: 'Schwangerschafts-Gutschein verschenken',
    }
  };

  const fb = fallbacks[language] || fallbacks.de;
  
  const fromManual = (key: string, fallback: string) => {
    const value = t(key);
    if (!value || value === key) {
      return fallback;
    }
    return value;
  };

  const heroTitle = fromManual('manual.schwangerschaftsfotos.heroTitle', fb.heroTitle);
  const heroSubtitle = fromManual('manual.schwangerschaftsfotos.heroTagline', fb.heroSubtitle);
  const heroDescription = fromManual('manual.schwangerschaftsfotos.heroDescription', fb.heroDescription);
  const primaryCta = fromManual('manual.schwangerschaftsfotos.primaryCta', fb.primaryCta);
  const secondaryCta = fromManual('manual.schwangerschaftsfotos.secondaryCta', fb.secondaryCta);
  const heroImage1 = fromManual('manual.schwangerschaftsfotos.heroImage1', '');
  const heroImage2 = fromManual('manual.schwangerschaftsfotos.heroImage2', '');
  const heroImage3 = fromManual('manual.schwangerschaftsfotos.heroImage3', '');
  const heroImage4 = fromManual('manual.schwangerschaftsfotos.heroImage4', '');
  const heroImage5 = fromManual('manual.schwangerschaftsfotos.heroImage5', '');
  
  return (
    <Layout>
    <div className="min-h-screen bg-white">
      <SEOHead
        title={newageCopyMap['schwangerschaftsfotos-wien'].title}
        description={newageCopyMap['schwangerschaftsfotos-wien'].metaDescription}
        keywords={t('maternity.seo.keywords')}
        canonical="/schwangerschaftsfotos-wien/"
        ogImage={`${SITE.url}/images/maternity-hero.jpg`}
        hreflang={[
          { lang: 'de', url: '/schwangerschaftsfotos-wien/' },
          { lang: 'en', url: '/en/maternity-photography-vienna/' }
        ]}
      />

      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-purple-50 via-white to-pink-50 pt-24 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Left: Text Content */}
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6 leading-tight">
                {heroTitle}
              </h1>
              {heroSubtitle && (
                <p className="text-xl text-gray-700 mb-4 leading-relaxed font-semibold">
                  {heroSubtitle}
                </p>
              )}
              <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                {heroDescription}
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  to="/warteliste"
                  className="inline-flex items-center justify-center px-8 py-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold text-lg"
                >
                  {primaryCta}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
                <Link
                  to="/gutschein/maternity"
                  className="inline-flex items-center justify-center px-8 py-4 border-2 border-purple-600 text-purple-600 rounded-lg hover:bg-purple-50 transition-colors font-semibold text-lg"
                >
                  {secondaryCta}
                </Link>
              </div>
            </div>

            {/* Right: Hero Images Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <img
                  src={heroImage1}
                  alt="Schwangere Frau beim Babybauch Fotoshooting in Wien"
                  className="rounded-2xl shadow-2xl w-full h-auto object-contain"
                  loading="eager"
                />
              </div>
              <div>
                <img
                  src={heroImage2}
                  alt="Schwangerschaftsfotografie Wien Studio"
                  className="rounded-xl shadow-lg w-full h-auto object-contain"
                  loading="eager"
                />
              </div>
              <div>
                <img
                  src={heroImage3}
                  alt="Babybauch Shooting Wien"
                  className="rounded-xl shadow-lg w-full h-auto object-contain"
                  loading="eager"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Google Reviews Section */}
      <GoogleReviews />

      <ContextualLinks pathname="/schwangerschaftsfotos-wien/" language={language} />

      {/* Introduction Section */}
      <section className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div className="prose prose-lg max-w-none">
              <p className="text-lg text-gray-700 leading-relaxed">
                {language === 'de'
                  ? `Willkommen bei ${SITE.name} – Ihrem Partner für emotionale Schwangerschaftsfotos in Wien! Unser Studio bietet den perfekten Rahmen für stilvolle Babybauch-Portraits. Ob klassisch, natürlich oder kreativ – wir nehmen uns Zeit für authentische Momente.`
                  : 'Welcome to New Age Photography – your partner for emotional maternity photos in Vienna! Our studio provides the perfect setting for stylish baby bump portraits. Whether classic, natural, or creative – we take time for authentic moments.'}
              </p>
              <p className="text-lg text-gray-700 leading-relaxed mt-4">
                {language === 'de'
                  ? 'Feiern Sie die Schönheit der Schwangerschaft mit professionellen, stilvollen Fotos, die diese besondere Zeit für immer festhalten. Partner und Geschwisterkinder sind herzlich willkommen.'
                  : 'Celebrate the beauty of pregnancy with professional, stylish photos that capture this special time forever. Partners and siblings are warmly welcome.'}
              </p>
            </div>
            <div>
              <img
                src={heroImage4}
                alt="Schwangerschaftsfotos Wien - Professionelle Babybauch-Fotografie im Studio"
                className="rounded-2xl shadow-lg w-full h-auto object-contain"
                loading="lazy"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Extended Content Section - Safe Copy Slot */}
      {language === 'de' && <MarkdownCopySlot content={newageCopyMap['schwangerschaftsfotos-wien'].markdown} />}

      {/* Packages Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12">
            {t('maternity.packages.title')}
          </h2>
          <div className="flex justify-center">
            {/* Maternity Premium */}
            <div className="bg-gradient-to-br from-purple-600 to-pink-600 text-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
              <h3 className="text-2xl font-bold mb-2">Maternity Premium</h3>
              <div className="mb-6">
                <div className="flex items-baseline">
                  <span className="text-sm text-purple-200 mr-1">{language === 'de' ? 'Ab' : 'From'}</span>
                  <span className="text-4xl font-bold">€399</span>
                </div>
              </div>
              <ul className="space-y-4 mb-8">
                <li className="flex items-start">
                  <Check className="h-5 w-5 text-yellow-300 mr-3 flex-shrink-0 mt-0.5" />
                  <span>{language === 'de' ? '60 Minuten Shooting' : '60 minute shoot'}</span>
                </li>
                <li className="flex items-start">
                  <Check className="h-5 w-5 text-yellow-300 mr-3 flex-shrink-0 mt-0.5" />
                  <span>{language === 'de' ? 'Alle Portraits als Datei (High-Quality JPG)' : 'All portraits as files (High-Quality JPG)'}</span>
                </li>
                <li className="flex items-start">
                  <Check className="h-5 w-5 text-yellow-300 mr-3 flex-shrink-0 mt-0.5" />
                  <span>{language === 'de' ? 'Bis zu 12 Personen & Haustiere möglich' : 'Up to 12 people & pets welcome'}</span>
                </li>
                <li className="flex items-start">
                  <Check className="h-5 w-5 text-yellow-300 mr-3 flex-shrink-0 mt-0.5" />
                  <span>{language === 'de' ? 'Gültig bis 2 Jahre' : 'Valid for up to 2 years'}</span>
                </li>
              </ul>
              <Link
                to="/warteliste"
                className="block text-center px-6 py-3 bg-white text-purple-600 rounded-lg hover:bg-gray-100 transition-colors font-semibold"
              >
                {language === 'de' ? 'Jetzt sichern' : 'Book Now'}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* What to Wear Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12">{t('maternity.clothing.title')}</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white rounded-lg p-6">
              <h3 className="font-semibold text-lg mb-3">{t('maternity.clothing.forYou.title')}</h3>
              <ul className="space-y-2 text-gray-700">
                <li>• {t('maternity.clothing.forYou.item1')}</li>
                <li>• {t('maternity.clothing.forYou.item2')}</li>
                <li>• {t('maternity.clothing.forYou.item3')}</li>
                <li>• {t('maternity.clothing.forYou.item4')}</li>
              </ul>
            </div>
            <div className="bg-white rounded-lg p-6">
              <h3 className="font-semibold text-lg mb-3">{t('maternity.clothing.forPartner.title')}</h3>
              <ul className="space-y-2 text-gray-700">
                <li>• {t('maternity.clothing.forPartner.item1')}</li>
                <li>• {t('maternity.clothing.forPartner.item2')}</li>
                <li>• {t('maternity.clothing.forPartner.item3')}</li>
                <li>• {t('maternity.clothing.forPartner.item4')}</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Related Services */}
      <section className="py-16 bg-purple-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-center mb-8">{t('maternity.related.title')}</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <Link
              to="/baby-fotografie-wien/"
              className="block bg-white rounded-xl p-6 hover:shadow-lg transition-shadow"
            >
              <h3 className="font-semibold text-lg mb-2">{t('maternity.related.newborn.title')}</h3>
              <p className="text-gray-600 text-sm mb-4">
                {t('maternity.related.newborn.description')}
              </p>
              <span className="text-purple-600 font-semibold flex items-center">
                {t('maternity.related.newborn.link')} <ArrowRight className="ml-1 h-4 w-4" />
              </span>
            </Link>
            <Link
              to="/familien-fotoshooting-wien/"
              className="block bg-white rounded-xl p-6 hover:shadow-lg transition-shadow"
            >
              <h3 className="font-semibold text-lg mb-2">{t('maternity.related.family.title')}</h3>
              <p className="text-gray-600 text-sm mb-4">
                {t('maternity.related.family.description')}
              </p>
              <span className="text-purple-600 font-semibold flex items-center">
                {t('maternity.related.family.link')} <ArrowRight className="ml-1 h-4 w-4" />
              </span>
            </Link>
            <Link
              to="/portrait-fotografie-wien/"
              className="block bg-white rounded-xl p-6 hover:shadow-lg transition-shadow"
            >
              <h3 className="font-semibold text-lg mb-2">{t('maternity.related.couple.title')}</h3>
              <p className="text-gray-600 text-sm mb-4">
                {t('maternity.related.couple.description')}
              </p>
              <span className="text-purple-600 font-semibold flex items-center">
                {t('maternity.related.couple.link')} <ArrowRight className="ml-1 h-4 w-4" />
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* Related Services Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {language === 'de' ? 'Weitere Fotografie-Services' : 'More Photography Services'}
            </h2>
            <p className="text-lg text-gray-600">
              {language === 'de' ? 'Komplette Fotodokumentation Ihrer Schwangerschaft und Familienzeit' : 'Complete photo documentation of your pregnancy and family time'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Baby Photography */}
            <Link
              to="/baby-fotografie-wien/"
              className="bg-gray-50 rounded-lg p-6 hover:shadow-lg transition-shadow group"
            >
              <Heart className="h-12 w-12 text-purple-600 mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-purple-600 transition-colors">
                {language === 'de' ? 'Baby & Newborn Fotografie' : 'Baby & Newborn Photography'}
              </h3>
              <p className="text-gray-600 mb-4">
                {language === 'de' ? 'Die perfekte Fortsetzung – zarte Neugeborenenfotos in den ersten Lebenstagen.' : 'The perfect continuation – delicate newborn photos in the first days of life.'}
              </p>
              <span className="text-purple-600 font-semibold inline-flex items-center">
                {language === 'de' ? 'Mehr erfahren' : 'Learn more'} <ArrowRight className="ml-2 h-4 w-4" />
              </span>
            </Link>

            {/* Family Photography */}
            <Link
              to="/familien-fotoshooting-wien/"
              className="bg-gray-50 rounded-lg p-6 hover:shadow-lg transition-shadow group"
            >
              <Users className="h-12 w-12 text-purple-600 mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-purple-600 transition-colors">
                {language === 'de' ? 'Familienfotografie' : 'Family Photography'}
              </h3>
              <p className="text-gray-600 mb-4">
                {language === 'de' ? 'Natürliche Familienporträts mit Baby – wachsende Familien in Szene setzen.' : 'Natural family portraits with baby – capturing growing families beautifully.'}
              </p>
              <span className="text-purple-600 font-semibold inline-flex items-center">
                {language === 'de' ? 'Mehr erfahren' : 'Learn more'} <ArrowRight className="ml-2 h-4 w-4" />
              </span>
            </Link>

            {/* Business Portraits */}
            <Link
              to="/business-portrait-wien/"
              className="bg-gray-50 rounded-lg p-6 hover:shadow-lg transition-shadow group"
            >
              <Camera className="h-12 w-12 text-purple-600 mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-purple-600 transition-colors">
                Business Portraits
              </h3>
              <p className="text-gray-600 mb-4">
                {language === 'de' ? 'Professionelle Headshots für LinkedIn und Bewerbungen – selbstbewusst zurück ins Business.' : 'Professional headshots for LinkedIn and applications – confidently back in business.'}
              </p>
              <span className="text-purple-600 font-semibold inline-flex items-center">
                {language === 'de' ? 'Mehr erfahren' : 'Learn more'} <ArrowRight className="ml-2 h-4 w-4" />
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-purple-600 to-pink-600 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            {t('maternity.cta.title')}
          </h2>
          <p className="text-xl mb-8 opacity-90">
            {t('maternity.cta.description')}
          </p>
          <Link
            to="/warteliste"
            className="inline-flex items-center px-8 py-4 bg-white text-purple-600 rounded-lg hover:bg-gray-100 transition-colors font-semibold text-lg"
          >
            {t('maternity.cta.button')}
            <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
        </div>
      </section>

      <ReviewsBlock />
      <PillarGuides pillar="/schwangerschaftsfotos-wien/" />
      <RelatedServices currentPath="/schwangerschaftsfotos-wien/" />

    </div>
    </Layout>
  );
}
