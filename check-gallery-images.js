require('dotenv').config();
const { Pool } = require('pg');
const p = new Pool({ connectionString: process.env.DATABASE_URL });

async function check() {
  // Check Parrott Family gallery specifically
  const galleryId = 'be65521a-6f21-4d89-a864-3894af02c71d';
  
  console.log('=== Parrott Family Gallery Images ===');
  const images = await p.query(
    'SELECT id, filename, url, created_at FROM gallery_images WHERE gallery_id = $1 ORDER BY created_at DESC',
    [galleryId]
  );
  
  console.log(`Total images: ${images.rows.length}`);
  images.rows.forEach(row => {
    console.log(`  - ${row.filename} (${row.created_at})`);
    console.log(`    URL: ${row.url}`);
  });
  
  // Search for f7011023 filename anywhere
  console.log('\n=== Search for f7011023 in all galleries ===');
  const search = await p.query(
    "SELECT gi.*, g.title as gallery_title FROM gallery_images gi LEFT JOIN galleries g ON gi.gallery_id = g.id WHERE gi.filename LIKE '%f7011023%' OR gi.url LIKE '%f7011023%'"
  );
  
  if (search.rows.length > 0) {
    console.log('FOUND:', search.rows);
  } else {
    console.log('NOT FOUND - The file f7011023 was never saved to the database');
  }
  
  // Check for any recent uploads in the last 7 days
  console.log('\n=== Recent uploads (last 7 days) ===');
  const recent = await p.query(
    "SELECT gi.*, g.title as gallery_title FROM gallery_images gi LEFT JOIN galleries g ON gi.gallery_id = g.id WHERE gi.created_at > NOW() - INTERVAL '7 days' ORDER BY gi.created_at DESC LIMIT 10"
  );
  
  if (recent.rows.length > 0) {
    console.log(`Found ${recent.rows.length} recent uploads:`);
    recent.rows.forEach(row => {
      console.log(`  - ${row.filename} in "${row.gallery_title}" at ${row.created_at}`);
    });
  } else {
    console.log('No uploads in the last 7 days');
  }
  
  await p.end();
}

check().catch(console.error);
