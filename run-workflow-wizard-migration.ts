import { pool } from './server/db.js';
import { readFileSync } from 'fs';

async function runMigration() {
  try {
    console.log('📦 Running workflow wizard schema migration...');
    
    const sql = readFileSync('./server/migrations/008-workflow-wizard-schema.sql', 'utf-8');
    await pool.query(sql);
    
    console.log('✅ Workflow wizard schema created successfully');
    
    // Verify tables were created
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name IN (
          'workflow_templates', 
          'workflow_instances', 
          'workflow_steps',
          'workflow_executions',
          'workflow_step_executions',
          'workflow_email_templates',
          'workflow_questionnaire_templates',
          'workflow_questionnaire_responses',
          'workflow_analytics'
        )
      ORDER BY table_name;
    `);
    
    console.log('\n📋 Created tables:');
    result.rows.forEach((row: any) => {
      console.log(`  ✓ ${row.table_name}`);
    });
    
    await pool.end();
    
  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    if (error.position) {
      console.error('   Position:', error.position);
    }
    if (error.detail) {
      console.error('   Detail:', error.detail);
    }
    console.error('\n   Full error:', error);
    process.exit(1);
  }
}

runMigration();
