import { SEOHead } from '../../components/SEO/SEOHead';
import { RelatedServices } from '../../components/SEO/RelatedServices';
import Layout from '../../components/layout/Layout';
import GoogleReviews from '../../components/layout/GoogleReviews';
import { Link } from 'react-router-dom';
import { ContextualLinks } from '../../components/SEO/ContextualLinks';
import { Helmet } from 'react-helmet-async';
import { Package, Check, ArrowRight, Sparkles, Camera, Layers, SlidersHorizontal, Users, Star } from 'lucide-react';
import { useManualPageContent } from '../../hooks/useManualPageContent';
import MarkdownCopySlot from '../../components/MarkdownCopySlot';
import { newageCopyMap } from '../../content/newageCopyMap';
import { useLanguage } from '../../context/LanguageContext';
import { SITE } from '../../config/site';

// CACHE BUST v2.0
export default function ProduktfotografieWienPage() {
  const t = useManualPageContent('produktfotografie');
  const { language } = useLanguage();

  // Language-aware fallbacks
  const fallbacks = {
    en: {
      heroTitle: 'Product & E-Commerce Photography in Vienna',
      heroSubtitle: 'Sharp. Color-accurate. Sales-driven.',
      heroDescription: 'As a product photographer in Vienna, we deliver images that convert – from technically clean cutouts to elegant reflections to lifestyle sets that show story and benefit. For Amazon, Shopify, B2B catalogs, PR & Social.',
      primaryCta: 'Secure a Slot',
      secondaryCta: 'Inquiry & Specs',
    },
    de: {
      heroTitle: 'Produkt- & E-Commerce-Fotografie in Wien',
      heroSubtitle: 'Scharf. Farbtreu. Verkaufsstark.',
      heroDescription: 'Als produktfotograf wien liefern wir Bilder, die konvertieren – von technisch sauberen Freistellern über edle Spiegelungen bis zu Lifestyle-Sets, die Story und Nutzen zeigen. Für Amazon, Shopify, B2B-Kataloge, PR & Social.',
      primaryCta: 'Slot sichern',
      secondaryCta: 'Anfrage & Specs',
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

  const heroTitle = fromManual('manual.produktfotografie.heroTitle', fb.heroTitle);
  const heroSubtitle = fromManual('manual.produktfotografie.heroTagline', fb.heroSubtitle);
  const heroDescription = fromManual('manual.produktfotografie.heroDescription', fb.heroDescription);
  const primaryCta = fromManual('manual.produktfotografie.primaryCta', fb.primaryCta);
  const secondaryCta = fromManual('manual.produktfotografie.secondaryCta', fb.secondaryCta);
  const heroImage1 = fromManual('manual.produktfotografie.heroImage1', '');
  const heroImage3 = fromManual('manual.produktfotografie.heroImage3', '');
  const heroImage4 = fromManual('manual.produktfotografie.heroImage4', '');
  const heroImage5 = fromManual('manual.produktfotografie.heroImage5', '');

  return (
    <Layout>
      <div className="min-h-screen bg-white">
        <SEOHead
          title={newageCopyMap['produkt-fotografie-wien'].title}
          description={newageCopyMap['produkt-fotografie-wien'].metaDescription}
          keywords="produktfotograf wien, produktfotografie wien, e-commerce fotos wien, amazon bilder wien"
          canonical="/produkt-fotografie-wien/"
          ogImage={`${SITE.url}/images/product-hero.jpg`}
          hreflang={[
            { lang: 'de', url: '/produkt-fotografie-wien/' },
            { lang: 'en', url: '/en/product-photography-vienna/' }
          ]}
        />

        {/* JSON-LD Structured Data */}
        <Helmet>
          <script type="application/ld+json">
            {JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Service',
              name: 'Produkt- & E-Commerce-Fotografie Wien',
              serviceType: 'Product Photography',
              areaServed: { '@type': 'City', name: 'Wien' },
              provider: { '@type': 'LocalBusiness', name: SITE.name },
              offers: { '@type': 'AggregateOffer', lowPrice: '390', highPrice: '1790', priceCurrency: 'EUR' }
            })}
          </script>
        </Helmet>

        {/* Hero - Full Width Image */}
        <section className="relative bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-900/20 to-pink-900/20"></div>
          
          {/* Full Width Hero Image */}
          <div className="relative w-full h-[500px] md:h-[600px] lg:h-[700px] overflow-hidden bg-gray-900">
            {heroImage1 ? (
              <img
                src={heroImage1}
                alt="Produktfotografie Wien – E-Commerce & Amazon Produktfotos"
                className="w-full h-full object-contain object-center"
                loading="eager"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-purple-600 via-pink-600 to-orange-500"></div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/70 to-transparent"></div>
            
            {/* Text Content Overlay */}
            <div className="absolute inset-0 flex items-center">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
                <div className="max-w-3xl">
                  <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight text-white drop-shadow-2xl">{heroTitle}</h1>
                  <p className="text-xl md:text-2xl text-white mb-3 leading-relaxed font-semibold drop-shadow-lg">{heroSubtitle}</p>
                  <p className="text-base md:text-lg text-gray-100 mb-8 leading-relaxed drop-shadow-lg">
                    {heroDescription}
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <Link to="/warteliste" className="inline-flex items-center justify-center px-8 py-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold text-lg shadow-2xl">
                      {primaryCta}
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Link>
                    <Link to="/kontakt" className="inline-flex items-center justify-center px-8 py-4 border-2 border-white text-white rounded-lg hover:bg-white/10 transition-colors font-semibold text-lg shadow-2xl backdrop-blur-sm">
                      {secondaryCta}
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <GoogleReviews />

        <ContextualLinks pathname="/produkt-fotografie-wien/" language={language} />

        {/* Was wir perfekt können */}
        <section className="py-16 bg-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-10">{language === 'de' ? 'Was wir perfekt können' : 'What We Do Perfectly'}</h2>
            <div className="grid md:grid-cols-2 gap-6 text-sm text-gray-700">
              <div className="bg-gray-50 rounded-xl p-6">
                <Check className="h-5 w-5 text-purple-600 inline mr-2" />{language === 'de' ? 'Freisteller (Weiß #FFFFFF): pixelgenau, saubere Kanten, keine Farbsäume.' : 'Cutouts (White #FFFFFF): pixel-perfect, clean edges, no color fringing.'}
              </div>
              <div className="bg-gray-50 rounded-xl p-6">
                <Check className="h-5 w-5 text-purple-600 inline mr-2" />{language === 'de' ? 'Reflex/Shadow Looks: Bodenspiegelung oder natürlicher Soft-Shadow.' : 'Reflection/Shadow Looks: floor reflection or natural soft shadow.'}
              </div>
              <div className="bg-gray-50 rounded-xl p-6">
                <Check className="h-5 w-5 text-purple-600 inline mr-2" />{language === 'de' ? 'Lifestyle-Sets: Umgebung, Hände, Anwendung – \u201eso wirkt\u2019s im echten Leben\u201c.' : "Lifestyle Sets: environment, hands, usage – 'this is how it looks in real life'."}
              </div>
              <div className="bg-gray-50 rounded-xl p-6">
                <Check className="h-5 w-5 text-purple-600 inline mr-2" />{language === 'de' ? 'Glänzende Oberflächen: Glas/Metall ohne Hotspots, kontrollierte Highlights.' : 'Glossy Surfaces: glass/metal without hotspots, controlled highlights.'}
              </div>
              <div className="bg-gray-50 rounded-xl p-6">
                <Check className="h-5 w-5 text-purple-600 inline mr-2" />{language === 'de' ? 'Textur & Farbe: Kalibrierte Monitore, ColorChecker, konsistente Serien.' : 'Texture & Color: calibrated monitors, ColorChecker, consistent series.'}
              </div>
              <div className="bg-gray-50 rounded-xl p-6">
                <Check className="h-5 w-5 text-purple-600 inline mr-2" />{language === 'de' ? 'Specs für Marktplätze: Abmessungen, DPI, Seitenverhältnis – compliant.' : 'Marketplace Specs: dimensions, DPI, aspect ratio – compliant.'}
              </div>
            </div>
          </div>
        </section>

        {/* Sets & Licht */}
        <section className="py-16 bg-gray-50">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-center mb-8">{language === 'de' ? 'Sets & Licht – Best-of' : 'Sets & Lighting – Best-of'}</h2>
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-purple-600 text-white">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Set</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">{language === 'de' ? 'Einsatz' : 'Use Case'}</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">{language === 'de' ? 'Licht-Setup' : 'Light Setup'}</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">{language === 'de' ? 'Ergebnis' : 'Result'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 text-sm text-gray-700">
                  <tr className="hover:bg-gray-50"><td className="px-6 py-4 font-medium text-gray-900">{language === 'de' ? 'Freisteller Weiß' : 'White Cutout'}</td><td className="px-6 py-4">Amazon/Shop Hero</td><td className="px-6 py-4">{language === 'de' ? 'Großes Softbox-Key + Flags' : 'Large softbox key + flags'}</td><td className="px-6 py-4">{language === 'de' ? 'Klinisch sauber, #FFFFFF, hartes Knock-Out' : 'Clinically clean, #FFFFFF, hard knockout'}</td></tr>
                  <tr className="hover:bg-gray-50"><td className="px-6 py-4 font-medium text-gray-900">Soft Shadow</td><td className="px-6 py-4">Shop, Print</td><td className="px-6 py-4">{language === 'de' ? 'Key + Neg. Fill + Bodenkarte' : 'Key + neg. fill + floor card'}</td><td className="px-6 py-4">{language === 'de' ? 'Natürlicher Schatten, dreidimensional' : 'Natural shadow, three-dimensional'}</td></tr>
                  <tr className="hover:bg-gray-50"><td className="px-6 py-4 font-medium text-gray-900">Mirror Gloss</td><td className="px-6 py-4">{language === 'de' ? 'Premium/Kosmetik' : 'Premium/Cosmetics'}</td><td className="px-6 py-4">{language === 'de' ? 'Streifenlicht + Acrylplatte' : 'Strip light + acrylic plate'}</td><td className="px-6 py-4">{language === 'de' ? 'Edle Spiegelung, high-end' : 'Elegant reflection, high-end'}</td></tr>
                  <tr className="hover:bg-gray-50"><td className="px-6 py-4 font-medium text-gray-900">Matte Craft</td><td className="px-6 py-4">{language === 'de' ? 'Food/Handwerk' : 'Food/Craft'}</td><td className="px-6 py-4">Overhead Soft + Sidelight</td><td className="px-6 py-4">{language === 'de' ? 'Textur, warm, greifbar' : 'Texture, warm, tangible'}</td></tr>
                  <tr className="hover:bg-gray-50"><td className="px-6 py-4 font-medium text-gray-900">Lifestyle Table</td><td className="px-6 py-4">{language === 'de' ? 'Anwendung/How-To' : 'Usage/How-To'}</td><td className="px-6 py-4">{language === 'de' ? '2-Licht Mix + Props' : '2-light mix + props'}</td><td className="px-6 py-4">Story, Benefit, Scroll-Stopper</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Extended Content Section - Safe Copy Slot */}
        {language === 'de' && <MarkdownCopySlot content={newageCopyMap['produkt-fotografie-wien'].markdown} />}

        {/* Example Images - Portfolio Showcase */}
        {/* Pakete & Preise */}
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">{language === 'de' ? 'Pakete & Preise (Richtwerte)' : 'Packages & Pricing (Guidelines)'}</h2>
            </div>
            <div className="flex justify-center mb-12">
              {/* Produktfotografie */}
              <div className="bg-gradient-to-br from-purple-600 to-pink-600 text-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
                <div className="mb-6">
                  <h3 className="text-2xl font-bold mb-2">{language === 'de' ? 'Produktfotografie' : 'Product Photography'}</h3>
                  <p className="text-purple-100 font-medium">{language === 'de' ? 'Ideal für Shops & Social' : 'Ideal for Shops & Social'}</p>
                </div>
                <div className="mb-6">
                  <div className="flex items-baseline">
                    <span className="text-sm text-purple-200 mr-1">{language === 'de' ? 'Ab' : 'From'}</span>
                    <span className="text-4xl font-bold">€199</span>
                  </div>
                </div>
                <div className="space-y-4 mb-8">
                  <div className="flex items-start"><Check className="h-5 w-5 text-yellow-300 mr-3 flex-shrink-0 mt-0.5" /><span>{language === 'de' ? '5 retuschierte Bilder' : '5 retouched images'}</span></div>
                  <div className="flex items-start"><Check className="h-5 w-5 text-yellow-300 mr-3 flex-shrink-0 mt-0.5" /><span>{language === 'de' ? 'Ideal für Shops & Social' : 'Ideal for shops & social'}</span></div>
                  <div className="flex items-start"><Check className="h-5 w-5 text-yellow-300 mr-3 flex-shrink-0 mt-0.5" /><span>{language === 'de' ? 'Gültig bis 2 Jahre' : 'Valid for up to 2 years'}</span></div>
                </div>
                <Link to="/warteliste" className="block text-center px-6 py-3 bg-white text-purple-600 rounded-lg hover:bg-gray-100 transition-colors font-semibold">{language === 'de' ? 'Jetzt buchen' : 'Book Now'}</Link>
              </div>
            </div>
          </div>
        </section>

        {/* Dateiformate & Spezifikationen */}
        <section className="py-16 bg-gray-50">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-center mb-8">{language === 'de' ? 'Dateiformate & Spezifikationen' : 'File Formats & Specifications'}</h2>
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-purple-600 text-white">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold">{language === 'de' ? 'Bedarf' : 'Requirement'}</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">{language === 'de' ? 'Format' : 'Format'}</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">{language === 'de' ? 'Größe/Seitenverhältnis' : 'Size/Aspect Ratio'}</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">{language === 'de' ? 'Besonderheiten' : 'Details'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 text-sm text-gray-700">
                  <tr className="hover:bg-gray-50"><td className="px-6 py-4 font-medium text-gray-900">Amazon Hero</td><td className="px-6 py-4">JPG sRGB</td><td className="px-6 py-4">{language === 'de' ? 'min. 2000 px längste Seite, 1:1 möglich' : 'min. 2000px longest side, 1:1 possible'}</td><td className="px-6 py-4">{language === 'de' ? 'Hintergrund #FFFFFF, Produkt ≥85% Fläche' : 'Background #FFFFFF, product ≥85% area'}</td></tr>
                  <tr className="hover:bg-gray-50"><td className="px-6 py-4 font-medium text-gray-900">{language === 'de' ? 'Shop Galerie' : 'Shop Gallery'}</td><td className="px-6 py-4">JPG/PNG</td><td className="px-6 py-4">1500–2500 px, 4:5 / 1:1</td><td className="px-6 py-4">{language === 'de' ? 'Einheitliche Kanten, identische Höhe' : 'Uniform edges, identical height'}</td></tr>
                  <tr className="hover:bg-gray-50"><td className="px-6 py-4 font-medium text-gray-900">Print/PR</td><td className="px-6 py-4">TIFF/JPG</td><td className="px-6 py-4">{language === 'de' ? '300 DPI, CMYK möglich' : '300 DPI, CMYK possible'}</td><td className="px-6 py-4">{language === 'de' ? 'Farbprofil nach Absprache' : 'Color profile by arrangement'}</td></tr>
                  <tr className="hover:bg-gray-50"><td className="px-6 py-4 font-medium text-gray-900">Social</td><td className="px-6 py-4">MP4/JPG</td><td className="px-6 py-4">Reels 1080×1920, Feed 1080×1350</td><td className="px-6 py-4">{language === 'de' ? 'Hook-Frame, Textsafe-Zonen' : 'Hook frame, text-safe zones'}</td></tr>
                </tbody>
              </table>
            </div>
            <p className="text-center text-sm text-gray-600 mt-3">{language === 'de' ? 'Externer Hinweis: Offizielle Amazon-Bildanforderungen findest du im' : 'External note: Official Amazon image requirements can be found in the'} <a href="https://sellercentral.amazon.de/gp/help/external/200421110" target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:text-purple-700 underline">Amazon Seller-Guide</a>.</p>
          </div>
        </section>

        {/* Workflow */}
        <section className="py-16 bg-white">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-center mb-8">{language === 'de' ? 'Workflow – schnell & sicher' : 'Workflow – Fast & Reliable'}</h2>
            <div className="bg-purple-50 rounded-xl p-8 text-sm text-gray-800">
              <ul className="grid md:grid-cols-2 gap-3">
                <li>{language === 'de' ? '• Briefing & Shotlist: Produktvarianten, Prioritäten, Specs.' : '• Briefing & Shot List: product variants, priorities, specs.'}</li>
                <li>{language === 'de' ? '• Testshot: 1–2 Proofs zur Freigabe (Licht, Winkel, Schatten).' : '• Test Shot: 1–2 proofs for approval (light, angle, shadow).'}</li>
                <li>{language === 'de' ? '• Produktion: Serien mit konsistenter Perspektive.' : '• Production: series with consistent perspective.'}</li>
                <li>{language === 'de' ? '• Retusche: Staub, Kratzer, Kantenreinzeichnung, Farbabgleich.' : '• Retouching: dust, scratches, edge cleanup, color matching.'}</li>
                <li>{language === 'de' ? '• Delivery: Web + Print Ordner, eindeutiges Namensschema, Backup.' : '• Delivery: web + print folders, clear naming scheme, backup.'}</li>
                <li>{language === 'de' ? '• Qualität: Dual-Card, Tethering, kalibriert; ColorChecker-Referenz.' : '• Quality: dual-card, tethering, calibrated; ColorChecker reference.'}</li>
              </ul>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-16 bg-gray-50">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-center mb-12">{fromManual('manual.produktfotografie.faqHeading', language === 'de' ? 'Häufige Fragen (FAQ)' : 'Frequently Asked Questions (FAQ)')}</h2>
            <div className="space-y-6">
              <div className="bg-white rounded-xl p-6 shadow-sm"><h3 className="font-bold text-lg text-gray-900 mb-2">{fromManual('manual.produktfotografie.faqQ1', language === 'de' ? 'Könnt ihr stark spiegelnde Produkte (Chrom/Glas)?' : 'Can you handle highly reflective products (chrome/glass)?')}</h3><p className="text-gray-600">{fromManual('manual.produktfotografie.faqA1', language === 'de' ? 'Ja. Mit Flagging, Polarizer, Streifenlicht und kontrollierten Specular Highlights.' : 'Yes. With flagging, polarizer, strip lighting and controlled specular highlights.')}</p></div>
              <div className="bg-white rounded-xl p-6 shadow-sm"><h3 className="font-bold text-lg text-gray-900 mb-2">{fromManual('manual.produktfotografie.faqQ2', language === 'de' ? 'Baut ihr Sets/Untergründe?' : 'Do you build sets/backgrounds?')}</h3><p className="text-gray-600">{fromManual('manual.produktfotografie.faqA2', language === 'de' ? 'Ja. Acryl (klar/schwarz), Stein, Holz, Paper, Plexi – individuell abgestimmt.' : 'Yes. Acrylic (clear/black), stone, wood, paper, plexiglass – individually tailored.')}</p></div>
              <div className="bg-white rounded-xl p-6 shadow-sm"><h3 className="font-bold text-lg text-gray-900 mb-2">{fromManual('manual.produktfotografie.faqQ3', language === 'de' ? 'Brauchen wir Muster oder Render?' : 'Do we need samples or renders?')}</h3><p className="text-gray-600">{fromManual('manual.produktfotografie.faqA3', language === 'de' ? 'Echte Muster liefern realistische Highlights/Texturen. Render nur als Ergänzung.' : 'Real samples give realistic highlights/textures. Renders only as a supplement.')}</p></div>
              <div className="bg-white rounded-xl p-6 shadow-sm"><h3 className="font-bold text-lg text-gray-900 mb-2">{fromManual('manual.produktfotografie.faqQ4', language === 'de' ? 'Wie viele Dateien je Motiv?' : 'How many files per motif?')}</h3><p className="text-gray-600">{fromManual('manual.produktfotografie.faqA4', language === 'de' ? 'Standard: 1 Hauptlook, optional Zusatzwinkel/Detail. Benennung nach SKU/Variante.' : 'Standard: 1 main look, optional extra angles/details. Named by SKU/variant.')}</p></div>
            </div>
          </div>
        </section>

        {/* Mini-Checkliste & Tipp */}
        <section className="py-16 bg-white">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-center mb-8">{language === 'de' ? 'Mini-Checkliste fürs Anliefern' : 'Mini Checklist for Delivery'}</h2>
            <div className="grid md:grid-cols-2 gap-6 text-sm text-gray-800">
              <div className="bg-gray-50 rounded-xl p-6">
                <ul className="space-y-2">
                  <li>{language === 'de' ? '• Saubere, unbeschädigte Muster + Ersatz.' : '• Clean, undamaged samples + spares.'}</li>
                  <li>{language === 'de' ? '• Style Guide, CI-Farben, Referenzbilder wenn möglich.' : '• Style guide, CI colors, reference images if available.'}</li>
                  <li>{language === 'de' ? '• Liste Pflichtwinkel/Details (Ports, Labels, Anschlüsse).' : '• List of required angles/details (ports, labels, connectors).'}</li>
                  <li>{language === 'de' ? '• Verpackung separat? Gern – für E-Com-Set.' : '• Packaging separate? Gladly – for e-commerce set.'}</li>
                </ul>
              </div>
              <div className="bg-purple-50 rounded-xl p-6">
                <h3 className="font-semibold text-gray-900 mb-2">{language === 'de' ? 'Kurzer Praxis-Tipp' : 'Quick Practical Tip'}</h3>
                <p className="text-gray-700">{language === 'de' ? 'Serien konsistent halten: gleiche Perspektive, gleiche Lichtkante, gleiche Schattenlänge – der Shop wirkt sofort professioneller.' : 'Keep series consistent: same perspective, same light edge, same shadow length – the shop immediately looks more professional.'}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Related Services */}
        <section className="py-16 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-center mb-8">{language === 'de' ? 'Verwandte Services' : 'Related Services'}</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <Link to="/business-portrait-wien/" className="block bg-purple-50 rounded-xl p-6 hover:shadow-lg transition-shadow">
                <Camera className="h-10 w-10 text-purple-600 mb-4" />
                <h3 className="font-semibold text-lg mb-2 text-gray-900">Business-Portraits</h3>
                <p className="text-gray-600 text-sm mb-4">{language === 'de' ? 'Team & CEO – einheitlicher Look für Web & PR' : 'Team & CEO – consistent look for web & PR'}</p>
                <span className="text-purple-600 font-semibold">{language === 'de' ? 'Mehr erfahren →' : 'Learn more →'}</span>
              </Link>
              <Link to="/bewerbungsfotos-wien/" className="block bg-purple-50 rounded-xl p-6 hover:shadow-lg transition-shadow">
                <SlidersHorizontal className="h-10 w-10 text-purple-600 mb-4" />
                <h3 className="font-semibold text-lg mb-2 text-gray-900">{language === 'de' ? 'Bewerbungsfotos' : 'Application Photos'}</h3>
                <p className="text-gray-600 text-sm mb-4">{language === 'de' ? 'LinkedIn/PR Portraits – schnell & markenschonend' : 'LinkedIn/PR portraits – fast & brand-safe'}</p>
                <span className="text-purple-600 font-semibold">{language === 'de' ? 'Mehr erfahren →' : 'Learn more →'}</span>
              </Link>
              <Link to="/eventfotografie-wien/" className="block bg-purple-50 rounded-xl p-6 hover:shadow-lg transition-shadow">
                <Layers className="h-10 w-10 text-purple-600 mb-4" />
                <h3 className="font-semibold text-lg mb-2 text-gray-900">{language === 'de' ? 'Eventfotografie' : 'Event Photography'}</h3>
                <p className="text-gray-600 text-sm mb-4">{language === 'de' ? 'Launches & PR – Assets, die sofort nutzbar sind' : 'Launches & PR – assets ready for immediate use'}</p>
                <span className="text-purple-600 font-semibold">{language === 'de' ? 'Mehr erfahren →' : 'Learn more →'}</span>
              </Link>
            </div>
          </div>
        </section>

        {/* Related Services Section */}
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                {language === 'de' ? 'Weitere Business-Fotografie Services' : 'More Business Photography Services'}
              </h2>
              <p className="text-lg text-gray-600">
                {language === 'de' ? 'Komplette visuelle Lösungen für Ihr Unternehmen' : 'Complete visual solutions for your business'}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Business Portraits */}
              <Link
                to="/business-portrait-wien/"
                className="bg-gray-50 rounded-lg p-6 hover:shadow-lg transition-shadow group"
              >
                <Users className="h-12 w-12 text-purple-600 mb-4" />
                <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-purple-600 transition-colors">
                  Business Portraits
                </h3>
                <p className="text-gray-600 mb-4">
                  {language === 'de' ? 'Professionelle Mitarbeiterfotos und Headshots für Ihre Firmenwebsite und LinkedIn.' : 'Professional employee photos and headshots for your company website and LinkedIn.'}
                </p>
                <span className="text-purple-600 font-semibold inline-flex items-center">
                  {language === 'de' ? 'Mehr erfahren' : 'Learn more'} <ArrowRight className="ml-2 h-4 w-4" />
                </span>
              </Link>

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
                  {language === 'de' ? 'Dokumentation von Firmenevents, Produktlaunches und Konferenzen in Wien.' : 'Documentation of corporate events, product launches and conferences in Vienna.'}
                </p>
                <span className="text-purple-600 font-semibold inline-flex items-center">
                  {language === 'de' ? 'Mehr erfahren' : 'Learn more'} <ArrowRight className="ml-2 h-4 w-4" />
                </span>
              </Link>

              {/* Real Estate Photography */}
              <Link
                to="/immobilien-fotografie-wien/"
                className="bg-gray-50 rounded-lg p-6 hover:shadow-lg transition-shadow group"
              >
                <Star className="h-12 w-12 text-purple-600 mb-4" />
                <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-purple-600 transition-colors">
                  {language === 'de' ? 'Immobilienfotografie' : 'Real Estate Photography'}
                </h3>
                <p className="text-gray-600 mb-4">
                  {language === 'de' ? 'Hochwertige Architektur- und Immobilienfotos für Exposés und Vermarktung.' : 'High-quality architecture and real estate photos for listings and marketing.'}
                </p>
                <span className="text-purple-600 font-semibold inline-flex items-center">
                  {language === 'de' ? 'Mehr erfahren' : 'Learn more'} <ArrowRight className="ml-2 h-4 w-4" />
                </span>
              </Link>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-16 bg-gradient-to-r from-gray-900 to-gray-800 text-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">{language === 'de' ? 'Bereit für konvertierende Produktbilder?' : 'Ready for Product Images That Convert?'}</h2>
            <p className="text-xl mb-8 opacity-90">{language === 'de' ? 'Schick uns kurz Specs & Deadline – wir schlagen Set & Licht vor und blocken deinen Slot.' : 'Send us your specs & deadline – we\'ll suggest set & lighting and block your slot.'}</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/warteliste" className="inline-flex items-center justify-center px-8 py-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold text-lg">
                {language === 'de' ? 'Wartelisten-Platz sichern' : 'Secure Your Waitlist Spot'}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
              <Link to="/kontakt" className="inline-flex items-center justify-center px-8 py-4 border-2 border-white text-white rounded-lg hover:bg-white/10 transition-colors font-semibold text-lg">
                {language === 'de' ? 'Projekt anfragen' : 'Request a Project'}
              </Link>
            </div>
          </div>
        </section>

        <RelatedServices currentPath="/produkt-fotografie-wien/" />
      </div>
    </Layout>
  );
}
