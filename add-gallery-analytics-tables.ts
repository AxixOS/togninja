import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('neon.tech') ? { rejectUnauthorized: false } : undefined
});

async function addGalleryAnalyticsTables() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Adding gallery analytics tables...');
    
    // Create gallery_analytics table
    await client.query(`
      CREATE TABLE IF NOT EXISTS gallery_analytics (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        gallery_id UUID NOT NULL UNIQUE REFERENCES galleries(id) ON DELETE CASCADE,
        view_count INTEGER DEFAULT 0 NOT NULL,
        download_count INTEGER DEFAULT 0 NOT NULL,
        email_capture_count INTEGER DEFAULT 0 NOT NULL,
        last_viewed_at TIMESTAMP,
        last_downloaded_at TIMESTAMP,
        last_email_captured_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✅ Created gallery_analytics table');
    
    // Create gallery_email_captures table
    await client.query(`
      CREATE TABLE IF NOT EXISTS gallery_email_captures (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        gallery_id UUID NOT NULL REFERENCES galleries(id) ON DELETE CASCADE,
        email TEXT NOT NULL,
        name TEXT,
        phone TEXT,
        source TEXT DEFAULT 'gallery_view',
        metadata JSONB,
        captured_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✅ Created gallery_email_captures table');
    
    // Create gallery_activity_log table
    await client.query(`
      CREATE TABLE IF NOT EXISTS gallery_activity_log (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        gallery_id UUID NOT NULL REFERENCES galleries(id) ON DELETE CASCADE,
        activity_type TEXT NOT NULL,
        visitor_email TEXT,
        visitor_name TEXT,
        image_id UUID REFERENCES gallery_images(id) ON DELETE SET NULL,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✅ Created gallery_activity_log table');
    
    // Create indexes for performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_gallery_analytics_gallery_id ON gallery_analytics(gallery_id);
      CREATE INDEX IF NOT EXISTS idx_gallery_email_captures_gallery_id ON gallery_email_captures(gallery_id);
      CREATE INDEX IF NOT EXISTS idx_gallery_email_captures_email ON gallery_email_captures(email);
      CREATE INDEX IF NOT EXISTS idx_gallery_activity_log_gallery_id ON gallery_activity_log(gallery_id);
      CREATE INDEX IF NOT EXISTS idx_gallery_activity_log_activity_type ON gallery_activity_log(activity_type);
      CREATE INDEX IF NOT EXISTS idx_gallery_activity_log_created_at ON gallery_activity_log(created_at);
    `);
    console.log('✅ Created indexes');
    
    // Initialize analytics for existing galleries
    await client.query(`
      INSERT INTO gallery_analytics (gallery_id, view_count, download_count, email_capture_count)
      SELECT id, 0, 0, 0 FROM galleries
      ON CONFLICT (gallery_id) DO NOTHING;
    `);
    console.log('✅ Initialized analytics for existing galleries');
    
    console.log('✨ Gallery analytics tables migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

addGalleryAnalyticsTables();
