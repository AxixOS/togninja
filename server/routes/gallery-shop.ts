import { Router } from 'express';
import { z } from 'zod';
import { neon } from '../db-compat.js';

/**
 * This studio's id.
 *
 * Three routes in this file read
 *     process.env.STUDIO_ID || '550e8400-e29b-41d4-a716-446655440000'
 * and then filter print_products on it. That UUID is a demo placeholder, and STUDIO_ID is
 * not set on a real instance — while every WRITER of print_products stamps the studio's
 * actual studio_configs.id (575f04f5-… on the live tenant). So the gallery store filtered
 * on an id nothing had ever been written under, and could never return a single product no
 * matter how well stocked the shop was.
 *
 * This product is single-tenant — one database is one studio — so the id is simply the one
 * row in studio_configs, read the way every other correct reader in this codebase reads it.
 * The env var still wins when it is set, for anyone who genuinely relies on it.
 */
let _studioIdCache: { value: string | null; at: number } | null = null;
async function currentStudioId(): Promise<string | null> {
  const fromEnv = (process.env.STUDIO_ID || '').trim();
  if (fromEnv) return fromEnv;
  if (_studioIdCache && Date.now() - _studioIdCache.at < 60_000) return _studioIdCache.value;
  let value: string | null = null;
  try {
    const rows = await sql`SELECT id FROM studio_configs LIMIT 1`;
    value = (rows as any[])[0]?.id || null;
  } catch { /* a shop that cannot resolve the studio returns nothing, rather than throwing */ }
  _studioIdCache = { value, at: Date.now() };
  return value;
}

const router = Router();
const sql = neon(process.env.DATABASE_URL!);

// Get print catalog for a studio
router.get('/print-catalog', async (req, res) => {
  try {
    // The studio this instance belongs to. See currentStudioId() above for why this is
    const studioId = await currentStudioId();
    
    const products = await sql`
      SELECT id, sku, name, base_price, unit, variant_json, is_active
      FROM print_products 
      WHERE studio_id = ${studioId} 
      AND is_active = true
      ORDER BY name
    `;

    res.json(products);
  } catch (error) {
    console.error('Error fetching print catalog:', error);
    res.status(500).json({ error: 'Failed to fetch print catalog' });
  }
});

// Create gallery checkout
const checkoutSchema = z.object({
  gallery_id: z.string().uuid(),
  client_id: z.string().uuid(),
  items: z.array(z.object({
    product_sku: z.string(),
    qty: z.number().int().min(1),
    variant: z.record(z.any()).default({})
  }))
});

router.post('/checkout', async (req, res) => {
  try {
    const data = checkoutSchema.parse(req.body);
    const studioId = await currentStudioId();

    // 1. Fetch product prices
    const skus = data.items.map(i => i.product_sku);
    const products = await sql`
      SELECT * FROM print_products 
      WHERE studio_id = ${studioId} 
      AND sku = ANY(${skus})
      AND is_active = true
    `;

    if (products.length === 0) {
      return res.status(400).json({ error: 'No valid products found' });
    }

    // 2. Calculate total
    let totalAmount = 0;
    // One currency for the row, the response and the confirmation message. All three
    // used to say 'EUR' regardless of what the shop drawer had totalled.
    const { studioCurrencyCode, formatMoney } = await import('../lib/money');
    const orderCurrency = await studioCurrencyCode();

    const lineItems = data.items.map(item => {
      const product = products.find((p: any) => p.sku === item.product_sku);
      if (!product) {
        throw new Error(`Product not found: ${item.product_sku}`);
      }
      
      const lineTotal = Number(product.base_price) * item.qty;
      totalAmount += lineTotal;
      
      return {
        product_id: product.id,
        variant: item.variant,
        qty: item.qty,
        unit_price: Number(product.base_price),
        line_total: lineTotal
      };
    });

    // 3. Create order
    const orderId = crypto.randomUUID();
    await sql`
      INSERT INTO gallery_orders (
        id, studio_id, gallery_id, client_id, 
        status, total, currency
      ) VALUES (
        ${orderId}, ${studioId}, ${data.gallery_id}, ${data.client_id},
        -- The studio's own currency. This was the literal 'EUR', so a dollar studio's
        -- print orders were RECORDED in euros while the shop drawer that produced them
        -- totalled in dollars. The screen and the books disagreed about what was sold.
        'pending', ${totalAmount}, ${orderCurrency}
      )
    `;

    // 4. Create order items
    for (const item of lineItems) {
      await sql`
        INSERT INTO gallery_order_items (
          order_id, product_id, variant, qty, unit_price, line_total
        ) VALUES (
          ${orderId}, ${item.product_id}, ${JSON.stringify(item.variant)}, 
          ${item.qty}, ${item.unit_price}, ${item.line_total}
        )
      `;
    }

    // 5. Return checkout response
    res.json({
      success: true,
      order_id: orderId,
      total: totalAmount,
      currency: orderCurrency,
      checkout_url: `/gallery/${data.gallery_id}/order/${orderId}`,
      message: `Order created successfully for ${await formatMoney(totalAmount, orderCurrency)}`
    });

  } catch (error) {
    console.error('Error creating checkout:', error);
    res.status(500).json({ error: 'Failed to create checkout' });
  }
});

// Get gallery orders
router.get('/orders/:galleryId', async (req, res) => {
  try {
    const { galleryId } = req.params;
    const studioId = await currentStudioId();

    const orders = await sql`
      SELECT 
        go.*,
        array_agg(
          json_build_object(
            'product_name', pp.name,
            'qty', goi.qty,
            'unit_price', goi.unit_price,
            'line_total', goi.line_total
          )
        ) as items
      FROM gallery_orders go
      LEFT JOIN gallery_order_items goi ON go.id = goi.order_id
      LEFT JOIN print_products pp ON goi.product_id = pp.id
      WHERE go.studio_id = ${studioId} 
      AND go.gallery_id = ${galleryId}
      GROUP BY go.id
      ORDER BY go.created_at DESC
    `;

    res.json(orders);
  } catch (error) {
    console.error('Error fetching gallery orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

export default router;