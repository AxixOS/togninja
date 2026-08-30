/**
 * How the public site is COMPOSED, as opposed to how it is coloured.
 *
 * Theme presets (shared/themePresets.ts) carry colours, fonts and radius. Every one of them
 * renders through the same bones: a centred headline, three cards in a row, an image inside a
 * rounded box, the same rhythm on every section. Changing preset re-skins that arrangement
 * and cannot change it — which is why eight distinct palettes still produce eight pages that
 * look like the same page.
 *
 * Layout is therefore a SEPARATE axis, not another field on the preset. A studio picks the
 * palette they want and the composition they want, and the two do not have to be bought
 * together. Atelier's bone-and-ember palette with editorial bones is a different product from
 * Atelier with the classic bones, and neither is a new colour scheme.
 *
 * Shared by client (SiteLayoutProvider) and server (site-layout resolver, starter homepage).
 */

export interface SiteLayout {
  id: string;
  name: string;
  /** One line, written for a photographer choosing between them — not for a developer. */
  description: string;
}

export const SITE_LAYOUTS: SiteLayout[] = [
  {
    id: 'classic',
    name: 'Classic',
    description:
      'Clear and conventional. Headline, then the details in tidy rows — easy to scan, ' +
      'and it works with as few as one or two photographs.',
  },
  {
    id: 'editorial',
    name: 'Editorial',
    description:
      'Photographs run edge to edge and carry the page, with type set large and quiet ' +
      'over generous space. Best when you have a strong set of images to show.',
  },
];

/** The arrangement every existing site already has. Changing this changes live sites. */
export const DEFAULT_LAYOUT_ID = 'classic';

export function getSiteLayout(id?: string | null): SiteLayout {
  const found = SITE_LAYOUTS.find((l) => l.id === String(id || '').trim());
  return found || SITE_LAYOUTS.find((l) => l.id === DEFAULT_LAYOUT_ID)!;
}

/** Narrow an untrusted value to a known id, for anything that reaches the database. */
export function normalizeLayoutId(id?: string | null): string {
  return getSiteLayout(id).id;
}

/**
 * Which ground a section band actually paints, once the layout has had its say.
 *
 * Classic alternates white and a tinted band — that stripe is what gives a classic page its
 * sectioned, tray-stacked look. Editorial has no bands at all: `gray` resolves to the same
 * raised ground as `white`, and the rhythm comes from space instead.
 *
 * THE RULE LIVES HERE because more than one thing needs to know it and they must not disagree.
 * PublicLandingPageSectionWrapper paints the real page from it; the setup thumbnail draws a
 * miniature from it. Left in the wrapper, the thumbnail would have to copy the claim, and a
 * copied claim is the drift this codebase keeps finding — the seam between a striped classic
 * page and a continuous editorial one is one of the two things a studio is choosing between,
 * so a thumbnail that got it backwards would be actively misleading rather than merely rough.
 *
 * Returns a SEMANTIC ground, not a class or a colour: the wrapper speaks Tailwind and the
 * thumbnail speaks custom properties, and neither should have to know the other's idiom.
 */
export type SectionBg = 'white' | 'gray' | 'purple' | 'gradient';
export type SectionGround = 'raised' | 'surface' | 'gradient';

export function sectionGround(layoutId: string | null | undefined, bg: SectionBg): SectionGround {
  if (bg === 'gradient') return 'gradient';
  // The one layout-dependent case, and the whole reason this function exists.
  if (bg === 'gray') return layoutId === 'editorial' ? 'raised' : 'surface';
  // purple is a deliberate emphasis band and stays tinted in both arrangements.
  if (bg === 'purple') return 'surface';
  return 'raised';
}
