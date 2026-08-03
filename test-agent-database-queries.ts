/**
 * CRM Agent V2 Database Query Test
 * Tests the 3 new database query tools:
 * 1. voucher_sales_query
 * 2. clients_location_query  
 * 3. clients_company_report
 */

import 'dotenv/config';

const SERVER_URL = 'http://localhost:3001';

interface AgentResponse {
  response: string;
  toolCalls?: any[];
  capabilities?: any;
}

async function testAgentQuery(query: string, description: string): Promise<void> {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📝 TEST: ${description}`);
  console.log(`${'='.repeat(60)}`);
  console.log(`❓ Query: "${query}"\n`);

  try {
    const response = await fetch(`${SERVER_URL}/api/agent/v2/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: query,
        mode: 'read_only'
      })
    });

    if (!response.ok) {
      console.log(`❌ HTTP Error: ${response.status} ${response.statusText}`);
      const text = await response.text();
      console.log(`Response: ${text.substring(0, 200)}...`);
      return;
    }

    const data: AgentResponse = await response.json();
    
    console.log(`✅ Agent Response:\n`);
    console.log(data.message || data.response || JSON.stringify(data, null, 2));
    
    if (data.toolCalls && data.toolCalls.length > 0) {
      console.log(`\n🔧 Tools Used:`);
      data.toolCalls.forEach((call: any) => {
        console.log(`  - ${call.tool || call.name}`);
        if (call.result) {
          console.log(`    Result: ${JSON.stringify(call.result).substring(0, 200)}...`);
        }
      });
    }

  } catch (error: any) {
    console.log(`❌ Request failed: ${error.message}`);
  }
}

async function main() {
  console.log('\n🤖 === CRM AGENT V2 DATABASE QUERY TEST ===\n');
  console.log(`Server: ${SERVER_URL}`);
  console.log(`Testing Agent V2 with new database query tools\n`);

  // Wait a moment to ensure server is ready
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Test 1: Voucher Sales Query
  await testAgentQuery(
    "What are our total voucher sales?",
    "Voucher Sales Total Query"
  );

  await new Promise(resolve => setTimeout(resolve, 2000));

  // Test 2: Voucher Sales with Date Range
  await testAgentQuery(
    "Show me all voucher sales from November 2025",
    "Voucher Sales Date Range Query"
  );

  await new Promise(resolve => setTimeout(resolve, 2000));

  // Test 3: Client Location Query
  await testAgentQuery(
    "How many clients live in Baden?",
    "Client Location Query - Baden"
  );

  await new Promise(resolve => setTimeout(resolve, 2000));

  // Test 4: Client Location Query - Vienna
  await testAgentQuery(
    "List all clients in Vienna",
    "Client Location Query - Vienna"
  );

  await new Promise(resolve => setTimeout(resolve, 2000));

  // Test 5: Company Report
  await testAgentQuery(
    "Generate a report of all clients with company details saved in the database",
    "Client Company Report"
  );

  await new Promise(resolve => setTimeout(resolve, 2000));

  // Test 6: Business Clients Only
  await testAgentQuery(
    "Show me all business clients who have a company name registered",
    "Business Clients Filter"
  );

  console.log('\n' + '='.repeat(60));
  console.log('🎉 TEST SUITE COMPLETE');
  console.log('='.repeat(60));
  console.log('\n✅ All test queries executed');
  console.log('\n📊 EXPECTED RESULTS:');
  console.log('  ✓ Agent should use voucher_sales_query for voucher questions');
  console.log('  ✓ Agent should use clients_location_query for location questions');
  console.log('  ✓ Agent should use clients_company_report for company reports');
  console.log('  ✓ Responses should include actual data from the database');
  console.log('  ✓ Numbers and statistics should be accurate\n');
}

main().catch(console.error);
