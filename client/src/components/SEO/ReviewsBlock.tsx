import React from 'react';
import { Star } from 'lucide-react';
import { SITE } from '../../config/site';
import { useLanguage } from '../../context/LanguageContext';
import { useGoogleReviews } from '../../hooks/useGoogleReviews';

/**
 * Social-proof + E-E-A-T block backed by the studio's real Google rating
 * (4.8 / 300 reviews). Renders visible testimonials (the high-ROI conversion
 * win) plus AggregateRating/Review JSON-LD attached to the same LocalBusiness
 * @id used in index.html.
 *
 * NOTE: Google no longer shows star rich-results from self-serving
 * LocalBusiness markup (2019 policy) — those stars come from the Google
 * Business Profile. The real value here is the on-page trust + content depth
 * and the review CTA, not rich snippets.
 */
const GOOGLE_REVIEW_URL = 'https://g.page/r/CfWCViKtBrjuEAE/review';
const RATING = '4.8';
const COUNT = '306';

interface Testimonial {
  name: string;
  text: string;
  textEn: string;
}

// Real reviews from the Google Business Profile.
const TESTIMONIALS: Testimonial[] = [
  {
    name: 'Bernhard Wistawel',
    text: 'Vielen Dank für das professionelle und gleichzeitig lustige Fotoshooting. Wir waren schon zum zweiten Mal da. Wir empfehlen euch weiter.',
    textEn: 'Thank you for a photoshoot that was professional and great fun at the same time. This was already our second visit. We happily recommend you to others.',
  },
  {
    name: 'Michaela Pohanka',
    text: 'Nach fast 13 Jahren und einigen Neuzugängen in unserer Familie haben wir uns entschlossen: neue Familienfotos müssen her – und es war eine wunderbare Entscheidung.',
    textEn: 'After almost 13 years and a few new additions to our family, we decided it was time for new family photos – and it was a wonderful decision.',
  },
];

export const ReviewsBlock: React.FC<{ heading?: string }> = ({
  heading,
}) => {
  const { language, t } = useLanguage();
  const de = language === 'de';
  // Prefer live Google figures when configured; otherwise use the constants.
  const { data: live } = useGoogleReviews();
  const RATING_LIVE = live ? live.rating.toFixed(1) : RATING;
  const COUNT_LIVE = live ? String(live.count) : COUNT;
  const headingText = heading ?? (de ? 'Das sagen unsere Kundinnen & Kunden' : 'What Our Clients Say');
  // Configurable review page (Settings → Manual Website Update → Site Settings →
  // Reviews); falls back to the hardcoded Google review link.
  const reviewUrlCfg = t('reviews.googleUrl');
  const reviewUrl = reviewUrlCfg && reviewUrlCfg !== 'reviews.googleUrl' ? reviewUrlCfg : GOOGLE_REVIEW_URL;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'PhotoStudio',
    '@id': SITE.url,
    name: SITE.name,
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: RATING_LIVE,
      reviewCount: COUNT_LIVE,
      bestRating: '5',
    },
    review: TESTIMONIALS.map((t) => ({
      '@type': 'Review',
      author: { '@type': 'Person', name: t.name },
      reviewRating: { '@type': 'Rating', ratingValue: '5', bestRating: '5' },
      reviewBody: t.text,
    })),
  };

  return (
    <section className="py-12 bg-purple-50 border-t border-purple-100">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <div className="text-center mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-purple-900 mb-2">{headingText}</h2>
          <div className="flex items-center justify-center gap-2">
            <span className="flex" aria-hidden="true">
              {[0, 1, 2, 3, 4].map((i) => (
                <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
              ))}
            </span>
            <span className="text-gray-700 font-medium">
              {de ? RATING_LIVE.replace('.', ',') : RATING_LIVE} · {COUNT_LIVE}+ {de ? 'Bewertungen auf Google' : 'reviews on Google'}
            </span>
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          {TESTIMONIALS.map((t) => (
            <figure key={t.name} className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
              <div className="flex mb-2" aria-hidden="true">
                {[0, 1, 2, 3, 4].map((i) => (
                  <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <blockquote className="text-gray-700 text-sm leading-relaxed">“{de ? t.text : t.textEn}”</blockquote>
              <figcaption className="mt-3 text-sm font-semibold text-purple-800">{t.name}</figcaption>
            </figure>
          ))}
        </div>

        {!de && (
          <p className="text-center text-xs text-gray-400 mt-3">
            Translated from the original German Google reviews.
          </p>
        )}

        <div className="text-center mt-8">
          <a
            href={reviewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-purple-600 text-white font-semibold text-sm hover:bg-purple-700 transition-colors"
          >
            {de ? 'Bewertung auf Google schreiben' : 'Write a review on Google'}
          </a>
        </div>
      </div>
    </section>
  );
};

export default ReviewsBlock;
