const {Pool}=require('@neondatabase/serverless');
require('dotenv').config();
const pool=new Pool({connectionString:process.env.DATABASE_URL});
pool.query("SELECT id, voucher_code, stripe_session_id, stripe_payment_intent_id, custom_image, design_image, personalization_data, payment_intent_id, created_at FROM voucher_sales WHERE voucher_code='V-BAE2BEDF'")
  .then(r=>{console.log(JSON.stringify(r.rows[0],null,2));pool.end()})
  .catch(e=>{console.error(e.message);pool.end()});
