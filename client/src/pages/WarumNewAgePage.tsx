import { Link } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { SEOHead } from '../components/SEO/SEOHead';
import GoogleReviews from '../components/layout/GoogleReviews';
import CareerStorySection from '../components/home/CareerStorySection';
import { useLanguage } from '../context/LanguageContext';
import { Star, Users, HelpCircle, BookOpen, ShieldCheck, MapPin, ArrowRight } from 'lucide-react';

/**
 * Trust-hub pillar page (July 2026 SEO audit: "Vertrauen & Social Proof" had
 * no unified destination). Gives undecided prospects ONE page that ties
 * together reviews, FAQ, about-us, case studies and guarantees.
 * NOTE: deliberately NO self-serving aggregateRating JSON-LD — review markup
 * about one's own business violates Google's structured-data guidelines.
 */
export default function WarumNewAgePage() {
  const { language, t } = useLanguage();
  const de = language === 'de';

  // Same pattern as the fotoshooting pages: visible copy resolves via t(),
  // which overlays published Manual Website Update content (Settings →
  // Manual Website Update → "Warum New Age") over these defaults.
  const fromManual = (key: string, fallback: string) => {
    const value = t(key);
    if (!value || value === key) return fallback;
    return value;
  };

  const proofs = [
    { icon: Star, n: 1, to: '/kundenstimmen/', cta: de ? 'Kundenstimmen lesen' : 'Read testimonials' },
    { icon: Users, n: 2, to: '/ueber-uns/', cta: de ? 'Über uns' : 'About us' },
    { icon: BookOpen, n: 3, to: '/blog', cta: de ? 'Zum Blog' : 'To the blog' },
    { icon: HelpCircle, n: 4, to: '/faq/', cta: de ? 'Fragen ansehen' : 'View FAQ' },
  ].map((p) => ({
    icon: p.icon,
    to: p.to,
    cta: p.cta,
    title: fromManual(`manual.warum.proof${p.n}Title`, ''),
    desc: fromManual(`manual.warum.proof${p.n}Desc`, ''),
  }));

  return (
    <Layout>
      <div className="min-h-screen bg-white">
        <SEOHead
          title={language === 'de'
            ? 'Warum New Age Fotografie? Bewertungen, Erfahrung & Team | Fotostudio Wien'
            : 'Why New Age Fotografie? Reviews, Experience & Team | Photo Studio Vienna'}
          description={language === 'de'
            ? 'Alles, was Sie vor der Buchung wissen wollen: 4,9★ Google-Bewertungen, 13+ Jahre Erfahrung, echte Fallstudien, FAQ und das Team hinter New Age Fotografie Wien.'
            : 'Everything you want to know before booking: 4.9★ Google reviews, 13+ years’ experience, real case studies, FAQ and the team behind New Age Fotografie Vienna.'}
          keywords="new age fotografie erfahrungen, fotograf wien bewertungen, fotostudio wien empfehlung"
          canonical="/warum-new-age-fotografie/"
        />

        {/* Hero */}
        <section className="relative bg-gradient-to-br from-purple-900 via-gray-900 to-gray-900 text-white pt-24 pb-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
              {fromManual('manual.warum.heroTitle', de ? 'Warum New Age Fotografie?' : 'Why New Age Fotografie?')}
            </h1>
            <p className="text-xl text-gray-300 leading-relaxed">
              {fromManual('manual.warum.heroDescription', '')}
            </p>
          </div>
        </section>

        {/* Career-history band — the evidence + workings behind the stats */}
        <CareerStorySection />

        <GoogleReviews />

        {/* Proof grid */}
        <section className="py-16 bg-white">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-2 gap-6">
              {proofs.map((p) => (
                <Link key={p.to} to={p.to} className="block bg-gray-50 rounded-xl p-6 hover:shadow-lg transition-shadow border border-gray-100">
                  <p.icon className="h-10 w-10 text-purple-600 mb-4" />
                  <h2 className="font-semibold text-xl mb-2 text-gray-900">{p.title}</h2>
                  <p className="text-gray-600 text-sm mb-4">{p.desc}</p>
                  <span className="text-purple-600 font-semibold flex items-center text-sm">
                    {p.cta} <ArrowRight className="ml-1 h-4 w-4" />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Our Process — "So läuft's ab" (supporting content per the
            pillar/cluster architecture: builds trust, answers objections). */}
        {de && (
          <section className="py-16 bg-white">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">{fromManual('manual.warum.processTitle', 'So läuft ein Shooting bei uns ab')}</h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {['1', '2', '3', '4'].map((n) => ({
                  n,
                  t: fromManual(`manual.warum.step${n}Title`, ''),
                  d: fromManual(`manual.warum.step${n}Desc`, ''),
                })).map((s) => (
                  <div key={s.n} className="bg-gray-50 rounded-xl p-5 border border-gray-100">
                    <div className="w-8 h-8 rounded-full bg-purple-600 text-white font-bold flex items-center justify-center mb-3">{s.n}</div>
                    <h3 className="font-semibold text-gray-900 mb-1">{s.t}</h3>
                    <p className="text-sm text-gray-600">{s.d}</p>
                  </div>
                ))}
              </div>
              <p className="text-center text-gray-600 mt-8">
                Fragen zum Ablauf? Alle Antworten im <Link to="/faq/" className="text-purple-600 hover:text-purple-700 underline underline-offset-2">FAQ</Link>{' '}
                oder direkt <Link to="/kontakt" className="text-purple-600 hover:text-purple-700 underline underline-offset-2">Termin anfragen</Link>.
              </p>
            </div>
          </section>
        )}

        {/* Guarantees (German) */}
        {de && (
          <section className="py-16 bg-gray-50">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                <ShieldCheck className="h-8 w-8 text-purple-600" /> {fromManual('manual.warum.guaranteesTitle', 'Woran Sie uns messen können')}
              </h2>
              <ul className="space-y-4 text-gray-700">
                <li><strong>Wohlfühlen zuerst.</strong> „Ich bin unfotogen" hören wir jede Woche — und widerlegen es jede Woche. Die ersten Minuten jedes Shootings investieren wir in Atmosphäre, nicht in Technik.</li>
                <li><strong>Ehrliche Beratung.</strong> Wir empfehlen das kleinere Paket, wenn es reicht — nachzulesen in den <Link to="/kundenstimmen/" className="text-purple-600 hover:text-purple-700 underline underline-offset-2">Bewertungen</Link>.</li>
                <li><strong>Transparente Preise.</strong> Alle Pakete offen auf der <Link to="/preise/" className="text-purple-600 hover:text-purple-700 underline underline-offset-2">Preisseite</Link> — keine versteckten Kosten.</li>
                <li><strong>Sichere Bilder.</strong> Dual-Card-Aufnahme, redundante Backups, passwortgeschützte Online-Galerie.</li>
              </ul>
              <p className="mt-8 text-gray-700 flex items-start gap-2">
                <MapPin className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
                <span>Sie finden uns zentral in 1050 Wien, Ecke Schönbrunnerstraße (U4 Kettenbrückengasse) — <Link to="/kontakt" className="text-purple-600 hover:text-purple-700 underline underline-offset-2">Kontakt & Anfahrt</Link>.</span>
              </p>
            </div>
          </section>
        )}

        {/* Final CTA */}
        <section className="py-16 bg-gradient-to-r from-purple-700 to-purple-900 text-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-bold mb-6">{fromManual('manual.warum.finalCtaTitle', de ? 'Überzeugt? Dann lernen wir uns kennen.' : 'Convinced? Let’s meet.')}</h2>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/kontakt" className="inline-flex items-center justify-center px-8 py-4 bg-white text-purple-700 rounded-lg hover:bg-gray-100 transition-colors font-semibold text-lg">
                {fromManual('manual.warum.primaryCta', de ? 'Termin anfragen' : 'Request a session')}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
              <Link to="/portfolio" className="inline-flex items-center justify-center px-8 py-4 border-2 border-white text-white rounded-lg hover:bg-white/10 transition-colors font-semibold text-lg">
                {fromManual('manual.warum.secondaryCta', de ? 'Portfolio ansehen' : 'View portfolio')}
              </Link>
            </div>
          </div>
        </section>
      </div>
    </Layout>
  );
}
