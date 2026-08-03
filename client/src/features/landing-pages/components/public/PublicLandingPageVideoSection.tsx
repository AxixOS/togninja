// PublicLandingPageVideoSection — an embedded video placed in the page body
// (as opposed to the hero background). YouTube/Vimeo render as a responsive
// 16:9 iframe; a direct .mp4 uses a <video> player with controls.

import { PublicLandingPageSectionWrapper } from './PublicLandingPageSectionWrapper';

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
  if (!videoUrl) return null;
  const embed = getEmbedUrl(videoUrl);

  return (
    <PublicLandingPageSectionWrapper bg="white">
      <div className="max-w-4xl mx-auto">
        {heading && (
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 text-center mb-8">{heading}</h2>
        )}
        <div className="relative w-full overflow-hidden rounded-2xl shadow-lg bg-black" style={{ paddingTop: '56.25%' }}>
          {embed ? (
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
          )}
        </div>
      </div>
    </PublicLandingPageSectionWrapper>
  );
}
