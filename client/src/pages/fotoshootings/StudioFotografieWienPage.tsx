import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { Camera, Check, ArrowRight, Lightbulb, Users, Sparkles } from 'lucide-react';
import Layout from '../../components/layout/Layout';
import { RelatedServices } from '../../components/SEO/RelatedServices';
import GoogleReviews from '../../components/layout/GoogleReviews';
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

const StudioFotografieWienPage: React.FC = () => {
  const t = useManualPageContent('studiofotografie');
  const { language } = useLanguage();

  // Language-aware fallbacks
  const fallbacks = {
    en: {
      heroTitle: 'Professional Studio Photography',
      heroSubtitle: 'precise & plannable',
      heroDescription: 'Studio Photography Vienna: Defined sets, backdrops & modifiers. Headshots, portraits, teams & products. From €150. Book your appointment now.',
      primaryCta: 'Book Appointment Now',
      secondaryCta: 'View Studio Packages',
    },
    de: {
      heroTitle: 'Professionelle Studio-Fotografie',
      heroSubtitle: 'präzise & planbar',
      heroDescription: 'Studio Fotografie Wien: Definierte Sets, Backdrops & Modifiers. Headshots, Portraits, Teams & Produkte. Ab €150. Jetzt Termin sichern.',
      primaryCta: 'Jetzt Termin buchen',
      secondaryCta: 'Studio-Pakete ansehen',
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

  const heroTitle = fromManual('manual.studiofotografie.heroTitle', fb.heroTitle);
  const heroSubtitle = fromManual('manual.studiofotografie.heroTagline', fb.heroSubtitle);
  const heroDescription = fromManual('manual.studiofotografie.heroDescription', fb.heroDescription);
  const primaryCta = fromManual('manual.studiofotografie.primaryCta', fb.primaryCta);
  const secondaryCta = fromManual('manual.studiofotografie.secondaryCta', fb.secondaryCta);
  const heroImage1 = fromManual('manual.studiofotografie.heroImage1', '');
  const heroImage2 = fromManual('manual.studiofotografie.heroImage2', '');
  const heroImage3 = fromManual('manual.studiofotografie.heroImage3', '');
  const heroImage4 = fromManual('manual.studiofotografie.heroImage4', '');
  const heroImage5 = fromManual('manual.studiofotografie.heroImage5', '');

  return (
    <Layout>
    <div className="min-h-screen bg-gray-50">
      <SEOHead
        title={newageCopyMap['studio-fotografie-wien'].title}
        description={newageCopyMap['studio-fotografie-wien'].metaDescription}
        keywords="studio fotografie wien, fotostudio wien, portrait studio, headshot fotografie wien, studiofotografie, studio shooting wien"
        canonical="/studio-fotografie-wien/"
        hreflang={[
          { lang: 'de', url: '/studio-fotografie-wien/' },
          { lang: 'en', url: '/en/studio-photography-vienna/' }
        ]}
      />

      <Helmet>
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Service",
            "serviceType": "Photography",
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
            "hasOfferCatalog": {
              "@type": "OfferCatalog",
              "name": "Studio Pakete",
              "itemListElement": [
                { "@type": "Offer", "name": "Studio-Fotografie Basic", "price": "149", "priceCurrency": "EUR" }
              ]
            }
          })}
        </script>
      </Helmet>

      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-slate-900 via-purple-900 to-slate-800 text-white pt-24 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Left: Text Content */}
            <div>
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 mb-6">
                <Camera className="w-4 h-4" />
                <span className="text-sm font-medium">{language === 'de' ? 'Studio Fotografie Wien' : 'Studio Photography Vienna'}</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
                {heroTitle}<br />
                <span className="text-purple-300">{heroSubtitle}</span>
              </h1>
              <p className="text-lg text-purple-100 mb-8 leading-relaxed">
                {heroDescription}
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  to="/warteliste/"
                  className="inline-flex items-center justify-center gap-2 bg-purple-500 text-white px-8 py-4 rounded-lg font-semibold hover:bg-purple-600 transition-all transform hover:scale-105"
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

            {/* Right: Hero Images Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <img
                  src={heroImage1}
                  alt="Studio Fotografie Wien – Professionelles Licht-Setup"
                  className="rounded-2xl shadow-2xl w-full h-auto object-contain"
                  loading="eager"
                />
              </div>
              <div>
                <img
                  src={heroImage2}
                  alt="Fotostudio Wien Mieten"
                  className="rounded-xl shadow-lg w-full h-auto object-contain"
                  loading="eager"
                />
              </div>
              <div>
                <img
                  src={heroImage3}
                  alt="Studio Shooting Wien"
                  className="rounded-xl shadow-lg w-full h-auto object-contain"
                  loading="eager"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Google Reviews */}
      <GoogleReviews />

      {/* Contextual cross-links for SEO */}
      <section className="py-8 bg-purple-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-base text-gray-600 leading-relaxed">
            {language === 'de' ? (
              <>
                Unser{' '}<Link to="/studio-fotografie-wien/" className="text-purple-600 hover:text-purple-700 underline underline-offset-2">Fotostudio Wien</Link>{' '}ist die Heimat für{' '}
                <Link to="/familienfotos-wien/" className="text-purple-600 hover:text-purple-700 underline underline-offset-2">Familienfotos Wien</Link>,{' '}
                <Link to="/neugeborenenfotos-wien/" className="text-purple-600 hover:text-purple-700 underline underline-offset-2">Neugeborenenfotos Wien</Link>,{' '}
                <Link to="/business-portrait-wien/" className="text-purple-600 hover:text-purple-700 underline underline-offset-2">Business Portrait Wien</Link> und{' '}
                <Link to="/produkt-fotografie-wien/" className="text-purple-600 hover:text-purple-700 underline underline-offset-2">Produktfotografie Wien</Link>.
                Alle <Link to="/calculator" className="text-purple-600 hover:text-purple-700 underline underline-offset-2">Studio-Pakete & Preise</Link> oder{' '}
                <Link to="/warteliste/" className="text-purple-600 hover:text-purple-700 underline underline-offset-2">Termin buchen</Link>.
              </>
            ) : (
              <>
                Our photo studio Vienna is home to{' '}
                <Link to="/familienfotos-wien/" className="text-purple-600 hover:text-purple-700 underline underline-offset-2">family photos Vienna</Link>,{' '}
                <Link to="/business-portrait-wien/" className="text-purple-600 hover:text-purple-700 underline underline-offset-2">business portrait Vienna</Link>, and{' '}
                <Link to="/produkt-fotografie-wien/" className="text-purple-600 hover:text-purple-700 underline underline-offset-2">product photography Vienna</Link>.
                View <Link to="/calculator" className="text-purple-600 hover:text-purple-700 underline underline-offset-2">all packages & prices</Link>.
              </>
            )}
          </p>
        </div>
      </section>

      {/* Leistungen */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {language === 'de' ? 'Was wir im Studio perfekt können' : 'What We Do Perfectly in the Studio'}
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              {language === 'de' ? 'Saubere, wiederholbare Ergebnisse mit definierten Sets und kontrolliertem Licht.' : 'Clean, repeatable results with defined sets and controlled lighting.'}
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-gradient-to-br from-purple-50 to-white p-6 rounded-xl border border-purple-100">
              <Camera className="w-12 h-12 text-purple-600 mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-3">Portraits & Headshots</h3>
              <p className="text-gray-600 leading-relaxed">
                {language === 'de' ? 'Neutral, editorial oder kreativ – mit Clamshell-Licht, Stripbox oder Moody-Sets. Business-clean bis dramatisch.' : 'Neutral, editorial or creative – with clamshell lighting, stripbox or moody sets. Business-clean to dramatic.'}
              </p>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-white p-6 rounded-xl border border-blue-100">
              <Users className="w-12 h-12 text-blue-600 mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-3">{language === 'de' ? 'Familien & Paare' : 'Families & Couples'}</h3>
              <p className="text-gray-600 leading-relaxed">
                {language === 'de' ? 'Gemütliche Lifestyle-Corner mit Sitzmöbeln, kindertaugliches Tempo, warme Farben – authentisch statt steif.' : 'Cozy lifestyle corner with seating, child-friendly pace, warm colors – authentic, not stiff.'}
              </p>
            </div>
            <div className="bg-gradient-to-br from-indigo-50 to-white p-6 rounded-xl border border-indigo-100">
              <Lightbulb className="w-12 h-12 text-indigo-600 mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-3">Business-Teams</h3>
              <p className="text-gray-600 leading-relaxed">
                {language === 'de' ? 'Einheitlicher Look für Abteilungen & Mitarbeiter – alle im selben Set, gleiche Belichtung, konsistente Retusche.' : 'Consistent look for departments & employees – everyone in the same set, same exposure, consistent retouching.'}
              </p>
            </div>
            <div className="bg-gradient-to-br from-amber-50 to-white p-6 rounded-xl border border-amber-100">
              <Sparkles className="w-12 h-12 text-amber-600 mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-3">{language === 'de' ? 'Produkte & Kampagnen' : 'Products & Campaigns'}</h3>
              <p className="text-gray-600 leading-relaxed">
                {language === 'de' ? 'Licht präzise gesetzt, Reflexe kontrolliert – Freisteller, Soft Shadow oder Lifestyle-Table für E-Commerce.' : 'Light precisely set, reflections controlled – cutouts, soft shadow or lifestyle table for e-commerce.'}
              </p>
            </div>
            <div className="bg-gradient-to-br from-rose-50 to-white p-6 rounded-xl border border-rose-100">
              <Camera className="w-12 h-12 text-rose-600 mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-3">Content-Reels</h3>
              <p className="text-gray-600 leading-relaxed">
                {language === 'de' ? 'Kurze Video-Loops im selben Licht-Setup wie die Fotos – perfekt für Social Media & Website.' : 'Short video loops in the same light setup as the photos – perfect for social media & website.'}
              </p>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-white p-6 rounded-xl border border-green-100">
              <Check className="w-12 h-12 text-green-600 mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-3">{language === 'de' ? 'Klare SLAs' : 'Clear SLAs'}</h3>
              <p className="text-gray-600 leading-relaxed">
                {language === 'de' ? 'Briefing 10-15 Min, Shooting 30-90 Min, Auswahl am Tag, Retusche & Delivery 48-72h Standard.' : 'Briefing 10-15 min, shooting 30-90 min, selection same day, retouching & delivery 48-72h standard.'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Bookbare Sets & Backdrops */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {language === 'de' ? 'Bookbare Sets & Backdrops' : 'Bookable Sets & Backdrops'}
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              {language === 'de' ? 'Wähle das passende Set für deinen gewünschten Look – wir zeigen dir Testshots vor dem Start.' : 'Choose the right set for your desired look – we show you test shots before we start.'}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-purple-700 to-purple-600 text-white">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold">{language === 'de' ? 'Set-Name' : 'Set Name'}</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">{language === 'de' ? 'Hintergrund' : 'Background'}</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">{language === 'de' ? 'Gefühl' : 'Feel'}</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">{language === 'de' ? 'Typische Motive' : 'Typical Subjects'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  <tr className="hover:bg-purple-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">Classic Neutral</td>
                    <td className="px-6 py-4 text-gray-600">{language === 'de' ? 'Grau (mittel)' : 'Gray (medium)'}</td>
                    <td className="px-6 py-4 text-gray-600">{language === 'de' ? 'Business-clean, zeitlos' : 'Business-clean, timeless'}</td>
                    <td className="px-6 py-4 text-gray-600">Headshots, Teams</td>
                  </tr>
                  <tr className="hover:bg-purple-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">High-Key White</td>
                    <td className="px-6 py-4 text-gray-600">{language === 'de' ? 'Reinweiß' : 'Pure white'}</td>
                    <td className="px-6 py-4 text-gray-600">{language === 'de' ? 'Frisch, modern' : 'Fresh, modern'}</td>
                    <td className="px-6 py-4 text-gray-600">{language === 'de' ? 'E-Com, Editorial, Familien' : 'E-com, editorial, families'}</td>
                  </tr>
                  <tr className="hover:bg-purple-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">Low-Key Shadow</td>
                    <td className="px-6 py-4 text-gray-600">{language === 'de' ? 'Tiefes Schwarz' : 'Deep black'}</td>
                    <td className="px-6 py-4 text-gray-600">{language === 'de' ? 'Dramatisch, kantig' : 'Dramatic, edgy'}</td>
                    <td className="px-6 py-4 text-gray-600">{language === 'de' ? 'Sport, Musik, Branding' : 'Sports, music, branding'}</td>
                  </tr>
                  <tr className="hover:bg-purple-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">Moody Color</td>
                    <td className="px-6 py-4 text-gray-600">{language === 'de' ? 'Farb-Paper (Sand/Salbei/Slate)' : 'Color paper (sand/sage/slate)'}</td>
                    <td className="px-6 py-4 text-gray-600">{language === 'de' ? 'Warm, organisch' : 'Warm, organic'}</td>
                    <td className="px-6 py-4 text-gray-600">{language === 'de' ? 'Portraits, Paare' : 'Portraits, couples'}</td>
                  </tr>
                  <tr className="hover:bg-purple-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">Lifestyle Corner</td>
                    <td className="px-6 py-4 text-gray-600">{language === 'de' ? 'Sitzmöbel + Plants' : 'Seating + plants'}</td>
                    <td className="px-6 py-4 text-gray-600">{language === 'de' ? 'Authentisch, cozy' : 'Authentic, cozy'}</td>
                    <td className="px-6 py-4 text-gray-600">{language === 'de' ? 'Familien, Autorenportraits' : 'Families, author portraits'}</td>
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
              alt="Studio Fotografie Wien – Professional Setup"
              className="w-full h-auto rounded-2xl shadow-2xl object-cover"
              loading="lazy"
            />
          </div>
        </section>
      )}

      {/* Modifiers & Licht-Setups */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {language === 'de' ? 'Modifiers & Licht-Setups' : 'Modifiers & Light Setups'}
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              {language === 'de' ? 'Welche Licht-Tools wir für welchen Look einsetzen – weich, definiert oder dramatisch.' : 'Which light tools we use for which look – soft, defined or dramatic.'}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-slate-700 to-slate-600 text-white">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold">{language === 'de' ? 'Zweck' : 'Purpose'}</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Modifier</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Setup</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">{language === 'de' ? 'Ergebnis' : 'Result'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  <tr className="hover:bg-blue-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">Beauty/Headshot</td>
                    <td className="px-6 py-4 text-gray-600">105 cm Octa + Grid</td>
                    <td className="px-6 py-4 text-gray-600">Clamshell (Key + Bounce)</td>
                    <td className="px-6 py-4 text-gray-600">{language === 'de' ? 'Gleichmäßige Haut, klare Augenlichter' : 'Even skin, clear catchlights'}</td>
                  </tr>
                  <tr className="hover:bg-blue-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">Business-Neutral</td>
                    <td className="px-6 py-4 text-gray-600">90 cm Softbox</td>
                    <td className="px-6 py-4 text-gray-600">45° Key + Neg-Fill</td>
                    <td className="px-6 py-4 text-gray-600">{language === 'de' ? 'Form, aber nicht hart' : 'Shape, but not harsh'}</td>
                  </tr>
                  <tr className="hover:bg-blue-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">Editorial Edge</td>
                    <td className="px-6 py-4 text-gray-600">Stripbox + Grid</td>
                    <td className="px-6 py-4 text-gray-600">{language === 'de' ? 'Rim + leichter Fill' : 'Rim + light fill'}</td>
                    <td className="px-6 py-4 text-gray-600">{language === 'de' ? 'Kontur, Schultern betont' : 'Contour, shoulders emphasized'}</td>
                  </tr>
                  <tr className="hover:bg-blue-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">High-Key</td>
                    <td className="px-6 py-4 text-gray-600">2× Softbox + Background-Light</td>
                    <td className="px-6 py-4 text-gray-600">{language === 'de' ? 'Hintergrund auf +1 bis +2 EV' : 'Background at +1 to +2 EV'}</td>
                    <td className="px-6 py-4 text-gray-600">{language === 'de' ? 'Sauberes Weiß ohne Halos' : 'Clean white without halos'}</td>
                  </tr>
                  <tr className="hover:bg-blue-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">{language === 'de' ? 'Produkt-Glanz' : 'Product Shine'}</td>
                    <td className="px-6 py-4 text-gray-600">Scrim + Flags</td>
                    <td className="px-6 py-4 text-gray-600">Top-light + Bounce</td>
                    <td className="px-6 py-4 text-gray-600">{language === 'de' ? 'Weiche Highlights, keine Hotspots' : 'Soft highlights, no hotspots'}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* Kapazität & Ablauf */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {language === 'de' ? 'Studio-Kapazität & Ablauf' : 'Studio Capacity & Workflow'}
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              {language === 'de' ? 'Unser Studio in Wien bietet Platz, Ausstattung und klare Prozesse für reibungslose Sessions.' : 'Our studio in Vienna offers space, equipment and clear processes for smooth sessions.'}
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-8 mb-12">
            <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-200">
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Lightbulb className="w-6 h-6 text-purple-600" />
                Studio-Ausstattung
              </h3>
              <ul className="space-y-3 text-gray-700">
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                  <span><strong>{language === 'de' ? 'Studiofläche:' : 'Studio area:'}</strong> {language === 'de' ? '~100 m² nutzbar, Deckenhöhe 3-4 m' : '~100 m² usable, ceiling height 3-4 m'}</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                  <span><strong>{language === 'de' ? 'Teamgrößen:' : 'Team sizes:'}</strong> {language === 'de' ? 'Einzelpersonen bis Gruppen 12-15 (Roster-Plan)' : 'Individuals to groups of 12-15 (roster plan)'}</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                  <span><strong>Make-up/Styling:</strong> {language === 'de' ? 'Bereich mit Spiegel & Licht' : 'Area with mirror & lighting'}</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                  <span><strong>{language === 'de' ? 'Umkleide:' : 'Changing room:'}</strong> {language === 'de' ? 'Separat vorhanden' : 'Separate room available'}</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                  <span><strong>{language === 'de' ? 'Musik & Stimmung:' : 'Music & ambiance:'}</strong> {language === 'de' ? 'Playlist-fähig, kindgerecht' : 'Playlist-ready, child-friendly'}</span>
                </li>
              </ul>
            </div>
            <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-200">
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Camera className="w-6 h-6 text-purple-600" />
                Shooting-Ablauf
              </h3>
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center font-bold text-sm">1</div>
                  <div>
                    <p className="font-semibold text-gray-900">Briefing (10-15 Min)</p>
                    <p className="text-sm text-gray-600">{language === 'de' ? 'Ziel-Look, Set-Wahl, Outfit-Plan besprechen' : 'Discuss target look, set choice, outfit plan'}</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center font-bold text-sm">2</div>
                  <div>
                    <p className="font-semibold text-gray-900">{language === 'de' ? 'Licht & Test (10 Min)' : 'Light & Test (10 min)'}</p>
                    <p className="text-sm text-gray-600">{language === 'de' ? 'Probe-Shot, Feintuning der Belichtung' : 'Test shot, fine-tuning exposure'}</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center font-bold text-sm">3</div>
                  <div>
                    <p className="font-semibold text-gray-900">Shooting (30-90 Min)</p>
                    <p className="text-sm text-gray-600">{language === 'de' ? 'Geführte Posen, natürliche Mimik' : 'Guided poses, natural expressions'}</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center font-bold text-sm">4</div>
                  <div>
                    <p className="font-semibold text-gray-900">{language === 'de' ? 'Auswahl (am Tag)' : 'Selection (same day)'}</p>
                    <p className="text-sm text-gray-600">{language === 'de' ? 'Markierungen im Proof, sofortige Vorschau' : 'Marks in proof, instant preview'}</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center font-bold text-sm">5</div>
                  <div>
                    <p className="font-semibold text-gray-900">{language === 'de' ? 'Retusche & Delivery (48-72h)' : 'Retouching & Delivery (48-72h)'}</p>
                    <p className="text-sm text-gray-600">{language === 'de' ? 'Hautretusche, Tonung, Exportprofile' : 'Skin retouching, toning, export profiles'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Extended Content Section - Safe Copy Slot */}
      {language === 'de' && <MarkdownCopySlot content={newageCopyMap['studio-fotografie-wien'].markdown} />}

      {/* Pakete */}
      <section id="pakete" className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {language === 'de' ? 'Studio Pakete & Preise' : 'Studio Packages & Prices'}
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              {language === 'de' ? 'Fixpreise je nach Dauer und Umfang – transparent und planbar.' : 'Fixed prices depending on duration and scope – transparent and predictable.'}
            </p>
          </div>
          <div className="flex justify-center mb-12">
            {/* Studio-Fotografie Basic */}
            <div className="bg-gradient-to-br from-purple-50 to-white rounded-xl shadow-2xl p-8 border-2 border-purple-500 max-w-md w-full">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">{language === 'de' ? 'Studio-Fotografie Basic' : 'Studio Photography Basic'}</h3>
              <p className="text-gray-600 mb-4">{language === 'de' ? 'Studio-Miete inkl. Fotosession' : 'Studio rental incl. photo session'}</p>
              <div className="mb-6">
                <div className="flex items-baseline">
                  <span className="text-sm text-gray-500 mr-1">{language === 'de' ? 'Ab' : 'From'}</span>
                  <span className="text-4xl font-bold text-purple-600">€149</span>
                </div>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">{language === 'de' ? 'Perfekte Option für Produkt- oder Portraitaufnahmen' : 'Perfect option for product or portrait shots'}</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">{language === 'de' ? 'Studio-Miete inklusive' : 'Studio rental included'}</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">{language === 'de' ? 'Gültig bis 2 Jahre' : 'Valid for up to 2 years'}</span>
                </li>
              </ul>
              <Link
                to="/warteliste/"
                className="block w-full text-center bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700 transition-all"
              >
                {language === 'de' ? 'Jetzt buchen' : 'Book now'}
              </Link>
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
              alt="Studio Fotografie Wien – Team Portrait"
              className="w-full h-auto rounded-2xl shadow-2xl object-cover"
              loading="lazy"
            />
          </div>
        </section>
      )}

      {/* Technik-Details */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {language === 'de' ? 'Technik-Details' : 'Technical Details'}
              <span className="block text-lg font-normal text-gray-600 mt-2">{language === 'de' ? '(für Nerds, die wir lieben)' : '(for nerds we love)'}</span>
            </h2>
          </div>
          <div className="bg-white rounded-xl shadow-lg overflow-hidden max-w-4xl mx-auto">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-purple-700 to-purple-600 text-white">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold">{language === 'de' ? 'Parameter' : 'Parameter'}</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">{language === 'de' ? 'Empfehlung / Standard' : 'Recommendation / Standard'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  <tr className="hover:bg-purple-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">{language === 'de' ? 'Porträt-Blende' : 'Portrait aperture'}</td>
                    <td className="px-6 py-4 text-gray-600">f/4–f/5.6 (Teams: f/7.1–f/8)</td>
                  </tr>
                  <tr className="hover:bg-purple-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">Sync/Speed</td>
                    <td className="px-6 py-4 text-gray-600">1/160–1/200 s, ISO 100–200</td>
                  </tr>
                  <tr className="hover:bg-purple-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">{language === 'de' ? 'Key-Platzierung' : 'Key placement'}</td>
                    <td className="px-6 py-4 text-gray-600">{language === 'de' ? '30–45°, Augenhöhe bis +10 cm' : '30–45°, eye level to +10 cm'}</td>
                  </tr>
                  <tr className="hover:bg-purple-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">{language === 'de' ? 'Weißabgleich' : 'White balance'}</td>
                    <td className="px-6 py-4 text-gray-600">{language === 'de' ? '5600 K (Flash), Graukarte Check' : '5600 K (Flash), gray card check'}</td>
                  </tr>
                  <tr className="hover:bg-purple-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">{language === 'de' ? 'Hautretusche' : 'Skin retouching'}</td>
                    <td className="px-6 py-4 text-gray-600">{language === 'de' ? 'Frequenztrennung light, Dodge&Burn subtil' : 'Frequency separation light, dodge & burn subtle'}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6 max-w-4xl mx-auto">
            <p className="text-gray-700 leading-relaxed">
              <strong>{language === 'de' ? 'Hinweis:' : 'Note:'}</strong> {language === 'de' ? 'Für Lichtlogik und saubere Belichtung orientieren wir uns an fotografischen Grundsätzen wie dem Inverse-Square-Law und bewährten Studio-Praktiken aus der Portrait- und Editorial-Fotografie.' : 'For light logic and clean exposure, we follow photographic principles such as the inverse-square law and proven studio practices from portrait and editorial photography.'}
            </p>
          </div>
        </div>
      </section>

      {/* Vorbereitung */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {language === 'de' ? 'Vorbereitung: Kurz & Schmerzlos' : 'Preparation: Quick & Painless'}
            </h2>
            <p className="text-lg text-gray-600">
              {language === 'de' ? 'Ein paar simple Tipps, damit dein Studio-Shooting perfekt läuft.' : 'A few simple tips so your studio shoot goes perfectly.'}
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-gradient-to-br from-purple-50 to-white p-6 rounded-xl border border-purple-100">
              <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                <Check className="w-5 h-5 text-purple-600" />
                {language === 'de' ? 'Kleidung & Outfit' : 'Clothing & Outfit'}
              </h3>
              <ul className="space-y-2 text-gray-700 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 font-bold mt-0.5">•</span>
                  <span>{language === 'de' ? '2-3 Outfits mitbringen (Texturen besser als Logos)' : '2-3 outfits (textures better than logos)'}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 font-bold mt-0.5">•</span>
                  <span>{language === 'de' ? 'Keine Mikro-Streifen (Moiré-Effekt)' : 'No micro-stripes (moiré effect)'}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 font-bold mt-0.5">•</span>
                  <span>{language === 'de' ? 'Bei Teams: Farbpalette statt Uniform (2-3 Töne)' : 'For teams: color palette instead of uniform (2-3 tones)'}</span>
                </li>
              </ul>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-white p-6 rounded-xl border border-blue-100">
              <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                <Check className="w-5 h-5 text-blue-600" />
                Styling & Details
              </h3>
              <ul className="space-y-2 text-gray-700 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold mt-0.5">•</span>
                  <span>{language === 'de' ? 'Puder/Blotting-Paper bei Glanz mitbringen' : 'Bring powder/blotting paper for shine'}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold mt-0.5">•</span>
                  <span>{language === 'de' ? 'Bürste für Haare (Studio-Klima kann statisch wirken)' : 'Hair brush (studio climate can cause static)'}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold mt-0.5">•</span>
                  <span>{language === 'de' ? 'Accessoires minimal, dafür stimmig zum Look' : 'Minimal accessories, but matching the look'}</span>
                </li>
              </ul>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-white p-6 rounded-xl border border-green-100">
              <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                <Check className="w-5 h-5 text-green-600" />
                {language === 'de' ? 'Familien mit Kindern' : 'Families with Children'}
              </h3>
              <ul className="space-y-2 text-gray-700 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-green-600 font-bold mt-0.5">•</span>
                  <span>{language === 'de' ? 'Snack & Spielzeug einpacken (Pausen möglich)' : 'Pack snacks & toys (breaks possible)'}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 font-bold mt-0.5">•</span>
                  <span>{language === 'de' ? 'Slot rund um Schlaf/Nap-Zeit legen' : 'Schedule slot around sleep/nap time'}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 font-bold mt-0.5">•</span>
                  <span>{language === 'de' ? 'Musik & gemütliches Tempo – kein Stress' : 'Music & relaxed pace – no stress'}</span>
                </li>
              </ul>
            </div>
            <div className="bg-gradient-to-br from-amber-50 to-white p-6 rounded-xl border border-amber-100">
              <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                <Check className="w-5 h-5 text-amber-600" />
                {language === 'de' ? 'Timing & Ankommen' : 'Timing & Arrival'}
              </h3>
              <ul className="space-y-2 text-gray-700 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-amber-600 font-bold mt-0.5">•</span>
                  <span>{language === 'de' ? '5-10 Min vor Termin da sein (entspannt ankommen)' : '5-10 min before appointment (arrive relaxed)'}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-600 font-bold mt-0.5">•</span>
                  <span>{language === 'de' ? 'Umkleide & Make-up-Bereich nutzen' : 'Use changing room & make-up area'}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-600 font-bold mt-0.5">•</span>
                  <span>{language === 'de' ? 'Wir zeigen Testshots vor dem Start' : 'We show test shots before starting'}</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {fromManual('manual.studiofotografie.faqHeading', language === 'de' ? 'Häufige Fragen' : 'Frequently Asked Questions')}
            </h2>
          </div>
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-purple-50 to-white p-6 rounded-xl border border-purple-100">
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                {fromManual('manual.studiofotografie.faqQ1', language === 'de' ? 'Wie wähle ich das richtige Set?' : 'How do I choose the right set?')}
              </h3>
              <p className="text-gray-700 leading-relaxed">
                {language === 'de' ? <>Wir matchen das Set zu deinem Ziel: <strong>studio fotografie wien</strong> neutral (Business/LinkedIn) oder warm & organisch (Lifestyle/Familie). Du siehst Testshots vor dem eigentlichen Shooting-Start.</> : <>We match the set to your goal: <strong>studio photography Vienna</strong> neutral (business/LinkedIn) or warm & organic (lifestyle/family). You see test shots before the actual shoot begins.</>}
              </p>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-white p-6 rounded-xl border border-purple-100">
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                {fromManual('manual.studiofotografie.faqQ2', language === 'de' ? 'Was sollen Gruppen/Teams bei der Kleidung beachten?' : 'What should groups/teams consider for clothing?')}
              </h3>
              <p className="text-gray-700 leading-relaxed">
                {fromManual('manual.studiofotografie.faqA2', language === 'de' ? 'Palette statt Uniform: 2-3 Farbtöne auswählen, keine lauten Muster oder Logos. Wir senden gern einen Mini-Guide vor dem Termin mit Beispielen.' : 'Palette over uniform: choose 2-3 color tones, no loud patterns or logos. We\'re happy to send a mini guide with examples before the appointment.')}
              </p>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-white p-6 rounded-xl border border-purple-100">
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                {fromManual('manual.studiofotografie.faqQ3', language === 'de' ? 'Kann ich Content-Reels im gleichen Setup mitdrehen?' : 'Can I shoot content reels in the same setup?')}
              </h3>
              <p className="text-gray-700 leading-relaxed">
                {fromManual('manual.studiofotografie.faqA3', language === 'de' ? 'Ja – kurze B-Rolls (10-20 Sekunden) im selben Licht-Setup sind als Add-on buchbar (€90). Perfekt für Social Media & Website-Header.' : 'Yes – short B-rolls (10-20 seconds) in the same light setup are bookable as an add-on (€90). Perfect for social media & website headers.')}
              </p>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-white p-6 rounded-xl border border-purple-100">
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                {fromManual('manual.studiofotografie.faqQ4', language === 'de' ? 'Wie schnell bekomme ich die finalen Bilder?' : 'How quickly will I receive the final images?')}
              </h3>
              <p className="text-gray-700 leading-relaxed">
                {fromManual('manual.studiofotografie.faqA4', language === 'de' ? 'Standard-Lieferung 48-72h nach dem Shooting. Express-Lieferung in 24h ist gegen Aufpreis (+€80) möglich – ideal für dringende Kampagnen oder Deadlines.' : 'Standard delivery 48-72h after the shoot. Express delivery in 24h is available for a surcharge (+€80) – ideal for urgent campaigns or deadlines.')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Ähnliche Services */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {language === 'de' ? 'Ähnliche Services' : 'Related Services'}
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              {language === 'de' ? 'Weitere professionelle Fotografie-Dienstleistungen in Wien.' : 'More professional photography services in Vienna.'}
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <Link
              to="/portrait-fotografie-wien/"
              className="bg-white p-8 rounded-xl shadow-lg border border-gray-200 hover:border-purple-300 hover:shadow-xl transition-all group"
            >
              <Camera className="w-12 h-12 text-purple-600 mb-4 group-hover:scale-110 transition-transform" />
              <h3 className="text-xl font-bold text-gray-900 mb-3">{language === 'de' ? 'Portraitfotografie' : 'Portrait Photography'}</h3>
              <p className="text-gray-600 leading-relaxed mb-4">
                {language === 'de' ? 'Editorial, klassisch oder kreativ – Studio-Sets mit perfektem Licht für ausdrucksstarke Portraits.' : 'Editorial, classic or creative – studio sets with perfect lighting for expressive portraits.'}
              </p>
              <span className="text-purple-600 font-semibold inline-flex items-center gap-2 group-hover:gap-3 transition-all">
                {language === 'de' ? 'Mehr erfahren' : 'Learn more'}
                <ArrowRight className="w-4 h-4" />
              </span>
            </Link>
            <Link
              to="/business-portrait-wien/"
              className="bg-white p-8 rounded-xl shadow-lg border border-gray-200 hover:border-purple-300 hover:shadow-xl transition-all group"
            >
              <Users className="w-12 h-12 text-purple-600 mb-4 group-hover:scale-110 transition-transform" />
              <h3 className="text-xl font-bold text-gray-900 mb-3">Business-Portraits</h3>
              <p className="text-gray-600 leading-relaxed mb-4">
                {language === 'de' ? 'Professionelle Headshots für LinkedIn, Website & Team-Seiten – einheitlicher Stil garantiert.' : 'Professional headshots for LinkedIn, website & team pages – consistent style guaranteed.'}
              </p>
              <span className="text-purple-600 font-semibold inline-flex items-center gap-2 group-hover:gap-3 transition-all">
                {language === 'de' ? 'Mehr erfahren' : 'Learn more'}
                <ArrowRight className="w-4 h-4" />
              </span>
            </Link>
            <Link
              to="/familienfotos-wien/"
              className="bg-white p-8 rounded-xl shadow-lg border border-gray-200 hover:border-purple-300 hover:shadow-xl transition-all group"
            >
              <Sparkles className="w-12 h-12 text-purple-600 mb-4 group-hover:scale-110 transition-transform" />
              <h3 className="text-xl font-bold text-gray-900 mb-3">{language === 'de' ? 'Familienfotos' : 'Family Photos'}</h3>
              <p className="text-gray-600 leading-relaxed mb-4">
                {language === 'de' ? 'Gemütliche Studio-Atmosphäre oder Outdoor – authentische Familienmomente natürlich eingefangen.' : 'Cozy studio atmosphere or outdoor – authentic family moments naturally captured.'}
              </p>
              <span className="text-purple-600 font-semibold inline-flex items-center gap-2 group-hover:gap-3 transition-all">
                {language === 'de' ? 'Mehr erfahren' : 'Learn more'}
                <ArrowRight className="w-4 h-4" />
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-800 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            {language === 'de' ? 'Studio-Fotografie, die liefert' : 'Studio Photography That Delivers'}
          </h2>
          <p className="text-xl text-purple-100 mb-8 leading-relaxed">
            {language === 'de' ? 'Saubere Sets, kontrolliertes Licht, klare SLAs – von Headshots über Familien bis Teams. Fixpreise, keine Überraschungen.' : 'Clean sets, controlled lighting, clear SLAs – from headshots to families to teams. Fixed prices, no surprises.'}
          </p>
          <Link
            to="/warteliste/"
            className="inline-flex items-center justify-center gap-2 bg-white text-purple-900 px-10 py-5 rounded-lg font-bold text-lg hover:bg-purple-50 transition-all transform hover:scale-105 shadow-xl"
          >
            {language === 'de' ? 'Jetzt Studio-Termin sichern' : 'Book Your Studio Session Now'}
            <ArrowRight className="w-6 h-6" />
          </Link>
        </div>
      </section>

      <RelatedServices currentPath="/studio-fotografie-wien/" />
    </div>
    </Layout>
  );
};

export default StudioFotografieWienPage;
