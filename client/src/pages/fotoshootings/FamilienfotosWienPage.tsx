import { SEOHead } from '../../components/SEO/SEOHead';
import { ServiceSchema } from '../../components/SEO/ServiceSchema';
import { RelatedServices } from '../../components/SEO/RelatedServices';
import { PillarGuides } from '../../components/SEO/PillarGuides';
import { ReviewsBlock } from '../../components/SEO/ReviewsBlock';
import Layout from '../../components/layout/Layout';
import GoogleReviews from '../../components/layout/GoogleReviews';
import { Link, useNavigate } from 'react-router-dom';
import { Camera, Heart, Users, Star, ArrowRight, Check, Clock, Baby, Music, Smile } from 'lucide-react';
import { useManualPageContent } from '../../hooks/useManualPageContent';
import { useCart } from '../../context/CartContext';
import { useLanguage } from '../../context/LanguageContext';
import { SITE } from '../../config/site';

export default function FamilienfotosWienPage() {
  const navigate = useNavigate();
  const { addItem } = useCart();
  const t = useManualPageContent('familienfotos');
  const { language } = useLanguage();

  // Language-aware fallbacks
  const fallbacks = {
    en: {
      heroTitle: 'Family Photography in Vienna',
      heroSubtitle: 'Family Photos – Studio Packages (up to 12 people)',
      heroDescription: 'Our promise: Quiet studio, friendly guidance, real moments. Max. 12 people per session – children, grandparents & pets are warmly welcome. Outfit changes? Absolutely. Feel free to bring toys & hobby props (ball, violin, favorite book...).',
      primaryCta: 'Book a Spot on the Waitlist',
      secondaryCta: 'Give a Family Voucher',
    },
    de: {
      heroTitle: 'Familienfotografie in Wien',
      heroSubtitle: 'Familienfotos – Studio-Pakete (bis 12 Personen)',
      heroDescription: 'Kurzversprechen: Ruhiges Studio, freundliche Anleitung, echte Momente. Max. 12 Personen pro Termin – Kinder, Großeltern & Haustiere sind herzlich willkommen. Outfitwechsel? Sehr gern. Bringt gern Spielzeug & Hobby-Requisiten (Ball, Geige, Lieblingsbuch …) mit.',
      primaryCta: 'Termin auf der Warteliste sichern',
      secondaryCta: 'Familien-Gutschein verschenken',
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

  const heroTitle = fromManual('manual.familienfotos.heroTitle', fb.heroTitle);
  const heroSubtitle = fromManual('manual.familienfotos.heroTagline', fb.heroSubtitle);
  const heroDescription = fromManual(
    'manual.familienfotos.heroDescription',
    fb.heroDescription
  );
  const primaryCta = fromManual('manual.familienfotos.primaryCta', fb.primaryCta);
  const secondaryCta = fromManual('manual.familienfotos.secondaryCta', fb.secondaryCta);
  const heroImage1 = fromManual('manual.familienfotos.heroImage1', '');
  const heroImage2 = fromManual('manual.familienfotos.heroImage2', '');
  const heroImage3 = fromManual('manual.familienfotos.heroImage3', '');
  const heroImage4 = fromManual('manual.familienfotos.heroImage4', '');
  const heroImage5 = fromManual('manual.familienfotos.heroImage5', '');
  const heroDescriptionContent = (() => {
    if (!heroDescription) return null;
    const [firstSegment, ...rest] = heroDescription.split(':');
    if (rest.length === 0) return heroDescription;
    return (
      <>
        <strong>{firstSegment}:</strong>
        {rest.join(':')}
      </>
    );
  })();

  const handleBookPackage = (packageName: string, price: number, description: string) => {
    addItem({
      title: packageName,
      price: price,
      quantity: 1,
      packageType: 'Familienfotografie',
      type: 'voucher'
    });
    navigate('/cart');
  };

  return (
    <Layout>
    <div className="min-h-screen bg-white">
      <SEOHead
        title={`Familienfotos Wien – Studio & Outdoor | ${SITE.name}`}
        description="Professionelle Familienfotos in Wien: Ruhiges Studio, freundliche Anleitung, echte Momente. Bis zu 12 Personen inkl. Kinder, Großeltern & Haustiere. Ab €199 – jetzt Termin buchen!"
        keywords="familienfotograf wien, familienfotos wien, familienfotografie wien, fotoshooting familie wien"
        canonical="/familienfotos-wien/"
        ogImage={`${SITE.url}/images/family-hero.jpg`}
        hreflang={[
          { lang: 'de', url: '/familienfotos-wien/' },
          { lang: 'en', url: '/en/family-photos-vienna/' }
        ]}
      />
      <ServiceSchema
        serviceName="Familienfotografie in Wien"
        description="Ruhiges Studio, freundliche Anleitung, echte Momente. Max. 12 Personen pro Termin."
        url="/familienfotos-wien/"
        serviceType="PhotographyService"
      />

      {/* Hero Section - with space for 2-3 images */}
      <section className="relative bg-gradient-to-br from-purple-50 via-white to-pink-50 pt-24 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Left: Text Content */}
            <div>
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 leading-tight">
                {heroTitle}
              </h1>
              <p className="text-xl text-gray-700 mb-4 leading-relaxed font-semibold">
                {heroSubtitle}
              </p>
              <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                {heroDescriptionContent}
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
                  to="/gutschein/family"
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
                  alt="Familienfotografie in Wien - Glückliche Großfamilie beim professionellen Fotoshooting im Studio"
                  title="Professionelle Familienfotografie Wien - Studio Shooting mit bis zu 12 Personen"
                  className="rounded-2xl shadow-2xl w-full h-auto object-contain"
                  loading="eager"
                />
              </div>
              <div>
                <img
                  src={heroImage2}
                  alt="Familienportrait Wien - Natürliche Familienfotos im modernen Studio"
                  title="Familienfotos Wien - Authentische Momente und echte Emotionen"
                  className="rounded-xl shadow-lg w-full h-auto object-contain"
                  loading="eager"
                />
              </div>
              <div>
                <img
                  src={heroImage3}
                  alt="Familie Fotoshooting Wien - Professionelle Familienportraits mit Kindern und Eltern"
                  title="Familienfotograf Wien - Erinnerungen für die Ewigkeit festhalten"
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

      {/* Introduction Section */}
      <section className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div className="prose prose-lg max-w-none">
              <p className="text-lg text-gray-700 leading-relaxed">
                {language === 'de'
                  ? `Willkommen bei ${SITE.name} – Ihrem Familienfotografen in Wien! Unser ruhiges Studio bietet den perfekten Rahmen für authentische Familienfotos. Ob kleine Familie oder Großfamilie mit bis zu 12 Personen – wir nehmen uns Zeit für echte Momente und natürliche Emotionen.`
                  : `Welcome to ${SITE.name} – your family photographer in Vienna! Our quiet studio provides the perfect setting for authentic family photos. Whether a small family or a large family of up to 12 people – we take the time for real moments and natural emotions.`}
              </p>
              <p className="text-lg text-gray-700 leading-relaxed mt-4">
                {language === 'de'
                  ? 'Bringt gerne eure Persönlichkeit mit: Lieblingsspielzeug der Kinder, Musikinstrumente, Sportgeräte oder das Familienmaskottchen. Diese persönlichen Details machen eure Fotos einzigartig und erzählen eure Geschichte.'
                  : 'Feel free to bring your personality along: children\'s favorite toys, musical instruments, sports equipment, or the family mascot. These personal details make your photos unique and tell your story.'}
              </p>
              <p className="text-base text-gray-600 leading-relaxed mt-4">
                {language === 'de' ? (
                  <>
                    Ergänzend zu <Link to="/familien-fotoshooting-wien/" className="text-purple-600 hover:text-purple-700 underline underline-offset-2">Familien-Fotoshootings Wien</Link> bieten
                    wir auch <Link to="/neugeborenenfotos-wien/" className="text-purple-600 hover:text-purple-700 underline underline-offset-2">Neugeborenenfotos Wien</Link>,{' '}
                    <Link to="/schwangerschaftsfotos-wien/" className="text-purple-600 hover:text-purple-700 underline underline-offset-2">Schwangerschaftsfotos Wien</Link>,{' '}
                    <Link to="/babyfotos-wien/" className="text-purple-600 hover:text-purple-700 underline underline-offset-2">Babyfotos Wien</Link> und{' '}
                    <Link to="/kinder-fotografie-wien/" className="text-purple-600 hover:text-purple-700 underline underline-offset-2">Kinderfotografie Wien</Link> an.
                    Alle <Link to="/calculator" className="text-purple-600 hover:text-purple-700 underline underline-offset-2">Preise & Pakete</Link> ab €95.
                  </>
                ) : (
                  <>
                    In addition to family shootings, we also offer{' '}
                    <Link to="/neugeborenenfotos-wien/" className="text-purple-600 hover:text-purple-700 underline underline-offset-2">newborn photography Vienna</Link>,{' '}
                    <Link to="/schwangerschaftsfotos-wien/" className="text-purple-600 hover:text-purple-700 underline underline-offset-2">maternity photos Vienna</Link>, and{' '}
                    <Link to="/babyfotos-wien/" className="text-purple-600 hover:text-purple-700 underline underline-offset-2">baby photography Vienna</Link>.
                    All <Link to="/calculator" className="text-purple-600 hover:text-purple-700 underline underline-offset-2">packages from €95</Link>.
                  </>
                )}
              </p>
            </div>
            <div>
              <img
                src={heroImage4}
                alt="Familienfotos Wien - Großfamilie professionell fotografiert mit persönlichen Details"
                title="Familienfotografie Wien - Bis zu 12 Personen mit Haustieren und Requisiten"
                className="rounded-2xl shadow-lg w-full h-auto object-contain"
                loading="lazy"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Packages Section - Familienfotos Studio-Pakete */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {language === 'de' ? 'Unsere Pakete' : 'Our Packages'}
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              {language === 'de' ? 'Bis 12 Personen pro Termin' : 'Up to 12 people per session'}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-12">
            {/* Family Basic Package */}
            <div className="bg-white rounded-2xl shadow-lg p-8 hover:shadow-xl transition-shadow">
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Family Basic</h3>
              </div>
              
              <div className="mb-6">
                <div className="flex items-baseline">
                  <span className="text-sm text-gray-500 mr-1">Ab</span>
                  <span className="text-4xl font-bold text-purple-600">€95</span>
                </div>
              </div>

              <div className="space-y-4 mb-4">
                <div className="flex items-start">
                  <Check className="h-5 w-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">{language === 'de' ? '60 Min Shooting' : '60 min shooting'}</span>
                </div>
                <div className="flex items-start">
                  <Check className="h-5 w-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">{language === 'de' ? '1 retuschiertes Portrait digital + Leinwand 40×30 cm' : '1 retouched portrait digital + canvas 40×30 cm'}</span>
                </div>
                <div className="flex items-start">
                  <Check className="h-5 w-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">{language === 'de' ? 'Nutzungsrechte privat' : 'Private usage rights'}</span>
                </div>
                <div className="flex items-start">
                  <Check className="h-5 w-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">{language === 'de' ? 'Bis zu 12 Personen und auch Haustiere möglich' : 'Up to 12 people and pets welcome'}</span>
                </div>
              </div>

              <p className="text-gray-400 text-sm mb-6">{language === 'de' ? 'Gültig bis 2 Jahre' : 'Valid for up to 2 years'}</p>

              <button
                onClick={() => handleBookPackage('Family Basic', 95, 'Familienfotografie - 60 Min, 1 Portrait + Leinwand 40×30 cm')}
                className="block w-full text-center px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-semibold"
              >
                {language === 'de' ? 'Jetzt Buchen' : 'Book Now'}
              </button>
            </div>

            {/* Family Classic Package - BESTSELLER */}
            <div className="bg-gradient-to-br from-purple-600 to-pink-600 text-white rounded-2xl shadow-2xl p-8 transform sm:scale-105 relative">
              <div className="absolute top-0 right-0 bg-yellow-400 text-gray-900 text-sm font-bold px-4 py-2 rounded-bl-lg rounded-tr-2xl">
                {language === 'de' ? 'BESTSELLER' : 'BESTSELLER'}
              </div>
              
              <div className="mb-6 mt-4">
                <h3 className="text-2xl font-bold mb-2">Family Classic</h3>
              </div>
              
              <div className="mb-6">
                <div className="flex items-baseline">
                  <span className="text-sm mr-1">Ab</span>
                  <span className="text-4xl font-bold">€195</span>
                </div>
              </div>

              <div className="space-y-4 mb-4">
                <div className="flex items-start">
                  <Check className="h-5 w-5 text-yellow-300 mr-3 flex-shrink-0 mt-0.5" />
                  <span>{language === 'de' ? '60 Min Shooting' : '60 min shooting'}</span>
                </div>
                <div className="flex items-start">
                  <Check className="h-5 w-5 text-yellow-300 mr-3 flex-shrink-0 mt-0.5" />
                  <span>{language === 'de' ? '2 retuschierte Portraits digital + 2x Leinwand 30×40 cm' : '2 retouched portraits digital + 2x canvas 30×40 cm'}</span>
                </div>
                <div className="flex items-start">
                  <Check className="h-5 w-5 text-yellow-300 mr-3 flex-shrink-0 mt-0.5" />
                  <span>{language === 'de' ? 'Nutzungsrechte privat' : 'Private usage rights'}</span>
                </div>
                <div className="flex items-start">
                  <Check className="h-5 w-5 text-yellow-300 mr-3 flex-shrink-0 mt-0.5" />
                  <span>{language === 'de' ? 'Bis zu 12 Personen und auch Haustiere möglich' : 'Up to 12 people and pets welcome'}</span>
                </div>
              </div>

              <p className="text-purple-200 text-sm mb-6">{language === 'de' ? 'Gültig bis 2 Jahre' : 'Valid for up to 2 years'}</p>

              <button
                onClick={() => handleBookPackage('Family Classic', 195, 'Familienfotografie - 60 Min, 2 Portraits + 2x Leinwand 30×40 cm')}
                className="block w-full text-center px-6 py-3 bg-white text-purple-600 rounded-lg hover:bg-gray-100 transition-colors font-semibold"
              >
                {language === 'de' ? 'Jetzt Buchen' : 'Book Now'}
              </button>
            </div>

            {/* Family Premium Package */}
            <div className="bg-white rounded-2xl shadow-lg p-8 hover:shadow-xl transition-shadow">
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Family Premium</h3>
              </div>
              
              <div className="mb-6">
                <div className="flex items-baseline">
                  <span className="text-sm text-gray-500 mr-1">Ab</span>
                  <span className="text-4xl font-bold text-purple-600">€225</span>
                </div>
              </div>

              <div className="space-y-4 mb-4">
                <div className="flex items-start">
                  <Check className="h-5 w-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">{language === 'de' ? '60 Min Shooting' : '60 min shooting'}</span>
                </div>
                <div className="flex items-start">
                  <Check className="h-5 w-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">{language === 'de' ? '5 retuschierte Fotos digital' : '5 retouched photos digital'}</span>
                </div>
                <div className="flex items-start">
                  <Check className="h-5 w-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">{language === 'de' ? 'Leinwand 40×30 cm' : 'Canvas 40×30 cm'}</span>
                </div>
                <div className="flex items-start">
                  <Check className="h-5 w-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">{language === 'de' ? 'Nutzungsrechte privat' : 'Private usage rights'}</span>
                </div>
                <div className="flex items-start">
                  <Check className="h-5 w-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">{language === 'de' ? 'Bis zu 12 Personen und auch Haustiere möglich' : 'Up to 12 people and pets welcome'}</span>
                </div>
              </div>

              <p className="text-gray-400 text-sm mb-6">{language === 'de' ? 'Gültig bis 2 Jahre' : 'Valid for up to 2 years'}</p>

              <button
                onClick={() => handleBookPackage('Family Premium', 225, 'Familienfotografie - 60 Min, 5 Fotos + Leinwand 40×30 cm')}
                className="block w-full text-center px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-semibold"
              >
                {language === 'de' ? 'Jetzt Buchen' : 'Book Now'}
              </button>
            </div>
          </div>

          {/* Immer inklusive Section */}
          <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">{language === 'de' ? 'Immer inklusive:' : 'Always included:'}</h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="flex items-start">
                <Users className="h-6 w-6 text-purple-600 mr-3 flex-shrink-0 mt-1" />
                <div>
                  <p className="font-semibold text-gray-900 mb-1">{language === 'de' ? 'Bis 12 Personen pro Termin' : 'Up to 12 people per session'}</p>
                  <p className="text-gray-600 text-sm">{language === 'de' ? 'Kinder & Pets zählen mit – wir planen die Kombinationen' : 'Children & pets count – we plan the combinations'}</p>
                </div>
              </div>
              <div className="flex items-start">
                <Smile className="h-6 w-6 text-purple-600 mr-3 flex-shrink-0 mt-1" />
                <div>
                  <p className="font-semibold text-gray-900 mb-1">{language === 'de' ? 'Outfitwechsel erwünscht' : 'Outfit changes welcome'}</p>
                  <p className="text-gray-600 text-sm">{language === 'de' ? 'Wir empfehlen 2 Looks pro Person.' : 'We recommend 2 looks per person.'}</p>
                </div>
              </div>
              <div className="flex items-start">
                <Music className="h-6 w-6 text-purple-600 mr-3 flex-shrink-0 mt-1" />
                <div>
                  <p className="font-semibold text-gray-900 mb-1">{language === 'de' ? 'Requisiten/Hobby-Items willkommen' : 'Props/hobby items welcome'}</p>
                  <p className="text-gray-600 text-sm">{language === 'de' ? 'Musikinstrumente, Sport, Kuscheltier – bringt euer Leben mit!' : 'Musical instruments, sports, stuffed animals – bring your life along!'}</p>
                </div>
              </div>
              <div className="flex items-start">
                <Camera className="h-6 w-6 text-purple-600 mr-3 flex-shrink-0 mt-1" />
                <div>
                  <p className="font-semibold text-gray-900 mb-1">{language === 'de' ? 'Ruhige Auswahlgalerie online' : 'Relaxed online selection gallery'}</p>
                  <p className="text-gray-600 text-sm">{language === 'de' ? 'Retusche nach eurer Auswahl – kein Zeitdruck' : 'Retouching after your selection – no time pressure'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Optionen */}
          <div className="bg-purple-50 rounded-xl p-6">
            <h4 className="font-bold text-gray-900 mb-4">{language === 'de' ? 'Optionen (auf Wunsch):' : 'Options (on request):'}</h4>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
              <div className="flex items-center">
                <Check className="h-4 w-4 text-purple-600 mr-2" />
                <span>{language === 'de' ? 'Zusätzliches digitales Portrait' : 'Extra digital portrait'} <strong>€20</strong></span>
              </div>
              <div className="flex items-center">
                <Check className="h-4 w-4 text-purple-600 mr-2" />
                <span>{language === 'de' ? 'Express-Bearbeitung 72 h:' : 'Express editing 72 h:'} <strong>€60</strong></span>
              </div>
              <div className="flex items-center">
                <Check className="h-4 w-4 text-purple-600 mr-2" />
                <span>{language === 'de' ? 'Fine-Art-Album ab' : 'Fine art album from'} <strong>€195</strong></span>
              </div>
              <div className="flex items-center">
                <Check className="h-4 w-4 text-purple-600 mr-2" />
                <span>{language === 'de' ? 'Duplikat-Leinwand 40×30' : 'Duplicate canvas 40×30'} <strong>€59</strong> / 60×40 <strong>€89</strong></span>
              </div>
            </div>
          </div>

          {/* CTA Buttons after packages */}
          <div className="mt-12 text-center bg-gradient-to-r from-purple-100 to-pink-100 rounded-2xl p-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">{language === 'de' ? 'Jetzt buchen' : 'Book now'}</h3>
            <p className="text-gray-700 mb-6">
              👉 <strong>{language === 'de' ? 'Termin sichern:' : 'Secure your spot:'}</strong> {language === 'de' ? 'Plätze sind begrenzt – sichern Sie sich Ihren Wunschtermin auf der Warteliste' : 'Spots are limited – secure your preferred date on the waitlist'}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/warteliste"
                className="inline-flex items-center justify-center px-8 py-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold"
              >
                {language === 'de' ? 'Termin auf der Warteliste sichern' : 'Secure a spot on the waitlist'}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
              <Link
                to="/gutschein/family"
                className="inline-flex items-center justify-center px-8 py-4 border-2 border-purple-600 text-purple-600 rounded-lg hover:bg-purple-50 transition-colors font-semibold"
              >
                {language === 'de' ? 'Familien-Gutschein verschenken' : 'Give a Family Voucher'}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Shooting-Ablauf Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-12">
            <img
              src={heroImage5}
              alt="Familienfotografie Wien Ablauf - Professionelles Studio-Shooting für diverse Familien"
              title="Familienfotograf Wien - Shooting-Ablauf im modernen Fotostudio"
              className="rounded-xl shadow-lg w-full h-auto object-contain"
              loading="lazy"
            />
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">{language === 'de' ? 'Shooting-Ablauf (Studio)' : 'Shooting Process (Studio)'}</h2>
          <div className="grid md:grid-cols-5 gap-6">
            <div className="text-center">
              <div className="bg-purple-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-purple-600">1</span>
              </div>
              <h3 className="font-semibold mb-2 text-gray-900">{language === 'de' ? 'Kurzbriefing' : 'Quick briefing'}</h3>
              <p className="text-gray-600 text-sm">{language === 'de' ? 'Familiengröße, Looks, besondere Wünsche' : 'Family size, looks, special requests'}</p>
            </div>
            <div className="text-center">
              <div className="bg-purple-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-purple-600">2</span>
              </div>
              <h3 className="font-semibold mb-2 text-gray-900">{language === 'de' ? 'Ankommen & Outfitcheck' : 'Arrival & outfit check'}</h3>
              <p className="text-gray-600 text-sm">{language === 'de' ? 'Wir stimmen Farben ab' : 'We coordinate colors'}</p>
            </div>
            <div className="text-center">
              <div className="bg-purple-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-purple-600">3</span>
              </div>
              <h3 className="font-semibold mb-2 text-gray-900">{language === 'de' ? 'Shooting mit Anleitung' : 'Guided shooting'}</h3>
              <p className="text-gray-600 text-sm">{language === 'de' ? 'Gesamt, Teilgruppen, Geschwister, Eltern-Kind, Einzelportraits' : 'Full group, subgroups, siblings, parent-child, individual portraits'}</p>
            </div>
            <div className="text-center">
              <div className="bg-purple-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-purple-600">4</span>
              </div>
              <h3 className="font-semibold mb-2 text-gray-900">{language === 'de' ? 'Requisiten & Hobbys' : 'Props & hobbies'}</h3>
              <p className="text-gray-600 text-sm">{language === 'de' ? '1–2 Motive mit Items einplanen' : 'Plan 1–2 shots with personal items'}</p>
            </div>
            <div className="text-center">
              <div className="bg-purple-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-purple-600">5</span>
              </div>
              <h3 className="font-semibold mb-2 text-gray-900">{language === 'de' ? 'Auswahlgalerie' : 'Selection gallery'}</h3>
              <p className="text-gray-600 text-sm">{language === 'de' ? 'Favoriten markieren → Retusche → Download & Leinwand' : 'Mark favorites → retouching → download & canvas'}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Mini-FAQ Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12">{fromManual('manual.familienfotos.faqHeading', 'Mini-FAQ')}</h2>
          <div className="space-y-6">
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="font-bold text-lg text-gray-900 mb-2">{fromManual('manual.familienfotos.faqQ1', 'Wie viele Outfitwechsel schaffen wir?')}</h3>
              <p className="text-gray-600">{fromManual('manual.familienfotos.faqA1', 'In 60 Min. meist 2 Looks pro Person; Basic: 1–2 Looks je nach Gruppengröße.')}</p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="font-bold text-lg text-gray-900 mb-2">{fromManual('manual.familienfotos.faqQ2', 'Dürfen Haustiere mit?')}</h3>
              <p className="text-gray-600">{fromManual('manual.familienfotos.faqA2', 'Ja – kurze Info vorab, damit wir eine „Pet-Pause" einplanen.')}</p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="font-bold text-lg text-gray-900 mb-2">{fromManual('manual.familienfotos.faqQ3', 'Wie schnell bekommen wir die Bilder?')}</h3>
              <p className="text-gray-600">{fromManual('manual.familienfotos.faqA3', 'Auswahl noch am selben Tag möglich; finale Retusche digital innerhalb von 7 Tagen, Prints innerhalb von 14 Tagen.')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Internal Linking - Related Services */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-center mb-8">{language === 'de' ? 'Weitere Fotografie-Services' : 'More Photography Services'}</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <Link
              to="/baby-fotografie-wien/"
              className="block bg-purple-50 rounded-xl p-6 hover:shadow-lg transition-shadow"
            >
              <Baby className="h-10 w-10 text-purple-600 mb-4" />
              <h3 className="font-semibold text-lg mb-2 text-gray-900">{language === 'de' ? 'Baby & Newborn Fotografie' : 'Baby & Newborn Photography'}</h3>
              <p className="text-gray-600 text-sm mb-4">
                {language === 'de' ? 'Zarte Neugeborenenfotos mit Herz und Sicherheit' : 'Gentle newborn photos with heart and safety'}
              </p>
              <span className="text-purple-600 font-semibold flex items-center">
                {language === 'de' ? 'Mehr erfahren' : 'Learn more'} <ArrowRight className="ml-1 h-4 w-4" />
              </span>
            </Link>
            <Link
              to="/schwangerschaftsfotos-wien/"
              className="block bg-purple-50 rounded-xl p-6 hover:shadow-lg transition-shadow"
            >
              <Heart className="h-10 w-10 text-purple-600 mb-4" />
              <h3 className="font-semibold text-lg mb-2 text-gray-900">{language === 'de' ? 'Schwangerschafts-Fotos' : 'Maternity Photos'}</h3>
              <p className="text-gray-600 text-sm mb-4">
                {language === 'de' ? 'Emotionale Babybauch-Portraits im Studio oder Outdoor' : 'Emotional baby bump portraits in studio or outdoor'}
              </p>
              <span className="text-purple-600 font-semibold flex items-center">
                {language === 'de' ? 'Mehr erfahren' : 'Learn more'} <ArrowRight className="ml-1 h-4 w-4" />
              </span>
            </Link>
            <Link
              to="/business-portrait-wien/"
              className="block bg-purple-50 rounded-xl p-6 hover:shadow-lg transition-shadow"
            >
              <Camera className="h-10 w-10 text-purple-600 mb-4" />
              <h3 className="font-semibold text-lg mb-2 text-gray-900">{language === 'de' ? 'Business-Portraits' : 'Business Portraits'}</h3>
              <p className="text-gray-600 text-sm mb-4">
                {language === 'de' ? 'Professionelle Unternehmensfotos & LinkedIn-Portraits' : 'Professional corporate photos & LinkedIn portraits'}
              </p>
              <span className="text-purple-600 font-semibold flex items-center">
                {language === 'de' ? 'Mehr erfahren' : 'Learn more'} <ArrowRight className="ml-1 h-4 w-4" />
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* Related Services - Internal Links */}
      <ReviewsBlock />
      <PillarGuides pillar="/familienfotos-wien/" />
      <RelatedServices currentPath="/familienfotos-wien/" />

      {/* Weitere Fotoshootings in Wien – compact internal link block */}
      <section className="py-12 bg-gray-50 border-t border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            {language === 'de' ? 'Weitere Fotoshootings in Wien' : 'More Photo Shoots in Vienna'}
          </h3>
          <ul className="grid sm:grid-cols-2 gap-3 mb-6 max-w-2xl mx-auto">
            <li>
              <Link to="/babyfotos-wien/" className="text-purple-700 hover:text-purple-900 font-medium underline underline-offset-2">
                {language === 'de' ? 'Babyfotografie Wien' : 'Baby Photography Vienna'}
              </Link>
            </li>
            <li>
              <Link to="/kinder-fotografie-wien/" className="text-purple-700 hover:text-purple-900 font-medium underline underline-offset-2">
                {language === 'de' ? 'Kinderfotografie Wien' : "Children's Photography Vienna"}
              </Link>
            </li>
            <li>
              <Link to="/schwangerschaftsfotos-wien/" className="text-purple-700 hover:text-purple-900 font-medium underline underline-offset-2">
                {language === 'de' ? 'Schwangerschaftsfotografie Wien' : 'Maternity Photography Vienna'}
              </Link>
            </li>
            <li>
              <Link to="/neugeborenenfotos-wien/" className="text-purple-700 hover:text-purple-900 font-medium underline underline-offset-2">
                {language === 'de' ? 'Neugeborenenfotografie Wien' : 'Newborn Photography Vienna'}
              </Link>
            </li>
          </ul>
          <p className="text-center text-gray-700">
            <Link to="/calculator" className="text-purple-700 hover:text-purple-900 font-semibold underline underline-offset-2">
              {language === 'de' ? 'Preise für Familienfotos' : 'Family photo prices'}
            </Link>
            <span className="mx-2 text-gray-400">·</span>
            <Link to="/warteliste/" className="text-purple-700 hover:text-purple-900 font-semibold underline underline-offset-2">
              {language === 'de' ? 'Jetzt Termin sichern' : 'Book appointment now'}
            </Link>
          </p>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-16 bg-gradient-to-r from-purple-600 to-pink-600 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            {language === 'de' ? 'Bereit für unvergessliche Familienfotos?' : 'Ready for unforgettable family photos?'}
          </h2>
          <p className="text-xl mb-8 opacity-90">
            {language === 'de' ? 'Sichern Sie sich jetzt Ihren Wunschtermin – Plätze sind begrenzt' : 'Secure your preferred date now – spots are limited'}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/warteliste"
              className="inline-flex items-center justify-center px-8 py-4 bg-white text-purple-600 rounded-lg hover:bg-gray-100 transition-colors font-semibold text-lg"
            >
              {language === 'de' ? 'Termin auf der Warteliste sichern' : 'Secure a spot on the waitlist'}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>

    </div>
    </Layout>
  );
}
