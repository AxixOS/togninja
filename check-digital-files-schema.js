require('dotenv').config();
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);

(async () => {
  try {
    // Get actual column names
    const columns = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'digital_files'
      ORDER BY ordinal_position
    `;
    
    console.log('📋 digital_files table schema:');
    columns.forEach(c => console.log(`  ${c.column_name}: ${c.data_type}`));
    
    // Try to count with correct columns
    const count = await sql`SELECT COUNT(*) as count FROM digital_files`;
    console.log('\n📊 Total records:', count[0].count);
    
    // Try to get all data
    if (count[0].count > 0) {
      const allData = await sql`SELECT * FROM digital_files LIMIT 10`;
      console.log('\n📁 Sample data:');
      console.log(JSON.stringify(allData, null, 2));
    } else {
      console.log('\n⚠️ NO FILES IN DATABASE - All customer files are missing!');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  process.exit(0);
})();
