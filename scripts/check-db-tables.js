#!/usr/bin/env node
/**
 * Check Database Tables
 */

require('dotenv').config();
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

async function checkTables() {
  try {
    const tables = await sql`
      SELECT table_name, column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name IN ('questionnaires', 'questionnaire_links', 'questionnaire_responses')
      ORDER BY table_name, ordinal_position
    `;
    
    console.log('Current questionnaire-related tables and columns:');
    console.log(JSON.stringify(tables, null, 2));
    
  } catch (error) {
    console.error('Error checking tables:', error);
  }
}

checkTables().catch(console.error);