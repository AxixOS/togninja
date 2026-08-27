// PublicLandingPageOfferSection — Phase 4

import { CheckCircle } from 'lucide-react';
import { PublicLandingPageSectionWrapper } from './PublicLandingPageSectionWrapper';
import { PublicLandingPageCtaButton } from './PublicLandingPageCtaButton';
import { alignText, alignBlock, alignJustify, type SectionAlign } from '../../utils/sectionAlignment';
import { useStudioCurrency } from '@/hooks/useStudioCurrency';
import { useIsEditorial } from '@/components/public/SiteLayoutContext';

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
  /**
   * One of the studio's own photographs, above the offer. Supplied only on the page that IS the
   * studio's homepage — see useHomepageContentImages. Absent on every pillar page, where these
   * two images would otherwise repeat across every service.
   */
  image?: { url: string; alt: string | null } | null;
  ctaHref: string;
  ctaText: string;
  pageId: string;
  pageSlug: string;
  isPreview: boolean;
}

export function PublicLandingPageOfferSection({
  data,
  align = 'center',
  image = null,
  ctaHref,
  ctaText,
  pageId,
  pageSlug,
  isPreview,
}: PublicLandingPageOfferSectionProps) {
  const editorial = useIsEditorial();
  const { format: money } = useStudioCurrency();
  const inclusions = (data.inclusions ?? []).filter(Boolean);

  // ── Editorial ──────────────────────────────────────────────────────────────
  //
  // The classic offer is a white card with a heavy shadow floating on a tinted band, the
  // price set in extrabold brand colour at 5xl, green ticks down the inclusions and the
  // urgency line in red. It is a pricing table from a software site, and it is the section
  // most likely to make a photographer look cheap — a wedding at four thousand pounds does
  // not want to be sold the way a subscription tier is.
  //
  // Here the card is dissolved and the offer is set as a statement. The price is large but
  // light and in the reading colour rather than the brand colour, because a price in an
  // accent hue reads as a discount sticker. The inclusions become a ruled list with no
  // ticks. The urgency line keeps its emphasis but takes it from weight and letterspacing
  // instead of from red, which was the only red on the page and answered to no theme.
  if (editorial) {
    return (
      <PublicLandingPageSectionWrapper bg="white">
        <div className={`max-w-3xl ${alignBlock(align)}`}>
          <div className={alignText(align)}>
            {data.headline && (
              <h2 className="tracking-tight" style={{ color: 'var(--tn-heading)' }}>
                {data.headline}
              </h2>
            )}
            {data.description && (
              <p className="mt-5 leading-relaxed" style={{ color: 'var(--tn-text)' }}>
                {data.description}
              </p>
            )}

            {data.price && (
              <p
                className="mt-10 text-5xl sm:text-6xl font-light leading-none tracking-tight"
                style={{ color: 'var(--tn-heading)' }}
              >
                {formatPrice(data.price, money)}
              </p>
            )}
          </div>

          {inclusions.length > 0 && (
            <ul className="mt-10 border-t" style={{ borderColor: 'var(--tn-border)' }}>
              {inclusions.map((inc, i) => (
                <li
                  key={i}
                  className="py-3.5 border-b text-left leading-relaxed"
                  style={{ borderColor: 'var(--tn-border)', color: 'var(--tn-text)' }}
                >
                  {inc}
                </li>
              ))}
            </ul>
          )}

          {data.urgency && (
            <p
              className={`mt-8 text-xs uppercase tracking-[0.16em] font-medium ${alignText(align)}`}
              style={{ color: 'var(--tn-muted)' }}
            >
              {data.urgency}
            </p>
          )}

          <div className={`mt-9 flex ${alignJustify(align)}`}>
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
      </PublicLandingPageSectionWrapper>
    );
  }

  // ── Classic ────────────────────────────────────────────────────────────────
  return (
    <PublicLandingPageSectionWrapper bg="purple">
      <div className={`max-w-2xl ${alignBlock(align)}`}>
        {/*
          Above the intro, not beside it. This section is a centred max-w-2xl offer card, and a
          two-column split would fight the one layout on the page that is deliberately narrow —
          it is the screen a customer buys from. A band reads as part of the same column.
        */}
        {image && (
          <img
            src={image.url}
            alt={image.alt || data.headline || ''}
            loading="lazy"
            className="w-full rounded-2xl object-cover aspect-[16/9] mb-8 shadow-sm"
          />
        )}
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
