import { getThemePreset } from '../../../../../shared/themePresets';
import { sectionGround } from '../../../../../shared/siteLayouts';

/**
 * A ~200x96 chip showing one arrangement painted in one palette.
 *
 * WHY IT EXISTS. The look step asks two questions on two rows of cards. The arrangement cards
 * were grey wireframes with no colour at all; the colour cards showed real tokens and a line of
 * type but nothing about the arrangement. Neither showed both axes, so a studio judged eighteen
 * combinations from cards that each answered half the question — and could only see a real one
 * by finishing setup.
 *
 * Each card now paints the axis it is NOT asking about from the current selection: an
 * arrangement card shows its layout in the chosen palette, a colour card shows its palette in
 * the chosen arrangement. Whichever row you are looking at, the other choice is already applied.
 *
 * WHAT IT IS AND IS NOT. It is a DIAGRAM, and the full LookPreview below the pickers — which
 * renders the actual section components — remains the ground truth. That distinction is the
 * whole reason this is honest: it is not pretending to be a render, it is a 200px chip that
 * would be illegible if it tried.
 *
 * What it refuses to invent is COLOUR. Every fill is a --tn-* variable, so a preset retune
 * moves the chip with it and no palette is approximated by hand. The one structural claim it
 * makes — that classic stripes its bands and editorial runs continuous — comes from
 * sectionGround() in shared/siteLayouts, the same call PublicLandingPageSectionWrapper makes to
 * paint the real page. That seam is one of the two things a studio is actually choosing
 * between, so getting it backwards would mislead rather than merely simplify.
 *
 * NOT USED: preset.radius. All ten presets define it and nothing on the public site reads it —
 * classic's corners are hardcoded rounded, editorial's explicitly square. A chip whose corners
 * varied by palette would show a difference the real page does not have. Corners are a property
 * of the arrangement here, exactly as they are there.
 */
export function LookThumbnail({
  themeId,
  layoutId,
  className = '',
}: {
  themeId: string;
  layoutId: string;
  className?: string;
}) {
  const t = getThemePreset(themeId);
  const c = t.colors;
  const editorial = layoutId === 'editorial';

  // Derived exactly as ThemeScope derives them, for the seven presets that leave them unset.
  const raised = c.raised || `color-mix(in srgb, ${c.bg} 88%, white)`;
  const border = c.border || `color-mix(in srgb, ${c.heading} 14%, transparent)`;
  const onPrimary = c.onPrimary || '#ffffff';

  const GROUND: Record<string, string> = { raised, surface: c.surface, gradient: c.primary };
  // The content band beneath the hero is bg="gray" on both arrangements — and resolves
  // differently, which is the seam this chip is here to show.
  const bandBg = GROUND[sectionGround(layoutId, 'gray')];

  return (
    <div
      aria-hidden="true"
      className={`w-full overflow-hidden rounded-md ${className}`}
      style={{ aspectRatio: '25 / 12', background: c.bg, border: `1px solid ${border}` }}
    >
      {/* ── Hero ────────────────────────────────────────────────────────────
          With no photograph — which is the state during setup — classic's hero is a filled
          brand band with reversed type, and editorial's is a quiet surface panel with heading
          type. That is the loudest honest difference between them and it puts the brand colour
          on screen where the real page uses it, rather than as a swatch standing in for it. */}
      <div
        className={`flex h-[52%] flex-col justify-center gap-[3px] px-2.5 ${editorial ? 'items-start' : 'items-center'}`}
        style={{ background: editorial ? c.surface : c.primary }}
      >
        {editorial && (
          <div className="h-[2px] w-3 rounded-full" style={{ background: c.muted }} />
        )}
        {/* One identical word across every card, in the preset's own heading face, so the eye
            compares paint and type rather than reading nine different names. The name lives on
            the label strip outside the chip. */}
        <div
          className="leading-none"
          style={{
            color: editorial ? c.heading : onPrimary,
            fontFamily: t.fonts.heading,
            fontSize: editorial ? '13px' : '11px',
            fontWeight: editorial ? 500 : 700,
            letterSpacing: editorial ? '-0.02em' : '-0.01em',
          }}
        >
          Photographs
        </div>
        <div
          className={`flex items-center gap-1.5 ${editorial ? '' : 'justify-center'}`}
          style={{ width: editorial ? 'auto' : '100%' }}
        >
          <span
            className="rounded-full"
            style={{
              background: editorial ? c.primary : raised,
              color: editorial ? onPrimary : c.primary,
              fontSize: '6px',
              padding: '2px 6px',
              fontWeight: 600,
            }}
          >
            Book now
          </span>
        </div>
      </div>

      {/* ── Content band ────────────────────────────────────────────────────
          Classic: three bordered, lifted cards on a tinted band — a hard seam above them.
          Editorial: full-width rules on a continuous ground, nothing boxed, square. */}
      <div className="flex h-[48%] items-center px-2 py-1.5" style={{ background: bandBg }}>
        {editorial ? (
          <div className="w-full">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-full"
                style={{
                  height: '1px',
                  marginTop: i === 0 ? 0 : '6px',
                  background: border,
                }}
              />
            ))}
          </div>
        ) : (
          <div className="flex w-full gap-1.5">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="flex-1 rounded-[3px] px-1 py-1"
                style={{ background: raised, border: `1px solid ${border}`, boxShadow: '0 1px 2px rgba(0,0,0,0.06)' }}
              >
                <div style={{ height: '2px', width: '70%', background: c.heading, opacity: 0.55 }} />
                <div style={{ height: '2px', width: '45%', marginTop: '3px', background: c.text, opacity: 0.3 }} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default LookThumbnail;
