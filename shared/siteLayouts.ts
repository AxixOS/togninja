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
