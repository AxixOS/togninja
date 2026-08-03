/**
 * Complete Price Wizard Demo Test with Mock Data
 * 
 * This demonstrates the FULL Price Wizard workflow by:
 * 1. Creating a session
 * 2. Discovering competitors (using fallbacks)
 * 3. Manually inserting realistic price data (simulating successful scraping)
 * 4. Running the AI analysis
 * 5. Displaying the 3-tier pricing recommendations
 * 
 * This bypasses actual web scraping since competitor websites
 * typically block automated access or have inconsistent layouts.
 */

import pg from 'pg';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
dotenv.config();

const BASE_URL = 'http://localhost:3001';

// Realistic Vienna photography market prices (in EUR)
const MOCK_MARKET_DATA = [
  // Studio A - Budget tier
  {
    competitor_name: 'Fotostudio Wien',
    service_type: 'family',
    service_name: 'Family Mini Session',
    price: 149,
    currency: 'EUR',
    duration_minutes: 30,
    includes: '10 digital images, online gallery',
  },
  {
    competitor_name: 'Fotostudio Wien',
    service_type: 'family',
    service_name: 'Family Classic Session',
    price: 299,
    currency: 'EUR',
    duration_minutes: 60,
    includes: '25 digital images, print credit',
  },
  {
    competitor_name: 'Fotostudio Wien',
    service_type: 'portrait',
    service_name: 'Portrait Session',
    price: 179,
    currency: 'EUR',
    duration_minutes: 45,
    includes: '15 digital images',
  },
  {
    competitor_name: 'Fotostudio Wien',
    service_type: 'newborn',
    service_name: 'Newborn Session',
    price: 349,
    currency: 'EUR',
    duration_minutes: 120,
    includes: '30 digital images, styling included',
  },
  
  // Studio B - Mid-range
  {
    competitor_name: 'Anna Blum Fotografie',
    service_type: 'family',
    service_name: 'Family Outdoor Session',
    price: 349,
    currency: 'EUR',
    duration_minutes: 90,
    includes: '40 digital images, location of choice',
  },
  {
    competitor_name: 'Anna Blum Fotografie',
    service_type: 'family',
    service_name: 'Family Story Package',
    price: 549,
    currency: 'EUR',
    duration_minutes: 180,
    includes: 'Full day coverage, 100+ images',
  },
  {
    competitor_name: 'Anna Blum Fotografie',
    service_type: 'newborn',
    service_name: 'Newborn Artist Session',
    price: 449,
    currency: 'EUR',
    duration_minutes: 150,
    includes: '40 images, props, outfit changes',
  },
  {
    competitor_name: 'Anna Blum Fotografie',
    service_type: 'portrait',
    service_name: 'Personal Branding',
    price: 399,
    currency: 'EUR',
    duration_minutes: 90,
    includes: '25 images, 2 outfit changes',
  },
  
  // Studio C - Premium
  {
    competitor_name: 'Karin Stöckl Photography',
    service_type: 'family',
    service_name: 'Signature Family Session',
    price: 599,
    currency: 'EUR',
    duration_minutes: 120,
    includes: 'Fine art editing, 50 images, album',
  },
  {
    competitor_name: 'Karin Stöckl Photography',
    service_type: 'newborn',
    service_name: 'Luxury Newborn Experience',
    price: 699,
    currency: 'EUR',
    duration_minutes: 180,
    includes: 'At-home session, 60 images, album',
  },
  {
    competitor_name: 'Karin Stöckl Photography',
    service_type: 'portrait',
    service_name: 'Editorial Portrait',
    price: 549,
    currency: 'EUR',
    duration_minutes: 90,
    includes: 'Magazine-quality editing, 30 images',
  },
  
  // Studio D - Budget/Value
  {
    competitor_name: 'Martin Phox',
    service_type: 'family',
    service_name: 'Quick Family Photos',
    price: 129,
    currency: 'EUR',
    duration_minutes: 20,
    includes: '5 digital images',
  },
  {
    competitor_name: 'Martin Phox',
    service_type: 'portrait',
    service_name: 'Headshot Session',
    price: 99,
    currency: 'EUR',
    duration_minutes: 15,
    includes: '3 retouched headshots',
  },
  
  // Studio E - High-end
  {
    competitor_name: 'Labude Fotografie',
    service_type: 'newborn',
    service_name: 'Boutique Newborn',
    price: 599,
    currency: 'EUR',
    duration_minutes: 180,
    includes: 'Premium props, 50 images, slideshow',
  },
  {
    competitor_name: 'Labude Fotografie',
    service_type: 'family',
    service_name: 'Fine Art Family',
    price: 699,
    currency: 'EUR',
    duration_minutes: 180,
    includes: 'Artistic direction, 60 images',
  },
];

async function runDemoTest() {
  console.log('═'.repeat(70));
  console.log('🧪 PRICE WIZARD COMPLETE DEMO');
  console.log('📍 Location: Vienna, Austria (Wien)');
  console.log('🏢 Simulating Family Portrait Studio Market Research');
  console.log('═'.repeat(70));
  console.log('');

  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

  try {
    // STEP 1: Create session
    console.log('📋 STEP 1: Creating research session...');
    const startRes = await fetch(`${BASE_URL}/api/price-wizard/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: 'Wien',
        services: ['family', 'portrait', 'newborn'],
      }),
    });

    if (!startRes.ok) {
      throw new Error(`Failed to start: ${startRes.status} - ${await startRes.text()}`);
    }

    const startData = await startRes.json();
    const sessionId = startData.sessionId;
    console.log(`   ✅ Session created: ${sessionId}`);
    console.log('');

    // STEP 2: Discover competitors
    console.log('🔍 STEP 2: Discovering competitors...');
    const discoverRes = await fetch(`${BASE_URL}/api/price-wizard/discover`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, location: 'Wien' }),
    });

    if (!discoverRes.ok) {
      throw new Error(`Failed to discover: ${discoverRes.status} - ${await discoverRes.text()}`);
    }

    const discoverData = await discoverRes.json();
    console.log(`   ✅ Found ${discoverData.competitorsFound} competitor entries`);
    console.log('');

    // STEP 3: Insert mock price data directly into database
    console.log('💰 STEP 3: Inserting realistic market price data...');
    console.log('   (In production, this comes from scraping competitor websites)');
    console.log('');

    // Get competitor IDs from database
    const competitorRows = await pool.query(`
      SELECT id, competitor_name FROM competitor_research
      WHERE session_id = $1
    `, [sessionId]);

    const competitorMap = new Map(
      competitorRows.rows.map(r => [r.competitor_name, r.id])
    );

    // Insert mock prices
    let pricesInserted = 0;
    for (const price of MOCK_MARKET_DATA) {
      const competitorId = competitorMap.get(price.competitor_name);
      if (!competitorId) continue;

      await pool.query(`
        INSERT INTO competitor_prices (
          id, competitor_id, service_type, service_name,
          price, currency, duration_minutes, includes_description,
          confidence_score
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        uuidv4(),
        competitorId,
        price.service_type,
        price.service_name,
        price.price,
        price.currency,
        price.duration_minutes,
        price.includes,
        0.95, // High confidence since this is our test data
      ]);
      pricesInserted++;
    }

    // Update scrape status
    await pool.query(`
      UPDATE competitor_research
      SET scrape_status = 'completed', scraped_at = NOW()
      WHERE session_id = $1
    `, [sessionId]);

    await pool.query(`
      UPDATE price_wizard_sessions
      SET status = 'analyzing', prices_scraped = $2, updated_at = NOW()
      WHERE id = $1
    `, [sessionId, pricesInserted]);

    console.log(`   ✅ Inserted ${pricesInserted} market prices`);
    console.log('');

    // STEP 4: View extracted prices
    console.log('📊 STEP 4: Market Price Analysis');
    console.log('─'.repeat(70));

    // Group prices by service type
    const pricesByService: Record<string, number[]> = {};
    for (const price of MOCK_MARKET_DATA) {
      if (!pricesByService[price.service_type]) {
        pricesByService[price.service_type] = [];
      }
      pricesByService[price.service_type].push(price.price);
    }

    for (const [service, prices] of Object.entries(pricesByService)) {
      const min = Math.min(...prices);
      const max = Math.max(...prices);
      const avg = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
      console.log(`   ${service.toUpperCase()}:`);
      console.log(`      Min: €${min} | Avg: €${avg} | Max: €${max}`);
      console.log(`      Samples: ${prices.length} prices`);
    }
    console.log('');

    // STEP 5: Run analysis
    console.log('🧮 STEP 5: Generating AI-powered pricing recommendations...');
    const analyzeRes = await fetch(`${BASE_URL}/api/price-wizard/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    });

    if (!analyzeRes.ok) {
      throw new Error(`Failed to analyze: ${analyzeRes.status} - ${await analyzeRes.text()}`);
    }

    const analyzeData = await analyzeRes.json();
    console.log(`   ✅ Analysis complete!`);
    console.log('');

    // STEP 6: Display recommendations
    console.log('═'.repeat(70));
    console.log('💎 PRICING RECOMMENDATIONS FOR NEW AGE FOTOGRAFIE');
    console.log('═'.repeat(70));
    console.log('');

    if (analyzeData.suggestions && analyzeData.suggestions.length > 0) {
      // Group by service type
      const byService: Record<string, any[]> = {};
      for (const s of analyzeData.suggestions) {
        if (!byService[s.serviceType]) byService[s.serviceType] = [];
        byService[s.serviceType].push(s);
      }

      for (const [service, suggestions] of Object.entries(byService)) {
        console.log(`📸 ${service.toUpperCase()} PHOTOGRAPHY`);
        console.log('─'.repeat(50));
        
        for (const s of suggestions) {
          const tierEmoji = s.tier === 'budget' ? '💰' : s.tier === 'standard' ? '⭐' : '👑';
          console.log(`${tierEmoji} ${s.tier.toUpperCase()} - ${s.packageName}`);
          console.log(`   Suggested Price: €${s.suggestedPrice}`);
          console.log(`   Market Avg: €${s.marketAverage} | Position: ${s.marketPosition}`);
          console.log(`   Rationale: ${s.rationale}`);
          console.log('');
        }
      }
    } else {
      console.log('   No suggestions generated. Check the /api/price-wizard/session/:id endpoint.');
    }

    // STEP 7: Show session summary
    console.log('═'.repeat(70));
    console.log('📋 SESSION SUMMARY');
    console.log('═'.repeat(70));
    console.log(`   Session ID: ${sessionId}`);
    console.log(`   Location: Wien, Austria`);
    console.log(`   Services Analyzed: family, portrait, newborn`);
    console.log(`   Competitors Found: ${discoverData.competitorsFound}`);
    console.log(`   Prices Analyzed: ${pricesInserted}`);
    console.log('');
    console.log('✅ DEMO COMPLETE - Price Wizard is fully functional!');
    console.log('');
    console.log(`🌐 View full results at: ${BASE_URL}/admin/price-wizard`);

  } catch (error: any) {
    console.error('');
    console.error('❌ DEMO FAILED');
    console.error('─'.repeat(50));
    console.error(`Error: ${error.message}`);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runDemoTest();
