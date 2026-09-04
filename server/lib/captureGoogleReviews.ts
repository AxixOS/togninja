// The studio's real Google rating, found while their key still pays for it.
//
// WHY THIS EXISTS. placesProvider.ts lends the PLATFORM's Places key only while onboarding is
// unfinished, on the reasoning that "showing that on the FIRST PREVIEW, before they have
// handed over a single credential, is the moment the product proves itself". That was built,
// deployed and correct — and it never once fired, because nothing asked.
//
// The rating renders on the public site (PublicLandingPageGoogleRating), and a studio in the
// wizard is not on the public site. Worse, the wizard's finish handler posts
// /api/setup/complete BEFORE it offers to show them their new website, so by the moment they
// first click through to look, creative_setup_complete is already true and the platform key
// has stopped answering. There was no reachable moment in the whole flow where the preview
// could have been paid for. Confirmed live on 4 Sep 2026: the key resolves (the endpoint
// reports needs:'own-key', which only the platform branch produces) and had spent nothing.
//
// So the pipeline asks, once, on the studio's behalf, while the key is still lent.
//
// THE SECOND REASON, which matters even when a studio has no reviews. A Google Maps share link
// carries a KNOWLEDGE-GRAPH id (/g/...), not a Places API id, and that is what the wizard
// stores from the link they paste. googleReviewsStatus() detects the wrong shape and resolves
// a real one — but only on a request that HAS a key, and after onboarding there is none until
// the studio buys in. An instance therefore finished setup holding an identifier that could
// never be used and could never be repaired. Asking here, while a key exists, is what makes
// that self-heal. Observed on this instance: "/g/11y26zzh_n", stored and stuck.

export interface CaptureReviewsResult {
  ok: boolean;
  rating?: number;
  count?: number;
  /** Which account paid, for the record. Never a key or any part of one. */
  source?: 'studio' | 'platform';
  reason?: string;
}

/**
 * Resolve the studio's Places id if needed, and read their rating.
 *
 * Best effort from top to bottom. No key, no listing, an ambiguous match or a studio with no
 * reviews yet are all ordinary outcomes, not errors: they mean no rating this time and nothing
 * shown, which is exactly what happened before this existed.
 *
 * `stillCurrent` is the reset fence the rest of the pipeline uses. This writes a resolved place
 * id to studio_integrations, and a reset landing mid-run must not leave the previous studio's
 * listing attached to the new one.
 */
export async function captureGoogleReviews(
  opts: { stillCurrent?: () => Promise<boolean> } = {},
): Promise<CaptureReviewsResult> {
  try {
    if (opts.stillCurrent && !(await opts.stillCurrent())) {
      return { ok: false, reason: 'the instance was reset' };
    }

    // Which account is about to pay, recorded before spending it. placesKeyInUse is the gated
    // resolver — during onboarding it lends the platform's key, and a studio who has already
    // set their own is served by theirs instead, in both cases without this file choosing.
    const { placesKeyInUse } = await import('./placesProvider.js');
    const provider = await placesKeyInUse();
    if (!provider.apiKey) return { ok: false, reason: 'no Places key is available' };

    const { googleReviewsStatus, getGoogleReviews } = await import('../services/googleReviews.js');

    // This is the call that repairs a /g/ id: googleReviewsStatus asks getPlaceId, which
    // rejects an identifier the API cannot use and resolves a real one by Text Search on the
    // studio's own name and address, then stores it. Worth making even when the rating below
    // finds nothing, because it is the only chance this instance gets.
    const status = await googleReviewsStatus();
    if (!status.configured) {
      return { ok: false, source: provider.source || undefined, reason: status.needs || 'not configured' };
    }

    if (opts.stillCurrent && !(await opts.stillCurrent())) {
      return { ok: false, reason: 'the instance was reset' };
    }

    // force: the cache is process-wide and a studio being onboarded must not be handed a
    // reading taken for whoever occupied this instance before them.
    const data = await getGoogleReviews(true);
    if (!data || !data.rating || !data.count) {
      return { ok: false, source: provider.source || undefined, reason: 'no published rating' };
    }

    return {
      ok: true,
      rating: data.rating,
      count: data.count,
      source: provider.source || undefined,
    };
  } catch (e: any) {
    console.warn('[reviews-capture] failed:', e?.message || e);
    return { ok: false, reason: String(e?.message || e).slice(0, 200) };
  }
}

/** The line the studio reads in the wizard. Exported so the guard can hold it to one shape. */
export function reviewsFinding(r: CaptureReviewsResult): string | null {
  if (!r.ok || !r.rating || !r.count) return null;
  return `Found your Google rating — ${r.rating} from ${r.count} review${r.count === 1 ? '' : 's'}`;
}
