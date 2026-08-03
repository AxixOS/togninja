const { Pool } = require('@neondatabase/serverless');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function checkVoucherProducts() {
  try {
    console.log('🔍 Checking voucher products...\n');
    
    const result = await pool.query(`
      SELECT id, name, price, is_active, category, session_type, validity_period, created_at
      FROM voucher_products
      ORDER BY created_at DESC
    `);
    
    console.log(`✅ Found ${result.rows.length} voucher products:\n`);
    
    result.rows.forEach((product, index) => {
      console.log(`${index + 1}. ${product.name}`);
      console.log(`   Price: €${product.price}`);
      console.log(`   Active: ${product.is_active ? '✅ YES (visible on frontend)' : '❌ NO (hidden from frontend)'}`);
      console.log(`   Category: ${product.category || 'none'}`);
      console.log(`   Session Type: ${product.session_type || 'none'}`);
      console.log(`   Validity: ${product.validity_period} days`);
      console.log(`   Created: ${product.created_at}`);
      console.log('');
    });
    
    const activeCount = result.rows.filter(p => p.is_active).length;
    const inactiveCount = result.rows.filter(p => !p.is_active).length;
    
    console.log('📊 Summary:');
    console.log(`   Total products: ${result.rows.length}`);
    console.log(`   Active (visible on frontend): ${activeCount}`);
    console.log(`   Inactive (hidden from frontend): ${inactiveCount}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkVoucherProducts();
