// Default voucher thumbnails by category, so voucher cards and the admin product
// list always show a photo even before a studio uploads its own — no blank box icons.
// Reliable external placeholders (picsum); a studio replaces them with real images.

const DEFAULTS: Record<string, string> = {
  newborn: 'https://picsum.photos/seed/tog-newborn/600/400',
  baby: 'https://picsum.photos/seed/tog-baby/600/400',
  maternity: 'https://picsum.photos/seed/tog-maternity/600/400',
  family: 'https://picsum.photos/seed/tog-family/600/400',
  business: 'https://picsum.photos/seed/tog-business/600/400',
  portrait: 'https://picsum.photos/seed/tog-portrait/600/400',
  hochzeit: 'https://picsum.photos/seed/tog-wedding/600/400',
  wedding: 'https://picsum.photos/seed/tog-wedding/600/400',
  event: 'https://picsum.photos/seed/tog-event/600/400',
};
const GENERIC = 'https://picsum.photos/seed/tog-photography/600/400';

export function defaultVoucherImage(category?: string | null): string {
  const c = (category || '').toString().toLowerCase();
  for (const key of Object.keys(DEFAULTS)) if (c.includes(key)) return DEFAULTS[key];
  return GENERIC;
}

interface AnyProduct {
  thumbnailUrl?: string | null; thumbnail_url?: string | null;
  imageUrl?: string | null; image_url?: string | null;
  category?: string | null; sessionType?: string | null; session_type?: string | null;
}

/** The best image to show for a voucher product, falling back to a category default. */
export function voucherThumbnail(p: AnyProduct): string {
  return (
    p.thumbnailUrl || p.thumbnail_url || p.imageUrl || p.image_url ||
    defaultVoucherImage(p.category || p.sessionType || p.session_type || '')
  );
}
