// PublicLandingPageInclusionsSection — Phase 4

import { CheckCircle } from 'lucide-react';
import { PublicLandingPageSectionWrapper } from './PublicLandingPageSectionWrapper';
import { alignText, type SectionAlign } from '../../utils/sectionAlignment';

interface PublicLandingPageInclusionsSectionProps {
  data: {
    headline?: string;
    items?: string[];
  };
  align?: SectionAlign;
}

export function PublicLandingPageInclusionsSection({ data, align = 'center' }: PublicLandingPageInclusionsSectionProps) {
  if (!data.items || data.items.length === 0) return null;

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
