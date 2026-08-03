// Examine the actual JSON format in the database
const { neon } = require('@neondatabase/serverless');
require('dotenv').config();

async function examineJSON() {
  try {
    console.log('🔗 Connecting to database...');
    const sql = neon(process.env.DATABASE_URL);
    
    // Get the raw answers data
    console.log('🔍 Examining raw answers data...');
    const responses = await sql`
      SELECT 
        token,
        answers,
        submitted_at,
        pg_typeof(answers) as answers_type
      FROM questionnaire_responses 
      WHERE answers IS NOT NULL
      ORDER BY submitted_at DESC
    `;
    
    console.log('✅ Found', responses.length, 'responses with answers data');
    
    responses.forEach((response, i) => {
      console.log(`\n📝 Response ${i + 1}:`);
      console.log(`   Token: ${response.token}`);
      console.log(`   Data Type: ${response.answers_type}`);
      console.log(`   Raw Data: ${JSON.stringify(response.answers)}`);
      console.log(`   Raw Type: ${typeof response.answers}`);
      
      // Try different parsing approaches
      try {
        if (typeof response.answers === 'string') {
          const parsed = JSON.parse(response.answers);
          console.log(`   ✅ Successfully parsed as JSON:`, parsed);
        } else if (typeof response.answers === 'object') {
          console.log(`   ✅ Already an object:`, response.answers);
        } else {
          console.log(`   ❌ Unknown format`);
        }
      } catch (e) {
        console.log(`   ❌ Failed to parse: ${e.message}`);
        console.log(`   ❌ Attempting to view raw content...`);
        console.log(`   Raw content:`, response.answers);
      }
    });
    
  } catch (error) {
    console.error('❌ JSON examination error:', error.message);
  }
}

examineJSON();