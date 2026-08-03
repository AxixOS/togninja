const { neon } = require('@neondatabase/serverless');

async function checkRecentUploads() {
  const sql = neon(process.env.DATABASE_URL);
  
  const files = await sql`
    SELECT id, file_name, folder_name, uploaded_at 
    FROM digital_files 
    ORDER BY uploaded_at DESC 
    LIMIT 20
  `;
  
  console.log('\n📂 Recent file uploads:\n');
  files.forEach(f => {
    console.log(`  [${f.id.substring(0,8)}...] ${f.file_name}`);
    console.log(`    -> folder: ${f.folder_name || 'NULL'}`);
    console.log(`    -> uploaded: ${f.uploaded_at}\n`);
  });
  
  console.log(`\nTotal files checked: ${files.length}\n`);
}

checkRecentUploads().catch(console.error);
