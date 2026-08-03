import { pool } from './server/db.js';

async function checkSchema() {
  try {
    const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'competitor_prices' 
      ORDER BY ordinal_position
    `);
    
    console.log('competitor_prices columns:');
    console.table(result.rows);
    
    // Check if notes column exists
    const hasNotes = result.rows.some((r: any) => r.column_name === 'notes');
    console.log('\nHas notes column:', hasNotes);
    
    if (!hasNotes) {
      console.log('\nAdding notes column...');
      await pool.query(`
        ALTER TABLE competitor_prices 
        ADD COLUMN IF NOT EXISTS notes TEXT
      `);
      console.log('✅ Notes column added');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkSchema();
