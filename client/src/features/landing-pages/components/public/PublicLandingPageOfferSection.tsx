// PublicLandingPageOfferSection — Phase 4

import { CheckCircle } from 'lucide-react';
import { PublicLandingPageSectionWrapper } from './PublicLandingPageSectionWrapper';
import { PublicLandingPageCtaButton } from './PublicLandingPageCtaButton';
import { alignText, alignBlock, alignJustify, type SectionAlign } from '../../utils/sectionAlignment';
import { useStudioCurrency } from '@/hooks/useStudioCurrency';

// Show the price in the currency the studio sells in, not the one this product was born
// in — the offer card is the screen the customer buys from, so a euro sign written into
// the JSX quoted a Shreveport session in euros.
//
// Not a React component, so it cannot call the hook: the formatter arrives as an argument.
// The symbols in the test below are DETECTED, never printed — a photographer who typed a
// currency into the field by hand keeps their own wording.
const formatPrice = (raw: string, money: (amount: number) => string): string => {
  const s = String(raw).trim();
  if (!s) return s;
  if (/[€$£¥]|eur|usd|gbp|chf/i.test(s)) return s;
  // "195" is formatted outright; "ab 95" / "from 95" keep their lead-in and format the
  // number. Anything else ("on request") is prose and is returned exactly as typed: the
  // old version glued a symbol onto the front of whatever it was handed.
  const m = /^(\D*?)\s*(\d+(?:[.,]\d{1,2})?)$/.exec(s);
  if (!m) return s;
  const amount = Number(m[2].split(',').join('.'));
  return m[1] ? `${m[1]} ${money(amount)}` : money(amount);
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
  const { format: money } = useStudioCurrency();
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
              <span className="block text-5xl font-extrabold text-purple-600 leading-none">{formatPrice(data.price, money)}</span>
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
