const Stripe = require('stripe');
require('dotenv').config();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

(async () => {
  const session = await stripe.checkout.sessions.retrieve('cs_live_a1boifsfBPNBmfTMRQ5ESwOwLwoQ3Ze32wm2wLGY8tNGcvnX333bn2pURN');
  const m = session.metadata || {};
  console.log('=== STRIPE SESSION METADATA ===');
  console.log('All keys:', Object.keys(m));
  console.log('\nImage-related:');
  console.log('  custom_image:', m.custom_image || '(EMPTY)');
  console.log('  design_image:', m.design_image || '(EMPTY)');
  console.log('  design_template_id:', m.design_template_id || '(EMPTY)');
  console.log('  product_hero_image:', m.product_hero_image || '(EMPTY)');
  console.log('\nOther personalization:');
  console.log('  recipient_name:', m.recipient_name || '(EMPTY)');
  console.log('  from_name:', m.from_name || '(EMPTY)');
  console.log('  message:', m.message || '(EMPTY)');
  console.log('  sku:', m.sku || '(EMPTY)');
  console.log('  product_id:', m.product_id || '(EMPTY)');
  console.log('  product_name:', m.product_name || '(EMPTY)');
  console.log('  voucher_id:', m.voucher_id || '(EMPTY)');
  console.log('\nFull metadata:', JSON.stringify(m, null, 2));
})().catch(e => console.error('ERR:', e.message));
