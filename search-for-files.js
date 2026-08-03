require('dotenv').config();
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);

(async () => {
  try {
    console.log('🔍 Searching for file-related tables and backups...\n');
    
    // Find all tables with 'file' or 'digital' in name
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND (table_name LIKE '%file%' OR table_name LIKE '%digital%' OR table_name LIKE '%archive%')
      ORDER BY table_name
    `;
    
    console.log('📋 File-related tables:');
    for (const t of tables) {
      const count = await sql`SELECT COUNT(*) as count FROM ${sql(t.table_name)}`;
      console.log(`  ${t.table_name}: ${count[0].count} records`);
    }
    
    // Check if there's a folders table
    console.log('\n📁 Checking folders...');
    const folders = await sql`
      SELECT table_name FROM information_schema.tables 
      WHERE table_name LIKE '%folder%'
    `;
    
    for (const f of folders) {
      const count = await sql`SELECT COUNT(*) as count FROM ${sql(f.table_name)}`;
      console.log(`  ${f.table_name}: ${count[0].count} records`);
    }
    
    // Check storage_usage table if it exists
    console.log('\n💾 Checking storage tracking...');
    const storageTable = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'storage_usage'
      )
    `;
    
    if (storageTable[0].exists) {
      const usage = await sql`SELECT * FROM storage_usage LIMIT 5`;
      console.log('Storage usage records:', usage.length);
      if (usage.length > 0) {
        console.log(JSON.stringify(usage, null, 2));
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  process.exit(0);
})();
