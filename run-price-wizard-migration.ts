import { pool } from './server/db.js';
import { readFileSync } from 'fs';

async function runMigration() {
  try {
    console.log('📦 Running price wizard schema migration...');
    
    const sql = readFileSync('./server/migrations/007-price-wizard-schema.sql', 'utf-8');
    await pool.query(sql);
    
    console.log('✅ Price wizard schema created successfully');
    
    // Verify tables were created
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name IN ('competitor_research', 'competitor_prices', 'price_list_suggestions', 'price_wizard_sessions')
      ORDER BY table_name;
    `);
    
    console.log('\n📋 Created tables:');
    result.rows.forEach((row: any) => {
      console.log(`  ✓ ${row.table_name}`);
    });
    
    await pool.end();
    
  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

runMigration();
