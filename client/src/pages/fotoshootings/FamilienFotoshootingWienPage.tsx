import React from 'react';
import { SEOHead } from '../../components/SEO/SEOHead';
import Layout from '../../components/layout/Layout';
import { RelatedServices } from '../../components/SEO/RelatedServices';
import { ContextualLinks } from '../../components/SEO/ContextualLinks';
import { Link } from 'react-router-dom';
import { Camera, Heart, Users, Star, ArrowRight, Check } from 'lucide-react';
import VoucherPackagesList from '../../components/vouchers/VoucherPackagesList';
import { useLanguage } from '../../context/LanguageContext';
import { SITE } from '../../config/site';

export default function FamilienFotoshootingWienPage() {
  const { language } = useLanguage();
  const de = language === 'de';
  return (
    <Layout>
    <div className="min-h-screen bg-white">
      <SEOHead
        title={`Familien-Fotoshooting in Wien – ${SITE.name}`}
        description="Echte Emotionen und natürliche Familienportraits im Studio oder Outdoor. Termin jetzt planen."
        keywords="familien fotoshooting wien, familienfotograf wien, familienfotos wien, outdoor fotoshooting familie"
        canonical="/familien-fotoshooting-wien/"
        ogImage={`${SITE.url}/images/family-hero.jpg`}
        hreflang={[
          { lang: 'de', url: '/familien-fotoshooting-wien/' },
          { lang: 'en', url: '/en/family-photoshoot-vienna/' }
        ]}
      />

      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-purple-50 via-white to-pink-50 pt-24 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                {de ? 'Familien-Fotoshooting in Wien' : 'Family Photo Shoot in Vienna'}
              </h1>
              <p className="text-xl text-gray-600 mb-8">
                {de
                  ? 'Echte Emotionen und natürliche Familienportraits im Studio oder Outdoor. Wir halten die schönsten Momente Ihrer Familie für die Ewigkeit fest.'
                  : 'Real emotions and natural family portraits in the studio or outdoors. We capture your family’s most beautiful moments to treasure forever.'}
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  to="/warteliste"
                  className="inline-flex items-center justify-center px-8 py-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold"
                >
                  {de ? 'Termin buchen' : 'Book an Appointment'}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
                <Link
                  to="/preise"
                  className="inline-flex items-center justify-center px-8 py-4 border-2 border-purple-600 text-purple-600 rounded-lg hover:bg-purple-50 transition-colors font-semibold"
                >
                  {de ? 'Preise ansehen' : 'View Prices'}
                </Link>
              </div>
            </div>
            <div className="relative">
              <img
                src="/images/family-hero.jpg"
                alt="Glückliche Familie beim Fotoshooting in Wien"
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
            {de ? <>Warum ein Familien-Fotoshooting bei {SITE.name}?</> : <>Why choose a family photo shoot at {SITE.name}?</>}
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full mb-4">
                <Heart className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold mb-3">{de ? 'Natürliche Emotionen' : 'Natural Emotions'}</h3>
              <p className="text-gray-600">
                {de ? 'Spontane, ungezwungene Aufnahmen, die echte Verbindungen zeigen' : 'Spontaneous, relaxed shots that show real connection'}
              </p>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full mb-4">
                <Users className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold mb-3">{de ? 'Für alle Generationen' : 'For All Generations'}</h3>
              <p className="text-gray-600">
                {de ? 'Von Neugeborenen bis Großeltern – alle sind willkommen' : 'From newborns to grandparents – everyone is welcome'}
              </p>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full mb-4">
                <Camera className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold mb-3">{de ? 'Studio & Outdoor' : 'Studio & Outdoor'}</h3>
              <p className="text-gray-600">
                {de ? 'Wählen Sie zwischen gemütlichem Studio oder natürlichen Locations' : 'Choose between a cosy studio or natural outdoor locations'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Packages Section - dynamic from vouchers API */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12">{de ? 'Unsere Familien-Pakete' : 'Our Family Packages'}</h2>
          <div className="max-w-4xl mx-auto">
            {/* VoucherPackagesList will fetch and render vouchers for this category */}
            <React.Suspense fallback={<div className="text-center">Loading packages...</div>}>
              {/* @ts-ignore */}
              <VoucherPackagesList category="family" />
            </React.Suspense>
          </div>
        </div>
      </section>

      {/* Process Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12">{de ? 'So läuft Ihr Familien-Shooting ab' : 'How Your Family Shoot Works'}</h2>
          <div className="grid md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="bg-purple-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-purple-600">1</span>
              </div>
              <h3 className="font-semibold mb-2">{de ? 'Termin buchen' : 'Book an appointment'}</h3>
              <p className="text-gray-600 text-sm">{de ? 'Online oder telefonisch' : 'Online or by phone'}</p>
            </div>
            <div className="text-center">
              <div className="bg-purple-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-purple-600">2</span>
              </div>
              <h3 className="font-semibold mb-2">{de ? 'Vorbesprechung' : 'Consultation'}</h3>
              <p className="text-gray-600 text-sm">{de ? 'Wünsche & Location klären' : 'Discuss wishes & location'}</p>
            </div>
            <div className="text-center">
              <div className="bg-purple-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-purple-600">3</span>
              </div>
              <h3 className="font-semibold mb-2">{de ? 'Fotoshooting' : 'Photo shoot'}</h3>
              <p className="text-gray-600 text-sm">{de ? 'Entspannt & professionell' : 'Relaxed & professional'}</p>
            </div>
            <div className="text-center">
              <div className="bg-purple-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-purple-600">4</span>
              </div>
              <h3 className="font-semibold mb-2">{de ? 'Bildauswahl' : 'Image selection'}</h3>
              <p className="text-gray-600 text-sm">{de ? 'Online-Galerie nach 7 Tagen' : 'Online gallery after 7 days'}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Related Services - Internal Links */}
      <section className="py-16 bg-purple-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-center mb-8">{de ? 'Weitere Fotografie-Services' : 'More Photography Services'}</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <Link
              to="/baby-fotografie-wien/"
              className="block bg-white rounded-xl p-6 hover:shadow-lg transition-shadow"
            >
              <h3 className="font-semibold text-lg mb-2">{de ? 'Baby & Newborn Fotografie' : 'Baby & Newborn Photography'}</h3>
              <p className="text-gray-600 text-sm mb-4">
                {de ? 'Zarte Neugeborenenfotos mit Herz und Sicherheit' : 'Gentle newborn photos with heart and safety'}
              </p>
              <span className="text-purple-600 font-semibold flex items-center">
                {de ? 'Mehr erfahren' : 'Learn more'} <ArrowRight className="ml-1 h-4 w-4" />
              </span>
            </Link>
            <Link
              to="/schwangerschaftsfotos-wien/"
              className="block bg-white rounded-xl p-6 hover:shadow-lg transition-shadow"
            >
              <h3 className="font-semibold text-lg mb-2">{de ? 'Schwangerschafts-Fotos' : 'Maternity Photos'}</h3>
              <p className="text-gray-600 text-sm mb-4">
                {de ? 'Emotionale Babybauch-Portraits im Studio oder Outdoor' : 'Emotional baby bump portraits in studio or outdoor'}
              </p>
              <span className="text-purple-600 font-semibold flex items-center">
                {de ? 'Mehr erfahren' : 'Learn more'} <ArrowRight className="ml-1 h-4 w-4" />
              </span>
            </Link>
            <Link
              to="/portrait-fotografie-wien/"
              className="block bg-white rounded-xl p-6 hover:shadow-lg transition-shadow"
            >
              <h3 className="font-semibold text-lg mb-2">{de ? 'Paar-Fotoshooting' : 'Couples Photo Shoot'}</h3>
              <p className="text-gray-600 text-sm mb-4">
                {de ? 'Romantische Paarshootings für besondere Momente' : 'Romantic couples shoots for special moments'}
              </p>
              <span className="text-purple-600 font-semibold flex items-center">
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
              {de ? 'Perfekte Ergänzungen für Ihre Familienfotografie' : 'Perfect complements to your family photography'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Pregnancy Photography */}
            <Link
              to="/schwangerschaftsfotos-wien/"
              className="bg-gray-50 rounded-lg p-6 hover:shadow-lg transition-shadow group"
            >
              <Heart className="h-12 w-12 text-purple-600 mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-purple-600 transition-colors">
                {de ? 'Schwangerschaftsfotos' : 'Maternity Photos'}
              </h3>
              <p className="text-gray-600 mb-4">
                {de ? 'Halten Sie die wunderschöne Babybauchzeit vor der Geburt fest – im Studio oder Outdoor.' : 'Capture the beautiful bump time before the birth – in the studio or outdoors.'}
              </p>
              <span className="text-purple-600 font-semibold inline-flex items-center">
                {de ? 'Mehr erfahren' : 'Learn more'} <ArrowRight className="ml-2 h-4 w-4" />
              </span>
            </Link>

            {/* Baby Photography */}
            <Link
              to="/baby-fotografie-wien/"
              className="bg-gray-50 rounded-lg p-6 hover:shadow-lg transition-shadow group"
            >
              <Camera className="h-12 w-12 text-purple-600 mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-purple-600 transition-colors">
                {de ? 'Baby & Newborn Fotografie' : 'Baby & Newborn Photography'}
              </h3>
              <p className="text-gray-600 mb-4">
                {de ? 'Zarte Neugeborenenfotos in den ersten Lebenstagen – sicher und liebevoll.' : 'Gentle newborn photos in the first days of life – safe and loving.'}
              </p>
              <span className="text-purple-600 font-semibold inline-flex items-center">
                {de ? 'Mehr erfahren' : 'Learn more'} <ArrowRight className="ml-2 h-4 w-4" />
              </span>
            </Link>

            {/* Business Portraits */}
            <Link
              to="/business-portrait-wien/"
              className="bg-gray-50 rounded-lg p-6 hover:shadow-lg transition-shadow group"
            >
              <Users className="h-12 w-12 text-purple-600 mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-purple-600 transition-colors">
                {de ? 'Business Portraits' : 'Business Portraits'}
              </h3>
              <p className="text-gray-600 mb-4">
                {de ? 'Professionelle Mitarbeiterfotos und Headshots für LinkedIn und Firmenwebsite.' : 'Professional team photos and headshots for LinkedIn and your company website.'}
              </p>
              <span className="text-purple-600 font-semibold inline-flex items-center">
                {de ? 'Mehr erfahren' : 'Learn more'} <ArrowRight className="ml-2 h-4 w-4" />
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-purple-600 to-pink-600 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            {de ? 'Bereit für unvergessliche Familienfotos?' : 'Ready for unforgettable family photos?'}
          </h2>
          <p className="text-xl mb-8 opacity-90">
            {de ? 'Buchen Sie jetzt Ihren Termin und sichern Sie sich die schönsten Erinnerungen' : 'Book your appointment now and secure your most beautiful memories'}
          </p>
          <Link
            to="/warteliste"
            className="inline-flex items-center px-8 py-4 bg-white text-purple-600 rounded-lg hover:bg-gray-100 transition-colors font-semibold text-lg"
          >
            {de ? 'Jetzt Termin vereinbaren' : 'Book an Appointment Now'}
            <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
        </div>
      </section>

    </div>
      <ContextualLinks pathname="/familien-fotoshooting-wien/" />
      <RelatedServices currentPath="/familien-fotoshooting-wien/" />
    </Layout>
  );
}
