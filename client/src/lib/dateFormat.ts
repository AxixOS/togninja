/**
 * Centralized Date Formatting Utility
 * 
 * Provides consistent date/time formatting across the entire app.
 * 
 * Priority:
 *  1. Explicit setting from onboarding/settings (stored in DB → localStorage cache)
 *  2. Browser's navigator.language (auto-detects user's PC regional setting)
 *  3. Fallback: 'de-AT' (Austrian German — primary market)
 * 
 * Usage:
 *   import { formatAppDate, formatAppDateTime, formatAppTime } from '@/lib/dateFormat';
 *   formatAppDate('2026-03-03T09:49:04')  →  "03.03.2026"  (de-AT)
 *   formatAppDate('2026-03-03T09:49:04')  →  "3/3/2026"    (en-US)
 */

// ─── Supported date format presets ───────────────────────────────────────────
export type DateFormatPreset =
  | 'auto'     // Use browser locale (navigator.language)
  | 'de-AT'    // 03.03.2026  (Austrian/German)
  | 'de-DE'    // 03.03.2026  (Germany)
  | 'en-US'    // 3/3/2026    (US)
  | 'en-GB'    // 03/03/2026  (UK)
  | 'fr-FR'    // 03/03/2026  (France)
  | 'it-IT'    // 03/03/2026  (Italy)
  | 'es-ES';   // 3/3/2026    (Spain)

export const DATE_FORMAT_OPTIONS: { value: DateFormatPreset; label: string; example: string }[] = [
  { value: 'auto',  label: 'Auto-detect (from browser/PC)',  example: '' },
  { value: 'de-AT', label: 'Austrian / German (03.03.2026)', example: '03.03.2026' },
  { value: 'de-DE', label: 'German (03.03.2026)',            example: '03.03.2026' },
  { value: 'en-US', label: 'US English (3/3/2026)',          example: '3/3/2026' },
  { value: 'en-GB', label: 'UK English (03/03/2026)',        example: '03/03/2026' },
  { value: 'fr-FR', label: 'French (03/03/2026)',            example: '03/03/2026' },
  { value: 'it-IT', label: 'Italian (03/03/2026)',           example: '03/03/2026' },
  { value: 'es-ES', label: 'Spanish (3/3/2026)',             example: '3/3/2026' },
];

// ─── LocalStorage key ────────────────────────────────────────────────────────
const LS_KEY = 'appDateFormatPreset';

// ─── Getters / Setters ──────────────────────────────────────────────────────

/** Get the currently configured date format preset */
export function getDateFormatPreset(): DateFormatPreset {
  try {
    const stored = localStorage.getItem(LS_KEY);
    if (stored && DATE_FORMAT_OPTIONS.some(o => o.value === stored)) {
      return stored as DateFormatPreset;
    }
  } catch {}
  return 'auto';
}

/** Save a date format preset (called from Settings / Onboarding) */
export function setDateFormatPreset(preset: DateFormatPreset): void {
  try {
    localStorage.setItem(LS_KEY, preset);
  } catch {}
}

/** Resolve the effective BCP-47 locale string used for formatting */
export function getEffectiveLocale(): string {
  const preset = getDateFormatPreset();
  if (preset !== 'auto') return preset;

  // Use browser language (reflects the user's PC regional setting)
  try {
    const browserLang = navigator.language || (navigator as any).userLanguage;
    if (browserLang) return browserLang;
  } catch {}

  return 'de-AT'; // fallback
}

// ─── Formatting Functions ───────────────────────────────────────────────────

/**
 * Format a date value as a date-only string (e.g. "03.03.2026" or "3/3/2026").
 * Accepts Date objects, ISO strings, or timestamps.
 */
export function formatAppDate(value: string | Date | number | null | undefined): string {
  if (!value) return '—';
  try {
    const date = value instanceof Date ? value : new Date(value);
    if (isNaN(date.getTime())) return 'Invalid Date';
    return date.toLocaleDateString(getEffectiveLocale(), {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  } catch {
    return 'Invalid Date';
  }
}

/**
 * Format a date value as date + time (e.g. "03.03.2026, 09:49" or "3/3/2026, 9:49 AM").
 */
export function formatAppDateTime(value: string | Date | number | null | undefined): string {
  if (!value) return '—';
  try {
    const date = value instanceof Date ? value : new Date(value);
    if (isNaN(date.getTime())) return 'Invalid Date';
    return date.toLocaleDateString(getEffectiveLocale(), {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return 'Invalid Date';
  }
}

/**
 * Format a date value as time-only (e.g. "09:49" or "9:49 AM").
 */
export function formatAppTime(value: string | Date | number | null | undefined): string {
  if (!value) return '—';
  try {
    const date = value instanceof Date ? value : new Date(value);
    if (isNaN(date.getTime())) return 'Invalid Date';
    return date.toLocaleTimeString(getEffectiveLocale(), {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return 'Invalid Date';
  }
}

/**
 * Format a date in a "relative-friendly" way:
 * - Today → time only
 * - This year → "Mar 3" (localised short month + day)
 * - Older → full date
 */
export function formatAppDateSmart(value: string | Date | number | null | undefined): string {
  if (!value) return '—';
  try {
    const date = value instanceof Date ? value : new Date(value);
    if (isNaN(date.getTime())) return 'Invalid Date';
    const now = new Date();
    const locale = getEffectiveLocale();

    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
    }

    if (date.getFullYear() === now.getFullYear()) {
      return date.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
    }

    return date.toLocaleDateString(locale, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  } catch {
    return 'Invalid Date';
  }
}

/**
 * Format a date with a long month name (e.g. "3 March 2026" / "3. März 2026").
 * Used for formal contexts like invoices.
 */
export function formatAppDateLong(value: string | Date | number | null | undefined): string {
  if (!value) return '—';
  try {
    const date = value instanceof Date ? value : new Date(value);
    if (isNaN(date.getTime())) return 'Invalid Date';
    return date.toLocaleDateString(getEffectiveLocale(), {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return 'Invalid Date';
  }
}
