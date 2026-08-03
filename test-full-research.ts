/**
 * Full Price Research Integration Test
 * 
 * Tests the complete flow with database integration
 * Run with: npx tsx test-full-research.ts
 */

import 'dotenv/config';
import { pool } from './server/db.js';
import { PriceResearchService } from './server/services/PriceResearchService.js';

async function main() {
  console.log('🚀 FULL PRICE RESEARCH INTEGRATION TEST\n');
  
  // Check API keys
  if (!process.env.TAVILY_API_KEY || !process.env.OPENAI_API_KEY) {
    console.error('❌ Missing API keys. Set TAVILY_API_KEY and OPENAI_API_KEY.');
    process.exit(1);
  }

  try {
    // Create a test session
    console.log('📝 Creating test session...');
    
    const sessionResult = await pool.query(`
      INSERT INTO price_wizard_sessions (location, services, status)
      VALUES ($1, $2, 'discovering')
      RETURNING id
    `, ['Wien, Österreich', ['Family Portrait', 'Newborn Photography']]);

    const sessionId = sessionResult.rows[0].id;
    console.log(`   Session ID: ${sessionId}\n`);

    // Run full research
    const research = new PriceResearchService();
    
    console.log('🔬 Running full research (this may take 1-2 minutes)...\n');
    
    const result = await research.runResearch({
      sessionId,
      location: 'Wien, Österreich',
      services: ['Family Portrait', 'Newborn Photography'],
      maxCompetitors: 5, // Limited for testing
    });

    console.log('\n📊 FINAL RESULTS:');
    console.log(`   Stage: ${result.stage}`);
    console.log(`   Competitors Found: ${result.competitorsFound}`);
    console.log(`   Prices Extracted: ${result.pricesExtracted}`);
    console.log(`   Message: ${result.message}`);

    // Verify database data
    console.log('\n📁 DATABASE VERIFICATION:');

    // Check competitors
    const competitors = await pool.query(`
      SELECT competitor_name, website_url, status 
      FROM competitor_research 
      WHERE session_id = $1
    `, [sessionId]);
    
    console.log(`\n   Competitors (${competitors.rows.length}):`);
    competitors.rows.forEach((c: any) => {
      console.log(`     - ${c.competitor_name} (${c.status})`);
    });

    // Check prices
    const prices = await pool.query(`
      SELECT cr.competitor_name, cp.service_type, cp.price_amount, cp.currency
      FROM competitor_prices cp
      JOIN competitor_research cr ON cr.id = cp.competitor_id
      WHERE cr.session_id = $1
      ORDER BY cp.service_type, cp.price_amount
    `, [sessionId]);

    console.log(`\n   Prices (${prices.rows.length}):`);
    prices.rows.slice(0, 10).forEach((p: any) => {
      console.log(`     - ${p.competitor_name}: ${p.service_type} = €${p.price_amount}`);
    });
    if (prices.rows.length > 10) {
      console.log(`     ... and ${prices.rows.length - 10} more`);
    }

    // Check suggestions
    const suggestions = await pool.query(`
      SELECT service_type, tier, suggested_price, market_min, market_median, market_max
      FROM price_list_suggestions
      WHERE session_id = $1
      ORDER BY service_type, tier
    `, [sessionId]);

    console.log(`\n   Price Suggestions (${suggestions.rows.length}):`);
    suggestions.rows.forEach((s: any) => {
      console.log(`     - ${s.service_type} (${s.tier}): €${s.suggested_price}`);
      console.log(`       Market: €${s.market_min} - €${s.market_median} - €${s.market_max}`);
    });

    // Final session status
    const finalSession = await pool.query(`
      SELECT status, competitors_found, prices_extracted, suggestions_generated
      FROM price_wizard_sessions WHERE id = $1
    `, [sessionId]);

    console.log('\n   Final Session Status:');
    console.log(`     Status: ${finalSession.rows[0].status}`);
    console.log(`     Competitors: ${finalSession.rows[0].competitors_found}`);
    console.log(`     Prices: ${finalSession.rows[0].prices_extracted}`);
    console.log(`     Suggestions: ${finalSession.rows[0].suggestions_generated}`);

    console.log('\n✅ TEST COMPLETED SUCCESSFULLY!\n');

  } catch (error: any) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error(error.stack);
  } finally {
    await pool.end();
  }
}

main();
