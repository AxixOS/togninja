// PublicLandingPageOfferSection — Phase 4

import { CheckCircle } from 'lucide-react';
import { PublicLandingPageSectionWrapper } from './PublicLandingPageSectionWrapper';
import { PublicLandingPageCtaButton } from './PublicLandingPageCtaButton';
import { alignText, alignBlock, alignJustify, type SectionAlign } from '../../utils/sectionAlignment';

// Show the price with a € symbol. A bare number ("195") becomes "€195"; a value
// that already carries a currency ("€195", "195 €", "ab 95 €") is left untouched.
const formatPrice = (raw: string): string => {
  const s = String(raw).trim();
  if (!s) return s;
  if (/[€$£]|eur|chf/i.test(s)) return s;
  return `€${s}`;
};

interface PublicLandingPageOfferSectionProps {
  data: {
    headline?: string;
    description?: string;
    price?: string;
    inclusions?: string[];
    urgency?: string;
  };
  align?: SectionAlign;
  ctaHref: string;
  ctaText: string;
  pageId: string;
  pageSlug: string;
  isPreview: boolean;
}

export function PublicLandingPageOfferSection({
  data,
  align = 'center',
  ctaHref,
  ctaText,
  pageId,
  pageSlug,
  isPreview,
}: PublicLandingPageOfferSectionProps) {
  const inclusions = (data.inclusions ?? []).filter(Boolean);
  return (
    <PublicLandingPageSectionWrapper bg="purple">
      <div className={`max-w-2xl ${alignBlock(align)}`}>
        {/* Intro above the card */}
        <div className={`${alignText(align)} mb-8`}>
          {data.headline && (
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {data.headline}
            </h2>
          )}
          {data.description && (
            <p className="text-gray-700 text-lg leading-relaxed">
              {data.description}
            </p>
          )}
        </div>

        {/* The offer card — contains price, what's included, urgency and CTA */}
        <div className="bg-white rounded-2xl shadow-xl border border-purple-100 p-8 md:p-10">
          {data.price && (
            <div className={`${alignText(align)} mb-8`}>
              <span className="block text-5xl font-extrabold text-purple-600 leading-none">{formatPrice(data.price)}</span>
            </div>
          )}

          {inclusions.length > 0 && (
            <div className="text-left space-y-3 mb-8">
              {inclusions.map((inc, i) => (
                <div key={i} className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                  <span className="text-gray-700">{inc}</span>
                </div>
              ))}
            </div>
          )}

          {data.urgency && (
            <p className={`text-red-600 font-semibold ${alignText(align)} mb-6`}>{data.urgency}</p>
          )}

          <div className={`flex ${alignJustify(align)}`}>
            <PublicLandingPageCtaButton
              href={ctaHref}
              label={ctaText}
              pageId={pageId}
              pageSlug={pageSlug}
              placement="offer"
              isPreview={isPreview}
            />
          </div>
        </div>
      </div>
    </PublicLandingPageSectionWrapper>
  );
}
