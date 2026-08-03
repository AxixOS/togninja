import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

async function checkLatestVoucher() {
  try {
    console.log('🔍 Checking latest voucher in database...\n');

    const vouchers = await sql`
      SELECT 
        voucher_code,
        purchaser_name,
        recipient_name,
        gift_message,
        custom_image,
        design_image,
        final_amount,
        created_at
      FROM voucher_sales
      ORDER BY created_at DESC
      LIMIT 3
    `;

    console.log(`📋 Found ${vouchers.length} most recent vouchers:\n`);
    
    vouchers.forEach((v, i) => {
      console.log(`${i + 1}. Code: ${v.voucher_code}`);
      console.log(`   Purchaser: ${v.purchaser_name}`);
      console.log(`   Recipient: ${v.recipient_name}`);
      console.log(`   Amount: €${v.final_amount}`);
      console.log(`   Message: ${v.gift_message || 'None'}`);
      console.log(`   Custom Image: ${v.custom_image || '❌ NULL'}`);
      console.log(`   Design Image: ${v.design_image || '❌ NULL'}`);
      console.log(`   Created: ${v.created_at}`);
      console.log();
    });
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

checkLatestVoucher();
