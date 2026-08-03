require('dotenv').config();
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

async function checkGalleries() {
  try {
    // Check all galleries
    const galleries = await sql`SELECT id, title, slug FROM galleries ORDER BY created_at DESC LIMIT 15`;
    console.log('Galleries in database:');
    galleries.forEach(g => console.log(`  ${g.id} - ${g.title} (${g.slug})`));
    
    // Check a specific gallery ID
    const testId = '4fdac6a8-c28f-4275-b87a-bb6316320e0a';
    console.log(`\nLooking for gallery with ID: ${testId}`);
    const specific = await sql`SELECT id, title FROM galleries WHERE id::text = ${testId}`;
    console.log('Result:', specific.length > 0 ? specific[0] : 'NOT FOUND');
    
  } catch (err) {
    console.error('Error:', err.message);
  }
}

checkGalleries();
