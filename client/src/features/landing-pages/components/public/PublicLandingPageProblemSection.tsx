// PublicLandingPageProblemSection — Phase 4

import { X } from 'lucide-react';
import { PublicLandingPageSectionWrapper } from './PublicLandingPageSectionWrapper';
import { alignText, alignBlock, type SectionAlign } from '../../utils/sectionAlignment';
import { useIsEditorial } from '@/components/public/SiteLayoutContext';

interface PublicLandingPageProblemSectionProps {
  data: {
    headline?: string;
    description?: string;
    painPoints?: string[];
  };
  align?: SectionAlign;
  /**
   * One of the studio's own photographs, beside the copy. Only ever supplied on the page that is
   * the studio's homepage — see useHomepageContentImages. Absent everywhere else, and the
   * section lays out exactly as before when it is.
   */
  image?: { url: string; alt: string | null } | null;
}

export function PublicLandingPageProblemSection({ data, align = 'center', image = null }: PublicLandingPageProblemSectionProps) {
  const editorial = useIsEditorial();
  const points = (data.painPoints ?? []).filter(Boolean);
  // With 3 points use a 3-up grid, otherwise a 2-up — keeps the row balanced
  // and stops short items from floating in a centred column.
  const cols = points.length % 3 === 0 ? 'sm:grid-cols-3' : 'sm:grid-cols-2';

  // ── Editorial ────────────────────────────────────────────────────────────────
  //
  // The classic treatment puts each pain point in a white card with a red left border and a
  // red X in a circle. That is the visual language of a validation error, applied to a
  // photographer describing what their clients struggle with — it reads as alarming rather
  // than as understanding, and the reds answer to no theme, so they sit outside whatever
  // palette the studio chose.
  //
  // Editorial sets the headline against a rail on the left and runs the points beneath it as
  // a plain ruled list. The emphasis comes from the type and the space, and the section stops
  // shouting at the reader about their own problems.
  if (editorial) {
    return (
      <PublicLandingPageSectionWrapper bg="gray">
        <div className="max-w-5xl mx-auto grid gap-10 md:gap-16 md:grid-cols-[minmax(0,22rem)_1fr]">
          <div className={alignText(align)}>
            {data.headline && (
              // No size utility: the theme's own h2 rule governs size and weight.
              <h2 className="tracking-tight" style={{ color: 'var(--tn-heading)' }}>
                {data.headline}
              </h2>
            )}
            {data.description && (
              <p className="mt-5 leading-relaxed" style={{ color: 'var(--tn-text)' }}>
                {data.description}
              </p>
            )}
          </div>

          {points.length > 0 && (
            <ul className="divide-y self-center" style={{ borderColor: 'var(--tn-border)' }}>
              {points.map((p, i) => (
                <li
                  key={i}
                  className="py-4 first:pt-0 last:pb-0 leading-relaxed"
                  style={{ borderColor: 'var(--tn-border)', color: 'var(--tn-text)' }}
                >
                  {p}
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
      <div className="max-w-5xl mx-auto">
        {/*
          With a photograph, the copy and the picture sit side by side and the copy stops being
          centred — a centred column beside an image reads as two things that were not designed
          together. Without one, this is byte-for-byte the layout that shipped before.
        */}
        <div className={image ? 'grid gap-8 md:grid-cols-2 md:items-center' : ''}>
          <div className={image ? 'text-left' : `max-w-2xl ${alignBlock(align)} ${alignText(align)}`}>
            {data.headline && (
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                {data.headline}
              </h2>
            )}
            {data.description && (
              <p className={`text-gray-600 text-lg leading-relaxed ${image ? 'mb-0' : 'mb-10'}`}>
                {data.description}
              </p>
            )}
          </div>
          {image && (
            <img
              src={image.url}
              // The studio's own alt text when the upload produced one. Falling back to the
              // headline rather than to a filename: a screen reader reading
              // "Dark+Waters-2500w.jpg" is worse than reading the section it illustrates.
              alt={image.alt || data.headline || ''}
              loading="lazy"
              className="w-full rounded-2xl object-cover aspect-[4/3] shadow-sm"
            />
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
