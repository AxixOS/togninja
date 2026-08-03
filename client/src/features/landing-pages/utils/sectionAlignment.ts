// Maps a section alignment ('left' | 'center' | 'right') to the Tailwind
// classes the public section components use. Kept in one place so every
// section aligns consistently.

export type SectionAlign = 'left' | 'center' | 'right';

export function normalizeAlign(a: unknown): SectionAlign {
  return a === 'left' || a === 'right' ? a : 'center';
}

/** text-align for headings/paragraphs */
export function alignText(a: SectionAlign): string {
  return a === 'left' ? 'text-left' : a === 'right' ? 'text-right' : 'text-center';
}

/** horizontal placement of a centred max-width block */
export function alignBlock(a: SectionAlign): string {
  return a === 'left' ? 'mr-auto ml-0' : a === 'right' ? 'ml-auto mr-0' : 'mx-auto';
}

/** cross-axis alignment for flex columns/rows of items */
export function alignItems(a: SectionAlign): string {
  return a === 'left' ? 'items-start' : a === 'right' ? 'items-end' : 'items-center';
}

/** main-axis alignment for a flex row (e.g. a CTA button row) */
export function alignJustify(a: SectionAlign): string {
  return a === 'left' ? 'justify-start' : a === 'right' ? 'justify-end' : 'justify-center';
}
