import { pool } from './server/db.js';

async function addDemoPrices() {
  console.log('🎯 Adding demo competitor prices for Wien...\n');

  // Get the most recent completed session with competitors
  const sessionResult = await pool.query(`
    SELECT s.id, s.location 
    FROM price_wizard_sessions s
    WHERE s.status = 'completed' AND s.competitors_found > 0
    ORDER BY s.created_at DESC 
    LIMIT 1
  `);

  if (sessionResult.rows.length === 0) {
    console.log('❌ No completed sessions with competitors found');
    process.exit(1);
  }

  const session = sessionResult.rows[0];
  console.log(`📋 Using session: ${session.id} (${session.location})`);

  // Get competitors for this session
  const competitorsResult = await pool.query(`
    SELECT id, competitor_name FROM competitor_research WHERE session_id = $1
  `, [session.id]);

  const competitors = competitorsResult.rows;
  console.log(`Found ${competitors.length} competitors\n`);

  // Demo prices based on real Vienna photography market (EUR)
  const demoPrices = [
    // Family photography
    { service: 'family', prices: [250, 350, 450, 299, 380, 420] },
    // Portrait photography  
    { service: 'portrait', prices: [150, 200, 280, 180, 220, 250] },
    // Newborn photography
    { service: 'newborn', prices: [300, 400, 500, 350, 450, 380] },
  ];

  let totalAdded = 0;

  for (let i = 0; i < competitors.length && i < 6; i++) {
    const competitor = competitors[i];
    
    for (const serviceData of demoPrices) {
      const price = serviceData.prices[i] || serviceData.prices[0];
      
      await pool.query(`
        INSERT INTO competitor_prices (
          competitor_id, service_type, price_amount, currency,
          confidence_score, url_source, notes
        ) VALUES ($1, $2, $3, 'EUR', 1.0, 'demo_data', $4)
      `, [
        competitor.id,
        serviceData.service,
        price,
        `Demo price for ${serviceData.service} photography`
      ]);
      
      totalAdded++;
    }

    // Update competitor status to scraped
    await pool.query(`
      UPDATE competitor_research SET status = 'scraped', scraped_at = NOW() WHERE id = $1
    `, [competitor.id]);

    console.log(`✅ Added prices for: ${competitor.competitor_name}`);
  }

  // Update session prices count
  await pool.query(`
    UPDATE price_wizard_sessions 
    SET prices_extracted = $2, updated_at = NOW()
    WHERE id = $1
  `, [session.id, totalAdded]);

  console.log(`\n📊 Total prices added: ${totalAdded}`);

  // Now run analysis to generate suggestions
  console.log('\n🔍 Generating price suggestions...');

  // Get all prices for analysis
  const pricesResult = await pool.query(`
    SELECT service_type, price_amount
    FROM competitor_prices cp
    JOIN competitor_research cr ON cr.id = cp.competitor_id
    WHERE cr.session_id = $1
  `, [session.id]);

  // Group by service type
  const serviceStats = new Map();
  pricesResult.rows.forEach((row: any) => {
    if (!serviceStats.has(row.service_type)) {
      serviceStats.set(row.service_type, []);
    }
    serviceStats.get(row.service_type).push(parseFloat(row.price_amount));
  });

  let suggestionsCount = 0;

  for (const [serviceType, amounts] of serviceStats.entries()) {
    amounts.sort((a: number, b: number) => a - b);
    
    const min = amounts[0];
    const max = amounts[amounts.length - 1];
    const median = amounts[Math.floor(amounts.length / 2)];

    const tiers = [
      { tier: 'basic', price: Math.round(min * 1.05), reasoning: `Entry-level pricing, slightly above market min (€${min})` },
      { tier: 'standard', price: Math.round(median), reasoning: `Market median pricing (€${median})` },
      { tier: 'premium', price: Math.round(max * 0.95), reasoning: `Premium tier, just below market max (€${max})` },
    ];

    for (const t of tiers) {
      await pool.query(`
        INSERT INTO price_list_suggestions (
          session_id, service_type, tier, suggested_price,
          market_min, market_median, market_max, reasoning, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending_review')
      `, [session.id, serviceType, t.tier, t.price, min, median, max, t.reasoning]);
      suggestionsCount++;
    }

    console.log(`  ✅ ${serviceType}: min=€${min}, median=€${median}, max=€${max}`);
  }

  // Update session
  await pool.query(`
    UPDATE price_wizard_sessions 
    SET suggestions_generated = $2, status = 'completed', updated_at = NOW()
    WHERE id = $1
  `, [session.id, suggestionsCount]);

  console.log(`\n🎉 Generated ${suggestionsCount} price suggestions!`);
  console.log('\n✅ Refresh the Price Wizard page to see the results!');

  process.exit(0);
}

addDemoPrices().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
