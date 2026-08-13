// The studio's own postal locality, for the crawler-visible head.
//
// siteIdentity.ts builds the JSON-LD and window.__SITE_CONFIG__ from environment
// variables only, so on an instance where nobody set BUSINESS_CITY the served
// PhotoStudio node carried no address at all — no addressLocality, no areaServed.
// For a local service business that is the single most important on-page signal,
// and every buyer was shipping without it. The column existed and was read by the
// homepage generator; nothing on the SEO path ever looked at it.
//
// Why a sync peek rather than an await: the HTML render path (server/vite.ts) is
// synchronous and memoised, so it cannot await a query. Same shape as
// site-language.ts — a background load fills a short-lived cache, callers take
// whatever is there, and a version counter lets the memoised HTML know when to
// rebuild. See addressVersion().
import { pool } from '../db';

export interface StudioAddress {
  /** The studio's own name, as entered at onboarding. */
  name: string;
  street: string;
  city: string;
  postalCode: string;
}

const EMPTY: StudioAddress = { name: '', street: '', city: '', postalCode: '' };
const TTL = 60_000;

let cached: { value: StudioAddress; at: number } | null = null;
let loading = false;
let version = 0;
let signature = '';

/** Trim and bound a free-text column that reaches a page title and JSON-LD. */
function clean(value: unknown): string {
  return String(value ?? '').trim().slice(0, 80);
}

/**
 * The city as a locality, not a sentence. The admin field's placeholder invited
 * "City, Country", and 'Brighton, UK' is wrong in addressLocality — that property
 * is the locality alone, and addressCountry is a separate field we deliberately do
 * not source (see siteIdentity).
 */
function localityOf(value: unknown): string {
  return clean(String(value ?? '').split(',')[0]);
}

async function load(): Promise<StudioAddress> {
  let next: StudioAddress = EMPTY;
  try {
    const { rows } = await pool.query(
      `SELECT business_name, studio_name, address, city FROM studio_configs LIMIT 1`,
    );
    const row = rows?.[0];
    if (row) {
      next = {
        // The name the studio gave at onboarding. Without this the site was titled
        // from BUSINESS_NAME, a deploy-time variable the buyer never sees — so a
        // studio could complete the wizard and still have someone else's business
        // in its <title>, its og:site_name and its JSON-LD.
        name: clean(row.business_name || row.studio_name),
        street: clean(row.address),
        city: localityOf(row.city),
        postalCode: '',
      };
    }
  } catch {
    // Column or table missing, or a DB blip — an empty address is exactly what this
    // path produced before, so failing to today's behaviour is the safe outcome.
  }
  cached = { value: next, at: Date.now() };
  // Version advances on CHANGE, not on load, so the TTL refresh does not thrash the
  // memoised HTML — a studio that never edits its city rebuilds the shell twice per
  // process, not once a minute.
  const nextSignature = `${next.name}|${next.street}|${next.city}|${next.postalCode}`;
  if (nextSignature !== signature) {
    signature = nextSignature;
    version += 1;
  }
  return next;
}

/**
 * The cached address, synchronously, for the HTML render path. Returns null until
 * the first load completes and kicks that load off in the background — a caller
 * that gets null must fall back to the env-only identity rather than block.
 *
 * Deliberately stale-while-revalidate: once a value is known it keeps being served
 * while a refresh runs. Nulling on invalidate would re-emit the empty address this
 * module exists to remove, for one request, every time a studio saves.
 */
export function peekStudioAddress(): StudioAddress | null {
  const fresh = cached && Date.now() - cached.at < TTL;
  if (!fresh && !loading) {
    loading = true;
    load().finally(() => { loading = false; });
  }
  return cached ? cached.value : null;
}

/** Await the first load. Used once at boot so request #1 is not served address-less. */
export async function warmStudioAddress(): Promise<void> {
  try { await load(); } catch { /* never block boot on this */ }
}

/**
 * Which "generation" of the address the served HTML was built from. server/vite.ts
 * keys its memoised shells on this: the shells are built once and held for the life
 * of the process, so without a key a studio's city would never reach the served HTML
 * until the next deploy — and request #1, which can land before the first load
 * finishes, would pin an empty address forever.
 */
export function addressVersion(): number {
  return version;
}

/** Call after any write to studio_configs.address/city so the next render sees it. */
export function invalidateStudioAddress(): void {
  if (cached) cached.at = 0; // expire, but keep last-known-good for the next peek
}
