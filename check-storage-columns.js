require('dotenv').config();
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

sql`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'storage_usage' ORDER BY ordinal_position`
  .then(cols => { 
    console.log('storage_usage columns:');
    cols.forEach(c => console.log(`  - ${c.column_name}: ${c.data_type}`));
  })
  .catch(console.error);
