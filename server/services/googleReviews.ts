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
  /**
   * Resolved through placesProvider now, which answers the question this used to skip:
   * WHOSE key is this.
   *
   * The old body read the studio's column and then fell back to a bare
   * GOOGLE_PLACES_API_KEY, so a studio running entirely on the platform's key looked
   * identical to one who had set up their own — and nothing anywhere could say who was
   * paying. It also spent the platform's key on the live public site, where the cost scales
   * with a tenant's visitors rather than with signups.
   *
   * placesKeyInUse keeps the studio's own key working everywhere, and lends the platform's
   * only while onboarding is unfinished — which is exactly the preview this was wanted for.
   */
  const { placesKeyInUse } = await import('../lib/placesProvider.js');
  const p = await placesKeyInUse();
  return p.apiKey || '';
}

/**
 * CAN THE PLACES API ACTUALLY USE THIS IDENTIFIER?
 *
 * Three different things get called a "place id" and only one of them works here.
 *
 *   ChIJ...            a Places API place ID. GET /v1/places/{this} works.
 *   /g/11ghxg_twp      a KNOWLEDGE-GRAPH id, which is what a Google Maps share link
 *                      carries in its !16s segment.
 *   0x487c...:0x9a...  the hex CID/feature pair, from the same link's !1s segment.
 *
 * The last two are real identifiers for the same business and are useless to this API. Asking
 * for /v1/places/%2Fg%2F11ghxg_twp returns nothing, the caller reads a failed fetch, and the
 * studio is told their reviews are "not available" — with a key that works perfectly.
 *
 * Which is exactly what happened. v1.9.212 taught onboarding to read the id out of the map
 * link a studio pastes, and stored the /g/ form in google_places_place_id — a column this
 * file feeds straight to the Places API. v1.9.226 then stopped the Text Search that WOULD
 * have found a usable one, on the reasoning that a place id was already stored. Both changes
 * were mine and each was defensible alone.
 *
 * The map-link id is still worth keeping: it names the listing unambiguously, and a provider
 * that accepts a cid or fid can use it directly. It just is not this one.
 */
export function isPlacesApiId(id: string): boolean {
  const v = String(id || '').trim();
  if (!v) return false;
  if (v.startsWith('/g/') || v.startsWith('/m/')) return false;   // knowledge graph
  if (/^0x[0-9a-f]+:0x[0-9a-f]+$/i.test(v)) return false;          // hex CID / feature id
  return true;
}

async function getPlaceId(): Promise<string> {
  let stored = '';
  try {
    const { config } = await import('../config-reader.js');
    const fromDb = await config.get('google_places_place_id');
    if (fromDb) stored = String(fromDb).trim();
  } catch { /* fall through to env */ }
  if (!stored) stored = (process.env.GOOGLE_PLACES_PLACE_ID || '').trim();

  // An identifier this API cannot use is worse than none: with none, the resolver below runs
  // and finds a real one. With an unusable one stored, everything downstream believed the
  // studio was configured and quietly failed every call.
  if (stored && !isPlacesApiId(stored)) {
    const resolved = await resolveAndStorePlacesId();
    return resolved || '';
  }
  return stored;
}

/**
 * Find this studio's real Places API id and keep it.
 *
 * resolvePlaceIdFromStudio already does the finding — Text Search on the studio's own name
 * and address, deliberately refusing to guess when Google returns more than one candidate.
 * What was missing is anything that CALLS it when the stored id turns out to be the wrong
 * kind, and anything that writes the answer back so the next request does not repeat the work.
 *
 * Best effort throughout: no key, no match, an ambiguous match or a failed write all mean
 * "no reviews this time", which is the same outcome as before and never an error shown to a
 * studio.
 */
async function resolveAndStorePlacesId(): Promise<string | null> {
  try {
    const found = await resolvePlaceIdFromStudio();
    if (!('placeId' in found) || !found.placeId) return null;
    try {
      const { pool } = await import('../db.js');
      await pool.query(
        `UPDATE studio_integrations SET google_places_place_id = $1`,
        [found.placeId],
      );
      const { config } = await import('../config-reader.js');
      config.invalidate();
    } catch (e: any) {
      // The id is still good for this request even if we could not keep it.
      console.warn('[googlePlaces] resolved a place id but could not store it:', e?.message || e);
    }
    console.log(`[googlePlaces] map-link id was not a Places id — resolved "${found.name}" instead`);
    return found.placeId;
  } catch (e: any) {
    console.warn('[googlePlaces] could not resolve a Places id:', e?.message || e);
    return null;
  }
}

/**
 * What Google itself publishes for this studio: name, address, phone.
 *
 * The documented Places Details endpoint, on the studio's own key and their own listing —
 * the same call the reviews already make, with three more fields on the mask.
 *
 * WHY IT IS WORTH ASKING FOR. Google's version is the one their clients navigate by, and it
 * is routinely not the version on their website. The listing that prompted this reads
 * "26 Đặng Văn Ngữ, Hội An Đông, Đà Nẵng 51314, Vietnam" on Google and
 * "Address: 26 Dang Van Ngu, Hoi An" on the studio's own about page — different district,
 * different province (Quảng Nam was merged into Đà Nẵng), no diacritics. Both are "right";
 * only one matches what Google shows someone trying to find them.
 *
 * Returns null rather than throwing. This is a suggestion offered on top of an address the
 * studio already has, so every failure — no key, no place id, a refused request — simply
 * means no suggestion, and nothing upstream should have to handle it.
 */
export async function getPlaceProfile(): Promise<{ name: string; address: string; phone: string } | null> {
  const key = await getPlacesKey();
  const placeId = await getPlaceId();
  if (!key || !placeId) return null;
  try {
    const res = await fetch(`${PLACE_DETAILS_URL}/${encodeURIComponent(placeId)}?languageCode=en`, {
      headers: {
        'X-Goog-Api-Key': key,
        'X-Goog-FieldMask': 'displayName,formattedAddress,internationalPhoneNumber',
      },
    });
    if (!res.ok) {
      console.warn(`[googlePlaces] details ${res.status} for place profile`);
      return null;
    }
    const j: any = await res.json();
    const address = typeof j?.formattedAddress === 'string' ? j.formattedAddress.trim() : '';
    if (!address) return null;
    return {
      name: (j?.displayName?.text || '').trim(),
      address,
      phone: (j?.internationalPhoneNumber || '').trim(),
    };
  } catch (e: any) {
    console.warn('[googlePlaces] place profile failed:', e?.message || e);
    return null;
  }
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
