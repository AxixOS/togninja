import React from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import Layout from '../../components/layout/Layout';
import { SEOHead } from '../../components/SEO/SEOHead';
import { RelatedTopicsBlock } from '../../components/SEO/RelatedTopicsBlock';
import { useLanguage } from '../../context/LanguageContext';
import { SITE } from '../../config/site';
import { Camera, Check, Calendar, Gift, MapPin } from 'lucide-react';

/**
 * Geo-targeted SEO landing page for "Fotoshooting Preise Wien".
 * Additive: does NOT replace the existing /preise/ page, it complements it
 * by capturing local search intent and routing visitors to /preise/ for
 * the full price list and to service pages for context.
 */
const FotoshootingPreiseWienPage: React.FC = () => {
  const { language } = useLanguage();
  const isDe = language === 'de';

  const faqs = isDe
    ? [
        {
          q: 'Was kostet ein Fotoshooting in Wien?',
          a: 'Unsere Pakete starten ab €95 für ein kompaktes Familien- oder Business-Shooting im Studio in Wien 1050. Die volle Preisliste finden Sie auf unserer Seite Preise.',
        },
        {
          q: 'Sind die Bilder und die Bearbeitung im Preis enthalten?',
          a: 'Ja. Jedes Paket enthält die Profibearbeitung der ausgewählten Bilder, eine Online-Auswahlgalerie und private Nutzungsrechte. Zusatzbilder oder Prints sind optional zubuchbar.',
        },
        {
          q: 'Gibt es versteckte Kosten?',
          a: 'Nein. Unsere Preise in Wien sind transparent. Bei Sonderwünschen (z. B. Outdoor-Location außerhalb Wiens, Express-Bearbeitung) besprechen wir Aufpreise vorab schriftlich.',
        },
        {
          q: 'Kann ich ein Fotoshooting verschenken?',
          a: 'Ja, jedes Paket ist als Gutschein erhältlich. Sie können den Gutschein direkt online kaufen und per E-Mail oder gedruckt verschenken.',
        },
        {
          q: 'Wie buche ich ein Shooting in Wien?',
          a: 'Sie können direkt einen Termin anfragen, sich auf die Warteliste setzen oder uns kontaktieren. Wir bestätigen Ihre Verfügbarkeit innerhalb von 24 Stunden.',
        },
      ]
    : [
        {
          q: 'How much does a photoshoot in Vienna cost?',
          a: 'Our packages start from €95 for a compact family or business shoot at our studio in Vienna 1050. You can find the full price list on our Pricing page.',
        },
        {
          q: 'Are the images and editing included in the price?',
          a: 'Yes. Every package includes professional editing of your chosen images, an online selection gallery, and private usage rights. Extra images or prints can be added optionally.',
        },
        {
          q: 'Are there any hidden costs?',
          a: 'No. Our Vienna pricing is transparent. For special requests (e.g. outdoor locations outside Vienna, express editing), we discuss surcharges in writing in advance.',
        },
        {
          q: 'Can I gift a photoshoot?',
          a: 'Yes, every package is available as a voucher. You can purchase it online and send it by email or printed as a gift.',
        },
        {
          q: 'How do I book a session in Vienna?',
          a: 'You can request a date directly, join the waitlist, or contact us. We confirm availability within 24 hours.',
        },
      ];

  return (
    <Layout>
      <SEOHead
        title={
          isDe
            ? `Fotoshooting Preise Wien – transparente Pakete ab €95 | ${SITE.name}`
            : `Photoshoot Pricing Vienna – transparent packages from €95 | ${SITE.name}`
        }
        description={
          isDe
            ? 'Transparente Fotoshooting Preise in Wien: Familien-, Baby-, Schwangerschafts- und Business-Pakete ab €95. Studio in Wien 1050, Online-Galerie & Nutzungsrechte inklusive.'
            : 'Transparent photoshoot pricing in Vienna: family, baby, maternity and business packages from €95. Studio in Vienna 1050, online gallery & usage rights included.'
        }
        keywords={
          isDe
            ? 'Fotoshooting Preise Wien, Fotograf Wien Preise, Familienfotos Preis, Babyfotos Preis Wien, Business Portrait Preis Wien'
            : 'Photoshoot pricing Vienna, photographer Vienna prices, family photos price, baby photos price Vienna, business portrait price Vienna'
        }
        canonical="/fotoshooting-preise-wien/"
        hreflang={[
          { lang: 'de', url: '/fotoshooting-preise-wien/' },
          { lang: 'en', url: '/en/fotoshooting-preise-wien/' },
        ]}
      />

      {/* FAQPage + BreadcrumbList JSON-LD */}
      <Helmet>
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: faqs.map(({ q, a }) => ({
              '@type': 'Question',
              name: q,
              acceptedAnswer: { '@type': 'Answer', text: a },
            })),
          })}
        </script>
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE.url}/` },
              { '@type': 'ListItem', position: 2, name: 'Fotoshooting Preise Wien', item: `${SITE.url}/fotoshooting-preise-wien/` },
            ],
          })}
        </script>
      </Helmet>

      {/* Hero */}
      <section className="bg-gradient-to-r from-purple-600 to-pink-600 text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            {isDe ? 'Fotoshooting Preise Wien' : 'Photoshoot Pricing in Vienna'}
          </h1>
          <p className="text-lg md:text-xl opacity-90 max-w-2xl mx-auto">
            {isDe
              ? 'Transparente Pakete ab €95 – Familienfotos, Babyfotos, Schwangerschaftsfotos und Business Portraits in unserem Studio in Wien 1050.'
              : 'Transparent packages from €95 – family, baby, maternity and business photoshoots at our studio in Vienna 1050.'}
          </p>
          <p className="mt-4 inline-flex items-center gap-2 text-sm bg-white/15 rounded-full px-4 py-1.5">
            <MapPin className="w-4 h-4" />
            {isDe ? 'Familienfotograf Wien 1050 · Wien-Margareten' : 'Family photographer Vienna 1050 · Margareten district'}
          </p>
        </div>
      </section>

      {/* Intro */}
      <section className="bg-white border-b border-gray-100">
        <div className="container mx-auto px-4 py-10 max-w-3xl">
          <h2 className="text-2xl md:text-3xl font-bold text-purple-900 mb-3">
            {isDe ? 'Klare Preise – ohne Überraschungen' : 'Clear pricing – no surprises'}
          </h2>
          <p className="text-gray-700 leading-relaxed">
            {isDe ? (
              <>
                Wir glauben an transparente Preise. Auf dieser Seite finden Sie einen Überblick über die Kosten unserer{' '}
                <Link to="/familienfotos-wien/" className="text-purple-700 underline hover:text-purple-900">Familienfotografie</Link>,{' '}
                <Link to="/babyfotos-wien/" className="text-purple-700 underline hover:text-purple-900">Babyfotografie</Link>,{' '}
                <Link to="/schwangerschaftsfotos-wien/" className="text-purple-700 underline hover:text-purple-900">Schwangerschaftsshootings</Link>{' '}
                und{' '}
                <Link to="/business-portrait-wien/" className="text-purple-700 underline hover:text-purple-900">Business Portraits</Link>{' '}
                in Wien. Die vollständige Preisliste mit allen Paketen und Add-ons finden Sie auf unserer{' '}
                <Link to="/preise/" className="text-purple-700 underline hover:text-purple-900">Preise-Seite</Link>.
              </>
            ) : (
              <>
                We believe in transparent pricing. This page gives you an overview of the cost of our{' '}
                <Link to="/familienfotos-wien/" className="text-purple-700 underline hover:text-purple-900">family photography</Link>,{' '}
                <Link to="/babyfotos-wien/" className="text-purple-700 underline hover:text-purple-900">baby photography</Link>,{' '}
                <Link to="/schwangerschaftsfotos-wien/" className="text-purple-700 underline hover:text-purple-900">maternity sessions</Link>{' '}and{' '}
                <Link to="/business-portrait-wien/" className="text-purple-700 underline hover:text-purple-900">business portraits</Link>{' '}
                in Vienna. The full price list with all packages and add-ons is available on our{' '}
                <Link to="/preise/" className="text-purple-700 underline hover:text-purple-900">Pricing page</Link>.
              </>
            )}
          </p>
        </div>
      </section>

      {/* Quick price overview cards */}
      <section className="bg-gray-50">
        <div className="container mx-auto px-4 py-12 max-w-6xl">
          <h2 className="text-2xl md:text-3xl font-bold text-purple-900 mb-8 text-center">
            {isDe ? 'Beliebte Pakete im Überblick' : 'Popular packages at a glance'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: Camera,
                title: isDe ? 'Familie Basic' : 'Family Basic',
                price: '€95',
                bullets: isDe
                  ? ['60 Min Studio-Shooting', '1 retuschiertes Portrait digital', 'Leinwand 40×30 cm', 'Online-Galerie & private Nutzung']
                  : ['60 min studio shoot', '1 retouched digital portrait', 'Canvas 40×30 cm', 'Online gallery & private usage'],
                to: '/familienfotos-wien/',
              },
              {
                icon: Camera,
                title: isDe ? 'Baby & Neugeborene' : 'Baby & Newborn',
                price: '€95+',
                bullets: isDe
                  ? ['Sicheres Studio-Setup in Wien 1050', 'Behutsame Posen, viel Zeit', 'Eltern-Bilder inklusive', 'Online-Galerie zum Teilen']
                  : ['Safe studio setup in Vienna 1050', 'Gentle posing, plenty of time', 'Parent shots included', 'Online gallery to share'],
                to: '/neugeborenenfotos-wien/',
              },
              {
                icon: Camera,
                title: isDe ? 'Business Portrait' : 'Business Portrait',
                price: '€95',
                bullets: isDe
                  ? ['30 Min Headshot-Session', '1 retuschiertes Foto', 'Optimiert für LinkedIn & Bewerbung', 'Schnelle Lieferung']
                  : ['30 min headshot session', '1 retouched photo', 'Optimised for LinkedIn & applications', 'Fast delivery'],
                to: '/business-portrait-wien/',
              },
            ].map((p) => (
              <div key={p.title} className="bg-white rounded-xl shadow p-6 flex flex-col">
                <p.icon className="w-8 h-8 text-purple-600 mb-3" />
                <h3 className="text-xl font-bold text-purple-900 mb-1">{p.title}</h3>
                <div className="text-3xl font-bold text-purple-700 mb-4">{p.price}</div>
                <ul className="space-y-2 mb-6 text-gray-700 text-sm flex-1">
                  {p.bullets.map((b) => (
                    <li key={b} className="flex items-start">
                      <Check className="w-4 h-4 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  to={p.to}
                  className="inline-block text-center bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors"
                >
                  {isDe ? 'Mehr erfahren' : 'Learn more'}
                </Link>
              </div>
            ))}
          </div>

          {/* CTA pair */}
          <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/warteliste"
              className="inline-flex items-center justify-center gap-2 bg-purple-700 hover:bg-purple-800 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              <Calendar className="w-4 h-4" />
              {isDe ? 'Termin sichern' : 'Reserve your date'}
            </Link>
            <Link
              to="/vouchers"
              className="inline-flex items-center justify-center gap-2 bg-white border-2 border-purple-700 text-purple-700 hover:bg-purple-50 font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              <Gift className="w-4 h-4" />
              {isDe ? 'Jetzt Gutschein kaufen' : 'Buy a voucher now'}
            </Link>
          </div>

          <p className="text-center text-sm text-gray-600 mt-6">
            {isDe ? (
              <>
                Sie suchen die komplette Preisliste? Hier geht es zu allen{' '}
                <Link to="/preise/" className="text-purple-700 underline hover:text-purple-900 font-medium">Paketen & Preisen</Link>.
              </>
            ) : (
              <>
                Looking for the full price list? See all our{' '}
                <Link to="/preise/" className="text-purple-700 underline hover:text-purple-900 font-medium">packages & prices</Link>.
              </>
            )}
          </p>
        </div>
      </section>

      {/* Studio vs outdoor */}
      <section className="bg-white border-t border-gray-100">
        <div className="container mx-auto px-4 py-12 max-w-3xl">
          <h2 className="text-2xl md:text-3xl font-bold text-purple-900 mb-3">
            {isDe ? 'Studio in Wien 1050 oder Outdoor – was passt?' : 'Studio in Vienna 1050 or outdoor – what suits you?'}
          </h2>
          <p className="text-gray-700 leading-relaxed">
            {isDe
              ? 'Beide Varianten kosten gleich. Im Studio haben wir konstantes Licht, Hintergründe und ein ruhiges Setting – ideal für Babys, Familien und Bewerbungsfotos. Outdoor in Wien (z. B. im Schlosspark Schönbrunn oder am Donaukanal) liefert lebendige, natürliche Bilder. Wir empfehlen Ihnen die passende Option je nach Wetter und Wunschstimmung.'
              : 'Both options cost the same. The studio offers consistent light, backdrops and a calm setting – ideal for babies, families and application photos. Outdoor in Vienna (e.g. Schönbrunn Park or the Donaukanal) delivers vibrant, natural images. We recommend the right option based on the weather and your desired mood.'}
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-gray-50 border-t border-gray-100" aria-labelledby="preise-faq-heading">
        <div className="container mx-auto px-4 py-12 max-w-3xl">
          <h2 id="preise-faq-heading" className="text-2xl md:text-3xl font-bold text-purple-900 mb-6 text-center">
            {isDe ? 'Häufige Fragen zu unseren Preisen' : 'Frequently Asked Questions about our pricing'}
          </h2>
          <div className="space-y-6">
            {faqs.map(({ q, a }) => (
              <div key={q}>
                <h3 className="text-lg font-semibold text-purple-900 mb-2">{q}</h3>
                <p className="text-gray-700">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pre-footer CTA */}
      <section className="bg-purple-50/40 border-t border-gray-100">
        <div className="container mx-auto px-4 py-8 max-w-3xl text-center">
          <p className="text-gray-700">
            {isDe ? (
              <>
                Noch Fragen zu den Preisen?{' '}
                <Link to="/kontakt" className="text-purple-700 underline hover:text-purple-900 font-medium">Kontaktieren Sie uns</Link>{' '}
                – wir beraten Sie unverbindlich.
              </>
            ) : (
              <>
                Still have questions about pricing?{' '}
                <Link to="/kontakt" className="text-purple-700 underline hover:text-purple-900 font-medium">Get in touch</Link>{' '}
                – no-obligation advice.
              </>
            )}
          </p>
        </div>
      </section>

      <RelatedTopicsBlock pathname="/fotoshooting-preise-wien/" language={language as 'de' | 'en'} />
    </Layout>
  );
};

export default FotoshootingPreiseWienPage;
