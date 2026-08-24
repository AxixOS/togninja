// Who is this studio, and how should its documents look?
//
// ONE resolver for every client-facing document — invoice, contract, voucher, booking page.
// Phase 2b of the plan is "one capability, every client-facing doc", and this is the half
// that has to exist before any of the rest is worth building: three renderers each deciding
// independently what the studio is called is how you get an invoice that disagrees with the
// contract attached to it.
//
// WHAT IT REPLACES, AND WHY THAT MATTERED. The live invoice PDF
// (server/routes.ts generateModernInvoicePDF) looked its branding up like this:
//
//     const studioId = process.env.STUDIO_ID || '550e8400-e29b-41d4-a716-446655440000';
//     const language = 'de';
//
// A hardcoded demo UUID and a hardcoded language. On the live tenant the real
// studio_configs.id is 575f04f5-…, so every branding lookup missed and every field fell back
// to a placeholder — while the same function printed "Rechnung Nr.", "Rechnungsdatum",
// "Fotografie-Leistung", "GESAMTBETRAG" and euro signs onto invoices whose own currency
// column says USD. A photographer in Shreveport was sending German invoices in euros, for
// amounts denominated in dollars, from a studio the document could not name.
//
// This product is single-tenant: one database is one studio. There is therefore no id to
// pass and none to guess — studio_configs is read with LIMIT 1, the way every other correct
// reader in this codebase does it.
import { pool } from '../db';
import { studioMoneyContext } from './money';

export interface DocumentBrand {
  /** What to call the business on a document. Never a placeholder unless nothing is set. */
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  country: string;
  vatNumber: string;
  logoUrl: string | null;
  /** ISO-4217, from the studio — not from the renderer's assumptions. */
  currency: string;
  /** BCP-47, for dates and number formatting. */
  locale: string;
  /** 'de' | 'en' — which label set a document should print. */
  language: 'de' | 'en';
  timezone: string;
}

let cache: { value: DocumentBrand; at: number } | null = null;
const TTL_MS = 60_000;

/** Drop the cache after the studio edits its branding. */
export function invalidateDocumentBrand(): void {
  cache = null;
}

export async function documentBrand(): Promise<DocumentBrand> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.value;

  const r = await pool.query(
    `SELECT business_name, studio_name, email, owner_email, phone, address, city, state,
            country, vat_number, logo_url, currency, site_language, timezone, date_format
       FROM studio_configs LIMIT 1`,
  ).catch(() => ({ rows: [] as any[] }));
  const s: any = r.rows?.[0] || {};

  const money = await studioMoneyContext();
  const language: 'de' | 'en' =
    String(s.site_language || 'en').toLowerCase().startsWith('de') ? 'de' : 'en';

  // date_format is 'auto' or a BCP-47 tag. When auto, reuse the locale money.ts already
  // derived rather than deriving a second, potentially different one.
  const configured = String(s.date_format || '').trim();
  const locale = configured && configured.toLowerCase() !== 'auto' ? configured : money.locale;

  const str = (v: unknown) => (v == null ? '' : String(v).trim());

  const value: DocumentBrand = {
    // business_name first, studio_name second — the same precedence every other resolver in
    // this repo uses. An empty string rather than "My Studio": a document that cannot name
    // the business should look unfinished, not confidently wrong.
    name: str(s.business_name) || str(s.studio_name),
    // The address a client should reply to. owner_email is a bootstrap placeholder on a
    // fresh instance ('admin@localhost'), so it is deliberately NOT a fallback here — the
    // same decision, and for the same reason, as shared/contractMerge.resolveStudioEmail.
    email: str(s.email),
    phone: str(s.phone),
    address: str(s.address),
    city: str(s.city),
    state: str(s.state),
    country: str(s.country),
    vatNumber: str(s.vat_number),
    logoUrl: str(s.logo_url) || null,
    currency: money.currency,
    locale,
    language,
    // UTC rather than any real city. A wrong timezone never errors, it just silently
    // restates every date.
    timezone: str(s.timezone) || process.env.DEFAULT_CAL_TZ || 'UTC',
  };

  cache = { value, at: Date.now() };
  return value;
}

/**
 * The label set for a document, in the studio's language.
 *
 * Kept here rather than inside each renderer because the invoice PDF hardcoded German while
 * the contract PDF hardcoded English, so the two documents a client received in the same
 * email did not agree on what language the studio speaks.
 */
export function documentLabels(language: 'de' | 'en') {
  const de = language === 'de';
  return {
    invoice: de ? 'Rechnung' : 'Invoice',
    invoiceNo: de ? 'Rechnung Nr.' : 'Invoice no.',
    invoiceDate: de ? 'Rechnungsdatum' : 'Invoice date',
    dueDate: de ? 'Fällig am' : 'Due',
    billTo: de ? 'Rechnung an' : 'Bill to',
    description: de ? 'Beschreibung' : 'Description',
    qty: de ? 'Menge' : 'Qty',
    unitPrice: de ? 'Einzelpreis' : 'Unit price',
    amount: de ? 'Betrag' : 'Amount',
    subtotal: de ? 'Zwischensumme' : 'Subtotal',
    tax: de ? 'Steuer' : 'Tax',
    total: de ? 'GESAMTBETRAG' : 'TOTAL',
    paid: de ? 'Bezahlt' : 'Paid',
    balanceDue: de ? 'Offener Betrag' : 'Balance due',
    defaultLineItem: de ? 'Fotografie-Leistung' : 'Photography services',
    thanks: de ? 'Vielen Dank für Ihr Vertrauen.' : 'Thank you for your business.',
  };
}

/**
 * Format an amount for a document, in the studio's currency and locale.
 *
 * Renderers were printing `€${n.toFixed(2)}` inline. Intl gives the right symbol, the right
 * separators and the right symbol POSITION — "1.234,56 €" in German, "$1,234.56" in English
 * — none of which a hardcoded prefix can do.
 */
export function formatDocumentMoney(amount: number, brand: DocumentBrand): string {
  const n = Number.isFinite(amount) ? amount : 0;
  try {
    return new Intl.NumberFormat(brand.locale, {
      style: 'currency',
      currency: brand.currency,
    }).format(n);
  } catch {
    // An unknown currency code should not cost the studio the whole document.
    return `${brand.currency} ${n.toFixed(2)}`;
  }
}

/**
 * The studio's postal address as a document should print it, skipping what is not set.
 *
 * Joining these by hand produced ", , " on a studio that had only filled in a street.
 */
export function brandAddressLines(brand: DocumentBrand): string[] {
  const out: string[] = [];
  if (brand.address) out.push(brand.address);

  // Do not restate what the address already says. Many studios type the whole postal
  // address into the one box that existed before city/state/country had fields, so
  // appending them produced "…Shreveport, Louisiana, USA / Louisiana / USA" on the live
  // tenant. A part already present in the address text is skipped.
  const already = brand.address.toLowerCase();
  const fresh = (v: string) => !!v && !already.includes(v.toLowerCase());

  const line2 = [brand.city, brand.state].filter(fresh).join(", ");
  if (line2) out.push(line2);
  if (fresh(brand.country)) out.push(brand.country);
  return out;
}
