// PublicLandingPageTestimonialsSection — Phase 4

import { Quote, Star, ExternalLink } from 'lucide-react';
import { PublicLandingPageSectionWrapper } from './PublicLandingPageSectionWrapper';
import { alignText, alignJustify, type SectionAlign } from '../../utils/sectionAlignment';
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
  const { t } = useLanguage();
  const reviewsUrl = (() => {
    const v = t('reviews.googleUrl');
    return v && v !== 'reviews.googleUrl' ? v : DEFAULT_REVIEWS_URL;
  })();
  if (!data || data.length === 0) return null;

  return (
    <PublicLandingPageSectionWrapper bg="gray">
      <div className="max-w-4xl mx-auto">
        <h2 className={`text-3xl md:text-4xl font-bold text-gray-900 ${alignText(align)} mb-3`}>
          Das sagen unsere Kunden
        </h2>
        <div className={`flex items-center ${alignJustify(align)} gap-2 mb-10 text-gray-600`}>
          <span className="flex text-yellow-400">
            {[0, 1, 2, 3, 4].map((j) => <Star key={j} className="h-4 w-4 fill-current" />)}
          </span>
          <span className="text-sm font-medium">Echte Google-Bewertungen</span>
        </div>
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
              <div className="flex gap-0.5 mb-3 text-yellow-400">
                {[0, 1, 2, 3, 4].map((j) => <Star key={j} className="h-4 w-4 fill-current" />)}
              </div>
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
            Alle Bewertungen auf Google ansehen
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </div>
    </PublicLandingPageSectionWrapper>
  );
}
