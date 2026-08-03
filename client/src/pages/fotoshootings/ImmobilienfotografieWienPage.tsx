import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useNavigate } from 'react-router-dom';
import { ContextualLinks } from '../../components/SEO/ContextualLinks';
import { Camera, Check, ArrowRight, Building2, Sparkles, Home } from 'lucide-react';
import Layout from '../../components/layout/Layout';
import { RelatedServices } from '../../components/SEO/RelatedServices';
import GoogleReviews from '../../components/layout/GoogleReviews';
import { useCart } from '../../context/CartContext';
import { useManualPageContent } from '../../hooks/useManualPageContent';
import MarkdownCopySlot from '../../components/MarkdownCopySlot';
import { newageCopyMap } from '../../content/newageCopyMap';
import { useLanguage } from '../../context/LanguageContext';
import { SITE } from '../../config/site';

interface SEOHeadProps {
  title: string;
  description: string;
  keywords: string;
  canonical: string;
  hreflang?: Array<{ lang: string; url: string }>;
}

const SEOHead: React.FC<SEOHeadProps> = ({ title, description, keywords, canonical, hreflang = [] }) => {
  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <link rel="canonical" href={canonical.startsWith("http") ? canonical : `${SITE.url}${canonical}`} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content="website" />
      <meta property="og:url" content={canonical} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      {hreflang.map(({ lang, url }) => (
        <link key={lang} rel="alternate" hrefLang={lang} href={`${SITE.url}${url}`} />
      ))}
      <html lang="de" />
      <meta name="geo.region" content="AT-9" />
      <meta name="geo.placename" content="Wien" />
    </Helmet>
  );
};

const ImmobilienfotografieWienPage: React.FC = () => {
  const navigate = useNavigate();
  const { addItem } = useCart();
  const t = useManualPageContent('immobilienfotografie');
  const { language } = useLanguage();

  // Language-aware fallbacks
  const fallbacks = {
    en: {
      heroTitle: 'Real Estate Photography Vienna – Architecture, Interior, Floor Plans',
      heroSubtitle: 'Space. Light. Perspective.',
      heroDescription: 'Professional real estate photography in Vienna: Window-Pull HDR, vertical correction, 2D/3D floor plans. From €190. For realtors, owners & property managers.',
      primaryCta: 'Book Appointment',
      secondaryCta: 'Packages & Prices',
    },
    de: {
      heroTitle: 'Immobilienfotograf Wien – Architektur, Interieur, Grundrisse',
      heroSubtitle: 'Raum. Licht. Perspektive.',
      heroDescription: 'Professionelle Immobilienfotografie in Wien: Window-Pull HDR, vertikale Korrektur, 2D/3D Grundrisse. Ab €190. Für Makler, Eigentümer & Verwalter.',
      primaryCta: 'Termin buchen',
      secondaryCta: 'Pakete & Preise',
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

  const heroTitle = fromManual('manual.immobilienfotografie.heroTitle', fb.heroTitle);
  const heroSubtitle = fromManual('manual.immobilienfotografie.heroTagline', fb.heroSubtitle);
  const heroDescription = fromManual('manual.immobilienfotografie.heroDescription', fb.heroDescription);
  const primaryCta = fromManual('manual.immobilienfotografie.primaryCta', fb.primaryCta);
  const secondaryCta = fromManual('manual.immobilienfotografie.secondaryCta', fb.secondaryCta);
  const heroImage1 = fromManual('manual.immobilienfotografie.heroImage1', '');
  const heroImage2 = fromManual('manual.immobilienfotografie.heroImage2', '');
  const heroImage3 = fromManual('manual.immobilienfotografie.heroImage3', '');
  const heroImage4 = fromManual('manual.immobilienfotografie.heroImage4', '');
  const heroImage5 = fromManual('manual.immobilienfotografie.heroImage5', '');

  const handleBookPackage = (packageName: string, price: number, description: string) => {
    addItem({
      title: packageName,
      price: price,
      quantity: 1,
      packageType: 'Immobilien',
      type: 'voucher'
    });
    navigate('/cart');
  };

  return (
    <Layout>
    <div className="min-h-screen bg-gray-50">
      <SEOHead
        title={newageCopyMap['immobilien-fotografie-wien'].title}
        description={newageCopyMap['immobilien-fotografie-wien'].metaDescription}
        keywords="immobilienfotograf wien, architektur fotografie wien, interieur fotografie, grundrisse, real estate fotograf, immobilienfoto, makler fotografie wien"
        canonical="/immobilien-fotografie-wien/"
        hreflang={[
          { lang: 'de', url: '/immobilien-fotografie-wien/' },
          { lang: 'en', url: '/en/real-estate-photography-vienna/' }
        ]}
      />

      <Helmet>
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Service",
            "serviceType": "Real Estate Photography",
            "provider": {
              "@type": "Organization",
              "name": SITE.name,
              "address": {
                "@type": "PostalAddress",
                "addressLocality": "Wien",
                "addressCountry": "AT"
              }
            },
            "areaServed": {
              "@type": "City",
              "name": "Wien"
            },
            "offers": {
              "@type": "AggregateOffer",
              "priceCurrency": "EUR",
              "lowPrice": "190",
              "highPrice": "420"
            }
          })}
        </script>
      </Helmet>

      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 text-white pt-24 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Left: Text Content */}
            <div>
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 mb-6">
                <Building2 className="w-4 h-4" />
                <span className="text-sm font-medium">{language === 'de' ? 'Immobilienfotograf Wien' : 'Real Estate Photographer Vienna'}</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
                {heroTitle}
              </h1>
              {heroSubtitle && (
                <p className="text-xl text-blue-200 mb-4 font-semibold">{heroSubtitle}</p>
              )}
              <p className="text-lg text-blue-100 mb-8 leading-relaxed">
                {heroDescription}
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  to="/warteliste/"
                  className="inline-flex items-center justify-center gap-2 bg-blue-500 text-white px-8 py-4 rounded-lg font-semibold hover:bg-blue-600 transition-all transform hover:scale-105"
                >
                  {primaryCta}
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <a
                  href="#pakete"
                  className="inline-flex items-center justify-center gap-2 bg-white/10 backdrop-blur-sm text-white px-8 py-4 rounded-lg font-semibold hover:bg-white/20 transition-all border border-white/20"
                >
                  {secondaryCta}
                </a>
              </div>
            </div>

            {/* Right: Hero Image */}
            <div className="flex items-center justify-center">
              {heroImage1 && (
                <img
                  src={heroImage1}
                  alt="Immobilienfotograf Wien – Luxusapartment"
                  className="rounded-2xl shadow-2xl w-full h-auto object-contain"
                  loading="eager"
                />
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Google Reviews */}
      <GoogleReviews />

      <ContextualLinks pathname="/immobilien-fotografie-wien/" language={language} />

      {/* Leistungen */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {language === 'de' ? 'Was wir perfekt können' : 'What We Do Perfectly'}
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              {language === 'de' ? 'Professionelle Immobilienfotografie mit Technik und Inszenierung, die Objekte optimal verkauft.' : 'Professional real estate photography with technology and staging that sells properties optimally.'}
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-gradient-to-br from-blue-50 to-white p-6 rounded-xl border border-blue-100">
              <Building2 className="w-12 h-12 text-blue-600 mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-3">{language === 'de' ? 'Architektur & Interieur' : 'Architecture & Interior'}</h3>
              <p className="text-gray-600 leading-relaxed">
                {language === 'de' ? 'Außenaufnahmen, Räume, Details – mit vertikaler Korrektur (tilt-shift), damit Linien parallel bleiben und professionell wirken.' : 'Exterior shots, rooms, details – with vertical correction (tilt-shift) to keep lines parallel and professional.'}
              </p>
            </div>
            <div className="bg-gradient-to-br from-amber-50 to-white p-6 rounded-xl border border-amber-100">
              <Sparkles className="w-12 h-12 text-amber-600 mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-3">Window-Pull HDR</h3>
              <p className="text-gray-600 leading-relaxed">
                {language === 'de' ? 'Fenster und Innenraum perfekt belichtet – kein Ausbrennen, keine dunklen Ecken. Mehrere Belichtungen verschmolzen zu einem natürlichen Bild.' : 'Windows and interiors perfectly exposed – no blow-outs, no dark corners. Multiple exposures merged into one natural image.'}
              </p>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-white p-6 rounded-xl border border-purple-100">
              <Camera className="w-12 h-12 text-purple-600 mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-3">Styling Light</h3>
              <p className="text-gray-600 leading-relaxed">
                {language === 'de' ? 'Wir setzen bei Bedarf zusätzliche Lichtakzente, damit Räume warm und einladend wirken – kein kaltes Klinik-Feeling.' : 'We add supplemental lighting accents as needed so rooms feel warm and inviting – no cold clinical look.'}
              </p>
            </div>
            <div className="bg-gradient-to-br from-indigo-50 to-white p-6 rounded-xl border border-indigo-100">
              <Home className="w-12 h-12 text-indigo-600 mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-3">Twilight & Exteriors</h3>
              <p className="text-gray-600 leading-relaxed">
                {language === 'de' ? 'Aufnahmen zur blauen Stunde – Gebäude mit beleuchteten Fenstern, dramatischer Himmel. Oft die Highlights im Exposé.' : 'Blue hour shots – buildings with illuminated windows, dramatic sky. Often the highlights of any listing.'}
              </p>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-white p-6 rounded-xl border border-green-100">
              <Building2 className="w-12 h-12 text-green-600 mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-3">{language === 'de' ? 'Grundrisse (2D/3D)' : 'Floor Plans (2D/3D)'}</h3>
              <p className="text-gray-600 leading-relaxed">
                {language === 'de' ? '2D Grundrisse nach RICS/IPMS oder 3D-Visualisierung mit Möblierung – für Online-Portale und Exposés unverzichtbar.' : '2D floor plans per RICS/IPMS or 3D visualization with furnishing – indispensable for online portals and listings.'}
              </p>
            </div>
            <div className="bg-gradient-to-br from-rose-50 to-white p-6 rounded-xl border border-rose-100">
              <Check className="w-12 h-12 text-rose-600 mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-3">{language === 'de' ? 'Lieferformate' : 'Delivery Formats'}</h3>
              <p className="text-gray-600 leading-relaxed">
                {language === 'de' ? 'Optimiert für willhaben.at, immobilienscout24.at, Makler-Exposé PDF, Print und Social Media – sofort einsatzbereit.' : 'Optimized for willhaben.at, immobilienscout24.at, real estate listing PDFs, print and social media – ready to use immediately.'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Image 2 */}
      {heroImage2 && (
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <img
              src={heroImage2}
              alt="Immobilienfotografie Wien – Professional Interior"
              className="w-full h-auto rounded-2xl shadow-2xl object-cover"
              loading="lazy"
            />
          </div>
        </section>
      )}

      {/* Sets & Technik Table */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {language === 'de' ? 'Sets & Technik' : 'Sets & Technology'}
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              {language === 'de' ? 'Welche Technik wir einsetzen, damit Ihr Objekt bestmöglich wirkt.' : 'The technology we use to showcase your property at its best.'}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-slate-700 to-slate-600 text-white">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold">{language === 'de' ? 'Technik' : 'Technique'}</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">{language === 'de' ? 'Zweck' : 'Purpose'}</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">{language === 'de' ? 'Einsatz' : 'Use Case'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  <tr className="hover:bg-blue-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">{language === 'de' ? 'Vertikale Korrektur (Tilt-Shift)' : 'Vertical Correction (Tilt-Shift)'}</td>
                    <td className="px-6 py-4 text-gray-600">{language === 'de' ? 'Linien gerade, Räume nicht verzerrt' : 'Straight lines, no room distortion'}</td>
                    <td className="px-6 py-4 text-gray-600">{language === 'de' ? 'Architektur, Innenräume' : 'Architecture, interiors'}</td>
                  </tr>
                  <tr className="hover:bg-blue-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">Window-Pull HDR</td>
                    <td className="px-6 py-4 text-gray-600">{language === 'de' ? 'Fenster nicht überbelichtet, Raum hell' : 'Windows not overexposed, room bright'}</td>
                    <td className="px-6 py-4 text-gray-600">{language === 'de' ? 'Alle Innenräume mit Fenstern' : 'All interior rooms with windows'}</td>
                  </tr>
                  <tr className="hover:bg-blue-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">{language === 'de' ? 'Farbtreue & Weißabgleich' : 'Color Fidelity & White Balance'}</td>
                    <td className="px-6 py-4 text-gray-600">{language === 'de' ? 'Natürliche Farben, keine Gelb-/Blaustiche' : 'Natural colors, no yellow/blue color casts'}</td>
                    <td className="px-6 py-4 text-gray-600">Standard</td>
                  </tr>
                  <tr className="hover:bg-blue-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">{language === 'de' ? 'De-Clutter Retusche' : 'De-Clutter Retouching'}</td>
                    <td className="px-6 py-4 text-gray-600">{language === 'de' ? 'Störende Objekte entfernen (diskret)' : 'Remove distracting objects (discreetly)'}</td>
                    <td className="px-6 py-4 text-gray-600">{language === 'de' ? 'Optional bei bewohnten Objekten' : 'Optional for occupied properties'}</td>
                  </tr>
                  <tr className="hover:bg-blue-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">Detailshots</td>
                    <td className="px-6 py-4 text-gray-600">{language === 'de' ? 'Besonderheiten betonen (Armaturen, Parkett)' : 'Highlight features (fixtures, parquet)'}</td>
                    <td className="px-6 py-4 text-gray-600">{language === 'de' ? 'Premium-Objekte' : 'Premium properties'}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* Extended Content Section - Safe Copy Slot */}
      {language === 'de' && <MarkdownCopySlot content={newageCopyMap['immobilien-fotografie-wien'].markdown} />}

      {/* Pakete */}
      <section id="pakete" className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {language === 'de' ? 'Pakete & Preise' : 'Packages & Pricing'}
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              {language === 'de' ? 'Fixpreise nach Objektgröße – transparent und planbar.' : 'Fixed prices by property size – transparent and predictable.'}
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            {/* Immobilien Basic */}
            <div className="bg-white rounded-2xl shadow-lg p-8 hover:shadow-xl transition-shadow border border-blue-200">
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{language === 'de' ? 'Immobilien Basic' : 'Real Estate Basic'}</h3>
                <p className="text-gray-600">{language === 'de' ? 'Kleine Wohnungen & Studios' : 'Small apartments & studios'}</p>
              </div>
              <div className="mb-6">
                <div className="flex items-baseline">
                  <span className="text-sm text-gray-500 mr-1">{language === 'de' ? 'Ab' : 'From'}</span>
                  <span className="text-4xl font-bold text-blue-600">€249</span>
                </div>
              </div>
              <div className="space-y-4 mb-8">
                <div className="flex items-start">
                  <Check className="h-5 w-5 text-blue-500 mr-3 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">{language === 'de' ? 'Inkl. alle Bilder als Datei' : 'Incl. all images as files'}</span>
                </div>
                <div className="flex items-start">
                  <Check className="h-5 w-5 text-blue-500 mr-3 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">{language === 'de' ? 'Gültig bis 2 Jahre' : 'Valid for up to 2 years'}</span>
                </div>
              </div>
              <Link
                to="/warteliste"
                className="block w-full text-center px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-semibold"
              >
                {language === 'de' ? 'Jetzt sichern' : 'Secure Now'}
              </Link>
            </div>

            {/* Immobilien Premium - BELIEBT */}
            <div className="bg-gradient-to-br from-blue-600 to-blue-800 text-white rounded-2xl shadow-2xl p-8 relative">
              <div className="absolute top-0 right-0 bg-yellow-400 text-gray-900 text-sm font-bold px-4 py-2 rounded-bl-lg rounded-tr-2xl">
                {language === 'de' ? 'BELIEBT' : 'POPULAR'}
              </div>
              <div className="mb-6 mt-4">
                <h3 className="text-2xl font-bold mb-2">{language === 'de' ? 'Immobilien Premium' : 'Real Estate Premium'}</h3>
                <p className="text-blue-200">{language === 'de' ? 'Wohnungen & Häuser' : 'Apartments & houses'}</p>
              </div>
              <div className="mb-6">
                <div className="flex items-baseline">
                  <span className="text-sm text-blue-200 mr-1">{language === 'de' ? 'Ab' : 'From'}</span>
                  <span className="text-4xl font-bold">€449</span>
                </div>
              </div>
              <div className="space-y-4 mb-8">
                <div className="flex items-start">
                  <Check className="h-5 w-5 text-yellow-300 mr-3 flex-shrink-0 mt-0.5" />
                  <span>{language === 'de' ? 'Alle Bilder als Datei in Vollauflösung' : 'All images as full-resolution files'}</span>
                </div>
                <div className="flex items-start">
                  <Check className="h-5 w-5 text-yellow-300 mr-3 flex-shrink-0 mt-0.5" />
                  <span>{language === 'de' ? 'Interaktiver Video-Rundgang' : 'Interactive video walkthrough'}</span>
                </div>
                <div className="flex items-start">
                  <Check className="h-5 w-5 text-yellow-300 mr-3 flex-shrink-0 mt-0.5" />
                  <span>{language === 'de' ? 'Professionell gezeichneter Grundriss' : 'Professionally drawn floor plan'}</span>
                </div>
                <div className="flex items-start">
                  <Check className="h-5 w-5 text-yellow-300 mr-3 flex-shrink-0 mt-0.5" />
                  <span>{language === 'de' ? 'Gültig bis 2 Jahre' : 'Valid for up to 2 years'}</span>
                </div>
              </div>
              <Link
                to="/warteliste"
                className="block w-full text-center px-6 py-3 bg-white text-blue-600 rounded-lg hover:bg-gray-100 transition-colors font-semibold"
              >
                {language === 'de' ? 'Jetzt sichern' : 'Secure Now'}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Image 3 */}
      {heroImage3 && (
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <img
              src={heroImage3}
              alt="Immobilienfotografie Wien – Professional Space"
              className="w-full h-auto rounded-2xl shadow-2xl object-cover"
              loading="lazy"
            />
          </div>
        </section>
      )}

      {/* Ablauf & SLAs */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {language === 'de' ? 'Ablauf & Service Level' : 'Process & Service Level'}
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              {language === 'de' ? 'So läuft Ihr Immobilien-Shooting ab – mit klaren Zeitangaben.' : 'How your real estate shoot works – with clear timelines.'}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-slate-700 to-slate-600 text-white">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold">{language === 'de' ? 'Phase' : 'Phase'}</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">{language === 'de' ? 'Beschreibung' : 'Description'}</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">{language === 'de' ? 'Zeit' : 'Time'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  <tr className="hover:bg-blue-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">{language === 'de' ? 'Terminanfrage' : 'Appointment Request'}</td>
                    <td className="px-6 py-4 text-gray-600">{language === 'de' ? 'Paket auswählen, Objekt-Infos & Wunschtermin mitteilen' : 'Select package, share property info & preferred date'}</td>
                    <td className="px-6 py-4 text-gray-600">{language === 'de' ? '1 Tag' : '1 day'}</td>
                  </tr>
                  <tr className="hover:bg-blue-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">{language === 'de' ? 'Terminbestätigung' : 'Confirmation'}</td>
                    <td className="px-6 py-4 text-gray-600">{language === 'de' ? 'Fixtermin + Briefing (Vorbereitung, Zugang, Styling)' : 'Fixed date + briefing (preparation, access, styling)'}</td>
                    <td className="px-6 py-4 text-gray-600">{language === 'de' ? 'binnen 24h' : 'within 24h'}</td>
                  </tr>
                  <tr className="hover:bg-blue-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">{language === 'de' ? 'Shooting vor Ort' : 'On-Site Shooting'}</td>
                    <td className="px-6 py-4 text-gray-600">{language === 'de' ? 'Aufnahmen + bei Bedarf Licht-Styling. Dauer je nach Paket.' : 'Photos + light styling if needed. Duration depends on package.'}</td>
                    <td className="px-6 py-4 text-gray-600">{language === 'de' ? '1-3h' : '1-3h'}</td>
                  </tr>
                  <tr className="hover:bg-blue-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">{language === 'de' ? 'Bearbeitung & QS' : 'Editing & QA'}</td>
                    <td className="px-6 py-4 text-gray-600">{language === 'de' ? 'HDR-Merge, Retusche, Farbkorrektur, Export in alle Formate' : 'HDR merge, retouching, color correction, export to all formats'}</td>
                    <td className="px-6 py-4 text-gray-600">{language === 'de' ? '4-7 Werktage' : '4-7 business days'}</td>
                  </tr>
                  <tr className="hover:bg-blue-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">{language === 'de' ? 'Lieferung' : 'Delivery'}</td>
                    <td className="px-6 py-4 text-gray-600">{language === 'de' ? 'Download-Link per E-Mail, Bilder Web-optimiert & Print-ready' : 'Download link via email, images web-optimized & print-ready'}</td>
                    <td className="px-6 py-4 text-gray-600">{language === 'de' ? 'sofort' : 'immediately'}</td>
                  </tr>
                  <tr className="hover:bg-blue-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">{language === 'de' ? 'Support & Nachbestellungen' : 'Support & Reorders'}</td>
                    <td className="px-6 py-4 text-gray-600">{language === 'de' ? 'Grundrisse, Drohne, Video jederzeit nachbuchbar' : 'Floor plans, drone, video can be added anytime'}</td>
                    <td className="px-6 py-4 text-gray-600">{language === 'de' ? 'flexibel' : 'flexible'}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Image 4 */}
      {heroImage4 && (
        <section className="py-16 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <img
              src={heroImage4}
              alt="Immobilienfotografie Wien – Architecture Detail"
              className="w-full h-auto rounded-2xl shadow-2xl object-cover"
              loading="lazy"
            />
          </div>
        </section>
      )}

      {/* Lieferformate & Exporte */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {language === 'de' ? 'Lieferformate & Exporte' : 'Delivery Formats & Exports'}
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              {language === 'de' ? 'Alle Bilder kommen in den richtigen Formaten – für jeden Kanal sofort einsetzbar.' : 'All images come in the right formats – ready to use immediately for every channel.'}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-blue-600 to-blue-500 text-white">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold">{language === 'de' ? 'Kanal' : 'Channel'}</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">{language === 'de' ? 'Format / Specs' : 'Format / Specs'}</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">{language === 'de' ? 'Hinweise' : 'Notes'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  <tr className="hover:bg-blue-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">{language === 'de' ? 'Online-Portale' : 'Online Portals'}<br /><span className="text-sm text-gray-600">(willhaben, immobilienscout24)</span></td>
                    <td className="px-6 py-4 text-gray-600">{language === 'de' ? 'JPEG 2000px Breite, sRGB, 72 dpi, ~500-800 KB' : 'JPEG 2000px width, sRGB, 72 dpi, ~500-800 KB'}</td>
                    <td className="px-6 py-4 text-gray-600">{language === 'de' ? 'Web-optimiert, schnelle Ladezeiten' : 'Web-optimized, fast loading times'}</td>
                  </tr>
                  <tr className="hover:bg-blue-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">{language === 'de' ? 'Makler-Exposé PDF' : 'Real Estate Listing PDF'}</td>
                    <td className="px-6 py-4 text-gray-600">JPEG 3000px, sRGB, 150 dpi, ~1-2 MB</td>
                    <td className="px-6 py-4 text-gray-600">{language === 'de' ? 'Hochauflösend für Print & Digital-Exposé' : 'High-resolution for print & digital listings'}</td>
                  </tr>
                  <tr className="hover:bg-blue-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">{language === 'de' ? 'Print / Anzeige' : 'Print / Ads'}</td>
                    <td className="px-6 py-4 text-gray-600">JPEG 4000-5000px, Adobe RGB, 300 dpi, ~3-5 MB</td>
                    <td className="px-6 py-4 text-gray-600">{language === 'de' ? 'Magazin, Flyer, Plakat' : 'Magazine, flyer, poster'}</td>
                  </tr>
                  <tr className="hover:bg-blue-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">Social / Reels</td>
                    <td className="px-6 py-4 text-gray-600">JPEG 1920x1080 (16:9), 1080x1080 (1:1), sRGB</td>
                    <td className="px-6 py-4 text-gray-600">Instagram, Facebook, LinkedIn</td>
                  </tr>
                  <tr className="hover:bg-blue-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">{language === 'de' ? 'Grundrisse' : 'Floor Plans'}<br /><span className="text-sm text-gray-600">(2D / 3D Add-on)</span></td>
                    <td className="px-6 py-4 text-gray-600">{language === 'de' ? 'PDF + PNG, A4/A3, skalierbar, mit Maßangaben' : 'PDF + PNG, A4/A3, scalable, with dimensions'}</td>
                    <td className="px-6 py-4 text-gray-600">{language === 'de' ? 'RICS/IPMS Standard, druckbar & web-ready' : 'RICS/IPMS standard, printable & web-ready'}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <p className="text-gray-700 leading-relaxed">
              <strong>{language === 'de' ? 'Hinweis:' : 'Note:'}</strong> {language === 'de' ? 'Alle Bilder werden nach' : 'All images are edited according to'} <a href="https://www.rics.org/profession-standards/rics-standards-and-guidance/sector-standards/land-standards/ipms" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-semibold">{language === 'de' ? 'RICS/IPMS-Standards' : 'RICS/IPMS standards'}</a> {language === 'de' ? 'für Immobilienfotografie bearbeitet – natürliche Farben, keine Überbearbeitung, optimal für professionelle Vermarktung.' : 'for real estate photography – natural colors, no over-editing, optimal for professional marketing.'}
            </p>
          </div>
        </div>
      </section>

      {/* Vorbereitung für Eigentümer/Verwalter */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {language === 'de' ? 'Vorbereitung für Eigentümer & Verwalter' : 'Preparation for Owners & Property Managers'}
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              {language === 'de' ? 'Damit Ihr Objekt optimal zur Geltung kommt – unsere Checkliste für den Shooting-Tag.' : 'So your property looks its best – our checklist for the shooting day.'}
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-200">
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Check className="w-6 h-6 text-green-600" />
                {language === 'de' ? 'Aufräumen & De-Clutter' : 'Tidy Up & De-Clutter'}
              </h3>
              <ul className="space-y-2 text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold mt-1">•</span>
                  <span>{language === 'de' ? 'Persönliche Gegenstände (Fotos, Post) entfernen' : 'Remove personal items (photos, mail)'}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold mt-1">•</span>
                  <span>{language === 'de' ? 'Arbeitsflächen & Tische frei, sauber, minimalistisch' : 'Countertops & tables clear, clean, minimalistic'}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold mt-1">•</span>
                  <span>{language === 'de' ? 'Kabel, Steckdosen, Müll nicht sichtbar' : 'Cables, outlets, trash not visible'}</span>
                </li>
              </ul>
            </div>
            <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-200">
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Check className="w-6 h-6 text-green-600" />
                {language === 'de' ? 'Licht & Atmosphäre' : 'Light & Atmosphere'}
              </h3>
              <ul className="space-y-2 text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold mt-1">•</span>
                  <span>{language === 'de' ? 'Alle Lampen funktionsfähig, warmes Licht bevorzugt' : 'All lamps working, warm light preferred'}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold mt-1">•</span>
                  <span>{language === 'de' ? 'Fenster putzen, Vorhänge offen oder dekorativ' : 'Clean windows, curtains open or decorative'}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold mt-1">•</span>
                  <span>{language === 'de' ? 'Bei bewölktem Wetter kein Problem – wir bringen Licht mit' : 'Cloudy weather is no problem – we bring our own lights'}</span>
                </li>
              </ul>
            </div>
            <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-200">
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Check className="w-6 h-6 text-green-600" />
                {language === 'de' ? 'Details & Styling' : 'Details & Styling'}
              </h3>
              <ul className="space-y-2 text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold mt-1">•</span>
                  <span>{language === 'de' ? 'Kissen, Deko, Pflanzen dekorativ arrangieren' : 'Arrange cushions, decor, plants decoratively'}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold mt-1">•</span>
                  <span>{language === 'de' ? 'Bad & Küche sauber, Handtücher frisch, Geschirr weg' : 'Bathroom & kitchen clean, fresh towels, dishes away'}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold mt-1">•</span>
                  <span>{language === 'de' ? 'Außenbereich: Terrasse/Balkon gefegt, Garten gepflegt' : 'Outdoor area: terrace/balcony swept, garden maintained'}</span>
                </li>
              </ul>
            </div>
            <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-200">
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Check className="w-6 h-6 text-green-600" />
                {language === 'de' ? 'Zugang & Timing' : 'Access & Timing'}
              </h3>
              <ul className="space-y-2 text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold mt-1">•</span>
                  <span>{language === 'de' ? 'Schlüsselübergabe oder Anwesenheit klären' : 'Arrange key handover or presence'}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold mt-1">•</span>
                  <span>{language === 'de' ? 'Shooting-Dauer: 1-3h je nach Paket' : 'Shooting duration: 1-3h depending on package'}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold mt-1">•</span>
                  <span>{language === 'de' ? 'Tageszeit: Vormittag/Mittag optimal, Twilight ab Dämmerung' : 'Time of day: morning/noon optimal, twilight from dusk'}</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Image 5 */}
      {heroImage5 && (
        <section className="py-16 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <img
              src={heroImage5}
              alt="Immobilienfotografie Wien – Luxury Property"
              className="w-full h-auto rounded-2xl shadow-2xl object-cover"
              loading="lazy"
            />
          </div>
        </section>
      )}

      {/* FAQ */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {fromManual('manual.immobilienfotografie.faqHeading', language === 'de' ? 'Häufige Fragen' : 'Frequently Asked Questions')}
            </h2>
          </div>
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-blue-50 to-white p-6 rounded-xl border border-blue-100">
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                {fromManual('manual.immobilienfotografie.faqQ1', language === 'de' ? 'Ist ein bewohntes Objekt ein Problem?' : 'Is an occupied property a problem?')}
              </h3>
              <p className="text-gray-700 leading-relaxed">
                {fromManual('manual.immobilienfotografie.faqA1', language === 'de' ? 'Nein – wir fotografieren auch bewohnte Wohnungen. Wichtig ist nur, dass aufgeräumt & sauber ist. Kleine störende Details können wir per De-Clutter Retusche entfernen (optional, gegen Aufpreis).' : 'No – we also photograph occupied apartments. The important thing is that it\'s tidy & clean. Small distracting details can be removed via de-clutter retouching (optional, extra charge).')}
              </p>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-white p-6 rounded-xl border border-blue-100">
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                {fromManual('manual.immobilienfotografie.faqQ2', language === 'de' ? 'Brauche ich einen Grundriss?' : 'Do I need a floor plan?')}
              </h3>
              <p className="text-gray-700 leading-relaxed">
                {fromManual('manual.immobilienfotografie.faqA2', language === 'de' ? 'Für Online-Portale & Exposés sehr empfohlen. 2D-Grundrisse (€60) sind Standard nach RICS/IPMS, 3D-Grundrisse (€120) visualisieren zusätzlich die Raumaufteilung mit Möblierung – ideal für leerstehende Objekte.' : 'Highly recommended for online portals & listings. 2D floor plans (€60) follow RICS/IPMS standards, 3D floor plans (€120) additionally visualize room layout with furnishing – ideal for vacant properties.')}
              </p>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-white p-6 rounded-xl border border-blue-100">
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                {fromManual('manual.immobilienfotografie.faqQ3', language === 'de' ? 'Was ist Window-Pull HDR?' : 'What is Window-Pull HDR?')}
              </h3>
              <p className="text-gray-700 leading-relaxed">
                {fromManual('manual.immobilienfotografie.faqA3', language === 'de' ? 'Mehrere Belichtungen (hell, mittel, dunkel) werden zu einem Bild verschmolzen – Fenster zeigen die Aussicht statt weißer Flächen, Raum bleibt trotzdem hell & freundlich. Standard bei allen Immobilien-Shootings.' : 'Multiple exposures (bright, medium, dark) are merged into one image – windows show the view instead of white areas, while the room stays bright & friendly. Standard for all real estate shoots.')}
              </p>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-white p-6 rounded-xl border border-blue-100">
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                {fromManual('manual.immobilienfotografie.faqQ4', language === 'de' ? 'Wie schnell kann ich einen Termin bekommen?' : 'How quickly can I get an appointment?')}
              </h3>
              <p className="text-gray-700 leading-relaxed">
                {fromManual('manual.immobilienfotografie.faqA4', language === 'de' ? 'Meist binnen 3-5 Werktagen. Für eilige Vermarktungen (z.B. vor Open House) können wir Express-Shootings organisieren – bitte bei Anfrage angeben. Lieferung bleibt dann bei 4-7 Werktagen (auf Anfrage auch schneller).' : 'Usually within 3-5 business days. For urgent listings (e.g. before an open house) we can arrange express shoots – please specify when requesting. Delivery remains 4-7 business days (faster on request).')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Ähnliche Services */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {language === 'de' ? 'Ähnliche Services' : 'Similar Services'}
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              {language === 'de' ? 'Weitere professionelle Fotografie-Dienstleistungen für Ihr Business.' : 'More professional photography services for your business.'}
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <Link
              to="/business-portrait-wien/"
              className="bg-white p-8 rounded-xl shadow-lg border border-gray-200 hover:border-blue-300 hover:shadow-xl transition-all group"
            >
              <Camera className="w-12 h-12 text-blue-600 mb-4 group-hover:scale-110 transition-transform" />
              <h3 className="text-xl font-bold text-gray-900 mb-3">Business-Portraits</h3>
              <p className="text-gray-600 leading-relaxed mb-4">
                {language === 'de' ? 'Professionelle Portraits für Makler, Verwalter, Teams – ideal für Website und Exposés.' : 'Professional portraits for realtors, managers, teams – ideal for websites and listings.'}
              </p>
              <span className="text-blue-600 font-semibold inline-flex items-center gap-2 group-hover:gap-3 transition-all">
                {language === 'de' ? 'Mehr erfahren' : 'Learn more'}
                <ArrowRight className="w-4 h-4" />
              </span>
            </Link>
            <Link
              to="/produkt-fotografie-wien/"
              className="bg-white p-8 rounded-xl shadow-lg border border-gray-200 hover:border-blue-300 hover:shadow-xl transition-all group"
            >
              <Building2 className="w-12 h-12 text-blue-600 mb-4 group-hover:scale-110 transition-transform" />
              <h3 className="text-xl font-bold text-gray-900 mb-3">{language === 'de' ? 'Produktfotografie' : 'Product Photography'}</h3>
              <p className="text-gray-600 leading-relaxed mb-4">
                {language === 'de' ? 'E-Commerce Freisteller & Lifestyle-Sets für Inneneinrichtung, Möbel, Deko-Artikel.' : 'E-commerce cutouts & lifestyle sets for interior design, furniture, decorative items.'}
              </p>
              <span className="text-blue-600 font-semibold inline-flex items-center gap-2 group-hover:gap-3 transition-all">
                {language === 'de' ? 'Mehr erfahren' : 'Learn more'}
                <ArrowRight className="w-4 h-4" />
              </span>
            </Link>
            <Link
              to="/eventfotografie-wien/"
              className="bg-white p-8 rounded-xl shadow-lg border border-gray-200 hover:border-blue-300 hover:shadow-xl transition-all group"
            >
              <Sparkles className="w-12 h-12 text-blue-600 mb-4 group-hover:scale-110 transition-transform" />
              <h3 className="text-xl font-bold text-gray-900 mb-3">{language === 'de' ? 'Eventfotografie' : 'Event Photography'}</h3>
              <p className="text-gray-600 leading-relaxed mb-4">
                {language === 'de' ? 'Open House, Firmenfeiern, Eröffnungen – Ihre Events professionell dokumentiert.' : 'Open houses, corporate parties, openings – your events professionally documented.'}
              </p>
              <span className="text-blue-600 font-semibold inline-flex items-center gap-2 group-hover:gap-3 transition-all">
                {language === 'de' ? 'Mehr erfahren' : 'Learn more'}
                <ArrowRight className="w-4 h-4" />
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            {language === 'de' ? 'Ihr Objekt verdient professionelle Bilder' : 'Your Property Deserves Professional Images'}
          </h2>
          <p className="text-xl text-blue-100 mb-8 leading-relaxed">
            {language === 'de' ? 'Wir machen Immobilien in Wien mit HDR, Korrektur & Grundrissen verkaufsstark. Fixpreise, klare SLAs, schnelle Lieferung.' : 'We make properties in Vienna sales-ready with HDR, correction & floor plans. Fixed prices, clear SLAs, fast delivery.'}
          </p>
          <Link
            to="/warteliste/"
            className="inline-flex items-center justify-center gap-2 bg-white text-blue-900 px-10 py-5 rounded-lg font-bold text-lg hover:bg-blue-50 transition-all transform hover:scale-105 shadow-xl"
          >
            {language === 'de' ? 'Jetzt Termin anfragen' : 'Request an Appointment Now'}
            <ArrowRight className="w-6 h-6" />
          </Link>
        </div>
      </section>

      <RelatedServices currentPath="/immobilien-fotografie-wien/" />
    </div>
    </Layout>
  );
};

export default ImmobilienfotografieWienPage;
