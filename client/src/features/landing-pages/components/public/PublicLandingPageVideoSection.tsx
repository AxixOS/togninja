// PublicLandingPageVideoSection — an embedded video placed in the page body
// (as opposed to the hero background). YouTube/Vimeo render as a responsive
// 16:9 iframe; a direct .mp4 uses a <video> player with controls.

import { PublicLandingPageSectionWrapper } from './PublicLandingPageSectionWrapper';
import { useIsEditorial } from '@/components/public/SiteLayoutContext';

interface Props {
  videoUrl: string;
  heading?: string;
}

function getEmbedUrl(url: string): string | null {
  if (!url) return null;
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|v\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const vm = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vm) return `https://player.vimeo.com/video/${vm[1]}`;
  return null;
}

export function PublicLandingPageVideoSection({ videoUrl, heading }: Props) {
  const editorial = useIsEditorial();
  if (!videoUrl) return null;
  const embed = getEmbedUrl(videoUrl);

  const player = embed ? (
    <iframe
      className="absolute inset-0 h-full w-full"
      src={embed}
      title={heading || 'Video'}
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowFullScreen
      loading="lazy"
    />
  ) : (
    <video
      className="absolute inset-0 h-full w-full object-cover"
      src={videoUrl}
      controls
      playsInline
      preload="metadata"
    />
  );

  // ── Editorial ────────────────────────────────────────────────────────────────
  //
  // The classic treatment puts the video in a rounded, shadowed box in a 4xl column — a
  // player sitting on a page. A photographer's film should be given the width instead: it
  // runs wide with square corners and no shadow, so it reads as part of the page rather than
  // as an embed pasted into it, and the heading sits above it in the section's own left rail.
  //
  // The 16:9 padding box and both player paths are unchanged, so nothing about playback,
  // fullscreen or lazy loading differs — only the frame around it.
  if (editorial) {
    return (
      <PublicLandingPageSectionWrapper bg="white">
        <div className="max-w-6xl mx-auto">
          {heading && (
            // No size utility: the theme's h2 rule governs size and weight.
            <h2 className="mb-10 tracking-tight" style={{ color: 'var(--tn-heading)' }}>
              {heading}
            </h2>
          )}
          <div
            className="relative w-full overflow-hidden bg-black"
            style={{ paddingTop: '56.25%' }}
          >
            {player}
          </div>
        </div>
      </PublicLandingPageSectionWrapper>
    );
  }

  // ── Classic ──────────────────────────────────────────────────────────────────
  return (
    <PublicLandingPageSectionWrapper bg="white">
      <div className="max-w-4xl mx-auto">
        {heading && (
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 text-center mb-8">{heading}</h2>
        )}
        <div className="relative w-full overflow-hidden rounded-2xl shadow-lg bg-black" style={{ paddingTop: '56.25%' }}>
          {player}
        </div>
      </div>
    </PublicLandingPageSectionWrapper>
  );
}
