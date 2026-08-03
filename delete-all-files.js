require('dotenv').config();
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);

async function deleteAllFiles() {
  try {
    console.log('🗑️  Deleting ALL files from database...');
    
    // Count files before deletion
    const beforeCount = await sql`SELECT COUNT(*) as count FROM digital_files`;
    console.log(`Files before deletion: ${beforeCount[0].count}`);
    
    // Delete all files
    const result = await sql`DELETE FROM digital_files`;
    
    console.log(`✅ Deleted all files from database`);
    
    // Verify deletion
    const afterCount = await sql`SELECT COUNT(*) as count FROM digital_files`;
    console.log(`Files after deletion: ${afterCount[0].count}`);
    
    // Show folders are still there
    const folders = await sql`SELECT id, name FROM digital_folders ORDER BY name`;
    console.log(`\n📁 Folders still available (${folders.length} folders):`);
    folders.forEach(f => {
      console.log(`  [${f.id}] ${f.name}`);
    });
    
    console.log('\n✅ All files deleted! All folders are now empty.');
    console.log('You can now upload new images to each folder.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  process.exit(0);
}

deleteAllFiles();
