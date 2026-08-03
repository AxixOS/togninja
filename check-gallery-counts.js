const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  try {
    const result = await pool.query(`
      SELECT 
        g.id, 
        g.title, 
        (SELECT COUNT(*) FROM gallery_images gi WHERE gi.gallery_id = g.id) as image_count 
      FROM galleries g 
      WHERE g.is_public = true
    `);
    
    console.log('Galleries with image counts:');
    let total = 0;
    result.rows.forEach(row => {
      console.log(`  ${row.title}: ${row.image_count} images`);
      total += parseInt(row.image_count);
    });
    console.log(`\nTotal images: ${total}`);
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

main();
