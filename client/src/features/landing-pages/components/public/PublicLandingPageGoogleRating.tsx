import React from 'react';
import { Star } from 'lucide-react';
import { useGoogleReviews } from '../../../../hooks/useGoogleReviews';

/**
 * The studio's real Google rating, one line below the hero.
 *
 * WHY HERE AND WHY THIS SMALL. A studio's reviews are the most persuasive thing on their
 * site and they have already earned them — but a wall of review cards at the fold pushes
 * the photographs, which are what a photographer is actually selling, below it. The NUMBER
 * is what buys authority in a glance: a rating, a count, and the fact that it comes from
 * Google rather than from the site's own testimonials block. The WORDS earn their space
 * lower down, where somebody who is already interested will read them — which is why
 * PublicLandingPageTestimonialsSection prefers real reviews over generated ones.
 *
 * IT ONLY EVER RENDERS REAL DATA. useGoogleReviews returns null unless the Places API
 * answered with a live rating, so a studio with no reviews, no key, or a listing we cannot
 * read gets nothing here rather than an empty five stars. That matters more than it sounds:
 * the testimonials section used to assert "Echte Google-Bewertungen" above quotes the
 * generator had invented, and this is the component that claim was moved to.
 *
 * The count is part of the claim. "4.9" alone says nothing about whether three people or
 * three hundred agreed, and a rating with no sample is the kind of number a reader discounts.
 */
export default function PublicLandingPageGoogleRating() {
  const { data } = useGoogleReviews();

  // No live data, nothing rendered. Never a placeholder, never a zero.
  if (!data || !data.rating || !data.count) return null;

  const rating = Math.round(data.rating * 10) / 10;
  const full = Math.floor(rating);
  // Half a star is the difference between 4.5 and 5 being drawn identically.
  const half = rating - full >= 0.25 && rating - full < 0.75;

  const stars = (
    <span className="inline-flex items-center gap-0.5" aria-hidden="true">
      {[0, 1, 2, 3, 4].map((i) => {
        const filled = i < full;
        const isHalf = half && i === full;
        return (
          <span key={i} className="relative inline-block">
            <Star className="w-4 h-4 text-amber-300" />
            {(filled || isHalf) && (
              <span
                className="absolute inset-0 overflow-hidden"
                style={{ width: isHalf ? '50%' : '100%' }}
              >
                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
              </span>
            )}
          </span>
        );
      })}
    </span>
  );

  const body = (
    <>
      {stars}
      <span className="font-semibold text-gray-900 tabular-nums">{rating.toFixed(1)}</span>
      <span className="text-gray-600">
        from {data.count.toLocaleString()} Google review{data.count === 1 ? '' : 's'}
      </span>
    </>
  );

  return (
    <section className="border-b border-gray-200 bg-white">
      <div className="mx-auto max-w-6xl px-6 py-3">
        {/* Linked to their own listing when Google gave us one, so a reader can check the
            claim. An unverifiable rating is worth less than no rating. */}
        {data.mapsUri ? (
          <a
            href={data.mapsUri}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex flex-wrap items-center gap-2 text-sm hover:underline underline-offset-4"
          >
            {body}
          </a>
        ) : (
          <p className="inline-flex flex-wrap items-center gap-2 text-sm">{body}</p>
        )}
      </div>
    </section>
  );
}
