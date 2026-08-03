require('dotenv').config();
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);

async function resetAllFiles() {
  try {
    console.log('🔄 Resetting all file folder assignments...');
    
    // Set all files to unfiled (folder_name = NULL)
    const result = await sql`
      UPDATE digital_files 
      SET folder_name = NULL, 
          updated_at = CURRENT_TIMESTAMP
      WHERE folder_name IS NOT NULL
    `;
    
    console.log(`✅ Reset ${result.length} files to unfiled status`);
    
    // Verify the change
    const unfiledCount = await sql`SELECT COUNT(*) as count FROM digital_files WHERE folder_name IS NULL`;
    const filedCount = await sql`SELECT COUNT(*) as count FROM digital_files WHERE folder_name IS NOT NULL`;
    
    console.log(`\n📊 Current status:`);
    console.log(`  Unfiled files: ${unfiledCount[0].count}`);
    console.log(`  Filed files: ${filedCount[0].count}`);
    
    console.log('\n✅ All files are now unfiled. You can drag them into folders from the Home view.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  process.exit(0);
}

resetAllFiles();
