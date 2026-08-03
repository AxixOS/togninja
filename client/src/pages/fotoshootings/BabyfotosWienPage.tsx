import { SEOHead } from '../../components/SEO/SEOHead';
import { RelatedServices } from '../../components/SEO/RelatedServices';
import Layout from '../../components/layout/Layout';
import GoogleReviews from '../../components/layout/GoogleReviews';
import { Link, useNavigate } from 'react-router-dom';
import { ContextualLinks } from '../../components/SEO/ContextualLinks';
import { Camera, Heart, Users, Star, ArrowRight, Check, Clock, Baby, Shield, Music, Smile, Package, Sun, Home, Eye, Hand } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { useCart } from '../../context/CartContext';
import { useManualPageContent } from '../../hooks/useManualPageContent';
import MarkdownCopySlot from '../../components/MarkdownCopySlot';
import { newageCopyMap } from '../../content/newageCopyMap';
import { useLanguage } from '../../context/LanguageContext';
import { SITE } from '../../config/site';

export default function BabyfotosWienPage() {
  const navigate = useNavigate();
  const { addItem } = useCart();
  const t = useManualPageContent('babyfotos');
  const { language } = useLanguage();

  // Language-aware fallbacks
  const fallbacks = {
    en: {
      heroTitle: 'Baby Photos (3–12 Months) in Vienna',
      heroSubtitle: 'Real Baby Time. Real Expressions.',
      heroDescription: 'From tummy time to sitting pirouettes – we capture your child exactly as they are right now. At baby photos Vienna in the studio or outdoors, everything stays relaxed, safe and child-friendly.',
      primaryCta: 'Book a Spot on the Waitlist',
      secondaryCta: 'Buy a Baby Voucher',
    },
    de: {
      heroTitle: 'Babyfotos (3–12 Monate) in Wien',
      heroSubtitle: 'Echte Babyzeit. Echte Mimik.',
      heroDescription: 'Von Bauchlage bis Sitzpirouette – wir halten dein Kind genau so fest, wie es jetzt ist. Bei babyfotos wien im Studio oder Outdoor bleibt alles entspannt, sicher und kindgerecht.',
      primaryCta: 'Termin auf der Warteliste sichern',
      secondaryCta: 'Baby-Gutschein kaufen',
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

  const heroTitle = fromManual('manual.babyfotos.heroTitle', fb.heroTitle);
  const heroSubtitle = fromManual('manual.babyfotos.heroTagline', fb.heroSubtitle);
  const heroDescription = fromManual('manual.babyfotos.heroDescription', fb.heroDescription);
  const primaryCta = fromManual('manual.babyfotos.primaryCta', fb.primaryCta);
  const secondaryCta = fromManual('manual.babyfotos.secondaryCta', fb.secondaryCta);
  const heroImage1 = fromManual('manual.babyfotos.heroImage1', '');
  const heroImage2 = fromManual('manual.babyfotos.heroImage2', '');
  const heroImage3 = fromManual('manual.babyfotos.heroImage3', '');
  const heroImage4 = fromManual('manual.babyfotos.heroImage4', '');
  const heroImage5 = fromManual('manual.babyfotos.heroImage5', '');

  const handleBookPackage = (packageName: string, price: number, description: string) => {
    addItem({
      title: packageName,
      price: price,
      quantity: 1,
      packageType: 'Babyfotografie',
      type: 'voucher'
    });
    navigate('/cart');
  };

  return (
    <Layout>
    <div className="min-h-screen bg-white">
      <SEOHead
        title={newageCopyMap['babyfotos-wien'].title}
        description={newageCopyMap['babyfotos-wien'].metaDescription}
        keywords="babyfotos wien, babyfotografie wien, baby fotoshooting wien, babyfotograf wien"
        canonical="/babyfotos-wien/"
        ogImage={`${SITE.url}/images/baby-hero.jpg`}
        hreflang={[
          { lang: 'de', url: '/babyfotos-wien/' },
          { lang: 'en', url: '/en/baby-photos-vienna/' }
        ]}
      />

      {/* JSON-LD Structured Data */}
      <Helmet>
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Service",
            "name": "Babyfotos Wien (3–12 Monate)",
            "serviceType": "Babyfotografie",
            "provider": {
              "@type": "LocalBusiness",
              "name": SITE.name,
              "areaServed": "Wien, Österreich"
            },
            "areaServed": {
              "@type": "City",
              "name": "Wien"
            },
            "offers": {
              "@type": "Offer",
              "priceCurrency": "EUR",
              "price": "170",
              "description": "Mini Baby – 40 Min, 1 Set, 8 retuschierte Dateien"
            }
          })}
        </script>
      </Helmet>

      {/* Hero Section */}
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
                  to="/gutschein/baby"
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
                  alt="babyfotos wien – 6 Monate, Bauchlage im Studio"
                  className="rounded-2xl shadow-xl w-full h-auto object-contain"
                  loading="eager"
                />
              </div>
              <div>
                <img
                  src={heroImage2}
                  alt="babyfotos wien – Sitter-Phase Baby 7 Monate"
                  className="rounded-xl shadow-lg w-full h-auto object-contain"
                  loading="eager"
                />
              </div>
              <div>
                <img
                  src={heroImage3}
                  alt="babyfotos wien – lachendes Baby im Studio"
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

      {/* Introduction with inline contextual links */}
      <section className="py-12 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-lg text-gray-700 leading-relaxed">
            {language === 'de' ? (
              <>
                Unsere <Link to="/babyfotos-wien/" className="text-purple-600 hover:text-purple-700 underline underline-offset-2">Babyfotografie in Wien</Link>{' '}
                hält die ersten wertvollen Momente Ihres Kindes authentisch und liebevoll fest. Viele Familien kombinieren diese
                Aufnahmen später mit unseren{' '}
                <Link to="/familienfotos-wien/" className="text-purple-600 hover:text-purple-700 underline underline-offset-2">Familienfotos in Wien</Link>,
                um eine vollständige Geschichte zu erzählen.
              </>
            ) : (
              <>
                Our <Link to="/babyfotos-wien/" className="text-purple-600 hover:text-purple-700 underline underline-offset-2">baby photography in Vienna</Link>{' '}
                captures the first precious moments of your child. Many families later combine these photos with our{' '}
                <Link to="/familienfotos-wien/" className="text-purple-600 hover:text-purple-700 underline underline-offset-2">family photos in Vienna</Link> to
                build a complete story.
              </>
            )}
          </p>
          <p className="text-lg text-gray-700 leading-relaxed mt-4">
            {language === 'de' ? (
              <>
                Gerade in den ersten Monaten verändert sich Ihr Baby schnell. Wenn Sie noch schwanger sind, lohnt sich auch ein
                Blick auf unsere{' '}
                <Link to="/schwangerschaftsfotos-wien/" className="text-purple-600 hover:text-purple-700 underline underline-offset-2">Schwangerschaftsfotografie in Wien</Link>,
                um die Reise von Anfang an festzuhalten. Viele Eltern entscheiden sich später zusätzlich für{' '}
                <Link to="/kinder-fotografie-wien/" className="text-purple-600 hover:text-purple-700 underline underline-offset-2">Kinderfotografie in Wien</Link>,
                um die Entwicklung ihres Kindes weiter zu dokumentieren. Alle{' '}
                <Link to="/calculator" className="text-purple-600 hover:text-purple-700 underline underline-offset-2">Preise für Fotoshootings</Link> ansehen
                oder direkt{' '}
                <Link to="/warteliste/" className="text-purple-600 hover:text-purple-700 underline underline-offset-2">Termin sichern</Link>.
              </>
            ) : (
              <>
                Many parents later book{' '}
                <Link to="/kinder-fotografie-wien/" className="text-purple-600 hover:text-purple-700 underline underline-offset-2">children's photography in Vienna</Link>{' '}
                to document their child's development. View all{' '}
                <Link to="/calculator" className="text-purple-600 hover:text-purple-700 underline underline-offset-2">prices</Link> or{' '}
                <Link to="/warteliste/" className="text-purple-600 hover:text-purple-700 underline underline-offset-2">book a slot</Link>.
              </>
            )}
          </p>
        </div>
      </section>

      <ContextualLinks pathname="/babyfotos-wien/" language={language} />

      {/* 3-12 Months is Different Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">{language === 'de' ? '3–12 Monate ist anders als Neugeboren' : '3–12 Months Is Different from Newborn'}</h2>
          
          <div className="grid md:grid-cols-2 gap-8 mb-12">
            <div className="prose prose-lg max-w-none">
              <div className="bg-purple-50 rounded-xl p-6 mb-6">
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <Smile className="h-6 w-6 text-purple-600 mr-3 flex-shrink-0 mt-1" />
                    <span className="text-gray-700"><strong>{language === 'de' ? 'Mehr Ausdruck:' : 'More expression:'}</strong> {language === 'de' ? 'Lachen, Stirnrunzeln, Zunge raus.' : 'Laughing, frowning, tongue out.'}</span>
                  </li>
                  <li className="flex items-start">
                    <Hand className="h-6 w-6 text-purple-600 mr-3 flex-shrink-0 mt-1" />
                    <span className="text-gray-700"><strong>{language === 'de' ? 'Mehr Interaktion:' : 'More interaction:'}</strong> {language === 'de' ? 'Blickkontakt, Greifen, erste Sitzversuche.' : 'Eye contact, grasping, first sitting attempts.'}</span>
                  </li>
                  <li className="flex items-start">
                    <Camera className="h-6 w-6 text-purple-600 mr-3 flex-shrink-0 mt-1" />
                    <span className="text-gray-700"><strong>{language === 'de' ? 'Andere Posen:' : 'Different poses:'}</strong> {language === 'de' ? 'Bauchlage, Rückenrolle, Sitz in Stütze – keine Neugeborenen-Wraps.' : 'Tummy time, back rolls, supported sitting – no newborn wraps.'}</span>
                  </li>
                  <li className="flex items-start">
                    <Clock className="h-6 w-6 text-purple-600 mr-3 flex-shrink-0 mt-1" />
                    <span className="text-gray-700"><strong>{language === 'de' ? 'Kürzere Takte:' : 'Shorter intervals:'}</strong> {language === 'de' ? 'Mini-Sets mit Pausen statt langer, schlafbasierter Posing-Phasen.' : 'Mini sets with breaks instead of long, sleep-based posing phases.'}</span>
                  </li>
                </ul>
              </div>
              
              <div className="bg-gray-50 rounded-xl p-6">
                <p className="text-lg text-gray-700 mb-0">
                  <strong>{language === 'de' ? 'Kurz:' : 'In short:'}</strong> {language === 'de' ? 'Neugeborene (5–14 Tage) = schlafbasierte Ruheposen. Babyfotos (3–12 M) = Bewegung, Mimik, Spiel.' : 'Newborns (5–14 days) = sleep-based resting poses. Baby photos (3–12 M) = movement, expressions, play.'}
                </p>
                <Link 
                  to="/neugeborenenfotos-wien/" 
                  className="text-purple-600 hover:text-purple-700 underline text-sm mt-3 inline-block"
                >
                  {language === 'de' ? '→ Zu unseren Neugeborenenfotos' : '→ See our newborn photos'}
                </Link>
              </div>
            </div>

            <div>
              <img
                src={heroImage4}
                alt="Unterschied Neugeborene und Babyfotos Wien"
                className="rounded-2xl shadow-lg w-full h-auto object-contain"
                loading="lazy"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Age Milestones Table */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-8">{language === 'de' ? 'Welches Alter zeigt was?' : 'What Each Age Shows'}</h2>
          
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-purple-600 text-white">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold">{language === 'de' ? 'Alter' : 'Age'}</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">{language === 'de' ? 'Highlights' : 'Highlights'}</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">{language === 'de' ? 'Geeignete Sets' : 'Suitable Sets'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                <tr className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{language === 'de' ? '3–4 Monate' : '3–4 months'}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{language === 'de' ? 'starke Bauchlage, Blick in Kamera' : 'strong tummy time, eye contact with camera'}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{language === 'de' ? 'Bodensets, runde Props, Elternarme' : 'Floor sets, round props, parent arms'}</td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{language === 'de' ? '5–6 Monate' : '5–6 months'}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{language === 'de' ? 'Stützsitz, Füßchen greifen' : 'Supported sitting, grabbing feet'}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{language === 'de' ? 'Sitzkörbe, Decken, minimalistische Hintergründe' : 'Sitting baskets, blankets, minimalist backgrounds'}</td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{language === 'de' ? '7–8 Monate' : '7–8 months'}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{language === 'de' ? 'sicherer Sitz, Kichern' : 'Stable sitting, giggling'}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{language === 'de' ? 'kleine Möbel, Spiegelspiel, Close-ups' : 'Small furniture, mirror play, close-ups'}</td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{language === 'de' ? '9–10 Monate' : '9–10 months'}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{language === 'de' ? 'Krabbeln, High-Fives' : 'Crawling, high-fives'}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{language === 'de' ? 'Bewegung, Serienbilder, Geschwister-Interaktion' : 'Movement, photo series, sibling interaction'}</td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{language === 'de' ? '11–12 Monate' : '11–12 months'}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{language === 'de' ? 'erste Schritte, Klatschen' : 'First steps, clapping'}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{language === 'de' ? 'Steh-Stütze, Mini-Torte (ohne Chaos)' : 'Standing support, mini cake (no mess)'}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Studio vs Outdoor */}
      <section className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-8">{language === 'de' ? 'Studio oder Outdoor?' : 'Studio or Outdoor?'}</h2>
          
          <div className="grid md:grid-cols-2 gap-8 mb-8">
            <div className="bg-gray-50 rounded-xl p-8">
              <div className="flex items-center mb-4">
                <Home className="h-8 w-8 text-purple-600 mr-3" />
                <h3 className="text-2xl font-bold text-gray-900">Studio</h3>
              </div>
              <p className="text-lg text-gray-600 mb-4"><em>{language === 'de' ? 'clean, zart, zeitlos' : 'clean, gentle, timeless'}</em></p>
              <ul className="space-y-2">
                <li className="flex items-start">
                  <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">{language === 'de' ? 'wetterfest' : 'weatherproof'}</span>
                </li>
                <li className="flex items-start">
                  <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">{language === 'de' ? 'kontrolliertes Licht' : 'controlled lighting'}</span>
                </li>
                <li className="flex items-start">
                  <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">{language === 'de' ? 'ruhige Musik' : 'calm music'}</span>
                </li>
              </ul>
            </div>

            <div className="bg-purple-50 rounded-xl p-8">
              <div className="flex items-center mb-4">
                <Sun className="h-8 w-8 text-purple-600 mr-3" />
                <h3 className="text-2xl font-bold text-gray-900">Outdoor</h3>
              </div>
              <p className="text-lg text-gray-600 mb-4"><em>{language === 'de' ? 'lebendig, natürlich' : 'lively, natural'}</em></p>
              <ul className="space-y-2">
                <li className="flex items-start">
                  <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">{language === 'de' ? 'Blattgeraschel' : 'rustling leaves'}</span>
                </li>
                <li className="flex items-start">
                  <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">{language === 'de' ? 'Farben' : 'colors'}</span>
                </li>
                <li className="flex items-start">
                  <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">{language === 'de' ? 'Saisonlook (Frühling/Herbst)' : 'Seasonal look (spring/autumn)'}</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="bg-purple-100 rounded-xl p-6">
            <p className="text-gray-800">
              <strong>{language === 'de' ? 'Tipp:' : 'Tip:'}</strong> {language === 'de' ? 'Golden Hour macht Augen glanzvoll. Für Minis planen wir kurze Spielblöcke.' : 'Golden hour makes eyes sparkle. For little ones we plan short play blocks.'}
            </p>
          </div>
        </div>
      </section>

      {/* Extended Content Section - Safe Copy Slot */}
      {language === 'de' && <MarkdownCopySlot content={newageCopyMap['babyfotos-wien'].markdown} />}

      {/* Packages Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {language === 'de' ? 'Pakete & Preise' : 'Packages & Prices'}
            </h2>
          </div>

          <div className="flex justify-center mb-12">
            {/* Newborn Premium Package */}
            <div className="bg-gradient-to-br from-purple-600 to-pink-600 text-white rounded-2xl shadow-2xl p-8 max-w-md w-full relative">
              <div className="absolute top-0 right-0 bg-yellow-400 text-gray-900 text-sm font-bold px-4 py-2 rounded-bl-lg rounded-tr-2xl">
                {language === 'de' ? 'BELIEBT' : 'POPULAR'}
              </div>
              
              <div className="mb-6 mt-4">
                <h3 className="text-2xl font-bold mb-2">Newborn Premium</h3>
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
                  <span>{language === 'de' ? 'ca. 60 Minuten im Studio' : 'approx. 60 minutes in studio'}</span>
                </div>
                <div className="flex items-start">
                  <Check className="h-5 w-5 text-yellow-300 mr-3 flex-shrink-0 mt-0.5" />
                  <span>{language === 'de' ? '5 retuschierte Lieblingsfotos digital' : '5 retouched favorite photos digital'}</span>
                </div>
                <div className="flex items-start">
                  <Check className="h-5 w-5 text-yellow-300 mr-3 flex-shrink-0 mt-0.5" />
                  <span>{language === 'de' ? 'Leinwand 40×30 cm' : 'Canvas 40×30 cm'}</span>
                </div>
                <div className="flex items-start">
                  <Check className="h-5 w-5 text-yellow-300 mr-3 flex-shrink-0 mt-0.5" />
                  <span>{language === 'de' ? 'Bis zu 12 Personen und auch Haustiere möglich' : 'Up to 12 people and pets welcome'}</span>
                </div>
              </div>

              <p className="text-purple-200 text-sm mb-6">{language === 'de' ? 'Gültig bis 2 Jahre' : 'Valid for up to 2 years'}</p>

              <button
                onClick={() => handleBookPackage('Newborn Premium', 195, 'Babyfotografie - 60 Min, 5 Fotos + Leinwand 40×30 cm')}
                className="block w-full text-center px-6 py-3 bg-white text-purple-600 rounded-lg hover:bg-gray-100 transition-colors font-semibold"
              >
                {language === 'de' ? 'Jetzt Buchen' : 'Book Now'}
              </button>
            </div>
          </div>

          {/* Extras */}
          <div className="bg-purple-50 rounded-xl p-6 text-center">
            <p className="text-gray-700">
              <strong>{language === 'de' ? 'Extras:' : 'Extras:'}</strong> {language === 'de' ? 'Zusätzliche Bilder je €20 und Pakete verfügbar.' : 'Additional images are €20 each and packages are available.'}
            </p>
            <p className="text-sm text-gray-600 mt-2">
              {language === 'de' ? 'Freie Slots sind knapp. Trag dich hier ein: ' : 'Open slots are limited. Sign up here: '}<Link to="/warteliste" className="text-purple-600 hover:text-purple-700 underline font-semibold">{language === 'de' ? 'Termin-Warteliste' : 'Appointment Waitlist'}</Link>
            </p>
          </div>
        </div>
      </section>

      {/* Process Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">{language === 'de' ? 'So läuft euer Shooting ab' : 'How Your Shoot Works'}</h2>
          
          <div className="grid md:grid-cols-5 gap-6">
            <div className="text-center">
              <div className="bg-purple-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-purple-600">1</span>
              </div>
              <h3 className="font-semibold mb-2 text-gray-900">{language === 'de' ? 'Vorgespräch' : 'Pre-consultation'}</h3>
              <p className="text-gray-600 text-sm">{language === 'de' ? 'Alter, Schlaf-/Essfenster, Lieblingsfarben' : 'Age, sleep/feeding schedule, favorite colors'}</p>
            </div>
            <div className="text-center">
              <div className="bg-purple-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-purple-600">2</span>
              </div>
              <h3 className="font-semibold mb-2 text-gray-900">{language === 'de' ? 'Ankommen' : 'Arrival'}</h3>
              <p className="text-gray-600 text-sm">{language === 'de' ? 'Eingewöhnung, leise Musik, Set-Check' : 'Settling in, soft music, set check'}</p>
            </div>
            <div className="text-center">
              <div className="bg-purple-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-purple-600">3</span>
              </div>
              <h3 className="font-semibold mb-2 text-gray-900">Shooting</h3>
              <p className="text-gray-600 text-sm">{language === 'de' ? '8–10-Minuten-Blöcke, Pausen nach Bedarf' : '8–10 minute blocks, breaks as needed'}</p>
            </div>
            <div className="text-center">
              <div className="bg-purple-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-purple-600">4</span>
              </div>
              <h3 className="font-semibold mb-2 text-gray-900">{language === 'de' ? 'Auswahl' : 'Selection'}</h3>
              <p className="text-gray-600 text-sm">{language === 'de' ? 'Online-Galerie, Lieblingsmotive markieren' : 'Online gallery, mark your favorites'}</p>
            </div>
            <div className="text-center">
              <div className="bg-purple-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-purple-600">5</span>
              </div>
              <h3 className="font-semibold mb-2 text-gray-900">{language === 'de' ? 'Finale' : 'Final'}</h3>
              <p className="text-gray-600 text-sm">{language === 'de' ? 'Sanfte Retusche, Download, Prints oder Album' : 'Gentle retouching, download, prints or album'}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Safety & Comfort Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-8">{language === 'de' ? 'Sicherheit & Komfort' : 'Safety & Comfort'}</h2>
          
          <div className="bg-white rounded-xl p-8 shadow-lg">
            <ul className="space-y-4">
              <li className="flex items-start">
                <Shield className="h-6 w-6 text-purple-600 mr-3 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700">{language === 'de' ? 'Weiche Untergründe, gesicherte Props, nur bodennahe Posen.' : 'Soft surfaces, secured props, only low-to-ground poses.'}</span>
              </li>
              <li className="flex items-start">
                <Baby className="h-6 w-6 text-purple-600 mr-3 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700">{language === 'de' ? 'Kein Zwang. Kein „Sitzen müssen". Das Tempo gibt dein Baby vor.' : 'No pressure. No forced sitting. Your baby sets the pace.'}</span>
              </li>
              <li className="flex items-start">
                <Heart className="h-6 w-6 text-purple-600 mr-3 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700">{language === 'de' ? 'Studio ist warm, gewickelt wird ohne Hektik.' : 'Studio is warm, diaper changes are relaxed.'}</span>
              </li>
              <li className="flex items-start">
                <Check className="h-6 w-6 text-purple-600 mr-3 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700">{language === 'de' ? 'Hygiene: Frische Decken/Bezüge pro Termin, Hände desinfiziert.' : 'Hygiene: Fresh blankets/covers per session, hands sanitized.'}</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Outfits & Props Section */}
      <section className="py-16 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-8">{language === 'de' ? 'Outfits & Requisiten' : 'Outfits & Props'}</h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-purple-50 rounded-xl p-6">
              <h3 className="font-semibold text-lg text-gray-900 mb-3">{language === 'de' ? 'Empfohlen' : 'Recommended'}</h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start">
                  <Check className="h-4 w-4 text-purple-600 mr-2 flex-shrink-0 mt-0.5" />
                  <span>{language === 'de' ? 'Einfarbig, strukturiert: Strick, Musselin, Leinen' : 'Solid colors, textured: knit, muslin, linen'}</span>
                </li>
                <li className="flex items-start">
                  <Check className="h-4 w-4 text-purple-600 mr-2 flex-shrink-0 mt-0.5" />
                  <span>{language === 'de' ? '2–3 Outfits in ähnlichen Tönen (Sand, Creme, Salbei, Denim)' : '2–3 outfits in similar tones (sand, cream, sage, denim)'}</span>
                </li>
                <li className="flex items-start">
                  <Check className="h-4 w-4 text-purple-600 mr-2 flex-shrink-0 mt-0.5" />
                  <span>{language === 'de' ? 'Lieblingsspielzeug – ja, bitte! Klein, nicht zu bunt' : 'Favorite toy – yes, please! Small, not too colorful'}</span>
                </li>
              </ul>
            </div>

            <div className="bg-gray-50 rounded-xl p-6">
              <h3 className="font-semibold text-lg text-gray-900 mb-3">{language === 'de' ? 'Vermeiden' : 'Avoid'}</h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start">
                  <span className="text-red-500 mr-2">✗</span>
                  <span>{language === 'de' ? 'Große Logos oder Neon-Farben' : 'Large logos or neon colors'}</span>
                </li>
                <li className="flex items-start">
                  <span className="text-red-500 mr-2">✗</span>
                  <span>{language === 'de' ? 'Zu viele verschiedene Farben' : 'Too many different colors'}</span>
                </li>
              </ul>
              
              <div className="mt-4 pt-4 border-t border-gray-200">
                <h4 className="font-semibold text-sm text-gray-900 mb-2">{language === 'de' ? 'Mitbringen:' : 'Bring along:'}</h4>
                <p className="text-sm text-gray-600">{language === 'de' ? 'Ersatzbody, Feuchttücher, Snacks für Eltern, Wasser' : 'Spare onesie, wet wipes, snacks for parents, water'}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Lighting Info Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-8">{language === 'de' ? 'Farben & Licht (für Foto-Nerds, ganz kurz)' : 'Colors & Light (for photo nerds, briefly)'}</h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl p-6">
              <Eye className="h-8 w-8 text-purple-600 mb-3" />
              <h3 className="font-semibold mb-2">{language === 'de' ? 'Licht-Setup' : 'Light Setup'}</h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <li>{language === 'de' ? '• Clamshell-Softlight für zarte Hauttöne' : '• Clamshell softlight for delicate skin tones'}</li>
                <li>{language === 'de' ? '• Fensterlicht + Reflektor für natürlichen Glow' : '• Window light + reflector for natural glow'}</li>
                <li>{language === 'de' ? '• Edge-Akzent (dezent) für Tiefe bei dunkleren Outfits' : '• Edge accent (subtle) for depth with darker outfits'}</li>
              </ul>
            </div>

            <div className="bg-white rounded-xl p-6">
              <Camera className="h-8 w-8 text-purple-600 mb-3" />
              <h3 className="font-semibold mb-2">{language === 'de' ? 'Farbmanagement' : 'Color Management'}</h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <li>{language === 'de' ? '• Hauttöne kalibriert' : '• Skin tones calibrated'}</li>
                <li>{language === 'de' ? '• Prints farbverbindlich' : '• Prints color-accurate'}</li>
                <li>{language === 'de' ? '• Konsistenter Look über alle Aufnahmen' : '• Consistent look across all shots'}</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Gallery Note Section */}
      <section className="py-12 bg-purple-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h3 className="text-2xl font-bold text-gray-900 mb-4">{language === 'de' ? 'Mini-Galerie' : 'Mini Gallery'}</h3>
          <div className="grid md:grid-cols-2 gap-4 text-left">
            <div className="bg-white rounded-lg p-4">
              <p className="text-gray-700"><strong>{language === 'de' ? '60 % Close-ups:' : '60% Close-ups:'}</strong> {language === 'de' ? 'Hände, Füßchen, Wimpern' : 'Hands, tiny feet, eyelashes'}</p>
            </div>
            <div className="bg-white rounded-lg p-4">
              <p className="text-gray-700"><strong>{language === 'de' ? '40 % Mini-Momente:' : '40% Mini Moments:'}</strong> {language === 'de' ? 'Kichern, Zunge, Elternkuss' : 'Giggles, tongue out, parent kiss'}</p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12">{fromManual('manual.babyfotos.faqHeading', language === 'de' ? 'Häufige Fragen (FAQ)' : 'Frequently Asked Questions')}</h2>
          <div className="space-y-6">
            <div className="bg-gray-50 rounded-xl p-6">
              <h3 className="font-bold text-lg text-gray-900 mb-2">{fromManual('manual.babyfotos.faqQ1', language === 'de' ? 'Wie plane ich die Zeit?' : 'How do I plan the timing?')}</h3>
              <p className="text-gray-600">
                {fromManual('manual.babyfotos.faqA1', language === 'de' ? 'Wähle ein Fenster zwischen Nickerchen. Frisch gefüttert = beste Laune.' : 'Choose a window between naps. Freshly fed = best mood.')}
              </p>
            </div>
            <div className="bg-gray-50 rounded-xl p-6">
              <h3 className="font-bold text-lg text-gray-900 mb-2">{fromManual('manual.babyfotos.faqQ2', language === 'de' ? 'Was, wenn mein Baby quengelt?' : 'What if my baby gets fussy?')}</h3>
              <p className="text-gray-600">
                {fromManual('manual.babyfotos.faqA2', language === 'de' ? 'Wir pausieren. Kein Druck. Sicherheit & Wohlbefinden gehen vor.' : 'We pause. No pressure. Safety & well-being come first.')}
              </p>
            </div>
            <div className="bg-gray-50 rounded-xl p-6">
              <h3 className="font-bold text-lg text-gray-900 mb-2">{fromManual('manual.babyfotos.faqQ3', language === 'de' ? 'Dürfen Eltern/Geschwister mit aufs Bild?' : 'Can parents/siblings be in the photos?')}</h3>
              <p className="text-gray-600">
                {fromManual('manual.babyfotos.faqA3', language === 'de' ? 'Ja – bei jedem Paket möglich (bei Mini kurz & simpel).' : 'Yes – possible with every package (brief & simple with Mini).')}
              </p>
            </div>
            <div className="bg-gray-50 rounded-xl p-6">
              <h3 className="font-bold text-lg text-gray-900 mb-2">{fromManual('manual.babyfotos.faqQ4', language === 'de' ? 'Wann bekomme ich die Bilder?' : 'When will I receive the photos?')}</h3>
              <p className="text-gray-600">
                {fromManual('manual.babyfotos.faqA4', language === 'de' ? 'Vorauswahl 3–5 Tage, Finale 10–14 Tage (Express möglich).' : 'Preview selection 3–5 days, final delivery 10–14 days (express available).')}
              </p>
            </div>
            <div className="bg-gray-50 rounded-xl p-6">
              <h3 className="font-bold text-lg text-gray-900 mb-2">{fromManual('manual.babyfotos.faqQ5', language === 'de' ? 'Darf ich die Bilder drucken?' : 'Can I print the photos?')}</h3>
              <p className="text-gray-600">
                {fromManual('manual.babyfotos.faqA5', language === 'de' ? 'Ja, für private Nutzung. Fine-Art-Prints/Alben bieten wir an.' : 'Yes, for personal use. We also offer fine art prints/albums.')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Why New Age Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-8">{language === 'de' ? `Warum ${SITE.name}?` : 'Why New Age Photography?'}</h2>
          
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl p-6 text-center">
              <Star className="h-10 w-10 text-purple-600 mx-auto mb-3" />
              <h3 className="font-semibold mb-2">{language === 'de' ? '12+ Jahre Erfahrung' : '12+ Years Experience'}</h3>
              <p className="text-sm text-gray-600">{language === 'de' ? 'mit Babys & Familien' : 'with babies & families'}</p>
            </div>
            <div className="bg-white rounded-xl p-6 text-center">
              <Camera className="h-10 w-10 text-purple-600 mx-auto mb-3" />
              <h3 className="font-semibold mb-2">{language === 'de' ? 'Babyfotos Wien-optimiert' : 'Vienna-optimized baby photos'}</h3>
              <p className="text-sm text-gray-600">{language === 'de' ? 'minimalistisch, zeitlos' : 'minimalist, timeless'}</p>
            </div>
            <div className="bg-white rounded-xl p-6 text-center">
              <Heart className="h-10 w-10 text-purple-600 mx-auto mb-3" />
              <h3 className="font-semibold mb-2">{language === 'de' ? 'Lockerer Ablauf' : 'Relaxed process'}</h3>
              <p className="text-sm text-gray-600">{language === 'de' ? 'mit Blick für echte Mimik' : 'with an eye for genuine expressions'}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Related Services */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-center mb-8">{language === 'de' ? 'Weitere Fotografie-Services' : 'More Photography Services'}</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <Link
              to="/neugeborenenfotos-wien/"
              className="block bg-purple-50 rounded-xl p-6 hover:shadow-lg transition-shadow"
            >
              <Baby className="h-10 w-10 text-purple-600 mb-4" />
              <h3 className="font-semibold text-lg mb-2 text-gray-900">{language === 'de' ? 'Neugeborenenfotos' : 'Newborn Photos'}</h3>
              <p className="text-gray-600 text-sm mb-4">
                {language === 'de' ? 'Schlafbasierte Sessions für Tag 5–14 nach Geburt' : 'Sleep-based sessions for days 5–14 after birth'}
              </p>
              <span className="text-purple-600 font-semibold flex items-center">
                {language === 'de' ? 'Mehr erfahren' : 'Learn more'} <ArrowRight className="ml-1 h-4 w-4" />
              </span>
            </Link>
            <Link
              to="/familienfotos-wien/"
              className="block bg-purple-50 rounded-xl p-6 hover:shadow-lg transition-shadow"
            >
              <Users className="h-10 w-10 text-purple-600 mb-4" />
              <h3 className="font-semibold text-lg mb-2 text-gray-900">{language === 'de' ? 'Familienfotos' : 'Family Photos'}</h3>
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
              <h3 className="font-semibold text-lg mb-2 text-gray-900">{language === 'de' ? 'Schwangerschaftsfotos' : 'Maternity Photos'}</h3>
              <p className="text-gray-600 text-sm mb-4">
                {language === 'de' ? 'Babybauch-Fotografie in entspannter Atmosphäre' : 'Baby bump photography in a relaxed atmosphere'}
              </p>
              <span className="text-purple-600 font-semibold flex items-center">
                {language === 'de' ? 'Mehr erfahren' : 'Learn more'} <ArrowRight className="ml-1 h-4 w-4" />
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* External Link Section */}
      <section className="py-12 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-600">
            {language === 'de' ? (
              <>
                <strong>Externer Hinweis:</strong> Für kinderfreundliche Orte & Services schau bei{' '}
                <a 
                  href="https://www.wien.gv.at/menschen/kind-familie/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-purple-600 hover:text-purple-700 underline"
                >
                  Stadt Wien – Familie & Kinder
                </a>
                {' '}vorbei (z. B. Wickelmöglichkeiten, Parks).
              </>
            ) : (
              <>
                <strong>External note:</strong> For child-friendly places & services, visit{' '}
                <a 
                  href="https://www.wien.gv.at/menschen/kind-familie/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-purple-600 hover:text-purple-700 underline"
                >
                  City of Vienna – Family & Children
                </a>
                {' '}(e.g. changing facilities, parks).
              </>
            )}
          </p>
        </div>
      </section>

      {/* Weitere Fotoshootings in Wien – compact internal link block */}
      <section className="py-12 bg-gray-50 border-t border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            {language === 'de' ? 'Weitere Fotoshootings in Wien' : 'More Photo Shoots in Vienna'}
          </h3>
          <ul className="grid sm:grid-cols-2 gap-3 mb-6 max-w-2xl mx-auto">
            <li>
              <Link to="/familienfotos-wien/" className="text-purple-700 hover:text-purple-900 font-medium underline underline-offset-2">
                {language === 'de' ? 'Familienfotos in Wien' : 'Family Photos in Vienna'}
              </Link>
            </li>
            <li>
              <Link to="/schwangerschaftsfotos-wien/" className="text-purple-700 hover:text-purple-900 font-medium underline underline-offset-2">
                {language === 'de' ? 'Schwangerschaftsfotos Wien' : 'Maternity Photos Vienna'}
              </Link>
            </li>
            <li>
              <Link to="/kinder-fotografie-wien/" className="text-purple-700 hover:text-purple-900 font-medium underline underline-offset-2">
                {language === 'de' ? 'Kinderfotografie Wien' : "Children's Photography Vienna"}
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
      <section className="py-16 bg-gradient-to-r from-purple-600 to-pink-600 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            {language === 'de' ? 'Bereit für zauberhafte Babyfotos in Wien?' : 'Ready for magical baby photos in Vienna?'}
          </h2>
          <p className="text-xl mb-8 opacity-90">
            {language === 'de' 
              ? <>Sichere dir jetzt deinen Termin für <strong>babyfotos wien</strong>. Wir kümmern uns um Licht, Stimmung und die kleinen, großen Momente.</>
              : <>Book your appointment for <strong>baby photos Vienna</strong> now. We take care of the light, mood, and all those little big moments.</>
            }
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/warteliste"
              className="inline-flex items-center justify-center px-8 py-4 bg-white text-purple-600 rounded-lg hover:bg-gray-100 transition-colors font-semibold text-lg"
            >
              {language === 'de' ? 'Zur Termin-Warteliste' : 'Join the Waitlist'}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
            <Link
              to="/gutschein/baby"
              className="inline-flex items-center justify-center px-8 py-4 border-2 border-white text-white rounded-lg hover:bg-white/10 transition-colors font-semibold text-lg"
            >
              {language === 'de' ? 'Baby-Gutschein kaufen' : 'Buy Baby Voucher'}
            </Link>
          </div>
        </div>
      </section>

      <RelatedServices currentPath="/babyfotos-wien/" />

    </div>
    </Layout>
  );
}
