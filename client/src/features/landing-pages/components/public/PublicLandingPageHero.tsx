// PublicLandingPageHero — Phase 4

import { PublicLandingPageCtaButton } from './PublicLandingPageCtaButton';
import { useIsEditorial } from '@/components/public/SiteLayoutContext';

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
  const editorial = useIsEditorial();

  // ── Editorial ──────────────────────────────────────────────────────────────
  //
  // The classic hero centres everything over a flat dark wash: eyebrow, headline, sub and
  // button stacked down the middle. It is legible, and it is what every template does.
  //
  // This one gives the photograph the viewport and sets the type against the bottom left,
  // where a magazine would put it, so the first thing the page says is the picture and the
  // words arrive second. The scrim becomes a gradient weighted to the bottom rather than a
  // flat 55% over the whole frame — that wash is what was flattening every studio image.
  //
  // WITH NO PHOTOGRAPH it does not pretend. It drops to a shorter, quiet type-only panel on
  // the theme surface, in the theme heading colour. The light text is only ever used when
  // there is media behind it, so this cannot render white on white — which is the failure
  // mode that matters, because studios onboard with empty sites.
  if (editorial) {
    return (
      <section
        className={[
          'relative overflow-hidden flex items-end',
          hasMedia ? 'min-h-[78vh] md:min-h-[86vh]' : 'min-h-[52vh]',
        ].join(' ')}
        style={hasMedia ? undefined : { background: 'var(--tn-surface)' }}
      >
        {bgVideo ? (
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

        {/* Weighted to the bottom, where the type is, so the top two thirds of the
            photograph are left alone. Contrast where the words actually sit is equivalent
            to the flat scrim this replaces. */}
        {hasMedia && (
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/35 to-black/5" />
        )}

        <div className="relative w-full max-w-6xl mx-auto px-6 sm:px-8 pt-24 pb-14 md:pb-20">
          <div className="max-w-2xl">
            {data.eyebrow && (
              <p
                className="text-xs uppercase tracking-[0.2em] font-medium mb-5"
                style={{ color: hasMedia ? 'rgba(255,255,255,0.85)' : 'var(--tn-muted)' }}
              >
                {data.eyebrow}
              </p>
            )}

            {/* Larger and lighter than the classic hero. An editorial headline is set, not
                shouted; extrabold at this size reads as an advertisement. */}
            <h1
              className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-semibold leading-[1.05] tracking-tight"
              // No fontFamily here: .tn-theme h1 already carries the preset heading face.
              style={{
                color: hasMedia ? '#ffffff' : 'var(--tn-heading)',
                textWrap: 'balance',
              }}
            >
              {data.headline}
            </h1>

            {data.subheadline && (
              <p
                className="mt-6 max-w-xl text-base md:text-lg leading-relaxed"
                style={{ color: hasMedia ? 'rgba(255,255,255,0.9)' : 'var(--tn-text)' }}
              >
                {data.subheadline}
              </p>
            )}

            <div className="mt-9">
              <PublicLandingPageCtaButton
                href={ctaHref}
                label={data.ctaText || ctaText}
                pageId={pageId}
                pageSlug={pageSlug}
                placement="hero"
                isPreview={isPreview}
                variant={hasMedia ? 'primaryInverted' : 'primary'}
              />
            </div>

            {data.badgeText && (
              <p
                className="mt-5 text-sm"
                style={{ color: hasMedia ? 'rgba(255,255,255,0.7)' : 'var(--tn-muted)' }}
              >
                {data.badgeText}
              </p>
            )}
          </div>
        </div>
      </section>
    );
  }

  // ── Classic ────────────────────────────────────────────────────────────────
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
