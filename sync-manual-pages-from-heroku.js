// Sync manual pages data from Heroku to local database
require('dotenv').config();
const https = require('https');
const http = require('http');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

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

async function syncManualPages() {
  try {
    console.log('Step 1: Checking if manual_pages table exists...');
    
    // Check if table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'manual_pages'
      )
    `);
    
    if (!tableCheck.rows[0].exists) {
      console.log('Creating manual_pages table...');
      await pool.query(`
        CREATE TABLE manual_pages (
          id SERIAL PRIMARY KEY,
          page_id VARCHAR(255) NOT NULL,
          content_key VARCHAR(500) NOT NULL,
          content_value TEXT,
          language VARCHAR(10) DEFAULT 'de',
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW(),
          UNIQUE(page_id, content_key, language)
        )
      `);
      console.log('✓ Table created\n');
    } else {
      console.log('✓ Table exists\n');
    }
    
    // Pages to sync
    const pagesToSync = [
      'familienfotos',
      'babyfotos',
      'bewerbungsfotos',
      'business-portrait',
      'hochzeitsfotografie',
      'neugeborenenfotos',
      'studio-fotografie',
      'teamfotos'
    ];
    
    console.log(`Step 2: Syncing ${pagesToSync.length} pages from Heroku...\n`);
    
    let totalSynced = 0;
    
    for (const pageId of pagesToSync) {
      try {
        console.log(`Fetching ${pageId}...`);
        const herokuData = await fetchFromHeroku(pageId);
        
        if (!herokuData || !herokuData.publishedContent) {
          console.log(`  ⚠️  No content found for ${pageId}`);
          continue;
        }
        
        // Delete existing content for this page
        await pool.query('DELETE FROM manual_pages WHERE page_id = $1', [pageId]);
        
        // Insert all content keys
        const contentKeys = Object.keys(herokuData.publishedContent);
        let keysInserted = 0;
        
        for (const key of contentKeys) {
          const value = herokuData.publishedContent[key];
          await pool.query(`
            INSERT INTO manual_pages (page_id, content_key, content_value, language)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (page_id, content_key, language) 
            DO UPDATE SET content_value = EXCLUDED.content_value, updated_at = NOW()
          `, [pageId, key, value, 'de']);
          keysInserted++;
        }
        
        console.log(`  ✓ Synced ${keysInserted} content keys`);
        totalSynced += keysInserted;
        
      } catch (e) {
        console.error(`  ✗ Failed to sync ${pageId}:`, e.message);
      }
    }
    
    console.log(`\n✓ Successfully synced ${totalSynced} total content keys!`);
    console.log('\nVerifying...');
    
    const result = await pool.query(`
      SELECT page_id, COUNT(*) as keys 
      FROM manual_pages 
      GROUP BY page_id 
      ORDER BY page_id
    `);
    
    console.log('\nLocal database now has:');
    result.rows.forEach(row => {
      console.log(`  ${row.page_id}: ${row.keys} keys`);
    });
    
    await pool.end();
    process.exit(0);
    
  } catch (e) {
    console.error('Error:', e.message);
    await pool.end();
    process.exit(1);
  }
}

syncManualPages();
