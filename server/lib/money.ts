// Money, on the server, in the studio's own currency.
//
// The client has had useStudioCurrency for a while. The server never had an equivalent, so
// every amount it renders was written with a literal — and those are the amounts that
// leave the building:
//
//   the invoice EMAIL said "Amount Due: €195.00" while the invoice page it linked to said
//   "$195.00", for the same invoice, in the same minute;
//
//   the gallery print-order endpoint wrote 'EUR' into gallery_orders and returned
//   currency: 'EUR' to a drawer that had just totalled the basket in dollars, so the
//   record and the receipt disagreed with the screen.
//
// A studio can survive a wrong symbol on a dashboard. They cannot survive telling a client
// one number and their accountant another.
import { pool } from '../db';

const cache: { at: number; currency: string; locale: string } = { at: 0, currency: '', locale: '' };
const TTL_MS = 60_000;

/** The currency this studio bills in, and a locale to render it with. */
export async function studioMoneyContext(): Promise<{ currency: string; locale: string }> {
  if (cache.currency && Date.now() - cache.at < TTL_MS) {
    return { currency: cache.currency, locale: cache.locale };
  }

  const r = await pool.query(
    `SELECT currency, site_language FROM studio_configs LIMIT 1`,
  ).catch(() => ({ rows: [] as any[] }));
  const row = r.rows[0] || {};

  // The column default is 'EUR' and predates the product being sold to anyone else, so a
  // studio that never chose is not evidence that they wanted euros. It is still the only
  // honest fallback available here — the alternative is refusing to render an amount.
  const currency = String(row.currency || process.env.STUDIO_CURRENCY || 'EUR').trim().toUpperCase();
  const lang = String(row.site_language || 'en').trim().slice(0, 2).toLowerCase();
  const locale = lang === 'de' ? 'de-DE' : 'en-US';

  cache.currency = currency;
  cache.locale = locale;
  cache.at = Date.now();
  return { currency, locale };
}

/** Drop the cache when the studio changes its billing currency. */
export function invalidateStudioMoney(): void {
  cache.currency = '';
  cache.at = 0;
}

/**
 * Format an amount for a human — an email, a PDF, a message a client reads.
 *
 * `currency` overrides the studio's when the record carries its own, which matters for a
 * historical invoice: an invoice raised in euros stays in euros even after the studio
 * switches, or the reprint contradicts what the client actually paid.
 */
export async function formatMoney(
  amount: number | string | null | undefined,
  currency?: string | null,
): Promise<string> {
  const ctx = await studioMoneyContext();
  const code = String(currency || ctx.currency).trim().toUpperCase() || ctx.currency;
  const n = typeof amount === 'string' ? parseFloat(amount) : amount;
  const value = Number.isFinite(n as number) ? (n as number) : 0;
  try {
    return new Intl.NumberFormat(ctx.locale, { style: 'currency', currency: code }).format(value);
  } catch {
    // An unknown or malformed code must not cost the studio an email. Show the number and
    // the code rather than nothing, or a symbol we cannot justify.
    return `${value.toFixed(2)} ${code}`;
  }
}

/** The studio's currency code, for a database column or an API response. */
export async function studioCurrencyCode(): Promise<string> {
  return (await studioMoneyContext()).currency;
}
