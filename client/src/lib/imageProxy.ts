// On-the-fly image resizing for the PUBLIC marketing images (portfolio,
// homepage, blog). Routes a public image URL through our OWN /api/proxy-image
// endpoint, which fetches the original from object storage server-side and
// returns a right-sized JPEG — shrinking the existing full-resolution
// back-catalogue without re-uploading anything.
//
// History: this used to wrap images.weserv.nl, but weserv's network cannot
// resolve Backblaze's eu-central-003 region ("origin unresolvable (DNS)"),
// which silently broke every homepage/portfolio photo. Our own server sits in
// the same cloud and reaches the bucket fine, so we proxy through it instead.
//
// Only use this for images that are ALREADY public. Do not proxy anything
// sensitive. Consumers should also set an onError fallback to the original URL
// (see proxiedImgProps) so a proxy hiccup never leaves a blank image.

interface ProxyOpts {
  w?: number;   // target width in CSS px (server scales, never enlarges)
  h?: number;   // accepted for API compatibility; server resizes by width
  q?: number;   // accepted for API compatibility; server uses a fixed quality
  dpr?: number; // device pixel ratio (default 2 for crisp retina)
}

// /api/proxy-image only fetches from object storage it recognises. Anything
// else is served directly (still public, just not resized) so it never breaks.
const PROXYABLE_HOST = /(\.backblazeb2\.com|\.amazonaws\.com)$/i;

export function proxyImage(url: string | null | undefined, opts: ProxyOpts = {}): string {
  if (!url) return '';
  // Only touch ABSOLUTE http(s) URLs. Relative URLs (our own endpoints),
  // data:/blob: and svg are passed through untouched.
  if (!/^https?:\/\//i.test(url)) return url;
  if (url.includes('/api/proxy-image')) return url;
  if (url.includes('images.weserv.nl')) return url; // legacy links → leave as-is
  if (/\.svg(\?|$)/i.test(url)) return url;

  let host = '';
  try { host = new URL(url).hostname; } catch { return url; }

  // A width is what makes proxying worthwhile (resize). Without one, or for a
  // host the server won't fetch, load the original directly — reliable, no
  // broken images, just not down-scaled.
  const width = opts.w ? Math.min(Math.round(opts.w * (opts.dpr ?? 2)), 2000) : 0;
  if (!width || !PROXYABLE_HOST.test(host)) return url;

  const params = new URLSearchParams();
  params.set('url', url);
  params.set('w', String(width));
  return `/api/proxy-image?${params.toString()}`;
}

/**
 * Spread onto an <img>: proxied src + an onError that falls back to the
 * original URL once, so a proxy failure degrades gracefully.
 */
export function proxiedImgProps(url: string | null | undefined, opts: ProxyOpts = {}) {
  const original = url || '';
  return {
    src: proxyImage(url, opts),
    onError: (e: React.SyntheticEvent<HTMLImageElement>) => {
      const img = e.currentTarget;
      if (original && img.src !== original) img.src = original; // one-shot fallback
    },
  };
}
