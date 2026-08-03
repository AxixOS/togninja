/**
 * Create questionnaires tables in the database
 */
import 'dotenv/config';
import { pool } from '../server/db';
import fs from 'fs';
import path from 'path';

async function createQuestionnaireTables() {
  try {
    console.log('🔧 Creating questionnaires tables...');
    
    const sqlPath = path.join(__dirname, 'create-questionnaires-tables.sql');
    const sql = fs.readFileSync(sqlPath, 'utf-8');
    
    await pool.query(sql);
    
    console.log('✅ Questionnaires tables created successfully!');
    console.log('📋 Tables created:');
    console.log('   - questionnaires');
    console.log('   - questionnaire_responses');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating tables:', error);
    process.exit(1);
  }
}

createQuestionnaireTables();
