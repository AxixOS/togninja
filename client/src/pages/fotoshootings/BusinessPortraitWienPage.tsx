import { SEOHead } from '../../components/SEO/SEOHead';
import { ServiceSchema } from '../../components/SEO/ServiceSchema';
import { RelatedServices } from '../../components/SEO/RelatedServices';
import { PillarGuides } from '../../components/SEO/PillarGuides';
import { ReviewsBlock } from '../../components/SEO/ReviewsBlock';
import Layout from '../../components/layout/Layout';
import GoogleReviews from '../../components/layout/GoogleReviews';
import MarkdownCopySlot from '../../components/MarkdownCopySlot';
import { newageCopyMap } from '../../content/newageCopyMap';
import { Link, useNavigate } from 'react-router-dom';
import { Camera, Heart, Users, Star, ArrowRight, Check, Clock, Briefcase, Linkedin, TrendingUp, Palette, Shield } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useManualPageContent } from '../../hooks/useManualPageContent';
import { useLanguage } from '../../context/LanguageContext';
import { SITE } from '../../config/site';

export default function BusinessPortraitWienPage() {
  const navigate = useNavigate();
  const { addItem } = useCart();
  const t = useManualPageContent('businessportraits');
  const { language } = useLanguage();

  // Language-aware fallbacks
  const fallbacks = {
    en: {
      heroTitle: 'Business Portraits & Corporate Photography in Vienna',
      heroSubtitle: 'Strong Image. Clear Message.',
      heroDescription: `Your business portraits are created at ${SITE.name} in our Vienna studio – perfect for LinkedIn, CEO portraits and personal branding. We guide you relaxed through the shoot, coach expression & posture, and deliver fully retouched files in high-res – commercial usage rights included.`,
      primaryCta: 'Book a Spot on the Waitlist',
      secondaryCta: 'Give a Business Voucher',
    },
    de: {
      heroTitle: 'Business-Portraits & Corporate-Fotografie in Wien',
      heroSubtitle: 'Starkes Bild. Klare Botschaft.',
      heroDescription: `Ihre Business-Portraits entstehen bei ${SITE.name} im Studio in Wien – perfekt für LinkedIn, CEO-Porträts und Personal-Branding. Wir führen Sie entspannt durchs Shooting, coachen Ausdruck & Haltung und liefern vollständig retuschierte Dateien in High-Res – kommerzielle Nutzungsrechte inklusive.`,
      primaryCta: 'Termin auf der Warteliste sichern',
      secondaryCta: 'Business-Gutschein verschenken',
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

  const heroTitle = fromManual('manual.businessportraits.heroTitle', fb.heroTitle);
  const heroSubtitle = fromManual('manual.businessportraits.heroTagline', fb.heroSubtitle);
  const heroDescription = fromManual('manual.businessportraits.heroDescription', fb.heroDescription);
  const primaryCta = fromManual('manual.businessportraits.primaryCta', fb.primaryCta);
  const secondaryCta = fromManual('manual.businessportraits.secondaryCta', fb.secondaryCta);
  const heroImage1 = fromManual('manual.businessportraits.heroImage1', '');
  const heroImage2 = fromManual('manual.businessportraits.heroImage2', '');
  const heroImage3 = fromManual('manual.businessportraits.heroImage3', '');
  const heroImage4 = fromManual('manual.businessportraits.heroImage4', '');
  const heroImage5 = fromManual('manual.businessportraits.heroImage5', '');

  const handleBookPackage = (packageName: string, price: number, description: string) => {
    addItem({
      title: packageName,
      price: price,
      quantity: 1,
      packageType: 'Business Portrait',
      type: 'voucher'
    });
    navigate('/cart');
  };

  return (
    <Layout>
    <div className="min-h-screen bg-white">
      <SEOHead
        title={newageCopyMap['business-portrait-wien'].title}
        description={newageCopyMap['business-portrait-wien'].metaDescription}
        keywords="business portrait wien, corporate fotografie wien, linkedin foto wien, ceo portrait wien"
        canonical="/business-portrait-wien/"
        ogImage={`${SITE.url}/images/business-hero.jpg`}
        hreflang={[
          { lang: 'de', url: '/business-portrait-wien/' },
          { lang: 'en', url: '/en/business-portrait-vienna/' }
        ]}
      />
      <ServiceSchema
        serviceName={newageCopyMap['business-portrait-wien'].h1}
        description={newageCopyMap['business-portrait-wien'].metaDescription}
        url="/business-portrait-wien/"
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
                  to="/gutschein/business"
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
                  alt="Professionelles Business Portrait Wien - Headshot im modernen Fotostudio"
                  className="rounded-2xl shadow-2xl w-full h-auto object-contain"
                  loading="eager"
                />
              </div>
              <div>
                <img
                  src={heroImage2}
                  alt="LinkedIn Profilbild Wien - Professionelles Bewerbungsfoto für Social Media"
                  className="rounded-xl shadow-lg w-full h-auto object-contain"
                  loading="eager"
                />
              </div>
              <div>
                <img
                  src={heroImage3}
                  alt="CEO Business Portrait Wien - Executive Headshots für Führungskräfte"
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
                  ? `Willkommen bei ${SITE.name} – Ihrem Partner für professionelle Business-Portraits in Wien! Unser Studio bietet die perfekte Umgebung für LinkedIn-Headshots, CEO-Porträts und Personal-Branding-Fotografie. Mit präzisem Licht, variablen Hintergründen und professionellem Ausdrucks-Coaching entstehen Portraits, die auf LinkedIn performen und im Geschäftsbericht bestehen.`
                  : 'Welcome to New Age Photography – your partner for professional business portraits in Vienna! Our studio provides the perfect environment for LinkedIn headshots, CEO portraits and personal branding photography. With precise lighting, variable backgrounds and professional expression coaching, we create portraits that perform on LinkedIn and stand up in annual reports.'}
              </p>
              <p className="text-lg text-gray-700 leading-relaxed mt-4">
                {language === 'de'
                  ? 'Sie kommen mit Outfits – wir liefern starke, markenkonforme Portraits in High-Res, vollständig retuschiert und mit kommerziellen Nutzungsrechten für Web, Social Media, Presse und Print.'
                  : 'You bring the outfits – we deliver strong, brand-aligned portraits in high-res, fully retouched with commercial usage rights for web, social media, press and print.'}
              </p>
              <p className="text-base text-gray-600 leading-relaxed mt-4">
                {language === 'de' ? (
                  <>
                    Neben <Link to="/business-portrait-wien/" className="text-purple-600 hover:text-purple-700 underline underline-offset-2">Business Portrait Wien</Link> bieten
                    wir auch <Link to="/teamfotos-wien/" className="text-purple-600 hover:text-purple-700 underline underline-offset-2">Teamfotos Wien</Link>,{' '}
                    <Link to="/bewerbungsfotos-wien/" className="text-purple-600 hover:text-purple-700 underline underline-offset-2">Bewerbungsfotos Wien</Link>,{' '}
                    <Link to="/eventfotografie-wien/" className="text-purple-600 hover:text-purple-700 underline underline-offset-2">Eventfotografie Wien</Link> und{' '}
                    <Link to="/portrait-fotografie-wien/" className="text-purple-600 hover:text-purple-700 underline underline-offset-2">Portraitfotografie Wien</Link> an.
                    Alle <Link to="/calculator" className="text-purple-600 hover:text-purple-700 underline underline-offset-2">Preise & Business-Pakete</Link> ab €95.
                  </>
                ) : (
                  <>
                    We also offer{' '}
                    <Link to="/teamfotos-wien/" className="text-purple-600 hover:text-purple-700 underline underline-offset-2">team photos Vienna</Link>,{' '}
                    <Link to="/bewerbungsfotos-wien/" className="text-purple-600 hover:text-purple-700 underline underline-offset-2">application photos Vienna</Link>, and{' '}
                    <Link to="/eventfotografie-wien/" className="text-purple-600 hover:text-purple-700 underline underline-offset-2">event photography Vienna</Link>.
                    See all <Link to="/calculator" className="text-purple-600 hover:text-purple-700 underline underline-offset-2">packages from €95</Link>.
                  </>
                )}
              </p>
            </div>
            <div>
              <img
                src={heroImage4}
                alt="Business Fotoshooting Wien - Natürliche Corporate Portraits im Studio"
                className="rounded-2xl shadow-lg w-full h-auto object-contain"
                loading="lazy"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Extended Content Section - Safe Copy Slot */}
      {language === 'de' && <MarkdownCopySlot content={newageCopyMap['business-portrait-wien'].markdown} />}

      {/* Packages Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {language === 'de' ? 'Pakete & Preise (Studio)' : 'Packages & Prices (Studio)'}
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              {language === 'de'
                ? 'Preise richten sich nach Anzahl der Looks/Outfits und der gewünschten Bildmenge. Jede Option inkl. High-Res + Web-Größen, Retusche & kommerzieller Lizenz.'
                : 'Prices depend on the number of looks/outfits and desired image count. Every option includes high-res + web sizes, retouching & commercial license.'}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-12">
            {/* Business Portrait Basic Package */}
            <div className="bg-white rounded-2xl shadow-lg p-8 hover:shadow-xl transition-shadow">
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Business Portrait Basic</h3>
              </div>
              
              <div className="mb-6">
                <div className="flex items-baseline">
                  <span className="text-sm text-gray-500 mr-1">{language === 'de' ? 'Ab' : 'From'}</span>
                  <span className="text-4xl font-bold text-purple-600">€69</span>
                </div>
              </div>

              <div className="space-y-4 mb-4">
                <div className="flex items-start">
                  <Check className="h-5 w-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">{language === 'de' ? 'Business-Headshot, 30 Minuten' : 'Business headshot, 30 minutes'}</span>
                </div>
                <div className="flex items-start">
                  <Check className="h-5 w-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">{language === 'de' ? '1 retuschiertes Foto' : '1 retouched photo'}</span>
                </div>
                <div className="flex items-start">
                  <Check className="h-5 w-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">{language === 'de' ? 'Geeignet für LinkedIn' : 'Suitable for LinkedIn'}</span>
                </div>
              </div>

              <p className="text-gray-400 text-sm mb-6">{language === 'de' ? 'Gültig bis 2 Jahre' : 'Valid for up to 2 years'}</p>

              <button
                onClick={() => handleBookPackage('Business Portrait Basic', 69, 'Business-Headshot - 30 Min, 1 retuschiertes Foto')}
                className="block w-full text-center px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-semibold"
              >
                {language === 'de' ? 'Jetzt Buchen' : 'Book Now'}
              </button>
            </div>

            {/* Express Headshot Package - BELIEBT */}
            <div className="bg-gradient-to-br from-purple-600 to-pink-600 text-white rounded-2xl shadow-2xl p-8 transform sm:scale-105 relative">
              <div className="absolute top-0 right-0 bg-yellow-400 text-gray-900 text-sm font-bold px-4 py-2 rounded-bl-lg rounded-tr-2xl">
                {language === 'de' ? 'BELIEBT' : 'POPULAR'}
              </div>
              
              <div className="mb-6 mt-4">
                <h3 className="text-2xl font-bold mb-2">Express Headshot</h3>
              </div>
              
              <div className="mb-6">
                <div className="flex items-baseline">
                  <span className="text-sm mr-1">{language === 'de' ? 'Ab' : 'From'}</span>
                  <span className="text-4xl font-bold">€95</span>
                </div>
              </div>

              <div className="space-y-4 mb-4">
                <div className="flex items-start">
                  <Check className="h-5 w-5 text-yellow-300 mr-3 flex-shrink-0 mt-0.5" />
                  <span>{language === 'de' ? 'Schnell & effizient' : 'Quick & efficient'}</span>
                </div>
                <div className="flex items-start">
                  <Check className="h-5 w-5 text-yellow-300 mr-3 flex-shrink-0 mt-0.5" />
                  <span>{language === 'de' ? 'x2 Bilder nach Wahl als Datei' : 'x2 photos of your choice as files'}</span>
                </div>
              </div>

              <p className="text-purple-200 text-sm mb-6">{language === 'de' ? 'Gültig bis 2 Jahre' : 'Valid for up to 2 years'}</p>

              <button
                onClick={() => handleBookPackage('Express Headshot', 95, 'Express Headshot - Schnell & effizient, x2 Bilder als Datei')}
                className="block w-full text-center px-6 py-3 bg-white text-purple-600 rounded-lg hover:bg-gray-100 transition-colors font-semibold"
              >
                {language === 'de' ? 'Jetzt Buchen' : 'Book Now'}
              </button>
            </div>

            {/* Solo Pro Package */}
            <div className="bg-white rounded-2xl shadow-lg p-8 hover:shadow-xl transition-shadow">
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Solo Pro</h3>
              </div>
              
              <div className="mb-6">
                <div className="flex items-baseline">
                  <span className="text-sm text-gray-500 mr-1">{language === 'de' ? 'Ab' : 'From'}</span>
                  <span className="text-4xl font-bold text-purple-600">€195</span>
                </div>
              </div>

              <div className="space-y-4 mb-4">
                <div className="flex items-start">
                  <Check className="h-5 w-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">{language === 'de' ? 'Für Professionals' : 'For professionals'}</span>
                </div>
                <div className="flex items-start">
                  <Check className="h-5 w-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">{language === 'de' ? 'Alle Bilder als Datei inkl.' : 'All photos as files included'}</span>
                </div>
              </div>

              <p className="text-gray-400 text-sm mb-6">{language === 'de' ? 'Gültig bis 2 Jahre' : 'Valid for up to 2 years'}</p>

              <button
                onClick={() => handleBookPackage('Solo Pro', 195, 'Solo Pro - Für Professionals, alle Bilder als Datei')}
                className="block w-full text-center px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-semibold"
              >
                {language === 'de' ? 'Jetzt Buchen' : 'Book Now'}
              </button>
            </div>
          </div>

          {/* Team Photos Note */}
          <div className="bg-white rounded-xl p-6 mb-8 border-2 border-purple-100">
            <div className="flex items-start">
              <Users className="h-6 w-6 text-purple-600 mr-3 flex-shrink-0 mt-1" />
              <div>
                <p className="font-semibold text-gray-900 mb-1">{language === 'de' ? 'Team- & Mitarbeiterfotos:' : 'Team & Employee Photos:'}</p>
                <p className="text-gray-600">
                  {language === 'de'
                    ? 'Ab €299. Paketpreise by headcount. In-Studio or OnSite options, ab 50€ pro Kopf mit alle Portraits als Datei dazu.'
                    : 'From €299. Package prices by headcount. In-studio or on-site options, from €50 per person with all portraits as files included.'}
                </p>
              </div>
            </div>
          </div>

          {/* CTA Buttons after packages */}
          <div className="mt-12 text-center bg-gradient-to-r from-purple-100 to-pink-100 rounded-2xl p-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">{language === 'de' ? 'Keine Zeit?' : 'No Time?'}</h3>
            <p className="text-gray-700 mb-6">
              {language === 'de' ? 'Setzen Sie sich auf unsere Warteliste – wir melden freie Slots sofort.' : 'Join our waitlist – we\'ll notify you of available slots right away.'}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/warteliste"
                className="inline-flex items-center justify-center px-8 py-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold"
              >
                {language === 'de' ? 'Termin auf der Warteliste sichern' : 'Secure a Spot on the Waitlist'}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Style Options Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">{language === 'de' ? 'Style-Optionen (Sie wählen – wir führen)' : 'Style Options (You Choose – We Guide)'}</h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-gray-50 rounded-xl p-6">
              <h3 className="font-semibold text-lg text-gray-900 mb-3 flex items-center">
                <Palette className="h-5 w-5 text-purple-600 mr-2" />
                {language === 'de' ? 'Hintergründe' : 'Backgrounds'}
              </h3>
              <p className="text-gray-700 text-sm">
                {language === 'de' ? 'Hell (clean), Dunkel (dramatisch), Farbverlauf, Firmenfarbe.' : 'Light (clean), dark (dramatic), gradient, corporate color.'}
              </p>
            </div>

            <div className="bg-gray-50 rounded-xl p-6">
              <h3 className="font-semibold text-lg text-gray-900 mb-3 flex items-center">
                <Camera className="h-5 w-5 text-purple-600 mr-2" />
                {language === 'de' ? 'Licht-Setups' : 'Lighting Setups'}
              </h3>
              <p className="text-gray-700 text-sm">
                {language === 'de' ? 'Beauty/Clamshell (glatt & modern), Rembrandt (prägnant), Edge/Profil (kantig).' : 'Beauty/Clamshell (smooth & modern), Rembrandt (striking), Edge/Profile (edgy).'}
              </p>
            </div>

            <div className="bg-gray-50 rounded-xl p-6">
              <h3 className="font-semibold text-lg text-gray-900 mb-3 flex items-center">
                <TrendingUp className="h-5 w-5 text-purple-600 mr-2" />
                {language === 'de' ? 'Bildsprache' : 'Visual Language'}
              </h3>
              <p className="text-gray-700 text-sm">
                {language === 'de' ? 'Headshot, Halbportrait, Querformate für Website-Header.' : 'Headshot, half portrait, landscape formats for website headers.'}
              </p>
            </div>

            <div className="bg-gray-50 rounded-xl p-6">
              <h3 className="font-semibold text-lg text-gray-900 mb-3 flex items-center">
                <Briefcase className="h-5 w-5 text-purple-600 mr-2" />
                Look & Feel
              </h3>
              <p className="text-gray-700 text-sm">
                {language === 'de' ? 'Business-formal, Smart-Casual, Kreativ – gern mit Accessoires (Laptop, Notizbuch).' : 'Business formal, smart casual, creative – with accessories welcome (laptop, notebook).'}
              </p>
            </div>

            <div className="bg-gray-50 rounded-xl p-6">
              <h3 className="font-semibold text-lg text-gray-900 mb-3 flex items-center">
                <Star className="h-5 w-5 text-purple-600 mr-2" />
                {language === 'de' ? 'Farbwelt' : 'Color World'}
              </h3>
              <p className="text-gray-700 text-sm">
                {language === 'de' ? 'Farblook oder Schwarzweiß-Serie passend zur Marke.' : 'Color look or black & white series matching your brand.'}
              </p>
            </div>

            <div className="bg-gray-50 rounded-xl p-6">
              <h3 className="font-semibold text-lg text-gray-900 mb-3 flex items-center">
                <Shield className="h-5 w-5 text-purple-600 mr-2" />
                {language === 'de' ? 'Kommerzielle Rechte' : 'Commercial Rights'}
              </h3>
              <p className="text-gray-700 text-sm">
                {language === 'de' ? 'Volle Nutzungsrechte für Web, Social, PR & Print inklusive.' : 'Full usage rights for web, social, PR & print included.'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Process Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-12">
            <img
              src={heroImage5}
              alt="Business Portrait Shooting Ablauf Wien - Professionelle Mitarbeiterfotos in 30 Minuten"
              className="rounded-2xl shadow-lg w-full h-auto object-contain"
              loading="lazy"
            />
          </div>

          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">{language === 'de' ? 'Ablauf – schnell & professionell' : 'Process – Quick & Professional'}</h2>
          <div className="grid md:grid-cols-5 gap-6">
            <div className="text-center">
              <div className="bg-purple-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-purple-600">1</span>
              </div>
              <h3 className="font-semibold mb-2 text-gray-900">Briefing</h3>
              <p className="text-gray-600 text-sm">{language === 'de' ? 'Ziel, Verwendungsorte, Dresscode, Stil' : 'Goal, usage, dress code, style'}</p>
            </div>
            <div className="text-center">
              <div className="bg-purple-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-purple-600">2</span>
              </div>
              <h3 className="font-semibold mb-2 text-gray-900">Shooting</h3>
              <p className="text-gray-600 text-sm">{language === 'de' ? 'Mit Ausdrucks-Coaching, Wechsel von Licht & Hintergründen je Look' : 'With expression coaching, changing lights & backgrounds per look'}</p>
            </div>
            <div className="text-center">
              <div className="bg-purple-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-purple-600">3</span>
              </div>
              <h3 className="font-semibold mb-2 text-gray-900">{language === 'de' ? 'Auswahl' : 'Selection'}</h3>
              <p className="text-gray-600 text-sm">{language === 'de' ? 'Auswahlgalerie online – Favoriten markieren' : 'Online selection gallery – mark your favorites'}</p>
            </div>
            <div className="text-center">
              <div className="bg-purple-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-purple-600">4</span>
              </div>
              <h3 className="font-semibold mb-2 text-gray-900">{language === 'de' ? 'Retusche' : 'Retouching'}</h3>
              <p className="text-gray-600 text-sm">{language === 'de' ? 'Natürliche Haut, Staub/Fussel, Brille/Glanz, Kontur' : 'Natural skin, dust/lint, glasses/glare, contour'}</p>
            </div>
            <div className="text-center">
              <div className="bg-purple-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-purple-600">5</span>
              </div>
              <h3 className="font-semibold mb-2 text-gray-900">{language === 'de' ? 'Lieferung' : 'Delivery'}</h3>
              <p className="text-gray-600 text-sm">{language === 'de' ? 'High-Res + Web inkl. kommerzielle Lizenz' : 'High-res + web incl. commercial license'}</p>
            </div>
          </div>
        </div>
      </section>

      {/* What to Bring Section */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">{language === 'de' ? 'Vorbereitung – was mitbringen?' : 'Preparation – What to Bring?'}</h2>
          
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-purple-50 rounded-xl p-6">
              <h3 className="font-semibold text-lg text-gray-900 mb-3">Outfits</h3>
              <p className="text-gray-700 text-sm">
                {language === 'de' ? '2–3 Outfits (Blazer/Jackett, Hemd/Bluse, optional Casual).' : '2–3 outfits (blazer/jacket, shirt/blouse, optional casual).'}
              </p>
            </div>

            <div className="bg-purple-50 rounded-xl p-6">
              <h3 className="font-semibold text-lg text-gray-900 mb-3">Details</h3>
              <p className="text-gray-700 text-sm">
                {language === 'de' ? 'Saubere Brille, gebügelte Stoffe, dezentes Make-up.' : 'Clean glasses, ironed fabrics, subtle make-up.'}
              </p>
            </div>

            <div className="bg-purple-50 rounded-xl p-6">
              <h3 className="font-semibold text-lg text-gray-900 mb-3">Finishing</h3>
              <p className="text-gray-700 text-sm">
                {language === 'de' ? 'Haare: Bürste/Stylingprodukt, Lippenpflege; Rasur am Shooting-Tag.' : 'Hair: brush/styling product, lip balm; shave on shoot day.'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12">{fromManual('manual.businessportraits.faqHeading', 'FAQ')}</h2>
          <div className="space-y-6">
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="font-bold text-lg text-gray-900 mb-2">{fromManual('manual.businessportraits.faqQ1', language === 'de' ? 'Bekomme ich alle Dateien in druckfähiger Qualität?' : 'Will I receive all files in print-ready quality?')}</h3>
              <p className="text-gray-600">
                {fromManual('manual.businessportraits.faqA1', language === 'de' ? 'Ja. Sie erhalten High-Res (Print) und Web-Größen – beide vollständig retuschiert.' : 'Yes. You receive high-res (print) and web sizes – both fully retouched.')}
              </p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="font-bold text-lg text-gray-900 mb-2">{fromManual('manual.businessportraits.faqQ2', language === 'de' ? 'Sind kommerzielle Rechte inkludiert?' : 'Are commercial rights included?')}</h3>
              <p className="text-gray-600">
                {fromManual('manual.businessportraits.faqA2', language === 'de' ? 'Ja. Nutzung für Website, Social Media, Presse & Print ist im Paket enthalten.' : 'Yes. Usage for website, social media, press & print is included in the package.')}
              </p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="font-bold text-lg text-gray-900 mb-2">{fromManual('manual.businessportraits.faqQ3', language === 'de' ? 'Wie schnell sind die Bilder da?' : 'How quickly will I receive the photos?')}</h3>
              <p className="text-gray-600">
                {fromManual('manual.businessportraits.faqA3', language === 'de' ? 'Preview i. d. R. 48–72 h, finale Retuschen 3–5 Werktage (Express möglich).' : 'Preview typically 48–72h, final retouching 3–5 business days (express available).')}
              </p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="font-bold text-lg text-gray-900 mb-2">{fromManual('manual.businessportraits.faqQ4', language === 'de' ? 'Können wir mehrere Looks/CI-Farben testen?' : 'Can we try multiple looks/CI colors?')}</h3>
              <p className="text-gray-600">
                {fromManual('manual.businessportraits.faqA4', language === 'de' ? 'Gern – wählen Sie im Paket 2–3 Looks. Wir matchen Hintergründe & Licht an Ihre Marke.' : 'Gladly – choose 2–3 looks in your package. We match backgrounds & lighting to your brand.')}
              </p>
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
              to="/familienfotos-wien/"
              className="block bg-purple-50 rounded-xl p-6 hover:shadow-lg transition-shadow"
            >
              <Users className="h-10 w-10 text-purple-600 mb-4" />
              <h3 className="font-semibold text-lg mb-2 text-gray-900">{language === 'de' ? 'Familienfotografie' : 'Family Photography'}</h3>
              <p className="text-gray-600 text-sm mb-4">
                {language === 'de' ? 'Authentische Familienfotos im Studio mit bis zu 12 Personen' : 'Authentic family photos in studio with up to 12 people'}
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
              to="/neugeborenenfotos-wien/"
              className="block bg-purple-50 rounded-xl p-6 hover:shadow-lg transition-shadow"
            >
              <Camera className="h-10 w-10 text-purple-600 mb-4" />
              <h3 className="font-semibold text-lg mb-2 text-gray-900">{language === 'de' ? 'Neugeborenenfotos' : 'Newborn Photos'}</h3>
              <p className="text-gray-600 text-sm mb-4">
                {language === 'de' ? 'Warmes Studio, sichere Posen, Tag 5-14 nach der Geburt' : 'Warm studio, safe poses, day 5-14 after birth'}
              </p>
              <span className="text-purple-600 font-semibold flex items-center">
                {language === 'de' ? 'Mehr erfahren' : 'Learn more'} <ArrowRight className="ml-1 h-4 w-4" />
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
              {language === 'de' ? 'Entdecken Sie unsere anderen professionellen Fotografie-Angebote in Wien' : 'Discover our other professional photography services in Vienna'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Event Photography */}
            <Link
              to="/eventfotografie-wien/"
              className="bg-gray-50 rounded-lg p-6 hover:shadow-lg transition-shadow group"
            >
              <Camera className="h-12 w-12 text-purple-600 mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-purple-600 transition-colors">
                {language === 'de' ? 'Eventfotografie' : 'Event Photography'}
              </h3>
              <p className="text-gray-600 mb-4">
                {language === 'de' ? 'Professionelle Dokumentation von Firmenevents, Konferenzen und Galas in Wien.' : 'Professional documentation of corporate events, conferences and galas in Vienna.'}
              </p>
              <span className="text-purple-600 font-semibold inline-flex items-center">
                {language === 'de' ? 'Mehr erfahren' : 'Learn more'} <ArrowRight className="ml-2 h-4 w-4" />
              </span>
            </Link>

            {/* Product Photography */}
            <Link
              to="/produkt-fotografie-wien/"
              className="bg-gray-50 rounded-lg p-6 hover:shadow-lg transition-shadow group"
            >
              <Briefcase className="h-12 w-12 text-purple-600 mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-purple-600 transition-colors">
                {language === 'de' ? 'Produktfotografie' : 'Product Photography'}
              </h3>
              <p className="text-gray-600 mb-4">
                {language === 'de' ? 'Hochwertige Produktfotos für E-Commerce, Amazon und Marketing-Kampagnen.' : 'High-quality product photos for e-commerce, Amazon and marketing campaigns.'}
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
                {language === 'de' ? 'Natürliche Familienporträts im Studio oder Outdoor – unvergessliche Erinnerungen schaffen.' : 'Natural family portraits in studio or outdoor – creating unforgettable memories.'}
              </p>
              <span className="text-purple-600 font-semibold inline-flex items-center">
                {language === 'de' ? 'Mehr erfahren' : 'Learn more'} <ArrowRight className="ml-2 h-4 w-4" />
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* Related Services - Internal Links */}
      <ReviewsBlock />
      <PillarGuides pillar="/business-portrait-wien/" />
      <RelatedServices currentPath="/business-portrait-wien/" />

      {/* Weitere Business Fotoshootings – compact internal link block */}
      <section className="py-12 bg-gray-50 border-t border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            {language === 'de' ? 'Weitere Business Fotoshootings' : 'More Business Photo Shoots'}
          </h3>
          <ul className="grid sm:grid-cols-2 gap-3 mb-6 max-w-2xl mx-auto">
            <li>
              <Link to="/bewerbungsfotos-wien/" className="text-purple-700 hover:text-purple-900 font-medium underline underline-offset-2">
                {language === 'de' ? 'Bewerbungsfotos Wien' : 'Application Photos Vienna'}
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
              {language === 'de' ? 'Business Preise' : 'Business prices'}
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
            {language === 'de' ? 'Bereit für professionelle Business-Portraits?' : 'Ready for Professional Business Portraits?'}
          </h2>
          <p className="text-xl mb-8 opacity-90">
            {language === 'de' ? 'Sichern Sie sich jetzt Ihren Termin – Warteliste verfügbar' : 'Secure your appointment now – waitlist available'}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/warteliste"
              className="inline-flex items-center justify-center px-8 py-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold text-lg"
            >
              {language === 'de' ? 'Termin auf der Warteliste sichern' : 'Secure a Spot on the Waitlist'}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>

    </div>
    </Layout>
  );
}
