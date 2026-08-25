// PublicLandingPageFaqSection — Phase 4

import { HelpCircle } from 'lucide-react';
import { PublicLandingPageSectionWrapper } from './PublicLandingPageSectionWrapper';
import { alignText, type SectionAlign } from '../../utils/sectionAlignment';
import { usePublicLabels } from '../../utils/publicLabels';
import { useIsEditorial } from '@/components/public/SiteLayoutContext';

interface PublicLandingPageFaqSectionProps {
  data: Array<{
    question: string;
    answer: string;
  }>;
  align?: SectionAlign;
}

export function PublicLandingPageFaqSection({ data, align = 'center' }: PublicLandingPageFaqSectionProps) {
  const editorial = useIsEditorial();
  // Was the literal string "Häufige Fragen", shipped to every studio on every instance.
  const labels = usePublicLabels();
  if (!data || data.length === 0) return null;

  // ── Editorial ────────────────────────────────────────────────────────────────
  //
  // A ruled index rather than a stack of floating white cards. The questions are separated by
  // hairlines, the marker is a rotating rule instead of an icon in brand colour, and the
  // answer is indented to the measure rather than boxed. Same <details>/<summary>, so the
  // keyboard behaviour and the open/closed semantics are unchanged.
  if (editorial) {
    return (
      <PublicLandingPageSectionWrapper bg="gray">
        <div className="max-w-3xl mx-auto">
          <h2 className={`${alignText(align)} mb-12 tracking-tight`} style={{ color: 'var(--tn-heading)' }}>
            {labels.faqHeading}
          </h2>
          <div className="border-t" style={{ borderColor: 'var(--tn-border)' }}>
            {data.map((f, i) => (
              <details key={i} className="group border-b" style={{ borderColor: 'var(--tn-border)' }}>
                <summary
                  className="py-6 cursor-pointer flex items-start gap-6 list-none text-base sm:text-lg font-medium"
                  style={{ color: 'var(--tn-heading)' }}
                >
                  <span className="flex-1">{f.question}</span>
                  {/* A plus that becomes a minus. Rotation is a transform on a decorative
                      span, so it costs nothing to a reader with motion reduced. */}
                  <span
                    aria-hidden="true"
                    className="mt-1 shrink-0 text-xl font-light leading-none transition-transform duration-200 group-open:rotate-45 motion-reduce:transition-none"
                    style={{ color: 'var(--tn-muted)' }}
                  >
                    +
                  </span>
                </summary>
                <div className="pb-7 pr-10 leading-relaxed max-w-prose" style={{ color: 'var(--tn-text)' }}>
                  {f.answer}
                </div>
              </details>
            ))}
          </div>
        </div>
      </PublicLandingPageSectionWrapper>
    );
  }

  // ── Classic ──────────────────────────────────────────────────────────────────
  return (
    <PublicLandingPageSectionWrapper bg="gray">
      <div className="max-w-3xl mx-auto">
        <h2 className={`text-3xl md:text-4xl font-bold text-gray-900 ${alignText(align)} mb-10`}>
          {labels.faqHeading}
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
