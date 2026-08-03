require('dotenv').config();
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

async function checkData() {
  try {
    console.log('Checking questionnaire_links data...');
    const links = await sql`SELECT * FROM questionnaire_links LIMIT 5`;
    console.log('questionnaire_links data:', JSON.stringify(links, null, 2));
    
    console.log('\nChecking questionnaire_responses data...');
    const responses = await sql`SELECT * FROM questionnaire_responses LIMIT 5`;
    console.log('questionnaire_responses data:', JSON.stringify(responses, null, 2));
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkData();