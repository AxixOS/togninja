// PublicLandingPageTestimonialsSection — Phase 4

import { Quote, ExternalLink } from 'lucide-react';
import { PublicLandingPageSectionWrapper } from './PublicLandingPageSectionWrapper';
import { alignText, alignJustify, type SectionAlign } from '../../utils/sectionAlignment';
import { useIsEditorial } from '@/components/public/SiteLayoutContext';
import { usePublicLabels } from '../../utils/publicLabels';
import { useLanguage } from '../../../../context/LanguageContext';

// Fallback review page if none is configured in Settings → Manual Website
// Update → Site Settings → Reviews (the `reviews.googleUrl` value).
// Was another studio's Google reviews link, shown on every landing page.
const DEFAULT_REVIEWS_URL = '';

interface PublicLandingPageTestimonialsSectionProps {
  data: Array<{
    quote: string;
    author: string;
    role?: string;
    source?: string; // editor saves "source", AI generation saves "role" — accept both
  }>;
  align?: SectionAlign;
}

export function PublicLandingPageTestimonialsSection({ data, align = 'center' }: PublicLandingPageTestimonialsSectionProps) {
  // Was the literal German string, shown on every studio site regardless of language.
  const editorial = useIsEditorial();
  const labels = usePublicLabels();
  const { t } = useLanguage();
  const reviewsUrl = (() => {
    const v = t('reviews.googleUrl');
    return v && v !== 'reviews.googleUrl' ? v : DEFAULT_REVIEWS_URL;
  })();
  if (!data || data.length === 0) return null;

  const heading =
    t('reviews.whatClientsSay') !== 'reviews.whatClientsSay'
      ? t('reviews.whatClientsSay')
      : 'What our clients say';

  // ── Editorial ──────────────────────────────────────────────────────────────
  //
  // The classic version puts each quote in a white card with a rounded border, a shadow
  // that deepens on hover, and a large pale quotation mark in the corner. That is the
  // arrangement of a review widget, and it makes three sentences from three clients look
  // like a product testimonial carousel.
  //
  // Set as pull quotes instead: no card, no shadow, no glyph. A hairline above each quote
  // does the separating, the quote itself is set larger and lighter than body copy, and the
  // attribution sits quietly beneath in the muted tone. What a magazine does with the same
  // material.
  //
  // The honesty decisions from the classic version are carried over exactly: no stars, and
  // no claim that these came from Google. Nothing in the data carries a rating, and the
  // generator was once instructed to invent these outright.
  if (editorial) {
    return (
      <PublicLandingPageSectionWrapper bg="gray">
        <div className="max-w-5xl mx-auto">
          <h2 className={`${alignText(align)} mb-14 tracking-tight`} style={{ color: 'var(--tn-heading)' }}>
            {heading}
          </h2>

          <div className="grid gap-x-14 gap-y-12 sm:grid-cols-2">
            {data.map((q, i) => (
              <figure key={i} className="pt-7 border-t" style={{ borderColor: 'var(--tn-border)' }}>
                <blockquote
                  className="text-lg sm:text-xl font-light leading-relaxed"
                  style={{ color: 'var(--tn-heading)' }}
                >
                  {/* Typographic quotation marks, not a decorative glyph in the corner. */}
                  &ldquo;{q.quote}&rdquo;
                </blockquote>
                <figcaption className="mt-5 text-sm" style={{ color: 'var(--tn-muted)' }}>
                  <span className="font-medium">{q.author}</span>
                  {(q.role || q.source) && <span> &middot; {q.role || q.source}</span>}
                </figcaption>
              </figure>
            ))}
          </div>

          <div className={`${alignText(align)} mt-14`}>
            <a
              href={reviewsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm underline underline-offset-4"
              style={{ color: 'var(--tn-muted)' }}
            >
              {labels.allReviews}
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        </div>
      </PublicLandingPageSectionWrapper>
    );
  }

  // ── Classic ────────────────────────────────────────────────────────────────
  return (
    <PublicLandingPageSectionWrapper bg="gray">
      <div className="max-w-4xl mx-auto">
        {/* The heading was hardcoded German on every studio's page. The line beneath it —
            five filled stars and "Echte Google-Bewertungen" — asserted that whatever
            appeared below came from Google. It did not: the generator was instructed to
            invent testimonials, and they were rendered here and server-side. Both the
            five stars and the Google claim are gone; a quote is presented as a quote.
            When these genuinely come from the Places API they are rendered by
            GoogleReviews, which sources and attributes them properly. */}
        <h2 className={`text-3xl md:text-4xl font-bold text-gray-900 ${alignText(align)} mb-10`}>
          {heading}
        </h2>
        {/* Flex-wrap + justify-center so any number of testimonials sits
            centred as a block under the heading (1→centred, 2→pair, 3→row,
            5→3+2 centred) instead of left-aligned or lopsided. */}
        <div className="flex flex-wrap justify-center gap-6">
          {data.map((t, i) => (
            <figure
              key={i}
              className="relative bg-white border border-gray-100 rounded-2xl p-7 pt-9 shadow-sm hover:shadow-md transition-shadow w-full sm:w-[calc(50%-0.75rem)] lg:w-[calc(33.333%-1rem)] max-w-md flex flex-col"
            >
              <Quote className="absolute top-5 right-6 h-8 w-8 text-purple-100" aria-hidden="true" />
              {/* Five filled stars were stamped on every card. Nothing here carries a
                  rating — not the generated shape, not a pasted testimonial — so this
                  displayed a five-star score no one had given, per quote. A quote is
                  presented as a quote. Ratings belong to the Google feed, which has them. */}
              <blockquote className="text-gray-700 italic mb-4 leading-relaxed">"{t.quote}"</blockquote>
              <figcaption>
                <span className="block font-semibold text-gray-900">— {t.author}</span>
                {(t.role || t.source) && <span className="block text-sm text-gray-500">{t.role || t.source}</span>}
              </figcaption>
            </figure>
          ))}
        </div>

        {/* Verify the source — real Google Business Profile */}
        <div className={`${alignText(align)} mt-8`}>
          <a
            href={reviewsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-purple-700 hover:text-purple-900 font-medium text-sm underline underline-offset-2"
          >
            {labels.allReviews}
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </div>
    </PublicLandingPageSectionWrapper>
  );
}
