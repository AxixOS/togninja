import { SEOHead } from '../../components/SEO/SEOHead';
import { ServiceSchema } from '../../components/SEO/ServiceSchema';
import { RelatedServices } from '../../components/SEO/RelatedServices';
import { PillarGuides } from '../../components/SEO/PillarGuides';
import { ReviewsBlock } from '../../components/SEO/ReviewsBlock';
import Layout from '../../components/layout/Layout';
import GoogleReviews from '../../components/layout/GoogleReviews';
import MarkdownCopySlot from '../../components/MarkdownCopySlot';
import { newageCopyMap } from '../../content/newageCopyMap';
import { Link, useNavigate } from 'react-router-dom';
import { Camera, Heart, Users, Star, ArrowRight, Check, Clock, Baby, Music, Smile, Shield, Thermometer } from 'lucide-react';
import { useManualPageContent } from '../../hooks/useManualPageContent';
import { useCart } from '../../context/CartContext';
import { useLanguage } from '../../context/LanguageContext';
import { SITE } from '../../config/site';

export default function NeugeborenenfotosWienPage() {
  const navigate = useNavigate();
  const { addItem } = useCart();
  const t = useManualPageContent('neugeborenenfotos');
  const { language } = useLanguage();

  // Language-aware fallbacks
  const fallbacks = {
    en: {
      heroTitle: 'Newborn & Baby Photography in Vienna',
      heroSubtitle: 'Newborn Photos – Studio Packages (Day 5–14 after birth)',
      heroDescription: 'Our promise: Warm studio (26–28 °C), soft wraps, safe poses with hands-on safety. Newborn photos best taken on day 5–14 after birth. Schedule is flexible – when baby is tired, we take a break.',
      primaryCta: 'Book a Spot on the Waitlist',
      secondaryCta: 'Give a Newborn Voucher',
    },
    de: {
      heroTitle: 'Neugeborenen- & Babyfotografie in Wien',
      heroSubtitle: 'Neugeborenenfotos – Studio-Pakete (Tag 5–14 nach der Geburt)',
      heroDescription: 'Kurzversprechen: Warmes Studio (26–28 °C), sanfte Wraps, sichere Posen mit Hands-on-Safety. Neugeborenenfotos am besten Tag 5–14 nach der Geburt. Zeitplan flexibel – wenn Baby müde ist, machen wir Pause.',
      primaryCta: 'Termin auf der Warteliste sichern',
      secondaryCta: 'Neugeborenen-Gutschein verschenken',
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

  const heroTitle = fromManual('manual.neugeborenenfotos.heroTitle', fb.heroTitle);
  const heroSubtitle = fromManual('manual.neugeborenenfotos.heroTagline', fb.heroSubtitle);
  const heroDescription = fromManual(
    'manual.neugeborenenfotos.heroDescription',
    fb.heroDescription
  );
  const primaryCta = fromManual('manual.neugeborenenfotos.primaryCta', fb.primaryCta);
  const secondaryCta = fromManual('manual.neugeborenenfotos.secondaryCta', fb.secondaryCta);
  const heroImage1 = fromManual('manual.neugeborenenfotos.heroImage1', '');
  const heroImage2 = fromManual('manual.neugeborenenfotos.heroImage2', '');
  const heroImage3 = fromManual('manual.neugeborenenfotos.heroImage3', '');
  const heroImage4 = fromManual('manual.neugeborenenfotos.heroImage4', '');
  const heroImage5 = fromManual('manual.neugeborenenfotos.heroImage5', '');

  const handleBookPackage = (packageName: string, price: number, description: string) => {
    addItem({
      title: packageName,
      price: price,
      quantity: 1,
      packageType: 'Neugeborenen-Fotografie',
      type: 'voucher'
    });
    navigate('/cart');
  };

  return (
    <Layout>
    <div className="min-h-screen bg-white">
      <SEOHead
        title={newageCopyMap['neugeborenenfotos-wien'].title}
        description={newageCopyMap['neugeborenenfotos-wien'].metaDescription}
        keywords="neugeborenenfotograf wien, neugeborenenfotos wien, babyfotografie wien, newborn fotografie wien"
        canonical="/neugeborenenfotos-wien/"
        ogImage={`${SITE.url}/images/newborn-hero.jpg`}
        hreflang={[
          { lang: 'de', url: '/neugeborenenfotos-wien/' },
          { lang: 'en', url: '/en/newborn-photos-vienna/' }
        ]}
      />
      <ServiceSchema
        serviceName={newageCopyMap['neugeborenenfotos-wien'].h1}
        description={newageCopyMap['neugeborenenfotos-wien'].metaDescription}
        url="/neugeborenenfotos-wien/"
        serviceType="PhotographyService"
      />

      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-purple-50 via-white to-pink-50 pt-24 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Left: Text Content */}
            <div>
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 leading-tight">
                {heroTitle}
              </h1>
              <p className="text-xl text-gray-700 mb-4 leading-relaxed font-semibold">
                {heroSubtitle}
              </p>
              <p className="text-lg text-gray-600 mb-8 leading-relaxed">
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
                  to="/gutschein/newborn"
                  className="inline-flex items-center justify-center px-8 py-4 border-2 border-purple-600 text-purple-600 rounded-lg hover:bg-purple-50 transition-colors font-semibold text-lg"
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
                  alt="Neugeborenen Fotoshooting in Wien"
                  className="rounded-2xl shadow-2xl w-full h-auto object-contain"
                  loading="eager"
                />
              </div>
              <div>
                <img
                  src={heroImage2}
                  alt="Newborn Portrait Studio Wien"
                  className="rounded-xl shadow-lg w-full h-auto object-contain"
                  loading="eager"
                />
              </div>
              <div>
                <img
                  src={heroImage3}
                  alt="Baby Fotografie Wien"
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

      {/* Introduction Section */}
      <section className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div className="prose prose-lg max-w-none">
              <p className="text-lg text-gray-700 leading-relaxed">
                Willkommen bei {SITE.name} – Ihrem Neugeborenen- und Babyfotografen in Wien! Unser warmes Studio (26–28 °C)
                bietet die perfekte Umgebung für entspannte und sichere Newborn-Fotografie. Wir nehmen uns Zeit für Pausen, 
                sanfte Übergänge und authentische Momente mit Ihrem kleinen Wunder.
              </p>
              <p className="text-lg text-gray-700 leading-relaxed mt-4">
                Die beste Zeit für klassische Neugeborenenfotos ist zwischen Tag 5–14 nach der Geburt, wenn Babys noch sehr 
                schläfrig sind. Aber keine Sorge – auch bis zur 6. Woche machen wir wunderschöne Aufnahmen, dann mit mehr 
                wachen Momenten und Kuschelbildern mit den Eltern.
              </p>
              <p className="text-base text-gray-600 leading-relaxed mt-4">
                Ergänzend zu Neugeborenenfotos bieten wir auch{' '}
                <Link to="/schwangerschaftsfotos-wien/" className="text-purple-600 hover:text-purple-700 underline underline-offset-2">Schwangerschaftsfotos Wien</Link>,{' '}
                <Link to="/babyfotos-wien/" className="text-purple-600 hover:text-purple-700 underline underline-offset-2">Babyfotos Wien</Link> (3–12 Monate) und{' '}
                <Link to="/familienfotos-wien/" className="text-purple-600 hover:text-purple-700 underline underline-offset-2">Familienfotos Wien</Link> an –
                ideal um die ersten Jahre Ihres Kindes vollständig festzuhalten.
                Alle <Link to="/calculator" className="text-purple-600 hover:text-purple-700 underline underline-offset-2">Preise & Pakete</Link> ab €95.
                Jetzt <Link to="/warteliste/" className="text-purple-600 hover:text-purple-700 underline underline-offset-2">Termin buchen</Link>.
              </p>
            </div>
            <div>
              <img
                src={heroImage4}
                alt="Neugeborenes im warmen Studio"
                className="rounded-2xl shadow-lg w-full h-auto object-contain"
                loading="lazy"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Extended Content Section - Safe Copy Slot */}
      {language === 'de' ? (
        <MarkdownCopySlot content={newageCopyMap['neugeborenenfotos-wien'].markdown} />
      ) : (
        <section className="py-12 bg-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 prose prose-lg">
            <h2>What You Can Expect</h2>
            <ul>
              <li><strong>Friendly guidance</strong> instead of uncertainty in front of the camera</li>
              <li><strong>Soft, professional light</strong> (Octa softboxes) for natural skin tones</li>
              <li><strong>Personality in the picture:</strong> Feel free to bring personal items: toys, hobbies, instruments, favorite book – that makes your photos unique.</li>
              <li><strong>Flexible with people & animals:</strong> Pets are welcome – just let us know in advance and we'll plan a little “pet break.”</li>
            </ul>
            <h2>Packages & Options</h2>
            <table>
              <thead><tr><th>Package</th><th>Ideal for</th><th>Included</th></tr></thead>
              <tbody>
                <tr><td><strong>Basic</strong></td><td>one main motif</td><td>Shooting (approx. 60 min) \u00b7 Selection gallery \u00b7 1 retouched image digital</td></tr>
                <tr><td><strong>Premium</strong></td><td>multiple favorite motifs</td><td>more retouched images \u00b7 variants \u00b7 optional print/canvas add-ons</td></tr>
                <tr><td><strong>Deluxe</strong></td><td>\u201cAll included\u201d</td><td>larger selection \u00b7 more retouching \u00b7 ideal for families/milestones</td></tr>
              </tbody>
            </table>
            <h2>What to Bring</h2>
            <ul>
              <li>Diaper bag as usual (diapers, wipes, pacifier/bottle)</li>
              <li>1\u20132 neutral bodysuits/blankets, if you like</li>
              <li>A small personal item (e.g. stuffed animal)</li>
            </ul>
            <p>Water, coffee & tea are available – beer or Prosecco on request. We don't offer make-up services – please arrive with hair & make-up done if possible. Our lighting is very flattering regardless.</p>
            <h2>Safety & Handling of Newborns</h2>
            <p>With newborns, the most important thing is: <strong>safety above all</strong>. We work calmly, warmly and without rush. Poses are created not with pressure, but with patience, gentle adjustments and breaks.</p>
            <ul>
              <li>We schedule time for feeding, changing and soothing.</li>
              <li>We photograph gently and naturally – no force, no risky positions.</li>
              <li>If your baby sleeps: wonderful. If not: also perfect – awake shots are often the most honest.</li>
            </ul>
            <h2>Process – How Your Shoot Works</h2>
            <ol>
              <li><strong>Quick briefing:</strong> who is coming, which combinations are important, what mood do you want?</li>
              <li><strong>Arrival & outfit check:</strong> we coordinate colors and give mini tips.</li>
              <li><strong>Guided shooting:</strong> full group, subgroups, individual portraits \u2013 loosely guided.</li>
              <li><strong>Selection:</strong> If time allows, we often show a selection on the same day (IPS). Otherwise, the selection comes conveniently online.</li>
              <li><strong>Retouching & delivery:</strong> We always deliver the finished images via a private, password-protected online gallery from the cloud.</li>
            </ol>
            <h2>Mini FAQ</h2>
            <p><strong>How long does the shoot take?</strong><br/>Usually about 60 minutes \u2013 with enough time for the most important motifs.</p>
            <p><strong>Are pets allowed?</strong><br/>Yes. Just let us know in advance and we'll plan accordingly.</p>
            <p><strong>When will we receive the photos?</strong><br/>Selection depending on schedule; final delivery after retouching conveniently via the cloud.</p>
          </div>
        </section>
      )}

      {/* Packages Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {language === 'de' ? 'Unsere Pakete' : 'Our Packages'}
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              {language === 'de' ? 'Warmes Studio \u00b7 Sichere Posen \u00b7 Zeit f\u00fcr Pausen' : 'Warm studio \u00b7 Safe poses \u00b7 Time for breaks'}
            </p>
          </div>

          <div className="flex justify-center mb-12">
            {/* Newborn Premium Package */}
            <div className="bg-gradient-to-br from-purple-600 to-pink-600 text-white rounded-2xl shadow-2xl p-8 max-w-md w-full relative">
              <div className="absolute top-0 right-0 bg-yellow-400 text-gray-900 text-sm font-bold px-4 py-2 rounded-bl-lg rounded-tr-2xl">
                BESTSELLER
              </div>
              
              <div className="mb-6 mt-4">
                <h3 className="text-2xl font-bold mb-2">Newborn Premium</h3>
              </div>
              
              <div className="mb-6">
                <div className="flex items-baseline">
                  <span className="text-sm mr-1">Ab</span>
                  <span className="text-4xl font-bold">€195</span>
                </div>
              </div>

              <div className="space-y-4 mb-4">
                <div className="flex items-start">
                  <Check className="h-5 w-5 text-yellow-300 mr-3 flex-shrink-0 mt-0.5" />
                  <span>{language === 'de' ? 'ca. 60 Minuten im Studio' : 'approx. 60 minutes in studio'}</span>
                </div>
                <div className="flex items-start">
                  <Check className="h-5 w-5 text-yellow-300 mr-3 flex-shrink-0 mt-0.5" />
                  <span>{language === 'de' ? '5 retuschierte Lieblingsfotos digital' : '5 retouched favorite photos digital'}</span>
                </div>
                <div className="flex items-start">
                  <Check className="h-5 w-5 text-yellow-300 mr-3 flex-shrink-0 mt-0.5" />
                  <span>{language === 'de' ? 'Leinwand 40×30 cm' : 'Canvas 40×30 cm'}</span>
                </div>
                <div className="flex items-start">
                  <Check className="h-5 w-5 text-yellow-300 mr-3 flex-shrink-0 mt-0.5" />
                  <span>{language === 'de' ? 'Bis zu 12 Personen und auch Haustiere möglich' : 'Up to 12 people and pets welcome'}</span>
                </div>
              </div>

              <p className="text-purple-200 text-sm mb-6">{language === 'de' ? 'Gültig bis 2 Jahre' : 'Valid for up to 2 years'}</p>

              <button
                onClick={() => handleBookPackage('Newborn Premium', 195, 'Neugeborenen-Fotografie - 60 Min, 5 Fotos + Leinwand 40×30 cm')}
                className="block w-full text-center px-6 py-3 bg-white text-purple-600 rounded-lg hover:bg-gray-100 transition-colors font-semibold"
              >
                {language === 'de' ? 'Jetzt Buchen' : 'Book Now'}
              </button>
            </div>
          </div>

          {/* Important Notes Section */}
          <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">{language === 'de' ? 'Wichtige Hinweise:' : 'Important Notes:'}</h3>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="flex items-start">
                <Clock className="h-6 w-6 text-purple-600 mr-3 flex-shrink-0 mt-1" />
                <div>
                  <p className="font-semibold text-gray-900 mb-1">{language === 'de' ? 'Beste Zeit' : 'Best Time'}</p>
                  <p className="text-gray-600 text-sm">{language === 'de' ? 'Tag 5–14 nach der Geburt (geht auch bis 6 Wochen – dann wacher, mehr Kuschelbilder)' : 'Day 5–14 after birth (also works up to 6 weeks – then more awake, more cuddly shots)'}</p>
                </div>
              </div>
              <div className="flex items-start">
                <Shield className="h-6 w-6 text-purple-600 mr-3 flex-shrink-0 mt-1" />
                <div>
                  <p className="font-semibold text-gray-900 mb-1">{language === 'de' ? 'Sicherheit zuerst' : 'Safety First'}</p>
                  <p className="text-gray-600 text-sm">{language === 'de' ? 'Keine erzwungenen Haltungen; Posen stets mit Sicherung' : 'No forced positions; poses always with safety support'}</p>
                </div>
              </div>
              <div className="flex items-start">
                <Baby className="h-6 w-6 text-purple-600 mr-3 flex-shrink-0 mt-1" />
                <div>
                  <p className="font-semibold text-gray-900 mb-1">{language === 'de' ? 'Mitbringen' : 'What to Bring'}</p>
                  <p className="text-gray-600 text-sm">{language === 'de' ? 'Schnuller (zur Beruhigung), Windeln, Ersatzbody, 1–2 persönliche Requisiten (Decke, Stofftier)' : 'Pacifier (for soothing), diapers, spare bodysuit, 1–2 personal props (blanket, stuffed animal)'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* CTA Buttons after packages */}
          <div className="mt-12 text-center bg-gradient-to-r from-purple-100 to-pink-100 rounded-2xl p-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">{language === 'de' ? 'Jetzt buchen' : 'Book now'}</h3>
            <p className="text-gray-700 mb-6">
              👉 <strong>{language === 'de' ? 'Termin sichern:' : 'Secure your spot:'}</strong> {language === 'de' ? 'Plätze sind begrenzt – sichern Sie sich Ihren Wunschtermin auf der Warteliste' : 'Spots are limited – secure your preferred date on the waitlist'}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/warteliste"
                className="inline-flex items-center justify-center px-8 py-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold"
              >
                {language === 'de' ? 'Termin auf der Warteliste sichern' : 'Secure a spot on the waitlist'}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
              <Link
                to="/gutschein/newborn"
                className="inline-flex items-center justify-center px-8 py-4 border-2 border-purple-600 text-purple-600 rounded-lg hover:bg-purple-50 transition-colors font-semibold"
              >
                {language === 'de' ? 'Newborn-Gutschein verschenken' : 'Give a Newborn Voucher'}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Image before next steps */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-12">
            <img
              src={heroImage5}
              alt="Neugeborenen Fotografie Wien"
              className="rounded-2xl shadow-lg w-full h-auto object-contain"
              loading="lazy"
            />
          </div>

          {/* Next Steps Section */}
          <div className="bg-purple-50 rounded-2xl p-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">{language === 'de' ? 'Nächste Schritte' : 'Next Steps'}</h3>
            <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
              <Link
                to="/warteliste"
                className="flex items-center justify-center px-6 py-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold"
              >
                {language === 'de' ? 'Termin sichern' : 'Secure a date'}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
              <div className="flex items-center justify-center px-6 py-4 bg-white text-gray-700 rounded-lg border-2 border-gray-200">
                <span className="font-medium">{language === 'de' ? 'Vorbereitung & Drucke verfügbar' : 'Preparation & prints available'}</span>
              </div>
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
              to="/familienfotos-wien/"
              className="block bg-purple-50 rounded-xl p-6 hover:shadow-lg transition-shadow"
            >
              <Users className="h-10 w-10 text-purple-600 mb-4" />
              <h3 className="font-semibold text-lg mb-2 text-gray-900">{language === 'de' ? 'Familienfotografie' : 'Family Photography'}</h3>
              <p className="text-gray-600 text-sm mb-4">
                {language === 'de' ? 'Authentische Familienfotos im Studio mit bis zu 12 Personen' : 'Authentic family photos in studio with up to 12 people'}
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
            <Link
              to="/business-portrait-wien/"
              className="block bg-purple-50 rounded-xl p-6 hover:shadow-lg transition-shadow"
            >
              <Camera className="h-10 w-10 text-purple-600 mb-4" />
              <h3 className="font-semibold text-lg mb-2 text-gray-900">{language === 'de' ? 'Business-Portraits' : 'Business Portraits'}</h3>
              <p className="text-gray-600 text-sm mb-4">
                {language === 'de' ? 'Professionelle Unternehmensfotos & LinkedIn-Portraits' : 'Professional corporate photos & LinkedIn portraits'}
              </p>
              <span className="text-purple-600 font-semibold flex items-center">
                {language === 'de' ? 'Mehr erfahren' : 'Learn more'} <ArrowRight className="ml-1 h-4 w-4" />
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* Related Services - Internal Links */}
      <ReviewsBlock />
      <PillarGuides pillar="/neugeborenenfotos-wien/" />
      <RelatedServices currentPath="/neugeborenenfotos-wien/" />

      {/* Final CTA Section */}
      <section className="py-16 bg-gradient-to-r from-purple-600 to-pink-600 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            {language === 'de' ? 'Bereit für unvergessliche Neugeborenenfotos?' : 'Ready for unforgettable newborn photos?'}
          </h2>
          <p className="text-xl mb-8 opacity-90">
            {language === 'de' ? 'Sichern Sie sich jetzt Ihren Wunschtermin – Plätze sind begrenzt' : 'Secure your preferred date now – spots are limited'}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/warteliste"
              className="inline-flex items-center justify-center px-8 py-4 bg-white text-purple-600 rounded-lg hover:bg-gray-100 transition-colors font-semibold text-lg"
            >
              {language === 'de' ? 'Termin auf der Warteliste sichern' : 'Secure a spot on the waitlist'}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>

    </div>
    </Layout>
  );
}
