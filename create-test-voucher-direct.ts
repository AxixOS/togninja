import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found');
  process.exit(1);
}

const sql = neon(DATABASE_URL);

async function createTestVoucher() {
  try {
    console.log('\n🎫 Creating test voucher purchase in database...\n');
    
    const voucherCode = `DEMO-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    const validUntil = new Date();
    validUntil.setFullYear(validUntil.getFullYear() + 1);
    
    const result = await sql`
      INSERT INTO voucher_sales (
        product_id, purchaser_name, purchaser_email, recipient_name, 
        recipient_email, gift_message, voucher_code, original_amount,
        discount_amount, final_amount, currency, payment_intent_id,
        payment_status, payment_method, is_redeemed, valid_from, valid_until
      ) VALUES (
        '89fdea5d-1027-4713-b3e6-565eebc2ebfd',
        'John Smith',
        'buyer@test.com',
        'Anna Mueller',
        'anna@test.com',
        'Happy Birthday Anna! Enjoy your professional photoshoot!',
        ${voucherCode},
        '399.00',
        '0.00',
        '399.00',
        'EUR',
        ${'demo_' + Date.now()},
        'paid',
        'demo',
        false,
        NOW(),
        ${validUntil.toISOString()}
      )
      RETURNING *
    `;
    
    console.log('✅ SUCCESS! Test voucher created!\n');
    console.log('📋 Voucher Code:', voucherCode);
    console.log('👤 Purchaser:', result[0].purchaser_name);
    console.log('🎁 Recipient:', result[0].recipient_name);
    console.log('💰 Amount: €' + result[0].final_amount);
    console.log('📅 Valid Until:', new Date(result[0].valid_until).toLocaleDateString());
    
    console.log('\n🔄 Next Steps:');
    console.log('   1. Refresh your browser (Press F5)');
    console.log('   2. Click on the "Sales" tab');
    console.log('   3. You should see the voucher purchase!');
    console.log('');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

createTestVoucher();
