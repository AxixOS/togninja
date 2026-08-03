const { neon } = require('@neondatabase/serverless');
require('dotenv').config();

const sql = neon(process.env.DATABASE_URL);

async function checkAllFiles() {
  try {
    console.log('🔍 Checking ALL files in digital_files table...\n');
    
    // Get all files
    const files = await sql`
      SELECT 
        id,
        file_name,
        original_filename,
        file_type,
        file_size,
        folder_name,
        is_public,
        uploaded_at
      FROM digital_files
      ORDER BY uploaded_at DESC
      LIMIT 20
    `;
    
    console.log(`Found ${files.length} files:\n`);
    
    files.forEach((file, index) => {
      console.log(`${index + 1}. STORED AS: "${file.file_name}"`);
      if (file.original_filename) {
        console.log(`   ORIGINAL: "${file.original_filename}"`);
      }
      console.log(`   Type: ${file.file_type}`);
      console.log(`   Public: ${file.is_public ? 'Yes' : 'No'}`);
      console.log(`   URL should be: /api/files/serve/${encodeURIComponent(file.file_name)}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Full error:', error);
  }
}

checkAllFiles();
