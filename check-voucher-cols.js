const {Pool}=require('@neondatabase/serverless');
require('dotenv').config();
const pool=new Pool({connectionString:process.env.DATABASE_URL});
pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='voucher_sales' ORDER BY ordinal_position")
  .then(r=>{r.rows.forEach(c=>console.log(c.column_name,'-',c.data_type));pool.end()})
  .catch(e=>{console.error(e.message);pool.end()});
