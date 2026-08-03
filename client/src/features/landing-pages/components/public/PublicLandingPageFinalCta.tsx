// PublicLandingPageFinalCta — Phase 4

import { PublicLandingPageCtaButton } from './PublicLandingPageCtaButton';
import { alignText, alignBlock, alignJustify, type SectionAlign } from '../../utils/sectionAlignment';

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
