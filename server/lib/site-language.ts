// The language a studio's public site is written in.
//
// This used to be readable only from the SITE_LANG environment variable — a deploy-time
// setting the studio buying the product never sees. German/English was the origin
// studio's requirement, not every buyer's: a Brighton boudoir photographer and a Madrid
// wedding photographer need the same choice made for them at onboarding, not baked into
// the image. Page visibility (shared/sitePages.ts), generated copy and locale defaults
// all key off this value, so until a studio could set it they all keyed off a default.
//
// Resolution order: the studio's own choice -> SITE_LANG -> English.
import { pool } from '../db';

/** Languages the product ships public-site copy and locale defaults for. */
export const SUPPORTED_SITE_LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'de', label: 'Deutsch (German)' },
  { code: 'fr', label: 'Français (French)' },
  { code: 'es', label: 'Español (Spanish)' },
] as const;

export type SiteLanguageCode = typeof SUPPORTED_SITE_LANGUAGES[number]['code'];

const DEFAULT_LANGUAGE: SiteLanguageCode = 'en';

/** Normalise anything ('de-AT', 'DE', ' de ') to a supported two-letter code. */
export function normalizeSiteLanguage(value: unknown): SiteLanguageCode | null {
  const code = String(value || '').trim().slice(0, 2).toLowerCase();
  if (!code) return null;
  return SUPPORTED_SITE_LANGUAGES.some((l) => l.code === code) ? (code as SiteLanguageCode) : null;
}

let cached: { lang: SiteLanguageCode; at: number } | null = null;
let cachedExplicit: { lang: SiteLanguageCode | null; at: number } | null = null;
const TTL = 60_000;

/**
 * The language the studio ACTUALLY CHOSE — no env fallback, no default.
 *
 * This is the one that may change URLs, and the distinction is not academic. The origin
 * studio runs a bilingual German site at German paths and has never answered the language
 * question, so its stored value is NULL. Resolved through getSiteLanguage() that becomes
 * "en" (the default for a new buyer), and localising on it would 301 every one of that
 * studio's live German URLs to an English path that has no history, no inbound links and
 * no ranking. An instance that never answered must keep exactly the URLs it has.
 *
 * So: null means "do not localise". Only an explicit choice moves a studio's URLs.
 */
export async function getExplicitSiteLanguage(): Promise<SiteLanguageCode | null> {
  if (cachedExplicit && Date.now() - cachedExplicit.at < TTL) return cachedExplicit.lang;
  let lang: SiteLanguageCode | null = null;
  try {
    const { rows } = await pool.query(`SELECT site_language FROM studio_configs LIMIT 1`);
    lang = normalizeSiteLanguage(rows?.[0]?.site_language);
  } catch { /* column missing — treat as unanswered */ }
  cachedExplicit = { lang, at: Date.now() };
  return lang;
}

/** Sync peek at the explicit choice, for the redirect middleware. */
export function peekExplicitSiteLanguage(): SiteLanguageCode | null {
  if (cachedExplicit && Date.now() - cachedExplicit.at < TTL) return cachedExplicit.lang;
  getExplicitSiteLanguage().catch(() => {});
  return null;
}

/**
 * The studio's site language. Cached briefly — it changes only when the studio changes
 * it, and this is read on request paths (sitemap, page visibility) that must stay fast.
 * Never throws: a studio with no row, or a DB blip, gets the env/English fallback rather
 * than a broken page.
 */
export async function getSiteLanguage(): Promise<SiteLanguageCode> {
  if (cached && Date.now() - cached.at < TTL) return cached.lang;
  let lang = normalizeSiteLanguage(process.env.SITE_LANG) || DEFAULT_LANGUAGE;
  try {
    const { rows } = await pool.query(`SELECT site_language FROM studio_configs LIMIT 1`);
    const stored = normalizeSiteLanguage(rows?.[0]?.site_language);
    if (stored) lang = stored;
  } catch {
    // Column or table missing (pre-migration boot) — the fallback above still applies.
  }
  cached = { lang, at: Date.now() };
  return lang;
}

/** Call after the studio changes its language so the next request sees it. */
export function invalidateSiteLanguage(): void {
  cached = null;
  cachedExplicit = null;
}

/**
 * The cached language, synchronously, for hot paths that cannot await — chiefly the
 * redirect middleware, which runs on every request. Returns null until the first load
 * completes and kicks that load off in the background; a caller that gets null must do
 * nothing rather than assume a default, or it would redirect on a guess.
 */
export function peekSiteLanguage(): SiteLanguageCode | null {
  if (cached && Date.now() - cached.at < TTL) return cached.lang;
  getSiteLanguage().catch(() => {});
  return cached?.lang ?? null;
}
