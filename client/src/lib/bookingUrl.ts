// The one place that knows what a booking link looks like.
//
// This exists because the same mistake has already shipped twice in this repo, both times
// on a link a studio hands to a client:
//
//   the calendar page copied /schedule/<slug> to the clipboard while the only registered
//   route was /book/:slug, so every booking link sent from the page people actually use
//   landed on the 404 handler — and the Schedulers page, which built the same link
//   correctly, is precisely why nobody noticed;
//
//   the gallery admin built /gallery/<uuid> and a slug re-derived in the browser with a
//   different algorithm than the server's, so accented titles 404'd.
//
// The booking path was then written inline in seven places across two files. Nothing
// compares them, and scripts/ui-verify-links.mjs cannot: it builds its route set from
// first path segments, so /book/:slug being registered makes any /book/... string look
// fine to it. The next person asked for /booking instead of /book updates one file.
//
// So: one function, one literal, and a guard that asserts nobody builds it by hand.
import { SITE } from '../config/site';

/** The path App.tsx registers. Changing it here changes every link in the product. */
const BOOKING_PATH = '/book';

/**
 * The page listing every session type a client can book.
 *
 * `absolute` uses the studio's own domain, which is what belongs in an email signature or
 * on their website. Without it the current origin is used — right for a link the studio is
 * about to click themselves, and the only option before they have set a public URL.
 */
export function bookingIndexUrl(opts?: { absolute?: boolean }): string {
  const base = opts?.absolute && SITE.url ? SITE.url : window.location.origin;
  return `${base.replace(/\/+$/, '')}${BOOKING_PATH}`;
}

/**
 * The page for one session type, or null when it has no slug yet.
 *
 * Null rather than a guess, for the same reason galleryUrl.ts returns null: an unsaved
 * scheduler has no address, and inventing one produces a link that looks copyable and is
 * dead. Callers should disable the control instead of pasting a broken URL.
 */
export function bookingUrl(slug?: string | null, opts?: { absolute?: boolean }): string | null {
  const s = String(slug || '').trim();
  if (!s) return null;
  return `${bookingIndexUrl(opts)}/${s}`;
}

/** The same address without the scheme, for showing inside a fake browser chrome. */
export function bookingDisplayUrl(slug?: string | null): string {
  const url = slug ? bookingUrl(slug, { absolute: true }) : bookingIndexUrl({ absolute: true });
  return url ? url.replace(/^https?:\/\//, '') : 'not published yet';
}
