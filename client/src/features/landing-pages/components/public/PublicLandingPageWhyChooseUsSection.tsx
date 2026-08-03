// PublicLandingPageWhyChooseUsSection — Phase 4

import { Shield } from 'lucide-react';
import { PublicLandingPageSectionWrapper } from './PublicLandingPageSectionWrapper';
import { alignText, type SectionAlign } from '../../utils/sectionAlignment';

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
  const reasons = (data.reasons ?? [])
    .map(r => (typeof r === 'string' ? { title: r, description: '' } : { title: r?.title ?? '', description: r?.description ?? '' }))
    .filter(r => r.title || r.description);
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
