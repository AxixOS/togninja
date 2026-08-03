const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkManualPages() {
  try {
    // Check if table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'manual_pages'
      )
    `);
    
    if (!tableCheck.rows[0].exists) {
      console.log('❌ manual_pages table does not exist');
      await pool.end();
      return;
    }
    
    console.log('✓ manual_pages table exists\n');
    
    // Get all pages
    const pages = await pool.query('SELECT page_id, COUNT(*) as content_keys FROM manual_pages GROUP BY page_id');
    console.log(`Found ${pages.rows.length} manual pages:\n`);
    
    for (const page of pages.rows) {
      console.log(`  • ${page.page_id}: ${page.content_keys} content keys`);
    }
    
    // Get familienfotos page specifically
    console.log('\n--- Familienfotos Page Content ---');
    const familienfotos = await pool.query(`
      SELECT content_key, content_value 
      FROM manual_pages 
      WHERE page_id = 'familienfotos' 
        AND (content_key LIKE '%Image%' OR content_key LIKE '%image%')
      ORDER BY content_key
    `);
    
    console.log(`\nFound ${familienfotos.rows.length} image-related keys:`);
    familienfotos.rows.forEach(row => {
      console.log(`  ${row.content_key}:`);
      console.log(`    ${row.content_value.substring(0, 80)}...`);
    });
    
    await pool.end();
  } catch (error) {
    console.error('Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

checkManualPages();
