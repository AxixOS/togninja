require('dotenv').config();
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

async function checkArchivedTables() {
  try {
    console.log('🔍 Checking for archived_folders and archived_files tables...\n');
    
    // Check if tables exist
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('archived_folders', 'archived_files')
      ORDER BY table_name
    `;
    
    console.log('Existing tables:', tables.map(t => t.table_name));
    
    if (tables.length === 0) {
      console.log('\n❌ Tables do not exist. Creating them...\n');
      
      // Create archived_folders table
      await sql`
        CREATE TABLE IF NOT EXISTS archived_folders (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          subscription_id UUID NOT NULL REFERENCES storage_subscriptions(id) ON DELETE CASCADE,
          parent_folder_id UUID,
          name TEXT NOT NULL,
          description TEXT,
          color TEXT,
          icon TEXT,
          files_count INTEGER DEFAULT 0,
          total_size INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `;
      console.log('✅ archived_folders table created');
      
      // Create archived_files table
      await sql`
        CREATE TABLE IF NOT EXISTS archived_files (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          subscription_id UUID NOT NULL REFERENCES storage_subscriptions(id) ON DELETE CASCADE,
          folder_id UUID REFERENCES archived_folders(id),
          file_name TEXT NOT NULL,
          original_name TEXT NOT NULL,
          file_type TEXT NOT NULL,
          mime_type TEXT NOT NULL,
          file_size INTEGER NOT NULL,
          s3_key TEXT,
          s3_bucket TEXT,
          thumbnail_s3_key TEXT,
          is_favorite BOOLEAN DEFAULT false,
          tags TEXT[],
          description TEXT,
          uploaded_at TIMESTAMP DEFAULT NOW(),
          last_accessed_at TIMESTAMP,
          download_count INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `;
      console.log('✅ archived_files table created');
      
      // Create indexes
      await sql`CREATE INDEX IF NOT EXISTS idx_archived_folders_subscription ON archived_folders(subscription_id)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_archived_files_subscription ON archived_files(subscription_id)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_archived_files_folder ON archived_files(folder_id)`;
      
      console.log('✅ Indexes created');
    } else {
      console.log('\n✅ Tables already exist');
      
      // Show table structures
      for (const table of tables) {
        const columns = await sql`
          SELECT column_name, data_type, is_nullable
          FROM information_schema.columns
          WHERE table_name = ${table.table_name}
          ORDER BY ordinal_position
        `;
        
        console.log(`\n📋 ${table.table_name} columns:`);
        columns.forEach(col => {
          console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'YES' ? '(nullable)' : '(not null)'}`);
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkArchivedTables();
