require('dotenv').config();
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

async function checkTable() {
  try {
    console.log('Checking questionnaire_links table structure...');
    const columns = await sql`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name='questionnaire_links' 
      ORDER BY ordinal_position
    `;
    console.log('questionnaire_links columns:', JSON.stringify(columns, null, 2));
    
    console.log('\nChecking questionnaire_responses table structure...');
    const responseColumns = await sql`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name='questionnaire_responses' 
      ORDER BY ordinal_position
    `;
    console.log('questionnaire_responses columns:', JSON.stringify(responseColumns, null, 2));
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkTable();