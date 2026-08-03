const { neon } = require('@neondatabase/serverless');
require('dotenv').config();

const sql = neon(process.env.DATABASE_URL);

async function createTable() {
  try {
    console.log('Creating manual_page_content table...');
    
    await sql`
      CREATE TABLE IF NOT EXISTS manual_page_content (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        studio_id UUID NOT NULL,
        page_id TEXT NOT NULL,
        language TEXT NOT NULL DEFAULT 'de',
        draft_content JSONB DEFAULT '{}'::jsonb,
        published_content JSONB DEFAULT '{}'::jsonb,
        status TEXT DEFAULT 'draft',
        published_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;
    
    console.log('✅ Table created successfully');
    
    // Create unique index
    await sql`
      CREATE UNIQUE INDEX IF NOT EXISTS manual_page_content_unique 
      ON manual_page_content(studio_id, page_id, language)
    `;
    
    console.log('✅ Unique index created');
    
    // Verify table was created
    const tables = await sql`
      SELECT tablename FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename = 'manual_page_content'
    `;
    
    console.log('\nTable exists:', tables.length > 0);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  process.exit(0);
}

createTable();
