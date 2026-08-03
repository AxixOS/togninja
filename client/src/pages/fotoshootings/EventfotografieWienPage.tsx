import { SEOHead } from '../../components/SEO/SEOHead';
import { RelatedServices } from '../../components/SEO/RelatedServices';
import Layout from '../../components/layout/Layout';
import GoogleReviews from '../../components/layout/GoogleReviews';
import MarkdownCopySlot from '../../components/MarkdownCopySlot';
import { newageCopyMap } from '../../content/newageCopyMap';
import { Link, useNavigate } from 'react-router-dom';
import { ContextualLinks } from '../../components/SEO/ContextualLinks';
import { Camera, Heart, Users, Star, ArrowRight, Check, Clock, Briefcase, Shield, Zap, Eye, MonitorPlay, Award, Building } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { useCart } from '../../context/CartContext';
import { useManualPageContent } from '../../hooks/useManualPageContent';
import { useLanguage } from '../../context/LanguageContext';
import { SITE } from '../../config/site';

export default function EventfotografieWienPage() {
  const navigate = useNavigate();
  const { addItem } = useCart();
  const t = useManualPageContent('eventfotografie');
  const { language } = useLanguage();

  // Language-aware fallbacks
  const fallbacks = {
    en: {
      heroTitle: 'Event Photography in Vienna',
      heroSubtitle: 'Big Event. Clear Images. Zero Stress.',
      heroDescription: 'As event photographers in Vienna, we document conferences, brand launches and corporate events precisely, unobtrusively and on-brand – from check-in to closing shot.',
      primaryCta: 'Secure a Spot on the Waitlist',
      secondaryCta: 'Inquire Directly',
    },
    de: {
      heroTitle: 'Eventfotografie in Wien',
      heroSubtitle: 'Großes Event. Klare Bilder. Null Stress.',
      heroDescription: 'Als eventfotograf wien dokumentieren wir Konferenzen, Brand-Launches und Corporate-Events präzise, unauffällig und on-brand – vom Check-in bis zum Closing Shot.',
      primaryCta: 'Termin auf der Warteliste sichern',
      secondaryCta: 'Direkt anfragen',
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

  const heroTitle = fromManual('manual.eventfotografie.heroTitle', fb.heroTitle);
  const heroSubtitle = fromManual('manual.eventfotografie.heroTagline', fb.heroSubtitle);
  const heroDescription = fromManual('manual.eventfotografie.heroDescription', fb.heroDescription);
  const primaryCta = fromManual('manual.eventfotografie.primaryCta', fb.primaryCta);
  const secondaryCta = fromManual('manual.eventfotografie.secondaryCta', fb.secondaryCta);
  const heroImage1 = fromManual('manual.eventfotografie.heroImage1', '');
  const heroImage2 = fromManual('manual.eventfotografie.heroImage2', '');
  const heroImage3 = fromManual('manual.eventfotografie.heroImage3', '');
  const heroImage4 = fromManual('manual.eventfotografie.heroImage4', '');
  const heroImage5 = fromManual('manual.eventfotografie.heroImage5', '');

  const handleBookPackage = (packageName: string, price: number, description: string, imageUrl?: string) => {
    addItem({
      title: packageName,
      price: price,
      quantity: 1,
      packageType: 'Event',
      type: 'voucher',
      description: description,
      imageUrl: imageUrl || heroImage1 || 'https://i.imgur.com/Vd6xtPg.jpg'
    });
    navigate('/cart');
  };

  return (
    <Layout>
    <div className="min-h-screen bg-white">
      <SEOHead
        title={newageCopyMap['eventfotografie-wien'].title}
        description={newageCopyMap['eventfotografie-wien'].metaDescription}
        keywords="eventfotograf wien, eventfotografie wien, konferenzfotografie wien, messefotografie wien"
        canonical="/eventfotografie-wien/"
        ogImage={`${SITE.url}/images/event-hero.jpg`}
        hreflang={[
          { lang: 'de', url: '/eventfotografie-wien/' },
          { lang: 'en', url: '/en/event-photography-vienna/' }
        ]}
      />

      {/* JSON-LD Structured Data */}
      <Helmet>
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Service",
            "name": "Eventfotografie Wien",
            "serviceType": "Corporate Event Photography",
            "areaServed": {
              "@type": "City",
              "name": "Wien"
            },
            "provider": {
              "@type": "LocalBusiness",
              "name": SITE.name
            },
            "offers": {
              "@type": "AggregateOffer",
              "lowPrice": "449",
              "highPrice": "999",
              "priceCurrency": "EUR"
            },
            "hasOfferCatalog": {
              "@type": "OfferCatalog",
              "name": "Eventfotografie Pakete",
              "itemListElement": [
                {"@type": "Offer", "name": "Eventfotografie", "price": "449", "priceCurrency": "EUR"},
                {"@type": "Offer", "name": "Event Premium", "price": "999", "priceCurrency": "EUR"}
              ]
            }
          })}
        </script>
      </Helmet>

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
                  to="/kontakt"
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
                  alt="eventfotograf wien – Keynote mit vollem Saal, Rathaus Wien"
                  className="rounded-2xl shadow-2xl w-full h-auto object-contain"
                  loading="eager"
                />
              </div>
              <div>
                <img
                  src={heroImage2}
                  alt="Eventfotografie Wien - Networking und Podiumsdiskussion bei Corporate Event"
                  className="rounded-xl shadow-lg w-full h-auto object-contain"
                  loading="eager"
                />
              </div>
              <div>
                <img
                  src={heroImage3}
                  alt="Corporate Event Fotograf Wien - Professionelle Konferenzfotografie und Firmenevents"
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

      <ContextualLinks pathname="/eventfotografie-wien/" language={language} />

      {/* What We Cover Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">{language === 'de' ? 'Was wir abdecken' : 'What We Cover'}</h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-gray-50 rounded-xl p-6">
              <Building className="h-10 w-10 text-purple-600 mb-4" />
              <h3 className="font-semibold text-lg mb-3 text-gray-900">{language === 'de' ? 'Konferenzen & Summits' : 'Conferences & Summits'}</h3>
              <p className="text-gray-600 text-sm">{language === 'de' ? 'Keynotes, Breakouts, Panels, Networking' : 'Keynotes, breakouts, panels, networking'}</p>
            </div>

            <div className="bg-gray-50 rounded-xl p-6">
              <Zap className="h-10 w-10 text-purple-600 mb-4" />
              <h3 className="font-semibold text-lg mb-3 text-gray-900">{language === 'de' ? 'Brand & Produkt-Launches' : 'Brand & Product Launches'}</h3>
              <p className="text-gray-600 text-sm">{language === 'de' ? 'Staging, Presse, VIPs, Detailshots' : 'Staging, press, VIPs, detail shots'}</p>
            </div>

            <div className="bg-gray-50 rounded-xl p-6">
              <Users className="h-10 w-10 text-purple-600 mb-4" />
              <h3 className="font-semibold text-lg mb-3 text-gray-900">{language === 'de' ? 'Messen & Expo' : 'Trade Fairs & Expo'}</h3>
              <p className="text-gray-600 text-sm">{language === 'de' ? 'Booth-Stories, Besucherfluss, Teamportraits' : 'Booth stories, visitor flow, team portraits'}</p>
            </div>

            <div className="bg-gray-50 rounded-xl p-6">
              <Award className="h-10 w-10 text-purple-600 mb-4" />
              <h3 className="font-semibold text-lg mb-3 text-gray-900">Awards & Galas</h3>
              <p className="text-gray-600 text-sm">{language === 'de' ? 'Red Carpet, Step-and-Repeat, Show-Highlights' : 'Red carpet, step-and-repeat, show highlights'}</p>
            </div>

            <div className="bg-gray-50 rounded-xl p-6">
              <Camera className="h-10 w-10 text-purple-600 mb-4" />
              <h3 className="font-semibold text-lg mb-3 text-gray-900">{language === 'de' ? 'PR-Termine' : 'PR Events'}</h3>
              <p className="text-gray-600 text-sm">{language === 'de' ? 'Pressefotos, Social-Assets, schnelle Auswahl' : 'Press photos, social assets, quick selection'}</p>
            </div>

            <div className="bg-purple-50 rounded-xl p-6 border-2 border-purple-200">
              <Eye className="h-10 w-10 text-purple-600 mb-4" />
              <h3 className="font-semibold text-lg mb-3 text-gray-900">{language === 'de' ? 'Ziel' : 'Goal'}</h3>
              <p className="text-gray-700 text-sm font-medium">{language === 'de' ? 'Content, der sofort nutzbar ist – für Presse, Social, Intranet und Sales Decks' : 'Content ready to use immediately – for press, social, intranet and sales decks'}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Extended Content Section - Safe Copy Slot */}
      {language === 'de' && <MarkdownCopySlot content={newageCopyMap['eventfotografie-wien'].markdown} />}

      {/* SLAs Table Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-8">{language === 'de' ? 'Unsere SLAs (Lieferzeiten)' : 'Our SLAs (Delivery Times)'}</h2>
          
          <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-6">
            <table className="w-full">
              <thead className="bg-purple-600 text-white">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Asset</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">{language === 'de' ? 'Umfang' : 'Scope'}</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">SLA Standard</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">SLA Express*</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                <tr className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">Preview-Set</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{language === 'de' ? '25–60 Bilder' : '25–60 images'}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">24 h</td>
                  <td className="px-6 py-4 text-sm text-purple-600 font-semibold">6–12 h</td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">Social Snippets</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{language === 'de' ? '10–20 Bilder (4:5/16:9)' : '10–20 images (4:5/16:9)'}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">24 h</td>
                  <td className="px-6 py-4 text-sm text-purple-600 font-semibold">Same Day</td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{language === 'de' ? 'Finale Galerie' : 'Final Gallery'}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{language === 'de' ? '200–800+ Bilder' : '200–800+ images'}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{language === 'de' ? '3–5 Werktage' : '3–5 business days'}</td>
                  <td className="px-6 py-4 text-sm text-purple-600 font-semibold">48–72 h</td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{language === 'de' ? 'Presse-Selektion' : 'Press Selection'}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{language === 'de' ? '12–20 Bilder' : '12–20 images'}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">12–24 h</td>
                  <td className="px-6 py-4 text-sm text-purple-600 font-semibold">≤ 6 h</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="bg-purple-100 rounded-xl p-4 text-center">
            <p className="text-sm text-gray-700">
              <strong>*Express</strong> {language === 'de' ? 'nach Vereinbarung; Aufpreis je nach Umfang.' : 'by arrangement; surcharge depending on scope.'}
            </p>
          </div>
        </div>
      </section>

      {/* Feature Image 4 */}
      {heroImage4 && (
        <section className="py-16 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <img
              src={heroImage4}
              alt="Eventfotograf Wien - Professionelle Dokumentation von Firmenfeiern und Galas"
              className="w-full h-auto rounded-2xl shadow-2xl object-cover"
              loading="lazy"
            />
          </div>
        </section>
      )}

      {/* Packages Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {language === 'de' ? 'Pakete & Preise' : 'Packages & Prices'}
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto mb-12">
            {/* Eventfotografie */}
            <div className="bg-white rounded-2xl shadow-lg p-8 hover:shadow-xl transition-shadow border border-purple-200">
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{language === 'de' ? 'Eventfotografie' : 'Event Photography'}</h3>
              </div>
              <div className="mb-6">
                <div className="flex items-baseline">
                  <span className="text-sm text-gray-500 mr-1">{language === 'de' ? 'Ab' : 'From'}</span>
                  <span className="text-4xl font-bold text-purple-600">€449</span>
                </div>
              </div>
              <div className="space-y-4 mb-8">
                <div className="flex items-start">
                  <Check className="h-5 w-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">{language === 'de' ? 'Kurzauftrag inkl. 30 bearbeiteter Fotos' : 'Short assignment incl. 30 edited photos'}</span>
                </div>
                <div className="flex items-start">
                  <Check className="h-5 w-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">{language === 'de' ? 'Gültig bis 2 Jahre' : 'Valid for up to 2 years'}</span>
                </div>
              </div>
              <Link
                to="/warteliste"
                className="block w-full text-center px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-semibold"
              >
                {language === 'de' ? 'Jetzt sichern' : 'Book now'}
              </Link>
            </div>

            {/* Event Premium - BELIEBT */}
            <div className="bg-gradient-to-br from-purple-600 to-pink-600 text-white rounded-2xl shadow-2xl p-8 relative">
              <div className="absolute top-0 right-0 bg-yellow-400 text-gray-900 text-sm font-bold px-4 py-2 rounded-bl-lg rounded-tr-2xl">
                {language === 'de' ? 'BELIEBT' : 'POPULAR'}
              </div>
              <div className="mb-6 mt-4">
                <h3 className="text-2xl font-bold mb-2">Event Premium</h3>
              </div>
              <div className="mb-6">
                <div className="flex items-baseline">
                  <span className="text-sm text-purple-200 mr-1">{language === 'de' ? 'Ab' : 'From'}</span>
                  <span className="text-4xl font-bold">€999</span>
                </div>
              </div>
              <div className="space-y-4 mb-8">
                <div className="flex items-start">
                  <Check className="h-5 w-5 text-yellow-300 mr-3 flex-shrink-0 mt-0.5" />
                  <span>{language === 'de' ? 'Ganztägige Event-Coverage' : 'Full-day event coverage'}</span>
                </div>
                <div className="flex items-start">
                  <Check className="h-5 w-5 text-yellow-300 mr-3 flex-shrink-0 mt-0.5" />
                  <span>{language === 'de' ? 'Alle Bilder als Datei in Vollauflösung' : 'All images as files in full resolution'}</span>
                </div>
                <div className="flex items-start">
                  <Check className="h-5 w-5 text-yellow-300 mr-3 flex-shrink-0 mt-0.5" />
                  <span>{language === 'de' ? 'Gültig bis 2 Jahre' : 'Valid for up to 2 years'}</span>
                </div>
              </div>
              <Link
                to="/warteliste"
                className="block w-full text-center px-6 py-3 bg-white text-purple-600 rounded-lg hover:bg-gray-100 transition-colors font-semibold"
              >
                {language === 'de' ? 'Jetzt sichern' : 'Book now'}
              </Link>
            </div>
          </div>

          <div className="mt-6 text-center">
            <p className="text-gray-600">
              {language === 'de' ? <>Slots sind begrenzt. Trag dich hier ein: <Link to="/warteliste" className="text-purple-600 hover:text-purple-700 underline font-semibold">Termin-Warteliste</Link></> : <>Slots are limited. Sign up here: <Link to="/warteliste" className="text-purple-600 hover:text-purple-700 underline font-semibold">Appointment Waitlist</Link></>}
            </p>
          </div>
        </div>
      </section>

      {/* Workflow Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">{language === 'de' ? 'Workflow vor Ort' : 'On-Site Workflow'}</h2>
          
          <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-6">
            <div className="text-center">
              <div className="bg-purple-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-purple-600">1</span>
              </div>
              <h3 className="font-semibold mb-2 text-gray-900">Kick-Off</h3>
              <p className="text-gray-600 text-sm">{language === 'de' ? 'Shotlist, CI-Guides, Laufwege' : 'Shot list, CI guides, walking routes'}</p>
            </div>
            <div className="text-center">
              <div className="bg-purple-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-purple-600">2</span>
              </div>
              <h3 className="font-semibold mb-2 text-gray-900">Light-Test</h3>
              <p className="text-gray-600 text-sm">{language === 'de' ? 'Bühne, Backlight, Publikum – einmal sauber messen' : 'Stage, backlight, audience – one clean measurement'}</p>
            </div>
            <div className="text-center">
              <div className="bg-purple-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-purple-600">3</span>
              </div>
              <h3 className="font-semibold mb-2 text-gray-900">Coverage</h3>
              <p className="text-gray-600 text-sm">{language === 'de' ? 'Unauffällig, doppelt gesichert (Dual-Card)' : 'Unobtrusive, dual-card backup'}</p>
            </div>
            <div className="text-center">
              <div className="bg-purple-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-purple-600">4</span>
              </div>
              <h3 className="font-semibold mb-2 text-gray-900">On-Site Delivery</h3>
              <p className="text-gray-600 text-sm">{language === 'de' ? 'Erste Social-Assets direkt an euer Team' : 'First social assets delivered directly to your team'}</p>
            </div>
            <div className="text-center">
              <div className="bg-purple-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-purple-600">5</span>
              </div>
              <h3 className="font-semibold mb-2 text-gray-900">{language === 'de' ? 'Übergabe' : 'Handover'}</h3>
              <p className="text-gray-600 text-sm">{language === 'de' ? 'Strukturierte Ordner, klare Dateinamen, Nutzungsrechte' : 'Structured folders, clear filenames, usage rights'}</p>
            </div>
            <div className="text-center">
              <div className="bg-purple-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-purple-600">6</span>
              </div>
              <h3 className="font-semibold mb-2 text-gray-900">Backups</h3>
              <p className="text-gray-600 text-sm">{language === 'de' ? '2× Karten + RAID-Spiegelung noch am Event-Tag' : '2× cards + RAID mirroring on the event day'}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Visual Style & Tech Section */}
      <section className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-8">{language === 'de' ? 'Bildsprache & Technik' : 'Visual Language & Technology'}</h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-gray-50 rounded-xl p-6">
              <h3 className="font-semibold text-lg text-gray-900 mb-4">Keynote-Look</h3>
              <p className="text-gray-700 text-sm">{language === 'de' ? 'Tele + sauberes Bühnenlicht, Gesichter klar, Screens lesbar' : 'Telephoto + clean stage light, clear faces, readable screens'}</p>
            </div>

            <div className="bg-gray-50 rounded-xl p-6">
              <h3 className="font-semibold text-lg text-gray-900 mb-4">{language === 'de' ? 'Atmosphäre' : 'Atmosphere'}</h3>
              <p className="text-gray-700 text-sm">{language === 'de' ? 'Weitwinkel-Stories, Publikum, „between the talks“' : 'Wide-angle stories, audience, "between the talks"'}</p>
            </div>

            <div className="bg-gray-50 rounded-xl p-6">
              <h3 className="font-semibold text-lg text-gray-900 mb-4">Brand-Details</h3>
              <p className="text-gray-700 text-sm">{language === 'de' ? 'Signage, Produkt, Hand-Close-ups' : 'Signage, product, hand close-ups'}</p>
            </div>

            <div className="bg-gray-50 rounded-xl p-6">
              <h3 className="font-semibold text-lg text-gray-900 mb-4">{language === 'de' ? 'Hauttöne' : 'Skin Tones'}</h3>
              <p className="text-gray-700 text-sm">{language === 'de' ? 'Farbkalibriert, CI-Profile auf Wunsch' : 'Color-calibrated, CI profiles on request'}</p>
            </div>

            <div className="bg-purple-50 rounded-xl p-6 md:col-span-2">
              <h3 className="font-semibold text-lg text-gray-900 mb-4">{language === 'de' ? 'Formate' : 'Formats'}</h3>
              <p className="text-gray-700 text-sm">{language === 'de' ? '4:5, 1:1, 16:9 – Social-ready exportiert' : '4:5, 1:1, 16:9 – exported social-ready'}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Image 5 */}
      {heroImage5 && (
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <img
              src={heroImage5}
              alt="Event Highlights Wien - Emotionale Momente und besondere Augenblicke einfangen"
              className="w-full h-auto rounded-2xl shadow-2xl object-cover"
              loading="lazy"
            />
          </div>
        </section>
      )}

      {/* Delivery & Rights Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-8">{language === 'de' ? 'Übergaben & Rechte' : 'Handover & Rights'}</h2>
          
          <div className="bg-white rounded-xl p-8 shadow-lg">
            <ul className="space-y-4">
              <li className="flex items-start">
                <Shield className="h-6 w-6 text-purple-600 mr-3 flex-shrink-0 mt-0.5" />
                <div>
                  <strong className="text-gray-900">{language === 'de' ? 'Galerie:' : 'Gallery:'}</strong>
                  <span className="text-gray-700"> {language === 'de' ? 'Passwort-geschützt, sortiert nach Tracks' : 'Password-protected, sorted by tracks'}</span>
                </div>
              </li>
              <li className="flex items-start">
                <Check className="h-6 w-6 text-purple-600 mr-3 flex-shrink-0 mt-0.5" />
                <div>
                  <strong className="text-gray-900">{language === 'de' ? 'Dateibenennung:' : 'File naming:'}</strong>
                  <span className="text-gray-700"> Event_YYYYMMDD_Session_Speaker_###.jpg</span>
                </div>
              </li>
              <li className="flex items-start">
                <Check className="h-6 w-6 text-purple-600 mr-3 flex-shrink-0 mt-0.5" />
                <div>
                  <strong className="text-gray-900">{language === 'de' ? 'Nutzung:' : 'Usage:'}</strong>
                  <span className="text-gray-700"> {language === 'de' ? 'Unternehmenskommunikation, PR, Social, Web – inkl.' : 'Corporate communications, PR, social, web – included.'}</span>
                </div>
              </li>
              <li className="flex items-start">
                <Users className="h-6 w-6 text-purple-600 mr-3 flex-shrink-0 mt-0.5" />
                <div>
                  <strong className="text-gray-900">{language === 'de' ? 'Dritte:' : 'Third parties:'}</strong>
                  <span className="text-gray-700"> {language === 'de' ? 'Medien/Partner auf Anfrage; wir liefern Pressetexte/Caption-Hilfen' : 'Media/partners on request; we provide press texts/caption assistance'}</span>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Example Shotlist Section */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-8">{language === 'de' ? 'Beispiel-Shotlist (Kurz)' : 'Example Shot List (Brief)'}</h2>
          
          <div className="bg-purple-50 rounded-xl p-8">
            <ul className="grid md:grid-cols-2 gap-4">
              <li className="flex items-start">
                <Check className="h-5 w-5 text-purple-600 mr-3 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700">{language === 'de' ? 'Venue-Außen & Check-in' : 'Venue exterior & check-in'}</span>
              </li>
              <li className="flex items-start">
                <Check className="h-5 w-5 text-purple-600 mr-3 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700">Opening & Keynotes</span>
              </li>
              <li className="flex items-start">
                <Check className="h-5 w-5 text-purple-600 mr-3 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700">{language === 'de' ? 'Publikum, Q&A, Breakouts' : 'Audience, Q&A, breakouts'}</span>
              </li>
              <li className="flex items-start">
                <Check className="h-5 w-5 text-purple-600 mr-3 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700">{language === 'de' ? 'Partner-Booths, Produkt, Demos' : 'Partner booths, product, demos'}</span>
              </li>
              <li className="flex items-start">
                <Check className="h-5 w-5 text-purple-600 mr-3 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700">Networking, Teams, VIPs</span>
              </li>
              <li className="flex items-start">
                <Check className="h-5 w-5 text-purple-600 mr-3 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700">{language === 'de' ? 'Award/Show-Momente' : 'Award/show moments'}</span>
              </li>
              <li className="flex items-start">
                <Check className="h-5 w-5 text-purple-600 mr-3 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700">Closing & „Full Room" Finale</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12">{fromManual('manual.eventfotografie.faqHeading', 'FAQ')}</h2>
          <div className="space-y-6">
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="font-bold text-lg text-gray-900 mb-2">{fromManual('manual.eventfotografie.faqQ1', 'Könnt ihr Same-Day Social liefern?')}</h3>
              <p className="text-gray-600">
                {fromManual('manual.eventfotografie.faqA1', 'Ja. Mit On-Site Auswahlstation oder Runner liefern wir kuratierte JPEGs während des Events.')}
              </p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="font-bold text-lg text-gray-900 mb-2">{fromManual('manual.eventfotografie.faqQ2', 'Brauchen wir eine Bühnenprobe?')}</h3>
              <p className="text-gray-600">
                {fromManual('manual.eventfotografie.faqA2', 'Kurz vor Start 3 Minuten für Lichtcheck – dann sitzt jeder Winkel.')}
              </p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="font-bold text-lg text-gray-900 mb-2">{fromManual('manual.eventfotografie.faqQ3', 'Wie viele Bilder bekommen wir?')}</h3>
              <p className="text-gray-600">
                {fromManual('manual.eventfotografie.faqA3', 'Richtwert: 70–100 pro Stunde je Fotograf:in, abhängig von Agenda und Flächen.')}
              </p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="font-bold text-lg text-gray-900 mb-2">{fromManual('manual.eventfotografie.faqQ4', 'Reicht ein/e Fotograf:in?')}</h3>
              <p className="text-gray-600">
                {fromManual('manual.eventfotografie.faqA4', 'Single-Track oft ja. Bei Parallel-Sessions, großer Venue oder VIP-Fokus empfehlen wir 2. Kamera.')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Why New Age Section */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-8">{language === 'de' ? `Warum ${SITE.name}?` : `Why ${SITE.name}?`}</h2>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-gray-50 rounded-xl p-6 text-center">
              <Star className="h-10 w-10 text-purple-600 mx-auto mb-3" />
              <h3 className="font-semibold mb-2">{language === 'de' ? '12+ Jahre Corporate & Event' : '12+ years of corporate & event experience'}</h3>
            </div>
            <div className="bg-gray-50 rounded-xl p-6 text-center">
              <Clock className="h-10 w-10 text-purple-600 mx-auto mb-3" />
              <h3 className="font-semibold mb-2">{language === 'de' ? 'Schnelle, verlässliche SLAs' : 'Fast, reliable SLAs'}</h3>
            </div>
            <div className="bg-gray-50 rounded-xl p-6 text-center">
              <Camera className="h-10 w-10 text-purple-600 mx-auto mb-3" />
              <h3 className="font-semibold mb-2">{language === 'de' ? 'Saubere Übergabe. Social-first-Denken. Presse-ready.' : 'Clean handover. Social-first thinking. Press-ready.'}</h3>
            </div>
          </div>
        </div>
      </section>

      {/* External Link Section */}
      <section className="py-12 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-600">
            <strong>{language === 'de' ? 'Externer Hinweis:' : 'External tip:'}</strong> {language === 'de' ? 'Für Venue-Planung & Raumauswahl:' : 'For venue planning & room selection:'}{' '}
            <a 
              href="https://www.vienna.convention.at/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-purple-600 hover:text-purple-700 underline"
            >
              Vienna Convention Bureau – Event Locations
            </a>
          </p>
        </div>
      </section>

      {/* Related Services */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-center mb-8">Weitere Business-Services</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <Link
              to="/business-portrait-wien/"
              className="block bg-purple-50 rounded-xl p-6 hover:shadow-lg transition-shadow"
            >
              <Briefcase className="h-10 w-10 text-purple-600 mb-4" />
              <h3 className="font-semibold text-lg mb-2 text-gray-900">Business-Portraits</h3>
              <p className="text-gray-600 text-sm mb-4">
                Professionelle Einzelportraits für LinkedIn, CEO & Personal-Branding
              </p>
              <span className="text-purple-600 font-semibold flex items-center">
                Mehr erfahren <ArrowRight className="ml-1 h-4 w-4" />
              </span>
            </Link>
            <Link
              to="/teamfotos-wien/"
              className="block bg-purple-50 rounded-xl p-6 hover:shadow-lg transition-shadow"
            >
              <Users className="h-10 w-10 text-purple-600 mb-4" />
              <h3 className="font-semibold text-lg mb-2 text-gray-900">Team- & Mitarbeiterfotos</h3>
              <p className="text-gray-600 text-sm mb-4">
                Mobiles Studio vor Ort, einheitlicher Look, schneller Ablauf
              </p>
              <span className="text-purple-600 font-semibold flex items-center">
                Mehr erfahren <ArrowRight className="ml-1 h-4 w-4" />
              </span>
            </Link>
            <Link
              to="/bewerbungsfotos-wien/"
              className="block bg-purple-50 rounded-xl p-6 hover:shadow-lg transition-shadow"
            >
              <Camera className="h-10 w-10 text-purple-600 mb-4" />
              <h3 className="font-semibold text-lg mb-2 text-gray-900">Bewerbungsfotos</h3>
              <p className="text-gray-600 text-sm mb-4">
                LinkedIn-Portraits mit schneller Retusche & Express-Lieferung
              </p>
              <span className="text-purple-600 font-semibold flex items-center">
                Mehr erfahren <ArrowRight className="ml-1 h-4 w-4" />
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
              Weitere Fotografie-Services
            </h2>
            <p className="text-lg text-gray-600">
              Entdecken Sie unsere anderen professionellen Fotografie-Angebote in Wien
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Business Portraits */}
            <Link
              to="/business-portrait-wien/"
              className="bg-gray-50 rounded-lg p-6 hover:shadow-lg transition-shadow group"
            >
              <Briefcase className="h-12 w-12 text-purple-600 mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-purple-600 transition-colors">
                Business Portraits
              </h3>
              <p className="text-gray-600 mb-4">
                Professionelle Headshots und Mitarbeiterfotos für LinkedIn, Website und Geschäftsunterlagen.
              </p>
              <span className="text-purple-600 font-semibold inline-flex items-center">
                Mehr erfahren <ArrowRight className="ml-2 h-4 w-4" />
              </span>
            </Link>

            {/* Product Photography */}
            <Link
              to="/produkt-fotografie-wien/"
              className="bg-gray-50 rounded-lg p-6 hover:shadow-lg transition-shadow group"
            >
              <Camera className="h-12 w-12 text-purple-600 mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-purple-600 transition-colors">
                Produktfotografie
              </h3>
              <p className="text-gray-600 mb-4">
                Hochwertige Produktfotos für E-Commerce, Amazon und Marketing-Materialien.
              </p>
              <span className="text-purple-600 font-semibold inline-flex items-center">
                Mehr erfahren <ArrowRight className="ml-2 h-4 w-4" />
              </span>
            </Link>

            {/* Family Photography */}
            <Link
              to="/familien-fotoshooting-wien/"
              className="bg-gray-50 rounded-lg p-6 hover:shadow-lg transition-shadow group"
            >
              <Users className="h-12 w-12 text-purple-600 mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-purple-600 transition-colors">
                Familienfotografie
              </h3>
              <p className="text-gray-600 mb-4">
                Natürliche Familienporträts im Studio oder Outdoor – besondere Momente festhalten.
              </p>
              <span className="text-purple-600 font-semibold inline-flex items-center">
                Mehr erfahren <ArrowRight className="ml-2 h-4 w-4" />
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-16 bg-gradient-to-r from-gray-900 to-gray-800 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Bereit für professionelle Eventfotografie in Wien?
          </h2>
          <p className="text-xl mb-8 opacity-90">
            Slots sind begrenzt. Sicher dir jetzt deinen Termin für <strong>eventfotograf wien</strong> und erhalte Content, der sofort nutzbar ist.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/warteliste"
              className="inline-flex items-center justify-center px-8 py-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold text-lg"
            >
              Termin auf der Warteliste sichern
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
            <Link
              to="/kontakt"
              className="inline-flex items-center justify-center px-8 py-4 border-2 border-white text-white rounded-lg hover:bg-white/10 transition-colors font-semibold text-lg"
            >
              Projekt anfragen
            </Link>
          </div>
        </div>
      </section>

      <RelatedServices currentPath="/eventfotografie-wien/" />

    </div>
    </Layout>
  );
}
