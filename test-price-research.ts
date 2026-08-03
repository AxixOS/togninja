/**
 * Test Price Research Services
 * 
 * Tests the Tavily + OpenAI integration for competitor research
 * Run with: npx tsx test-price-research.ts
 */

import 'dotenv/config';

// Check required environment variables
const requiredEnvVars = ['TAVILY_API_KEY', 'OPENAI_API_KEY'];
const missing = requiredEnvVars.filter(key => !process.env[key]);

if (missing.length > 0) {
  console.error('❌ Missing required environment variables:', missing.join(', '));
  console.log('\nPlease set these in your .env file or environment:');
  console.log('  TAVILY_API_KEY=your-tavily-key');
  console.log('  OPENAI_API_KEY=your-openai-key');
  console.log('  OPENAI_MODEL=gpt-4o-mini (optional, defaults to gpt-4o-mini)');
  process.exit(1);
}

import { TavilySearchService } from './server/services/TavilySearchService.js';
import { OpenAIPriceExtractor } from './server/services/OpenAIPriceExtractor.js';

async function testTavilySearch() {
  console.log('\n' + '='.repeat(60));
  console.log('🔍 TESTING TAVILY SEARCH SERVICE');
  console.log('='.repeat(60) + '\n');

  const tavily = new TavilySearchService();

  // Test 1: Search for competitors
  console.log('📍 Test 1: Searching for Vienna family photographers...\n');
  
  const competitors = await tavily.searchCompetitors(
    'Wien, Österreich',
    ['Family Portrait', 'Newborn Photography'],
    5 // Limit to 5 for testing
  );

  console.log(`Found ${competitors.length} competitors:\n`);
  competitors.forEach((comp, i) => {
    console.log(`${i + 1}. ${comp.name}`);
    console.log(`   🌐 ${comp.website}`);
    console.log(`   📝 ${comp.content.substring(0, 100)}...`);
    console.log('');
  });

  // Test 2: Get pricing content for first competitor
  if (competitors.length > 0) {
    console.log('💰 Test 2: Getting pricing content for first competitor...\n');
    
    const pricingContent = await tavily.searchCompetitorPricing(
      competitors[0].website,
      competitors[0].name
    );

    console.log(`Pricing content (first 500 chars):`);
    console.log(pricingContent.substring(0, 500));
    console.log('...\n');
  }

  return competitors;
}

async function testOpenAIPriceExtractor(competitors: any[]) {
  console.log('\n' + '='.repeat(60));
  console.log('🤖 TESTING OPENAI PRICE EXTRACTOR');
  console.log('='.repeat(60) + '\n');

  const openai = new OpenAIPriceExtractor();

  if (competitors.length === 0) {
    console.log('⚠️  No competitors to test with');
    return [];
  }

  // Test 1: Extract prices from first competitor
  console.log('📊 Test 1: Extracting prices from first competitor...\n');
  
  const comp = competitors[0];
  const analysis = await openai.extractPrices(comp.name, comp.content, comp.website);

  console.log(`Competitor: ${analysis.competitorName}`);
  console.log(`Market Position: ${analysis.marketPosition}`);
  console.log(`Extracted ${analysis.prices.length} prices:\n`);

  analysis.prices.forEach((price, i) => {
    console.log(`${i + 1}. ${price.serviceName || price.packageName}`);
    console.log(`   💶 €${price.price} (${price.confidence * 100}% confidence)`);
    console.log(`   📦 ${price.deliverables?.join(', ') || 'N/A'}`);
    console.log('');
  });

  return analysis.prices;
}

async function testMarketAnalysis() {
  console.log('\n' + '='.repeat(60));
  console.log('📈 TESTING MARKET ANALYSIS');
  console.log('='.repeat(60) + '\n');

  const openai = new OpenAIPriceExtractor();

  // Create mock competitor data for analysis
  const mockCompetitors = [
    {
      businessName: 'Fotostudio Schmidt',
      website: 'https://fotostudio-schmidt.at',
      location: 'Wien',
      priceRange: { min: 250, max: 550 },
      positioning: 'mid-range' as const,
      specialties: ['Family Portrait'],
      prices: [
        { serviceType: 'Family Portrait', price: 299, confidence: 0.9 },
        { serviceType: 'Family Portrait', price: 449, confidence: 0.9 },
      ],
    },
    {
      businessName: 'Momentaufnahme Wien',
      website: 'https://momentaufnahme.wien',
      location: 'Wien',
      priceRange: { min: 350, max: 700 },
      positioning: 'premium' as const,
      specialties: ['Family Portrait', 'Newborn'],
      prices: [
        { serviceType: 'Family Portrait', price: 399, confidence: 0.85 },
        { serviceType: 'Family Portrait', price: 599, confidence: 0.85 },
      ],
    },
    {
      businessName: 'Budget Fotos',
      website: 'https://budget-fotos.at',
      location: 'Wien',
      priceRange: { min: 150, max: 300 },
      positioning: 'budget' as const,
      specialties: ['Family Portrait'],
      prices: [
        { serviceType: 'Family Portrait', price: 179, confidence: 0.8 },
        { serviceType: 'Family Portrait', price: 249, confidence: 0.8 },
      ],
    },
  ];

  console.log('Analyzing market for Family Portrait in Wien...\n');

  const analysis = await openai.analyzeMarket('Wien', 'Family Portrait', mockCompetitors);

  console.log('📊 Price Statistics:');
  console.log(`   Min: €${analysis.priceStats.min}`);
  console.log(`   Median: €${analysis.priceStats.median}`);
  console.log(`   Max: €${analysis.priceStats.max}`);
  console.log(`   Average: €${analysis.priceStats.average}`);
  console.log('');

  console.log('🎯 Recommendations:\n');
  analysis.recommendations.forEach((rec, i) => {
    console.log(`${i + 1}. ${rec.tier.toUpperCase()} Tier`);
    console.log(`   💶 Suggested: €${rec.suggestedPrice}`);
    console.log(`   📝 ${rec.reasoning}`);
    console.log(`   ✨ ${rec.competitiveAdvantage}`);
    console.log('');
  });

  console.log('💡 Market Insights:');
  console.log(`   ${analysis.marketInsights}`);
}

async function main() {
  console.log('🚀 PRICE RESEARCH SERVICES TEST\n');
  console.log('Environment:');
  console.log(`  TAVILY_API_KEY: ${process.env.TAVILY_API_KEY?.substring(0, 10)}...`);
  console.log(`  OPENAI_API_KEY: ${process.env.OPENAI_API_KEY?.substring(0, 10)}...`);
  console.log(`  OPENAI_MODEL: ${process.env.OPENAI_MODEL || 'gpt-4o-mini (default)'}`);

  try {
    // Test Tavily search
    const competitors = await testTavilySearch();

    // Test OpenAI price extraction
    await testOpenAIPriceExtractor(competitors);

    // Test market analysis
    await testMarketAnalysis();

    console.log('\n' + '='.repeat(60));
    console.log('✅ ALL TESTS COMPLETED SUCCESSFULLY');
    console.log('='.repeat(60) + '\n');

  } catch (error: any) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
