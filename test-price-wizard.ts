/**
 * Test Price Wizard API endpoints
 * 
 * Full workflow test: start → discover → scrape → analyze
 */

async function testPriceWizard() {
  const BASE_URL = 'http://localhost:5000';
  
  console.log('🧪 Testing Price Wizard API\n');

  try {
    // Step 1: Start a new session
    console.log('1️⃣ Starting new price research session...');
    const startResponse = await fetch(`${BASE_URL}/api/price-wizard/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: 'Wien',
        services: ['family', 'newborn', 'wedding'],
        userId: null,
      }),
    });

    const startData = await startResponse.json();
    console.log('✅ Session created:', startData);
    
    if (!startData.sessionId) {
      throw new Error('No session ID returned');
    }

    const sessionId = startData.sessionId;

    // Step 2: Discover competitors
    console.log('\n2️⃣ Discovering competitors...');
    const discoverResponse = await fetch(`${BASE_URL}/api/price-wizard/discover`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        maxResults: 5,
      }),
    });

    const discoverData = await discoverResponse.json();
    console.log(`✅ Found ${discoverData.competitorsFound} competitors`);
    discoverData.competitors.forEach((c: any) => {
      console.log(`   - ${c.competitor_name}: ${c.website_url}`);
    });

    if (discoverData.competitorsFound === 0) {
      console.log('⚠️  No competitors discovered - skipping scraping');
      return;
    }

    // Step 3: Check status
    console.log('\n3️⃣ Checking session status...');
    const statusResponse = await fetch(`${BASE_URL}/api/price-wizard/status/${sessionId}`);
    const statusData = await statusResponse.json();
    console.log('📊 Status:', {
      location: statusData.location,
      status: statusData.status,
      competitors_found: statusData.competitors_found,
      prices_extracted: statusData.prices_extracted,
    });

    // Step 4: Scrape prices (this will take a while due to rate limiting)
    console.log('\n4️⃣ Scraping competitor prices...');
    console.log('   (This may take 30-60 seconds due to rate limiting)');
    
    const scrapeResponse = await fetch(`${BASE_URL}/api/price-wizard/scrape`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    });

    const scrapeData = await scrapeResponse.json();
    console.log(`✅ Scraped ${scrapeData.scrapedCount} competitors`);
    console.log(`   Prices extracted: ${scrapeData.pricesExtracted}`);

    if (scrapeData.pricesExtracted === 0) {
      console.log('⚠️  No prices extracted - cannot analyze');
      return;
    }

    // Step 5: Get extracted prices
    console.log('\n5️⃣ Retrieved extracted prices...');
    const pricesResponse = await fetch(`${BASE_URL}/api/price-wizard/prices/${sessionId}`);
    const pricesData = await pricesResponse.json();
    
    console.log(`📋 Total prices: ${pricesData.length}`);
    pricesData.slice(0, 5).forEach((p: any) => {
      console.log(`   - ${p.competitor_name}: ${p.service_type} = €${p.price_amount} (confidence: ${p.confidence_score.toFixed(2)})`);
    });

    // Step 6: Analyze market and generate suggestions
    console.log('\n6️⃣ Analyzing market prices...');
    const analyzeResponse = await fetch(`${BASE_URL}/api/price-wizard/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    });

    const analyzeData = await analyzeResponse.json();
    console.log(`✅ Generated ${analyzeData.suggestionsCount} price suggestions`);

    // Step 7: Get suggestions
    console.log('\n7️⃣ Price suggestions:');
    const suggestionsResponse = await fetch(`${BASE_URL}/api/price-wizard/suggestions/${sessionId}`);
    const suggestions = await suggestionsResponse.json();

    suggestions.forEach((s: any) => {
      console.log(`\n   ${s.service_type.toUpperCase()} - ${s.tier}`);
      console.log(`   Suggested: €${s.suggested_price}`);
      console.log(`   Market: €${s.market_min} - €${s.market_median} - €${s.market_max}`);
      console.log(`   Reasoning: ${s.reasoning}`);
    });

    // Final status
    console.log('\n8️⃣ Final session status:');
    const finalStatus = await (await fetch(`${BASE_URL}/api/price-wizard/status/${sessionId}`)).json();
    console.log('📊 Complete:', {
      status: finalStatus.status,
      competitors_found: finalStatus.competitors_found,
      competitors_scraped: finalStatus.competitors_scraped,
      total_prices: finalStatus.total_prices,
      total_suggestions: finalStatus.total_suggestions,
    });

    console.log('\n✅ Price Wizard test completed successfully!');
    console.log(`\n📝 Session ID: ${sessionId}`);
    console.log('   You can view this session in the admin UI once implemented.');

  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response:', await error.response.text());
    }
  }
}

// Run the test
testPriceWizard();
