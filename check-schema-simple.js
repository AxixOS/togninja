const { neon } = require('@neondatabase/serverless');
require('dotenv').config();

const sql = neon(process.env.DATABASE_URL);

async function checkSchema() {
  console.log('\n📋 Checking voucher_products table schema...\n');
  
  const columns = await sql`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'voucher_products'
    ORDER BY ordinal_position
  `;
  
  console.log('Current columns:');
  columns.forEach(col => console.log(`  - ${col.column_name} (${col.data_type})`));
  
  console.log('\n📦 Current products:');
  const products = await sql`SELECT id, name, category, price FROM voucher_products LIMIT 5`;
  products.forEach(p => console.log(`  - ${p.name} (${p.category}) - €${p.price}`));
}

checkSchema()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Error:', err.message);
    process.exit(1);
  });
