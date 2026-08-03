import { SEOHead } from '../../components/SEO/SEOHead';
import { RelatedServices } from '../../components/SEO/RelatedServices';
import Layout from '../../components/layout/Layout';
import GoogleReviews from '../../components/layout/GoogleReviews';
import { Link, useNavigate } from 'react-router-dom';
import { ContextualLinks } from '../../components/SEO/ContextualLinks';
import { Helmet } from 'react-helmet-async';
import { Camera, Sparkles, ArrowRight, Check, MapPin } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useManualPageContent } from '../../hooks/useManualPageContent';
import MarkdownCopySlot from '../../components/MarkdownCopySlot';
import { newageCopyMap } from '../../content/newageCopyMap';
import { useLanguage } from '../../context/LanguageContext';
import { SITE } from '../../config/site';

export default function PortraitfotografieWienPage() {
  const navigate = useNavigate();
  const { addItem } = useCart();
  const t = useManualPageContent('portraitfotografie');
  const { language } = useLanguage();

  // Language-aware fallbacks
  const fallbacks = {
    en: {
      heroTitle: 'Portrait Photography in Vienna',
      heroSubtitle: 'Real presence. Clean lighting. Images that last.',
      heroDescription: 'As a portrait photographer in Vienna, we capture you exactly how you want to be seen – editorial, classic or creative. In the studio or on location. No stiff poses, with clear direction and pace.',
      primaryCta: 'Book a Spot',
      secondaryCta: 'Consultation & Availability',
    },
    de: {
      heroTitle: 'Portraitfotografie in Wien',
      heroSubtitle: 'Echte Ausstrahlung. Saubere Lichtführung. Bilder, die bleiben.',
      heroDescription: 'Als portraitfotograf wien inszenieren wir dich so, wie du gesehen werden willst – editorial, klassisch oder kreativ. Im Studio oder on location. Ohne steife Posen, mit klarer Richtung und Tempo.',
      primaryCta: 'Termin sichern',
      secondaryCta: 'Beratung & Verfügbarkeit',
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

  const heroTitle = fromManual('manual.portraitfotografie.heroTitle', fb.heroTitle);
  const heroSubtitle = fromManual('manual.portraitfotografie.heroTagline', fb.heroSubtitle);
  const heroDescription = fromManual('manual.portraitfotografie.heroDescription', fb.heroDescription);
  const primaryCta = fromManual('manual.portraitfotografie.primaryCta', fb.primaryCta);
  const secondaryCta = fromManual('manual.portraitfotografie.secondaryCta', fb.secondaryCta);
  const heroImage1 = fromManual('manual.portraitfotografie.heroImage1', '');
  const heroImage2 = fromManual('manual.portraitfotografie.heroImage2', '');
  const heroImage3 = fromManual('manual.portraitfotografie.heroImage3', '');
  const heroImage4 = fromManual('manual.portraitfotografie.heroImage4', '');
  const heroImage5 = fromManual('manual.portraitfotografie.heroImage5', '');

  const handleBookPackage = (packageName: string, price: number, description: string) => {
    addItem({
      title: packageName,
      price: price,
      quantity: 1,
      packageType: 'Portrait',
      type: 'voucher'
    });
    navigate('/cart');
  };

  return (
    <Layout>
      <div className="min-h-screen bg-white">
        <SEOHead
          title={newageCopyMap['portrait-fotografie-wien'].title}
          description={newageCopyMap['portrait-fotografie-wien'].metaDescription}
          keywords="portraitfotograf wien, portraitfotografie wien, editorial portrait wien, studio portrait wien"
          canonical="/portrait-fotografie-wien/"
          hreflang={[
            { lang: 'de', url: '/portrait-fotografie-wien/' },
            { lang: 'en', url: '/en/portrait-photography-vienna/' }
          ]}
        />

        {/* JSON-LD Structured Data */}
        <Helmet>
          <script type="application/ld+json">
            {JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Service',
              name: 'Portraitfotografie Wien',
              serviceType: 'Portrait Photography',
              areaServed: { '@type': 'City', name: 'Wien' },
              provider: { '@type': 'LocalBusiness', name: SITE.name },
              offers: { '@type': 'AggregateOffer', lowPrice: '190', highPrice: '480', priceCurrency: 'EUR' }
            })}
          </script>
        </Helmet>

        {/* Hero */}
        <section className="relative bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white pt-24 pb-16">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-900/20 to-pink-900/20"></div>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
                  {heroTitle}
                </h1>
                <p className="text-xl text-gray-300 mb-3 leading-relaxed font-semibold">
                  {heroSubtitle}
                </p>
                <p className="text-lg text-gray-300/90 mb-8 leading-relaxed">
                  {heroDescription}
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link to="/warteliste" className="inline-flex items-center justify-center px-8 py-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold text-lg">
                    {primaryCta}
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                  <Link to="/kontakt" className="inline-flex items-center justify-center px-8 py-4 border-2 border-white text-white rounded-lg hover:bg-white/10 transition-colors font-semibold text-lg">
                    {secondaryCta}
                  </Link>
                </div>
              </div>
              {/* Right: Hero Images Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <img
                    src={heroImage1}
                    alt="portraitfotograf wien – Editorial-Look mit Kantenlicht auf schwarzem Hintergrund"
                    className="rounded-2xl shadow-2xl w-full h-auto object-contain"
                    loading="eager"
                  />
                </div>
                <div>
                  <img
                    src={heroImage2}
                    alt="Portrait Fotografie Wien Studio"
                    className="rounded-xl shadow-lg w-full h-auto object-contain"
                    loading="eager"
                  />
                </div>
                <div>
                  <img
                    src={heroImage3}
                    alt="Klassisches Portrait Wien"
                    className="rounded-xl shadow-lg w-full h-auto object-contain"
                    loading="eager"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        <GoogleReviews />

        <ContextualLinks pathname="/portrait-fotografie-wien/" language={language} />

        {/* Portrait-Stile */}
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">{language === 'de' ? 'Portrait-Stile auf einen Blick' : 'Portrait Styles at a Glance'}</h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-gray-50 rounded-xl p-6">
                <Sparkles className="h-10 w-10 text-purple-600 mb-4" />
                <h3 className="font-semibold text-lg mb-2 text-gray-900">Editorial</h3>
                <p className="text-gray-600 text-sm">{language === 'de' ? 'Magazin-Look, markante Lichtkante, klare Posen.' : 'Magazine look, striking light edge, clear poses.'}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-6">
                <Camera className="h-10 w-10 text-purple-600 mb-4" />
                <h3 className="font-semibold text-lg mb-2 text-gray-900">{language === 'de' ? 'Klassisch' : 'Classic'}</h3>
                <p className="text-gray-600 text-sm">{language === 'de' ? 'Zeitlos, weiche Übergänge, dezente Retusche.' : 'Timeless, soft transitions, subtle retouching.'}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-6">
                <Sparkles className="h-10 w-10 text-purple-600 mb-4" />
                <h3 className="font-semibold text-lg mb-2 text-gray-900">{language === 'de' ? 'Kreativ' : 'Creative'}</h3>
                <p className="text-gray-600 text-sm">{language === 'de' ? 'Farben, Texturen, Bewegung – gerne auch Experimente.' : 'Colours, textures, movement – experiments welcome.'}</p>
              </div>
            </div>
            <div className="mt-8 text-center text-gray-700 text-sm">
              {language === 'de' ? 'Ergebnis: Ein Set Bilder, das auf Website, LinkedIn & Profil gleichermaßen funktioniert.' : 'Result: A set of images that works equally well on your website, LinkedIn & profile.'}
            </div>
          </div>
        </section>

        {/* Studio-Sets & Licht */}
        <section className="py-16 bg-gray-50">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-center mb-8">{language === 'de' ? 'Studio-Sets & Licht (Best-of)' : 'Studio Sets & Lighting (Best-of)'}</h2>
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-purple-600 text-white">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Set</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Look</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">{language === 'de' ? 'Licht-Setup' : 'Light Setup'}</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">{language === 'de' ? 'Ideal für' : 'Ideal for'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  <tr className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">Charcoal Grey</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{language === 'de' ? 'Zeitlos, Business-Ready' : 'Timeless, business-ready'}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{language === 'de' ? '2-Licht Clamshell + Haarlicht' : '2-light clamshell + hair light'}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{language === 'de' ? 'Headshots, Team' : 'Headshots, team'}</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">White High-Key</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{language === 'de' ? 'Hell, clean, modern' : 'Bright, clean, modern'}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{language === 'de' ? 'Großes Softbox-Key + Aufheller' : 'Large softbox key + fill'}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">Web, PR</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">Black Low-Key</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{language === 'de' ? 'Dramatisch, kantig' : 'Dramatic, edgy'}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{language === 'de' ? 'Streifenlicht + Edge' : 'Strip light + edge'}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{language === 'de' ? 'Editorial, Künstler' : 'Editorial, artists'}</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">Color Pop</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{language === 'de' ? 'Mutig, Trend' : 'Bold, trending'}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{language === 'de' ? 'Farbgel + Key/Fill' : 'Colour gel + key/fill'}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{language === 'de' ? 'Kampagnen, Social' : 'Campaigns, social'}</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">Textured Backdrop</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{language === 'de' ? 'Warm, organisch' : 'Warm, organic'}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">Soft Key + Grid</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{language === 'de' ? 'Autoren, Personal Brand' : 'Authors, personal brand'}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="mt-4 bg-purple-50 rounded-xl p-4 text-sm text-gray-700">
              {language === 'de' ? 'Technik-Kurznotiz: Hauttöne zuerst. Dual-Card-Backup. Kalibrierte Monitore. Retusche dezent – Poren bleiben Poren.' : 'Tech note: Skin tones first. Dual-card backup. Calibrated monitors. Retouching subtle – pores stay pores.'}
            </div>
          </div>
        </section>
        {/* Extended Content Section - Safe Copy Slot */}
        {language === 'de' && <MarkdownCopySlot content={newageCopyMap['portrait-fotografie-wien'].markdown} />}
        {/* Pakete & Preise */}
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">{language === 'de' ? 'Pakete & Preise' : 'Packages & Prices'}</h2>
            </div>
            <div className="grid md:grid-cols-3 gap-8 mb-12">
              {/* Business Portrait Basic */}
              <div className="bg-white rounded-2xl shadow-lg p-8 hover:shadow-xl transition-shadow border border-gray-200">
                <div className="mb-6">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Business Portrait Basic</h3>
                  <p className="text-purple-600 font-medium">Business-Headshot</p>
                </div>
                <div className="mb-6">
                  <div className="flex items-baseline">
                    <span className="text-sm text-gray-500 mr-1">{language === 'de' ? 'Ab' : 'From'}</span>
                    <span className="text-4xl font-bold text-purple-600">€69</span>
                  </div>
                </div>
                <div className="space-y-3 mb-8 text-sm">
                  <div className="flex items-start"><Check className="h-4 w-4 text-green-500 mr-2 mt-0.5" /><span>{language === 'de' ? '30 Minuten' : '30 minutes'}</span></div>
                  <div className="flex items-start"><Check className="h-4 w-4 text-green-500 mr-2 mt-0.5" /><span>{language === 'de' ? '1 retuschiertes Foto suitable for LinkedIn' : '1 retouched photo suitable for LinkedIn'}</span></div>
                  <div className="flex items-start"><Check className="h-4 w-4 text-green-500 mr-2 mt-0.5" /><span>{language === 'de' ? 'Gültig bis 2 Jahre' : 'Valid for up to 2 years'}</span></div>
                </div>
                <Link
                  to="/warteliste"
                  className="block w-full text-center px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-semibold"
                >
                  {language === 'de' ? 'Jetzt buchen' : 'Book Now'}
                </Link>
              </div>

              {/* Express Headshot (beliebt) */}
              <div className="bg-gradient-to-br from-purple-600 to-pink-600 text-white rounded-2xl shadow-2xl p-8 transform sm:scale-105 relative">
                <div className="absolute top-0 right-0 bg-yellow-400 text-gray-900 text-sm font-bold px-4 py-2 rounded-bl-lg rounded-tr-2xl">{language === 'de' ? 'BELIEBT' : 'POPULAR'}</div>
                <div className="mb-6 mt-4">
                  <h3 className="text-2xl font-bold mb-2">Express Headshot</h3>
                  <p className="text-purple-100 font-medium">{language === 'de' ? 'Schnell & effizient' : 'Fast & efficient'}</p>
                </div>
                <div className="mb-6">
                  <div className="flex items-baseline">
                    <span className="text-sm text-purple-200 mr-1">{language === 'de' ? 'Ab' : 'From'}</span>
                    <span className="text-4xl font-bold">€95</span>
                  </div>
                </div>
                <div className="space-y-3 mb-8 text-sm">
                  <div className="flex items-start"><Check className="h-4 w-4 text-yellow-300 mr-2 mt-0.5" /><span>{language === 'de' ? '20–30 Min.' : '20–30 min.'}</span></div>
                  <div className="flex items-start"><Check className="h-4 w-4 text-yellow-300 mr-2 mt-0.5" /><span>1 Look/Outfit</span></div>
                  <div className="flex items-start"><Check className="h-4 w-4 text-yellow-300 mr-2 mt-0.5" /><span>{language === 'de' ? '1 retuschiertes Bild (High-Res + Web)' : '1 retouched image (high-res + web)'}</span></div>
                  <div className="flex items-start"><Check className="h-4 w-4 text-yellow-300 mr-2 mt-0.5" /><span>{language === 'de' ? 'Gültig bis 2 Jahre' : 'Valid for up to 2 years'}</span></div>
                </div>
                <Link
                  to="/warteliste"
                  className="block w-full text-center px-6 py-3 bg-white text-purple-600 rounded-lg hover:bg-gray-100 transition-colors font-semibold"
                >
                  {language === 'de' ? 'Jetzt buchen' : 'Book Now'}
                </Link>
              </div>

              {/* Business Portrait Session */}
              <div className="bg-white rounded-2xl shadow-lg p-8 hover:shadow-xl transition-shadow border border-gray-200">
                <div className="mb-6">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Business Portrait Session</h3>
                  <p className="text-purple-600 font-medium">Professional headshots</p>
                </div>
                <div className="mb-6">
                  <div className="flex items-baseline">
                    <span className="text-sm text-gray-500 mr-1">{language === 'de' ? 'Ab' : 'From'}</span>
                    <span className="text-4xl font-bold text-purple-600">€199</span>
                  </div>
                </div>
                <div className="space-y-3 mb-8 text-sm">
                  <div className="flex items-start"><Check className="h-4 w-4 text-green-500 mr-2 mt-0.5" /><span>{language === 'de' ? '60 Minuten Session' : '60-minute session'}</span></div>
                  <div className="flex items-start"><Check className="h-4 w-4 text-green-500 mr-2 mt-0.5" /><span>{language === 'de' ? 'Professional headshots for business use' : 'Professional headshots for business use'}</span></div>
                  <div className="flex items-start"><Check className="h-4 w-4 text-green-500 mr-2 mt-0.5" /><span>{language === 'de' ? 'Gültig bis 2 Jahre' : 'Valid for up to 2 years'}</span></div>
                </div>
                <Link
                  to="/warteliste"
                  className="block w-full text-center px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-semibold"
                >
                  {language === 'de' ? 'Jetzt buchen' : 'Book Now'}
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Vorbereitung */}
        <section className="py-16 bg-gray-50">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-center mb-10">{language === 'de' ? 'Vorbereitung: Kleidung & Ausdruck' : 'Preparation: Clothing & Expression'}</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <h3 className="font-semibold text-gray-900 mb-3">{language === 'de' ? 'Kleidung (quick wins)' : 'Clothing (quick wins)'}</h3>
                <ul className="text-sm text-gray-700 space-y-2">
                  <li>{language === 'de' ? '• 2–3 Outfits: neutral + Statement' : '• 2–3 outfits: neutral + statement'}</li>
                  <li>{language === 'de' ? '• Feine Texturen > große Logos' : '• Fine textures > large logos'}</li>
                  <li>{language === 'de' ? '• Kragen & Schultern glatt (Steamer vor Ort)' : '• Collar & shoulders smooth (steamer on site)'}</li>
                </ul>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <h3 className="font-semibold text-gray-900 mb-3">{language === 'de' ? 'Ausdruck' : 'Expression'}</h3>
                <ul className="text-sm text-gray-700 space-y-2">
                  <li>{language === 'de' ? '• „Soft Smile“, „Focused“, „Approachable“ – Mikro-Coaching' : '• "Soft Smile", "Focused", "Approachable" – micro-coaching'}</li>
                  <li>{language === 'de' ? '• 5-Sekunden-Regel: Mini-Reset zwischen Serien' : '• 5-second rule: mini reset between series'}</li>
                </ul>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <h3 className="font-semibold text-gray-900 mb-3">{language === 'de' ? 'Accessoires' : 'Accessories'}</h3>
                <ul className="text-sm text-gray-700 space-y-2">
                  <li>{language === 'de' ? '• Brillen entspiegeln? Super – sonst kurzer Winkel-Check' : '• Anti-glare glasses? Great – otherwise a quick angle check'}</li>
                  <li>{language === 'de' ? '• Schmuck: 1 Fokus-Piece statt alles gleichzeitig' : '• Jewellery: 1 focus piece instead of everything at once'}</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Ablauf & SLAs */}
        <section className="py-16 bg-gray-50">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-center mb-8">{language === 'de' ? 'Ablauf & Lieferzeiten (SLAs)' : 'Process & Delivery Times (SLAs)'}</h2>
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-purple-600 text-white">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold">{language === 'de' ? 'Schritt' : 'Step'}</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">{language === 'de' ? 'Was passiert' : 'What happens'}</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">{language === 'de' ? 'Zeit' : 'Time'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  <tr className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">Briefing</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{language === 'de' ? 'Ziel, Look, Nutzung (Web/Print/PR)' : 'Goal, look, usage (web/print/PR)'}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{language === 'de' ? '10 Min' : '10 min'}</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">Shooting</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{language === 'de' ? 'Lichtcheck → Serien → Review' : 'Light check → Series → Review'}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{language === 'de' ? '30–120 Min' : '30–120 min'}</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{language === 'de' ? 'Auswahl' : 'Selection'}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{language === 'de' ? 'Favoriten in Galerie markieren' : 'Mark favourites in gallery'}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{language === 'de' ? 'am Tag' : 'Same day'}</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{language === 'de' ? 'Retusche' : 'Retouching'}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{language === 'de' ? 'Natürlich, sauber, markenschonend' : 'Natural, clean, brand-safe'}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{language === 'de' ? '2–4 Werktage' : '2–4 business days'}</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">Delivery</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{language === 'de' ? 'Hi-Res + Web-Optimiert, Namensschema' : 'Hi-res + web-optimised, naming scheme'}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{language === 'de' ? 'Download-Link' : 'Download link'}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="bg-purple-100 rounded-xl p-4 text-center mt-4">
              <p className="text-sm text-gray-700">{language === 'de' ? "Express möglich, wenn's brennt." : 'Express available when it\'s urgent.'}</p>
            </div>
          </div>
        </section>

        {/* Beispiele */}
        <section className="py-16 bg-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-center mb-8">{language === 'de' ? 'Beispiele: Editorial • Klassisch • Kreativ' : 'Examples: Editorial • Classic • Creative'}</h2>
            <div className="bg-purple-50 rounded-xl p-8">
              <ul className="grid md:grid-cols-3 gap-4 text-sm text-gray-700">
                <li>{language === 'de' ? '• Editorial: Dunkler Backdrop, Edge-Light, markanter Kiefer – Magazin-ready.' : '• Editorial: Dark backdrop, edge light, strong jawline – magazine-ready.'}</li>
                <li>{language === 'de' ? '• Klassisch: Grey, weiches Key, Catchlights sauber – zeitlos.' : '• Classic: Grey, soft key, clean catchlights – timeless.'}</li>
                <li>{language === 'de' ? '• Kreativ: Farbgel-Gradient, leichte Motion – Social Hook.' : '• Creative: Colour gel gradient, subtle motion – social hook.'}</li>
              </ul>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-16 bg-gray-50">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-center mb-12">{fromManual('manual.portraitfotografie.faqHeading', language === 'de' ? 'FAQ – kurz & klar' : 'FAQ – Short & Clear')}</h2>
            <div className="space-y-6">
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <h3 className="font-bold text-lg text-gray-900 mb-2">{fromManual('manual.portraitfotografie.faqQ1', language === 'de' ? 'Wie viele finale Bilder?' : 'How many final images?')}</h3>
                <p className="text-gray-600">{fromManual('manual.portraitfotografie.faqA1', language === 'de' ? 'Je nach Paket 6–18 retuschierte Motive, plus Grundauswahl.' : 'Depending on the package, 6–18 retouched images, plus basic selection.')}</p>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <h3 className="font-bold text-lg text-gray-900 mb-2">{fromManual('manual.portraitfotografie.faqQ2', language === 'de' ? 'Darf ich die RAWs bekommen?' : 'Can I get the RAW files?')}</h3>
                <p className="text-gray-600">{fromManual('manual.portraitfotografie.faqA2', language === 'de' ? 'Nein – wir liefern finale, farbverbindliche Bilder (JPG/PNG, auf Wunsch TIFF).' : 'No – we deliver final, colour-accurate images (JPG/PNG, TIFF on request).')}</p>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <h3 className="font-bold text-lg text-gray-900 mb-2">{fromManual('manual.portraitfotografie.faqQ3', language === 'de' ? 'Make-up nötig?' : 'Is make-up necessary?')}</h3>
                <p className="text-gray-600">{fromManual('manual.portraitfotografie.faqA3', language === 'de' ? 'Empfehlung: Mattierung/Teint-Ausgleich. Gerne buchen wir Make-up Artist.' : 'Recommendation: mattifying/complexion evening. We\'re happy to book a make-up artist.')}</p>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <h3 className="font-bold text-lg text-gray-900 mb-2">{fromManual('manual.portraitfotografie.faqQ4', language === 'de' ? 'Retusche-Level?' : 'Retouching level?')}</h3>
                <p className="text-gray-600">{fromManual('manual.portraitfotografie.faqA4', language === 'de' ? 'Natürlich – Hautstruktur bleibt, temporäre Unreinheiten gehen.' : 'Natural – skin texture stays, temporary blemishes go.')}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-16 bg-gradient-to-r from-gray-900 to-gray-800 text-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">{language === 'de' ? 'Nächster Schritt' : 'Next Step'}</h2>
            <p className="text-xl mb-8 opacity-90">
              {language === 'de'
                ? 'Erzähl uns kurz Zweck, Deadline und gewünschten Stil. Wir empfehlen Paket, Set & Licht – und blocken dir einen Slot.'
                : 'Tell us briefly the purpose, deadline and desired style. We\'ll recommend a package, set & lighting – and block a slot for you.'}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/warteliste" className="inline-flex items-center justify-center px-8 py-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold text-lg">
                {language === 'de' ? 'Jetzt Wartelisten-Platz sichern' : 'Secure a waitlist spot now'}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
              <Link to="/kontakt" className="inline-flex items-center justify-center px-8 py-4 border-2 border-white text-white rounded-lg hover:bg-white/10 transition-colors font-semibold text-lg">
                {language === 'de' ? 'Verfügbarkeit prüfen' : 'Check availability'}
              </Link>
            </div>
          </div>
        </section>

        <RelatedServices currentPath="/portrait-fotografie-wien/" />
      </div>
    </Layout>
  );
}
