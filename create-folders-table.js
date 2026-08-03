require('dotenv').config();
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);

async function createFoldersTable() {
  try {
    console.log('📁 Creating digital_folders table...');
    
    await sql`
      CREATE TABLE IF NOT EXISTS digital_folders (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    console.log('✅ Table created successfully');
    
    // Insert the folders that already exist based on the folder_names in digital_files
    console.log('\n📂 Creating folders from existing folder names...');
    
    const folderNames = [
      'Babyfotos (3-12 Monate)',
      'Bewerbungsfotos & CV',
      'Business-Portraits',
      'Eventfotografie',
      'Familienfotos',
      'Hochzeitsfotografie',
      'Immobilienfotografie',
      'Neugeborenenfotos',
      'Portraitfotografie',
      'Produktfotografie',
      'Schwangerschaftsfotos',
      'Studio-Fotografie',
      'Team- & Mitarbeiterfotos'
    ];
    
    for (const name of folderNames) {
      await sql`
        INSERT INTO digital_folders (name, description)
        VALUES (${name}, ${`Photos for ${name}`})
        ON CONFLICT (name) DO NOTHING
      `;
      console.log(`  ✅ Created folder: ${name}`);
    }
    
    console.log('\n📊 Final folder list:');
    const folders = await sql`SELECT id, name FROM digital_folders ORDER BY name`;
    folders.forEach(f => {
      console.log(`  [${f.id}] ${f.name}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  process.exit(0);
}

createFoldersTable();
