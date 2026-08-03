require('dotenv').config();
const https = require('https');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const STUDIO_ID = '550e8400-e29b-41d4-a716-446655440000';

function fetchFromHeroku(pageId) {
  return new Promise((resolve, reject) => {
    const url = `https://workingnewage-2eecd723a444.herokuapp.com/api/manual-pages/${pageId}`;
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`Failed to parse response: ${e.message}`));
        }
      });
    }).on('error', reject);
  });
}

async function syncAllPages() {
  try {
    // All possible page IDs to check
    const pageIds = [
      'schwangerschaftsfotos',
      'schwangerschaft',
      'maternity',
      'studio-fotografie',
      'business-portrait',
      'businessportrait'
    ];
    
    console.log('Checking all possible page IDs on Heroku...\n');
    
    let synced = 0;
    
    for (const pageId of pageIds) {
      try {
        console.log(`Checking ${pageId}...`);
        const herokuData = await fetchFromHeroku(pageId);
        
        if (!herokuData || !herokuData.publishedContent || Object.keys(herokuData.publishedContent).length === 0) {
          console.log(`  ⚠️  No content\n`);
          continue;
        }
        
        const publishedContent = herokuData.publishedContent;
        console.log(`  ✓ Found ${Object.keys(publishedContent).length} keys`);
        
        // Insert into database
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
          pageId,
          'de',
          JSON.stringify(publishedContent),
          JSON.stringify(publishedContent),
          'published'
        ]);
        
        console.log(`  ✓ Synced to database\n`);
        synced++;
        
      } catch (e) {
        console.log(`  ✗ Error: ${e.message}\n`);
      }
    }
    
    console.log(`\n✅ Successfully synced ${synced} pages!`);
    
    // Show all pages in database
    const result = await pool.query(`
      SELECT page_id, 
             jsonb_object_keys(published_content) as key
      FROM manual_page_content 
      WHERE studio_id = $1
      ORDER BY page_id
    `, [STUDIO_ID]);
    
    const summary = {};
    result.rows.forEach(row => {
      if (!summary[row.page_id]) summary[row.page_id] = 0;
      summary[row.page_id]++;
    });
    
    console.log('\nAll pages in database:');
    Object.entries(summary).forEach(([pageId, count]) => {
      console.log(`  ${pageId}: ${count} keys`);
    });
    
    await pool.end();
    
  } catch (error) {
    console.error('Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

syncAllPages();
