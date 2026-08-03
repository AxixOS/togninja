const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function deleteTestProducts() {
  try {
    console.log('🔍 Searching for test products...');
    
    // Find products with "test" or "delete" in the name (case insensitive)
    const findQuery = `
      SELECT id, name, price, created_at 
      FROM voucher_products 
      WHERE LOWER(name) LIKE '%test%' OR LOWER(name) LIKE '%delete%'
      ORDER BY created_at DESC
    `;
    
    const result = await pool.query(findQuery);
    
    if (result.rows.length === 0) {
      console.log('✅ No test products found.');
      await pool.end();
      return;
    }
    
    console.log(`\n📦 Found ${result.rows.length} test product(s):`);
    result.rows.forEach((product, idx) => {
      console.log(`  ${idx + 1}. "${product.name}" (ID: ${product.id}, Price: €${product.price})`);
    });
    
    console.log('\n🗑️  Deleting test products (including related sales)...');
    
    for (const product of result.rows) {
      // First check if there are any sales
      const salesCheck = await pool.query(
        'SELECT COUNT(*) as count FROM voucher_sales WHERE product_id = $1',
        [product.id]
      );
      
      const salesCount = parseInt(salesCheck.rows[0].count);
      
      if (salesCount > 0) {
        console.log(`  📋 Found ${salesCount} sales record(s) for "${product.name}"`);
        
        // Delete sales records first
        await pool.query('DELETE FROM voucher_sales WHERE product_id = $1', [product.id]);
        console.log(`  ✅ Deleted ${salesCount} sales record(s)`);
      }
      
      // Now delete the product
      const deleteQuery = 'DELETE FROM voucher_products WHERE id = $1 RETURNING name';
      const deleteResult = await pool.query(deleteQuery, [product.id]);
      
      if (deleteResult.rows[0]) {
        console.log(`  ✅ Deleted product: "${deleteResult.rows[0].name}"`);
      }
    }
    
    console.log('\n✅ All test products deleted successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

deleteTestProducts();
