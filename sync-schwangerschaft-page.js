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

async function syncSchwangerschaft() {
  try {
    console.log('Fetching schwangerschaftsfotos page from Heroku...');
    const herokuData = await fetchFromHeroku('schwangerschaftsfotos');
    
    if (!herokuData || !herokuData.publishedContent) {
      console.log('❌ No content found');
      await pool.end();
      return;
    }
    
    const publishedContent = herokuData.publishedContent;
    console.log(`✓ Found ${Object.keys(publishedContent).length} content keys\n`);
    
    console.log('Inserting into database...');
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
      'schwangerschaftsfotos',
      'de',
      JSON.stringify(publishedContent),
      JSON.stringify(publishedContent),
      'published'
    ]);
    
    console.log('✓ Schwangerschaft page synced successfully!\n');
    
    // Show image URLs
    Object.entries(publishedContent).forEach(([key, value]) => {
      if (key.includes('Image')) {
        console.log(`  ${key}: ${value.substring(0, 70)}...`);
      }
    });
    
    await pool.end();
  } catch (error) {
    console.error('Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

syncSchwangerschaft();
