const { neon } = require('@neondatabase/serverless');
require('dotenv').config();

const sql = neon(process.env.DATABASE_URL);

async function setupFolderTable() {
  try {
    console.log('📁 Setting up photo_folders table...\n');
    
    // Create photo_folders table
    await sql`
      CREATE TABLE IF NOT EXISTS photo_folders (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        parent_id TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;
    
    console.log('✅ Table created!\n');
    
    // Insert default folders
    const folders = [
      'Familienfotos',
      'Neugeborenenfotos',
      'Babyfotos (3-12 Monate)',
      'Schwangerschaftsfotos',
      'Business-Portraits',
      'Team- & Mitarbeiterfotos',
      'Bewerbungsfotos & LinkedIn',
      'Portraitfotografie',
      'Produktfotografie',
      'Immobilienfotografie',
      'Studio-Fotografie',
      'Hochzeitsfotografie',
      'Eventfotografie'
    ];
    
    console.log('📸 Creating photo category folders...\n');
    
    for (const folderName of folders) {
      const id = folderName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      try {
        await sql`
          INSERT INTO photo_folders (id, name, parent_id)
          VALUES (${id}, ${folderName}, NULL)
          ON CONFLICT (name) DO NOTHING
        `;
        console.log(`✅ ${folderName}`);
      } catch (error) {
        console.log(`⚠️  ${folderName} - ${error.message}`);
      }
    }
    
    console.log('\n✅ All folders created!');
    console.log('\n📋 Folders are now ready in the database.');
    console.log('   Refresh your My Archive page to see them!\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

setupFolderTable();
