const { neon } = require('@neondatabase/serverless');
require('dotenv').config();

const sql = neon(process.env.DATABASE_URL);

async function checkTables() {
  try {
    // Check if manual_page_content table exists
    const tables = await sql`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename LIKE '%manual%'
    `;
    
    console.log('Manual tables:', tables);
    
    if (tables.length > 0) {
      // Check data in manual_page_content
      const data = await sql`
        SELECT * FROM manual_page_content 
        WHERE page_id = 'familienfotos'
        ORDER BY updated_at DESC 
        LIMIT 1
      `;
      
      console.log('\n=== Manual Page Data ===');
      console.log(JSON.stringify(data, null, 2));
      
      if (data.length > 0 && data[0].published_content) {
        console.log('\n=== Published Content ===');
        console.log(JSON.stringify(data[0].published_content, null, 2));
      }
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
  process.exit(0);
}

checkTables();
