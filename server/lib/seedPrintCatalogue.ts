// Give a new studio a populated print shop before they have configured anything.
//
// print_products has been empty since the feature shipped, and it was always going to be:
// a photographer will not create a Prodigi account, export a pricing sheet and import it
// before they have seen a single print product. Four steps of setup in front of a feature
// they have not been shown yet is how a feature stays unused forever.
//
// The catalogue cannot be fetched at boot — Prodigi has no endpoint that lists it, only
// GET /products/{sku} for a SKU you already know. So it ships IN the image, built by
// scripts/build-starter-catalogue.mjs from a real exported pricing sheet.
//
// What ships is the COST. The markup is applied here, per studio, so one studio's margin
// never travels inside another studio's catalogue.
import fs from 'fs';
import path from 'path';
import { pool } from '../db';
import { applyMarkup } from './prodigiSheet';

export interface SeedResult {
  seeded: number;
  skipped: number;
  reason?: string;
  /** The currency the shipped COSTS are denominated in, when it is not the studio own. */
  costCurrency?: string;
  /** Seeded switched OFF, because a price could not be trusted. Needs the studio eyes. */
  inactive?: number;
  /** Rows with no usable cost in the sheet, left out entirely. */
  unpriced?: number;
}

/** The default margin a studio starts on. */
//
// 100%, not 5%. Prints are traditionally where a photographer's margin lives — the session
// fee rarely covers the real cost of the work — and a studio who never changes this must
// not accidentally be selling at, or near, cost. It is a starting point they can lower;
// the failure mode of the alternative is silent and expensive.
const DEFAULT_MARKUP_PERCENT = 100;

function catalogueFile(): string {
  return path.resolve(process.cwd(), 'server/data/starter-print-catalogue.json');
}

/** Is there a catalogue in this image at all? */
export function hasStarterCatalogue(): boolean {
  try { return fs.existsSync(catalogueFile()); } catch { return false; }
}

/**
 * Populate print_products from the shipped catalogue.
 *
 * Never overwrites. A studio who has imported their own sheet, edited a price, or
 * deliberately deleted a product must not have any of that undone by a later boot — so
 * this does nothing at all once the table has rows.
 */
export async function seedPrintCatalogue(markupPercent = DEFAULT_MARKUP_PERCENT): Promise<SeedResult> {
  // Guard the margin HERE, not at the call site. A parameter typed number enforces
  // nothing in this project — strictNullChecks is off — and a null arriving from a
  // studio's unset setting would reach applyMarkup, which treats a non-finite percentage
  // as 0 and would seed the whole catalogue at cost. That is the exact silent, expensive
  // failure the 100% default above exists to prevent, so it cannot be reachable by
  // passing the wrong thing in.
  const pct = Number.isFinite(markupPercent) && markupPercent >= 0
    ? markupPercent
    : DEFAULT_MARKUP_PERCENT;

  const file = catalogueFile();
  if (!fs.existsSync(file)) {
    return { seeded: 0, skipped: 0, reason: 'No starter catalogue ships with this build.' };
  }

  const existing = await pool.query(`SELECT count(*)::int AS n FROM print_products`)
    .catch(() => ({ rows: [{ n: -1 }] }));
  const n = existing.rows[0]?.n ?? -1;
  if (n < 0) return { seeded: 0, skipped: 0, reason: 'print_products is not available.' };
  if (n > 0) {
    return { seeded: 0, skipped: n, reason: `The studio already has ${n} print product(s); leaving them alone.` };
  }

  let parsed: any;
  try {
    parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e: any) {
    return { seeded: 0, skipped: 0, reason: `The starter catalogue could not be read: ${e?.message}` };
  }
  const products: any[] = Array.isArray(parsed?.products) ? parsed.products : [];
  if (!products.length) return { seeded: 0, skipped: 0, reason: 'The starter catalogue is empty.' };

  const studio = await pool.query(`SELECT id FROM studio_configs LIMIT 1`).catch(() => ({ rows: [] as any[] }));
  const studioId = studio.rows[0]?.id || null;

  // CURRENCY. This used to stamp the studio own currency onto every row and claim, in a
  // comment right here, that doing so prevented "pound prices in an American shop". It did
  // the opposite: the NUMBER is the lab charge in the LAB currency, and relabelling it USD
  // does not convert it. A GBP 7.50 print became "$7.50 cost / $15.00 sell" — a 56% margin
  // presented as 100%. In a low-unit-value currency it is not a margin error but a loss.
  //
  // There is no FX source in this product and inventing one would be worse, so the sheet
  // currency is KEPT and the mismatch is surfaced instead. Prices a studio cannot trust are
  // seeded switched OFF: a stocked shop selling at the wrong price is worse than an empty
  // one, because nothing about it looks wrong.
  const cfg = await pool.query(`SELECT currency FROM studio_configs LIMIT 1`).catch(() => ({ rows: [] as any[] }));
  const studioCurrency = String(cfg.rows[0]?.currency || 'EUR').toUpperCase();
  const sheetCurrency = String(
    parsed?.currency || products.find((p: any) => p?.currency)?.currency || studioCurrency,
  ).toUpperCase();
  const currency = sheetCurrency;
  const currencyMatches = sheetCurrency === studioCurrency;

  let seeded = 0;
  let inactive = 0;
  let unpriced = 0;
  for (const p of products) {
    if (!p?.sku) continue;
    const cost = typeof p.cost === 'number' ? p.cost : parseFloat(p.cost);
    const sell = applyMarkup(cost, pct);

    // A row the sheet gave no usable cost for. applyMarkup returns null here, and this
    // used to insert it anyway, switched ON, and count it as seeded — so the studio was
    // told "N products added, priced at cost plus 100%" about products with no price at
    // all, which the gallery would then advertise at 0.00. Leave them out.
    if (!Number.isFinite(cost) || sell === null || !Number.isFinite(Number(sell))) {
      unpriced++;
      continue;
    }

    // Live only if the money is in the studio own currency. Otherwise the product is
    // real, the price is not yet, and they must look before they sell.
    const isActive = currencyMatches;
    if (!isActive) inactive++;
    try {
      await pool.query(
        `INSERT INTO print_products
           (studio_id, sku, name, description, category, base_price, currency,
            width_inches, height_inches, attributes, is_active)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
         ON CONFLICT (sku) DO NOTHING`,
        [studioId, p.sku, p.name || p.sku, p.description || null, p.category || null,
         sell, currency, p.widthInches ?? null, p.heightInches ?? null,
         // What the lab charges, kept beside the product. base_price is the SELL price
         // and print_products has no cost column, so without this the studio can see
         // what they charge but never what they make — and a margin they cannot see is
         // one they will not adjust.
         JSON.stringify({ ...(p.attributes || {}), cost }),
         isActive],
      );
      seeded++;
    } catch {
      // One bad row must not cost the studio the other two hundred.
    }
  }

  return {
    seeded,
    skipped: 0,
    inactive,
    unpriced,
    costCurrency: currencyMatches ? undefined : sheetCurrency,
  };
}
