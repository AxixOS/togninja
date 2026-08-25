// PublicLandingPageWhyChooseUsSection — Phase 4

import { Shield } from 'lucide-react';
import { PublicLandingPageSectionWrapper } from './PublicLandingPageSectionWrapper';
import { alignText, type SectionAlign } from '../../utils/sectionAlignment';
import { useIsEditorial } from '@/components/public/SiteLayoutContext';

interface PublicLandingPageWhyChooseUsSectionProps {
  data: {
    headline?: string;
    // Editor saves plain strings ("points"), AI generation saves objects —
    // tolerate both so neither source renders empty cards.
    reasons?: Array<string | { title?: string; description?: string }>;
  };
  align?: SectionAlign;
}

export function PublicLandingPageWhyChooseUsSection({ data, align = 'center' }: PublicLandingPageWhyChooseUsSectionProps) {
  const editorial = useIsEditorial();
  const reasons = (data.reasons ?? [])
    .map(r => (typeof r === 'string' ? { title: r, description: '' } : { title: r?.title ?? '', description: r?.description ?? '' }))
    .filter(r => r.title || r.description);

  // ── Editorial ────────────────────────────────────────────────────────────────
  //
  // Every reason in the classic version gets the same shield icon — the same glyph repeated
  // down the page, which carries no information and reads as a placeholder somebody never got
  // round to replacing. Editorial drops it entirely rather than finding a different icon: a
  // reason to choose a photographer is a sentence, and a sentence does not need a pictogram.
  //
  // The rows become a ruled list on the page's own ground, with the reason's title carrying
  // the weight. Where a reason is a bare string — which is what the editor saves — it renders
  // as a single line with nothing missing, rather than as a card with an empty body.
  if (editorial) {
    return (
      <PublicLandingPageSectionWrapper bg="gray">
        <div className="max-w-4xl mx-auto">
          {data.headline && (
            <h2 className={`${alignText(align)} mb-12 tracking-tight`} style={{ color: 'var(--tn-heading)' }}>
              {data.headline}
            </h2>
          )}
          {reasons.length > 0 && (
            <ul className="divide-y" style={{ borderColor: 'var(--tn-border)' }}>
              {reasons.map((r, i) => (
                <li key={i} className="py-6 first:pt-0 last:pb-0" style={{ borderColor: 'var(--tn-border)' }}>
                  {r.title && (
                    <h3 className="text-lg font-medium" style={{ color: 'var(--tn-heading)' }}>
                      {r.title}
                    </h3>
                  )}
                  {r.description && (
                    <p className="mt-2 leading-relaxed max-w-prose" style={{ color: 'var(--tn-text)' }}>
                      {r.description}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </PublicLandingPageSectionWrapper>
    );
  }

  // ── Classic ──────────────────────────────────────────────────────────────────
  return (
    <PublicLandingPageSectionWrapper bg="gray">
      <div className="max-w-3xl mx-auto">
        {data.headline && (
          <h2 className={`text-3xl md:text-4xl font-bold text-gray-900 ${alignText(align)} mb-10`}>
            {data.headline}
          </h2>
        )}
        {reasons.length > 0 && (
          <div className="space-y-6">
            {reasons.map((r, i) => (
              <div key={i} className="flex gap-4 bg-white p-5 rounded-xl shadow-sm items-center">
                <Shield className="h-6 w-6 text-purple-500 flex-shrink-0" />
                <div>
                  {r.title && <h4 className="font-semibold text-gray-900 text-lg">{r.title}</h4>}
                  {r.description && <p className="text-gray-600 mt-1">{r.description}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PublicLandingPageSectionWrapper>
  );
}
