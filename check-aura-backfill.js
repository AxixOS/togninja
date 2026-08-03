require('dotenv').config();
const { Pool } = require('@neondatabase/serverless');
const p = new Pool({ connectionString: process.env.DATABASE_URL });
p.query("SELECT id, custom_image, design_image, personalization_data FROM voucher_sales WHERE stripe_session_id='cs_live_a1boifsfBPNBmfTMRQ5ESwOwLwoQ3Ze32wm2wLGY8tNGcvnX333bn2pURN'")
  .then(r => { console.log(JSON.stringify(r.rows[0], null, 2)); p.end(); })
  .catch(e => { console.error(e); p.end(); });
