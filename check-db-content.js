require('dotenv').config();
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

async function checkContent() {
  const result = await sql`
    SELECT 
      page_id,
      jsonb_object_keys(published_content) as key_name
    FROM manual_page_content 
    WHERE page_id = 'schwangerschaftsfotos' 
    AND language = 'de'
  `;
  
  console.log(`Total keys found: ${result.length}`);
  console.log('\nKeys:');
  result.forEach((row, i) => {
    console.log(`${i + 1}. ${row.key_name}`);
  });
  
  // Also get the full record
  const full = await sql`
    SELECT published_content
    FROM manual_page_content 
    WHERE page_id = 'schwangerschaftsfotos' 
    AND language = 'de'
  `;
  
  if (full.length > 0) {
    const keys = Object.keys(full[0].published_content);
    console.log(`\nTotal keys in published_content: ${keys.length}`);
    console.log('\nFirst 10 keys:');
    keys.slice(0, 10).forEach(k => console.log(`  - ${k}`));
  }
  
  process.exit(0);
}

checkContent().catch(console.error);
