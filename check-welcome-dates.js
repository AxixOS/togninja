const { neon } = require('@neondatabase/serverless');
require('dotenv').config();

const sql = neon(process.env.DATABASE_URL);

(async () => {
  const r = await sql`SELECT code, start_date, end_date, starts_at, ends_at FROM discount_coupons WHERE code = 'WELCOME50'`;
  console.log(JSON.stringify(r, null, 2));
})();
