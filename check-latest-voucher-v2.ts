import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

async function checkLatestVoucher() {
  try {
    console.log('🔍 Checking latest vouchers in database...\n');

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
    
    vouchers.forEach((v: any, i: number) => {
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

    if (vouchers.length > 0 && vouchers[0].custom_image) {
      console.log('✅ SUCCESS: Latest voucher HAS custom_image saved!');
      console.log(`\n🔗 Test PDF at:`);
      console.log(`   http://localhost:3001/api/vouchers/${vouchers[0].voucher_code}/pdf`);
    } else {
      console.log('❌ PROBLEM: Latest voucher does NOT have custom_image saved');
      console.log('   Server may need restart to pick up code changes');
    }
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

checkLatestVoucher();
