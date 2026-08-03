/**
 * Quick test for company report tool fix
 */
import 'dotenv/config';

const SERVER_URL = 'http://localhost:3001';

async function testCompanyReport() {
  console.log('\n🧪 Testing Company Report Tool Fix\n');

  try {
    const response = await fetch(`${SERVER_URL}/api/agent/v2/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: "Show me all business clients who have a company name registered",
        mode: 'read_only'
      })
    });

    if (!response.ok) {
      console.log(`❌ HTTP Error: ${response.status}`);
      return;
    }

    const data = await response.json();
    
    console.log(`✅ Agent Response:\n`);
    console.log(data.message || JSON.stringify(data, null, 2));
    
    if (data.toolCalls) {
      console.log(`\n🔧 Tools Used:`);
      data.toolCalls.forEach((call: any) => {
        console.log(`  - ${call.tool}`);
        if (call.ok) {
          console.log(`    ✅ Success`);
        } else {
          console.log(`    ❌ Error: ${call.error}`);
        }
      });
    }

  } catch (error: any) {
    console.log(`❌ Request failed: ${error.message}`);
  }
}

testCompanyReport();
