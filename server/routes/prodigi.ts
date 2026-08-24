/**
 * Prodigi Print-on-Demand Integration Routes
 * 
 * Enables customers to order prints directly from gallery images
 * using Prodigi's fulfillment network.
 */

import { Router, Request, Response } from 'express';
import { pool } from '../db';
import { config } from '../config-reader';

import { printStoreEnabled } from '../lib/requirePrintAccess';
import { parseProdigiSheet, applyMarkup } from '../lib/prodigiSheet';
import { studioProdigiAccount, catalogueProdigiAccount, connectAccountRequired } from '../lib/prodigiAccount';
import { seedPrintCatalogue, hasStarterCatalogue } from '../lib/seedPrintCatalogue';
import { createPrintCheckoutSession } from '../lib/printCheckout';

const router = Router();

// Prodigi config is resolved PER REQUEST from the per-tenant config-reader (DB-first,
// env fallback), so each studio uses its OWN key + sandbox/production environment.
// (Was a module-level process.env.PRODIGI_API_KEY keyed off NODE_ENV — host-level, wrong
// for a multi-tenant product image.)
//
// It is now split by PURPOSE — see server/lib/prodigiAccount.ts. Reading the catalogue
// may use the platform account so a studio sees products on day one without four steps
// of setup; PLACING AN ORDER may not, because a platform key in that path silently makes
// the platform the merchant of record for physical goods.
export async function getProdigiConfig(): Promise<{ apiKey: string | null; baseUrl: string }> {
  // Kept for callers that only read. Ordering must use requireStudioProdigi() below.
  const { apiKey, baseUrl } = await catalogueProdigiAccount();
  return { apiKey, baseUrl };
}

/**
 * The studio's own account, or a 402 telling them to connect one.
 *
 * Every path that bills a human goes through here. Returning null rather than falling
 * back is the entire safety property: the platform key cannot be reached by a caller
 * that forgot which kind of operation it was performing.
 */
async function requireStudioProdigi(res: Response): Promise<{ apiKey: string; baseUrl: string } | null> {
  const own = await studioProdigiAccount();
  if (!own.apiKey) {
    res.status(402).json(connectAccountRequired());
    return null;
  }
  return { apiKey: own.apiKey, baseUrl: own.baseUrl };
}

/** Tenant-neutral order reference prefix, derived from the studio's business name. */
async function getMerchantPrefix(): Promise<string> {
  try {
    const name = (await config.get('business_name')) || (await config.get('studio_name')) || '';
    const slug = String(name).replace(/[^A-Za-z0-9]/g, '').slice(0, 8).toUpperCase();
    return slug || 'PRINT';
  } catch {
    return 'PRINT';
  }
}

/**
 * A Prodigi API call, against an EXPLICIT account.
 *
 * This used to resolve the key itself, which meant a caller that had established which
 * account it was entitled to use had that decision thrown away one frame later.
 * dispatchPrintOrder is the case that mattered: it refuses to run without the studio's
 * own account, and then bought the parcel through this helper on whatever key this
 * resolved — the platform's, once a platform key existed.
 *
 * Omitting `account` means "a catalogue read", and only a catalogue read.
 */
async function prodigiRequest(
  endpoint: string,
  method: string = 'GET',
  body?: any,
  account?: { apiKey: string; baseUrl: string },
) {
  const { apiKey, baseUrl } = account || (await catalogueProdigiAccount());
  const response = await fetch(`${baseUrl}${endpoint}`, {
    method,
    headers: {
      'X-API-Key': apiKey || '',
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json();

  if (!response.ok) {
    console.error('[Prodigi] API Error:', data);
    throw new Error(data.statusText || 'Prodigi API error');
  }

  return data;
}

/**
 * GET /products
 * Get available print products from local cache
 */
router.get('/products', async (req: Request, res: Response) => {
  try {
    const { category } = req.query;
      
      let query = `
        SELECT id, sku, name, description, category, 
               width_inches, height_inches, base_price, currency,
               attributes, sort_order
        FROM print_products 
        WHERE is_active = true
      `;
      const params: any[] = [];
      
      if (category) {
        query += ' AND category = $1';
        params.push(category);
      }
      
      query += ' ORDER BY category, sort_order, base_price';
      
      const result = await pool.query(query, params);
      
      // Group by category
      const grouped = result.rows.reduce((acc: any, product: any) => {
        const cat = product.category || 'other';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push({
          ...product,
          widthInches: product.width_inches,
          heightInches: product.height_inches,
          basePrice: parseFloat(product.base_price),
        });
        return acc;
      }, {});
      
      res.json({
        products: result.rows.map(p => ({
          ...p,
          widthInches: p.width_inches,
          heightInches: p.height_inches,
          basePrice: parseFloat(p.base_price),
        })),
        grouped,
        categories: Object.keys(grouped),
      });
    } catch (error) {
      console.error('[Prodigi] Error fetching products:', error);
      res.status(500).json({ error: 'Failed to fetch print products' });
    }
  });

// ============================================================================
// Catalogue management (Phase 1) — the studio adds Prodigi products by SKU. We
// validate the SKU against Prodigi's product-details API (pulls name/dimensions)
// and the studio sets their own sell price. Populates print_products per tenant.
// NOTE: these mutate the catalogue and are consumed by the authed admin settings
// page; router-level auth is added in the order-flow hardening pass (Phase 2).
// ============================================================================

/** Look up a SKU on Prodigi and normalise the bits we store. */
async function fetchProdigiProduct(sku: string) {
  const data = await prodigiRequest(`/products/${encodeURIComponent(sku)}`);
  const p = data?.product || {};
  const dim = p.productDimensions || {};
  const units = String(dim.units || '').toLowerCase();
  const toInches = (v: any) => {
    const n = parseFloat(v);
    if (!Number.isFinite(n)) return null;
    return units === 'cm' ? Number((n / 2.54).toFixed(2)) : Number(n.toFixed(2));
  };
  return {
    sku: p.sku || sku,
    name: p.description || sku,
    description: p.description || '',
    widthInches: toInches(dim.width),
    heightInches: toInches(dim.height),
    attributes: p.attributes || {},
  };
}

// POST /catalog/validate — validate a SKU against Prodigi, return details (no save).
router.post('/catalog/validate', async (req: Request, res: Response) => {
  try {
    const sku = String(req.body?.sku || '').trim();
    if (!sku) return res.status(400).json({ error: 'SKU is required' });
    const { apiKey } = await getProdigiConfig();
    if (!apiKey) return res.status(400).json({ error: 'Connect your Prodigi API key in Settings first.' });
    const product = await fetchProdigiProduct(sku);
    res.json({ ok: true, product });
  } catch (error: any) {
    res.status(400).json({ ok: false, error: `Could not validate SKU: ${error?.message || 'Prodigi lookup failed'}` });
  }
});

// GET /catalog — full catalogue (incl inactive) for the admin manager.
router.get('/catalog', async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT id, sku, name, description, category, base_price, currency,
              width_inches, height_inches, is_active, sort_order, attributes
       FROM print_products ORDER BY sort_order, name`,
    );
    // base_price is the SELL price. What the lab charges is carried in attributes.cost,
    // because print_products has no cost column — so the seeder and the sheet importer
    // both record it there and the admin screen can show margin instead of asking the
    // studio to remember what they paid.
    res.json({
      products: result.rows.map((p: any) => ({
        ...p,
        basePrice: p.base_price != null ? parseFloat(p.base_price) : null,
        cost: costOf(p.attributes),
      })),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/** The lab cost recorded beside a product, or null. Never 0 — a zero-cost product is an
 *  unpriced one, and showing it as free is how a studio gives prints away. */
function costOf(attributes: any): number | null {
  const raw = attributes && typeof attributes === 'object' ? (attributes as any).cost : null;
  const n = typeof raw === 'number' ? raw : parseFloat(String(raw ?? ''));
  return Number.isFinite(n) && n > 0 ? n : null;
}

// ── Where the studio's markup lives ──────────────────────────────────────────────────
//
// Markup is the only number in this feature that is studio POLICY rather than a fact
// about a product: it decides what everything stocked or imported from now on sells for.
// Until now it existed for the length of one request — POST /catalog/import read it off
// the body and threw it away — so stocking the shop and the next pricing sheet could
// silently disagree about margin, and the studio had nowhere to state their answer once.
//
// It belongs on studio_integrations, beside prodigi_api_key_encrypted and
// prodigi_environment: same feature, same tenant row, same lifetime. Two facts about this
// codebase decide HOW it is read and written:
//
//   1. There is no prodigi_markup_percent in shared/schema.ts, and config-reader loads
//      studio_integrations with a Drizzle select, which returns only mapped columns. So
//      config.get('prodigi_markup_percent') cannot see this value, and a Drizzle
//      .set({ prodigi_markup_percent }) would drop the key rather than fail. Everything
//      below therefore goes through pool.query with the column named explicitly.
//   2. The column is added the way every other late column in this image is added, an
//      idempotent ALTER ... ADD COLUMN IF NOT EXISTS. Run on first use rather than at
//      boot so it also lands on an instance whose boot-time table audit predates it.
const DEFAULT_MARKUP_PERCENT = 100;
const MARKUP_MAX_PERCENT = 1000;

/** Keep a typed percentage inside what a price can survive. */
function clampMarkup(n: number): number {
  if (!Number.isFinite(n)) return DEFAULT_MARKUP_PERCENT;
  return Math.min(MARKUP_MAX_PERCENT, Math.max(0, Math.round(n * 100) / 100));
}

let markupColumnReady: Promise<void> | null = null;
function ensureMarkupColumn(): Promise<void> {
  if (!markupColumnReady) {
    markupColumnReady = pool
      .query('ALTER TABLE studio_integrations ADD COLUMN IF NOT EXISTS prodigi_markup_percent numeric')
      .then(() => undefined)
      .catch((e: any) => {
        // A database that refuses the column must still leave the page usable on the
        // default, and the next request should get another go rather than inheriting one
        // failure for the life of the process.
        console.warn('[Prodigi] could not add studio_integrations.prodigi_markup_percent:', e?.message);
        markupColumnReady = null;
      });
  }
  return markupColumnReady;
}

/** The studio's markup, or the default. Never null — callers price with this. */
async function getMarkupPercent(): Promise<number> {
  try {
    await ensureMarkupColumn();
    const r = await pool.query('SELECT prodigi_markup_percent AS pct FROM studio_integrations LIMIT 1');
    const raw = r.rows[0]?.pct;
    if (raw === null || raw === undefined || raw === '') return DEFAULT_MARKUP_PERCENT;
    const n = Number(raw);
    return Number.isFinite(n) ? clampMarkup(n) : DEFAULT_MARKUP_PERCENT;
  } catch (e: any) {
    console.warn('[Prodigi] markup lookup failed, using the default:', e?.message);
    return DEFAULT_MARKUP_PERCENT;
  }
}

/** Write the markup. Returns false when there was no row to write it to. */
async function setMarkupPercent(pct: number): Promise<boolean> {
  await ensureMarkupColumn();
  const updated = await pool.query('UPDATE studio_integrations SET prodigi_markup_percent = $1', [pct]);
  if (updated.rowCount && updated.rowCount > 0) return true;

  // Nothing has been connected on this instance yet, so studio_integrations is empty.
  // Create the single row the rest of the app already assumes is there.
  const inserted = await pool.query(
    'INSERT INTO studio_integrations (studio_id, prodigi_markup_percent) SELECT id, $1 FROM studios LIMIT 1',
    [pct],
  );
  return Boolean(inserted.rowCount && inserted.rowCount > 0);
}

/** How many products the studio has, and how many a buyer can actually see. */
async function countProducts(): Promise<{ total: number; active: number }> {
  const r = await pool.query(
    'SELECT count(*)::int AS total, COALESCE(sum(CASE WHEN is_active THEN 1 ELSE 0 END), 0)::int AS active FROM print_products',
  );
  return { total: r.rows[0]?.total ?? 0, active: r.rows[0]?.active ?? 0 };
}

/** The studio's own currency. studio_configs.currency is the live column; the
 *  default_currency that shared/schema.ts declares does not exist in the database. */
async function studioCurrency(): Promise<string> {
  try {
    const r = await pool.query('SELECT currency FROM studio_configs LIMIT 1');
    return String(r.rows[0]?.currency || 'EUR').toUpperCase();
  } catch {
    return 'EUR';
  }
}

/**
 * GET /catalog/status — everything the Print Products screen needs to tell the truth
 * before the studio touches anything.
 *
 * ordering.ready is the same question the 402 answers, asked before there is an order to
 * refuse. The wording and the link come from connectAccountRequired() either way, so the
 * screen cannot drift from the refusal the studio will meet later.
 */
router.get('/catalog/status', async (_req: Request, res: Response) => {
  try {
    const [counts, markupPercent, currency, own] = await Promise.all([
      countProducts(),
      getMarkupPercent(),
      studioCurrency(),
      studioProdigiAccount(),
    ]);
    const required = connectAccountRequired();
    res.json({
      products: counts,
      currency,
      markupPercent,
      defaultMarkupPercent: DEFAULT_MARKUP_PERCENT,
      maxMarkupPercent: MARKUP_MAX_PERCENT,
      starterCatalogue: { available: hasStarterCatalogue() },
      ordering: own.apiKey
        ? { ready: true }
        : { ready: false, message: required.message, settingsPath: required.settingsPath },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /catalog/markup — the margin every future stock/import prices at.
router.post('/catalog/markup', async (req: Request, res: Response) => {
  try {
    // strictNullChecks is off here, so a null body value would pass through Number() as 0
    // and be stored as "sell at cost". Look at the raw value before trusting the number.
    const raw = req.body?.markupPercent;
    const usable = typeof raw === 'number' || (typeof raw === 'string' && raw.trim() !== '');
    const n = usable ? Number(raw) : NaN;
    if (!Number.isFinite(n) || n < 0 || n > MARKUP_MAX_PERCENT) {
      return res.status(400).json({
        error: 'invalid_markup',
        message: 'Enter a markup between 0 and ' + MARKUP_MAX_PERCENT
          + ' percent. 100 means you sell at double what the lab charges you.',
      });
    }

    const pct = clampMarkup(n);
    const saved = await setMarkupPercent(pct);
    const stored = await getMarkupPercent();
    if (!saved || stored !== pct) {
      return res.status(500).json({
        error: 'markup_not_saved',
        message: 'The markup could not be stored, so nothing changed. Finish the studio setup, then set it here.',
      });
    }
    res.json({ ok: true, markupPercent: stored });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /catalog/seed — stock an empty shop from the catalogue that ships in this build.
 *
 * No Prodigi call and no key of any kind: this copies a file that is already in the image
 * into the studio's own rows and applies their markup. Browsing and stocking stay free;
 * the account question arrives at the order, which is the only place it is anyone's
 * business.
 *
 * seedPrintCatalogue refuses to touch a table that already has rows, and says why. That
 * reason is handed straight back rather than flattened into "success" — a studio who
 * clicks this twice needs to know the second click changed nothing.
 */
router.post('/catalog/seed', async (_req: Request, res: Response) => {
  try {
    const before = await countProducts();
    const markupPercent = await getMarkupPercent();
    const result = await seedPrintCatalogue(markupPercent);
    const [after, currency] = await Promise.all([countProducts(), studioCurrency()]);
    res.json({
      ok: true,
      seeded: result.seeded,
      skipped: result.skipped,
      reason: result.reason,
      markupPercent,
      currency,
      products: after,
      changed: after.total !== before.total,
      starterCatalogue: { available: hasStarterCatalogue() },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /catalog — add a product (validate SKU via Prodigi; studio sets the sell price).
router.post('/catalog', async (req: Request, res: Response) => {
  try {
    const { sku, name, basePrice, category = 'prints', validate = true } = req.body;
    if (!sku) return res.status(400).json({ error: 'SKU is required' });
    // The studio's own currency when the caller does not name one. The default here was
    // 'EUR', which is only ever right for some studios; a euro sign on an American shop
    // is a defect this project has already paid for once.
    const currency = String(req.body?.currency || (await studioCurrency())).toUpperCase();

    let details: any = { name: name || sku, description: '', widthInches: null, heightInches: null, attributes: {} };
    // Whether the SKU was actually CHECKED, as opposed to merely accepted. Reported back
    // so the caller can say which of the two happened instead of implying the stronger one.
    let skuVerified = false;
    if (validate) {
      const { apiKey } = await getProdigiConfig();
      if (apiKey) {
        try {
          details = { ...details, ...(await fetchProdigiProduct(sku)) };
          skuVerified = true;
        } catch (e: any) {
          return res.status(400).json({ error: `Prodigi could not find SKU "${sku}": ${e?.message || 'lookup failed'}` });
        }
      }
    }

    const studioRow = await pool.query('SELECT id FROM studio_configs LIMIT 1');
    const studioId = studioRow.rows[0]?.id || null;
    // is_active follows the PRICE. This hardcoded true, so a product added with the price
    // box left blank went on sale immediately at no price — and the gallery advertises
    // those at 0.00. A product nobody has priced is a draft, not an offer.
    const price = basePrice != null && String(basePrice).trim() !== '' ? parseFloat(basePrice) : null;
    const priced = price != null && Number.isFinite(price) && price > 0;

    let result;
    try {
      result = await pool.query(
        `INSERT INTO print_products
           (studio_id, sku, name, description, category, base_price, currency, width_inches, height_inches, attributes, is_active)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
        [studioId, sku, name || details.name, details.description, category,
         priced ? price : null, currency, details.widthInches, details.heightInches,
         JSON.stringify(details.attributes || {}), priced],
      );
    } catch (e: any) {
      // print_products.sku carries a unique index, and this used to surface the raw
      // driver text ("duplicate key value violates unique constraint ...") straight into
      // the studio's screen. Say what happened in their terms.
      if (String(e?.code) === '23505' || /duplicate key|unique constraint/i.test(String(e?.message))) {
        return res.status(409).json({
          error: 'sku_exists',
          message: `You already have a product with the SKU "${sku}".`,
        });
      }
      throw e;
    }

    res.json({
      ok: true,
      id: result.rows[0].id,
      // Both stated plainly, because the page shows different copy for each.
      skuVerified,
      isActive: priced,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /catalog/import — bulk-create products from a Prodigi pricing sheet.
//
// Prodigi has no endpoint that lists the catalogue. Their v4 reference offers exactly
// two product endpoints: GET /products/{sku}, which needs a SKU you already know, and a
// photobook spine calculator. The catalogue is a download under "Pricing sheets" in the
// dashboard. So the studio exports it and pastes or uploads it here.
//
// Without this the store is empty out of the box and the only way to fill it is the
// one-SKU-at-a-time form, which nobody is going to use ninety times.
router.post('/catalog/import', async (req: Request, res: Response) => {
  try {
    const text = String(req.body?.sheet || '');
    // The studio's saved margin is the default, so an import and a "stock my shop" price
    // the same way; an explicit value in the body still wins for a one-off. The raw value
    // is inspected first because strictNullChecks is off here and Number(null) is 0 —
    // which would import an entire pricing sheet at cost.
    const rawMarkup = req.body?.markupPercent;
    const markupGiven =
      (typeof rawMarkup === 'number' || (typeof rawMarkup === 'string' && rawMarkup.trim() !== ''))
      && Number.isFinite(Number(rawMarkup));
    const markupPercent = markupGiven ? clampMarkup(Number(rawMarkup)) : await getMarkupPercent();
    const currency = String(req.body?.currency || 'GBP');
    const category = String(req.body?.category || 'prints');
    const dryRun = req.body?.dryRun === true;

    if (!text.trim()) return res.status(400).json({ error: 'Paste or upload a pricing sheet first.' });

    const parsed = parseProdigiSheet(text);
    if (!parsed.rows.length) {
      return res.status(400).json({
        error: 'no_skus_found',
        message: 'No SKUs found in that sheet. Expected a column headed SKU, or one SKU per line.',
        columns: parsed.columns,
      });
    }

    // A pricing sheet can run to hundreds of rows and each one is a live API call to
    // Prodigi. Cap it, and say so in the response rather than silently truncating —
    // a studio who imported 500 and got 200 needs to know which happened.
    const LIMIT = 250;
    const rows = parsed.rows.slice(0, LIMIT);
    const truncated = parsed.rows.length - rows.length;

    const { apiKey } = await getProdigiConfig();
    const studioRow = await pool.query('SELECT id FROM studio_configs LIMIT 1');
    const studioId = studioRow.rows[0]?.id || null;

    const created: any[] = [];
    const failed: { sku: string; reason: string }[] = [];

    // Sequential on purpose. Prodigi rate-limits, and a burst of 250 concurrent lookups
    // is how an import turns into a temporary ban on the studio's own account.
    for (const row of rows) {
      let details: any = { name: row.label || row.sku, description: '', widthInches: null, heightInches: null, attributes: {} };
      if (apiKey) {
        try {
          details = { ...details, ...(await fetchProdigiProduct(row.sku)) };
        } catch (e: any) {
          failed.push({ sku: row.sku, reason: e?.message || 'Prodigi did not recognise this SKU' });
          continue;
        }
      }

      const sellPrice = applyMarkup(row.cost, markupPercent);
      if (dryRun) {
        created.push({ sku: row.sku, name: details.name, cost: row.cost, sellPrice });
        continue;
      }

      try {
        // ON CONFLICT DO UPDATE so re-importing an updated sheet refreshes prices
        // instead of erroring or duplicating the whole catalogue.
        const result = await pool.query(
          `INSERT INTO print_products
             (studio_id, sku, name, description, category, base_price, currency,
              width_inches, height_inches, attributes, is_active)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,true)
           ON CONFLICT (sku) DO UPDATE SET
             name = EXCLUDED.name,
             description = EXCLUDED.description,
             base_price = COALESCE(EXCLUDED.base_price, print_products.base_price),
             currency = EXCLUDED.currency,
             width_inches = EXCLUDED.width_inches,
             height_inches = EXCLUDED.height_inches,
             attributes = EXCLUDED.attributes
           RETURNING id, sku`,
          [studioId, row.sku, details.name, details.description, category, sellPrice, currency,
           details.widthInches, details.heightInches,
           JSON.stringify({ ...(details.attributes || {}), cost: row.cost ?? null })],
        );
        created.push({ id: result.rows[0].id, sku: row.sku, name: details.name, cost: row.cost, sellPrice });
      } catch (e: any) {
        failed.push({ sku: row.sku, reason: e?.message || 'could not be saved' });
      }
    }

    res.json({
      ok: true,
      dryRun,
      columns: parsed.columns,
      imported: created.length,
      failed,
      skippedRows: parsed.skipped,
      truncated,
      products: created,
      validated: Boolean(apiKey),
      message: apiKey
        ? undefined
        : 'No Prodigi API key is configured, so SKUs were imported without being checked against Prodigi.',
    });
  } catch (error: any) {
    console.error('[Prodigi] Import failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /catalog/:id — update sell price / name / category / active.
router.put('/catalog/:id', async (req: Request, res: Response) => {
  try {
    const { name, basePrice, currency, category, isActive } = req.body;
    await pool.query(
      `UPDATE print_products SET
         name = COALESCE($1, name),
         base_price = COALESCE($2, base_price),
         currency = COALESCE($3, currency),
         category = COALESCE($4, category),
         is_active = COALESCE($5, is_active)
       WHERE id = $6`,
      [name ?? null, basePrice != null ? parseFloat(basePrice) : null, currency ?? null, category ?? null,
       isActive === undefined ? null : isActive, req.params.id],
    );
    res.json({ ok: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /catalog/:id
router.delete('/catalog/:id', async (req: Request, res: Response) => {
  try {
    await pool.query('DELETE FROM print_products WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /quote
 * Get a price quote from Prodigi
 */
router.post('/quote', async (req: Request, res: Response) => {
    try {
      const { sku, copies = 1, destinationCountryCode = 'AT', currencyCode = 'EUR' } = req.body;

      if (!sku) {
        return res.status(400).json({ error: 'SKU is required' });
      }

      const { apiKey } = await getProdigiConfig();
      if (!apiKey) {
        // Return estimated price from local products if no API key
        const product = await pool.query(
          'SELECT * FROM print_products WHERE sku = $1',
          [sku]
        );
        
        if (product.rows.length === 0) {
          return res.status(404).json({ error: 'Product not found' });
        }

        const basePrice = parseFloat(product.rows[0].base_price);
        const shippingEstimate = 5.00; // Default shipping estimate
        
        return res.json({
          quotes: [{
            shipmentMethod: 'Standard',
            costSummary: {
              items: { amount: (basePrice * copies).toFixed(2), currency: currencyCode },
              shipping: { amount: shippingEstimate.toFixed(2), currency: currencyCode },
            },
            items: [{
              sku,
              copies,
              unitCost: { amount: basePrice.toFixed(2), currency: currencyCode },
            }],
          }],
          estimated: true,
        });
      }

      // Get real quote from Prodigi
      const quoteRequest = {
        destinationCountryCode,
        currencyCode,
        items: [{
          sku,
          copies,
          assets: [{ printArea: 'default' }],
        }],
      };

      const quote = await prodigiRequest('/quotes', 'POST', quoteRequest);
      res.json(quote);
    } catch (error: any) {
      console.error('[Prodigi] Quote error:', error);
      res.status(500).json({ error: error.message || 'Failed to get quote' });
    }
  });

/**
 * POST /order
 * Create a print order with Prodigi
 */
router.post('/order', async (req: Request, res: Response) => {
    try {
      // The studio's OWN Prodigi account, or nothing. An order placed on the platform
      // key would ship under the platform's name, bill the platform's card, and make
      // the platform the seller of a physical good to a consumer in whichever country
      // the buyer happens to live in. The catalogue above is browsable without this;
      // selling from it is not.
      const studioAccount = await requireStudioProdigi(res);
      if (!studioAccount) return;

      const {
        galleryId,
        galleryImageId,
        // imageUrl deliberately NOT read from the body — resolved from the DB below.
        sku,
        copies = 1,
        shippingMethod = 'Standard',
        customer,
        attributes = {},
      } = req.body;

      // NOTHING IN THIS CHAIN TAKES PAYMENT. Between here and dispatching a physical
      // print to Prodigi there is no Stripe session, no invoice and no charge — while
      // the confirmation screen tells the buyer an invoice is on its way. Requiring
      // authentication stopped anonymous strangers ordering; it did not make this safe
      // to sell through, because an authenticated client can still order unlimited free
      // prints at the studio's expense. The store stays off until the Stripe leg is
      // wired — the machinery already exists in server/routes.ts.
      if (!printStoreEnabled()) {
        return res.status(503).json({
          error: 'store_disabled',
          message: 'Print ordering is not available yet.',
        });
      }

      // Validate required fields. imageUrl is NOT trusted from the body — it is resolved
      // from galleryImageId below, so a caller cannot have an arbitrary URL printed.
      if (!sku || !customer || !galleryImageId) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const { name, email, phone, address } = customer;
      if (!name || !email || !address?.line1 || !address?.city || !address?.postalCode || !address?.countryCode) {
        return res.status(400).json({ error: 'Incomplete customer or address information' });
      }

      // Resolve the file to print from the DATABASE, never from the request.
      //
      // imageUrl used to be taken straight off req.body and handed to Prodigi as the
      // asset to print. Combined with the missing auth on this router, that let anyone
      // post any URL on the internet and have it printed and posted at the studio's
      // expense. Looking it up by id also guarantees the print belongs to the gallery
      // the caller proved access to.
      const imageRow = await pool.query(
        `SELECT url FROM gallery_images WHERE id = $1 AND ($2::uuid IS NULL OR gallery_id = $2)`,
        [galleryImageId, galleryId || null]);
      if (!imageRow.rows.length || !imageRow.rows[0].url) {
        return res.status(404).json({ error: 'image_not_found', message: 'That image is not in this gallery.' });
      }
      const printUrl: string = imageRow.rows[0].url;

      // Where Stripe returns the buyer to.
      const slugRow = await pool.query(`SELECT slug FROM galleries WHERE id = $1`, [galleryId || null])
        .catch(() => ({ rows: [] as any[] }));
      const gallerySlug: string | null = slugRow.rows?.[0]?.slug || null;

      // Generate merchant reference (tenant-neutral prefix from the studio's business name)
      const merchantPrefix = await getMerchantPrefix();
      const merchantReference = `${merchantPrefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Create order record in our database first
      const orderRecord = await pool.query(`
        INSERT INTO print_orders (
          gallery_id, gallery_image_id, merchant_reference, status,
          customer_name, customer_email, customer_phone,
          shipping_line1, shipping_line2, shipping_city, shipping_state,
          shipping_postal_code, shipping_country_code,
          sku, copies, sizing, attributes, image_url, shipping_method
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
        RETURNING id
      `, [
        galleryId || null,
        galleryImageId || null,
        merchantReference,
        'awaiting_payment',
        name,
        email,
        phone || null,
        address.line1,
        address.line2 || null,
        address.city,
        address.state || null,
        address.postalCode,
        address.countryCode,
        sku,
        copies,
        'fillPrintArea',
        JSON.stringify(attributes),
        printUrl,
        shippingMethod,
      ]);

      const localOrderId = orderRecord.rows[0].id;

      // STOP HERE. This route used to call Prodigi from this point, which is how an
      // unpaid order reached a printing press. It now only records the order and returns
      // a Stripe checkout URL; dispatch happens in the webhook, after the money has
      // actually arrived. See server/lib/printCheckout.ts.
      const checkout = await createPrintCheckoutSession({
        orderId: localOrderId,
        sku,
        copies,
        gallerySlug,
        customerEmail: email,
      });

      if (!checkout.ok) {
        // No session means no way to pay, so the order must not sit around looking live.
        await pool.query(`UPDATE print_orders SET status = 'checkout_failed' WHERE id = $1`, [localOrderId])
          .catch(() => {});
        return res.status(503).json({ error: checkout.error, message: checkout.message });
      }

      res.json({
        success: true,
        orderId: localOrderId,
        // The client redirects here. Nothing is printed until Stripe says this was paid.
        checkoutUrl: checkout.checkoutUrl,
        requiresPayment: true,
      });
    } catch (error: any) {
      console.error('[Prodigi] Order creation error:', error);
      res.status(500).json({ error: error.message || 'Failed to create order' });
    }
  });

/**
 * Send a PAID order to the print lab.
 *
 * Split out of POST /order so the Stripe webhook can call it — which is the only caller
 * that should exist, because dispatch must follow payment and never precede it.
 * Everything it needs comes from the stored row rather than from a request, so nothing a
 * browser sent can influence what gets printed or where it is posted.
 *
 * The caller must have CLAIMED the row first (claimPrintOrderForDispatch); that is what
 * makes a Stripe retry a no-op rather than a second parcel.
 */
export async function dispatchPrintOrder(order: any): Promise<{ ok: boolean; prodigiOrderId?: string; error?: string }> {
  // The STUDIO'S account. This is the moment a physical parcel is bought and someone's
  // card is charged, so it must never resolve to the platform key — studioProdigiAccount()
  // does not fall back, which is what makes that impossible rather than merely unlikely.
  const { apiKey, baseUrl } = await studioProdigiAccount();
  if (!apiKey) {
    // Paid, but the studio has not connected Prodigi. Recorded honestly rather than
    // reported as dispatched.
    await pool.query(`UPDATE print_orders SET status = 'paid_no_lab', updated_at = NOW() WHERE id = $1`, [order.id]);
    return { ok: false, error: 'Prodigi is not connected, so the order was not sent to the lab.' };
  }

  const prodigiOrder = {
    merchantReference: order.merchant_reference,
    shippingMethod: order.shipping_method || 'Standard',
    recipient: {
      name: order.customer_name,
      email: order.customer_email,
      phoneNumber: order.customer_phone || undefined,
      address: {
        line1: order.shipping_line1,
        line2: order.shipping_line2 || undefined,
        postalOrZipCode: order.shipping_postal_code,
        countryCode: order.shipping_country_code,
        townOrCity: order.shipping_city,
        stateOrCounty: order.shipping_state || undefined,
      },
    },
    items: [{
      sku: order.sku,
      copies: order.copies,
      sizing: order.sizing || 'fillPrintArea',
      attributes: order.attributes || {},
      assets: [{ printArea: 'default', url: order.image_url }],
    }],
    metadata: {
      galleryId: order.gallery_id,
      galleryImageId: order.gallery_image_id,
      localOrderId: order.id,
      stripeSessionId: order.stripe_session_id,
    },
  };

  try {
    // The studio account resolved at the top of this function, passed explicitly. Not
    // re-resolved: that is how it became the platform's.
    const response = await prodigiRequest('/orders', 'POST', prodigiOrder, { apiKey, baseUrl });
    await pool.query(`
      UPDATE print_orders SET
        prodigi_order_id = $1, status = $2, prodigi_response = $3,
        item_cost = $4, updated_at = NOW()
      WHERE id = $5
    `, [
      response.order?.id,
      response.outcome?.toLowerCase() || 'dispatched',
      JSON.stringify(response),
      response.order?.charges?.[0]?.totalCost?.amount || null,
      order.id,
    ]);
    return { ok: true, prodigiOrderId: response.order?.id };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Prodigi rejected the order' };
  }
}

/**
 * GET /order/:id
 * Get order status
 */
router.get('/order/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const result = await pool.query(`
        SELECT * FROM print_orders WHERE id = $1 OR prodigi_order_id = $1
      `, [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Order not found' });
      }

      const order = result.rows[0];

      // If we have a Prodigi order ID, get fresh status.
      //
      // The STUDIO's account: the order was placed on it, so the platform account cannot
      // see it — asking with the wrong key returns "not found" for an order that exists,
      // which reads as a lost parcel rather than a wrong credential.
      const { apiKey: statusApiKey } = await studioProdigiAccount();
      if (order.prodigi_order_id && statusApiKey) {
        try {
          const prodigiOrder = await prodigiRequest(`/orders/${order.prodigi_order_id}`);
          
          // Update tracking info if available
          if (prodigiOrder.order?.shipments?.length > 0) {
            const shipment = prodigiOrder.order.shipments[0];
            await pool.query(`
              UPDATE print_orders SET
                status = $1,
                tracking_url = $2,
                tracking_number = $3,
                carrier = $4,
                shipped_at = $5,
                updated_at = NOW()
              WHERE id = $6
            `, [
              prodigiOrder.order.status?.stage?.toLowerCase(),
              shipment.tracking?.url,
              shipment.tracking?.number,
              shipment.carrier?.name,
              shipment.dispatchDate,
              order.id,
            ]);
          }

          return res.json({
            ...order,
            prodigiStatus: prodigiOrder.order?.status,
            shipments: prodigiOrder.order?.shipments,
          });
        } catch (prodigiError) {
          console.error('[Prodigi] Error fetching order status:', prodigiError);
        }
      }

      res.json(order);
    } catch (error) {
      console.error('[Prodigi] Error fetching order:', error);
      res.status(500).json({ error: 'Failed to fetch order' });
    }
  });

/**
 * GET /orders
 * Get all print orders (admin)
 */
router.get('/orders', async (req: Request, res: Response) => {
    try {
      const { galleryId, status, limit = 50, offset = 0 } = req.query;

      let query = `
        SELECT po.*, g.title as gallery_title, gi.filename as image_filename
        FROM print_orders po
        LEFT JOIN galleries g ON po.gallery_id = g.id
        LEFT JOIN gallery_images gi ON po.gallery_image_id = gi.id
        WHERE 1=1
      `;
      const params: any[] = [];
      let paramIndex = 1;

      if (galleryId) {
        query += ` AND po.gallery_id = $${paramIndex++}`;
        params.push(galleryId);
      }

      if (status) {
        query += ` AND po.status = $${paramIndex++}`;
        params.push(status);
      }

      query += ` ORDER BY po.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
      params.push(parseInt(limit as string), parseInt(offset as string));

      const result = await pool.query(query, params);
      
      // Get total count
      const countResult = await pool.query(`
        SELECT COUNT(*) FROM print_orders
        ${galleryId ? 'WHERE gallery_id = $1' : ''}
        ${status ? (galleryId ? 'AND' : 'WHERE') + ' status = $' + (galleryId ? '2' : '1') : ''}
      `, galleryId && status ? [galleryId, status] : galleryId ? [galleryId] : status ? [status] : []);

      res.json({
        orders: result.rows,
        total: parseInt(countResult.rows[0].count),
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
      });
    } catch (error) {
      console.error('[Prodigi] Error fetching orders:', error);
      res.status(500).json({ error: 'Failed to fetch orders' });
    }
  });

/**
 * POST /webhook
 * Prodigi callback webhook for order updates
 */
router.post('/webhook', async (req: Request, res: Response) => {
    try {
      const event = req.body;
      console.log('[Prodigi] Webhook received:', event.type, event.subject);

      const orderId = event.subject; // Prodigi order ID
      const orderData = event.data?.order;

      if (!orderId || !orderData) {
        return res.status(200).json({ received: true }); // Acknowledge but ignore
      }

      // Update our order record
      const status = orderData.status?.stage?.toLowerCase() || 'unknown';
      const shipment = orderData.shipments?.[0];

      await pool.query(`
        UPDATE print_orders SET
          status = $1,
          tracking_url = $2,
          tracking_number = $3,
          carrier = $4,
          shipped_at = $5,
          completed_at = $6,
          prodigi_response = $7,
          updated_at = NOW()
        WHERE prodigi_order_id = $8
      `, [
        status,
        shipment?.tracking?.url,
        shipment?.tracking?.number,
        shipment?.carrier?.name,
        shipment?.dispatchDate,
        status === 'complete' ? new Date() : null,
        JSON.stringify(event),
        orderId,
      ]);

      res.status(200).json({ received: true });
    } catch (error) {
      console.error('[Prodigi] Webhook error:', error);
      res.status(200).json({ received: true, error: 'Processing error' });
  }
});

console.log('[Prodigi] Print ordering routes registered');

export default router;
