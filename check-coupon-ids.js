const { neon } = require('@neondatabase/serverless');
require('dotenv').config();

const sql = neon(process.env.DATABASE_URL);

(async () => {
  try {
    const rows = await sql`SELECT id, code, name FROM discount_coupons LIMIT 5`;
    console.log('Coupons in database:');
    console.log(JSON.stringify(rows, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
  }
})();
