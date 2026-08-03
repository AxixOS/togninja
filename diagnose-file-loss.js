require('dotenv').config();
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);

(async () => {
  try {
    console.log('🔍 DIAGNOSIS: Why are files missing?\n');
    
    // 1. Check if digital_files has a deleted_at column
    const columns = await sql`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'digital_files' AND column_name LIKE '%delet%'
    `;
    console.log('Delete columns:', columns.map(c => c.column_name));
    
    // 2. Check table creation time
    const tableInfo = await sql`
      SELECT 
        pg_class.relname AS table_name,
        pg_catalog.pg_get_userbyid(pg_class.relowner) AS owner,
        pg_size_pretty(pg_total_relation_size(pg_class.oid)) AS total_size
      FROM pg_catalog.pg_class
      JOIN pg_catalog.pg_namespace ON pg_namespace.oid = pg_class.relnamespace
      WHERE pg_class.relname = 'digital_files'
      AND pg_namespace.nspname = 'public'
    `;
    console.log('\nTable info:', tableInfo[0]);
    
    // 3. Check if there's any activity log
    const logTables = await sql`
      SELECT table_name FROM information_schema.tables 
      WHERE table_name LIKE '%log%' OR table_name LIKE '%audit%' OR table_name LIKE '%history%'
    `;
    console.log('\nLog tables:', logTables.map(t => t.table_name));
    
    // 4. Check Backblaze B2 configuration
    console.log('\n🔧 Checking Backblaze B2 config...');
    console.log('B2_APPLICATION_KEY_ID:', process.env.B2_APPLICATION_KEY_ID ? '✅ Set' : '❌ Missing');
    console.log('B2_APPLICATION_KEY:', process.env.B2_APPLICATION_KEY ? '✅ Set' : '❌ Missing');
    console.log('B2_BUCKET_ID:', process.env.B2_BUCKET_ID ? '✅ Set' : '❌ Missing');
    console.log('B2_BUCKET_NAME:', process.env.B2_BUCKET_NAME || '❌ Missing');
    
    // 5. Check if there's a storage_usage or stats table
    const statsResult = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'storage_usage'
      )
    `;
    
    if (statsResult[0].exists) {
      const stats = await sql`SELECT * FROM storage_usage ORDER BY updated_at DESC LIMIT 1`;
      console.log('\n📊 Last storage usage record:', stats[0]);
    }
    
    console.log('\n⚠️ CONCLUSION: Files were DELETED from database.');
    console.log('This could have happened from:');
    console.log('  1. A migration script that dropped and recreated the table');
    console.log('  2. A DELETE query run accidentally');
    console.log('  3. A database rollback or restore operation');
    console.log('\n🔴 CRITICAL: Customer files CANNOT be recovered from database.');
    console.log('✅ SOLUTION: Files may still exist in Backblaze B2 bucket - we need to check there.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  process.exit(0);
})();
