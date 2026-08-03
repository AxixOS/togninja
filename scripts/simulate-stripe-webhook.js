#!/usr/bin/env node
/**
 * Simulate Stripe webhook events in development (signature verification skipped when STRIPE_WEBHOOK_SECRET unset).
 * Usage:
 *   node scripts/simulate-stripe-webhook.js --type paid --invoice <invoice_id>
 *   node scripts/simulate-stripe-webhook.js --type expired --invoice <invoice_id>
 */
const http = require('http');
const args = process.argv.slice(2);
function arg(name, def){ const i = args.indexOf(`--${name}`); return i>=0 ? args[i+1] : def; }
const typeKey = arg('type','paid');
const invoiceId = arg('invoice');
if(!invoiceId){
  console.error('Missing --invoice <id>');
  process.exit(1);
}
let event;
if(typeKey === 'expired'){
  event = {
    id: 'evt_test_expired',
    type: 'checkout.session.expired',
    data: { object: { id: 'cs_test_expired', metadata: { invoice_id: invoiceId } } }
  };
} else {
  event = {
    id: 'evt_test_paid',
    type: 'checkout.session.completed',
    data: { object: { id: 'cs_test_paid', url: 'https://example.com/checkout', metadata: { invoice_id: invoiceId } } }
  };
}
const body = JSON.stringify(event);
const req = http.request({
  method: 'POST',
  host: '127.0.0.1',
  port: process.env.PORT || 5075,
  path: '/api/stripe/webhook',
  headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
}, res => {
  let data = '';
  res.on('data', c => data += c);
  res.on('end', () => {
    console.log('Response:', res.statusCode, data);
  });
});
req.on('error', e => console.error('Request error', e));
req.write(body);
req.end();
