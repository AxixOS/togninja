const { neonDb } = require('./database.js');

async function checkSchema() {
  try {
    console.log('\n📋 Checking voucher_products table schema...\n');
    
    const result = await neonDb.query(`
      SELECT column_name, data_type, character_maximum_length, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'voucher_products'
      ORDER BY ordinal_position
    `);
    
    console.log('Current columns:');
    console.table(result.rows);
    
    // Also check current products
    const products = await neonDb.query('SELECT id, name, description, image_url FROM voucher_products');
    console.log('\n📦 Current products:');
    console.table(products.rows);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkSchema();
