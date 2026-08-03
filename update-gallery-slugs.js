require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function updateSlugs() {
  try {
    // Get all galleries
    const result = await pool.query('SELECT id, title, slug FROM galleries');
    console.log('Found', result.rows.length, 'galleries');
    
    for (const gallery of result.rows) {
      // Generate slug from title
      const newSlug = gallery.title
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .substring(0, 100);
      
      if (newSlug !== gallery.slug) {
        await pool.query('UPDATE galleries SET slug = $1 WHERE id = $2', [newSlug, gallery.id]);
        console.log('Updated:', gallery.title, '->', newSlug);
      } else {
        console.log('Already correct:', gallery.title, '=', gallery.slug);
      }
    }
    console.log('Done!');
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    pool.end();
  }
}

updateSlugs();
