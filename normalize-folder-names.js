const { neon } = require('@neondatabase/serverless');

async function normalizeFolderNames() {
  const sql = neon(process.env.DATABASE_URL);
  
  console.log('🔧 Normalizing folder names in digital_files...\n');
  
  // Update all files to use the exact folder name from digital_folders table
  const result = await sql`
    UPDATE digital_files 
    SET folder_name = df.name, 
        updated_at = NOW()
    FROM digital_folders df
    WHERE LOWER(digital_files.folder_name) = LOWER(df.name)
    AND digital_files.folder_name != df.name
    RETURNING digital_files.id, digital_files.file_name, digital_files.folder_name
  `;
  
  console.log(`✅ Updated ${result.length} files with correct folder name casing:\n`);
  result.forEach(file => {
    console.log(`   - ${file.file_name} → ${file.folder_name}`);
  });
  
  // Verify the results
  const verification = await sql`
    SELECT 
      df.folder_name,
      COUNT(*) as file_count
    FROM digital_files df
    GROUP BY df.folder_name
    ORDER BY df.folder_name
  `;
  
  console.log('\n📊 Current folder distribution:');
  verification.forEach(row => {
    console.log(`   ${row.folder_name}: ${row.file_count} files`);
  });
  
  console.log('\n✨ Normalization complete!');
}

normalizeFolderNames().catch(console.error);
