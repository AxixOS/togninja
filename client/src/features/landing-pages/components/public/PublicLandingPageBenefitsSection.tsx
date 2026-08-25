// PublicLandingPageBenefitsSection — Phase 4

import { PublicLandingPageSectionWrapper } from './PublicLandingPageSectionWrapper';
import { alignText, alignBlock, type SectionAlign } from '../../utils/sectionAlignment';
import { useIsEditorial } from '@/components/public/SiteLayoutContext';

interface PublicLandingPageBenefitsSectionProps {
  data: Array<{
    title: string;
    description: string;
  }>;
  align?: SectionAlign;
}

export function PublicLandingPageBenefitsSection({ data, align = 'center' }: PublicLandingPageBenefitsSectionProps) {
  const editorial = useIsEditorial();
  if (!data || data.length === 0) return null;

  // ── Editorial ────────────────────────────────────────────────────────────────
  //
  // This is the section that most defines the generic look: three white cards in a row, each
  // with a gradient circle holding a number, each lifting on hover. It is the arrangement
  // every template ships and the reason a photographer's site reads as software output.
  //
  // Here the cards dissolve. The numbers become hanging figures in a left gutter, set large
  // and quiet in the muted tone rather than reversed out of a coloured disc; the rows are
  // separated by hairlines instead of by shadows and radii; and the measure is capped so the
  // descriptions read as prose rather than as filled boxes.
  //
  // Nothing here needs an image. This section has never had one — the data is exactly
  // { title, description } — so there is no empty-state to design around, which is why it
  // suits a studio that has just onboarded with nothing uploaded.
  if (editorial) {
    return (
      <PublicLandingPageSectionWrapper bg="gray">
        <div className="max-w-4xl mx-auto">
          <ul className="divide-y" style={{ borderColor: 'var(--tn-border)' }}>
            {data.map((b, i) => (
              <li
                key={i}
                className="grid grid-cols-[3rem_1fr] sm:grid-cols-[5rem_1fr] gap-x-5 sm:gap-x-10 py-8 sm:py-10 first:pt-0 last:pb-0"
                style={{ borderColor: 'var(--tn-border)' }}
              >
                {/* A hanging figure, not a badge. Tabular so the column stays true past nine. */}
                <span
                  className="text-2xl sm:text-4xl font-light leading-none tabular-nums pt-1"
                  style={{ color: 'var(--tn-muted)' }}
                  aria-hidden="true"
                >
                  {String(i + 1).padStart(2, '0')}
                </span>

                <div className={alignText(align)}>
                  <h3
                    className="text-lg sm:text-xl font-medium mb-2"
                    style={{ color: 'var(--tn-heading)' }}
                  >
                    {b.title}
                  </h3>
                  <p className="leading-relaxed max-w-prose" style={{ color: 'var(--tn-text)' }}>
                    {b.description}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </PublicLandingPageSectionWrapper>
    );
  }

  // ── Classic ──────────────────────────────────────────────────────────────────
  return (
    <PublicLandingPageSectionWrapper bg="gray">
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {data.map((b, i) => (
            <div
              key={i}
              className={`${alignText(align)} bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all p-7`}
            >
              <div className={`w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-500 text-white rounded-full flex items-center justify-center ${alignBlock(align)} mb-4 text-xl font-bold shadow-sm`}>
                {i + 1}
              </div>
              <h3 className="font-bold text-lg text-gray-900 mb-2">{b.title}</h3>
              <p className="text-gray-600 leading-relaxed">{b.description}</p>
            </div>
          ))}
        </div>
      </div>
    </PublicLandingPageSectionWrapper>
  );
}
