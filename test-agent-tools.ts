/**
 * Test Agent V2 Tool Registration
 * 
 * Verifies price wizard tools are properly registered with ToolBus
 */

import './agent/v2/tools/index.js';
import { listToolNames, getTool, getStats } from './agent/v2/core/ToolBus.js';

async function testToolRegistration() {
  console.log('🧪 Testing Agent V2 Tool Registration\n');

  try {
    // Get all registered tools
    const toolNames = listToolNames();
    const stats = getStats();
    
    console.log(`📊 Total tools registered: ${stats.totalTools}\n`);

    // Check for price wizard tools
    const priceResearch = getTool('price_wizard_research');
    const priceActivate = getTool('price_wizard_activate');

    if (priceResearch) {
      console.log('✅ price_wizard_research registered');
      console.log('   Risk:', priceResearch.risk);
      console.log('   Scopes:', priceResearch.authz.join(', '));
    } else {
      console.log('❌ price_wizard_research NOT registered');
    }

    console.log('');

    if (priceActivate) {
      console.log('✅ price_wizard_activate registered');
      console.log('   Risk:', priceActivate.risk);
      console.log('   Scopes:', priceActivate.authz.join(', '));
    } else {
      console.log('❌ price_wizard_activate NOT registered');
    }

    console.log('\n📋 Tool Statistics:');
    console.log('─'.repeat(50));
    
    console.log(`\n🟢 Low Risk: ${stats.byRisk.low} tools`);
    console.log(`🟡 Medium Risk: ${stats.byRisk.medium} tools`);
    console.log(`🔴 High Risk: ${stats.byRisk.high} tools`);

    console.log('\n� By Authorization Scope:');
    Object.entries(stats.byScope).forEach(([scope, count]) => {
      console.log(`   ${scope}: ${count} tools`);
    });

    console.log('\n� All Registered Tools:');
    toolNames.sort().forEach(name => {
      const tool = getTool(name);
      const icon = tool?.risk === 'low' ? '�' : tool?.risk === 'medium' ? '🟡' : '🔴';
      console.log(`   ${icon} ${name}`);
    });

    console.log('\n✅ Tool registration test complete!');

    if (priceResearch && priceActivate) {
      console.log('\n🎉 Price Wizard tools are ready for Agent V2 use!');
    }

  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

testToolRegistration();
