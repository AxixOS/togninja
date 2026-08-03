import React from 'react';
import { Link } from 'react-router-dom';
import { Star, Quote, Camera, Heart, Users, Baby, Briefcase, Phone } from 'lucide-react';
import Layout from '../../components/layout/Layout';
import { RelatedTopicsBlock } from '../../components/SEO/RelatedTopicsBlock';
import { PillarLinksBlock } from '../../components/SEO/PillarLinksBlock';
import { SEOHead } from '../../components/SEO/SEOHead';
import { SITE } from '../../config/site';
import { useLanguage } from '../../context/LanguageContext';
import { useGoogleReviews } from '../../hooks/useGoogleReviews';

interface Testimonial {
  name: string;
  service: string;
  rating: number;
  date: string;
  text: string;
  highlight?: boolean;
}

const KundenstimmenPage: React.FC = () => {
  const { language } = useLanguage();
  const de = language === 'de';

  // Live Google rating/count when GOOGLE_PLACES_API_KEY is configured; otherwise
  // fall back to the last known figures so the page always shows numbers.
  const { data: live } = useGoogleReviews();
  const ratingNum = live?.rating || 4.9;
  const ratingText = de ? ratingNum.toFixed(1).replace('.', ',') : ratingNum.toFixed(1);
  const countText = String(live?.count || 253);
  const reviewsUri = live?.mapsUri || 'https://maps.app.goo.gl/L5EFKkMSK7FaiRVa8';

  const testimonials: Testimonial[] = [
    {
      name: 'Sarah & Michael K.',
      service: de ? 'Familien-Fotoshooting' : 'Family Photo Shoot',
      rating: 5,
      date: de ? 'Januar 2024' : 'January 2024',
      text: de ? 'Wir waren mit unseren zwei Kindern (3 und 5 Jahre) beim Shooting und waren begeistert! Das Team hat es geschafft, dass sich die Kinder sofort wohl gefühlt haben. Die Bilder sind wunderschön geworden - natürlich und voller Leben. Genau so, wie wir uns das vorgestellt haben!' : 'We came to the shoot with our two children (aged 3 and 5) and we were thrilled! The team managed to make the kids feel at ease straight away. The photos turned out beautifully - natural and full of life. Exactly how we had pictured them!',
      highlight: true
    },
    {
      name: 'Julia M.',
      service: de ? 'Newborn Shooting' : 'Newborn Shoot',
      rating: 5,
      date: de ? 'Dezember 2023' : 'December 2023',
      text: de ? 'Als frischgebackene Mama war ich etwas nervös, aber das Team hat uns so entspannt durch das Shooting begleitet. Mein Baby hat fast durchgeschlafen und die Fotos sind einfach unbezahlbar. So zarte, emotionale Aufnahmen - ich schaue sie mir jeden Tag an!' : 'As a new mum I was a little nervous, but the team guided us through the shoot in such a relaxed way. My baby slept almost the whole time and the photos are simply priceless. Such tender, emotional images - I look at them every day!',
      highlight: false
    },
    {
      name: 'Thomas W.',
      service: 'Business Portrait',
      rating: 5,
      date: de ? 'November 2023' : 'November 2023',
      text: de ? 'Professionell, schnell und mit tollem Ergebnis! Ich brauchte dringend neue Fotos für LinkedIn und meine Website. Das Express-Paket war perfekt - nach 20 Minuten war alles im Kasten und die Bilder kamen pünktlich. Klare Empfehlung!' : 'Professional, fast and with a great result! I urgently needed new photos for LinkedIn and my website. The express package was perfect - after 20 minutes everything was in the can and the images arrived right on time. Highly recommended!',
      highlight: false
    },
    {
      name: 'Anna & David L.',
      service: de ? 'Schwangerschafts-Shooting' : 'Maternity Shoot',
      rating: 5,
      date: de ? 'Oktober 2023' : 'October 2023',
      text: de ? 'Unser Babybauch-Shooting war so schön! Wir haben uns vorher beraten lassen zu Outfits und Location. Die Fotografin hatte tolle Ideen und die Bilder sind traumhaft geworden. Ein wunderschönes Andenken an diese besondere Zeit.' : 'Our maternity shoot was so lovely! We got advice beforehand on outfits and the location. The photographer had wonderful ideas and the images turned out dreamlike. A beautiful keepsake of this special time.',
      highlight: true
    },
    {
      name: 'Melanie H.',
      service: de ? 'Baby Fotografie' : 'Baby Photography',
      rating: 5,
      date: de ? 'September 2023' : 'September 2023',
      text: de ? 'Wir haben alle 3 Monate ein Shooting gemacht, um die Entwicklung unserer Tochter festzuhalten. Jedes Mal super organisiert, pünktlich und mit viel Geduld. Die Fotobücher sind jetzt unser größter Schatz!' : 'We did a shoot every 3 months to capture our daughter’s development. Every time it was superbly organised, punctual and full of patience. The photo books are now our greatest treasure!',
      highlight: false
    },
    {
      name: 'Markus R.',
      service: de ? 'Portrait Shooting' : 'Portrait Shoot',
      rating: 5,
      date: de ? 'August 2023' : 'August 2023',
      text: de ? 'Ich wollte endlich mal professionelle Fotos von mir haben. Das Team hat mir geholfen, mich vor der Kamera wohl zu fühlen und hat mir genau erklärt, wie ich mich positionieren soll. Die Ergebnisse sind fantastisch - ich erkenne mich kaum wieder (im positiven Sinne)!' : 'I finally wanted to have professional photos of myself. The team helped me feel comfortable in front of the camera and explained exactly how to position myself. The results are fantastic - I hardly recognise myself (in the best possible way)!',
      highlight: false
    },
    {
      name: 'Lisa & Peter F.',
      service: de ? 'Familien-Fotoshooting' : 'Family Photo Shoot',
      rating: 5,
      date: de ? 'Juli 2023' : 'July 2023',
      text: de ? 'Wir haben ein Outdoor-Shooting im Park gemacht - bei wunderschönem Abendlicht. Die Atmosphäre war total entspannt und die Kinder konnten spielen und toben. Die Fotos wirken so natürlich und echt. Genau das wollten wir!' : 'We did an outdoor shoot in the park - in beautiful evening light. The atmosphere was completely relaxed and the children could play and run around. The photos look so natural and real. Exactly what we wanted!',
      highlight: false
    },
    {
      name: 'Christina B.',
      service: 'Cake Smash',
      rating: 5,
      date: de ? 'Juni 2023' : 'June 2023',
      text: de ? 'Zum ersten Geburtstag unseres Sohnes haben wir ein Cake Smash Shooting gemacht. Es war so lustig! Die Deko war wunderschön und die Fotos von unserem kleinen Schokoschnütchen sind einfach goldig. Ein unvergessliches Erlebnis!' : 'For our son’s first birthday we did a cake smash shoot. It was such fun! The decorations were gorgeous and the photos of our little chocolate-covered sweetheart are simply adorable. An unforgettable experience!',
      highlight: true
    },
    {
      name: 'Robert S.',
      service: 'Business Portrait',
      rating: 5,
      date: de ? 'Mai 2023' : 'May 2023',
      text: de ? 'Als Selbstständiger brauche ich professionelle Fotos für meine Kommunikation. Das Team hat genau verstanden, welchen Look ich brauche - seriös aber sympathisch. Sehr zufrieden mit dem Ergebnis und dem Service!' : 'As a self-employed person I need professional photos for my communications. The team understood exactly the look I needed - serious yet likeable. Very happy with both the result and the service!',
      highlight: false
    },
    {
      name: 'Nina & Alex W.',
      service: de ? 'Paar-Shooting' : 'Couple Shoot',
      rating: 5,
      date: de ? 'April 2023' : 'April 2023',
      text: de ? 'Wir haben uns zum Jahrestag ein Paar-Shooting geschenkt und es war wunderschön! Die Fotografin hatte super Ideen für Posen und Locations. Wir haben jetzt endlich mal richtig schöne Fotos von uns beiden zusammen.' : 'We treated ourselves to a couple shoot for our anniversary and it was wonderful! The photographer had great ideas for poses and locations. We finally have really beautiful photos of the two of us together.',
      highlight: false
    },
    {
      name: 'Sophie M.',
      service: de ? 'Kinder-Fotografie' : 'Children’s Photography',
      rating: 5,
      date: de ? 'März 2023' : 'March 2023',
      text: de ? 'Meine beiden Mädels (4 und 7) waren anfangs etwas schüchtern, aber nach 5 Minuten war das Eis gebrochen. Es wurde viel gelacht und gespielt. Die Fotos sind so lebendig und fangen die Persönlichkeit meiner Kinder perfekt ein!' : 'My two girls (4 and 7) were a bit shy at first, but after 5 minutes the ice was broken. There was lots of laughter and playing. The photos are so lively and capture my children’s personalities perfectly!',
      highlight: false
    },
    {
      name: 'Daniel & Eva K.',
      service: de ? 'Newborn Shooting' : 'Newborn Shoot',
      rating: 5,
      date: de ? 'Februar 2023' : 'February 2023',
      text: de ? 'Unser erstes Baby - und so wunderschöne Erinnerungsfotos! Das Team ist zu uns nach Hause gekommen, was super entspannt war. Die Geduld und Ruhe war genau das Richtige für unseren kleinen Schatz. Vielen Dank!' : 'Our first baby - and such beautiful keepsake photos! The team came to our home, which was wonderfully relaxed. Their patience and calm were exactly right for our little treasure. Thank you so much!',
      highlight: false
    }
  ];

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-1">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={`w-5 h-5 ${
              i < rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <Layout>
      <SEOHead
        title={`Kundenstimmen – 4,9★ auf Google | ${SITE.name}`}
        description="Lesen Sie echte Kundenbewertungen von Familien-, Baby- und Business-Fotoshootings in Wien. Über 250 Google-Bewertungen mit 4.9 Sternen. Erfahren Sie, warum Familien uns vertrauen."
        keywords={`Kundenstimmen Fotograf Wien, Bewertungen ${SITE.name}, Erfahrungen Familienfotograf Wien, Google Bewertungen Fotostudio`}
        canonical="/kundenstimmen/"
      />
      
      <div className="min-h-screen">
        {/* Hero Section */}
        <section className="relative bg-gradient-to-br from-yellow-500 via-orange-500 to-pink-500 text-white py-24">
          <div className="absolute inset-0 bg-black/20"></div>
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              {de ? 'Kundenstimmen – Was unsere Familien in Wien sagen' : 'Testimonials – What Our Families in Vienna Say'}
            </h1>
            <p className="text-xl md:text-2xl mb-8 max-w-3xl mx-auto">
              {de ? 'Das sagen unsere zufriedenen Kunden über uns' : 'Here is what our happy clients say about us'}
            </p>

            {/* Rating Summary */}
            <div className="flex flex-col items-center gap-4 bg-white/10 backdrop-blur-sm rounded-2xl p-8 max-w-md mx-auto">
              <div className="text-6xl font-bold">{ratingText}</div>
              <div className="flex gap-1">
                {renderStars(Math.round(ratingNum))}
              </div>
              <p className="text-lg">{de ? `Basierend auf ${countText} Bewertungen` : `Based on ${countText} reviews`}</p>
              <a
                href={reviewsUri}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm underline underline-offset-2 text-white/90 hover:text-white"
              >
                {de ? 'Auf Google ansehen' : 'View on Google'}
              </a>
            </div>
          </div>
        </section>

        {/* Statistics */}
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-4 gap-8 text-center">
              <div>
                <div className="text-4xl font-bold text-orange-600 mb-2">500+</div>
                <p className="text-gray-600">{de ? 'Zufriedene Kunden' : 'Happy clients'}</p>
              </div>
              <div>
                <div className="text-4xl font-bold text-pink-600 mb-2">1000+</div>
                <p className="text-gray-600">{de ? 'Shootings' : 'Shoots'}</p>
              </div>
              <div>
                <div className="text-4xl font-bold text-purple-600 mb-2">98%</div>
                <p className="text-gray-600">{de ? 'Weiterempfehlung' : 'Would recommend us'}</p>
              </div>
              <div>
                <div className="text-4xl font-bold text-yellow-600 mb-2">{ratingText}</div>
                <p className="text-gray-600">{de ? 'Durchschnittsbewertung' : 'Average rating'}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials Grid */}
        <section className="py-16 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-4xl font-bold text-center mb-4 text-gray-900">
              {de ? 'Was unsere Kunden sagen' : 'What Our Clients Say'}
            </h2>

            {/* Live, verbatim Google reviews (only when the Places API is set up) */}
            {live?.reviews && live.reviews.length > 0 && (
              <div className="mb-12">
                <div className="flex items-center justify-center gap-2 mb-6">
                  <span className="inline-flex items-center gap-1.5 bg-white border border-gray-200 rounded-full px-4 py-1.5 text-sm font-medium text-gray-700 shadow-sm">
                    <span className="flex text-yellow-400">{renderStars(Math.round(ratingNum))}</span>
                    {de ? `${ratingText} · Echte Google-Bewertungen` : `${ratingText} · Live from Google`}
                  </span>
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {live.reviews.slice(0, 6).map((r, i) => (
                    <div key={i} className="bg-white rounded-2xl p-7 shadow-sm border border-gray-100">
                      <div className="mb-3">{renderStars(r.rating)}</div>
                      <p className="text-gray-700 mb-5 leading-relaxed italic">"{r.text}"</p>
                      <div className="border-t pt-3 flex items-center justify-between">
                        <p className="font-semibold text-gray-900">{r.author}</p>
                        {r.when && <p className="text-xs text-gray-500">{r.when}</p>}
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-center text-xs text-gray-400 mt-6">
                  {de
                    ? 'Live von unserem Google-Unternehmensprofil geladen.'
                    : 'Loaded live from our Google Business Profile.'}
                </p>
              </div>
            )}
            {!de && (
              <p className="text-center text-sm text-gray-500 italic mb-8">
                Reviews translated from the original German.
              </p>
            )}
            {de && <div className="mb-8" />}

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {testimonials.map((testimonial, index) => (
                <div
                  key={index}
                  className={`bg-white rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow ${
                    testimonial.highlight ? 'ring-2 ring-orange-400' : ''
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <Quote className="w-10 h-10 text-orange-200 flex-shrink-0" />
                    {testimonial.highlight && (
                      <span className="bg-orange-100 text-orange-700 text-xs font-semibold px-3 py-1 rounded-full">
                        Highlight
                      </span>
                    )}
                  </div>

                  <div className="mb-4">
                    {renderStars(testimonial.rating)}
                  </div>

                  <p className="text-gray-700 mb-6 leading-relaxed italic">
                    "{testimonial.text}"
                  </p>

                  <div className="border-t pt-4">
                    <p className="font-semibold text-gray-900">{testimonial.name}</p>
                    <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                      <Camera className="w-4 h-4" />
                      <span>{testimonial.service}</span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">{testimonial.date}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Service Categories */}
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-4xl font-bold text-center mb-12 text-gray-900">
              {de ? 'Bewertungen nach Service' : 'Reviews by Service'}
            </h2>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              <div className="bg-gradient-to-br from-orange-50 to-pink-50 p-8 rounded-2xl">
                <Users className="w-12 h-12 text-orange-600 mb-4" />
                <h3 className="text-xl font-semibold mb-2 text-gray-900">{de ? 'Familien-Shootings' : 'Family Shoots'}</h3>
                <div className="flex items-center gap-2 mb-3">
                  {renderStars(5)}
                  <span className="font-semibold">5.0</span>
                </div>
                <p className="text-gray-600 text-sm">
                  {de ? '"Natürliche Momente, entspannte Atmosphäre, wunderschöne Erinnerungen"' : '“Natural moments, a relaxed atmosphere, beautiful memories”'}
                </p>
              </div>

              <div className="bg-gradient-to-br from-pink-50 to-purple-50 p-8 rounded-2xl">
                <Baby className="w-12 h-12 text-pink-600 mb-4" />
                <h3 className="text-xl font-semibold mb-2 text-gray-900">Baby & Newborn</h3>
                <div className="flex items-center gap-2 mb-3">
                  {renderStars(5)}
                  <span className="font-semibold">5.0</span>
                </div>
                <p className="text-gray-600 text-sm">
                  {de ? '"Geduldig, einfühlsam, perfektes Timing - unbezahlbare Bilder"' : '“Patient, sensitive, perfect timing - priceless images”'}
                </p>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-indigo-50 p-8 rounded-2xl">
                <Heart className="w-12 h-12 text-purple-600 mb-4" />
                <h3 className="text-xl font-semibold mb-2 text-gray-900">{de ? 'Schwangerschaft' : 'Maternity'}</h3>
                <div className="flex items-center gap-2 mb-3">
                  {renderStars(5)}
                  <span className="font-semibold">5.0</span>
                </div>
                <p className="text-gray-600 text-sm">
                  {de ? '"Emotionale Aufnahmen, tolle Beratung, wunderschöne Erinnerung"' : '“Emotional images, great advice, a beautiful keepsake”'}
                </p>
              </div>

              <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-8 rounded-2xl">
                <Briefcase className="w-12 h-12 text-blue-600 mb-4" />
                <h3 className="text-xl font-semibold mb-2 text-gray-900">Business Portraits</h3>
                <div className="flex items-center gap-2 mb-3">
                  {renderStars(5)}
                  <span className="font-semibold">5.0</span>
                </div>
                <p className="text-gray-600 text-sm">
                  {de ? '"Professionell, schnell, perfekt für LinkedIn und Website"' : '“Professional, fast, perfect for LinkedIn and your website”'}
                </p>
              </div>

              <div className="bg-gradient-to-br from-yellow-50 to-orange-50 p-8 rounded-2xl">
                <Camera className="w-12 h-12 text-yellow-600 mb-4" />
                <h3 className="text-xl font-semibold mb-2 text-gray-900">{de ? 'Kinder-Fotografie' : 'Children’s Photography'}</h3>
                <div className="flex items-center gap-2 mb-3">
                  {renderStars(5)}
                  <span className="font-semibold">5.0</span>
                </div>
                <p className="text-gray-600 text-sm">
                  {de ? '"Lebendige Fotos, spielerischer Ansatz, Kinder fühlen sich wohl"' : '“Lively photos, a playful approach, children feel at ease”'}
                </p>
              </div>

              <div className="bg-gradient-to-br from-pink-50 to-red-50 p-8 rounded-2xl">
                <Heart className="w-12 h-12 text-pink-600 mb-4" />
                <h3 className="text-xl font-semibold mb-2 text-gray-900">Portraits</h3>
                <div className="flex items-center gap-2 mb-3">
                  {renderStars(5)}
                  <span className="font-semibold">5.0</span>
                </div>
                <p className="text-gray-600 text-sm">
                  {de ? '"Kreativ, individuell, tolle Ergebnisse - endlich schöne Fotos!"' : '“Creative, individual, great results - finally beautiful photos!”'}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Video/Social Proof Section */}
        <section className="py-16 bg-gray-50">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-4xl font-bold mb-6 text-gray-900">
              {de ? 'Folgen Sie uns auf Social Media' : 'Follow Us on Social Media'}
            </h2>
            <p className="text-lg text-gray-600 mb-8">
              {de ? 'Sehen Sie mehr Kundenstimmen, Behind-the-Scenes und fertige Shootings auf Instagram und Facebook' : 'See more testimonials, behind-the-scenes moments and finished shoots on Instagram and Facebook'}
            </p>
            <div className="flex justify-center gap-4">
              <a
                href="https://instagram.com/newagefotografie"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-8 py-3 rounded-full font-semibold hover:opacity-90 transition-opacity"
              >
                {de ? 'Instagram folgen' : 'Follow on Instagram'}
              </a>
              <a
                href="https://facebook.com/newagefotografie"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-blue-600 text-white px-8 py-3 rounded-full font-semibold hover:bg-blue-700 transition-colors"
              >
                {de ? 'Facebook besuchen' : 'Visit on Facebook'}
              </a>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 bg-gradient-to-br from-yellow-500 via-orange-500 to-pink-500 text-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-4xl font-bold mb-6">{de ? 'Werden Sie Teil unserer Happy Family!' : 'Become Part of Our Happy Family!'}</h2>
            <p className="text-xl mb-8">
              {de ? 'Buchen Sie jetzt Ihr Fotoshooting und erleben Sie selbst, warum unsere Kunden so begeistert sind.' : 'Book your photo shoot now and see for yourself why our clients are so delighted.'}
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                to="/kontakt"
                className="bg-white text-orange-600 px-8 py-3 rounded-full font-semibold hover:bg-gray-100 transition-colors inline-flex items-center gap-2"
              >
                <Phone className="w-5 h-5" />
                {de ? 'Jetzt Termin buchen' : 'Book an Appointment Now'}
              </Link>
              <Link
                to="/preise"
                className="bg-transparent border-2 border-white text-white px-8 py-3 rounded-full font-semibold hover:bg-white/10 transition-colors"
              >
                {de ? 'Preise ansehen' : 'View Prices'}
              </Link>
            </div>
          </div>
        </section>
      </div>
      <PillarLinksBlock currentPath="/kundenstimmen/" title={de ? 'Unsere Fotoshootings in Wien' : 'Our Photo Shoots in Vienna'} />
      <RelatedTopicsBlock pathname="/kundenstimmen/" />
    </Layout>
  );
};

export default KundenstimmenPage;
