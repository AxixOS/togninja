// PublicLandingPageBenefitsSection — Phase 4

import { PublicLandingPageSectionWrapper } from './PublicLandingPageSectionWrapper';
import { alignText, alignBlock, type SectionAlign } from '../../utils/sectionAlignment';

interface PublicLandingPageBenefitsSectionProps {
  data: Array<{
    title: string;
    description: string;
  }>;
  align?: SectionAlign;
}

export function PublicLandingPageBenefitsSection({ data, align = 'center' }: PublicLandingPageBenefitsSectionProps) {
  if (!data || data.length === 0) return null;

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
