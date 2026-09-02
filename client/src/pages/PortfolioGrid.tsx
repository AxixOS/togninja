import React, { useState } from 'react';

export interface PortfolioGridImage {
  id?: string | number;
  url: string;
  alt?: string | null;
  title?: string | null;
}

/**
 * The studio's work, and nothing else on the page.
 *
 * WHY THIS EXISTS ALONGSIDE PortfolioPage. That page groups images under six categories
 * hardcoded in its source — family, newborn, maternity, wedding, business, event — each
 * linking to /fotoshootings. That is the ORIGIN studio's taxonomy, in their language, and a
 * photograph the crawl lifted off a Brighton wedding photographer's site belongs to none of
 * it. Worse, an image filed under any other category rendered nowhere at all, so forty
 * crawled photographs would have been invisible on the very page meant to show them.
 *
 * THE LAYOUT. Columns, not a grid of equal cells. A CSS grid with fixed row heights crops
 * every photograph to the same shape, which is the one thing a photographer will not forgive:
 * a portrait becomes a square, a panorama becomes a postage stamp. `columns` lets each image
 * keep its own aspect ratio and lets the column heights fall where they will — the newspaper
 * arrangement that gallery and agency sites use, and the reason it reads as considered rather
 * than as a contact sheet.
 *
 * No cards, no shadows, no rounded corners, no hover-scale. Every one of those is chrome
 * competing with the picture, and at forty pictures the chrome is what you see. The only
 * motion is a slight dim on hover, which reads as a link rather than as an animation.
 *
 * Gutters are tight and equal to the page's outer margin, so the block sits as one object.
 */
export default function PortfolioGrid({ images }: { images: PortfolioGridImage[] }) {
  // A lightbox is the one interaction worth having here: a grid is for scanning, and the
  // moment somebody stops scanning they want the picture bigger.
  const [open, setOpen] = useState<PortfolioGridImage | null>(null);

  // The comment below promises Escape closes the lightbox, so it has to. A dialog dismissable
  // only by clicking its backdrop is a trap for anyone navigating by keyboard.
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  if (!images.length) return null;

  return (
    <>
      <div className="mx-auto max-w-[1600px] px-3 sm:px-4">
        {/*
          Column COUNT rises with width rather than image size shrinking: three on a laptop,
          four on a wide display, one on a phone where a photograph deserves the full width.
          `break-inside-avoid` is what stops a picture being sliced across the column break —
          without it the layout looks broken on exactly the tall images that matter most.
        */}
        <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-3 sm:gap-4 [column-fill:_balance]">
          {images.map((img, i) => (
            <button
              key={img.id ?? img.url ?? i}
              type="button"
              onClick={() => setOpen(img)}
              className="mb-3 sm:mb-4 block w-full break-inside-avoid overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900"
              aria-label={img.alt || img.title || 'View photograph'}
            >
              <img
                src={img.url}
                alt={img.alt || img.title || ''}
                // Native lazy loading: forty full-size photographs on one page is a lot of
                // bytes, and the ones below the fold can wait until they are scrolled to.
                loading={i < 6 ? 'eager' : 'lazy'}
                decoding="async"
                className="w-full h-auto align-middle transition-opacity duration-200 hover:opacity-85"
              />
            </button>
          ))}
        </div>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setOpen(null)}
          role="dialog"
          aria-modal="true"
        >
          {/* Escape closes it too — a lightbox that can only be dismissed by clicking the
              backdrop is a trap for anyone navigating by keyboard. */}
          <img
            src={open.url}
            alt={open.alt || open.title || ''}
            className="max-h-[90vh] max-w-[92vw] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            type="button"
            onClick={() => setOpen(null)}
            aria-label="Close"
            className="absolute top-4 right-5 text-white/80 hover:text-white text-3xl leading-none"
          >
            ×
          </button>
        </div>
      )}
    </>
  );
}
