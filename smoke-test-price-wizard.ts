/**
 * Smoke Test: Price Wizard for New Age Fotografie
 * 
 * Tests the complete pricing research workflow for a family portrait studio in Vienna, Austria
 */
import 'dotenv/config';

const API_BASE = 'http://localhost:3001/api/price-wizard';

async function smokeTest() {
  console.log('═'.repeat(70));
  console.log('🧪 SMOKE TEST: Price Wizard for Family Portrait Studio');
  console.log('📍 Location: Vienna, Austria (Wien)');
  console.log('🏢 Studio Type: Family & Portrait Photography (like New Age Fotografie)');
  console.log('═'.repeat(70));
  console.log('');

  let sessionId: string | null = null;

  try {
    // ═══════════════════════════════════════════════════════════════════════
    // STEP 1: Start a new research session
    // ═══════════════════════════════════════════════════════════════════════
    console.log('📋 STEP 1: Creating research session...');
    console.log('   Services: family, portrait, newborn');
    
    const startRes = await fetch(`${API_BASE}/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: 'Wien',
        services: ['family', 'portrait', 'newborn']
      })
    });

    if (!startRes.ok) {
      const error = await startRes.text();
      throw new Error(`Failed to start session: ${startRes.status} - ${error}`);
    }

    const startData = await startRes.json();
    sessionId = startData.sessionId;
    
    console.log('   ✅ Session created successfully!');
    console.log(`   📌 Session ID: ${sessionId}`);
    console.log(`   📍 Location: ${startData.location}`);
    console.log(`   📋 Services: ${startData.services?.join(', ')}`);
    console.log('');

    // ═══════════════════════════════════════════════════════════════════════
    // STEP 2: Discover competitors
    // ═══════════════════════════════════════════════════════════════════════
    console.log('🔍 STEP 2: Discovering competitors in Wien...');
    console.log('   (This searches for photography studios in Vienna)');
    
    const discoverRes = await fetch(`${API_BASE}/discover`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, maxResults: 10 })
    });

    if (!discoverRes.ok) {
      const error = await discoverRes.text();
      throw new Error(`Failed to discover competitors: ${discoverRes.status} - ${error}`);
    }

    const discoverData = await discoverRes.json();
    
    console.log(`   ✅ Found ${discoverData.competitorsFound} competitors!`);
    console.log('');
    console.log('   Discovered competitors:');
    if (discoverData.competitors && discoverData.competitors.length > 0) {
      discoverData.competitors.forEach((c: any, i: number) => {
        console.log(`   ${i + 1}. ${c.competitor_name || 'Unknown'}`);
        console.log(`      🌐 ${c.website_url}`);
      });
    }
    console.log('');

    // ═══════════════════════════════════════════════════════════════════════
    // STEP 3: Scrape prices from competitor websites
    // ═══════════════════════════════════════════════════════════════════════
    console.log('💰 STEP 3: Scraping competitor websites for pricing...');
    console.log('   (This visits each website and extracts price information)');
    console.log('   ⏳ This may take a moment due to rate limiting...');
    console.log('');
    
    const scrapeRes = await fetch(`${API_BASE}/scrape`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId })
    });

    if (!scrapeRes.ok) {
      const error = await scrapeRes.text();
      throw new Error(`Failed to scrape prices: ${scrapeRes.status} - ${error}`);
    }

    const scrapeData = await scrapeRes.json();
    
    console.log(`   ✅ Scraping complete!`);
    console.log(`   📊 Competitors scraped: ${scrapeData.scrapedCount}`);
    console.log(`   💰 Prices extracted: ${scrapeData.pricesExtracted}`);
    console.log('');

    // ═══════════════════════════════════════════════════════════════════════
    // STEP 4: Get extracted prices
    // ═══════════════════════════════════════════════════════════════════════
    console.log('📊 STEP 4: Retrieving extracted market prices...');
    
    const pricesRes = await fetch(`${API_BASE}/prices/${sessionId}`);
    const prices = await pricesRes.json();
    
    console.log(`   ✅ Retrieved ${prices.length} prices from the market`);
    
    if (prices.length > 0) {
      // Group by service type
      const byService: Record<string, { prices: number[], competitors: string[] }> = {};
      prices.forEach((p: any) => {
        const service = p.service_type || 'unknown';
        if (!byService[service]) {
          byService[service] = { prices: [], competitors: [] };
        }
        byService[service].prices.push(parseFloat(p.price_amount));
        if (!byService[service].competitors.includes(p.competitor_name)) {
          byService[service].competitors.push(p.competitor_name);
        }
      });
      
      console.log('');
      console.log('   Market Price Summary by Service:');
      console.log('   ' + '─'.repeat(50));
      
      Object.entries(byService).forEach(([service, data]) => {
        const min = Math.min(...data.prices);
        const max = Math.max(...data.prices);
        const avg = data.prices.reduce((a, b) => a + b, 0) / data.prices.length;
        
        console.log(`   📷 ${service.toUpperCase()}`);
        console.log(`      Range: €${min.toFixed(0)} - €${max.toFixed(0)}`);
        console.log(`      Average: €${avg.toFixed(0)}`);
        console.log(`      Samples: ${data.prices.length} prices from ${data.competitors.length} competitors`);
        console.log('');
      });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // STEP 5: Analyze and generate pricing suggestions
    // ═══════════════════════════════════════════════════════════════════════
    console.log('🧮 STEP 5: Analyzing market and generating pricing suggestions...');
    
    const analyzeRes = await fetch(`${API_BASE}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId })
    });

    if (!analyzeRes.ok) {
      const error = await analyzeRes.text();
      throw new Error(`Failed to analyze: ${analyzeRes.status} - ${error}`);
    }

    const analyzeData = await analyzeRes.json();
    
    console.log(`   ✅ Analysis complete!`);
    console.log(`   💡 Generated ${analyzeData.suggestionsGenerated} pricing recommendations`);
    console.log('');

    // ═══════════════════════════════════════════════════════════════════════
    // STEP 6: Display pricing recommendations
    // ═══════════════════════════════════════════════════════════════════════
    console.log('💎 STEP 6: Pricing Recommendations for New Age Fotografie');
    console.log('═'.repeat(70));
    
    const suggestionsRes = await fetch(`${API_BASE}/suggestions/${sessionId}`);
    const suggestions = await suggestionsRes.json();
    
    // Group by service
    const byServiceSuggestions: Record<string, any[]> = {};
    suggestions.forEach((s: any) => {
      if (!byServiceSuggestions[s.service_type]) {
        byServiceSuggestions[s.service_type] = [];
      }
      byServiceSuggestions[s.service_type].push(s);
    });
    
    Object.entries(byServiceSuggestions).forEach(([service, tiers]) => {
      console.log('');
      console.log(`📷 ${service.toUpperCase()} PHOTOGRAPHY`);
      console.log('─'.repeat(50));
      
      // Sort by tier: basic, standard, premium
      const tierOrder = ['basic', 'standard', 'premium'];
      tiers.sort((a, b) => tierOrder.indexOf(a.tier) - tierOrder.indexOf(b.tier));
      
      tiers.forEach((s: any) => {
        const tierEmoji = s.tier === 'basic' ? '🔷' : s.tier === 'standard' ? '🔶' : '💎';
        const tierLabel = s.tier.charAt(0).toUpperCase() + s.tier.slice(1);
        
        console.log(`${tierEmoji} ${tierLabel} Tier`);
        console.log(`   💰 Suggested Price: €${s.suggested_price}`);
        console.log(`   📊 Market: €${s.market_min} (min) → €${s.market_median} (median) → €${s.market_max} (max)`);
        console.log(`   💡 ${s.reasoning}`);
        console.log('');
      });
    });

    // ═══════════════════════════════════════════════════════════════════════
    // SUMMARY
    // ═══════════════════════════════════════════════════════════════════════
    console.log('═'.repeat(70));
    console.log('✅ SMOKE TEST COMPLETE');
    console.log('═'.repeat(70));
    console.log('');
    console.log('📊 Results Summary:');
    console.log(`   • Session ID: ${sessionId}`);
    console.log(`   • Location: Wien (Vienna), Austria`);
    console.log(`   • Services researched: family, portrait, newborn`);
    console.log(`   • Competitors discovered: ${discoverData.competitorsFound}`);
    console.log(`   • Prices extracted: ${scrapeData.pricesExtracted}`);
    console.log(`   • Suggestions generated: ${analyzeData.suggestionsGenerated}`);
    console.log('');
    console.log('🌐 View in browser: http://localhost:3001/admin/price-wizard');
    console.log('');

  } catch (error: any) {
    console.error('');
    console.error('❌ SMOKE TEST FAILED');
    console.error('─'.repeat(50));
    console.error(`Error: ${error.message}`);
    
    if (sessionId) {
      console.log(`\n📋 Partial results may be available for session: ${sessionId}`);
      console.log('   View at: http://localhost:3001/admin/price-wizard');
    }
    
    process.exit(1);
  }
}

smokeTest().catch(console.error);
