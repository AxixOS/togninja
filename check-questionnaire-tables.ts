import { pool } from './server/db.js';

async function checkTables() {
  try {
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name LIKE '%questionnaire%' 
      ORDER BY table_name
    `);
    
    console.log('Existing questionnaire tables:');
    result.rows.forEach((r: any) => console.log('  -', r.table_name));
    
    // Check columns if table exists
    if (result.rows.length > 0) {
      const columns = await pool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = $1 
        ORDER BY ordinal_position
      `, [result.rows[0].table_name]);
      
      console.log(`\nColumns in ${result.rows[0].table_name}:`);
      columns.rows.forEach((c: any) => console.log(`  - ${c.column_name}: ${c.data_type}`));
    }
    
    await pool.end();
    
  } catch (error: any) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkTables();
