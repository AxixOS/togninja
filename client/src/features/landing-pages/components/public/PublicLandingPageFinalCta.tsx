// PublicLandingPageFinalCta — Phase 4

import { PublicLandingPageCtaButton } from './PublicLandingPageCtaButton';
import { alignText, alignBlock, alignJustify, type SectionAlign } from '../../utils/sectionAlignment';
import { useIsEditorial } from '@/components/public/SiteLayoutContext';

interface PublicLandingPageFinalCtaProps {
  data: {
    headline?: string;
    description?: string;
    ctaText?: string;
  };
  align?: SectionAlign;
  ctaHref: string;
  ctaText: string;
  pageId: string;
  pageSlug: string;
  isPreview: boolean;
}

export function PublicLandingPageFinalCta({
  data,
  align = 'center',
  ctaHref,
  ctaText,
  pageId,
  pageSlug,
  isPreview,
}: PublicLandingPageFinalCtaProps) {
  const editorial = useIsEditorial();

  // ── Editorial ────────────────────────────────────────────────────────────────
  //
  // The classic final call to action is a saturated brand band across the full width with
  // everything centred on it — the loudest thing on the page, and on most studio sites the
  // last thing a visitor sees before they leave.
  //
  // Editorial keeps the interruption but changes its nature: the page's own ground, a rule
  // above it to mark the break, and the ask set large and quiet with plenty of room. The
  // emphasis comes from space and scale rather than from filling the viewport with colour,
  // which is what a photographer's site does when it wants to be taken seriously.
  //
  // The button switches from primaryInverted to primary for a concrete reason, not taste:
  // primaryInverted is a white fill drawn to sit on a dark band. With the band gone it is a
  // white pill on a light ground — invisible. primary is the theme's own fill with
  // --tn-on-primary text, which is the pairing the preset guarantees is legible.
  if (editorial) {
    return (
      <section className="px-6 sm:px-8 py-24 md:py-32" style={{ background: 'var(--tn-bg)' }}>
        <div className={`max-w-4xl ${alignBlock(align)}`}>
          <div className="pt-14 border-t" style={{ borderColor: 'var(--tn-border)' }}>
            <div className={alignText(align)}>
              {data.headline && (
                // No size utility and no font-extrabold: the theme's own h2 rule governs
                // both, which is the point of an editorial page.
                <h2 className="mb-5 tracking-tight" style={{ color: 'var(--tn-heading)' }}>
                  {data.headline}
                </h2>
              )}
              {data.description && (
                <p
                  className={`max-w-xl mb-10 leading-relaxed ${alignBlock(align)}`}
                  style={{ color: 'var(--tn-text)' }}
                >
                  {data.description}
                </p>
              )}
              <div className={`flex ${alignJustify(align)}`}>
                <PublicLandingPageCtaButton
                  href={ctaHref}
                  label={data.ctaText || ctaText}
                  pageId={pageId}
                  pageSlug={pageSlug}
                  placement="finalCta"
                  isPreview={isPreview}
                  variant="primary"
                />
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // ── Classic ──────────────────────────────────────────────────────────────────
  return (
    <section className="relative bg-gradient-to-br from-purple-700 via-purple-600 to-pink-600 text-white py-20 md:py-24 px-6">
      <div className={`max-w-3xl ${alignBlock(align)} ${alignText(align)}`}>
        {data.headline && (
          <h2 className="text-3xl md:text-4xl font-extrabold mb-4">
            {data.headline}
          </h2>
        )}
        {data.description && (
          <p className={`text-lg text-white/90 max-w-xl mb-8 leading-relaxed ${alignBlock(align)}`}>
            {data.description}
          </p>
        )}
        <div className={`flex ${alignJustify(align)}`}>
          <PublicLandingPageCtaButton
            href={ctaHref}
            label={data.ctaText || ctaText}
            pageId={pageId}
            pageSlug={pageSlug}
            placement="finalCta"
            isPreview={isPreview}
            variant="primaryInverted"
          />
        </div>
      </div>
    </section>
  );
}
