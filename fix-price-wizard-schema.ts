/**
 * Fix missing column in competitor_research table
 */
import 'dotenv/config';
import { pool } from './server/db.js';

async function fixSchema() {
  try {
    console.log('🔧 Fixing competitor_research table schema...\n');
    
    // Add missing discovery_source column
    console.log('1. Adding discovery_source column...');
    await pool.query(`
      ALTER TABLE competitor_research 
      ADD COLUMN IF NOT EXISTS discovery_source VARCHAR(100)
    `);
    console.log('   ✅ discovery_source column added');
    
    // Verify the table structure
    console.log('\n2. Verifying table structure...');
    const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'competitor_research' 
      ORDER BY ordinal_position
    `);
    
    console.log('   Columns in competitor_research:');
    result.rows.forEach((row: any) => {
      console.log(`     - ${row.column_name} (${row.data_type})`);
    });
    
    console.log('\n✅ Schema fix complete!');
    
    await pool.end();
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

fixSchema();
