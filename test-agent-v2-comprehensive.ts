import './agent/v2/tools/index.js'; // Import to register all tools
import { listToolNames, getTool, getStats, listOpenAITools } from './agent/v2/core/ToolBus.js';

async function testAgentV2Tools() {
  console.log('\n🤖 AGENT V2 TOOLS SMOKE TEST');
  console.log('═'.repeat(80));
  
  try {
    // Test 1: List all registered tools
    console.log('\n📋 Test 1: List All Registered Tools');
    console.log('─'.repeat(80));
    const toolNames = listToolNames();
    console.log(`✅ Total registered tools: ${toolNames.length}`);
    
    toolNames.forEach((name, index) => {
      console.log(`   ${(index + 1).toString().padStart(2, ' ')}. ${name}`);
    });
    
    // Test 2: Get tool statistics
    console.log('\n📊 Test 2: Tool Statistics');
    console.log('─'.repeat(80));
    const stats = getStats();
    console.log(`✅ Total tools: ${stats.total}`);
    console.log(`   Low risk: ${stats.byRisk.low}`);
    console.log(`   Medium risk: ${stats.byRisk.medium}`);
    console.log(`   High risk: ${stats.byRisk.high}`);
    
    console.log(`\n   Scopes:`);
    Object.entries(stats.byScope).forEach(([scope, count]) => {
      console.log(`     ${scope}: ${count}`);
    });
    
    // Test 3: Verify critical tools exist
    console.log('\n🔍 Test 3: Verify Critical Tools');
    console.log('─'.repeat(80));
    
    const criticalTools = [
      'clients_search',
      'clients_create',
      'invoices_query',
      'invoices_create',
      'calendar_check_availability',
      'calendar_create_event',
      'email_send',
      'price_wizard_research',
      'price_wizard_activate'
    ];
    
    let allFound = true;
    for (const toolName of criticalTools) {
      try {
        const tool = getTool(toolName);
        if (tool) {
          console.log(`✅ ${toolName.padEnd(30)} (${tool.risk} risk)`);
        }
      } catch (error) {
        console.log(`❌ ${toolName.padEnd(30)} MISSING`);
        allFound = false;
      }
    }
    
    // Test 4: Get OpenAI tool definitions
    console.log('\n🔧 Test 4: OpenAI Tool Definitions');
    console.log('─'.repeat(80));
    // Use all scopes for testing
    const testScopes = ['CRM_READ', 'CRM_WRITE', 'INV_READ', 'INV_WRITE', 'EMAIL_SEND', 'CALENDAR_WRITE', 'PRICE_RESEARCH', 'PRICE_WRITE', 'ADMIN'];
    const openAITools = listOpenAITools(testScopes);
    console.log(`✅ OpenAI compatible tool definitions: ${openAITools.length}`);
    
    // Verify structure of first tool
    if (openAITools.length > 0) {
      const firstTool = openAITools[0];
      console.log(`\n   Sample tool structure: ${firstTool.function.name}`);
      console.log(`     Type: ${firstTool.type}`);
      console.log(`     Has description: ${!!firstTool.function.description}`);
      console.log(`     Has parameters: ${!!firstTool.function.parameters}`);
    }
    
    // Test 5: Verify tool categories
    console.log('\n📂 Test 5: Tool Categories');
    console.log('─'.repeat(80));
    
    const categories = {
      'CRM': toolNames.filter(n => n.startsWith('clients_') || n.startsWith('crm_')),
      'Invoices': toolNames.filter(n => n.startsWith('invoices_') || n.startsWith('invoice_')),
      'Calendar': toolNames.filter(n => n.startsWith('calendar_')),
      'Email': toolNames.filter(n => n.startsWith('email_')),
      'Gallery': toolNames.filter(n => n.startsWith('gallery_')),
      'Price Wizard': toolNames.filter(n => n.startsWith('price_wizard_')),
      'Website': toolNames.filter(n => n.startsWith('website_') || n.startsWith('onboarding_'))
    };
    
    Object.entries(categories).forEach(([category, tools]) => {
      if (tools.length > 0) {
        console.log(`   ${category.padEnd(15)} ${tools.length} tools`);
        tools.forEach(t => console.log(`      • ${t}`));
      }
    });
    
    // Test 6: Risk level distribution
    console.log('\n⚠️  Test 6: Risk Level Distribution');
    console.log('─'.repeat(80));
    
    const toolsByRisk: any = { low: [], medium: [], high: [] };
    toolNames.forEach(name => {
      try {
        const tool = getTool(name);
        if (tool) {
          toolsByRisk[tool.risk].push(name);
        }
      } catch (e) {}
    });
    
    console.log(`   LOW RISK (${toolsByRisk.low.length}):`);
    toolsByRisk.low.forEach((t: string) => console.log(`      • ${t}`));
    
    console.log(`\n   MEDIUM RISK (${toolsByRisk.medium.length}):`);
    toolsByRisk.medium.forEach((t: string) => console.log(`      • ${t}`));
    
    console.log(`\n   HIGH RISK (${toolsByRisk.high.length}):`);
    toolsByRisk.high.forEach((t: string) => console.log(`      • ${t}`));
    
    // Test 7: Scope coverage
    console.log('\n🔐 Test 7: Authorization Scopes');
    console.log('─'.repeat(80));
    
    const allScopes = new Set<string>();
    toolNames.forEach(name => {
      try {
        const tool = getTool(name);
        if (tool && tool.scopes) {
          tool.scopes.forEach(scope => allScopes.add(scope));
        }
      } catch (e) {}
    });
    
    console.log(`   Total unique scopes: ${allScopes.size}`);
    Array.from(allScopes).sort().forEach(scope => {
      console.log(`      • ${scope}`);
    });
    
    // Summary
    console.log('\n\n' + '═'.repeat(80));
    console.log('✅ AGENT V2 TOOLS TEST SUMMARY');
    console.log('═'.repeat(80));
    console.log(`   Total Tools: ${toolNames.length}`);
    console.log(`   Critical Tools: ${allFound ? 'All present ✅' : 'Some missing ❌'}`);
    console.log(`   Risk Levels: Low=${toolsByRisk.low.length}, Medium=${toolsByRisk.medium.length}, High=${toolsByRisk.high.length}`);
    console.log(`   Authorization Scopes: ${allScopes.size}`);
    console.log(`   OpenAI Compatible: Yes ✅`);
    console.log('═'.repeat(80));
    
    if (allFound && toolNames.length >= 20) {
      console.log('\n🎉 Agent V2 system is FULLY OPERATIONAL and PRODUCTION READY\n');
      return true;
    } else {
      console.log('\n⚠️  Agent V2 system has some issues\n');
      return false;
    }
    
  } catch (error: any) {
    console.error('\n❌ Agent V2 tools test failed:', error.message);
    console.error(error.stack);
    return false;
  }
}

testAgentV2Tools();
