import 'dotenv/config';
import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('neon.tech') ? { rejectUnauthorized: false } : undefined
});

async function checkVoucherImages() {
  try {
    const result = await pool.query(`
      SELECT 
        voucher_code,
        recipient_name,
        custom_image,
        design_image,
        created_at
      FROM voucher_sales
      ORDER BY created_at DESC
      LIMIT 10
    `);

    console.log('\n📊 Recent Vouchers and Their Images:\n');
    
    result.rows.forEach((row, i) => {
      console.log(`${i + 1}. ${row.voucher_code}`);
      console.log(`   Recipient: ${row.recipient_name}`);
      console.log(`   Custom Image: ${row.custom_image || 'NONE ❌'}`);
      console.log(`   Design Image: ${row.design_image || 'NONE ❌'}`);
      console.log(`   Date: ${row.created_at}`);
      console.log('');
    });

  } catch (error: any) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkVoucherImages();
