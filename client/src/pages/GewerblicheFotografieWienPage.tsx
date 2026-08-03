import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import Layout from '../components/layout/Layout';
import { SEOHead } from '../components/SEO/SEOHead';
import GoogleReviews from '../components/layout/GoogleReviews';
import { useLanguage } from '../context/LanguageContext';
import { SITE } from '../config/site';
import { Camera, Building2, Package, CalendarDays, Users, ArrowRight, Check } from 'lucide-react';

/**
 * Commercial / B2B pillar page (July 2026 SEO audit: "Kommerzielle & Event
 * Fotografie" had no unifying hub). Consolidates product, real-estate, event,
 * team and business-portrait photography under one authority page with
 * hub-and-spoke internal links.
 */
export default function GewerblicheFotografieWienPage() {
  const { language, t } = useLanguage();
  const de = language === 'de';

  // Same pattern as the fotoshooting pages: every visible string resolves via
  // t(), which overlays published Manual Website Update content (Settings →
  // Manual Website Update → "Gewerbliche Fotografie") over these defaults.
  const fromManual = (key: string, fallback: string) => {
    const value = t(key);
    if (!value || value === key) return fallback;
    return value;
  };

  const services = [
    { icon: Package, n: 1, to: '/produkt-fotografie-wien/' },
    { icon: Building2, n: 2, to: '/immobilien-fotografie-wien/' },
    { icon: CalendarDays, n: 3, to: '/eventfotografie-wien/' },
    { icon: Users, n: 4, to: '/teamfotos-wien/' },
    { icon: Camera, n: 5, to: '/business-portrait-wien/' },
  ].map((s) => ({
    icon: s.icon,
    to: s.to,
    title: fromManual(`manual.gewerbliche.svc${s.n}Title`, ''),
    desc: fromManual(`manual.gewerbliche.svc${s.n}Desc`, ''),
  }));

  return (
    <Layout>
      <div className="min-h-screen bg-white">
        <SEOHead
          title={language === 'de'
            ? 'Gewerbliche Fotografie Wien – Produkte, Immobilien, Events & Teams | New Age Fotografie'
            : 'Commercial Photography Vienna – Products, Real Estate, Events & Teams | New Age Fotografie'}
          description={language === 'de'
            ? 'Ein Ansprechpartner für Business-Fotografie in Wien: Produktfotos, Immobilienfotografie, Eventfotografie, Teamfotos und Business-Portraits. 13+ Jahre Erfahrung, 4,9★.'
            : 'One partner for business photography in Vienna: product photos, real-estate photography, event photography, team photos and business portraits. 13+ years’ experience, 4.9★.'}
          keywords="gewerbliche fotografie wien, business fotograf wien, firmenfotograf wien, produktfotografie, immobilienfotografie, eventfotografie"
          canonical="/gewerbliche-fotografie-wien/"
        />
        <Helmet>
          <script type="application/ld+json">
            {JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Service',
              name: 'Gewerbliche Fotografie Wien',
              serviceType: 'Commercial Photography',
              areaServed: { '@type': 'City', name: 'Wien' },
              provider: { '@type': 'LocalBusiness', name: SITE.name },
            })}
          </script>
          <script type="application/ld+json">
            {JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'FAQPage',
              mainEntity: [
                {
                  '@type': 'Question',
                  name: 'Welche gewerblichen Foto-Leistungen bietet ihr in Wien an?',
                  acceptedAnswer: { '@type': 'Answer', text: 'Produktfotografie, Immobilienfotografie (innen/außen, 360°), Eventfotografie, Team- & Mitarbeiterfotos sowie Business-Portraits und LinkedIn-Fotos — im Studio in 1050 Wien oder bei Ihnen vor Ort.' }
                },
                {
                  '@type': 'Question',
                  name: 'Erhalten wir kommerzielle Nutzungsrechte an den Bildern?',
                  acceptedAnswer: { '@type': 'Answer', text: 'Ja. Business-Pakete beinhalten die vereinbarten kommerziellen Nutzungsrechte — je nach Paket bis zu unbegrenzten Drucken und uneingeschränkter Online-Nutzung.' }
                },
                {
                  '@type': 'Question',
                  name: 'Fotografiert ihr im Studio oder bei uns im Unternehmen?',
                  acceptedAnswer: { '@type': 'Answer', text: 'Beides. Teamfotos und Portraits machen wir wahlweise im Tageslichtstudio (1050 Wien, U4 Kettenbrückengasse) oder onsite in Ihrem Büro; Immobilien und Events naturgemäß vor Ort.' }
                }
              ]
            })}
          </script>
        </Helmet>

        {/* Hero */}
        <section className="relative bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white pt-24 pb-16">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
              {fromManual('manual.gewerbliche.heroTitle', de ? 'Gewerbliche Fotografie in Wien' : 'Commercial Photography in Vienna')}
            </h1>
            <p className="text-xl text-gray-300 mb-8 leading-relaxed max-w-3xl mx-auto">
              {fromManual('manual.gewerbliche.heroDescription', '')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/kontakt" className="inline-flex items-center justify-center px-8 py-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold text-lg">
                {fromManual('manual.gewerbliche.primaryCta', de ? 'Projekt anfragen' : 'Request a Quote')}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
              <Link to="/portfolio" className="inline-flex items-center justify-center px-8 py-4 border-2 border-white text-white rounded-lg hover:bg-white/10 transition-colors font-semibold text-lg">
                {fromManual('manual.gewerbliche.secondaryCta', de ? 'Portfolio ansehen' : 'View Portfolio')}
              </Link>
            </div>
          </div>
        </section>

        <GoogleReviews />

        {/* Service hub */}
        <section className="py-16 bg-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
              {fromManual('manual.gewerbliche.servicesTitle', de ? 'Unsere Business-Leistungen' : 'Our Business Services')}
            </h2>
            <p className="text-gray-600 text-center mb-12 max-w-2xl mx-auto">
              {fromManual('manual.gewerbliche.servicesIntro', '')}
            </p>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {services.map((s) => (
                <Link key={s.to} to={s.to} className="block bg-gray-50 rounded-xl p-6 hover:shadow-lg transition-shadow border border-gray-100">
                  <s.icon className="h-10 w-10 text-purple-600 mb-4" />
                  <h3 className="font-semibold text-lg mb-2 text-gray-900">{s.title}</h3>
                  <p className="text-gray-600 text-sm mb-4">{s.desc}</p>
                  <span className="text-purple-600 font-semibold flex items-center text-sm">
                    {de ? 'Details & Preise' : 'Details & pricing'} <ArrowRight className="ml-1 h-4 w-4" />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Why one studio (German guide content) */}
        {de && (
          <section className="py-16 bg-gray-50">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">{fromManual('manual.gewerbliche.whyTitle', 'Warum ein Studio für alle Business-Fotos?')}</h2>
              <p className="text-gray-700 leading-relaxed mb-6">
                {fromManual('manual.gewerbliche.whyIntro', '')}
              </p>
              <ul className="space-y-3 text-gray-700 mb-8 list-none">
                <li className="flex items-start"><Check className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />Ein Briefing, ein Look — vom LinkedIn-Portrait bis zum Produktbild im Shop.</li>
                <li className="flex items-start"><Check className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />Klare Nutzungsrechte pro Paket, transparent auf der <Link to="/preise/" className="text-purple-600 hover:text-purple-700 underline underline-offset-2">Preisseite</Link>.</li>
                <li className="flex items-start"><Check className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />Studio in 1050 Wien (U4 Kettenbrückengasse) oder onsite bei Ihnen — auch kurzfristig.</li>
                <li className="flex items-start"><Check className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />Referenzen: 4,9★ auf Google — <Link to="/kundenstimmen/" className="text-purple-600 hover:text-purple-700 underline underline-offset-2">Kundenstimmen lesen</Link>.</li>
              </ul>
              <p className="text-gray-700 leading-relaxed">
                Unsicher, welches Format Ihr Projekt braucht? Schildern Sie uns kurz den Anlass —
                wir antworten mit einem konkreten Vorschlag samt Preis:{' '}
                <Link to="/kontakt" className="text-purple-600 hover:text-purple-700 underline underline-offset-2 font-medium">Projekt anfragen</Link>.
              </p>
            </div>
          </section>
        )}

        {/* Final CTA */}
        <section className="py-16 bg-gradient-to-r from-gray-900 to-gray-800 text-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-bold mb-6">{fromManual('manual.gewerbliche.finalCtaTitle', de ? 'Bereit für konsistente Business-Bilder?' : 'Ready for consistent business imagery?')}</h2>
            <Link to="/kontakt" className="inline-flex items-center justify-center px-8 py-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold text-lg">
              {fromManual('manual.gewerbliche.finalCtaButton', de ? 'Projekt anfragen' : 'Request a Quote')}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </div>
        </section>
      </div>
    </Layout>
  );
}
