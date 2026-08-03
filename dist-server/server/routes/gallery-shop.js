"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const serverless_1 = require("@neondatabase/serverless");
const router = (0, express_1.Router)();
const sql = (0, serverless_1.neon)(process.env.DATABASE_URL);
// Get print catalog for a studio
router.get('/print-catalog', async (req, res) => {
    try {
        // For now, use a default studio ID - in production this would come from auth
        const studioId = '550e8400-e29b-41d4-a716-446655440000';
        const products = await sql `
      SELECT id, sku, name, base_price, unit, variant_json, is_active
      FROM print_products 
      WHERE studio_id = ${studioId} 
      AND is_active = true
      ORDER BY name
    `;
        res.json(products);
    }
    catch (error) {
        console.error('Error fetching print catalog:', error);
        res.status(500).json({ error: 'Failed to fetch print catalog' });
    }
});
// Create gallery checkout
const checkoutSchema = zod_1.z.object({
    gallery_id: zod_1.z.string().uuid(),
    client_id: zod_1.z.string().uuid(),
    items: zod_1.z.array(zod_1.z.object({
        product_sku: zod_1.z.string(),
        qty: zod_1.z.number().int().min(1),
        variant: zod_1.z.record(zod_1.z.any()).default({})
    }))
});
router.post('/checkout', async (req, res) => {
    try {
        const data = checkoutSchema.parse(req.body);
        const studioId = '550e8400-e29b-41d4-a716-446655440000';
        // 1. Fetch product prices
        const skus = data.items.map(i => i.product_sku);
        const products = await sql `
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
        const lineItems = data.items.map(item => {
            const product = products.find((p) => p.sku === item.product_sku);
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
        await sql `
      INSERT INTO gallery_orders (
        id, studio_id, gallery_id, client_id, 
        status, total, currency
      ) VALUES (
        ${orderId}, ${studioId}, ${data.gallery_id}, ${data.client_id},
        'pending', ${totalAmount}, 'EUR'
      )
    `;
        // 4. Create order items
        for (const item of lineItems) {
            await sql `
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
            currency: 'EUR',
            checkout_url: `/gallery/${data.gallery_id}/order/${orderId}`,
            message: `Order created successfully for €${totalAmount.toFixed(2)}`
        });
    }
    catch (error) {
        console.error('Error creating checkout:', error);
        res.status(500).json({ error: 'Failed to create checkout' });
    }
});
// Get gallery orders
router.get('/orders/:galleryId', async (req, res) => {
    try {
        const { galleryId } = req.params;
        const studioId = '550e8400-e29b-41d4-a716-446655440000';
        const orders = await sql `
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
    }
    catch (error) {
        console.error('Error fetching gallery orders:', error);
        res.status(500).json({ error: 'Failed to fetch orders' });
    }
});
exports.default = router;
