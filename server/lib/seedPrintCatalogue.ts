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

  // The studio's own currency, not the sheet's. A GBP cost sheet seeding a USD studio
  // would otherwise put pound prices in an American shop — the same class of defect as
  // the euro signs that were on every checkout screen this morning.
  const cfg = await pool.query(`SELECT currency FROM studio_configs LIMIT 1`).catch(() => ({ rows: [] as any[] }));
  const currency = String(cfg.rows[0]?.currency || 'EUR').toUpperCase();

  let seeded = 0;
  for (const p of products) {
    if (!p?.sku) continue;
    const sell = applyMarkup(typeof p.cost === 'number' ? p.cost : parseFloat(p.cost), markupPercent);
    try {
      await pool.query(
        `INSERT INTO print_products
           (studio_id, sku, name, description, category, base_price, currency,
            width_inches, height_inches, attributes, is_active)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,true)
         ON CONFLICT (sku) DO NOTHING`,
        [studioId, p.sku, p.name || p.sku, p.description || null, p.category || null,
         sell, currency, p.widthInches ?? null, p.heightInches ?? null,
         JSON.stringify(p.attributes || {})],
      );
      seeded++;
    } catch {
      // One bad row must not cost the studio the other two hundred.
    }
  }

  return { seeded, skipped: 0 };
}
