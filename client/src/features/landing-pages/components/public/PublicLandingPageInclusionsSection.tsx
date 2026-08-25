// PublicLandingPageInclusionsSection — Phase 4

import { CheckCircle } from 'lucide-react';
import { PublicLandingPageSectionWrapper } from './PublicLandingPageSectionWrapper';
import { alignText, type SectionAlign } from '../../utils/sectionAlignment';
import { useIsEditorial } from '@/components/public/SiteLayoutContext';

interface PublicLandingPageInclusionsSectionProps {
  data: {
    headline?: string;
    items?: string[];
  };
  align?: SectionAlign;
}

export function PublicLandingPageInclusionsSection({ data, align = 'center' }: PublicLandingPageInclusionsSectionProps) {
  const editorial = useIsEditorial();
  if (!data.items || data.items.length === 0) return null;

  // ── Editorial ────────────────────────────────────────────────────────────────
  //
  // This is a list of what a session includes — session length, number of edited images,
  // an online gallery, prints. The classic treatment puts every item in its own mint-green
  // pill with a green tick, which is the styling of a pricing-page feature matrix and turns
  // a photographer's deliverables into a checklist of software features. The green is also
  // literal, so it belongs to no theme.
  //
  // Here it is set as a specification list: two columns of ruled rows, the item in the
  // reading colour, no chips and no ticks. Closer to the back of a good catalogue than to a
  // SaaS comparison table.
  if (editorial) {
    return (
      <PublicLandingPageSectionWrapper>
        <div className="max-w-4xl mx-auto">
          {data.headline && (
            <h2 className={`${alignText(align)} mb-12 tracking-tight`} style={{ color: 'var(--tn-heading)' }}>
              {data.headline}
            </h2>
          )}
          {/* Column rules would collide with the row rules at every crossing, so the columns
              are separated by space and only the rows are ruled. */}
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-12">
            {data.items.map((item, i) => (
              <li
                key={i}
                className="py-4 border-b leading-relaxed"
                style={{ borderColor: 'var(--tn-border)', color: 'var(--tn-text)' }}
              >
                {item}
              </li>
            ))}
          </ul>
        </div>
      </PublicLandingPageSectionWrapper>
    );
  }

  // ── Classic ──────────────────────────────────────────────────────────────────
  return (
    <PublicLandingPageSectionWrapper>
      <div className="max-w-3xl mx-auto">
        {data.headline && (
          <h2 className={`text-3xl md:text-4xl font-bold text-gray-900 ${alignText(align)} mb-10`}>
            {data.headline}
          </h2>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.items.map((item, i) => (
            <div key={i} className="flex items-center gap-3 p-4 bg-green-50 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
              <span className="text-gray-800">{item}</span>
            </div>
          ))}
        </div>
      </div>
    </PublicLandingPageSectionWrapper>
  );
}
