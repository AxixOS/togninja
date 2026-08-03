// PublicLandingPageFaqSection — Phase 4

import { HelpCircle } from 'lucide-react';
import { PublicLandingPageSectionWrapper } from './PublicLandingPageSectionWrapper';
import { alignText, type SectionAlign } from '../../utils/sectionAlignment';

interface PublicLandingPageFaqSectionProps {
  data: Array<{
    question: string;
    answer: string;
  }>;
  align?: SectionAlign;
}

export function PublicLandingPageFaqSection({ data, align = 'center' }: PublicLandingPageFaqSectionProps) {
  if (!data || data.length === 0) return null;

  return (
    <PublicLandingPageSectionWrapper bg="gray">
      <div className="max-w-3xl mx-auto">
        <h2 className={`text-3xl md:text-4xl font-bold text-gray-900 ${alignText(align)} mb-10`}>
          Häufige Fragen
        </h2>
        <div className="space-y-4">
          {data.map((f, i) => (
            <details key={i} className="bg-white rounded-xl shadow-sm group">
              <summary className="p-5 cursor-pointer font-semibold text-gray-900 flex items-center gap-3 hover:text-purple-600 transition-colors list-none">
                <HelpCircle className="h-5 w-5 text-purple-500 flex-shrink-0" />
                {f.question}
                <span className="ml-auto text-gray-400 group-open:rotate-180 transition-transform">▾</span>
              </summary>
              <div className="px-5 pb-5 text-gray-600 leading-relaxed ml-8">
                {f.answer}
              </div>
            </details>
          ))}
        </div>
      </div>
    </PublicLandingPageSectionWrapper>
  );
}
