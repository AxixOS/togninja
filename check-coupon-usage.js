require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function check() {
  try {
    // Check sales with coupon data
    console.log('\n=== Sales with coupon data ===');
    const salesWithCoupon = await pool.query(`
      SELECT purchaser_name, original_amount, discount_amount, final_amount, coupon_id, coupon_code 
      FROM voucher_sales 
      WHERE coupon_code IS NOT NULL OR coupon_id IS NOT NULL 
      ORDER BY created_at DESC LIMIT 10
    `);
    console.log('Sales with coupon:', salesWithCoupon.rows.length);
    if (salesWithCoupon.rows.length > 0) {
      console.log(JSON.stringify(salesWithCoupon.rows, null, 2));
    }

    // Check all sales discount amounts
    console.log('\n=== All sales with discount > 0 ===');
    const salesWithDiscount = await pool.query(`
      SELECT purchaser_name, original_amount, discount_amount, final_amount, coupon_id, coupon_code 
      FROM voucher_sales 
      WHERE discount_amount > 0
      ORDER BY created_at DESC LIMIT 10
    `);
    console.log('Sales with discount > 0:', salesWithDiscount.rows.length);
    if (salesWithDiscount.rows.length > 0) {
      console.log(JSON.stringify(salesWithDiscount.rows, null, 2));
    }

    // Check coupons
    console.log('\n=== Available Coupons ===');
    const coupons = await pool.query(`SELECT code, name, discount_type, discount_value FROM discount_coupons LIMIT 10`);
    console.log(JSON.stringify(coupons.rows, null, 2));

    // Check recent 5 sales
    console.log('\n=== Recent 5 sales ===');
    const recent = await pool.query(`
      SELECT purchaser_name, original_amount, discount_amount, final_amount, coupon_id, coupon_code, created_at
      FROM voucher_sales 
      ORDER BY created_at DESC LIMIT 5
    `);
    console.log(JSON.stringify(recent.rows, null, 2));

  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await pool.end();
  }
}

check();
