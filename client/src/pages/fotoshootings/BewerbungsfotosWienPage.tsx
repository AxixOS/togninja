import { SEOHead } from '../../components/SEO/SEOHead';
import { ServiceSchema } from '../../components/SEO/ServiceSchema';
import { RelatedServices } from '../../components/SEO/RelatedServices';
import Layout from '../../components/layout/Layout';
import GoogleReviews from '../../components/layout/GoogleReviews';
import MarkdownCopySlot from '../../components/MarkdownCopySlot';
import { newageCopyMap } from '../../content/newageCopyMap';
import { Link } from 'react-router-dom';
import { ContextualLinks } from '../../components/SEO/ContextualLinks';
import { Camera, Heart, Users, Star, ArrowRight, Check, Clock, Briefcase, Linkedin, TrendingUp, Palette, Shield, Eye } from 'lucide-react';
import { useManualPageContent } from '../../hooks/useManualPageContent';
import { useLanguage } from '../../context/LanguageContext';
import { SITE } from '../../config/site';

export default function BewerbungsfotosWienPage() {
  const t = useManualPageContent('bewerbungsfotos');
  const { language } = useLanguage();

  // Language-aware fallbacks
  const fallbacks = {
    en: {
      heroTitle: 'Application Photos & LinkedIn Portraits in Vienna',
      heroSubtitle: 'Clear, professional, personable.',
      heroDescription: 'Your application photos in Vienna are created in our studio with expert posing coaching, fast delivery times and backgrounds that match your industry. Perfect for CV, LinkedIn, Xing, email signature & company profile.',
      primaryCta: 'Book a Spot on the Waitlist',
      secondaryCta: 'View All Prices',
    },
    de: {
      heroTitle: 'Bewerbungsfotos & LinkedIn-Portraits in Wien',
      heroSubtitle: 'Klar, professionell, sympathisch.',
      heroDescription: 'Ihre Bewerbungsfotos in Wien entstehen bei uns im Studio mit sicherem Posing-Coaching, schnellen Lieferzeiten und Hintergründen, die zu Ihrer Branche passen. Perfekt für Lebenslauf, LinkedIn, Xing, E-Mail-Signatur & Firmenprofil.',
      primaryCta: 'Termin auf der Warteliste sichern',
      secondaryCta: 'Alle Preise ansehen',
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

  const heroTitle = fromManual('manual.bewerbungsfotos.heroTitle', fb.heroTitle);
  const heroSubtitle = fromManual('manual.bewerbungsfotos.heroTagline', fb.heroSubtitle);
  const heroDescription = fromManual('manual.bewerbungsfotos.heroDescription', fb.heroDescription);
  const primaryCta = fromManual('manual.bewerbungsfotos.primaryCta', fb.primaryCta);
  const secondaryCta = fromManual('manual.bewerbungsfotos.secondaryCta', fb.secondaryCta);
  const heroImage1 = fromManual('manual.bewerbungsfotos.heroImage1', '');
  const heroImage2 = fromManual('manual.bewerbungsfotos.heroImage2', '');
  const heroImage3 = fromManual('manual.bewerbungsfotos.heroImage3', '');
  const heroImage4 = fromManual('manual.bewerbungsfotos.heroImage4', '');
  const heroImage5 = fromManual('manual.bewerbungsfotos.heroImage5', '');

  return (
    <Layout>
    <div className="min-h-screen bg-white">
      <SEOHead
        title={newageCopyMap['bewerbungsfotos-wien'].title}
        description={newageCopyMap['bewerbungsfotos-wien'].metaDescription}
        keywords="bewerbungsfotos wien, linkedin foto wien, bewerbungsfoto professionell wien, xing foto wien"
        canonical="/bewerbungsfotos-wien/"
        ogImage={`${SITE.url}/images/bewerbung-hero.jpg`}
        hreflang={[
          { lang: 'de', url: '/bewerbungsfotos-wien/' },
          { lang: 'en', url: '/en/application-photos-vienna/' }
        ]}
      />      <ServiceSchema
        serviceName={newageCopyMap['bewerbungsfotos-wien'].h1}
        description={newageCopyMap['bewerbungsfotos-wien'].metaDescription}
        url="/bewerbungsfotos-wien/"
        serviceType="PhotographyService"
      />
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white pt-24 pb-16">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-900/20 to-pink-900/20"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Left: Text Content */}
            <div>
              <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
                {heroTitle}
              </h1>
              <p className="text-xl text-gray-300 mb-4 leading-relaxed font-semibold">
                {heroSubtitle}
              </p>
              <p className="text-lg text-gray-400 mb-8 leading-relaxed">
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
                  to="/preise"
                  className="inline-flex items-center justify-center px-8 py-4 border-2 border-white text-white rounded-lg hover:bg-white/10 transition-colors font-semibold text-lg"
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
                  alt="Bewerbungsfotos Wien Studio"
                  className="rounded-2xl shadow-2xl w-full h-auto object-contain"
                  loading="eager"
                />
              </div>
              <div>
                <img
                  src={heroImage2}
                  alt="LinkedIn Portrait Wien"
                  className="rounded-xl shadow-lg w-full h-auto object-contain"
                  loading="eager"
                />
              </div>
              <div>
                <img
                  src={heroImage3}
                  alt="Professionelles Bewerbungsfoto Wien"
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

      <ContextualLinks pathname="/bewerbungsfotos-wien/" language={language} />

      {/* Introduction Section */}
      <section className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div className="prose prose-lg max-w-none">
              <p className="text-lg text-gray-700 leading-relaxed">
                {language === 'de' ? (
                  <>
                    Willkommen bei {SITE.name} – Ihrem Partner für professionelle{' '}
                    <Link to="/bewerbungsfotos-wien/" className="text-purple-600 hover:text-purple-700 underline underline-offset-2">Bewerbungsfotos in Wien</Link>!
                    Unser Studio bietet die perfekte Umgebung für Bewerbungsfotos, LinkedIn-Portraits und XING-Profile. Für ein
                    umfassenderes Branding empfehlen wir zusätzlich unsere{' '}
                    <Link to="/business-portrait-wien/" className="text-purple-600 hover:text-purple-700 underline underline-offset-2">Business Portrait Fotografie</Link>.
                    Mit gezieltem Posing-Coaching, variablen Hintergründen und schneller Lieferung erstellen wir Portraits, die
                    Ihre beruflichen Chancen maximieren.
                  </>
                ) : (
                  <>
                    Welcome to {SITE.name} – your partner for professional{' '}
                    <Link to="/bewerbungsfotos-wien/" className="text-purple-600 hover:text-purple-700 underline underline-offset-2">application photos in Vienna</Link>!
                    Our studio offers the perfect environment for application photos, LinkedIn portraits and XING profiles. For
                    broader branding, we also offer{' '}
                    <Link to="/business-portrait-wien/" className="text-purple-600 hover:text-purple-700 underline underline-offset-2">Business Portrait photography</Link>.
                    With expert posing coaching, variable backgrounds and fast delivery, we create portraits that maximise your
                    career opportunities.
                  </>
                )}
              </p>
              <p className="text-lg text-gray-700 leading-relaxed mt-4">
                {language === 'de' ? (
                  <>
                    Von Berufseinsteigern über Professionals bis zu Führungskräften – wir liefern Bewerbungsfotos, die seriös,
                    sympathisch und branchengerecht sind. Viele Kunden kombinieren ihr Shooting mit{' '}
                    <Link to="/teamfotos-wien/" className="text-purple-600 hover:text-purple-700 underline underline-offset-2">Teamfotos Wien</Link> oder{' '}
                    <Link to="/portrait-fotografie-wien/" className="text-purple-600 hover:text-purple-700 underline underline-offset-2">Portraitfotografie Wien</Link>,
                    um ein einheitliches Erscheinungsbild zu schaffen. Alle{' '}
                    <Link to="/calculator" className="text-purple-600 hover:text-purple-700 underline underline-offset-2">Preise & Pakete</Link> ab €95 –
                    jetzt{' '}
                    <Link to="/warteliste/" className="text-purple-600 hover:text-purple-700 underline underline-offset-2">Termin sichern</Link>.
                  </>
                ) : (
                  <>
                    From career starters to professionals and executives – we deliver application photos that are professional,
                    personable and industry-appropriate. Many clients combine their shoot with{' '}
                    <Link to="/teamfotos-wien/" className="text-purple-600 hover:text-purple-700 underline underline-offset-2">team photos Vienna</Link>.
                    See all <Link to="/calculator" className="text-purple-600 hover:text-purple-700 underline underline-offset-2">packages from €95</Link>.
                  </>
                )}
              </p>
            </div>
            <div>
              <img
                src={heroImage4}
                alt="Bewerbungsfotos Wien Studio"
                className="rounded-2xl shadow-lg w-full h-auto object-contain"
                loading="lazy"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Extended Content Section - Safe Copy Slot */}
      {language === 'de' && <MarkdownCopySlot content={newageCopyMap['bewerbungsfotos-wien'].markdown} />}

      {/* Packages Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {language === 'de' ? 'Pakete & Preise' : 'Packages & Prices'}
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              {language === 'de'
                ? 'Alle Pakete inkl. natürlicher Retusche, High-Res & Web-Export (JPG/PNG), 1:1 Coaching vor der Kamera und rechtssichere Nutzung für Eigenwerbung & berufliche Profile.'
                : 'All packages incl. natural retouching, high-res & web export (JPG/PNG), 1:1 coaching in front of the camera and legally compliant usage for self-promotion & professional profiles.'}
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto mb-12">
            {/* Bewerbungsfotos & LinkedIn */}
            <div className="bg-gradient-to-br from-purple-600 to-pink-600 text-white rounded-2xl shadow-2xl p-8 relative">
              <div className="absolute top-0 right-0 bg-yellow-400 text-gray-900 text-sm font-bold px-4 py-2 rounded-bl-lg rounded-tr-2xl">
                {language === 'de' ? 'BELIEBT' : 'POPULAR'}
              </div>
              
              <div className="mb-6 mt-4">
                <h3 className="text-2xl font-bold mb-2">{language === 'de' ? 'Bewerbungsfotos & LinkedIn' : 'Application Photos & LinkedIn'}</h3>
                <p className="text-purple-100 font-medium">{language === 'de' ? 'Bewerbungen & LinkedIn' : 'Applications & LinkedIn'}</p>
              </div>
              
              <div className="mb-6">
                <div className="flex items-baseline">
                  <span className="text-sm text-purple-200 mr-1">{language === 'de' ? 'Ab' : 'From'}</span>
                  <span className="text-4xl font-bold">€129</span>
                </div>
              </div>

              <div className="space-y-4 mb-8">
                <div className="flex items-start">
                  <Check className="h-5 w-5 text-yellow-300 mr-3 flex-shrink-0 mt-0.5" />
                  <span>{language === 'de' ? 'Inkl. 2 retuschierte Bilder' : 'Incl. 2 retouched images'}</span>
                </div>
                <div className="flex items-start">
                  <Check className="h-5 w-5 text-yellow-300 mr-3 flex-shrink-0 mt-0.5" />
                  <span>{language === 'de' ? 'Für Bewerbungen & LinkedIn' : 'For applications & LinkedIn'}</span>
                </div>
                <div className="flex items-start">
                  <Check className="h-5 w-5 text-yellow-300 mr-3 flex-shrink-0 mt-0.5" />
                  <span>{language === 'de' ? 'Gültig bis 2 Jahre' : 'Valid for up to 2 years'}</span>
                </div>
              </div>

              <Link
                to="/warteliste"
                className="block text-center px-6 py-3 bg-white text-purple-600 rounded-lg hover:bg-gray-100 transition-colors font-semibold"
              >
                {language === 'de' ? 'Jetzt buchen' : 'Book Now'}
              </Link>
            </div>

            {/* Brand Upgrade */}
            <div className="bg-white rounded-2xl shadow-lg p-8 hover:shadow-xl transition-shadow">
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Brand Upgrade</h3>
                <p className="text-purple-600 font-medium">{language === 'de' ? 'Maximale Vielfalt' : 'Maximum Variety'}</p>
              </div>
              
              <div className="mb-6">
                <div className="flex items-baseline">
                  <span className="text-sm text-gray-500 mr-1">{language === 'de' ? 'Ab' : 'From'}</span>
                  <span className="text-4xl font-bold text-purple-600">€295</span>
                </div>
              </div>

              <div className="space-y-4 mb-8">
                <div className="flex items-start">
                  <Check className="h-5 w-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">{language === 'de' ? '75–90 Min.' : '75–90 min.'}</span>
                </div>
                <div className="flex items-start">
                  <Check className="h-5 w-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">{language === 'de' ? 'Bis zu 3 Looks/Outfits' : 'Up to 3 looks/outfits'}</span>
                </div>
                <div className="flex items-start">
                  <Check className="h-5 w-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">{language === 'de' ? '10 retuschierte Bilder (High-Res + Web)' : '10 retouched images (high-res + web)'}</span>
                </div>
                <div className="flex items-start">
                  <Check className="h-5 w-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">{language === 'de' ? 'Mehrere Hintergründe & Licht-Variationen' : 'Multiple backgrounds & lighting variations'}</span>
                </div>
                <div className="flex items-start">
                  <Check className="h-5 w-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">{language === 'de' ? 'Gültig bis 2 Jahre' : 'Valid for up to 2 years'}</span>
                </div>
              </div>

              <Link
                to="/warteliste"
                className="block text-center px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-semibold"
              >
                {language === 'de' ? 'Jetzt buchen' : 'Book Now'}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Background & Style Options Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">{language === 'de' ? 'Hintergrund- & Stiloptionen' : 'Background & Style Options'}</h2>
          
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-gray-50 rounded-xl p-6">
              <h3 className="font-semibold text-lg text-gray-900 mb-3 flex items-center">
                <Palette className="h-5 w-5 text-purple-600 mr-2" />
                {language === 'de' ? 'Hintergründe' : 'Backgrounds'}
              </h3>
              <p className="text-gray-700 text-sm">
                {language === 'de'
                  ? 'Hell, Dunkel, Mittelgrau, sanfte CI-Farbe; optional dezenter Office-Look (unscharfer Business-Hintergrund).'
                  : 'Light, dark, medium grey, subtle CI colour; optional discreet office look (blurred business background).'}
              </p>
            </div>

            <div className="bg-gray-50 rounded-xl p-6">
              <h3 className="font-semibold text-lg text-gray-900 mb-3 flex items-center">
                <Camera className="h-5 w-5 text-purple-600 mr-2" />
                {language === 'de' ? 'Licht' : 'Lighting'}
              </h3>
              <p className="text-gray-700 text-sm">
                {language === 'de'
                  ? 'Schönes, weiches Clamshell-Licht (gleichmäßig & schmeichelnd), bei Bedarf Akzentlicht für mehr Kontur.'
                  : 'Beautiful, soft clamshell lighting (even & flattering), accent light for more contour if needed.'}
              </p>
            </div>

            <div className="bg-gray-50 rounded-xl p-6">
              <h3 className="font-semibold text-lg text-gray-900 mb-3 flex items-center">
                <TrendingUp className="h-5 w-5 text-purple-600 mr-2" />
                {language === 'de' ? 'Crops & Formate' : 'Crops & Formats'}
              </h3>
              <p className="text-gray-700 text-sm">
                {language === 'de'
                  ? 'LinkedIn-Square, CV-Hochformat, Website-Querformat, Banner-Header.'
                  : 'LinkedIn square, CV portrait, website landscape, banner header.'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Retouching Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">{language === 'de' ? 'Retusche (natürlich & seriös)' : 'Retouching (natural & professional)'}</h2>
          
          <div className="bg-white rounded-xl p-8 shadow-lg">
            <ul className="space-y-3">
              <li className="flex items-start">
                <Check className="h-5 w-5 text-purple-600 mr-3 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700">{language === 'de' ? 'Hautglättung dezent, Glanzreduktion, Augen-Boost, Zahnaufhellung leicht' : 'Subtle skin smoothing, shine reduction, eye enhancement, light teeth whitening'}</span>
              </li>
              <li className="flex items-start">
                <Check className="h-5 w-5 text-purple-600 mr-3 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700">{language === 'de' ? 'Kragen/Anzug/Bluse, Staub & Fussel, abstehende Haare' : 'Collar/suit/blouse, dust & lint, stray hairs'}</span>
              </li>
              <li className="flex items-start">
                <Check className="h-5 w-5 text-purple-600 mr-3 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700">{language === 'de' ? 'Farb-/Kontrast-Feinschliff passend zum Hintergrund' : 'Colour/contrast fine-tuning matched to the background'}</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Process Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-12">
            <img
              src={heroImage5}
              alt="Bewerbungsfotos Wien Beispiele"
              className="rounded-2xl shadow-lg w-full h-auto object-contain"
              loading="lazy"
            />
          </div>

          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">{language === 'de' ? "So läuft's ab" : 'How It Works'}</h2>
          <div className="grid md:grid-cols-5 gap-6">
            <div className="text-center">
              <div className="bg-purple-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-purple-600">1</span>
              </div>
              <h3 className="font-semibold mb-2 text-gray-900">{language === 'de' ? 'Ankommen & Styling-Check' : 'Arrival & Styling Check'}</h3>
              <p className="text-gray-600 text-sm">{language === 'de' ? 'Brille reinigen, Kragen prüfen, Haare glätten' : 'Clean glasses, check collar, smooth hair'}</p>
            </div>
            <div className="text-center">
              <div className="bg-purple-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-purple-600">2</span>
              </div>
              <h3 className="font-semibold mb-2 text-gray-900">{language === 'de' ? 'Kurzes Posing-Coaching' : 'Brief Posing Coaching'}</h3>
              <p className="text-gray-600 text-sm">{language === 'de' ? '3–4 Grundposen, die immer funktionieren' : '3–4 basic poses that always work'}</p>
            </div>
            <div className="text-center">
              <div className="bg-purple-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-purple-600">3</span>
              </div>
              <h3 className="font-semibold mb-2 text-gray-900">{language === 'de' ? 'Serien mit Live-Ansicht' : 'Series with Live View'}</h3>
              <p className="text-gray-600 text-sm">{language === 'de' ? 'Auswahl direkt am Bildschirm' : 'Selection directly on screen'}</p>
            </div>
            <div className="text-center">
              <div className="bg-purple-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-purple-600">4</span>
              </div>
              <h3 className="font-semibold mb-2 text-gray-900">{language === 'de' ? 'Feinauswahl & Retusche-Wünsche' : 'Final Selection & Retouching Preferences'}</h3>
              <p className="text-gray-600 text-sm">{language === 'de' ? 'Sie bestimmen den Look' : 'You decide the look'}</p>
            </div>
            <div className="text-center">
              <div className="bg-purple-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-purple-600">5</span>
              </div>
              <h3 className="font-semibold mb-2 text-gray-900">{language === 'de' ? 'Lieferung' : 'Delivery'}</h3>
              <p className="text-gray-600 text-sm">{language === 'de' ? 'Preview noch am selben Tag, finale Retuschen 48–72 h' : 'Preview same day, final retouching 48–72 h'}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Preparation Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">{language === 'de' ? 'Vorbereitung – kleine Checkliste' : 'Preparation – Quick Checklist'}</h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="font-semibold text-lg text-gray-900 mb-3">{language === 'de' ? 'Outfits' : 'Outfits'}</h3>
              <p className="text-gray-700 text-sm">
                {language === 'de' ? 'Uni-Farben, feine Strukturen, nichts zu Glänzendes; 2–3 Optionen mitbringen.' : 'Solid colours, fine textures, nothing too shiny; bring 2–3 options.'}
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="font-semibold text-lg text-gray-900 mb-3">{language === 'de' ? 'Brille' : 'Glasses'}</h3>
              <p className="text-gray-700 text-sm">
                {language === 'de' ? 'Entspiegelung reinigen; wir achten auf Reflexe.' : 'Clean anti-glare coating; we watch for reflections.'}
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="font-semibold text-lg text-gray-900 mb-3">{language === 'de' ? 'Make-up/Haare' : 'Make-up/Hair'}</h3>
              <p className="text-gray-700 text-sm">
                {language === 'de' ? 'Matt & natürlich. Kamm/Lippenpflege einpacken.' : 'Matte & natural. Pack a comb/lip balm.'}
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="font-semibold text-lg text-gray-900 mb-3">{language === 'de' ? 'Branche' : 'Industry'}</h3>
              <p className="text-gray-700 text-sm">
                {language === 'de' ? 'Creative? Tech? Finance? – Wir matchen Hintergrund & Licht zu Ihrem Ziel.' : 'Creative? Tech? Finance? – We match background & lighting to your goal.'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12">{fromManual('manual.bewerbungsfotos.faqHeading', language === 'de' ? 'FAQ – Bewerbungsfotos Wien' : 'FAQ – Application Photos Vienna')}</h2>
          <div className="space-y-6">
            <div className="bg-gray-50 rounded-xl p-6">
              <h3 className="font-bold text-lg text-gray-900 mb-2">{fromManual('manual.bewerbungsfotos.faqQ1', language === 'de' ? 'Wie schnell bekomme ich die Bilder?' : 'How quickly will I receive the images?')}</h3>
              <p className="text-gray-600">
                {fromManual('manual.bewerbungsfotos.faqA1', language === 'de' ? 'Preview am selben Tag, finale Retuschen 48–72 h, Express 24 h/6 h möglich.' : 'Preview same day, final retouching 48–72 h, express 24 h/6 h available.')}
              </p>
            </div>
            <div className="bg-gray-50 rounded-xl p-6">
              <h3 className="font-bold text-lg text-gray-900 mb-2">{fromManual('manual.bewerbungsfotos.faqQ2', language === 'de' ? 'Bekomme ich alle Aufnahmen?' : 'Will I receive all shots?')}</h3>
              <p className="text-gray-600">
                {fromManual('manual.bewerbungsfotos.faqA2', language === 'de' ? 'Sie erhalten die retuschierten Favoriten in High-Res & Web-Größe. Zusatzbilder sind jederzeit nachbestellbar.' : 'You receive your retouched favourites in high-res & web size. Additional images can be ordered anytime.')}
              </p>
            </div>
            <div className="bg-gray-50 rounded-xl p-6">
              <h3 className="font-bold text-lg text-gray-900 mb-2">{fromManual('manual.bewerbungsfotos.faqQ3', language === 'de' ? 'Darf ich die Fotos beruflich nutzen?' : 'Can I use the photos professionally?')}</h3>
              <p className="text-gray-600">
                {language === 'de'
                  ? <>Ja, für Eigenwerbung: Bewerbungen, LinkedIn/Xing, Website-Profil, Signatur, Speaker-Profile. (Für Paid-Ads/Printkampagnen bitte kurz anfragen.)</>
                  : <>Yes, for self-promotion: applications, LinkedIn/Xing, website profile, signature, speaker profiles. (For paid ads/print campaigns, please enquire.)</>}
              </p>
            </div>
            <div className="bg-gray-50 rounded-xl p-6">
              <h3 className="font-bold text-lg text-gray-900 mb-2">{fromManual('manual.bewerbungsfotos.faqQ4', language === 'de' ? 'Gibt es Rabatte für Teams?' : 'Are there discounts for teams?')}</h3>
              <p className="text-gray-600">
                {language === 'de'
                  ? <>Ja – siehe unsere <Link to="/teamfotos-wien/" className="text-purple-600 hover:text-purple-700 underline">Team- & Mitarbeiterfotos</Link> mit On-Site-Ablauf.</>
                  : <>Yes – see our <Link to="/teamfotos-wien/" className="text-purple-600 hover:text-purple-700 underline">team & employee photos</Link> with on-site workflow.</>}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Internal Linking - Related Services */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-center mb-8">{language === 'de' ? 'Weitere Business-Services' : 'More Business Services'}</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <Link
              to="/business-portrait-wien/"
              className="block bg-white rounded-xl p-6 hover:shadow-lg transition-shadow"
            >
              <Briefcase className="h-10 w-10 text-purple-600 mb-4" />
              <h3 className="font-semibold text-lg mb-2 text-gray-900">{language === 'de' ? 'Business-Portraits' : 'Business Portraits'}</h3>
              <p className="text-gray-600 text-sm mb-4">
                {language === 'de' ? 'Professionelle Einzelportraits für LinkedIn, CEO & Personal-Branding' : 'Professional individual portraits for LinkedIn, CEO & personal branding'}
              </p>
              <span className="text-purple-600 font-semibold flex items-center">
                {language === 'de' ? 'Mehr erfahren' : 'Learn more'} <ArrowRight className="ml-1 h-4 w-4" />
              </span>
            </Link>
            <Link
              to="/teamfotos-wien/"
              className="block bg-white rounded-xl p-6 hover:shadow-lg transition-shadow"
            >
              <Users className="h-10 w-10 text-purple-600 mb-4" />
              <h3 className="font-semibold text-lg mb-2 text-gray-900">{language === 'de' ? 'Team- & Mitarbeiterfotos' : 'Team & Employee Photos'}</h3>
              <p className="text-gray-600 text-sm mb-4">
                {language === 'de' ? 'Mobiles Studio vor Ort, einheitlicher Look, schneller Ablauf' : 'Mobile studio on-site, consistent look, fast workflow'}
              </p>
              <span className="text-purple-600 font-semibold flex items-center">
                {language === 'de' ? 'Mehr erfahren' : 'Learn more'} <ArrowRight className="ml-1 h-4 w-4" />
              </span>
            </Link>
            <Link
              to="/familienfotos-wien/"
              className="block bg-white rounded-xl p-6 hover:shadow-lg transition-shadow"
            >
              <Heart className="h-10 w-10 text-purple-600 mb-4" />
              <h3 className="font-semibold text-lg mb-2 text-gray-900">{language === 'de' ? 'Familienfotografie' : 'Family Photography'}</h3>
              <p className="text-gray-600 text-sm mb-4">
                {language === 'de' ? 'Authentische Familienfotos im Studio mit bis zu 12 Personen' : 'Authentic family photos in the studio with up to 12 people'}
              </p>
              <span className="text-purple-600 font-semibold flex items-center">
                {language === 'de' ? 'Mehr erfahren' : 'Learn more'} <ArrowRight className="ml-1 h-4 w-4" />
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* Related Services - Internal Links */}
      <RelatedServices currentPath="/bewerbungsfotos-wien/" />

      {/* Weitere Business Fotoshootings – compact internal link block */}
      <section className="py-12 bg-gray-50 border-t border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            {language === 'de' ? 'Weitere Business Fotoshootings' : 'More Business Photo Shoots'}
          </h3>
          <ul className="grid sm:grid-cols-2 gap-3 mb-6 max-w-2xl mx-auto">
            <li>
              <Link to="/business-portrait-wien/" className="text-purple-700 hover:text-purple-900 font-medium underline underline-offset-2">
                {language === 'de' ? 'Business Portrait Wien' : 'Business Portrait Vienna'}
              </Link>
            </li>
            <li>
              <Link to="/teamfotos-wien/" className="text-purple-700 hover:text-purple-900 font-medium underline underline-offset-2">
                {language === 'de' ? 'Teamfotos Wien' : 'Team Photos Vienna'}
              </Link>
            </li>
            <li>
              <Link to="/portrait-fotografie-wien/" className="text-purple-700 hover:text-purple-900 font-medium underline underline-offset-2">
                {language === 'de' ? 'Portraitfotografie Wien' : 'Portrait Photography Vienna'}
              </Link>
            </li>
          </ul>
          <p className="text-center text-gray-700">
            <Link to="/calculator" className="text-purple-700 hover:text-purple-900 font-semibold underline underline-offset-2">
              {language === 'de' ? 'Preise ansehen' : 'View prices'}
            </Link>
            <span className="mx-2 text-gray-400">·</span>
            <Link to="/warteliste/" className="text-purple-700 hover:text-purple-900 font-semibold underline underline-offset-2">
              {language === 'de' ? 'Termin sichern' : 'Book appointment'}
            </Link>
          </p>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-16 bg-gradient-to-r from-gray-900 to-gray-800 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            {language === 'de' ? 'Bereit für professionelle Bewerbungsfotos in Wien?' : 'Ready for professional application photos in Vienna?'}
          </h2>
          <p className="text-xl mb-8 opacity-90">
            {language === 'de' ? 'Termine sind oft schnell voll. Sichern Sie sich Ihren Slot – oder tragen Sie sich in die Warteliste ein.' : 'Appointments fill up fast. Secure your slot – or join the waitlist.'}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/warteliste"
              className="inline-flex items-center justify-center px-8 py-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold text-lg"
            >
              {language === 'de' ? 'Termin auf der Warteliste sichern' : 'Secure a spot on the waitlist'}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
            <Link
              to="/business-portrait-wien/"
              className="inline-flex items-center justify-center px-8 py-4 border-2 border-white text-white rounded-lg hover:bg-white/10 transition-colors font-semibold text-lg"
            >
              {language === 'de' ? 'Mehr Business-Optionen' : 'More Business Options'}
            </Link>
          </div>
        </div>
      </section>

    </div>
    </Layout>
  );
}
