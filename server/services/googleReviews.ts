// Live Google reviews via the Places API (New).
//
// Config:
//   GOOGLE_PLACES_API_KEY   — server-side key, API-restricted to Places API (New)
//   GOOGLE_PLACES_PLACE_ID  — the studio's OWN Google Business Profile place id (required
//                             for reviews; no default — never falls back to another studio)
//
// Results are cached in-process for CACHE_TTL_MS so we make at most a couple of
// Places calls per hour regardless of site traffic. Every failure path returns
// the last good cache (or null) so the public site always renders.

const PLACE_DETAILS_URL = 'https://places.googleapis.com/v1/places';
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

export interface GoogleReview {
  author: string;
  rating: number;
  text: string;
  when: string; // "8 months ago"
}

export interface GoogleReviewsData {
  rating: number;        // e.g. 4.8
  count: number;         // total userRatingCount, e.g. 306
  mapsUri: string;       // link to the Google listing
  reviews: GoogleReview[];
}

/**
 * Per-tenant credentials: the setup wizard stores these encrypted in
 * studio_integrations, and config falls back to the host env var. This is what
 * lets each studio we sell to connect THEIR OWN Google Business Profile.
 */
async function getPlacesKey(): Promise<string> {
  try {
    const { config } = await import('../config-reader.js');
    const fromDb = await config.get('google_places_api_key');
    if (fromDb) return String(fromDb).trim();
  } catch { /* fall through to env */ }
  return (process.env.GOOGLE_PLACES_API_KEY || '').trim();
}

async function getPlaceId(): Promise<string> {
  try {
    const { config } = await import('../config-reader.js');
    const fromDb = await config.get('google_places_place_id');
    if (fromDb) return String(fromDb).trim();
  } catch { /* fall through to env */ }
  return (process.env.GOOGLE_PLACES_PLACE_ID || '').trim();
}

/**
 * Find the studio's OWN place id from the details onboarding already captured.
 *
 * Requiring a studio to paste a place id was the real blocker here: it is not shown
 * anywhere in Google's own interface, and a photographer has no way to find one. The
 * name and address are already collected in the wizard, so Text Search can resolve it —
 * meaning the studio pastes an API key and nothing else.
 *
 * Deliberately conservative: it only accepts a result when Text Search returns exactly
 * one candidate. Picking the first of several would risk showing a DIFFERENT business's
 * reviews as the studio's own, which is far worse than showing none.
 */
export async function resolvePlaceIdFromStudio(): Promise<{ placeId: string; name: string } | { error: string }> {
  const key = await getPlacesKey();
  if (!key) return { error: 'No Google Places API key is set.' };

  let name = '';
  let address = '';
  try {
    const { pool } = await import('../db.js');
    const { rows } = await pool.query(
      `SELECT business_name, studio_name, address FROM studio_configs LIMIT 1`,
    );
    name = String(rows?.[0]?.business_name || rows?.[0]?.studio_name || '').trim();
    address = String(rows?.[0]?.address || '').replace(/\s+/g, ' ').trim();
  } catch { /* handled below */ }

  if (!name) return { error: 'No studio name is set — complete the Basics step first.' };

  try {
    const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': key,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress',
      },
      body: JSON.stringify({ textQuery: [name, address].filter(Boolean).join(', '), maxResultCount: 5 }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      return { error: `Google Places returned ${res.status}. ${body.slice(0, 160)}` };
    }
    const json: any = await res.json();
    const places: any[] = Array.isArray(json?.places) ? json.places : [];
    if (!places.length) {
      return { error: `Google found no business matching "${name}"${address ? ` at ${address}` : ''}. Check the name and address in Basics.` };
    }
    if (places.length > 1) {
      const names = places.slice(0, 3).map((p) => p?.displayName?.text || p?.id).join(', ');
      return { error: `Google returned several matches (${names}). Enter the place id by hand so the wrong business's reviews are never shown.` };
    }
    const placeId = String(places[0]?.id || '').trim();
    if (!placeId) return { error: 'Google returned a match with no place id.' };
    return { placeId, name: places[0]?.displayName?.text || name };
  } catch (err: any) {
    return { error: `Could not reach Google Places: ${err?.message || err}` };
  }
}

/**
 * What is stopping live reviews, if anything. The endpoint used to answer a bare
 * `configured: false`, which told a studio owner neither what was missing nor where to
 * put it.
 */
export async function googleReviewsStatus(): Promise<{ configured: boolean; needs?: 'api-key' | 'place-id'; message?: string }> {
  const hasKey = !!(await getPlacesKey());
  if (!hasKey) {
    return {
      configured: false,
      needs: 'api-key',
      message: 'Add a Google Places API key in Settings → Technical Setup → Google to show live reviews.',
    };
  }
  const hasPlace = !!(await getPlaceId());
  if (!hasPlace) {
    return {
      configured: false,
      needs: 'place-id',
      message: 'The API key is set but this studio\'s Google Business Profile has not been identified yet. Use "Find my business" in Settings → Technical Setup → Google.',
    };
  }
  return { configured: true };
}

export async function isGoogleReviewsConfigured(): Promise<boolean> {
  // Require BOTH the key and the studio's own place id — never show another studio's reviews.
  return !!(await getPlacesKey()) && !!(await getPlaceId());
}

let cache: { at: number; data: GoogleReviewsData | null } | null = null;

/**
 * Fetch (and cache) the studio's Google rating, review count and latest review
 * texts. Returns null when unconfigured or on a hard failure with no cache.
 */
export async function getGoogleReviews(force = false): Promise<GoogleReviewsData | null> {
  const key = await getPlacesKey();
  if (!key) return null;

  const now = Date.now();
  if (!force && cache && now - cache.at < CACHE_TTL_MS) return cache.data;

  try {
    const fieldMask = [
      'rating',
      'userRatingCount',
      'googleMapsUri',
      'reviews.rating',
      'reviews.text',
      'reviews.originalText',
      'reviews.authorAttribution.displayName',
      'reviews.relativePublishTimeDescription',
    ].join(',');

    const placeId = await getPlaceId();
    // No studio place id configured → no reviews (never fall back to another studio's).
    if (!placeId) return null;
    const res = await fetch(`${PLACE_DETAILS_URL}/${encodeURIComponent(placeId)}?languageCode=en`, {
      headers: {
        'X-Goog-Api-Key': key,
        'X-Goog-FieldMask': fieldMask,
      },
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.warn(`[googleReviews] Places API ${res.status}: ${body.slice(0, 300)}`);
      return cache?.data ?? null; // serve stale on error
    }

    const json: any = await res.json();
    const reviews: GoogleReview[] = Array.isArray(json.reviews)
      ? json.reviews
          .map((r: any) => ({
            author: r?.authorAttribution?.displayName || 'Google user',
            rating: typeof r?.rating === 'number' ? r.rating : 5,
            text: (r?.text?.text || r?.originalText?.text || '').trim(),
            when: r?.relativePublishTimeDescription || '',
          }))
          .filter((r: GoogleReview) => r.text)
      : [];

    const data: GoogleReviewsData = {
      rating: typeof json.rating === 'number' ? json.rating : 0,
      count: typeof json.userRatingCount === 'number' ? json.userRatingCount : 0,
      mapsUri: json.googleMapsUri || '',
      reviews,
    };

    cache = { at: now, data };
    return data;
  } catch (err: any) {
    console.warn('[googleReviews] fetch failed:', err?.message || err);
    return cache?.data ?? null; // serve stale on error
  }
}
