import { SEOHead } from '../../components/SEO/SEOHead';
import Layout from '../../components/layout/Layout';
import { RelatedServices } from '../../components/SEO/RelatedServices';
import { ContextualLinks } from '../../components/SEO/ContextualLinks';
import { Link } from 'react-router-dom';
import { Baby, Heart, Smile, Camera, ArrowRight, Check, Gift } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { SITE } from '../../config/site';

export default function KinderFotografieWienPage() {
  const { language } = useLanguage();
  const de = language === 'de';
  return (
    <Layout>
    <div className="min-h-screen bg-white">
      <SEOHead
        title={`Kinder-Fotografie Wien | ${SITE.name}`}
        description="Professionelle Kinderfotografie in Wien. Natürliche, lebendige Kinderfotos im Studio oder Outdoor. Vom Kleinkind bis zum Teenager. Jetzt Termin buchen!"
        keywords="kinderfotografie wien, kinderfotos wien, kinderfotograf wien, kindershooting wien, kinderportraits wien"
        canonical="/kinder-fotografie-wien/"
        hreflang={[
          { lang: 'de', url: '/kinder-fotografie-wien/' },
          { lang: 'en', url: '/en/children-photography-vienna/' }
        ]}
      />

      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-yellow-50 via-orange-50 to-pink-50 pt-24 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                {de ? 'Kinder-Fotografie in Wien' : 'Children’s Photography in Vienna'}
              </h1>
              <p className="text-xl text-gray-600 mb-8">
                {de
                  ? 'Lebendige, natürliche Kinderfotos, die die Persönlichkeit Ihres Kindes einfangen. Vom verspielten Kleinkind bis zum selbstbewussten Teenager – wir halten jeden Moment fest.'
                  : 'Vibrant, natural children’s photos that capture your child’s personality. From a playful toddler to a confident teenager – we capture every moment.'}
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  to="/kontakt"
                  className="inline-flex items-center justify-center px-8 py-4 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-semibold"
                >
                  {de ? 'Jetzt Termin buchen' : 'Book an Appointment'}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
                <Link
                  to="/vouchers"
                  className="inline-flex items-center justify-center px-8 py-4 bg-white text-orange-600 border-2 border-orange-500 rounded-lg hover:bg-orange-50 transition-colors font-semibold"
                >
                  {de ? 'Gutschein verschenken' : 'Give a Voucher'}
                </Link>
              </div>
            </div>
            <div className="relative">
              <div className="aspect-square rounded-2xl bg-gradient-to-br from-orange-200 to-pink-200 flex items-center justify-center">
                <Camera className="w-32 h-32 text-white" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Age Groups Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">{de ? 'Für jedes Alter das richtige Shooting' : 'The right shoot for every age'}</h2>
            <p className="text-lg text-gray-600">{de ? 'Von Kleinkindern bis zu Teenagern – wir passen uns dem Alter und Charakter an' : 'From toddlers to teenagers – we adapt to each age and character'}</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-yellow-50 rounded-xl p-6">
              <Baby className="w-12 h-12 text-orange-600 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-3">{de ? 'Kleinkinder (1-3 Jahre)' : 'Toddlers (ages 1-3)'}</h3>
              <ul className="space-y-2 text-gray-600">
                <li className="flex items-start">
                  <Check className="w-5 h-5 text-green-600 mr-2 flex-shrink-0 mt-0.5" />
                  <span>{de ? 'Spielerischer Ansatz' : 'Playful approach'}</span>
                </li>
                <li className="flex items-start">
                  <Check className="w-5 h-5 text-green-600 mr-2 flex-shrink-0 mt-0.5" />
                  <span>{de ? 'Kurze, flexible Sessions' : 'Short, flexible sessions'}</span>
                </li>
                <li className="flex items-start">
                  <Check className="w-5 h-5 text-green-600 mr-2 flex-shrink-0 mt-0.5" />
                  <span>{de ? 'Eltern-Kind-Interaktion' : 'Parent-child interaction'}</span>
                </li>
              </ul>
            </div>

            <div className="bg-orange-50 rounded-xl p-6">
              <Smile className="w-12 h-12 text-orange-600 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-3">{de ? 'Kindergartenkinder (3-6 Jahre)' : 'Preschoolers (ages 3-6)'}</h3>
              <ul className="space-y-2 text-gray-600">
                <li className="flex items-start">
                  <Check className="w-5 h-5 text-green-600 mr-2 flex-shrink-0 mt-0.5" />
                  <span>{de ? 'Energie und Verspieltheit' : 'Energy and playfulness'}</span>
                </li>
                <li className="flex items-start">
                  <Check className="w-5 h-5 text-green-600 mr-2 flex-shrink-0 mt-0.5" />
                  <span>{de ? 'Thematische Shootings' : 'Themed shoots'}</span>
                </li>
                <li className="flex items-start">
                  <Check className="w-5 h-5 text-green-600 mr-2 flex-shrink-0 mt-0.5" />
                  <span>{de ? 'Kreative Requisiten' : 'Creative props'}</span>
                </li>
              </ul>
            </div>

            <div className="bg-pink-50 rounded-xl p-6">
              <Heart className="w-12 h-12 text-orange-600 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-3">{de ? 'Schulkinder & Teens (6-16 Jahre)' : 'School kids & teens (ages 6-16)'}</h3>
              <ul className="space-y-2 text-gray-600">
                <li className="flex items-start">
                  <Check className="w-5 h-5 text-green-600 mr-2 flex-shrink-0 mt-0.5" />
                  <span>{de ? 'Individuelle Persönlichkeit' : 'Individual personality'}</span>
                </li>
                <li className="flex items-start">
                  <Check className="w-5 h-5 text-green-600 mr-2 flex-shrink-0 mt-0.5" />
                  <span>{de ? 'Moderne Portraits' : 'Modern portraits'}</span>
                </li>
                <li className="flex items-start">
                  <Check className="w-5 h-5 text-green-600 mr-2 flex-shrink-0 mt-0.5" />
                  <span>{de ? 'Styling-Beratung' : 'Styling advice'}</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">{de ? 'Unsere Kinder-Fotografie Pakete' : 'Our Children’s Photography Packages'}</h2>
            <p className="text-lg text-gray-600">{de ? 'Transparente Preise für unvergessliche Kinderfotos' : 'Transparent prices for unforgettable children’s photos'}</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {/* Mini Package */}
            <div className="bg-white rounded-xl shadow-lg p-8 border-2 border-gray-200">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Mini Shooting</h3>
              <div className="mb-6">
                <span className="text-4xl font-bold text-orange-600">€179</span>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-start">
                  <Check className="w-5 h-5 text-green-600 mr-3 flex-shrink-0 mt-0.5" />
                  <span>{de ? '20 Minuten Shooting' : '20 minute shoot'}</span>
                </li>
                <li className="flex items-start">
                  <Check className="w-5 h-5 text-green-600 mr-3 flex-shrink-0 mt-0.5" />
                  <span>{de ? '10 bearbeitete Bilder digital' : '10 edited digital images'}</span>
                </li>
                <li className="flex items-start">
                  <Check className="w-5 h-5 text-green-600 mr-3 flex-shrink-0 mt-0.5" />
                  <span>{de ? '1 Location (Studio oder Outdoor)' : '1 location (studio or outdoor)'}</span>
                </li>
                <li className="flex items-start">
                  <Check className="w-5 h-5 text-green-600 mr-3 flex-shrink-0 mt-0.5" />
                  <span>{de ? '1 Outfit' : '1 outfit'}</span>
                </li>
              </ul>
              <Link
                to="/kontakt"
                className="block w-full text-center px-6 py-3 bg-gray-100 text-gray-900 rounded-lg hover:bg-gray-200 transition-colors font-semibold"
              >
                {de ? 'Jetzt buchen' : 'Book Now'}
              </Link>
            </div>

            {/* Standard Package */}
            <div className="bg-white rounded-xl shadow-xl p-8 border-2 border-orange-500 relative transform sm:scale-105">
              <div className="absolute top-0 right-0 bg-orange-500 text-white px-4 py-1 rounded-bl-lg rounded-tr-lg text-sm font-semibold">
                {de ? 'BELIEBT' : 'POPULAR'}
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Standard Shooting</h3>
              <div className="mb-6">
                <span className="text-4xl font-bold text-orange-600">€299</span>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-start">
                  <Check className="w-5 h-5 text-green-600 mr-3 flex-shrink-0 mt-0.5" />
                  <span>{de ? '45 Minuten Shooting' : '45 minute shoot'}</span>
                </li>
                <li className="flex items-start">
                  <Check className="w-5 h-5 text-green-600 mr-3 flex-shrink-0 mt-0.5" />
                  <span>{de ? '20 bearbeitete Bilder digital' : '20 edited digital images'}</span>
                </li>
                <li className="flex items-start">
                  <Check className="w-5 h-5 text-green-600 mr-3 flex-shrink-0 mt-0.5" />
                  <span>{de ? '2 Locations oder Outfits' : '2 locations or outfits'}</span>
                </li>
                <li className="flex items-start">
                  <Check className="w-5 h-5 text-green-600 mr-3 flex-shrink-0 mt-0.5" />
                  <span>{de ? 'Requisiten & Accessoires' : 'Props & accessories'}</span>
                </li>
                <li className="flex items-start">
                  <Check className="w-5 h-5 text-green-600 mr-3 flex-shrink-0 mt-0.5" />
                  <span>{de ? 'Online-Galerie für 3 Monate' : 'Online gallery for 3 months'}</span>
                </li>
              </ul>
              <Link
                to="/kontakt"
                className="block w-full text-center px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-semibold"
              >
                {de ? 'Jetzt buchen' : 'Book Now'}
              </Link>
            </div>

            {/* Premium Package */}
            <div className="bg-white rounded-xl shadow-lg p-8 border-2 border-gray-200">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Premium Shooting</h3>
              <div className="mb-6">
                <span className="text-4xl font-bold text-orange-600">€449</span>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-start">
                  <Check className="w-5 h-5 text-green-600 mr-3 flex-shrink-0 mt-0.5" />
                  <span>{de ? '90 Minuten Shooting' : '90 minute shoot'}</span>
                </li>
                <li className="flex items-start">
                  <Check className="w-5 h-5 text-green-600 mr-3 flex-shrink-0 mt-0.5" />
                  <span>{de ? '35 bearbeitete Bilder digital' : '35 edited digital images'}</span>
                </li>
                <li className="flex items-start">
                  <Check className="w-5 h-5 text-green-600 mr-3 flex-shrink-0 mt-0.5" />
                  <span>{de ? '3 Locations oder Outfits' : '3 locations or outfits'}</span>
                </li>
                <li className="flex items-start">
                  <Check className="w-5 h-5 text-green-600 mr-3 flex-shrink-0 mt-0.5" />
                  <span>{de ? 'Styling-Beratung inklusive' : 'Styling advice included'}</span>
                </li>
                <li className="flex items-start">
                  <Check className="w-5 h-5 text-green-600 mr-3 flex-shrink-0 mt-0.5" />
                  <span>{de ? 'Premium Fotoalbum (20x30cm)' : 'Premium photo album (20x30cm)'}</span>
                </li>
                <li className="flex items-start">
                  <Check className="w-5 h-5 text-green-600 mr-3 flex-shrink-0 mt-0.5" />
                  <span>{de ? 'Geschwister dürfen mitmachen' : 'Siblings can join in'}</span>
                </li>
              </ul>
              <Link
                to="/kontakt"
                className="block w-full text-center px-6 py-3 bg-gray-100 text-gray-900 rounded-lg hover:bg-gray-200 transition-colors font-semibold"
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
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">{de ? 'Tipps für ein gelungenes Kindershooting' : 'Tips for a successful children’s shoot'}</h2>

          <div className="space-y-6">
            <div className="bg-orange-50 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-3">{de ? 'Beste Zeit für das Shooting' : 'Best time for the shoot'}</h3>
              <p className="text-gray-600">
                {de
                  ? 'Wählen Sie eine Tageszeit, zu der Ihr Kind ausgeruht und gut gelaunt ist. Vermeiden Sie Zeiten kurz vor dem Mittagsschlaf oder Essenszeiten.'
                  : 'Choose a time of day when your child is well-rested and in a good mood. Avoid times just before a nap or around meals.'}
              </p>
            </div>

            <div className="bg-yellow-50 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-3">{de ? 'Kleidung & Styling' : 'Clothing & styling'}</h3>
              <p className="text-gray-600">
                {de
                  ? 'Bequeme Kleidung in hellen, freundlichen Farben funktioniert am besten. Vermeiden Sie auffällige Muster oder Logos. Bringen Sie gerne 2-3 Outfits mit.'
                  : 'Comfortable clothing in bright, friendly colours works best. Avoid bold patterns or logos. Feel free to bring 2-3 outfits.'}
              </p>
            </div>

            <div className="bg-pink-50 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-3">{de ? 'Lieblingsspielzeug mitbringen' : 'Bring a favourite toy'}</h3>
              <p className="text-gray-600">
                {de
                  ? 'Ein vertrautes Spielzeug oder Kuscheltier kann helfen, dass sich Ihr Kind wohlfühlt und natürliche, authentische Momente entstehen.'
                  : 'A familiar toy or cuddly companion can help your child feel at ease, creating natural, authentic moments.'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Related Services */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">{de ? 'Weitere Fotoshootings' : 'More Photo Shoots'}</h2>

          <div className="grid md:grid-cols-3 gap-8">
            <Link to="/familien-fotoshooting-wien/" className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
              <Heart className="w-12 h-12 text-purple-600 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">{de ? 'Familien-Fotoshooting' : 'Family Photo Shoot'}</h3>
              <p className="text-gray-600">
                {de
                  ? 'Die ganze Familie gemeinsam vor der Kamera – unvergessliche Erinnerungen für die Ewigkeit.'
                  : 'The whole family together in front of the camera – unforgettable memories to treasure forever.'}
              </p>
            </Link>

            <Link to="/baby-fotografie-wien/" className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
              <Baby className="w-12 h-12 text-pink-600 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">{de ? 'Baby-Fotografie' : 'Baby Photography'}</h3>
              <p className="text-gray-600">
                {de
                  ? 'Professionelle Newborn- und Babyfotografie in Wien. Sichere und liebevolle Babyshootings.'
                  : 'Professional newborn and baby photography in Vienna. Safe and loving baby sessions.'}
              </p>
            </Link>

            <Link to="/schwangerschaftsfotos-wien/" className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
              <Gift className="w-12 h-12 text-purple-600 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">{de ? 'Schwangerschaftsfotos' : 'Maternity Photos'}</h3>
              <p className="text-gray-600">
                {de
                  ? 'Wunderschöne Babybauch-Fotos die die Vorfreude auf Ihr Baby festhalten.'
                  : 'Beautiful baby bump photos that capture the anticipation of your little one.'}
              </p>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-br from-orange-500 to-pink-500 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4">{de ? 'Bereit für unvergessliche Kinderfotos?' : 'Ready for unforgettable children’s photos?'}</h2>
          <p className="text-xl mb-8 text-orange-50">
            {de
              ? 'Buchen Sie jetzt Ihr Kinder-Fotoshooting in Wien und halten Sie die Kindheit fest!'
              : 'Book your children’s photo shoot in Vienna now and capture childhood forever!'}
          </p>
          <Link
            to="/kontakt"
            className="inline-flex items-center px-8 py-4 bg-white text-orange-600 rounded-lg hover:bg-gray-100 transition-colors font-semibold text-lg"
          >
            {de ? 'Jetzt Termin vereinbaren' : 'Book an Appointment Now'}
            <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
        </div>
      </section>

    </div>
      <ContextualLinks pathname="/kinder-fotografie-wien/" />
      <RelatedServices currentPath="/kinder-fotografie-wien/" />
    </Layout>
  );
}
