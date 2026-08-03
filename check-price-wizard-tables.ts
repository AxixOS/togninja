/**
 * Check if price wizard tables exist in database
 */
import 'dotenv/config';
import { pool } from './server/db.js';

async function checkTables() {
  try {
    console.log('🔍 Checking for price wizard tables...\n');
    
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name IN (
          'competitor_research', 
          'competitor_prices', 
          'price_list_suggestions', 
          'price_wizard_sessions'
        )
      ORDER BY table_name;
    `);
    
    const foundTables = result.rows.map((r: any) => r.table_name);
    console.log('✅ Tables found:', foundTables.length > 0 ? foundTables : 'None');
    
    const requiredTables = [
      'price_wizard_sessions',
      'competitor_research', 
      'competitor_prices',
      'price_list_suggestions'
    ];
    
    const missingTables = requiredTables.filter(t => !foundTables.includes(t));
    
    if (missingTables.length > 0) {
      console.log('\n❌ Missing tables:', missingTables);
      console.log('\n📦 Run migration to create tables...');
    } else {
      console.log('\n✅ All price wizard tables exist!');
    }
    
    await pool.end();
    
    return missingTables.length === 0;
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkTables();
