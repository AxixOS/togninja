import { PublicLandingPageSectionWrapper } from './PublicLandingPageSectionWrapper';
import { useIsEditorial } from '@/components/public/SiteLayoutContext';

/**
 * A strip of the studio's own photographs.
 *
 * WHY IT EXISTS. The crawl records forty photographs from a studio's existing website and the
 * generated pages used twelve of them — a hero and two content images each. The other
 * twenty-eight had nowhere to land, on a product sold to photographers, whose pages were
 * consequently three pictures and six hundred words of type.
 *
 * NOT A LIGHTBOX, NOT A CAROUSEL. This is a band of pictures on a marketing page, not the
 * client gallery — that is a separate product surface with its own delivery, ordering and
 * download rules. Anything interactive here would imply it is that, and a visitor who clicks
 * expecting a gallery and gets nothing is worse served than one who was never invited to.
 *
 * NO HEADING BY DEFAULT. A row of a photographer's own work does not need to be introduced as
 * "Our work" — the pictures say it. A caller can pass one where the page reads better with it.
 */
export interface GalleryImage {
  url: string;
  alt: string | null;
}

interface Props {
  images: GalleryImage[];
  /** Optional lead-in. Most pages read better without one. */
  headline?: string;
}

export function PublicLandingPageGallerySection({ images, headline }: Props) {
  const editorial = useIsEditorial();
  const shown = images.filter((i) => i?.url).slice(0, 6);
  if (!shown.length) return null;

  // Two, three or six across depending on how many there are, so a row is never left with one
  // orphan photograph sitting beside a gap. Four images read far better as 2x2 than as 3+1.
  const cols =
    shown.length <= 2 ? 'sm:grid-cols-2'
    : shown.length === 4 ? 'grid-cols-2'
    : shown.length <= 3 ? 'sm:grid-cols-3'
    : 'grid-cols-2 sm:grid-cols-3';

  // ── Editorial ──────────────────────────────────────────────────────────────
  //
  // The layout describes itself as "photographs run edge to edge and carry the page", so here
  // they are given the most room of anything on it: a wider measure than the prose, a tighter
  // gap so the set reads as one block, and square corners. No shadows — the card treatment
  // belongs to classic and is exactly what editorial exists to avoid.
  if (editorial) {
    return (
      <PublicLandingPageSectionWrapper bg="white">
        {headline && (
          <h2 className="max-w-5xl mx-auto mb-10 tracking-tight" style={{ color: 'var(--tn-heading)' }}>
            {headline}
          </h2>
        )}
        <div className={`max-w-6xl mx-auto grid gap-2 sm:gap-3 ${cols}`}>
          {shown.map((img, i) => (
            <img
              key={img.url}
              src={img.url}
              alt={img.alt || ''}
              loading="lazy"
              // The first is above the fold on a short page often enough to be worth the hint;
              // the rest are decidedly not.
              decoding={i === 0 ? 'sync' : 'async'}
              className="w-full aspect-[4/5] object-cover"
            />
          ))}
        </div>
      </PublicLandingPageSectionWrapper>
    );
  }

  // ── Classic ────────────────────────────────────────────────────────────────
  return (
    <PublicLandingPageSectionWrapper bg="gray">
      <div className="max-w-6xl mx-auto">
        {headline && (
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 text-center mb-10">{headline}</h2>
        )}
        <div className={`grid gap-4 ${cols}`}>
          {shown.map((img) => (
            <img
              key={img.url}
              src={img.url}
              alt={img.alt || ''}
              loading="lazy"
              className="w-full aspect-[4/5] object-cover rounded-2xl shadow-sm"
            />
          ))}
        </div>
      </div>
    </PublicLandingPageSectionWrapper>
  );
}
