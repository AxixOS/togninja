/**
 * Currency formatting utilities for the photography CRM
 * Provides safe formatting functions that handle null/undefined values
 */

export const formatCurrency = (amount: number | null | undefined, currency: string = 'EUR'): string => {
  const safeAmount = amount ?? 0;
  
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: currency
  }).format(safeAmount);
};

export const formatCurrencySimple = (amount: number | null | undefined): string => {
  const safeAmount = amount ?? 0;
  return `€${safeAmount.toFixed(2)}`;
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