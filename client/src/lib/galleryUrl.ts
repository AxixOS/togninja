// The one place that knows what a gallery's public address is.
//
// There were three different answers in the admin, and only one of them was right:
//
//   GalleryDetailPage  `${origin}/gallery/${id}`            the raw UUID
//   AdvancedGalleryForm `${origin}/gallery/${slug ?? title.toLowerCase()...}`
//   the preview pane   `${SITE.url}/galleries/${id}`        plural, and not a route
//
// The UUID one "works" only because GET /api/galleries/:slug falls back to an id lookup
// when the slug misses — so the studio hands a client a link with a database key in it.
// The plural one is decorative, and points at a path App.tsx does not route.
//
// The wizard's fallback is the one that actually breaks. It re-derives the slug in the
// browser with `title.toLowerCase().replace(/[^\w\s]/gi, '').replace(/\s+/g, '-')`, while
// the server derives it with NFD accent-stripping, `[^a-z0-9]+ -> -`, trimmed to 100
// characters (server/routes.ts, the create route). For "Müller & Söhne — Hochzeit" the
// browser produces `müller--söhne--hochzeit` and the server stored `muller-sohne-hochzeit`.
// The copied link 404s, and it does so only for the titles most likely to contain an
// accent — which is to say, in exactly the markets this product is sold into.
//
// A slug is a value the server assigns. Read it back; never recompute it.
import { SITE } from '../config/site';

/** The public route App.tsx registers for a client gallery. */
const GALLERY_PATH = '/gallery';

/**
 * The address to give a client, or null when the gallery has no slug yet.
 *
 * Null rather than a guess: an unsaved gallery has no address, and inventing one produces
 * a link that looks copyable and is dead. Callers should disable the control instead.
 */
export function galleryPublicUrl(slug?: string | null, opts?: { absolute?: boolean }): string | null {
  const s = String(slug || '').trim();
  if (!s) return null;

  // SITE.url is the studio's own domain, which is what belongs in an email to a client.
  // window.location.origin is right for a link the studio is about to click themselves —
  // and is the only option when the studio has not set a public URL yet.
  const base = opts?.absolute && SITE.url ? SITE.url : window.location.origin;
  return `${base.replace(/\/+$/, '')}${GALLERY_PATH}/${s}`;
}

/** The same address without the scheme, for showing inside a fake browser chrome. */
export function galleryDisplayUrl(slug?: string | null): string {
  const url = galleryPublicUrl(slug, { absolute: true });
  return url ? url.replace(/^https?:\/\//, '') : 'not published yet';
}
