import { pool } from './server/db.js';

async function fixStuckSessions() {
  try {
    console.log('🔧 Fixing stuck Price Wizard sessions...\n');

    // 1. Update all competitors stuck in 'pending' to 'failed'
    const competitorResult = await pool.query(`
      UPDATE competitor_research 
      SET status = 'failed', scrape_error = 'Manual entry required - click + to add prices'
      WHERE status = 'pending'
      RETURNING id
    `);
    console.log(`✅ Updated ${competitorResult.rowCount} stuck competitors to 'failed'`);

    // 2. Update all sessions stuck in 'scraping' or 'discovering' to 'analyzing'
    const sessionResult = await pool.query(`
      UPDATE price_wizard_sessions 
      SET status = 'analyzing', updated_at = NOW()
      WHERE status IN ('scraping', 'discovering')
      RETURNING id, location, status
    `);
    console.log(`✅ Updated ${sessionResult.rowCount} stuck sessions to 'analyzing'`);

    // 3. Show current session statuses
    const sessions = await pool.query(`
      SELECT id, location, status, competitors_found, prices_extracted, created_at
      FROM price_wizard_sessions
      ORDER BY created_at DESC
      LIMIT 10
    `);
    
    console.log('\n📊 Current sessions:');
    console.table(sessions.rows);

    console.log('\n✅ Done! Refresh the Price Wizard page.');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixStuckSessions();
