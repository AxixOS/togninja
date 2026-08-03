import { SEOHead } from '../../components/SEO/SEOHead';
import Layout from '../../components/layout/Layout';
import { Link } from 'react-router-dom';
import { ContextualLinks } from '../../components/SEO/ContextualLinks';
import { Baby, Heart, Shield, Star, ArrowRight, Check, Clock, Users, Camera } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { SITE } from '../../config/site';

export default function BabyFotografieWienPage() {
  const { language } = useLanguage();
  const de = language === 'de';
  return (
    <Layout>
    <div className="min-h-screen bg-white">
      <SEOHead
        title={`Baby- & Newborn-Fotografie in Wien – ${SITE.name}`}
        description="Zarte Neugeborenenfotos mit Herz und Sicherheit. Erinnerungen für immer."
        keywords="babyfotograf wien, newborn fotografie wien, neugeborenen fotoshooting, babyshooting wien"
        canonical="/baby-fotografie-wien/"
        ogImage={`${SITE.url}/images/baby-hero.jpg`}
        hreflang={[
          { lang: 'de', url: '/baby-fotografie-wien/' },
          { lang: 'en', url: '/en/baby-photography-vienna/' }
        ]}
      />

      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-pink-50 via-white to-purple-50 pt-24 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                {de ? 'Baby- & Newborn-Fotografie in Wien' : 'Baby & Newborn Photography in Vienna'}
              </h1>
              <p className="text-xl text-gray-600 mb-8">
                {de
                  ? 'Zarte, sichere und liebevolle Neugeborenen-Fotoshootings in Wien. Wir halten die ersten kostbaren Momente Ihres Babys für immer fest.'
                  : 'Gentle, safe, and loving newborn photo sessions in Vienna. We capture your baby\'s first precious moments forever.'}
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  to="/warteliste"
                  className="inline-flex items-center justify-center px-8 py-4 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors font-semibold"
                >
                  {de ? 'Termin buchen' : 'Book an Appointment'}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
                <Link
                  to="/gutschein/newborn"
                  className="inline-flex items-center justify-center px-8 py-4 border-2 border-pink-600 text-pink-600 rounded-lg hover:bg-pink-50 transition-colors font-semibold"
                >
                  {de ? 'Gutschein verschenken' : 'Give a Voucher'}
                </Link>
              </div>
            </div>
            <div className="relative">
              <img
                src="/images/baby-hero.jpg"
                alt="Neugeborenes Baby beim professionellen Fotoshooting in Wien"
                className="rounded-2xl shadow-2xl"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12">
            {de ? 'Sicherheit & Komfort für Ihr Neugeborenes' : 'Safety & Comfort for Your Newborn'}
          </h2>
          <div className="grid md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-pink-100 rounded-full mb-4">
                <Shield className="h-8 w-8 text-pink-600" />
              </div>
              <h3 className="text-lg font-semibold mb-3">{de ? 'Sicher & Hygienisch' : 'Safe & Hygienic'}</h3>
              <p className="text-gray-600 text-sm">
                {de ? 'Höchste Hygiene-Standards und sichere Posing-Techniken' : 'Highest hygiene standards and safe posing techniques'}
              </p>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-pink-100 rounded-full mb-4">
                <Clock className="h-8 w-8 text-pink-600" />
              </div>
              <h3 className="text-lg font-semibold mb-3">{de ? 'Flexibel & Geduldig' : 'Flexible & Patient'}</h3>
              <p className="text-gray-600 text-sm">
                {de ? 'Wir nehmen uns Zeit - Pausen für Stillen & Wickeln inklusive' : 'We take our time – breaks for feeding & diaper changes included'}
              </p>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-pink-100 rounded-full mb-4">
                <Heart className="h-8 w-8 text-pink-600" />
              </div>
              <h3 className="text-lg font-semibold mb-3">{de ? 'Warmes Studio' : 'Warm Studio'}</h3>
              <p className="text-gray-600 text-sm">
                {de ? 'Angenehm warm (26-28°C) für nackte Baby-Fotografie' : 'Comfortably warm (26-28°C) for bare-skin baby photography'}
              </p>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-pink-100 rounded-full mb-4">
                <Baby className="h-8 w-8 text-pink-600" />
              </div>
              <h3 className="text-lg font-semibold mb-3">{de ? 'Ideales Alter' : 'Ideal Age'}</h3>
              <p className="text-gray-600 text-sm">
                {de ? 'Beste Ergebnisse in den ersten 5-14 Lebenstagen' : 'Best results within the first 5-14 days of life'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Packages Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12">{de ? 'Newborn-Fotografie Pakete' : 'Newborn Photography Packages'}</h2>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Essential Package */}
            <div className="bg-white rounded-xl shadow-lg p-8">
              <h3 className="text-2xl font-bold mb-4">Essential</h3>
              <div className="text-3xl font-bold text-pink-600 mb-6">
                €299
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-start">
                  <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                  <span>{de ? '2-3 Stunden Shooting (inkl. Pausen)' : '2-3 hour session (incl. breaks)'}</span>
                </li>
                <li className="flex items-start">
                  <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                  <span>{de ? '15 bearbeitete Bilder' : '15 edited images'}</span>
                </li>
                <li className="flex items-start">
                  <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                  <span>{de ? 'Baby solo & mit Eltern' : 'Baby solo & with parents'}</span>
                </li>
                <li className="flex items-start">
                  <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                  <span>{de ? 'Requisiten & Textilien' : 'Props & fabrics'}</span>
                </li>
              </ul>
              <Link
                to="/warteliste"
                className="block text-center px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
              >
                {de ? 'Jetzt buchen' : 'Book Now'}
              </Link>
            </div>

            {/* Premium Package */}
            <div className="bg-gradient-to-br from-pink-600 to-purple-600 text-white rounded-xl shadow-2xl p-8">
              <div className="bg-yellow-400 text-gray-900 text-sm font-bold px-3 py-1 rounded-full inline-block mb-4">
                {de ? 'EMPFOHLEN' : 'RECOMMENDED'}
              </div>
              <h3 className="text-2xl font-bold mb-4">Premium</h3>
              <div className="text-3xl font-bold mb-6">
                €499
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-start">
                  <Check className="h-5 w-5 text-yellow-300 mr-2 flex-shrink-0 mt-0.5" />
                  <span>{de ? '3-4 Stunden Shooting' : '3-4 hour session'}</span>
                </li>
                <li className="flex items-start">
                  <Check className="h-5 w-5 text-yellow-300 mr-2 flex-shrink-0 mt-0.5" />
                  <span>{de ? '30 bearbeitete Bilder' : '30 edited images'}</span>
                </li>
                <li className="flex items-start">
                  <Check className="h-5 w-5 text-yellow-300 mr-2 flex-shrink-0 mt-0.5" />
                  <span>{de ? 'Geschwister-Fotos inklusive' : 'Sibling photos included'}</span>
                </li>
                <li className="flex items-start">
                  <Check className="h-5 w-5 text-yellow-300 mr-2 flex-shrink-0 mt-0.5" />
                  <span>{de ? 'Premium Fotoalbum 20x20cm' : 'Premium photo album 20x20cm'}</span>
                </li>
                <li className="flex items-start">
                  <Check className="h-5 w-5 text-yellow-300 mr-2 flex-shrink-0 mt-0.5" />
                  <span>{de ? 'Alle Bilder in Druckqualität' : 'All images in print quality'}</span>
                </li>
              </ul>
              <Link
                to="/warteliste"
                className="block text-center px-6 py-3 bg-white text-pink-600 rounded-lg hover:bg-gray-100 transition-colors font-semibold"
              >
                {de ? 'Jetzt buchen' : 'Book Now'}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Tips Section */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12">{de ? 'Tipps für Ihr Newborn-Shooting' : 'Tips for Your Newborn Session'}</h2>
          <div className="space-y-6">
            <div className="bg-pink-50 rounded-lg p-6">
              <h3 className="font-semibold text-lg mb-2">{de ? '📅 Bester Zeitpunkt' : '📅 Best Timing'}</h3>
              <p className="text-gray-700">
                {de
                  ? 'Buchen Sie bereits während der Schwangerschaft und planen Sie das Shooting für die ersten 5-14 Lebenstage ein, wenn Babys noch sehr schläfrig sind.'
                  : 'Book during your pregnancy and plan the session for the first 5-14 days of life, when babies are still very sleepy.'}
              </p>
            </div>
            <div className="bg-pink-50 rounded-lg p-6">
              <h3 className="font-semibold text-lg mb-2">{de ? '🍼 Vor dem Termin' : '🍼 Before Your Session'}</h3>
              <p className="text-gray-700">
                {de
                  ? 'Füttern Sie Ihr Baby ca. 30 Minuten vor dem Shooting, damit es satt und zufrieden ist. Eine volle Windel und ein voller Bauch sorgen für entspannte Posen.'
                  : 'Feed your baby about 30 minutes before the session so they are full and content. A fresh diaper and a full tummy make for relaxed poses.'}
              </p>
            </div>
            <div className="bg-pink-50 rounded-lg p-6">
              <h3 className="font-semibold text-lg mb-2">{de ? '👶 Was mitbringen?' : '👶 What to Bring?'}</h3>
              <p className="text-gray-700">
                {de
                  ? 'Windeln, Feuchttücher, Schnuller (falls verwendet), ein Lieblingsdeckchen. Alle Requisiten und Textilien stellen wir.'
                  : 'Diapers, wet wipes, a pacifier (if your baby uses one), and a favorite blanket. We provide all props and fabrics.'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Related Services */}
      <section className="py-16 bg-pink-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-center mb-8">{de ? 'Passende Ergänzungen' : 'Perfect Additions'}</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <Link
              to="/schwangerschaftsfotos-wien/"
              className="block bg-white rounded-xl p-6 hover:shadow-lg transition-shadow"
            >
              <h3 className="font-semibold text-lg mb-2">{de ? 'Schwangerschafts-Fotos' : 'Maternity Photos'}</h3>
              <p className="text-gray-600 text-sm mb-4">
                {de ? 'Halten Sie die Vorfreude auf Ihr Baby fest' : 'Capture the anticipation of your baby\'s arrival'}
              </p>
              <span className="text-pink-600 font-semibold flex items-center">
                {de ? 'Mehr erfahren' : 'Learn more'} <ArrowRight className="ml-1 h-4 w-4" />
              </span>
            </Link>
            <Link
              to="/familien-fotoshooting-wien/"
              className="block bg-white rounded-xl p-6 hover:shadow-lg transition-shadow"
            >
              <h3 className="font-semibold text-lg mb-2">{de ? 'Familien-Fotoshooting' : 'Family Photo Shoot'}</h3>
              <p className="text-gray-600 text-sm mb-4">
                {de ? 'Die ganze Familie gemeinsam vor der Kamera' : 'The whole family together in front of the camera'}
              </p>
              <span className="text-pink-600 font-semibold flex items-center">
                {de ? 'Mehr erfahren' : 'Learn more'} <ArrowRight className="ml-1 h-4 w-4" />
              </span>
            </Link>
            <Link
              to="/kinder-fotografie-wien/"
              className="block bg-white rounded-xl p-6 hover:shadow-lg transition-shadow"
            >
              <h3 className="font-semibold text-lg mb-2">{de ? 'Kinder-Fotografie' : 'Children\'s Photography'}</h3>
              <p className="text-gray-600 text-sm mb-4">
                {de ? 'Lebendige Kinderfotos voller Persönlichkeit' : 'Vibrant children\'s photos full of personality'}
              </p>
              <span className="text-pink-600 font-semibold flex items-center">
                {de ? 'Mehr erfahren' : 'Learn more'} <ArrowRight className="ml-1 h-4 w-4" />
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
              {de ? 'Weitere Fotografie-Services' : 'More Photography Services'}
            </h2>
            <p className="text-lg text-gray-600">
              {de ? 'Komplettieren Sie Ihre Familien-Fotostory' : 'Complete your family photo story'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Pregnancy Photography */}
            <Link
              to="/schwangerschaftsfotos-wien/"
              className="bg-gray-50 rounded-lg p-6 hover:shadow-lg transition-shadow group"
            >
              <Heart className="h-12 w-12 text-pink-600 mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-pink-600 transition-colors">
                {de ? 'Schwangerschaftsfotos' : 'Maternity Photos'}
              </h3>
              <p className="text-gray-600 mb-4">
                {de
                  ? 'Halten Sie die Babybauchzeit vor der Geburt fest – die perfekte Ergänzung zum Newborn-Shooting.'
                  : 'Capture your bump before the birth – the perfect complement to a newborn session.'}
              </p>
              <span className="text-pink-600 font-semibold inline-flex items-center">
                {de ? 'Mehr erfahren' : 'Learn more'} <ArrowRight className="ml-2 h-4 w-4" />
              </span>
            </Link>

            {/* Family Photography */}
            <Link
              to="/familien-fotoshooting-wien/"
              className="bg-gray-50 rounded-lg p-6 hover:shadow-lg transition-shadow group"
            >
              <Users className="h-12 w-12 text-pink-600 mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-pink-600 transition-colors">
                {de ? 'Familienfotografie' : 'Family Photography'}
              </h3>
              <p className="text-gray-600 mb-4">
                {de
                  ? 'Natürliche Familienporträts mit Baby – gemeinsame Momente festhalten.'
                  : 'Natural family portraits with your baby – capturing moments together.'}
              </p>
              <span className="text-pink-600 font-semibold inline-flex items-center">
                {de ? 'Mehr erfahren' : 'Learn more'} <ArrowRight className="ml-2 h-4 w-4" />
              </span>
            </Link>

            {/* Event Photography */}
            <Link
              to="/eventfotografie-wien/"
              className="bg-gray-50 rounded-lg p-6 hover:shadow-lg transition-shadow group"
            >
              <Camera className="h-12 w-12 text-pink-600 mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-pink-600 transition-colors">
                {de ? 'Eventfotografie' : 'Event Photography'}
              </h3>
              <p className="text-gray-600 mb-4">
                {de
                  ? 'Professionelle Dokumentation von Taufen, Geburtstagen und Familienfeiern.'
                  : 'Professional coverage of christenings, birthdays, and family celebrations.'}
              </p>
              <span className="text-pink-600 font-semibold inline-flex items-center">
                {de ? 'Mehr erfahren' : 'Learn more'} <ArrowRight className="ml-2 h-4 w-4" />
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-pink-600 to-purple-600 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            {de ? 'Die ersten Tage vergehen so schnell...' : 'The first days pass so quickly...'}
          </h2>
          <p className="text-xl mb-8 opacity-90">
            {de
              ? 'Sichern Sie sich jetzt Ihren Wunschtermin für zauberhafte Neugeborenen-Fotos'
              : 'Secure your preferred date now for magical newborn photos'}
          </p>
          <Link
            to="/warteliste"
            className="inline-flex items-center px-8 py-4 bg-white text-pink-600 rounded-lg hover:bg-gray-100 transition-colors font-semibold text-lg"
          >
            {de ? 'Jetzt reservieren' : 'Reserve Now'}
            <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
        </div>
      </section>

      <ContextualLinks pathname="/baby-fotografie-wien/" />

    </div>
    </Layout>
  );
}
