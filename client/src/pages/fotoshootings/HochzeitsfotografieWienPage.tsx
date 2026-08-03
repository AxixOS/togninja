import { SEOHead } from '../../components/SEO/SEOHead';
import { RelatedServices } from '../../components/SEO/RelatedServices';
import Layout from '../../components/layout/Layout';
import GoogleReviews from '../../components/layout/GoogleReviews';
import MarkdownCopySlot from '../../components/MarkdownCopySlot';
import { newageCopyMap } from '../../content/newageCopyMap';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Camera, Heart, Users, Star, ArrowRight, Check, Clock, MapPin, Gift, Calendar, Sparkles, Shield } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useManualPageContent } from '../../hooks/useManualPageContent';
import { useLanguage } from '../../context/LanguageContext';
import { SITE } from '../../config/site';

export default function HochzeitsfotografieWienPage() {
  const navigate = useNavigate();
  const { addItem } = useCart();
  const t = useManualPageContent('hochzeitsfotografie');
  const { language } = useLanguage();

  // Language-aware fallbacks
  const fallbacks = {
    en: {
      heroTitle: 'Wedding Photography in Vienna',
      heroSubtitle: 'Authentic. Stylish. Unobtrusive.',
      heroDescription: 'We capture your story – from the first glance to the last dance. Modern wedding reportages with emotion, clear visual language and quick sneak peeks.',
      primaryCta: 'Request Appointment',
      secondaryCta: 'Check Availability',
    },
    de: {
      heroTitle: 'Hochzeitsfotografie in Wien',
      heroSubtitle: 'Echt. Stilvoll. Unaufdringlich.',
      heroDescription: 'Wir begleiten eure Geschichte – vom ersten Blick bis zum letzten Tanz. Moderne Hochzeitsreportagen mit viel Gefühl, klarer Bildsprache und schnellen Sneak Peeks.',
      primaryCta: 'Termin unverbindlich anfragen',
      secondaryCta: 'Verfügbarkeit prüfen',
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

  const heroTitle = fromManual('manual.hochzeitsfotografie.heroTitle', fb.heroTitle);
  const heroSubtitle = fromManual('manual.hochzeitsfotografie.heroTagline', fb.heroSubtitle);
  const heroDescription = fromManual('manual.hochzeitsfotografie.heroDescription', fb.heroDescription);
  const primaryCta = fromManual('manual.hochzeitsfotografie.primaryCta', fb.primaryCta);
  const secondaryCta = fromManual('manual.hochzeitsfotografie.secondaryCta', fb.secondaryCta);
  const heroImage1 = fromManual('manual.hochzeitsfotografie.heroImage1', '');
  const heroImage2 = fromManual('manual.hochzeitsfotografie.heroImage2', '');
  const heroImage3 = fromManual('manual.hochzeitsfotografie.heroImage3', '');
  const heroImage4 = fromManual('manual.hochzeitsfotografie.heroImage4', '');
  const heroImage5 = fromManual('manual.hochzeitsfotografie.heroImage5', '');

  const handleBookPackage = (packageName: string, price: number, description: string) => {
    addItem({
      title: packageName,
      price: price,
      quantity: 1,
      packageType: 'Hochzeit',
      type: 'voucher'
    });
    navigate('/cart');
  };

  return (
    <Layout>
      <div className="min-h-screen bg-white">
        <SEOHead
          title={newageCopyMap['hochzeitsfotografie-wien'].title}
          description={newageCopyMap['hochzeitsfotografie-wien'].metaDescription}
          keywords="hochzeitsfotograf wien, hochzeitsfotografie wien, standesamt wien fotos, brautpaarshooting wien"
          canonical="/hochzeitsfotografie-wien/"
          ogImage={`${SITE.url}/images/wedding-hero.jpg`}
          hreflang={[
            { lang: 'de', url: '/hochzeitsfotografie-wien/' },
            { lang: 'en', url: '/en/wedding-photography-vienna/' }
          ]}
        />

        {/* JSON-LD Structured Data */}
        <Helmet>
          <script type="application/ld+json">
            {JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Service',
              name: 'Hochzeitsfotografie Wien',
              serviceType: 'Wedding Photography',
              areaServed: { '@type': 'City', name: 'Wien' },
              provider: { '@type': 'LocalBusiness', name: SITE.name },
              offers: {
                '@type': 'AggregateOffer',
                lowPrice: '599',
                highPrice: '2499',
                priceCurrency: 'EUR'
              },
              hasOfferCatalog: {
                '@type': 'OfferCatalog',
                name: 'Hochzeitsfotografie Pakete',
                itemListElement: [
                  { '@type': 'Offer', name: 'Hochzeitsfotografie Basic', price: '599', priceCurrency: 'EUR' },
                  { '@type': 'Offer', name: 'Hochzeit Basic', price: '1299', priceCurrency: 'EUR' },
                  { '@type': 'Offer', name: 'Hochzeit Premium', price: '2499', priceCurrency: 'EUR' }
                ]
              }
            })}
          </script>
          {/* FAQPage schema — the on-page FAQ was not marked up before; FAQ rich
              results are a major SERP surface for "hochzeitsfotograf wien" queries. */}
          <script type="application/ld+json">
            {JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'FAQPage',
              mainEntity: [
                {
                  '@type': 'Question',
                  name: 'Was kostet ein Hochzeitsfotograf in Wien?',
                  acceptedAnswer: { '@type': 'Answer', text: 'Bei uns starten Hochzeitspakete ab €599 (Auszug mit 30 bearbeiteten Fotos). Standesamt/kleine Feier ab €1.299 (halber Tag, alle Portraits als Datei), ganztägige Begleitung ab €2.499 inkl. aller Bilder, Online-Galerie, Prints und Leinwand-Collage.' }
                },
                {
                  '@type': 'Question',
                  name: 'Wie schnell bekommen wir unsere Hochzeitsfotos?',
                  acceptedAnswer: { '@type': 'Answer', text: 'Sneak Peeks (15–30 Bilder) innerhalb von 24–48 Stunden, die finale Galerie innerhalb von 7 Tagen. Express-Lieferung nach Verfügbarkeit.' }
                },
                {
                  '@type': 'Question',
                  name: 'Wie weit im Voraus sollten wir den Hochzeitsfotografen buchen?',
                  acceptedAnswer: { '@type': 'Answer', text: 'Für Termine in der Hauptsaison (Mai–September) empfehlen wir 6–12 Monate Vorlauf, Standesamt-Termine unter der Woche sind oft auch kurzfristiger möglich.' }
                },
                {
                  '@type': 'Question',
                  name: 'Wie viele Bilder bekommen wir?',
                  acceptedAnswer: { '@type': 'Answer', text: 'Richtwert: 70–100 Bilder pro Stunde, je nach Programmdichte und Gästezahl.' }
                },
                {
                  '@type': 'Question',
                  name: 'Arbeitet ihr bei der Trauung unauffällig?',
                  acceptedAnswer: { '@type': 'Answer', text: 'Ja – leise Kameras, klare Abläufe, koordinierte Gruppenfotos. Emotionen vor Inszenierung; wir kennen die Abläufe der Wiener Standesämter und Kirchen.' }
                }
              ]
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
                <p className="text-xl text-gray-300 mb-4 leading-relaxed font-semibold">
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
                    alt="hochzeitsfotograf wien – Brautpaar im Palais Coburg, Abendlicht"
                    className="rounded-2xl shadow-2xl w-full h-auto object-contain"
                    loading="eager"
                  />
                </div>
                <div>
                  <img
                    src={heroImage2}
                    alt="Hochzeitsfotografie Wien"
                    className="rounded-xl shadow-lg w-full h-auto object-contain"
                    loading="eager"
                  />
                </div>
                <div>
                  <img
                    src={heroImage3}
                    alt="Hochzeit Shooting Wien"
                    className="rounded-xl shadow-lg w-full h-auto object-contain"
                    loading="eager"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        <GoogleReviews />

        {/* Contextual cross-links for SEO */}
        <section className="py-8 bg-purple-50">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <p className="text-base text-gray-600 leading-relaxed">
              {language === 'de' ? (
                <>
                  Neben <strong>Hochzeitsfotografie Wien</strong> bieten wir auch{' '}
                  <Link to="/eventfotografie-wien/" className="text-purple-600 hover:text-purple-700 underline underline-offset-2">Eventfotografie Wien</Link>,{' '}
                  <Link to="/familienfotos-wien/" className="text-purple-600 hover:text-purple-700 underline underline-offset-2">Familienfotos Wien</Link> und{' '}
                  <Link to="/portrait-fotografie-wien/" className="text-purple-600 hover:text-purple-700 underline underline-offset-2">Portraitfotografie Wien</Link> an.
                  Alle{' '}<Link to="/calculator" className="text-purple-600 hover:text-purple-700 underline underline-offset-2">Hochzeitsfotos-Pakete & Preise</Link> – oder direkt{' '}
                  <Link to="/kontakt" className="text-purple-600 hover:text-purple-700 underline underline-offset-2">Termin anfragen</Link>.
                </>
              ) : (
                <>
                  Besides wedding photography, we also offer{' '}
                  <Link to="/eventfotografie-wien/" className="text-purple-600 hover:text-purple-700 underline underline-offset-2">event photography Vienna</Link> and{' '}
                  <Link to="/portrait-fotografie-wien/" className="text-purple-600 hover:text-purple-700 underline underline-offset-2">portrait photography Vienna</Link>.
                  View <Link to="/calculator" className="text-purple-600 hover:text-purple-700 underline underline-offset-2">all packages & prices</Link>.
                </>
              )}
            </p>
          </div>
        </section>

        {/* Extended Content Section - Safe Copy Slot */}
        {language === 'de' && <MarkdownCopySlot content={newageCopyMap['hochzeitsfotografie-wien'].markdown} />}

        {/* Pillar guide: cost + how to choose (search-focused H2s). German-only,
            matching the MarkdownCopySlot pattern — the SEO audience is German. */}
        {language === 'de' && (
          <section className="py-16 bg-white">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Was kostet ein Hochzeitsfotograf in Wien?</h2>
              <p className="text-gray-700 leading-relaxed mb-6">
                Die ehrliche Antwort nach 13+ Jahren im Geschäft: In Wien reicht die Spanne von
                ca. €500 für eine Standesamt-Begleitung bis über €4.000 für Ganztagsreportagen
                mit Album. Entscheidend ist nicht der Stundensatz, sondern was ihr am Ende in
                der Hand habt — Anzahl der bearbeiteten Bilder, Nutzungsrechte und wie schnell
                ihr die Galerie bekommt. So ordnen sich unsere Pakete ein:
              </p>
              <div className="overflow-x-auto mb-8">
                <table className="w-full bg-gray-50 rounded-xl overflow-hidden text-sm">
                  <thead className="bg-purple-600 text-white">
                    <tr>
                      <th className="px-4 py-3 text-left">Anlass</th>
                      <th className="px-4 py-3 text-left">Typischer Umfang</th>
                      <th className="px-4 py-3 text-left">Unser Paket</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    <tr><td className="px-4 py-3 font-medium">Standesamt kompakt</td><td className="px-4 py-3">2–3 Std., Zeremonie + Paarshoot</td><td className="px-4 py-3">ab €599</td></tr>
                    <tr><td className="px-4 py-3 font-medium">Standesamt / kleine Feier</td><td className="px-4 py-3">Halber Tag, alle Portraits als Datei</td><td className="px-4 py-3">ab €1.299</td></tr>
                    <tr><td className="px-4 py-3 font-medium">Ganztägige Hochzeit</td><td className="px-4 py-3">Getting Ready bis Party, alle Bilder + Galerie + Leinwand</td><td className="px-4 py-3">ab €2.499</td></tr>
                  </tbody>
                </table>
              </div>
              <p className="text-gray-700 leading-relaxed mb-10">
                Alle Details auf der <Link to="/preise/" className="text-purple-600 hover:text-purple-700 underline underline-offset-2">Preisseite</Link> —
                und wer erst später heiratet: Pakete sind bis zu 2 Jahre gültig und damit auch
                als <Link to="/vouchers" className="text-purple-600 hover:text-purple-700 underline underline-offset-2">Geschenkgutschein</Link> beliebt.
              </p>

              <h2 className="text-3xl font-bold text-gray-900 mb-6">Wie findet ihr den richtigen Hochzeitsfotografen in Wien?</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Drei Fragen trennen nach unserer Erfahrung die guten von den falschen Entscheidungen:
              </p>
              <ul className="space-y-3 text-gray-700 mb-6 list-disc pl-6">
                <li><strong>Passt der Stil zu euch?</strong> Schaut nicht auf Einzelbilder, sondern auf ganze Reportagen im <Link to="/portfolio" className="text-purple-600 hover:text-purple-700 underline underline-offset-2">Portfolio</Link> — ein Fotograf, der nur „Best-ofs" zeigt, zeigt nicht, wie er einen Regentag rettet.</li>
                <li><strong>Wie arbeitet er/sie am Tag selbst?</strong> Fragt nach dem Ablauf bei Gruppenfotos und der Zeremonie. Unsere Antwort steht oben — dezent, koordiniert, Emotionen vor Inszenierung.</li>
                <li><strong>Was sagen echte Paare?</strong> Lest Bewertungen mit Details, nicht nur Sterne: unsere <Link to="/kundenstimmen/" className="text-purple-600 hover:text-purple-700 underline underline-offset-2">Kundenstimmen (4,9★ auf Google)</Link>.</li>
              </ul>
              <p className="text-gray-700 leading-relaxed">
                Und der wichtigste Praxis-Tipp für Wien: Bucht das Standesamt unter der Woche,
                wenn ihr flexibel seid — Termine sind leichter zu bekommen, die Locations
                (Hofburg bis Alte Donau) sind leerer, und das Licht am späten Nachmittag gehört euch.
                Fragen? <Link to="/kontakt" className="text-purple-600 hover:text-purple-700 underline underline-offset-2">Schreibt uns direkt</Link>.
              </p>
            </div>
          </section>
        )}

        {/* Feature Image 4 */}
        {heroImage4 && (
          <section className="py-16 bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <img
                src={heroImage4}
                alt="Hochzeitsfotografie Wien – Emotional Wedding Moment"
                className="w-full h-auto rounded-2xl shadow-2xl object-cover"
                loading="lazy"
              />
            </div>
          </section>
        )}

        {/* Was wir festhalten */}
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">{language === 'de' ? 'Was wir festhalten' : 'What We Capture'}</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              <div className="bg-gray-50 rounded-xl p-6">
                <Heart className="h-10 w-10 text-pink-600 mb-4" />
                <h3 className="font-semibold text-lg mb-2 text-gray-900">{language === 'de' ? 'Emotionen & echte Momente' : 'Emotions & Real Moments'}</h3>
                <p className="text-gray-600 text-sm">{language === 'de' ? 'First Look, Freudentränen, Umarmungen, Lachen – wertvolle Augenblicke, ungestellt eingefangen.' : 'First look, tears of joy, hugs, laughter – precious moments captured candidly.'}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-6">
                <Users className="h-10 w-10 text-purple-600 mb-4" />
                <h3 className="font-semibold text-lg mb-2 text-gray-900">{language === 'de' ? 'Familie & Freunde' : 'Family & Friends'}</h3>
                <p className="text-gray-600 text-sm">{language === 'de' ? 'Brautpaar, Trauzeug:innen, Generationen – Gruppenbilder mit Ruhe und klarer Anleitung.' : 'Bride & groom, witnesses, generations – group photos with calm and clear guidance.'}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-6">
                <Camera className="h-10 w-10 text-purple-600 mb-4" />
                <h3 className="font-semibold text-lg mb-2 text-gray-900">{language === 'de' ? 'Details & Atmosphäre' : 'Details & Atmosphere'}</h3>
                <p className="text-gray-600 text-sm">{language === 'de' ? 'Papeterie, Ringe, Floristik, Location, Lichtstimmungen – alles, was ihr geplant habt.' : 'Stationery, rings, florals, venue, light moods – everything you planned.'}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-6">
                <Sparkles className="h-10 w-10 text-purple-600 mb-4" />
                <h3 className="font-semibold text-lg mb-2 text-gray-900">{language === 'de' ? 'Brautpaar-Shoot' : 'Couple Shoot'}</h3>
                <p className="text-gray-600 text-sm">{language === 'de' ? 'Locker geführt, mit natürlicher Pose – 20–40 Minuten reichen für zeitlose Portraits.' : 'Relaxed guidance with natural poses – 20–40 minutes for timeless portraits.'}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-6">
                <Calendar className="h-10 w-10 text-purple-600 mb-4" />
                <h3 className="font-semibold text-lg mb-2 text-gray-900">{language === 'de' ? 'Standesamt & Kirche' : 'Registry Office & Church'}</h3>
                <p className="text-gray-600 text-sm">{language === 'de' ? 'Dezente Begleitung, respektvoll & erfahren – wir kennen Abläufe und Licht.' : 'Discreet accompaniment, respectful & experienced – we know the workflows and lighting.'}</p>
              </div>
              <div className="bg-purple-50 rounded-xl p-6 border-2 border-purple-200">
                <Shield className="h-10 w-10 text-purple-600 mb-4" />
                <h3 className="font-semibold text-lg mb-2 text-gray-900">{language === 'de' ? 'Sorglos-Paket' : 'Worry-Free Package'}</h3>
                <p className="text-gray-700 text-sm font-medium">{language === 'de' ? 'Dual-Card Sicherung, redundante Backups & geschützte Online-Galerie – eure Bilder sind safe.' : 'Dual-card backup, redundant backups & protected online gallery – your photos are safe.'}</p>
              </div>
            </div>
          </div>
        </section>

        {/* SLAs */}
        <section className="py-16 bg-gray-50">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-center mb-8">{language === 'de' ? 'Lieferzeiten (SLA)' : 'Delivery Times (SLA)'}</h2>
            <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-6">
              <table className="w-full">
                <thead className="bg-purple-600 text-white">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Asset</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">{language === 'de' ? 'Umfang' : 'Scope'}</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">{language === 'de' ? 'SLA Standard' : 'SLA Standard'}</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">{language === 'de' ? 'SLA Express*' : 'SLA Express*'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  <tr className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">Sneak Peek</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{language === 'de' ? '15–30 Bilder' : '15–30 images'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">24–48 h</td>
                    <td className="px-6 py-4 text-sm text-purple-600 font-semibold">≤ 12 h</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{language === 'de' ? 'Finale Galerie' : 'Final Gallery'}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{language === 'de' ? '300–900+ Bilder' : '300–900+ images'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{language === 'de' ? 'innerhalb von 7 Tagen' : 'within seven days'}</td>
                    <td className="px-6 py-4 text-sm text-purple-600 font-semibold">{language === 'de' ? '5–7 Tage' : '5–7 days'}</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{language === 'de' ? 'Drucke & Alben' : 'Prints & Albums'}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">Fine-Art Prints / Album</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{language === 'de' ? '+1–3 Wochen' : '+1–3 weeks'}</td>
                    <td className="px-6 py-4 text-sm text-purple-600 font-semibold">{language === 'de' ? 'nach Absprache' : 'by arrangement'}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="bg-purple-100 rounded-xl p-4 text-center">
              <p className="text-sm text-gray-700"><strong>*Express</strong> {language === 'de' ? 'nach Verfügbarkeit; Aufpreis je nach Umfang.' : 'subject to availability; surcharge depending on scope.'}</p>
            </div>
          </div>
        </section>

        {/* Feature Image 5 */}
        {heroImage5 && (
          <section className="py-16 bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <img
                src={heroImage5}
                alt="Hochzeitsfotografie Wien – Beautiful Wedding Celebration"
                className="w-full h-auto rounded-2xl shadow-2xl object-cover"
                loading="lazy"
              />
            </div>
          </section>
        )}

        {/* Pakete & Preise */}
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">{language === 'de' ? 'Pakete & Preise' : 'Packages & Prices'}</h2>
            </div>
            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto mb-12">
              {/* Hochzeitsfotografie Basic */}
              <div className="bg-white rounded-2xl shadow-lg p-8 hover:shadow-xl transition-shadow border border-purple-200">
                <div className="mb-6">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">{language === 'de' ? 'Hochzeitsfotografie Basic' : 'Wedding Photography Basic'}</h3>
                </div>
                <div className="mb-6">
                  <div className="flex items-baseline">
                    <span className="text-sm text-gray-500 mr-1">{language === 'de' ? 'Ab' : 'From'}</span>
                    <span className="text-4xl font-bold text-purple-600">€599</span>
                  </div>
                </div>
                <div className="space-y-4 mb-8">
                  <div className="flex items-start"><Check className="h-5 w-5 text-green-500 mr-3 mt-0.5" /><span className="text-gray-700">{language === 'de' ? 'Hochzeitsbegleitung (Auszug)' : 'Wedding coverage (excerpt)'}</span></div>
                  <div className="flex items-start"><Check className="h-5 w-5 text-green-500 mr-3 mt-0.5" /><span className="text-gray-700">{language === 'de' ? 'Inkl. 30 bearbeiteter Fotos' : 'Incl. 30 edited photos'}</span></div>
                  <div className="flex items-start"><Check className="h-5 w-5 text-green-500 mr-3 mt-0.5" /><span className="text-gray-700">{language === 'de' ? 'Gültig bis 2 Jahre' : 'Valid for up to 2 years'}</span></div>
                </div>
                <Link
                  to="/kontakt"
                  className="block w-full text-center px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-semibold"
                >
                  {language === 'de' ? 'Jetzt sichern' : 'Book now'}
                </Link>
              </div>

              {/* Hochzeit Basic (Beliebt) */}
              <div className="bg-gradient-to-br from-purple-600 to-pink-600 text-white rounded-2xl shadow-2xl p-8 transform sm:scale-105 relative">
                <div className="absolute top-0 right-0 bg-yellow-400 text-gray-900 text-sm font-bold px-4 py-2 rounded-bl-lg rounded-tr-2xl">{language === 'de' ? 'BELIEBT' : 'POPULAR'}</div>
                <div className="mb-6 mt-4">
                  <h3 className="text-2xl font-bold mb-2">{language === 'de' ? 'Hochzeit Basic' : 'Wedding Basic'}</h3>
                </div>
                <div className="mb-6">
                  <div className="flex items-baseline">
                    <span className="text-sm text-purple-200 mr-1">{language === 'de' ? 'Ab' : 'From'}</span>
                    <span className="text-4xl font-bold">€1.299</span>
                  </div>
                </div>
                <div className="space-y-4 mb-8">
                  <div className="flex items-start"><Check className="h-5 w-5 text-yellow-300 mr-3 mt-0.5" /><span>{language === 'de' ? 'Standesamt oder kleine Feier' : 'Registry office or small celebration'}</span></div>
                  <div className="flex items-start"><Check className="h-5 w-5 text-yellow-300 mr-3 mt-0.5" /><span>{language === 'de' ? 'Alle Portraits als Datei – Halber Tag' : 'All portraits as files – half day'}</span></div>
                  <div className="flex items-start"><Check className="h-5 w-5 text-yellow-300 mr-3 mt-0.5" /><span>{language === 'de' ? 'Stunden nach Wunsch' : 'Hours as desired'}</span></div>
                  <div className="flex items-start"><Check className="h-5 w-5 text-yellow-300 mr-3 mt-0.5" /><span>{language === 'de' ? 'Gültig bis 2 Jahre' : 'Valid for up to 2 years'}</span></div>
                </div>
                <Link
                  to="/kontakt"
                  className="block w-full text-center px-6 py-3 bg-white text-purple-600 rounded-lg hover:bg-gray-100 transition-colors font-semibold"
                >
                  {language === 'de' ? 'Jetzt sichern' : 'Book now'}
                </Link>
              </div>

              {/* Hochzeit Premium */}
              <div className="bg-white rounded-2xl shadow-lg p-8 hover:shadow-xl transition-shadow border border-purple-200">
                <div className="mb-6">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">{language === 'de' ? 'Hochzeit Premium' : 'Wedding Premium'}</h3>
                </div>
                <div className="mb-6">
                  <div className="flex items-baseline">
                    <span className="text-sm text-gray-500 mr-1">{language === 'de' ? 'Ab' : 'From'}</span>
                    <span className="text-4xl font-bold text-purple-600">€2.499</span>
                  </div>
                </div>
                <div className="space-y-4 mb-8">
                  <div className="flex items-start"><Check className="h-5 w-5 text-green-500 mr-3 mt-0.5" /><span className="text-gray-700">{language === 'de' ? 'Ganztägige Hochzeit – alle Bilder' : 'Full-day wedding – all images'}</span></div>
                  <div className="flex items-start"><Check className="h-5 w-5 text-green-500 mr-3 mt-0.5" /><span className="text-gray-700">{language === 'de' ? 'Online-Galerie, Prints & Leinwand-Collage' : 'Online gallery, prints & canvas collage'}</span></div>
                  <div className="flex items-start"><Check className="h-5 w-5 text-green-500 mr-3 mt-0.5" /><span className="text-gray-700">{language === 'de' ? 'Porträts nach Wahl' : 'Portraits of your choice'}</span></div>
                  <div className="flex items-start"><Check className="h-5 w-5 text-green-500 mr-3 mt-0.5" /><span className="text-gray-700">{language === 'de' ? 'Gültig bis 2 Jahre' : 'Valid for up to 2 years'}</span></div>
                </div>
                <Link
                  to="/kontakt"
                  className="block w-full text-center px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-semibold"
                >
                  {language === 'de' ? 'Jetzt sichern' : 'Book now'}
                </Link>
              </div>
            </div>

            <div className="mt-6 text-center">
              <p className="text-gray-600">
                {language === 'de' ? <>Termine sind limitiert. Trag euch hier ein: <Link to="/warteliste" className="text-purple-600 hover:text-purple-700 underline font-semibold">Warteliste</Link></> : <>Dates are limited. Sign up here: <Link to="/warteliste" className="text-purple-600 hover:text-purple-700 underline font-semibold">Waitlist</Link></>}
              </p>
            </div>
          </div>
        </section>

        {/* Beispiel-Timeline */}
        <section className="py-16 bg-gray-50">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-center mb-8">{language === 'de' ? 'Beispiel-Timelines' : 'Example Timelines'}</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <h3 className="font-semibold text-gray-900 mb-2">{language === 'de' ? 'Standesamt (2–3 Std.)' : 'Registry Office (2–3 hrs)'}</h3>
                <ul className="text-sm text-gray-700 space-y-2">
                  <li>{language === 'de' ? '• Ankunft & Begrüßung – 15 Min' : '• Arrival & greeting – 15 min'}</li>
                  <li>{language === 'de' ? '• Zeremonie – 20–30 Min' : '• Ceremony – 20–30 min'}</li>
                  <li>{language === 'de' ? '• Gratulation & Gruppen – 20–40 Min' : '• Congratulations & groups – 20–40 min'}</li>
                  <li>{language === 'de' ? '• Paarshoot in der Nähe – 20–30 Min' : '• Couple shoot nearby – 20–30 min'}</li>
                </ul>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <h3 className="font-semibold text-gray-900 mb-2">Classic (6 {language === 'de' ? 'Std.' : 'hrs'})</h3>
                <ul className="text-sm text-gray-700 space-y-2">
                  <li>• Getting Ready – 60 Min</li>
                  <li>{language === 'de' ? '• First Look & Paarshoot – 40 Min' : '• First look & couple shoot – 40 min'}</li>
                  <li>{language === 'de' ? '• Trauung – 30–45 Min' : '• Ceremony – 30–45 min'}</li>
                  <li>{language === 'de' ? '• Agape & Gruppen – 60–90 Min' : '• Reception & groups – 60–90 min'}</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Beliebte Wien-Locations */}
        <section className="py-16 bg-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-center mb-8">{language === 'de' ? 'Beliebte Locations in Wien' : 'Popular Locations in Vienna'}</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 text-sm">
              <div className="bg-gray-50 rounded-xl p-5 flex items-start"><MapPin className="h-5 w-5 text-purple-600 mr-2 mt-0.5" />Hofburg • Palais Coburg • Belvedere</div>
              <div className="bg-gray-50 rounded-xl p-5 flex items-start"><MapPin className="h-5 w-5 text-purple-600 mr-2 mt-0.5" />Rathaus • Alte Donau • Augarten</div>
              <div className="bg-gray-50 rounded-xl p-5 flex items-start"><MapPin className="h-5 w-5 text-purple-600 mr-2 mt-0.5" />Schlosspark Laxenburg • Kahlenberg</div>
              <div className="bg-gray-50 rounded-xl p-5 flex items-start"><MapPin className="h-5 w-5 text-purple-600 mr-2 mt-0.5" />Stadtpark • Museumsquartier • Volksgarten</div>
              <div className="bg-gray-50 rounded-xl p-5 flex items-start"><MapPin className="h-5 w-5 text-purple-600 mr-2 mt-0.5" />{language === 'de' ? 'Standesamt Wien' : 'Registry Office Vienna'} • <a className="underline text-purple-600 hover:text-purple-700" target="_blank" rel="noopener noreferrer" href="https://www.wien.gv.at/verwaltung/ma63/ehe/standesamt.html">{language === 'de' ? 'Termin & Infos' : 'Appointments & Info'}</a></div>
              <div className="bg-purple-50 rounded-xl p-5 flex items-start border-2 border-purple-200"><Gift className="h-5 w-5 text-purple-600 mr-2 mt-0.5" />{language === 'de' ? 'Tipp: Plant 20–30 Min Puffer um Licht optimal zu nutzen.' : 'Tip: Plan 20–30 min buffer to make the most of the light.'}</div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-16 bg-gray-50">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-center mb-12">{fromManual('manual.hochzeitsfotografie.faqHeading', 'FAQ')}</h2>
            <div className="space-y-6">
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <h3 className="font-bold text-lg text-gray-900 mb-2">{fromManual('manual.hochzeitsfotografie.faqQ1', 'Wie schnell bekommen wir Fotos?')}</h3>
                <p className="text-gray-600">{fromManual('manual.hochzeitsfotografie.faqA1', 'Sneak Peeks gibt’s in 24–48 Stunden, die vollständige Galerie in 2–4 Wochen – schneller als Express möglich.')}</p>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <h3 className="font-bold text-lg text-gray-900 mb-2">{fromManual('manual.hochzeitsfotografie.faqQ2', 'Arbeitet ihr unauffällig?')}</h3>
                <p className="text-gray-600">{fromManual('manual.hochzeitsfotografie.faqA2', 'Ja – leise Kameras, klare Abläufe, koordinierte Gruppenfotos. Emotionen vor Inszenierung.')}</p>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <h3 className="font-bold text-lg text-gray-900 mb-2">{fromManual('manual.hochzeitsfotografie.faqQ3', 'Wie viele Bilder bekommen wir?')}</h3>
                <p className="text-gray-600">{fromManual('manual.hochzeitsfotografie.faqA3', 'Richtwert: 70–100 Bilder pro Stunde je nach Programmdichte und Gästezahl.')}</p>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <h3 className="font-bold text-lg text-gray-900 mb-2">{fromManual('manual.hochzeitsfotografie.faqQ4', 'Was ist mit Datensicherheit?')}</h3>
                <p className="text-gray-600">{fromManual('manual.hochzeitsfotografie.faqA4', 'Dual-Card Aufnahme, redundante Backups am selben Tag und sichere Online-Galerie mit Passwort.')}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Verwandte Services */}
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-center mb-8">{language === 'de' ? 'Verwandte Shootings' : 'Related Shoots'}</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <Link to="/schwangerschaftsfotos-wien/" className="block bg-purple-50 rounded-xl p-6 hover:shadow-lg transition-shadow">
                <Heart className="h-10 w-10 text-purple-600 mb-4" />
                <h3 className="font-semibold text-lg mb-2 text-gray-900">{language === 'de' ? 'Schwangerschaft' : 'Maternity'}</h3>
                <p className="text-gray-600 text-sm mb-4">{language === 'de' ? 'Zeitlose Momente – elegant & modern' : 'Timeless moments – elegant & modern'}</p>
                <span className="text-purple-600 font-semibold flex items-center">{language === 'de' ? 'Mehr erfahren' : 'Learn more'} <ArrowRight className="ml-1 h-4 w-4" /></span>
              </Link>
              <Link to="/familienfotos-wien/" className="block bg-purple-50 rounded-xl p-6 hover:shadow-lg transition-shadow">
                <Users className="h-10 w-10 text-purple-600 mb-4" />
                <h3 className="font-semibold text-lg mb-2 text-gray-900">{language === 'de' ? 'Familienfotos' : 'Family Photos'}</h3>
                <p className="text-gray-600 text-sm mb-4">{language === 'de' ? 'Natürlich & lebendig – im Studio oder Outdoor' : 'Natural & vibrant – in studio or outdoor'}</p>
                <span className="text-purple-600 font-semibold flex items-center">{language === 'de' ? 'Mehr erfahren' : 'Learn more'} <ArrowRight className="ml-1 h-4 w-4" /></span>
              </Link>
              <Link to="/babyfotos-wien/" className="block bg-purple-50 rounded-xl p-6 hover:shadow-lg transition-shadow">
                <Camera className="h-10 w-10 text-purple-600 mb-4" />
                <h3 className="font-semibold text-lg mb-2 text-gray-900">{language === 'de' ? 'Babyfotos' : 'Baby Photos'}</h3>
                <p className="text-gray-600 text-sm mb-4">{language === 'de' ? '3–12 Monate – sicher & liebevoll' : '3–12 months – safe & loving'}</p>
                <span className="text-purple-600 font-semibold flex items-center">{language === 'de' ? 'Mehr erfahren' : 'Learn more'} <ArrowRight className="ml-1 h-4 w-4" /></span>
              </Link>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-16 bg-gradient-to-r from-gray-900 to-gray-800 text-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">{language === 'de' ? 'Bereit für eure Hochzeitsfotos in Wien?' : 'Ready for Your Wedding Photos in Vienna?'}</h2>
            <p className="text-xl mb-8 opacity-90">{language === 'de' ? 'Sichert euch euren Termin – Sneak Peeks binnen 24–48 Stunden.' : 'Secure your date – sneak peeks within 24–48 hours.'}</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/warteliste" className="inline-flex items-center justify-center px-8 py-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold text-lg">
                {language === 'de' ? 'Termin anfragen' : 'Request Appointment'}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
              <Link to="/kontakt" className="inline-flex items-center justify-center px-8 py-4 border-2 border-white text-white rounded-lg hover:bg-white/10 transition-colors font-semibold text-lg">
                {language === 'de' ? 'Verfügbarkeit prüfen' : 'Check Availability'}
              </Link>
            </div>
          </div>
        </section>

        {/* Wedding cluster hub — the pillar links out to every wedding-adjacent
            page; wedding blog posts link back here as they publish. */}
        {language === 'de' && (
          <section className="py-12 bg-gray-50">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Rund um eure Hochzeit</h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                <Link to="/fotoshootings/wedding" className="bg-white rounded-xl p-5 hover:shadow-md transition-shadow text-purple-700 font-medium">
                  Hochzeits-Shooting buchen →
                </Link>
                <Link to="/eventfotografie-wien/" className="bg-white rounded-xl p-5 hover:shadow-md transition-shadow text-purple-700 font-medium">
                  Eventfotografie (Polterabend & Feier) →
                </Link>
                <Link to="/schwangerschaftsfotos-wien/" className="bg-white rounded-xl p-5 hover:shadow-md transition-shadow text-purple-700 font-medium">
                  Paar- & Babybauch-Shooting →
                </Link>
                <Link to="/blog" className="bg-white rounded-xl p-5 hover:shadow-md transition-shadow text-purple-700 font-medium">
                  Hochzeits-Tipps im Blog →
                </Link>
              </div>
            </div>
          </section>
        )}

        <RelatedServices currentPath="/hochzeitsfotografie-wien/" />
      </div>
    </Layout>
  );
}
