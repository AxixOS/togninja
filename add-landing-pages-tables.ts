import { pool } from './server/db';

async function createLandingPagesTable() {
  console.log('🚀 Creating landing_pages and landing_page_revisions tables...\n');

  try {
    // Enable uuid extension if not already
    await pool.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // Main landing pages table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS landing_pages (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id TEXT,
        title TEXT NOT NULL,
        slug TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
        page_type TEXT DEFAULT 'general',
        primary_service TEXT,
        target_audience TEXT,
        offer_summary TEXT,
        city TEXT,
        tone TEXT DEFAULT 'warm',
        seo_title TEXT,
        meta_description TEXT,
        hero_headline TEXT,
        hero_subheadline TEXT,
        cta_text TEXT DEFAULT 'Book Now',
        cta_action TEXT DEFAULT 'book_now',
        schema_type TEXT DEFAULT 'LocalBusiness',
        content_json JSONB DEFAULT '{}',
        generation_prompt_json JSONB DEFAULT '{}',
        generation_context_json JSONB DEFAULT '{}',
        preview_image_url TEXT,
        published_url TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        published_at TIMESTAMPTZ
      )
    `);
    console.log('✅ landing_pages table created');

    // Unique slug index
    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_landing_pages_slug ON landing_pages(slug)
    `);
    console.log('✅ Unique slug index created');

    // Status index for filtering
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_landing_pages_status ON landing_pages(status)
    `);

    // Revisions table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS landing_page_revisions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        landing_page_id UUID NOT NULL REFERENCES landing_pages(id) ON DELETE CASCADE,
        version_number INT NOT NULL DEFAULT 1,
        content_json JSONB DEFAULT '{}',
        generation_context_json JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        created_by TEXT
      )
    `);
    console.log('✅ landing_page_revisions table created');

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_landing_page_revisions_page_id ON landing_page_revisions(landing_page_id)
    `);

    console.log('\n🎉 Landing pages database schema ready!');
  } catch (error: any) {
    console.error('❌ Error creating landing pages tables:', error.message);
  } finally {
    await pool.end();
  }
}

createLandingPagesTable();
