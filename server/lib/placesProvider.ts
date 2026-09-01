// Whose Google Places account pays to show a studio their own reviews?
//
// THE PRODUCT REASON. A studio's reviews are the most persuasive thing on their site and they
// have already earned them — the rating, the count, the words real clients wrote. Showing that
// on the FIRST PREVIEW, before they have handed over a single credential, is the moment the
// product proves itself. Asking for a Google Places key first turns the best thing we have into
// a thing behind a form.
//
// THE SPLIT, the same one searchProvider.ts already uses:
//
//   The PLATFORM key funds the PREVIEW, so onboarding shows real reviews on day one. A Places
//   Details call is a fraction of a cent and happens a handful of times per signup.
//
//   The STUDIO's OWN key serves their LIVE SITE, and takes precedence the moment they set one.
//   That is ongoing use, on their traffic, against their data — and a platform key funding
//   every tenant's public pages is a bill that grows with somebody else's visitors.
//
// So this resolves the studio first and falls back to the platform, and it REPORTS WHICH. The
// existing getPlacesKey() in services/googleReviews.ts already fell back to an env var, but to
// a plainly-named GOOGLE_PLACES_API_KEY with no source attached — so a studio running entirely
// on the platform's key was indistinguishable from one who had set up their own, and nobody
// could answer "who is actually paying for this" from anywhere.
import { config } from '../config-reader';

export type PlacesKeySource = 'studio' | 'platform' | null;

export interface PlacesProvider {
  apiKey: string | null;
  source: PlacesKeySource;
}

/** The studio's own key, or nothing. Never falls back. */
export async function studioPlacesKey(): Promise<string | null> {
  try {
    const key = await config.get('google_places_api_key');
    return key ? String(key).trim() || null : null;
  } catch {
    return null;
  }
}

/**
 * The key a Places call should use, and who it belongs to.
 *
 * Order matters. The studio's key is checked FIRST so that setting one genuinely moves them
 * onto their own quota — a fallback running the other way round would quietly ignore a key
 * they had paid for and keep billing the platform.
 */
export async function placesProvider(): Promise<PlacesProvider> {
  const own = await studioPlacesKey();
  if (own) return { apiKey: own, source: 'studio' };

  // Env ONLY. Reading this through config.get would resolve the studio's own column first and
  // make the two indistinguishable — the exact confusion this file exists to prevent.
  //
  // Named for the convention the other platform credentials follow (TAVILY_PLATFORM_API_KEY,
  // PRODIGI_PLATFORM_API_KEY) rather than the bare GOOGLE_PLACES_API_KEY the old fallback
  // read, because a bare name gives no clue whose account it is.
  const platform = (process.env.GOOGLE_PLACES_PLATFORM_API_KEY || '').trim();
  if (platform) return { apiKey: platform, source: 'platform' };

  // The old, ambiguous fallback. Kept so an instance already configured that way keeps
  // working, and reported as 'platform' because that is what it is on a host we run.
  const legacy = (process.env.GOOGLE_PLACES_API_KEY || '').trim();
  if (legacy) return { apiKey: legacy, source: 'platform' };

  return { apiKey: null, source: null };
}

/**
 * The key to actually use, with the platform's spent only while onboarding is unfinished.
 *
 * WHY THAT SIGNAL AND NOT A PARAMETER. The preview and the live site are the SAME rendered
 * page hitting the SAME endpoint (/api/reviews/google), so a caller-supplied "this is the
 * preview" would be a flag any request could set — and the one thing it controls is whose
 * card gets charged. creative_setup_complete is decided server-side, cannot be sent by a
 * visitor, and means exactly what is being asked: is this studio still being set up.
 *
 * So: during onboarding the platform pays and the studio sees their real reviews on the first
 * preview. Once they finish, the platform key stops answering and their own key serves their
 * traffic. If they never add one the reviews simply stop appearing, which is the honest
 * outcome — the alternative is a bill that grows with somebody else's visitors.
 *
 * A studio's OWN key works in both states and is always preferred.
 */
export async function placesKeyInUse(): Promise<PlacesProvider> {
  const p = await placesProvider();
  if (p.source !== 'platform') return p;

  try {
    const { pool } = await import('../db');
    const r = await pool.query('SELECT creative_setup_complete AS done FROM studio_configs LIMIT 1');
    const onboardingFinished = r.rows?.[0]?.done === true;
    if (onboardingFinished) return { apiKey: null, source: null };
  } catch {
    // Cannot tell: do NOT spend the platform's key on a maybe. A missing rating is a small
    // thing; a bill that grows with a tenant's traffic because one query failed is not.
    return { apiKey: null, source: null };
  }
  return p;
}
