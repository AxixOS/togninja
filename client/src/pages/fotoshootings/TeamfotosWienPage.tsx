import { SEOHead } from '../../components/SEO/SEOHead';
import { RelatedServices } from '../../components/SEO/RelatedServices';
import Layout from '../../components/layout/Layout';
import GoogleReviews from '../../components/layout/GoogleReviews';
import { Link } from 'react-router-dom';
import { ContextualLinks } from '../../components/SEO/ContextualLinks';
import { Camera, Heart, Users, Star, ArrowRight, Check, Clock, Briefcase, Building, Zap, Shield, TrendingUp, MapPin } from 'lucide-react';
import { useManualPageContent } from '../../hooks/useManualPageContent';
import MarkdownCopySlot from '../../components/MarkdownCopySlot';
import { newageCopyMap } from '../../content/newageCopyMap';
import { useLanguage } from '../../context/LanguageContext';
import { SITE } from '../../config/site';

export default function TeamfotosWienPage() {
  const t = useManualPageContent('teamfotos');
  const { language } = useLanguage();

  // Language-aware fallbacks
  const fallbacks = {
    en: {
      heroTitle: 'Team & Employee Photos in Vienna',
      heroSubtitle: 'Strong. Consistent. Brand-aligned.',
      heroDescription: 'We photograph team photos in Vienna directly at your company – with mobile studio, fast workflow and a look that matches your brand. Ideal for website, LinkedIn, press & recruiting.',
      primaryCta: 'Book a Spot on the Waitlist',
      secondaryCta: 'Contact Us Directly',
    },
    de: {
      heroTitle: 'Team- & Mitarbeiterfotos in Wien',
      heroSubtitle: 'Stark. Einheitlich. Markengetreu.',
      heroDescription: 'Wir fotografieren Teamfotos in Wien direkt bei Ihnen im Unternehmen – mit mobilem Studio, schnellem Ablauf und einem Look, der zu Ihrer Brand passt. Ideal für Website, LinkedIn, Presse & Recruiting.',
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

  const heroTitle = fromManual('manual.teamfotos.heroTitle', fb.heroTitle);
  const heroSubtitle = fromManual('manual.teamfotos.heroTagline', fb.heroSubtitle);
  const heroDescription = fromManual('manual.teamfotos.heroDescription', fb.heroDescription);
  const primaryCta = fromManual('manual.teamfotos.primaryCta', fb.primaryCta);
  const secondaryCta = fromManual('manual.teamfotos.secondaryCta', fb.secondaryCta);
  const heroImage1 = fromManual('manual.teamfotos.heroImage1', '');
  const heroImage2 = fromManual('manual.teamfotos.heroImage2', '');
  const heroImage3 = fromManual('manual.teamfotos.heroImage3', '');
  const heroImage4 = fromManual('manual.teamfotos.heroImage4', '');
  const heroImage5 = fromManual('manual.teamfotos.heroImage5', '');

  return (
    <Layout>
    <div className="min-h-screen bg-white">
      <SEOHead
        title={newageCopyMap['teamfotos-wien'].title}
        description={newageCopyMap['teamfotos-wien'].metaDescription}
        keywords="teamfotos wien, mitarbeiterfotos wien, team fotografie wien, corporate team shooting wien"
        canonical="/teamfotos-wien/"
        ogImage={`${SITE.url}/images/team-hero.jpg`}
        hreflang={[
          { lang: 'de', url: '/teamfotos-wien/' },
          { lang: 'en', url: '/en/team-photos-vienna/' }
        ]}
      />

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
                  alt="Team- und Mitarbeiterfotos Wien"
                  className="rounded-2xl shadow-2xl w-full h-auto object-contain"
                  loading="eager"
                />
              </div>
              <div>
                <img
                  src={heroImage2}
                  alt="Mitarbeiterfotos On-Site Wien"
                  className="rounded-xl shadow-lg w-full h-auto object-contain"
                  loading="eager"
                />
              </div>
              <div>
                <img
                  src={heroImage3}
                  alt="Corporate Team Fotografie Wien"
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

      <ContextualLinks pathname="/teamfotos-wien/" language={language} />

      {/* Introduction Section */}
      <section className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div className="prose prose-lg max-w-none">
              <p className="text-lg text-gray-700 leading-relaxed">
                {language === 'de'
                  ? `Willkommen bei ${SITE.name} – Ihrem Partner für professionelle Teamfotos in Wien! Wir kommen mit mobilem Studio direkt zu Ihnen ins Unternehmen und erstellen einheitliche, markenkonforme Mitarbeiterportraits. Durchschnittlich 7–8 Minuten pro Person, inklusive Gruppenfoto und voller kommerzieller Nutzungsrechte.`
                  : 'Welcome to New Age Photography – your partner for professional team photos in Vienna! We come with a mobile studio directly to your company and create consistent, brand-aligned employee portraits. An average of 7–8 minutes per person, including group photo and full commercial usage rights.'}
              </p>
              <p className="text-lg text-gray-700 leading-relaxed mt-4">
                {language === 'de'
                  ? 'Schneller Ablauf, professionelles Setup, konsistente Ergebnisse – perfekt für Ihre Website, LinkedIn-Profile, Pressematerialien und Recruiting-Kampagnen.'
                  : 'Fast workflow, professional setup, consistent results – perfect for your website, LinkedIn profiles, press materials and recruiting campaigns.'}
              </p>
            </div>
            <div>
              <img
                src={heroImage4}
                alt="Teamfotografie im Unternehmen"
                className="rounded-2xl shadow-lg w-full h-auto object-contain"
                loading="lazy"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Extended Content Section - Safe Copy Slot */}
      {language === 'de' && <MarkdownCopySlot content={newageCopyMap['teamfotos-wien'].markdown} />}

      {/* Packages Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {language === 'de' ? 'Pakete & Preise (On-Site)' : 'Packages & Prices (On-Site)'}
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto mb-6">
              {language === 'de'
                ? 'Alle Pakete inkl. Setup, Licht, Hintergrund, Tether-Preview, kommerzielle Nutzungsrechte, High-Res & Web-Export, natürliche Retusche.'
                : 'All packages incl. setup, lighting, background, tether preview, commercial usage rights, high-res & web export, natural retouching.'}
            </p>
            <div className="bg-purple-100 rounded-lg p-4 max-w-2xl mx-auto">
              <p className="text-gray-800 font-semibold">
                <strong>{language === 'de' ? 'On-Site Setup:' : 'On-Site Setup:'}</strong> {language === 'de' ? '€150 pauschal (Raum, Aufbau, Lichtmessung, Testshots)' : '€150 flat rate (room, setup, light metering, test shots)'}
              </p>
            </div>
          </div>

          <div className="flex justify-center mb-12">
            {/* Team & Mitarbeiterfotos */}
            <div className="bg-gradient-to-br from-purple-600 to-pink-600 text-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
              <div className="mb-6">
                <h3 className="text-2xl font-bold mb-2">{language === 'de' ? 'Team & Mitarbeiterfotos' : 'Team & Employee Photos'}</h3>
                <p className="text-purple-100 font-medium">{language === 'de' ? 'Paketpreise by headcount' : 'Package prices by headcount'}</p>
              </div>
              
              <div className="mb-6">
                <div className="flex items-baseline">
                  <span className="text-sm text-purple-200 mr-1">{language === 'de' ? 'Ab' : 'From'}</span>
                  <span className="text-4xl font-bold">€299</span>
                </div>
              </div>

              <div className="space-y-4 mb-8">
                <div className="flex items-start">
                  <Check className="h-5 w-5 text-yellow-300 mr-3 flex-shrink-0 mt-0.5" />
                  <span>{language === 'de' ? 'In-Studio oder On-Site Optionen' : 'In-studio or on-site options'}</span>
                </div>
                <div className="flex items-start">
                  <Check className="h-5 w-5 text-yellow-300 mr-3 flex-shrink-0 mt-0.5" />
                  <span>{language === 'de' ? 'z.B. 50€ pro Kopf mit alle Portraits als Datei dazu' : 'e.g. €50 per person with all portraits as files included'}</span>
                </div>
                <div className="flex items-start">
                  <Check className="h-5 w-5 text-yellow-300 mr-3 flex-shrink-0 mt-0.5" />
                  <span>{language === 'de' ? 'Gültig bis 2 Jahre' : 'Valid for up to 2 years'}</span>
                </div>
              </div>

              <Link
                to="/warteliste"
                className="block text-center px-6 py-3 bg-white text-purple-600 rounded-lg hover:bg-gray-100 transition-colors font-semibold"
              >
                {language === 'de' ? 'Jetzt anfragen' : 'Enquire Now'}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* On-Site Lighting Plan Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">{language === 'de' ? 'On-Site Lighting Plan (bewährt & schnell)' : 'On-Site Lighting Plan (proven & fast)'}</h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <div className="bg-gray-50 rounded-xl p-6">
              <h3 className="font-semibold text-lg text-gray-900 mb-3 flex items-center">
                <Zap className="h-5 w-5 text-purple-600 mr-2" />
                Key Light
              </h3>
              <p className="text-gray-700 text-sm">
                {language === 'de' ? '120 cm Parabol/Octa, soft & clean (Clamshell/Beauty).' : '120 cm parabolic/octa, soft & clean (clamshell/beauty).'}
              </p>
            </div>

            <div className="bg-gray-50 rounded-xl p-6">
              <h3 className="font-semibold text-lg text-gray-900 mb-3 flex items-center">
                <Camera className="h-5 w-5 text-purple-600 mr-2" />
                Fill/Negative Fill
              </h3>
              <p className="text-gray-700 text-sm">
                {language === 'de' ? 'Je nach Gesichtsform; gleichmäßige Serie garantiert.' : 'Depending on face shape; consistent series guaranteed.'}
              </p>
            </div>

            <div className="bg-gray-50 rounded-xl p-6">
              <h3 className="font-semibold text-lg text-gray-900 mb-3 flex items-center">
                <Star className="h-5 w-5 text-purple-600 mr-2" />
                Hair/Edge Light
              </h3>
              <p className="text-gray-700 text-sm">
                {language === 'de' ? 'Dezentes Kantenlicht für Separation.' : 'Subtle edge light for separation.'}
              </p>
            </div>

            <div className="bg-gray-50 rounded-xl p-6">
              <h3 className="font-semibold text-lg text-gray-900 mb-3 flex items-center">
                <Building className="h-5 w-5 text-purple-600 mr-2" />
                {language === 'de' ? 'Hintergründe' : 'Backgrounds'}
              </h3>
              <p className="text-gray-700 text-sm">
                {language === 'de' ? 'Hell, Dunkel, Mittelgrau oder CI-Farbe; alternativ Corporate-Location (Glas, Holz, Flur).' : 'Light, dark, medium gray or CI color; alternatively corporate location (glass, wood, hallway).'}
              </p>
            </div>

            <div className="bg-gray-50 rounded-xl p-6">
              <h3 className="font-semibold text-lg text-gray-900 mb-3 flex items-center">
                <Shield className="h-5 w-5 text-purple-600 mr-2" />
                Tethered Capture
              </h3>
              <p className="text-gray-700 text-sm">
                {language === 'de' ? 'Sofort-Ansicht am Laptop; schnelle Auswahl direkt vor Ort.' : 'Instant preview on laptop; quick selection on the spot.'}
              </p>
            </div>

            <div className="bg-gray-50 rounded-xl p-6">
              <h3 className="font-semibold text-lg text-gray-900 mb-3 flex items-center">
                <MapPin className="h-5 w-5 text-purple-600 mr-2" />
                {language === 'de' ? 'Platzbedarf' : 'Space Required'}
              </h3>
              <p className="text-gray-700 text-sm">
                {language === 'de' ? 'Ca. 3 × 5 m, Deckenhöhe 2,6 m+; Strom 230 V.' : 'Approx. 3 × 5 m, ceiling height 2.6 m+; 230V power.'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Process & Timing Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-12">
            <img
              src={heroImage5}
              alt="Team Fotoshooting Wien On-Site"
              className="rounded-2xl shadow-lg w-full h-auto object-contain"
              loading="lazy"
            />
          </div>

          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">{language === 'de' ? 'Zeit pro Person & Ablauf' : 'Time per Person & Process'}</h2>
          <p className="text-xl text-center text-gray-600 mb-12">
            {language === 'de' ? (<>Realistisch planbar: <strong>Ø 7–8 Minuten pro Person</strong><br /><span className="text-sm">(2–3 Min. Micro-Coaching, 3–4 Min. Serien, 1 Min. Check)</span></>) : (<>Realistically plannable: <strong>avg. 7–8 minutes per person</strong><br /><span className="text-sm">(2–3 min. micro-coaching, 3–4 min. series, 1 min. check)</span></>)}
          </p>

          <div className="max-w-3xl mx-auto mb-12">
            <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">{language === 'de' ? 'Standard-Ablauf' : 'Standard Process'}</h3>
            <div className="space-y-4">
              <div className="bg-white rounded-lg p-4 flex items-start">
                <div className="bg-purple-100 rounded-full w-8 h-8 flex items-center justify-center mr-4 flex-shrink-0">
                  <span className="text-purple-600 font-bold">1</span>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">{language === 'de' ? 'Ankunft & Aufbau' : 'Arrival & Setup'}</h4>
                  <p className="text-gray-600 text-sm">{language === 'de' ? '30–40 Min.' : '30–40 min.'}</p>
                </div>
              </div>
              <div className="bg-white rounded-lg p-4 flex items-start">
                <div className="bg-purple-100 rounded-full w-8 h-8 flex items-center justify-center mr-4 flex-shrink-0">
                  <span className="text-purple-600 font-bold">2</span>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">{language === 'de' ? 'Test & Style-Abstimmung' : 'Test & Style Coordination'}</h4>
                  <p className="text-gray-600 text-sm">{language === 'de' ? '5–10 Min.' : '5–10 min.'}</p>
                </div>
              </div>
              <div className="bg-white rounded-lg p-4 flex items-start">
                <div className="bg-purple-100 rounded-full w-8 h-8 flex items-center justify-center mr-4 flex-shrink-0">
                  <span className="text-purple-600 font-bold">3</span>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">{language === 'de' ? 'Portrait-Slot je Person' : 'Portrait Slot per Person'}</h4>
                  <p className="text-gray-600 text-sm">{language === 'de' ? '7–8 Min.' : '7–8 min.'}</p>
                </div>
              </div>
              <div className="bg-white rounded-lg p-4 flex items-start">
                <div className="bg-purple-100 rounded-full w-8 h-8 flex items-center justify-center mr-4 flex-shrink-0">
                  <span className="text-purple-600 font-bold">4</span>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">{language === 'de' ? 'Gruppenfoto(s)' : 'Group Photo(s)'}</h4>
                  <p className="text-gray-600 text-sm">{language === 'de' ? '10–15 Min.' : '10–15 min.'}</p>
                </div>
              </div>
              <div className="bg-white rounded-lg p-4 flex items-start">
                <div className="bg-purple-100 rounded-full w-8 h-8 flex items-center justify-center mr-4 flex-shrink-0">
                  <span className="text-purple-600 font-bold">5</span>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">{language === 'de' ? 'Abbau' : 'Teardown'}</h4>
                  <p className="text-gray-600 text-sm">{language === 'de' ? '30 Min.' : '30 min.'}</p>
                </div>
              </div>
              <div className="bg-white rounded-lg p-4 flex items-start">
                <div className="bg-purple-100 rounded-full w-8 h-8 flex items-center justify-center mr-4 flex-shrink-0">
                  <span className="text-purple-600 font-bold">6</span>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">{language === 'de' ? 'Auswahl & Retusche' : 'Selection & Retouching'}</h4>
                  <p className="text-gray-600 text-sm">{language === 'de' ? 'Nach Online-Galerie' : 'Via online gallery'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Example Day Schedule */}
          <div className="max-w-4xl mx-auto">
            <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">{language === 'de' ? 'Beispiel-Tagesplan (20 Personen)' : 'Example Day Schedule (20 People)'}</h3>
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-purple-600 text-white">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold">{language === 'de' ? 'Uhrzeit' : 'Time'}</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">{language === 'de' ? 'Programmpunkt' : 'Activity'}</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">{language === 'de' ? 'Notizen' : 'Notes'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  <tr>
                    <td className="px-6 py-4 text-sm text-gray-900">08:15</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{language === 'de' ? 'Ankunft & Aufbau' : 'Arrival & Setup'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{language === 'de' ? 'Raum freihalten, Strom check' : 'Keep room clear, power check'}</td>
                  </tr>
                  <tr className="bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">09:00</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{language === 'de' ? 'Testshots / Style-Feinschliff' : 'Test shots / Style fine-tuning'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{language === 'de' ? 'Helligkeit / Hintergrund' : 'Brightness / Background'}</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 text-sm text-gray-900">09:10–10:50</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">Slots 1–12</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{language === 'de' ? '8 Min. je Person, 10-Min-Buffer' : '8 min. per person, 10-min buffer'}</td>
                  </tr>
                  <tr className="bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">10:50–11:05</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{language === 'de' ? 'Pause' : 'Break'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{language === 'de' ? 'Make-Up/Outfit-Check' : 'Make-up/Outfit check'}</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 text-sm text-gray-900">11:05–12:15</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">Slots 13–20</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{language === 'de' ? '8 Min. je Person' : '8 min. per person'}</td>
                  </tr>
                  <tr className="bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">12:15–12:35</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{language === 'de' ? 'Gruppenfotos' : 'Group Photos'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{language === 'de' ? 'Abteilung + Gesamt' : 'Department + Full team'}</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 text-sm text-gray-900">12:35–13:05</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{language === 'de' ? 'Abbau' : 'Teardown'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{language === 'de' ? 'Übergabe Nächste Schritte' : 'Handover & Next steps'}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* Preparation Section */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">{language === 'de' ? 'Vorbereitung für Ihr Team' : 'Preparation for Your Team'}</h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-purple-50 rounded-xl p-6">
              <h3 className="font-semibold text-lg text-gray-900 mb-3">{language === 'de' ? 'Outfit-Guides' : 'Outfit Guides'}</h3>
              <p className="text-gray-700 text-sm">
                {language === 'de' ? 'Uni-Farben, feine Strukturen, keine großen Logos.' : 'Solid colours, fine textures, no large logos.'}
              </p>
            </div>

            <div className="bg-purple-50 rounded-xl p-6">
              <h3 className="font-semibold text-lg text-gray-900 mb-3">{language === 'de' ? 'Brillencheck' : 'Glasses Check'}</h3>
              <p className="text-gray-700 text-sm">
                {language === 'de' ? 'Entspiegeln/reinigen; Glanz reduzieren.' : 'Anti-glare/clean lenses; reduce shine.'}
              </p>
            </div>

            <div className="bg-purple-50 rounded-xl p-6">
              <h3 className="font-semibold text-lg text-gray-900 mb-3">{language === 'de' ? 'Haare/Make-Up' : 'Hair/Make-Up'}</h3>
              <p className="text-gray-700 text-sm">
                {language === 'de' ? 'Dezent, matt; Kamm/Lippenpflege bereithalten.' : 'Subtle, matte; have a comb/lip balm ready.'}
              </p>
            </div>

            <div className="bg-purple-50 rounded-xl p-6">
              <h3 className="font-semibold text-lg text-gray-900 mb-3">{language === 'de' ? 'Briefing' : 'Briefing'}</h3>
              <p className="text-gray-700 text-sm">
                {language === 'de' ? '1–2 Tage vorher mit Slots (Kalender-Invite); Kontaktperson vor Ort.' : '1–2 days before with slots (calendar invite); contact person on site.'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12">{fromManual('manual.teamfotos.faqHeading', language === 'de' ? 'FAQ – Teamfotos Wien' : 'FAQ – Team Photos Vienna')}</h2>
          <div className="space-y-6">
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="font-bold text-lg text-gray-900 mb-2">{fromManual('manual.teamfotos.faqQ1', language === 'de' ? 'Wie schnell liefern wir?' : 'How fast do we deliver?')}</h3>
              <p className="text-gray-600">
                {fromManual('manual.teamfotos.faqA1', language === 'de' ? 'Preview-Galerie 48–72 h, finale Retuschen 3–5 Werktage (Express möglich).' : 'Preview gallery 48–72 h, final retouching 3–5 business days (express available).')}
              </p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="font-bold text-lg text-gray-900 mb-2">{fromManual('manual.teamfotos.faqQ2', language === 'de' ? 'Erhalten wir einheitliche Ergebnisse über Standorte?' : 'Do we get consistent results across locations?')}</h3>
              <p className="text-gray-600">
                {fromManual('manual.teamfotos.faqA2', language === 'de' ? 'Ja – wir dokumentieren Licht-/Kamera-Settings für wiederkehrende Sessions.' : 'Yes – we document lighting/camera settings for recurring sessions.')}
              </p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="font-bold text-lg text-gray-900 mb-2">{fromManual('manual.teamfotos.faqQ3', language === 'de' ? 'Können Hintergründe markenkonform sein?' : 'Can backgrounds match our brand?')}</h3>
              <p className="text-gray-600">
                {fromManual('manual.teamfotos.faqA3', language === 'de' ? 'Klar – CI-Farbkarton oder Location-Look (Lobby, Glasfront, Holz).' : 'Absolutely – CI-coloured backdrop or location look (lobby, glass front, wood).')}
              </p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="font-bold text-lg text-gray-900 mb-2">{fromManual('manual.teamfotos.faqQ4', language === 'de' ? 'Gibt es Mitarbeiter-Onboarding später?' : 'Can we onboard employees later?')}</h3>
              <p className="text-gray-600">
                {fromManual('manual.teamfotos.faqA4', language === 'de' ? 'Ja – Nachbuchungen im selben Stil jederzeit möglich (Mindestmenge 3 P.).' : 'Yes – follow-up bookings in the same style possible anytime (minimum 3 people).')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Internal Linking - Related Services */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-center mb-8">{language === 'de' ? 'Weitere Fotografie-Services' : 'More Photography Services'}</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <Link
              to="/business-portrait-wien/"
              className="block bg-purple-50 rounded-xl p-6 hover:shadow-lg transition-shadow"
            >
              <Briefcase className="h-10 w-10 text-purple-600 mb-4" />
              <h3 className="font-semibold text-lg mb-2 text-gray-900">{language === 'de' ? 'Business-Portraits' : 'Business Portraits'}</h3>
              <p className="text-gray-600 text-sm mb-4">
                {language === 'de' ? 'Professionelle Einzelportraits für LinkedIn, CEO & Personal-Branding' : 'Professional individual portraits for LinkedIn, CEO & personal branding'}
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
              <h3 className="font-semibold text-lg mb-2 text-gray-900">{language === 'de' ? 'Familienfotografie' : 'Family Photography'}</h3>
              <p className="text-gray-600 text-sm mb-4">
                {language === 'de' ? 'Authentische Familienfotos im Studio mit bis zu 12 Personen' : 'Authentic family photos in the studio with up to 12 people'}
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
              <h3 className="font-semibold text-lg mb-2 text-gray-900">{language === 'de' ? 'Schwangerschafts-Fotos' : 'Maternity Photos'}</h3>
              <p className="text-gray-600 text-sm mb-4">
                {language === 'de' ? 'Emotionale Babybauch-Portraits im Studio oder Outdoor' : 'Emotional baby bump portraits in studio or outdoor'}
              </p>
              <span className="text-purple-600 font-semibold flex items-center">
                {language === 'de' ? 'Mehr erfahren' : 'Learn more'} <ArrowRight className="ml-1 h-4 w-4" />
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-16 bg-gradient-to-r from-gray-900 to-gray-800 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            {language === 'de' ? 'Bereit für professionelle Teamfotos in Wien?' : 'Ready for professional team photos in Vienna?'}
          </h2>
          <p className="text-xl mb-8 opacity-90">
            {language === 'de' ? 'Termine knapp? Setzen Sie sich auf unsere Warteliste – wir melden freie Slots sofort.' : 'Appointments scarce? Join our waitlist – we\'ll notify you of available slots immediately.'}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/warteliste"
              className="inline-flex items-center justify-center px-8 py-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold text-lg"
            >
              {language === 'de' ? 'Termin auf der Warteliste sichern' : 'Secure a spot on the waitlist'}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
            <Link
              to="/kontakt"
              className="inline-flex items-center justify-center px-8 py-4 border-2 border-white text-white rounded-lg hover:bg-white/10 transition-colors font-semibold text-lg"
            >
              {language === 'de' ? 'Direkt anfragen mit Wunschdatum' : 'Enquire directly with preferred date'}
            </Link>
          </div>
        </div>
      </section>

      <RelatedServices currentPath="/teamfotos-wien/" />

    </div>
    </Layout>
  );
}
