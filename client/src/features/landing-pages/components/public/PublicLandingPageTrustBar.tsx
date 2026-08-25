// PublicLandingPageTrustBar — Phase 4

import { CheckCircle } from 'lucide-react';
import { useIsEditorial } from '@/components/public/SiteLayoutContext';

interface PublicLandingPageTrustBarProps {
  data: {
    items: string[];
  };
}

export function PublicLandingPageTrustBar({ data }: PublicLandingPageTrustBarProps) {
  const editorial = useIsEditorial();
  if (!data.items || data.items.length === 0) return null;

  // ── Editorial ────────────────────────────────────────────────────────────────
  //
  // The classic bar is a row of green ticks on a grey band under the hero. Two problems with
  // it on a photographer's site: the band is a hard horizontal line immediately below the
  // image, which cuts the hero off at the knees; and the green is literal — it is the one
  // colour on the page that answers to no theme, so on a bone-and-ember or a charcoal palette
  // there is an unexplained spot of Tailwind green.
  //
  // Here it becomes a masthead credit line: small, letter-spaced, separated by thin rules,
  // sitting on the page's own ground. It reads as provenance rather than as a feature list,
  // which is what these items actually are on a studio site — "20 years in Edinburgh",
  // "Fully insured", "Same-week turnaround".
  if (editorial) {
    return (
      <section className="border-b" style={{ background: 'var(--tn-bg)', borderColor: 'var(--tn-border)' }}>
        <div className="max-w-6xl mx-auto px-6 sm:px-8 py-6">
          <ul className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 sm:gap-x-12">
            {data.items.map((item, i) => (
              <li
                key={i}
                className="flex items-center text-[0.7rem] uppercase tracking-[0.16em] font-medium"
                style={{ color: 'var(--tn-muted)' }}
              >
                {/* A rule between items rather than a tick beside each. Hidden on the first
                    so the row never opens with a dangling separator, and hidden entirely
                    when the items wrap to their own lines on a narrow screen. */}
                {i > 0 && (
                  <span
                    aria-hidden="true"
                    className="hidden sm:inline-block w-8 h-px mr-8 sm:mr-12 -ml-8 sm:-ml-12 align-middle"
                    style={{ background: 'var(--tn-border)' }}
                  />
                )}
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>
    );
  }

  // ── Classic ──────────────────────────────────────────────────────────────────
  return (
    <section className="bg-gray-50 border-b">
      <div className="max-w-5xl mx-auto px-6 py-5 flex flex-wrap justify-center gap-6 md:gap-10">
        {data.items.map((item, i) => (
          <span key={i} className="flex items-center gap-2 text-sm text-gray-700 font-medium">
            <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
            {item}
          </span>
        ))}
      </div>
    </section>
  );
}
