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

const router = Router();

// Prodigi config is resolved PER REQUEST from the per-tenant config-reader (DB-first,
// env fallback), so each studio uses its OWN key + sandbox/production environment.
// (Was a module-level process.env.PRODIGI_API_KEY keyed off NODE_ENV — host-level, wrong
// for a multi-tenant product image.)
export async function getProdigiConfig(): Promise<{ apiKey: string | null; baseUrl: string }> {
  const apiKey = await config.get('prodigi_api_key');
  const env = ((await config.get('prodigi_environment')) || 'sandbox').toLowerCase();
  const baseUrl = env === 'production'
    ? 'https://api.prodigi.com/v4.0'
    : 'https://api.sandbox.prodigi.com/v4.0';
  return { apiKey, baseUrl };
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

// Helper to make Prodigi API requests (resolves the tenant key + base URL each call).
async function prodigiRequest(endpoint: string, method: string = 'GET', body?: any) {
  const { apiKey, baseUrl } = await getProdigiConfig();
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
              width_inches, height_inches, is_active, sort_order
       FROM print_products ORDER BY sort_order, name`,
    );
    res.json({ products: result.rows.map((p: any) => ({ ...p, basePrice: p.base_price != null ? parseFloat(p.base_price) : null })) });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /catalog — add a product (validate SKU via Prodigi; studio sets the sell price).
router.post('/catalog', async (req: Request, res: Response) => {
  try {
    const { sku, name, basePrice, currency = 'EUR', category = 'prints', validate = true } = req.body;
    if (!sku) return res.status(400).json({ error: 'SKU is required' });

    let details: any = { name: name || sku, description: '', widthInches: null, heightInches: null, attributes: {} };
    if (validate) {
      const { apiKey } = await getProdigiConfig();
      if (apiKey) {
        try {
          details = { ...details, ...(await fetchProdigiProduct(sku)) };
        } catch (e: any) {
          return res.status(400).json({ error: `Prodigi could not find SKU "${sku}": ${e?.message || 'lookup failed'}` });
        }
      }
    }

    const studioRow = await pool.query('SELECT id FROM studio_configs LIMIT 1');
    const studioId = studioRow.rows[0]?.id || null;
    const result = await pool.query(
      `INSERT INTO print_products
         (studio_id, sku, name, description, category, base_price, currency, width_inches, height_inches, attributes, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,true) RETURNING id`,
      [studioId, sku, name || details.name, details.description, category,
       basePrice != null ? parseFloat(basePrice) : null, currency, details.widthInches, details.heightInches,
       JSON.stringify(details.attributes || {})],
    );
    res.json({ ok: true, id: result.rows[0].id });
  } catch (error: any) {
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
        printUrl,
        shippingMethod,
      ]);

      const localOrderId = orderRecord.rows[0].id;

      const { apiKey } = await getProdigiConfig();
      if (!apiKey) {
        // Return mock order if no API key (for testing)
        await pool.query(`
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
            url: printUrl,
          }],
        }],
        metadata: {
          galleryId,
          galleryImageId,
          localOrderId,
          source: `${merchantPrefix.toLowerCase()}-print`,
        },
      };

      console.log('[Prodigi] Creating order:', JSON.stringify(prodigiOrder, null, 2));

      const response = await prodigiRequest('/orders', 'POST', prodigiOrder);
      
      // Update our order record with Prodigi response
      await pool.query(`
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
    } catch (error: any) {
      console.error('[Prodigi] Order creation error:', error);
      res.status(500).json({ error: error.message || 'Failed to create order' });
    }
  });

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

      // If we have a Prodigi order ID, get fresh status
      const { apiKey: statusApiKey } = await getProdigiConfig();
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
