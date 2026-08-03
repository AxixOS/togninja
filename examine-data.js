// Enhanced database query to verify data structure
const { neon } = require('@neondatabase/serverless');
require('dotenv').config();

async function examineData() {
  try {
    console.log('🔗 Connecting to database...');
    const sql = neon(process.env.DATABASE_URL);
    
    // Get detailed questionnaire data for demo-client
    console.log('📊 Checking detailed questionnaire data for demo-client...');
    
    const detailedQuery = await sql`
      SELECT 
        ql.token,
        ql.client_id,
        ql.template_id,
        ql.is_used,
        ql.created_at as sent_at,
        ql.expires_at,
        qr.id as response_id,
        qr.answers,
        qr.submitted_at,
        'Demo' as first_name,
        'Client' as last_name,
        'demo@example.com' as email
      FROM questionnaire_links ql
      LEFT JOIN questionnaire_responses qr ON ql.token = qr.token
      WHERE ql.client_id = 'demo-client'
      ORDER BY ql.created_at DESC
    `;
    
    console.log('✅ Found', detailedQuery.length, 'questionnaire entries for demo-client');
    
    detailedQuery.forEach((q, i) => {
      console.log(`\n📝 Entry ${i + 1}:`);
      console.log(`   Token: ${q.token}`);
      console.log(`   Used: ${q.is_used}`);
      console.log(`   Has Response: ${!!q.response_id}`);
      console.log(`   Sent At: ${q.sent_at}`);
      console.log(`   Submitted At: ${q.submitted_at}`);
      
      if (q.answers) {
        try {
          const answers = JSON.parse(q.answers);
          console.log(`   Answers: ${Object.keys(answers).length} questions answered`);
          Object.entries(answers).forEach(([key, value]) => {
            console.log(`      ${key}: ${value}`);
          });
        } catch (e) {
          console.log(`   Answers: Invalid JSON format`);
        }
      } else {
        console.log(`   Answers: No response submitted`);
      }
    });
    
    // This simulates what the View Responses API would return
    console.log('\n🎯 Simulating View Responses API output...');
    const formattedQuestionnaires = detailedQuery.map(q => ({
      id: q.response_id || q.token,
      questionnaireName: 'Photography Preferences Survey',
      sentDate: q.sent_at,
      responseDate: q.submitted_at,
      submitted_at: q.submitted_at, // Field for frontend compatibility
      status: q.is_used ? 'responded' : (new Date() > new Date(q.expires_at) ? 'expired' : 'sent'),
      responses: q.answers,
      link: q.is_used ? null : `/questionnaire/${q.token}`
    }));
    
    console.log('\n📋 Formatted questionnaires for frontend:');
    formattedQuestionnaires.forEach((q, i) => {
      console.log(`   ${i + 1}. ID: ${q.id}, Status: ${q.status}, Has Responses: ${!!q.responses}`);
    });
    
    if (formattedQuestionnaires.filter(q => q.status === 'responded').length > 0) {
      console.log('\n🎉 SUCCESS: Found questionnaires with responses!');
      console.log('   This means the View Responses functionality should work.');
    } else {
      console.log('\n⚠️  ISSUE: No questionnaires with "responded" status found.');
    }
    
  } catch (error) {
    console.error('❌ Database examination error:', error.message);
  }
}

examineData();