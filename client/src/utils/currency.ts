/**
 * Currency formatting utilities for the photography CRM
 * Provides safe formatting functions that handle null/undefined values
 */

import { getEffectiveLocale } from '../lib/dateFormat';

/**
 * The currency was already a parameter here; the LOCALE was not, and it was 'de-DE'. So a
 * studio trading in sterling got German conventions applied to it — "95,00 £", comma for
 * the decimal point and the symbol trailing. Correct German formatting of the wrong
 * country's money.
 *
 * getEffectiveLocale() is the same resolver dates already use: the studio's chosen preset
 * if it set one, otherwise the browser's. Reused rather than duplicated so money and dates
 * cannot end up formatted for two different countries on the same page.
 */
export const formatCurrency = (amount: number | null | undefined, currency: string = 'EUR'): string => {
  const safeAmount = amount ?? 0;
  try {
    return new Intl.NumberFormat(getEffectiveLocale(), {
      style: 'currency',
      currency,
    }).format(safeAmount);
  } catch {
    // An unknown currency code makes Intl throw. Show the number and the code rather than
    // crashing a price out of the page.
    return `${safeAmount.toFixed(2)} ${String(currency || '').toUpperCase()}`;
  }
};

/**
 * Deprecated. Wrote a euro sign into the string, so it could only ever be right for one
 * studio. Kept so existing call sites keep compiling, but it now defers to formatCurrency
 * with the caller's currency — pass it, or better, use useStudioCurrency().format().
 */
export const formatCurrencySimple = (amount: number | null | undefined, currency: string = 'EUR'): string =>
  formatCurrency(amount, currency);

/**
 * The glyph a currency code is written with, e.g. USD -> $, GBP -> pound sign. Unknown
 * codes make Intl throw, and plenty of real codes (CHF, SEK, PLN) simply have no glyph;
 * both cases return the code itself, which is right for everyone rather than wrong for
 * everyone the way a hardcoded sign is.
 */
export const currencySymbol = (currency: string = 'EUR', locale: string = getEffectiveLocale()): string => {
  try {
    const parts = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      currencyDisplay: 'narrowSymbol',
    }).formatToParts(1);
    return parts.find((p) => p.type === 'currency')?.value || currency;
  } catch {
    return currency;
  }
};

/**
 * A Schema.org priceRange BAND, not an amount. '€€' means mid-range; it does not mean
 * 249, so formatCurrency is the wrong tool for it and always was. What was wrong is that
 * the glyph was written in by hand, so a studio selling in dollars published a euro band
 * to every crawler that read its structured data.
 *
 * The locale is pinned rather than taken from the visitor: this string is frozen into
 * prerendered HTML, so a band that shifted with the crawler's language would make the
 * same page emit different structured data from one build to the next.
 *
 * Not every currency narrows to a single glyph: CHF comes back as its own code and SEK
 * as 'kr'. Repeating those reads as nonsense ('CHFCHF'), so they are emitted once. The
 * band level is lost in that case; the currency is not, and that is the right way round
 * to lose it.
 */
export const priceBand = (currency: string = 'EUR', level: number = 2): string => {
  // '' is not undefined, so the parameter default does not catch it. Normalised to the
  // same fallback useStudioCurrency uses, so an unconfigured studio gets the column's
  // default rather than an empty priceRange in its structured data.
  const code = String(currency || 'EUR').toUpperCase();
  const symbol = currencySymbol(code, 'en');
  // Only a single glyph is repeated. SEK narrows to 'kr' and CHF to 'CHF', and a word said
  // twice is not a band, it is a typo; those are emitted once.
  return symbol.length === 1 ? symbol.repeat(Math.max(1, level)) : (symbol || code);
};

export const formatPercent = (value: number | null | undefined): string => {
  const safeValue = value ?? 0;
  return `${safeValue.toFixed(1)}%`;
};

export const parseAmount = (value: string | number | null | undefined): number => {
  if (typeof value === 'number') return value || 0;
  if (typeof value === 'string') {
    const parsed = parseFloat(value.replace(/[^\d.-]/g, ''));
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
};