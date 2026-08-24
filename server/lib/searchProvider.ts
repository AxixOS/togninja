// Whose search account pays for a competitor crawl?
//
// THE PRODUCT PROBLEM. The Price Wizard read TAVILY_API_KEY and AXIXOS_INTERNAL_API_KEY
// directly from process.env — thirteen reads across the route file, and `config.get` called
// exactly zero times. Every other credential in this product resolves DB-first through
// config.get(), which is what makes the Technical Setup screen work. The Price Wizard opted
// out of that, so the only way to give it a key was a host environment variable, which a
// photographer who bought this product cannot reach. There was not even a column for their
// key to live in.
//
// The visible symptom: sessions created with status 'manual', a shop of zero competitors and
// zero prices, and a message telling the studio to "set AXIXOS_INTERNAL_API_KEY in your
// environment" — an internal variable name shown to someone who will never have a shell.
//
// THE SPLIT, the same one Prodigi already uses (see server/lib/prodigiAccount.ts):
//
//   The PLATFORM key funds discovery, so the crawl works on day one and the studio sees the
//   feature before being asked to set anything up. A search costs the platform a fraction of
//   a cent; a feature nobody can switch on costs it the whole feature.
//
//   The STUDIO's OWN key takes precedence whenever they have set one, so a heavy user moves
//   onto their own quota instead of competing with every other tenant for the platform's.
//
// Unlike Prodigi there is no merchant-of-record trap here: a search bills nobody but the key
// holder, and nothing ships under anyone's name. So the fallback is safe in a way the Prodigi
// one is not — which is exactly why THAT one must never be copied from this file.
import { config } from '../config-reader';

export type SearchKeySource = 'studio' | 'platform' | null;

export interface SearchProvider {
  apiKey: string | null;
  /** 'tavily' talks to Tavily directly; 'axixos' goes through the platform's own service. */
  kind: 'tavily' | 'axixos' | null;
  baseUrl: string | null;
  source: SearchKeySource;
}

const AXIXOS_DEFAULT_BASE = 'https://axixos-intelligence.onrender.com';

/** The studio's own search key, or nothing. Never falls back. */
export async function studioSearchKey(): Promise<string | null> {
  const key = await config.get('search_api_key');
  return key ? String(key).trim() || null : null;
}

/**
 * The provider a crawl should actually use: the studio's own key if they have set one,
 * otherwise the platform's.
 *
 * Order matters. The studio's key is checked FIRST so that setting one genuinely moves them
 * off the platform's quota — a fallback that ran the other way round would quietly ignore a
 * key they had paid for.
 */
export async function searchProvider(): Promise<SearchProvider> {
  const own = await studioSearchKey();
  if (own) {
    return { apiKey: own, kind: 'tavily', baseUrl: 'https://api.tavily.com', source: 'studio' };
  }

  // The platform's own intelligence service, preferred over a platform Tavily key because it
  // is the cheaper path and the one the platform actually operates.
  const axixos = (process.env.AXIXOS_INTERNAL_API_KEY || '').trim();
  if (axixos) {
    return {
      apiKey: axixos,
      kind: 'axixos',
      baseUrl: (process.env.AXIXOS_API_BASE || AXIXOS_DEFAULT_BASE).replace(/\/+$/, ''),
      source: 'platform',
    };
  }

  // A platform Tavily key. Read from env only — never through config.get, because that
  // resolves the studio's own column first and would make a platform key indistinguishable
  // from a tenant's.
  const platformTavily = (process.env.TAVILY_PLATFORM_API_KEY || '').trim();
  if (platformTavily) {
    return { apiKey: platformTavily, kind: 'tavily', baseUrl: 'https://api.tavily.com', source: 'platform' };
  }

  return { apiKey: null, kind: null, baseUrl: null, source: null };
}

/** Is a crawl possible at all, whoever ends up paying for it? */
export async function searchConfigured(): Promise<boolean> {
  return !!(await searchProvider()).apiKey;
}

/**
 * What to tell a studio when no crawl is possible.
 *
 * Names no environment variable. The old copy said "set AXIXOS_INTERNAL_API_KEY (or a Tavily
 * key)" to a photographer, which is both unactionable and a leak of how the platform is
 * wired. If the PLATFORM has not configured search, that is the platform's problem to fix and
 * there is nothing the studio can do about it — so the message says what still works instead
 * of asking them for something they cannot give.
 */
export function searchUnavailable() {
  return {
    error: 'search_unavailable',
    code: 'search_unavailable',
    message:
      'Automatic competitor research is not available on this instance right now. You can '
      + 'still add competitors and their prices by hand below, then generate suggestions from '
      + 'those.',
  };
}
