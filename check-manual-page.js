const { neon } = require('@neondatabase/serverless');
require('dotenv').config();

const sql = neon(process.env.DATABASE_URL);

async function checkPage() {
  try {
    const pages = await sql`
      SELECT * FROM manual_pages 
      WHERE page_id = 'familienfotos-wien' 
      ORDER BY updated_at DESC 
      LIMIT 1
    `;
    
    if (pages.length > 0) {
      console.log('Page data:');
      console.log(JSON.stringify(pages[0], null, 2));
      
      // Check if content has heroImage
      if (pages[0].content) {
        const content = JSON.parse(pages[0].content);
        console.log('\n=== Hero Image URL ===');
        console.log(content.heroImage || 'NO HERO IMAGE');
      }
    } else {
      console.log('No page found with page_id: familienfotos-wien');
    }
  } catch (error) {
    console.error('Error:', error);
  }
  process.exit(0);
}

checkPage();
