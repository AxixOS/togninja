// PublicLandingPageProblemSection — Phase 4

import { X } from 'lucide-react';
import { PublicLandingPageSectionWrapper } from './PublicLandingPageSectionWrapper';
import { alignText, alignBlock, type SectionAlign } from '../../utils/sectionAlignment';

interface PublicLandingPageProblemSectionProps {
  data: {
    headline?: string;
    description?: string;
    painPoints?: string[];
  };
  align?: SectionAlign;
}

export function PublicLandingPageProblemSection({ data, align = 'center' }: PublicLandingPageProblemSectionProps) {
  const points = (data.painPoints ?? []).filter(Boolean);
  // With 3 points use a 3-up grid, otherwise a 2-up — keeps the row balanced
  // and stops short items from floating in a centred column.
  const cols = points.length % 3 === 0 ? 'sm:grid-cols-3' : 'sm:grid-cols-2';
  return (
    <PublicLandingPageSectionWrapper bg="gray">
      <div className="max-w-5xl mx-auto">
        <div className={`max-w-2xl ${alignBlock(align)} ${alignText(align)}`}>
          {data.headline && (
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {data.headline}
            </h2>
          )}
          {data.description && (
            <p className="text-gray-600 text-lg mb-10 leading-relaxed">
              {data.description}
            </p>
          )}
        </div>
        {points.length > 0 && (
          <div className={`grid grid-cols-1 ${cols} gap-4 ${!data.description ? 'mt-2' : ''}`}>
            {points.map((p, i) => (
              <div
                key={i}
                className="flex items-start gap-3 bg-white rounded-xl border border-gray-100 border-l-4 border-l-red-300 p-5 shadow-sm"
              >
                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-red-50 text-red-500">
                  <X className="h-4 w-4" />
                </span>
                <span className="text-gray-700 leading-snug">{p}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </PublicLandingPageSectionWrapper>
  );
}
