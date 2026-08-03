require('dotenv').config();
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);

(async () => {
  try {
    console.log('🔍 Checking digital_files table...\n');
    
    // Check if table exists
    const tableExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'digital_files'
      )
    `;
    console.log('Table exists:', tableExists[0].exists);
    
    if (tableExists[0].exists) {
      // Count total files
      const count = await sql`SELECT COUNT(*) as count FROM digital_files`;
      console.log('📊 Total files in database:', count[0].count);
      
      // Get storage stats
      const storageStats = await sql`
        SELECT 
          COUNT(*) as file_count,
          SUM(COALESCE(file_size, 0)) as total_bytes,
          ROUND(SUM(COALESCE(file_size, 0))::numeric / 1024 / 1024 / 1024, 2) as total_gb
        FROM digital_files
      `;
      console.log('\n💾 Storage Statistics:');
      console.log('  Files:', storageStats[0].file_count);
      console.log('  Total Size:', storageStats[0].total_gb, 'GB');
      console.log('  Total Bytes:', storageStats[0].total_bytes);
      
      // Sample recent files
      const recentFiles = await sql`
        SELECT id, file_name, file_size, storage_provider, storage_path, created_at
        FROM digital_files
        ORDER BY created_at DESC
        LIMIT 5
      `;
      console.log('\n📁 Recent 5 files:');
      recentFiles.forEach((f, i) => {
        console.log(`${i+1}. ${f.file_name} (${(f.file_size/1024/1024).toFixed(2)} MB) - ${f.storage_provider} - ${f.created_at}`);
      });
      
      // Check by storage provider
      const byProvider = await sql`
        SELECT storage_provider, COUNT(*) as count, SUM(file_size) as total_bytes
        FROM digital_files
        GROUP BY storage_provider
      `;
      console.log('\n📦 Files by storage provider:');
      byProvider.forEach(p => {
        console.log(`  ${p.storage_provider}: ${p.count} files (${(p.total_bytes/1024/1024/1024).toFixed(2)} GB)`);
      });
      
    } else {
      console.log('❌ digital_files table does not exist!');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  process.exit(0);
})();
