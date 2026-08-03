/**
 * Test Price Wizard Pipeline
 * 
 * Tests the complete flow:
 * 1. Start session
 * 2. Discover competitors
 * 3. Scrape prices
 * 4. Analyze and generate suggestions
 */
import 'dotenv/config';
import { pool } from './server/db.js';
import { CompetitorDiscoveryService } from './server/services/CompetitorDiscoveryService.js';
import { PriceScraperService } from './server/services/PriceScraperService.js';

const API_BASE = 'http://localhost:5000/api/price-wizard';

async function testPipeline() {
  console.log('🧪 Testing Price Wizard Pipeline\n');
  console.log('='.repeat(50));

  // Check if server is running
  try {
    const healthRes = await fetch('http://localhost:5000/healthz');
    if (!healthRes.ok) {
      console.error('❌ Server not reachable. Please start the server first with: npm run dev');
      process.exit(1);
    }
    console.log('✅ Server is running\n');
  } catch (e) {
    console.error('❌ Server not running. Start it with: npm run dev');
    process.exit(1);
  }

  let sessionId: string | null = null;

  try {
    // Step 1: Start session
    console.log('1️⃣  Starting new research session...');
    const startRes = await fetch(`${API_BASE}/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: 'Wien',
        services: ['family', 'portrait', 'wedding']
      })
    });

    if (!startRes.ok) {
      const error = await startRes.text();
      throw new Error(`Failed to start session: ${error}`);
    }

    const startData = await startRes.json();
    sessionId = startData.sessionId;
    console.log(`   ✅ Session created: ${sessionId}`);
    console.log(`   📍 Location: ${startData.location}`);
    console.log(`   📋 Services: ${startData.services.join(', ')}\n`);

    // Step 2: Discover competitors
    console.log('2️⃣  Discovering competitors...');
    const discoverRes = await fetch(`${API_BASE}/discover`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, maxResults: 10 })
    });

    if (!discoverRes.ok) {
      const error = await discoverRes.text();
      throw new Error(`Failed to discover: ${error}`);
    }

    const discoverData = await discoverRes.json();
    console.log(`   ✅ Found ${discoverData.competitorsFound} competitors`);
    if (discoverData.competitors?.length > 0) {
      discoverData.competitors.slice(0, 3).forEach((c: any) => {
        console.log(`      • ${c.competitor_name}: ${c.website_url}`);
      });
    }
    console.log('');

    // Step 3: Scrape prices
    console.log('3️⃣  Scraping competitor websites for prices...');
    console.log('   (This may take a while due to rate limiting...)\n');
    
    const scrapeRes = await fetch(`${API_BASE}/scrape`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId })
    });

    if (!scrapeRes.ok) {
      const error = await scrapeRes.text();
      throw new Error(`Failed to scrape: ${error}`);
    }

    const scrapeData = await scrapeRes.json();
    console.log(`   ✅ Scraped ${scrapeData.scrapedCount} competitors`);
    console.log(`   💰 Extracted ${scrapeData.pricesExtracted} prices\n`);

    // Step 4: Get extracted prices
    console.log('4️⃣  Retrieving extracted prices...');
    const pricesRes = await fetch(`${API_BASE}/prices/${sessionId}`);
    const prices = await pricesRes.json();
    console.log(`   📊 Total prices: ${prices.length}`);
    if (prices.length > 0) {
      const byService: Record<string, number[]> = {};
      prices.forEach((p: any) => {
        if (!byService[p.service_type]) byService[p.service_type] = [];
        byService[p.service_type].push(p.price_amount);
      });
      Object.entries(byService).forEach(([service, amounts]) => {
        const min = Math.min(...amounts);
        const max = Math.max(...amounts);
        console.log(`      • ${service}: €${min} - €${max} (${amounts.length} prices)`);
      });
    }
    console.log('');

    // Step 5: Analyze and generate suggestions
    console.log('5️⃣  Analyzing market prices and generating suggestions...');
    const analyzeRes = await fetch(`${API_BASE}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId })
    });

    if (!analyzeRes.ok) {
      const error = await analyzeRes.text();
      throw new Error(`Failed to analyze: ${error}`);
    }

    const analyzeData = await analyzeRes.json();
    console.log(`   ✅ Generated ${analyzeData.suggestionsGenerated} price suggestions\n`);

    // Step 6: Get suggestions
    console.log('6️⃣  Price Recommendations:');
    console.log('   ' + '-'.repeat(60));
    
    const suggestionsRes = await fetch(`${API_BASE}/suggestions/${sessionId}`);
    const suggestions = await suggestionsRes.json();
    
    suggestions.forEach((s: any) => {
      const tierEmoji = s.tier === 'basic' ? '🔷' : s.tier === 'standard' ? '🔶' : '💎';
      console.log(`   ${tierEmoji} ${s.service_type.toUpperCase()} - ${s.tier.toUpperCase()}`);
      console.log(`      Suggested Price: €${s.suggested_price}`);
      console.log(`      Market Range: €${s.market_min} - €${s.market_max} (median: €${s.market_median})`);
      console.log(`      Reasoning: ${s.reasoning}`);
      console.log('');
    });

    // Summary
    console.log('='.repeat(50));
    console.log('✅ PIPELINE TEST COMPLETE\n');
    console.log('📊 Summary:');
    console.log(`   • Session ID: ${sessionId}`);
    console.log(`   • Competitors found: ${discoverData.competitorsFound}`);
    console.log(`   • Prices extracted: ${scrapeData.pricesExtracted}`);
    console.log(`   • Suggestions generated: ${analyzeData.suggestionsGenerated}`);
    console.log('\n💡 View results in the admin UI at: http://localhost:5000/admin/price-wizard');

  } catch (error: any) {
    console.error('\n❌ Pipeline test failed:', error.message);
    if (sessionId) {
      console.log(`\n📋 Partial results may be available for session: ${sessionId}`);
    }
  } finally {
    await pool.end();
  }
}

testPipeline().catch(console.error);
