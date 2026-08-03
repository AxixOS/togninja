import { pool } from './server/db.js';

async function fixAll() {
  console.log('🔧 Fixing all stuck sessions...');
  
  // Mark all sessions as completed
  const r1 = await pool.query(`
    UPDATE price_wizard_sessions 
    SET status = 'completed', updated_at = NOW() 
    WHERE status != 'completed'
  `);
  console.log(`✅ Updated ${r1.rowCount} sessions to completed`);

  // Mark all competitors as failed
  const r2 = await pool.query(`
    UPDATE competitor_research 
    SET status = 'failed', scrape_error = 'Add prices manually' 
    WHERE status = 'pending'
  `);
  console.log(`✅ Updated ${r2.rowCount} competitors to failed`);

  // Show results
  const sessions = await pool.query(`SELECT id, location, status FROM price_wizard_sessions ORDER BY created_at DESC LIMIT 5`);
  console.log('\n📊 Sessions:');
  console.table(sessions.rows);

  process.exit(0);
}

fixAll();
