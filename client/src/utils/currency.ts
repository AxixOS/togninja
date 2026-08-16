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