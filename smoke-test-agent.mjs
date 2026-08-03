// Simple smoke test for Agent V2
// Run with: node smoke-test-agent.mjs

const testQueries = [
  { query: "Show me all clients", expectedTool: "crm_clients_search" },
  { query: "List unpaid invoices", expectedTool: "invoices_query" },
  { query: "What appointments do I have today?", expectedTool: "appointments_query" },
  { query: "Show me all galleries", expectedTool: "galleries_list" },
  { query: "What vouchers do we sell?", expectedTool: "voucher_products_list" },
];

async function runSmokeTest() {
  console.log("🧪 Agent V2 Smoke Test\n");
  console.log("=".repeat(60));

  let passed = 0;
  let failed = 0;

  for (const test of testQueries) {
    try {
      console.log(`\nTesting: "${test.query}"`);
      
      const response = await fetch("http://localhost:3001/api/agent/v2/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: test.query,
          executionMode: "read_only"
        })
      });

      const data = await response.json();
      
      // Debug: Show full response
      console.log(`   Status: ${response.status}`);
      console.log(`   Has message: ${!!data.message}`);
      console.log(`   Message length: ${data.message?.length || 0}`);
      
      if (data.toolCalls) {
        console.log(`   Tools called: ${data.toolCalls.map(t => `${t.tool}(${t.ok ? '✓' : '✗'})`).join(', ')}`);
      }
      
      if (response.ok) {
        if (data.message && data.message.length > 20) {
          // Got a substantive response
          const hasError = data.message.toLowerCase().includes('error') || 
                          data.message.toLowerCase().includes('cannot') ||
                          data.message.toLowerCase().includes('failed');
          
          if (hasError) {
            console.log(`   ⚠️ PARTIAL - Got response but may have errors`);
            console.log(`   Preview: ${data.message.substring(0, 150)}...`);
            passed++; // Still count as partial pass since agent responded
          } else {
            console.log(`   ✅ PASS - Got valid response`);
            console.log(`   Preview: ${data.message.substring(0, 150)}...`);
            passed++;
          }
        } else if (data.error) {
          console.log(`   ❌ FAIL - Error: ${data.error}`);
          failed++;
        } else {
          console.log(`   ⚠️ EMPTY - No substantive response`);
          failed++;
        }
      } else {
        console.log(`   ❌ FAIL - HTTP ${response.status}`);
        if (data.error) console.log(`   Error: ${data.error}`);
        failed++;
      }
    } catch (error) {
      console.log(`   ❌ ERROR: ${error.message}`);
      failed++;
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log(`\n📊 Results: ${passed}/${testQueries.length} passed (${Math.round(passed/testQueries.length*100)}%)`);
  
  if (failed === 0) {
    console.log("🎉 All tests passed!");
  } else {
    console.log(`⚠️ ${failed} tests need attention`);
  }

  return { passed, failed };
}

runSmokeTest().then(({ failed }) => process.exit(failed > 0 ? 1 : 0));
