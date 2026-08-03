require('dotenv').config();
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

async function clearProductHeroText() {
  try {
    // First, let's see what's in the produktfotografie page
    const existing = await sql`
      SELECT id, page_id, language, draft_content, published_content
      FROM manual_page_content
      WHERE page_id = 'produktfotografie'
    `;
    
    console.log('Current produktfotografie content:');
    console.log(JSON.stringify(existing, null, 2));
    
    if (existing.length > 0) {
      const content = existing[0];
      const draft = content.draft_content || {};
      const published = content.published_content || {};
      
      console.log('\nDraft content keys:', Object.keys(draft));
      console.log('\nPublished content keys:', Object.keys(published));
      
      // Look for any hero-related fields that might contain that text
      const heroKeys = Object.keys(draft).filter(key => 
        key.includes('hero') || key.includes('image') || key.includes('label')
      );
      
      console.log('\nHero-related fields:');
      heroKeys.forEach(key => {
        console.log(`${key}: ${draft[key]}`);
      });
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

clearProductHeroText();
