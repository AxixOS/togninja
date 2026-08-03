require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const STUDIO_ID = '550e8400-e29b-41d4-a716-446655440000';

async function migrateManualPages() {
  try {
    console.log('Step 1: Creating manual_page_content table...\n');
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS manual_page_content (
        id SERIAL PRIMARY KEY,
        studio_id UUID NOT NULL,
        page_id VARCHAR(255) NOT NULL,
        language VARCHAR(10) DEFAULT 'de',
        draft_content JSONB DEFAULT '{}',
        published_content JSONB DEFAULT '{}',
        status VARCHAR(50) DEFAULT 'draft',
        published_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(studio_id, page_id, language)
      )
    `);
    
    console.log('✓ Table created\n');
    
    console.log('Step 2: Getting all pages from manual_pages table...\n');
    
    // Get all unique page_ids
    const pages = await pool.query(`
      SELECT DISTINCT page_id FROM manual_pages
    `);
    
    console.log(`Found ${pages.rows.length} pages to migrate\n`);
    
    for (const { page_id } of pages.rows) {
      console.log(`Migrating ${page_id}...`);
      
      // Get all content keys for this page
      const content = await pool.query(`
        SELECT content_key, content_value 
        FROM manual_pages 
        WHERE page_id = $1
      `, [page_id]);
      
      // Build the published_content JSON object
      const publishedContent = {};
      content.rows.forEach(row => {
        publishedContent[row.content_key] = row.content_value;
      });
      
      // Insert or update in manual_page_content table
      await pool.query(`
        INSERT INTO manual_page_content (
          studio_id, page_id, language, 
          published_content, draft_content, 
          status, published_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
        ON CONFLICT (studio_id, page_id, language) 
        DO UPDATE SET
          published_content = EXCLUDED.published_content,
          draft_content = EXCLUDED.draft_content,
          status = EXCLUDED.status,
          published_at = EXCLUDED.published_at,
          updated_at = NOW()
      `, [
        STUDIO_ID,
        page_id,
        'de',
        JSON.stringify(publishedContent),
        JSON.stringify(publishedContent), // Same as published for now
        'published'
      ]);
      
      console.log(`  ✓ Migrated ${Object.keys(publishedContent).length} keys`);
    }
    
    console.log('\n✓ Migration complete!\n');
    
    // Verify
    const verification = await pool.query(`
      SELECT page_id, language, 
             jsonb_object_keys(published_content) as key_count
      FROM manual_page_content 
      WHERE studio_id = $1
      GROUP BY page_id, language, published_content
      ORDER BY page_id
    `, [STUDIO_ID]);
    
    console.log('Verification:');
    const summary = {};
    verification.rows.forEach(row => {
      if (!summary[row.page_id]) summary[row.page_id] = 0;
      summary[row.page_id]++;
    });
    
    Object.entries(summary).forEach(([pageId, count]) => {
      console.log(`  ${pageId}: ${count} keys`);
    });
    
    await pool.end();
    console.log('\n✅ All manual pages migrated successfully!');
    
  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
    await pool.end();
    process.exit(1);
  }
}

migrateManualPages();
