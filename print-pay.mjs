import fs from 'fs';
const F = 'server/routes/prodigi.ts';
const raw = fs.readFileSync(F, 'utf8');
const eol = raw.includes('\r\n') ? '\r\n' : '\n';
const lines = raw.split(/\r?\n/);

// Replace from "const localOrderId" (503) through the route's closing "});" (591) with:
//  - marking the order awaiting_payment and returning a Stripe checkout URL
//  - a separate exported dispatchPrintOrder() the webhook calls after payment
const FIRST = 503;
const LAST = 591;

if (!lines[FIRST - 1].includes('const localOrderId = orderRecord.rows[0].id;')) {
  console.log('ABORT first: ' + JSON.stringify(lines[FIRST - 1])); process.exit(1);
}
if (lines[LAST - 1] !== '  });') {
  console.log('ABORT last: ' + JSON.stringify(lines[LAST - 1])); process.exit(1);
}
const block = lines.slice(FIRST - 1, LAST).join('\n');
if (!block.includes("prodigiRequest('/orders', 'POST', prodigiOrder)")) {
  console.log('ABORT: that is not the dispatch block'); process.exit(1);
}

const repl = [
  '      const localOrderId = orderRecord.rows[0].id;',
  '',
  '      // STOP HERE. This route used to call Prodigi directly from this point, which is',
  '      // how an unpaid order reached a printing press. It now only records the order and',
  '      // hands back a Stripe checkout URL; the dispatch happens in the webhook, after the',
  '      // money has actually arrived. See server/lib/printCheckout.ts.',
  '      const checkout = await createPrintCheckoutSession({',
  '        orderId: localOrderId,',
  '        sku,',
  '        copies,',
  '        gallerySlug,',
  '        customerEmail: email,',
  '      });',
  '',
  '      if (!checkout.ok) {',
  '        // No session means no way to pay, so the order must not sit around looking live.',
  "        await pool.query(`UPDATE print_orders SET status = 'checkout_failed' WHERE id = $1`, [localOrderId])",
  '          .catch(() => {});',
  '        return res.status(503).json({ error: checkout.error, message: checkout.message });',
  '      }',
  '',
  '      res.json({',
  '        success: true,',
  '        orderId: localOrderId,',
  '        // The client redirects here. Nothing is printed until Stripe says this was paid.',
  '        checkoutUrl: checkout.checkoutUrl,',
  '        requiresPayment: true,',
  '      });',
  '    } catch (error: any) {',
  "      console.error('[Prodigi] Order creation error:', error);",
  "      res.status(500).json({ error: error.message || 'Failed to create order' });",
  '    }',
  '  });',
  '',
  '/**',
  ' * Send a PAID order to the print lab.',
  ' *',
  ' * Split out of POST /order so the Stripe webhook can call it, which is the only caller',
  ' * that should exist: dispatch must follow payment, never precede it. Everything it needs',
  ' * comes from the stored row rather than from a request, so nothing a browser sent can',
  ' * influence what gets printed or where it is posted.',
  ' *',
  ' * The caller is responsible for having CLAIMED the row first',
  ' * (claimPrintOrderForDispatch) — that is what makes a Stripe retry a no-op.',
  ' */',
  'export async function dispatchPrintOrder(order: any): Promise<{ ok: boolean; prodigiOrderId?: string; error?: string }> {',
  '  const { apiKey } = await getProdigiConfig();',
  '  if (!apiKey) {',
  '    // Paid, but the studio has not connected Prodigi. Recorded honestly rather than',
  '    // reported as dispatched.',
  "    await pool.query(`UPDATE print_orders SET status = 'paid_no_lab', updated_at = NOW() WHERE id = $1`, [order.id]);",
  "    return { ok: false, error: 'Prodigi is not connected, so the order was not sent to the lab.' };",
  '  }',
  '',
  '  const prodigiOrder = {',
  '    merchantReference: order.merchant_reference,',
  "    shippingMethod: order.shipping_method || 'Standard',",
  '    recipient: {',
  '      name: order.customer_name,',
  '      email: order.customer_email,',
  '      phoneNumber: order.customer_phone || undefined,',
  '      address: {',
  '        line1: order.shipping_line1,',
  '        line2: order.shipping_line2 || undefined,',
  '        postalOrZipCode: order.shipping_postal_code,',
  '        countryCode: order.shipping_country_code,',
  '        townOrCity: order.shipping_city,',
  '        stateOrCounty: order.shipping_state || undefined,',
  '      },',
  '    },',
  '    items: [{',
  '      sku: order.sku,',
  '      copies: order.copies,',
  "      sizing: order.sizing || 'fillPrintArea',",
  '      attributes: order.attributes || {},',
  "      assets: [{ printArea: 'default', url: order.image_url }],",
  '    }],',
  '    metadata: {',
  '      galleryId: order.gallery_id,',
  '      galleryImageId: order.gallery_image_id,',
  '      localOrderId: order.id,',
  '      stripeSessionId: order.stripe_session_id,',
  '    },',
  '  };',
  '',
  '  try {',
  "    const response = await prodigiRequest('/orders', 'POST', prodigiOrder);",
  '    await pool.query(`',
  '      UPDATE print_orders SET',
  '        prodigi_order_id = $1, status = $2, prodigi_response = $3,',
  '        item_cost = $4, updated_at = NOW()',
  '      WHERE id = $5',
  '    `, [',
  '      response.order?.id,',
  "      response.outcome?.toLowerCase() || 'dispatched',",
  '      JSON.stringify(response),',
  '      response.order?.charges?.[0]?.totalCost?.amount || null,',
  '      order.id,',
  '    ]);',
  '    return { ok: true, prodigiOrderId: response.order?.id };',
  '  } catch (e: any) {',
  "    return { ok: false, error: e?.message || 'Prodigi rejected the order' };",
  '  }',
  '}',
];

let s = [...lines.slice(0, FIRST - 1), ...repl, ...lines.slice(LAST)].join(eol);

// The route needs the gallery slug for the Stripe return URLs.
const slugAnchor = '      const printUrl: string = imageRow.rows[0].url;';
if (s.indexOf(slugAnchor) < 0) { console.log('ABORT: printUrl anchor missing'); process.exit(1); }
s = s.replace(slugAnchor, [
  slugAnchor,
  '',
  '      // Where Stripe should send the buyer back to.',
  '      const slugRow = await pool.query(`SELECT slug FROM galleries WHERE id = $1`, [galleryId || null])',
  '        .catch(() => ({ rows: [] as any[] }));',
  '      const gallerySlug: string | null = slugRow.rows?.[0]?.slug || null;',
].join(eol));

s = s.replace(
  "import { parseProdigiSheet, applyMarkup } from '../lib/prodigiSheet';",
  "import { parseProdigiSheet, applyMarkup } from '../lib/prodigiSheet';" + eol +
  "import { createPrintCheckoutSession } from '../lib/printCheckout';",
);

fs.writeFileSync(F, s);
console.log('ok — order route charges; dispatch extracted for the webhook');
