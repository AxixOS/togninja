// PublicLandingPageHero — Phase 4

import { PublicLandingPageCtaButton } from './PublicLandingPageCtaButton';

interface PublicLandingPageHeroProps {
  data: {
    headline: string;
    subheadline?: string;
    ctaText?: string;
    eyebrow?: string;
    badgeText?: string;
  };
  imageUrl?: string | null;
  videoUrl?: string | null;
  /** When false, the hero shows the IMAGE and the video is rendered lower in
   *  the page as its own section instead of the hero background. Default true. */
  videoAsBackground?: boolean;
  /** JSON {x,y,zoom} from the editor's drag-to-fit tool. */
  imagePosition?: string | null;
  ctaHref: string;
  ctaText: string;
  pageId: string;
  pageSlug: string;
  isPreview: boolean;
}

// Parse the editor's stored crop; defaults favour the upper part of the photo
// (hero images are usually people — centre-cropping cut heads off).
function parseHeroPosition(raw?: string | null): { x: number; y: number; zoom: number } {
  try {
    const v = raw ? JSON.parse(raw) : null;
    return {
      x: Math.min(100, Math.max(0, Number(v?.x ?? 50))),
      y: Math.min(100, Math.max(0, Number(v?.y ?? 25))),
      zoom: Math.min(2, Math.max(1, Number(v?.zoom ?? 1))),
    };
  } catch {
    return { x: 50, y: 25, zoom: 1 };
  }
}

// YouTube/Vimeo page URLs can't play in a <video> tag. Turn them into a
// muted, looping, controls-free background embed. Returns null for anything
// else (e.g. a direct .mp4), which then uses the <video> path.
function getVideoEmbedUrl(url: string): string | null {
  if (!url) return null;
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|v\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
  if (yt) {
    const id = yt[1];
    return `https://www.youtube.com/embed/${id}?autoplay=1&mute=1&loop=1&playlist=${id}&controls=0&showinfo=0&modestbranding=1&rel=0&playsinline=1`;
  }
  const vm = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vm) return `https://player.vimeo.com/video/${vm[1]}?background=1&autoplay=1&loop=1&muted=1`;
  return null;
}

export function PublicLandingPageHero({
  data,
  imageUrl,
  videoUrl,
  videoAsBackground = true,
  imagePosition,
  ctaHref,
  ctaText,
  pageId,
  pageSlug,
  isPreview,
}: PublicLandingPageHeroProps) {
  // Only treat the video as the hero background when placement allows it;
  // otherwise the hero uses the image and the video renders lower down.
  const bgVideo = videoAsBackground ? videoUrl : null;
  const hasMedia = !!(imageUrl || bgVideo);
  const pos = parseHeroPosition(imagePosition);
  return (
    <section className="relative bg-gradient-to-br from-purple-700 via-purple-600 to-pink-600 text-white overflow-hidden">
      {/* Optional background media (video preferred over image), with a dark
          overlay so the headline/CTA stay readable. */}
      {bgVideo ? (
        // YouTube/Vimeo links can't play in a <video> tag — render them as a
        // muted, looping background iframe; direct files (.mp4) use <video>.
        (() => {
          const embed = getVideoEmbedUrl(bgVideo);
          return embed ? (
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <iframe
                className="absolute inset-0 w-full h-full"
                src={embed}
                title=""
                allow="autoplay; encrypted-media; picture-in-picture"
                loading="lazy"
              />
            </div>
          ) : (
            <video
              className="absolute inset-0 w-full h-full object-cover"
              src={bgVideo}
              autoPlay
              muted
              loop
              playsInline
            />
          );
        })()
      ) : imageUrl ? (
        // Crop set by the editor's drag-to-fit tool (object-position + zoom).
        <img
          className="absolute inset-0 w-full h-full object-cover"
          style={{
            objectPosition: `${pos.x}% ${pos.y}%`,
            transform: pos.zoom > 1 ? `scale(${pos.zoom})` : undefined,
            transformOrigin: `${pos.x}% ${pos.y}%`,
          }}
          src={imageUrl}
          alt=""
        />
      ) : null}
      {hasMedia && <div className="absolute inset-0 bg-black/55" />}
      <div className="relative max-w-5xl mx-auto px-6 py-20 md:py-28 text-center">
        {data.eyebrow && (
          <p className="text-purple-200 text-sm uppercase tracking-wider mb-4 font-medium">
            {data.eyebrow}
          </p>
        )}
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold mb-6 leading-tight">
          {data.headline}
        </h1>
        {data.subheadline && (
          <p className="text-lg md:text-xl text-white/90 max-w-2xl mx-auto mb-8 leading-relaxed">
            {data.subheadline}
          </p>
        )}
        <PublicLandingPageCtaButton
          href={ctaHref}
          label={data.ctaText || ctaText}
          pageId={pageId}
          pageSlug={pageSlug}
          placement="hero"
          isPreview={isPreview}
          variant="primaryInverted"
        />
        {data.badgeText && (
          <p className="mt-4 text-sm text-white/70">{data.badgeText}</p>
        )}
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white to-transparent" />
    </section>
  );
}
