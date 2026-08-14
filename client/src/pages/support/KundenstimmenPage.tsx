import React from 'react';
import { Link } from 'react-router-dom';
import { Star, Quote, Phone } from 'lucide-react';
import Layout from '../../components/layout/Layout';
import { RelatedTopicsBlock } from '../../components/SEO/RelatedTopicsBlock';
import { PillarLinksBlock } from '../../components/SEO/PillarLinksBlock';
import { SEOHead } from '../../components/SEO/SEOHead';
import { SITE } from '../../config/site';
import { useLanguage } from '../../context/LanguageContext';
import { useGoogleReviews } from '../../hooks/useGoogleReviews';

// The Testimonial interface went with the twelve invented testimonials it typed.
// Reviews on this page now come from one place — the studio's own Google profile
// via useGoogleReviews — and that hook brings its own type.

const KundenstimmenPage: React.FC = () => {
  const { language } = useLanguage();
  const de = language === 'de';

  // Live Google rating/count, and NOTHING when the Places API is not configured.
  //
  // The fallbacks here were `|| 4.9` and `|| 253`, so every studio without a Google
  // integration published a 4.9-star average from 253 reviews as its own — a rating
  // is the single claim a visitor is most entitled to rely on, and it was invented.
  // "So the page always shows numbers" was the stated reason; showing numbers is not
  // worth making them up.
  const { data: live } = useGoogleReviews();
  const ratingNum = typeof live?.rating === 'number' ? live.rating : null;
  const ratingText = ratingNum === null ? '' : (de ? ratingNum.toFixed(1).replace('.', ',') : ratingNum.toFixed(1));
  const countText = live?.count ? String(live.count) : '';
  const hasLiveRating = ratingNum !== null && !!countText;
  // The studio's own Google profile, or none — this fell back to another studio's.
  const reviewsUri = live?.mapsUri || '';
  const liveReviews = live?.reviews && live.reviews.length > 0 ? live.reviews : [];


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
        title={de ? `Kundenstimmen | ${SITE.name}` : `Reviews | ${SITE.name}`}
        description={de
          ? `Was Kundinnen und Kunden über ihre Fotoshootings bei ${SITE.name} sagen.`
          : `What clients say about their photo shoots with ${SITE.name}.`}
        canonical="/kundenstimmen/"
      />
      
      <div className="min-h-screen">
        {/* Hero Section */}
        <section className="relative bg-gradient-to-br from-yellow-500 via-orange-500 to-pink-500 text-white py-24">
          <div className="absolute inset-0 bg-black/20"></div>
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              {de ? 'Kundenstimmen' : 'Reviews'}
            </h1>
            <p className="text-xl md:text-2xl mb-8 max-w-3xl mx-auto">
              {de ? 'Das sagen unsere Kundinnen und Kunden über uns' : 'Here is what our clients say about us'}
            </p>

            {/* The rating summary appears only when there is a real rating to show.
                It used to render unconditionally on a hardcoded 4.9 from 253 reviews,
                and the "View on Google" link beneath it fell back to href="" — a link
                to the page you are already on. */}
            {hasLiveRating && (
              <div className="flex flex-col items-center gap-4 bg-white/10 backdrop-blur-sm rounded-2xl p-8 max-w-md mx-auto">
                <div className="text-6xl font-bold">{ratingText}</div>
                <div className="flex gap-1">
                  {renderStars(Math.round(ratingNum as number))}
                </div>
                <p className="text-lg">{de ? `Basierend auf ${countText} Bewertungen` : `Based on ${countText} reviews`}</p>
                {reviewsUri && (
                  <a
                    href={reviewsUri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm underline underline-offset-2 text-white/90 hover:text-white"
                  >
                    {de ? 'Auf Google ansehen' : 'View on Google'}
                  </a>
                )}
              </div>
            )}
          </div>
        </section>

        {/* The statistics band is gone: "500+ happy clients", "1000+ shoots" and
            "98% would recommend us" were three business metrics with no data source
            anywhere in the codebase, published as fact by every studio that bought
            the product — including one that had photographed nobody yet. There is no
            per-studio source for any of them, so there is nothing to drive them from. */}

        {/* Testimonials Grid */}
        <section className="py-16 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-4xl font-bold text-center mb-4 text-gray-900">
              {de ? 'Was unsere Kunden sagen' : 'What Our Clients Say'}
            </h2>

            {/* Real reviews, or an honest empty state.

                This page shipped twelve invented testimonials: named people —
                "Sarah & Michael K.", "Julia M.", "Thomas W." — with services, dated
                months and paragraphs of praise, one flagged "Highlight". None of it
                happened, to anyone, and every studio published all twelve as its own
                client feedback. A review is a statement by a third party; inventing
                one attributes words to a person who never said them.

                The live block below was already correct and already gated on real
                Google data. It is now the only source of reviews on the page. */}
            {liveReviews.length > 0 ? (
              <div className="mb-12">
                {hasLiveRating && (
                  <div className="flex items-center justify-center gap-2 mb-6">
                    <span className="inline-flex items-center gap-1.5 bg-white border border-gray-200 rounded-full px-4 py-1.5 text-sm font-medium text-gray-700 shadow-sm">
                      <span className="flex text-yellow-400">{renderStars(Math.round(ratingNum as number))}</span>
                      {de ? `${ratingText} · Echte Google-Bewertungen` : `${ratingText} · Live from Google`}
                    </span>
                  </div>
                )}
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {liveReviews.slice(0, 6).map((r, i) => (
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
            ) : (
              <div className="mx-auto max-w-2xl rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center">
                <Quote className="mx-auto mb-4 h-10 w-10 text-gray-300" />
                <p className="text-gray-600">
                  {de
                    ? 'Hier erscheinen die Bewertungen unserer Kundinnen und Kunden, sobald sie eingehen.'
                    : 'Reviews from our clients will appear here as they come in.'}
                </p>
              </div>
            )}
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
      <PillarLinksBlock
        currentPath="/kundenstimmen/"
        title={(() => {
          const inCity = SITE.address.city ? ` in ${SITE.address.city}` : '';
          return de ? `Unsere Fotoshootings${inCity}` : `Our Photo Shoots${inCity}`;
        })()}
      />
      <RelatedTopicsBlock pathname="/kundenstimmen/" />
    </Layout>
  );
};

export default KundenstimmenPage;
