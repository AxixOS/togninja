import { pool } from '../db';

/**
 * The studio's trading currency — the single server-side source of truth.
 *
 * Every Stripe entry point hardcoded 'eur'. A studio could set GBP in onboarding, the site
 * would render "£95", and the customer's card would be debited 95 EUR. That is not a
 * display bug: it is the wrong amount taken from a member of the public, in a currency
 * neither party agreed, with the studio carrying the chargeback.
 *
 * Written as one accessor rather than fixed at each call site on purpose. There are three
 * charge paths (Checkout, PaymentIntent, and the test route) plus the rows written after a
 * sale; fixing them individually is how two of them end up agreeing and the third does not.
 *
 * Cached like site-language and site-theme: this is read on payment paths, and a database
 * round trip per line item is pointless when the value changes about once in a studio's
 * lifetime.
 */

// ISO 4217 codes Stripe settles in that we are willing to emit. An unknown or malformed
// value must never reach the Stripe API — it fails the charge outright — so anything not
// on this list falls back rather than being passed through.
const SUPPORTED = new Set([
  'eur', 'gbp', 'usd', 'chf', 'cad', 'aud', 'nzd', 'sek', 'nok', 'dkk',
  'pln', 'czk', 'huf', 'ron', 'bgn', 'jpy', 'sgd', 'hkd', 'zar', 'aed',
]);

// Currencies with no minor unit. Stripe expects the amount in the smallest unit, so for
// these the amount is NOT multiplied by 100 — passing 9500 for ¥95 charges ¥9,500.
const ZERO_DECIMAL = new Set(['jpy', 'krw', 'vnd', 'clp', 'isk', 'ugx', 'xaf', 'xof', 'rwf']);

const DEFAULT = 'eur';
let _cache: { code: string; at: number } | null = null;
const TTL = 60_000;

export function invalidateStudioCurrency(): void { _cache = null; }

/** Lowercase ISO 4217 code, as Stripe wants it. Never throws; falls back to the default. */
export async function getStudioCurrency(): Promise<string> {
  if (_cache && Date.now() - _cache.at < TTL) return _cache.code;
  let code = DEFAULT;
  try {
    const r = await pool.query('SELECT currency FROM studio_configs LIMIT 1');
    const raw = String(r.rows[0]?.currency || '').trim().toLowerCase();
    if (SUPPORTED.has(raw)) code = raw;
    else if (raw) console.warn(`[studio-currency] "${raw}" is not a currency we emit — using ${DEFAULT}`);
  } catch {
    // Column missing on an older instance, or the database is briefly unreachable. A
    // payment must not fail because of this lookup.
  }
  _cache = { code, at: Date.now() };
  return code;
}

/** True when the currency has no minor unit, so amounts must NOT be multiplied by 100. */
export function isZeroDecimal(code: string): boolean {
  return ZERO_DECIMAL.has(String(code || '').toLowerCase());
}

/**
 * Convert a major-unit price (95.00) into what Stripe expects for this currency.
 * Kept beside the currency so the two decisions cannot be made in different places.
 */
export function toStripeAmount(major: number, code: string): number {
  const n = Number(major) || 0;
  return isZeroDecimal(code) ? Math.round(n) : Math.round(n * 100);
}
