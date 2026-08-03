const { neon } = require('@neondatabase/serverless');
require('dotenv').config();

const sql = neon(process.env.DATABASE_URL);

(async () => {
  try {
    const rows = await sql`SELECT id, code, name, starts_at, ends_at, allowed_skus FROM discount_coupons LIMIT 3`;
    console.log('Coupon dates and products in database:');
    console.log(JSON.stringify(rows, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
  }
})();
