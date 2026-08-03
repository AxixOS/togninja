/**
 * Check questionnaires table structure
 */
import 'dotenv/config';
import { pool } from '../server/db';

async function checkTables() {
  try {
    console.log('🔍 Checking questionnaires table structure...\n');
    
    // Check if table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'questionnaires'
      );
    `);
    
    if (tableCheck.rows[0].exists) {
      console.log('✅ Table "questionnaires" exists\n');
      
      // Get columns
      const columns = await pool.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = 'questionnaires'
        ORDER BY ordinal_position;
      `);
      
      console.log('Columns:');
      columns.rows.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
      });
    } else {
      console.log('❌ Table "questionnaires" does not exist');
    }
    
    // Check questionnaire_responses
    const responsesCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'questionnaire_responses'
      );
    `);
    
    console.log('\n');
    if (responsesCheck.rows[0].exists) {
      console.log('✅ Table "questionnaire_responses" exists');
      
      const respColumns = await pool.query(`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'questionnaire_responses'
        ORDER BY ordinal_position;
      `);
      
      console.log('Columns:');
      respColumns.rows.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type}`);
      });
    } else {
      console.log('❌ Table "questionnaire_responses" does not exist');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkTables();
