import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';

dotenv.config();

const sql = neon(process.env.DATABASE_URL!);

async function checkVoucherSales() {
  try {
    console.log('\n📊 Checking Voucher Sales in Database...\n');
    
    // Check all voucher sales
    const allSales = await sql`
      SELECT 
        vs.id,
        vs.voucher_code,
        vs.purchaser_name,
        vs.final_amount,
        vs.payment_status,
        vs.created_at,
        vp.name as product_name
      FROM voucher_sales vs
      LEFT JOIN voucher_products vp ON vs.product_id = vp.id
      ORDER BY vs.created_at DESC
    `;
    
    console.log(`Found ${allSales.length} voucher sales:\n`);
    
    let total = 0;
    allSales.forEach((sale, index) => {
      const amount = parseFloat(sale.final_amount || '0');
      total += amount;
      console.log(`${index + 1}. ${sale.voucher_code}`);
      console.log(`   Product: ${sale.product_name || 'N/A'}`);
      console.log(`   Purchaser: ${sale.purchaser_name || 'N/A'}`);
      console.log(`   Amount: €${amount.toFixed(2)}`);
      console.log(`   Status: ${sale.payment_status}`);
      console.log(`   Date: ${sale.created_at}`);
      console.log('');
    });
    
    console.log(`💰 Total Revenue: €${total.toFixed(2)}\n`);
    
    // Check October 2025 specifically
    const octoberSales = await sql`
      SELECT 
        COUNT(*) as count,
        SUM(CASE WHEN payment_status = 'paid' THEN final_amount::numeric ELSE 0 END) as total
      FROM voucher_sales
      WHERE created_at >= '2025-10-01'::timestamp 
        AND created_at < '2025-11-01'::timestamp
    `;
    
    console.log('📅 October 2025 Sales:');
    console.log(`   Count: ${octoberSales[0].count}`);
    console.log(`   Total: €${parseFloat(octoberSales[0].total || '0').toFixed(2)}\n`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkVoucherSales();
