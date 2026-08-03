require('dotenv').config();
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

async function checkStorageSchema() {
  try {
    // Check storage_subscriptions columns
    console.log('storage_subscriptions table columns:');
    const subCols = await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'storage_subscriptions' 
      ORDER BY ordinal_position
    `;
    subCols.forEach(c => console.log(`  - ${c.column_name} (${c.data_type}) nullable:${c.is_nullable} default:${c.column_default}`));
    
    console.log('\nstorage_usage table columns:');
    const usageCols = await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'storage_usage' 
      ORDER BY ordinal_position
    `;
    usageCols.forEach(c => console.log(`  - ${c.column_name} (${c.data_type}) nullable:${c.is_nullable} default:${c.column_default}`));
    
  } catch (error) {
    console.error('Error:', error);
  }
}

checkStorageSchema();
