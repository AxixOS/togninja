"use strict";
/**
 * Prodigi Print-on-Demand Integration Routes
 *
 * Enables customers to order prints directly from gallery images
 * using Prodigi's fulfillment network.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const router = (0, express_1.Router)();
// Prodigi API configuration
const PRODIGI_API_URL = process.env.NODE_ENV === 'production'
    ? 'https://api.prodigi.com/v4.0'
    : 'https://api.sandbox.prodigi.com/v4.0';
const PRODIGI_API_KEY = process.env.PRODIGI_API_KEY;
// Helper to make Prodigi API requests
async function prodigiRequest(endpoint, method = 'GET', body) {
    const response = await fetch(`${PRODIGI_API_URL}${endpoint}`, {
        method,
        headers: {
            'X-API-Key': PRODIGI_API_KEY || '',
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
router.get('/products', async (req, res) => {
    try {
        const { category } = req.query;
        let query = `
        SELECT id, sku, name, description, category, 
               width_inches, height_inches, base_price, currency,
               attributes, sort_order
        FROM print_products 
        WHERE is_active = true
      `;
        const params = [];
        if (category) {
            query += ' AND category = $1';
            params.push(category);
        }
        query += ' ORDER BY category, sort_order, base_price';
        const result = await db_1.pool.query(query, params);
        // Group by category
        const grouped = result.rows.reduce((acc, product) => {
            const cat = product.category || 'other';
            if (!acc[cat])
                acc[cat] = [];
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
    }
    catch (error) {
        console.error('[Prodigi] Error fetching products:', error);
        res.status(500).json({ error: 'Failed to fetch print products' });
    }
});
/**
 * POST /quote
 * Get a price quote from Prodigi
 */
router.post('/quote', async (req, res) => {
    try {
        const { sku, copies = 1, destinationCountryCode = 'AT', currencyCode = 'EUR' } = req.body;
        if (!sku) {
            return res.status(400).json({ error: 'SKU is required' });
        }
        if (!PRODIGI_API_KEY) {
            // Return estimated price from local products if no API key
            const product = await db_1.pool.query('SELECT * FROM print_products WHERE sku = $1', [sku]);
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
    }
    catch (error) {
        console.error('[Prodigi] Quote error:', error);
        res.status(500).json({ error: error.message || 'Failed to get quote' });
    }
});
/**
 * POST /order
 * Create a print order with Prodigi
 */
router.post('/order', async (req, res) => {
    try {
        const { galleryId, galleryImageId, imageUrl, sku, copies = 1, shippingMethod = 'Standard', customer, attributes = {}, } = req.body;
        // Validate required fields
        if (!imageUrl || !sku || !customer) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        const { name, email, phone, address } = customer;
        if (!name || !email || !address?.line1 || !address?.city || !address?.postalCode || !address?.countryCode) {
            return res.status(400).json({ error: 'Incomplete customer or address information' });
        }
        // Generate merchant reference
        const merchantReference = `NAF-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        // Create order record in our database first
        const orderRecord = await db_1.pool.query(`
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
            'pending',
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
            imageUrl,
            shippingMethod,
        ]);
        const localOrderId = orderRecord.rows[0].id;
        if (!PRODIGI_API_KEY) {
            // Return mock order if no API key (for testing)
            await db_1.pool.query(`
          UPDATE print_orders SET status = 'test_mode' WHERE id = $1
        `, [localOrderId]);
            return res.json({
                success: true,
                testMode: true,
                orderId: localOrderId,
                message: 'Order created in test mode (no Prodigi API key)',
            });
        }
        // Create order with Prodigi
        const prodigiOrder = {
            merchantReference,
            shippingMethod,
            recipient: {
                name,
                email,
                phoneNumber: phone,
                address: {
                    line1: address.line1,
                    line2: address.line2,
                    townOrCity: address.city,
                    stateOrCounty: address.state,
                    postalOrZipCode: address.postalCode,
                    countryCode: address.countryCode,
                },
            },
            items: [{
                    merchantReference: `item-${localOrderId}`,
                    sku,
                    copies,
                    sizing: 'fillPrintArea',
                    attributes,
                    assets: [{
                            printArea: 'default',
                            url: imageUrl,
                        }],
                }],
            metadata: {
                galleryId,
                galleryImageId,
                localOrderId,
                source: 'newagefotografie-gallery',
            },
        };
        console.log('[Prodigi] Creating order:', JSON.stringify(prodigiOrder, null, 2));
        const response = await prodigiRequest('/orders', 'POST', prodigiOrder);
        // Update our order record with Prodigi response
        await db_1.pool.query(`
        UPDATE print_orders SET
          prodigi_order_id = $1,
          status = $2,
          prodigi_response = $3,
          item_cost = $4,
          shipping_cost = $5,
          total_cost = $6,
          updated_at = NOW()
        WHERE id = $7
      `, [
            response.order?.id,
            response.outcome?.toLowerCase() || 'created',
            JSON.stringify(response),
            response.order?.charges?.[0]?.totalCost?.amount || null,
            null, // shipping cost will be updated when available
            null, // total cost will be calculated
            localOrderId,
        ]);
        res.json({
            success: true,
            orderId: localOrderId,
            prodigiOrderId: response.order?.id,
            outcome: response.outcome,
            status: response.order?.status,
        });
    }
    catch (error) {
        console.error('[Prodigi] Order creation error:', error);
        res.status(500).json({ error: error.message || 'Failed to create order' });
    }
});
/**
 * GET /order/:id
 * Get order status
 */
router.get('/order/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db_1.pool.query(`
        SELECT * FROM print_orders WHERE id = $1 OR prodigi_order_id = $1
      `, [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Order not found' });
        }
        const order = result.rows[0];
        // If we have a Prodigi order ID, get fresh status
        if (order.prodigi_order_id && PRODIGI_API_KEY) {
            try {
                const prodigiOrder = await prodigiRequest(`/orders/${order.prodigi_order_id}`);
                // Update tracking info if available
                if (prodigiOrder.order?.shipments?.length > 0) {
                    const shipment = prodigiOrder.order.shipments[0];
                    await db_1.pool.query(`
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
            }
            catch (prodigiError) {
                console.error('[Prodigi] Error fetching order status:', prodigiError);
            }
        }
        res.json(order);
    }
    catch (error) {
        console.error('[Prodigi] Error fetching order:', error);
        res.status(500).json({ error: 'Failed to fetch order' });
    }
});
/**
 * GET /orders
 * Get all print orders (admin)
 */
router.get('/orders', async (req, res) => {
    try {
        const { galleryId, status, limit = 50, offset = 0 } = req.query;
        let query = `
        SELECT po.*, g.title as gallery_title, gi.filename as image_filename
        FROM print_orders po
        LEFT JOIN galleries g ON po.gallery_id = g.id
        LEFT JOIN gallery_images gi ON po.gallery_image_id = gi.id
        WHERE 1=1
      `;
        const params = [];
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
        params.push(parseInt(limit), parseInt(offset));
        const result = await db_1.pool.query(query, params);
        // Get total count
        const countResult = await db_1.pool.query(`
        SELECT COUNT(*) FROM print_orders
        ${galleryId ? 'WHERE gallery_id = $1' : ''}
        ${status ? (galleryId ? 'AND' : 'WHERE') + ' status = $' + (galleryId ? '2' : '1') : ''}
      `, galleryId && status ? [galleryId, status] : galleryId ? [galleryId] : status ? [status] : []);
        res.json({
            orders: result.rows,
            total: parseInt(countResult.rows[0].count),
            limit: parseInt(limit),
            offset: parseInt(offset),
        });
    }
    catch (error) {
        console.error('[Prodigi] Error fetching orders:', error);
        res.status(500).json({ error: 'Failed to fetch orders' });
    }
});
/**
 * POST /webhook
 * Prodigi callback webhook for order updates
 */
router.post('/webhook', async (req, res) => {
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
        await db_1.pool.query(`
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
    }
    catch (error) {
        console.error('[Prodigi] Webhook error:', error);
        res.status(200).json({ received: true, error: 'Processing error' });
    }
});
console.log('[Prodigi] Print ordering routes registered');
exports.default = router;
