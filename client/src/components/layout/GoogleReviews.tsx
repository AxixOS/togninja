import React, { useState, useEffect, useMemo } from 'react';
import { Star, ChevronLeft, ChevronRight } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useManualPageData } from '../../hooks/useManualPageContent';
import { useGoogleReviews } from '../../hooks/useGoogleReviews';

interface FallbackReview {
  author: string;
  textDe: string;
  textEn: string;
  profile_photo_url: string;
  time: number;
  rating: number;
}

interface Review {
  author_name: string;
  rating: number;
  text: string;
  profile_photo_url: string;
  time: number;
  /** Relative age from the live Google API, e.g. "8 months ago". */
  whenLabel?: string;
}

// GENUINE reviews from the studio's own Google Business Profile, used only as a
// fallback when the live Places API is unreachable. The live values are also
// editable from the backend via Manual Website Update → "Customer Reviews".
// NOTE: this list previously held INVENTED reviewers with generated cartoon
// avatars — never ship fabricated testimonials.
// No bundled testimonials. This array previously held REAL reviews for one studio
// (they even name "NAF"), which every other instance then displayed as its own social
// proof. Reviews come from the studio's own Google profile via useGoogleReviews, or
// from what it enters in Website Studio — never from here.
const FALLBACK_REVIEWS: FallbackReview[] = [];

// Empty by default: these pointed at one studio's Google Business Profile, so every
// instance linked visitors to another business's reviews page (and its "write a
// review" form). The studio sets its own in Website Studio → Customer Reviews.
const DEFAULT_GOOGLE_URL = '';
// Deep link that opens the "write a review" dialog on the studio's Google
// Business Profile — more reviews directly lift local ranking + conversion.
const GOOGLE_REVIEW_URL = '';

const GoogleReviews: React.FC = () => {
  const { t, language } = useLanguage();
  // Backend overrides published via Manual Website Update ("Customer Reviews").
  const pageData = useManualPageData('reviews');
  const overrides = pageData.data?.publishedContent || {};
  const ov = (key: string, fallback: string) => {
    const value = overrides[key];
    return value && value.trim() ? value : fallback;
  };

  // LIVE reviews straight from the studio's Google Business Profile. This is
  // what makes the section honest — it only falls back to the stored reviews
  // when the Places API isn't configured/reachable.
  const { data: live } = useGoogleReviews();

  const reviews: Review[] = useMemo(() => {
    if (live?.reviews?.length) {
      return live.reviews.map((r) => ({
        author_name: r.author,
        text: r.text,
        rating: r.rating || 5,
        profile_photo_url: '',
        time: 0,
        whenLabel: r.when,
      }));
    }
    // With no bundled fallbacks, reviews come from what the studio entered in
    // Website Studio (reviews.rN.*). Entries it has not filled in are dropped rather
    // than rendered as empty cards.
    return [1, 2, 3, 4, 5, 6]
      .map((n) => ({
        author_name: ov(`reviews.r${n}.author`, ''),
        text: ov(`reviews.r${n}.text`, ''),
        rating: 5,
        profile_photo_url: '',
        time: 0,
      }))
      .filter((r) => r.author_name.trim() && r.text.trim());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language, pageData.data, live]);

  const sectionTitle = ov('reviews.sectionTitle', language === 'de' ? 'Was unsere Kunden sagen' : 'What Our Clients Say');
  // Prefer the LIVE rating/count so the headline can never drift from Google.
  const liveSummary = live
    ? (language === 'de'
        ? `${live.rating.toFixed(1).replace('.', ',')} auf Google (${live.count} Bewertungen)`
        : `${live.rating.toFixed(1)} on Google (${live.count} Reviews)`)
    : null;
  // No invented rating: it is the studio's LIVE Google figure, or whatever it typed
  // in Website Studio, or nothing. The old fallback asserted "4.8 on Google" for
  // studios that have never had a single review.
  const ratingSummary = liveSummary || ov('reviews.ratingSummary', '');
  const googleUrl = live?.mapsUri || ov('reviews.googleUrl', DEFAULT_GOOGLE_URL);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [perView, setPerView] = useState(3);
  const [isPaused, setIsPaused] = useState(false);

  // Auto-scroll carousel every 4 seconds
  useEffect(() => {
    // Guard the modulo: with no reviews this was `% 0` → NaN, and the index never
    // recovered. The section is hidden in that case anyway, but the timer still ran.
    if (isPaused || reviews.length === 0) return;
    const autoScroll = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % reviews.length);
    }, 4000);
    return () => clearInterval(autoScroll);
  }, [isPaused, reviews.length]);

  // Track how many cards to show based on screen width
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) setPerView(3);
      else if (window.innerWidth >= 768) setPerView(2);
      else setPerView(1);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const visibleReviews = useMemo(() => {
    const visible: Review[] = [];
    for (let i = 0; i < perView; i++) {
      visible.push(reviews[(currentIndex + i) % reviews.length]);
    }
    return visible;
  }, [currentIndex, perView, reviews]);

  const nextReview = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % reviews.length);
  };

  const prevReview = () => {
    setCurrentIndex((prevIndex) => (prevIndex - 1 + reviews.length) % reviews.length);
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString(language === 'de' ? 'de-DE' : 'en-US', { year: 'numeric', month: 'long' });
  };

  const renderStars = (rating: number) => {
    return Array(5).fill(0).map((_, i) => (
      <Star
        key={i}
        size={16}
        className={i < rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}
      />
    ));
  };

  // Nothing to show → render nothing. A studio with no reviews yet gets no empty
  // "What Our Clients Say" band, and certainly not someone else's testimonials.
  if (reviews.length === 0) return null;

  return (
    <section className="bg-gray-50 py-16">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-gray-800 mb-4">{sectionTitle}</h2>
          <div className="flex items-center justify-center mb-2">
            <div className="flex">
              {renderStars(5)}
            </div>
            <a
              href={googleUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-2 text-blue-600 hover:text-blue-800 text-sm"
            >
              {ratingSummary}
            </a>
          </div>
        </div>

        <div
          className="relative"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {visibleReviews.map((review, index) => (
              <div key={`${review.author_name}-${currentIndex}-${index}`} className="bg-white rounded-lg shadow-lg p-6 transition-all duration-500 ease-in-out animate-fadeIn">
                <div className="flex items-center mb-4">
                  {/* Real reviewers: show initials. (Previously a generated
                      cartoon avatar, which implied a fake profile photo.) */}
                  {review.profile_photo_url ? (
                    <img
                      src={review.profile_photo_url}
                      alt={review.author_name}
                      loading="lazy"
                      decoding="async"
                      className="w-12 h-12 rounded-full mr-4"
                    />
                  ) : (
                    <div
                      className="w-12 h-12 rounded-full mr-4 bg-purple-100 text-purple-700 flex items-center justify-center font-semibold flex-shrink-0"
                      aria-hidden="true"
                    >
                      {review.author_name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <h3 className="font-semibold text-gray-800 truncate">{review.author_name}</h3>
                    <div className="flex items-center">
                      <div className="flex mr-2">
                        {renderStars(review.rating)}
                      </div>
                      <span className="text-gray-500 text-sm">
                        {review.whenLabel || (review.time ? formatDate(review.time) : '')}
                      </span>
                    </div>
                  </div>
                </div>
                <p className="text-gray-600 line-clamp-4">{review.text}</p>
                <div className="mt-4">
                  <a
                    href={googleUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 text-sm inline-flex items-center"
                  >
                    {language === 'de' ? 'Auf Google Maps ansehen' : 'View on Google Maps'}
                    <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>
              </div>
            ))}
          </div>

          {/* Progress dots */}
          <div className="flex justify-center mt-6 gap-2">
            {reviews.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  index === currentIndex ? 'bg-purple-600 w-6' : 'bg-gray-300 hover:bg-gray-400'
                }`}
                aria-label={`Go to review ${index + 1}`}
              />
            ))}
          </div>

          <button
            onClick={prevReview}
            className="absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-4 bg-white rounded-full p-2 shadow-lg hover:bg-gray-100 focus:outline-none hidden md:block"
            aria-label="Previous review"
          >
            <ChevronLeft size={24} />
          </button>

          <button
            onClick={nextReview}
            className="absolute right-0 top-1/2 transform -translate-y-1/2 translate-x-4 bg-white rounded-full p-2 shadow-lg hover:bg-gray-100 focus:outline-none hidden md:block"
            aria-label="Next review"
          >
            <ChevronRight size={24} />
          </button>
        </div>

        <div className="flex flex-col sm:flex-row justify-center items-center gap-3 mt-8">
          <a
            href={googleUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-6 rounded-lg transition-colors inline-flex items-center"
          >
            {t('reviews.viewAllOnGoogle')}
            <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
          <a
            href={GOOGLE_REVIEW_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="border border-purple-300 text-purple-700 hover:bg-purple-50 font-medium py-2 px-6 rounded-lg transition-colors inline-flex items-center"
          >
            <Star className="w-4 h-4 mr-2 fill-current text-yellow-400" />
            {language === 'de' ? 'Auf Google bewerten' : 'Review us on Google'}
          </a>
        </div>
      </div>
    </section>
  );
};

export default GoogleReviews;
