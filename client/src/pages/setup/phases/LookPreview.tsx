import { useEffect, useRef, useState } from 'react';
import { ThemeScope } from '@/components/public/ThemeScope';
import { getThemePreset } from '../../../../../shared/themePresets';
import { PublicLandingPageHero } from '@/features/landing-pages/components/public/PublicLandingPageHero';
import { PublicLandingPageProblemSection } from '@/features/landing-pages/components/public/PublicLandingPageProblemSection';
import { PublicLandingPageOfferSection } from '@/features/landing-pages/components/public/PublicLandingPageOfferSection';

/**
 * A live preview of the look being chosen.
 *
 * WHY IT IS THE REAL SECTIONS. A studio picked from two grey wireframes and nine cards showing
 * one line of type and a coloured button — eighteen combinations, none of which could be seen
 * without onboarding eighteen times. The obvious fix is a set of screenshots, and the obvious
 * problem with screenshots is that they are correct on the day they are taken. Two of the bugs
 * fixed this week were a section that drew a photograph in one layout and not the other; a
 * screenshot would have gone on showing the version that worked.
 *
 * So this renders PublicLandingPageHero, ProblemSection and OfferSection — the actual
 * components, inside a real ThemeScope, at 1200px and scaled down. If the editorial offer
 * section changes, this changes with it, because it IS the editorial offer section.
 *
 * The three chosen are the ones that differ MOST between the two layouts: the hero carries the
 * type treatment, the problem section is a ruled list against a rail in editorial and a row of
 * bordered cards in classic, and the offer is a dissolved statement against a floating white
 * card with a heavy shadow. Between them they also show the palette everywhere it appears —
 * heading, body, ground, button fill and button label.
 */

// Sample copy. Deliberately about photography and deliberately not about any studio in
// particular: at this point in setup the wizard has not asked their name yet.
const SAMPLE = {
  hero: {
    headline: 'Photographs that feel like the day itself',
    subheadline: 'Unhurried, honest pictures of the people you love — made somewhere you feel comfortable, and kept for a long time.',
    eyebrow: 'Portrait & family photography',
  },
  problem: {
    headline: 'Finding a photographer you trust is hard',
    description: 'Most galleries look the same and most sessions feel like an appointment. You want someone who will notice the small things.',
    painPoints: ['Stiff, posed pictures', 'Feeling watched, not seen', 'A gallery that looks like everyone else\'s'],
  },
  offer: {
    headline: 'A session, unrushed',
    description: 'Two hours, wherever you feel most yourself, and a gallery of the frames worth keeping.',
    price: '295',
    inclusions: ['Two hours of shooting', 'Forty edited photographs', 'A private online gallery'],
    urgency: 'Booking four weeks ahead',
  },
};

/** The width the real page is composed at. The preview is this, scaled. */
const PAGE_WIDTH = 1200;

export function LookPreview({ themeId, layoutId }: { themeId: string; layoutId: string }) {
  const frame = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(0.34);

  // Scale from the actual container width rather than a fixed factor, so the preview fills
  // whatever room the step gives it instead of leaving a gap on a wide screen or overflowing
  // on a narrow one.
  useEffect(() => {
    const el = frame.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => {
      const w = el.clientWidth;
      if (w > 0) setScale(w / PAGE_WIDTH);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const preset = getThemePreset(themeId);

  return (
    <div
      ref={frame}
      className="relative w-full overflow-hidden rounded-xl border border-slate-200 bg-white"
      // Tall enough for the hero and the beginning of what follows, which is what a visitor
      // sees before scrolling and what a studio is really judging.
      style={{ height: Math.round(1500 * scale) }}
      // The preview is decoration for a choice, not content: a screen reader gets the labels
      // on the cards, and reading three paragraphs of sample copy aloud would be noise.
      aria-hidden="true"
    >
      <div
        style={{
          width: PAGE_WIDTH,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          pointerEvents: 'none',
        }}
      >
        <ThemeScope preset={preset} layout={layoutId}>
          <PublicLandingPageHero
            data={SAMPLE.hero}
            imageUrl={null}
            ctaHref="#"
            ctaText="Book a session"
            pageId="preview"
            pageSlug="preview"
            isPreview
          />
          <PublicLandingPageProblemSection data={SAMPLE.problem} align="center" />
          <PublicLandingPageOfferSection
            data={SAMPLE.offer}
            align="center"
            ctaHref="#"
            ctaText="Book a session"
            pageId="preview"
            pageSlug="preview"
            isPreview
          />
        </ThemeScope>
      </div>

      {/* The page continues past the frame; say so rather than letting it look cut off. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white to-transparent" />
    </div>
  );
}

export default LookPreview;
