"use strict";
/**
 * Price Research Service
 *
 * Orchestrates the full price research pipeline:
 * 1. Tavily search for competitors
 * 2. OpenAI extraction of pricing
 * 3. Market analysis and recommendations
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PriceResearchService = void 0;
const TavilySearchService_js_1 = require("./TavilySearchService.js");
const OpenAIPriceExtractor_js_1 = require("./OpenAIPriceExtractor.js");
const db_js_1 = require("../db.js");
class PriceResearchService {
    constructor() {
        this.tavily = new TavilySearchService_js_1.TavilySearchService();
        this.openai = new OpenAIPriceExtractor_js_1.OpenAIPriceExtractor();
    }
    /**
     * Run full price research for a session
     */
    async runResearch(config) {
        const { sessionId, location, services, maxCompetitors = 12 } = config;
        console.log(`\n${'='.repeat(60)}`);
        console.log(`🚀 PRICE RESEARCH: ${location}`);
        console.log(`   Services: ${services.join(', ')}`);
        console.log(`${'='.repeat(60)}\n`);
        try {
            // Stage 1: Search for competitors
            await this.updateSessionStatus(sessionId, 'discovering');
            console.log('📍 STAGE 1: Searching for competitors...');
            const competitors = await this.tavily.searchCompetitors(location, services, maxCompetitors);
            if (competitors.length === 0) {
                throw new Error('No competitors found. Try different search terms.');
            }
            // Save competitors to database
            for (const comp of competitors) {
                await db_js_1.pool.query(`
          INSERT INTO competitor_research (
            session_id, competitor_name, website_url, location, 
            status, discovery_source
          ) VALUES ($1, $2, $3, $4, 'pending', 'tavily')
        `, [sessionId, comp.name, comp.website, location]);
            }
            await db_js_1.pool.query(`
        UPDATE price_wizard_sessions 
        SET competitors_found = $2, updated_at = NOW()
        WHERE id = $1
      `, [sessionId, competitors.length]);
            console.log(`   ✅ Found ${competitors.length} competitors\n`);
            // Stage 2: Extract prices from each competitor
            await this.updateSessionStatus(sessionId, 'scraping');
            console.log('💰 STAGE 2: Extracting pricing information...');
            let totalPrices = 0;
            for (const comp of competitors) {
                try {
                    // Get deeper pricing content
                    const pricingContent = await this.tavily.searchCompetitorPricing(comp.website, comp.name);
                    const fullContent = comp.content + '\n\n' + pricingContent;
                    // Extract prices with AI
                    const analysis = await this.openai.extractPrices(comp.name, fullContent, comp.website);
                    // Save extracted prices
                    const competitorResult = await db_js_1.pool.query(`
            SELECT id FROM competitor_research 
            WHERE session_id = $1 AND website_url = $2
          `, [sessionId, comp.website]);
                    if (competitorResult.rows.length > 0) {
                        const competitorId = competitorResult.rows[0].id;
                        for (const price of analysis.prices) {
                            await db_js_1.pool.query(`
                INSERT INTO competitor_prices (
                  competitor_id, service_type, package_name, price_amount, 
                  currency, confidence_score, url_source, deliverables
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
              `, [
                                competitorId,
                                price.serviceType,
                                price.packageName || price.serviceName,
                                price.price,
                                price.currency || 'EUR',
                                price.confidence,
                                comp.website,
                                price.deliverables?.join(', ') || null,
                            ]);
                            totalPrices++;
                        }
                        // Update competitor status
                        const status = analysis.prices.length > 0 ? 'scraped' : 'failed';
                        const error = analysis.prices.length === 0 ? 'No prices found on website' : null;
                        await db_js_1.pool.query(`
              UPDATE competitor_research 
              SET status = $2, scraped_at = NOW(), scrape_error = $3
              WHERE id = $1
            `, [competitorId, status, error]);
                    }
                    console.log(`   ✅ ${comp.name}: ${analysis.prices.length} prices extracted`);
                    // Rate limiting
                    await this.delay(1000);
                }
                catch (error) {
                    console.error(`   ❌ ${comp.name}: ${error.message}`);
                }
            }
            await db_js_1.pool.query(`
        UPDATE price_wizard_sessions 
        SET prices_extracted = $2, updated_at = NOW()
        WHERE id = $1
      `, [sessionId, totalPrices]);
            console.log(`   📊 Total prices extracted: ${totalPrices}\n`);
            // Stage 3: Analyze market and generate recommendations
            await this.updateSessionStatus(sessionId, 'analyzing');
            console.log('🎯 STAGE 3: Analyzing market and generating recommendations...');
            // Get all competitor data for analysis
            const competitorData = await this.getCompetitorData(sessionId);
            console.log(`   📊 Loaded ${competitorData.length} competitors for analysis`);
            let suggestionsCount = 0;
            for (const service of services) {
                try {
                    const analysis = await this.openai.analyzeMarket(location, service, competitorData);
                    console.log(`   📈 Market analysis for ${service}: min=${analysis.priceStats.min}, median=${analysis.priceStats.median}, max=${analysis.priceStats.max}`);
                    for (const rec of analysis.recommendations) {
                        try {
                            await db_js_1.pool.query(`
                INSERT INTO price_list_suggestions (
                  session_id, service_type, tier, suggested_price,
                  market_min, market_median, market_max, reasoning, status
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending_review')
              `, [
                                sessionId,
                                service,
                                rec.tier,
                                rec.suggestedPrice,
                                analysis.priceStats.min,
                                analysis.priceStats.median,
                                analysis.priceStats.max,
                                `${rec.reasoning}\n\nCompetitive advantage: ${rec.competitiveAdvantage}\n\nMarket insight: ${analysis.marketInsights}`,
                            ]);
                            suggestionsCount++;
                            console.log(`     ✓ Inserted ${rec.tier} tier: €${rec.suggestedPrice}`);
                        }
                        catch (insertError) {
                            console.error(`     ✗ Failed to insert ${rec.tier} tier:`, insertError.message);
                        }
                    }
                    console.log(`   ✅ ${service}: Generated 3-tier recommendations`);
                }
                catch (analysisError) {
                    console.error(`   ❌ Analysis failed for ${service}:`, analysisError.message);
                }
            }
            // Update session as completed
            await db_js_1.pool.query(`
        UPDATE price_wizard_sessions 
        SET status = 'completed', suggestions_generated = $2, updated_at = NOW()
        WHERE id = $1
      `, [sessionId, suggestionsCount]);
            console.log(`\n${'='.repeat(60)}`);
            console.log('🎉 RESEARCH COMPLETE!');
            console.log(`   Competitors: ${competitors.length}`);
            console.log(`   Prices: ${totalPrices}`);
            console.log(`   Suggestions: ${suggestionsCount}`);
            console.log(`${'='.repeat(60)}\n`);
            return {
                stage: 'completed',
                competitorsFound: competitors.length,
                competitorsProcessed: competitors.length,
                pricesExtracted: totalPrices,
                message: 'Research completed successfully',
            };
        }
        catch (error) {
            console.error('❌ Research failed:', error);
            await db_js_1.pool.query(`
        UPDATE price_wizard_sessions SET status = 'failed', updated_at = NOW() WHERE id = $1
      `, [sessionId]);
            return {
                stage: 'failed',
                competitorsFound: 0,
                competitorsProcessed: 0,
                pricesExtracted: 0,
                message: error.message,
            };
        }
    }
    /**
     * Get competitor data for analysis
     */
    async getCompetitorData(sessionId) {
        const result = await db_js_1.pool.query(`
      SELECT 
        cr.competitor_name,
        cr.website_url,
        cr.location,
        ARRAY_AGG(DISTINCT cp.service_type) as specialties,
        MIN(cp.price_amount) as min_price,
        MAX(cp.price_amount) as max_price,
        JSON_AGG(JSON_BUILD_OBJECT(
          'serviceType', cp.service_type,
          'price', cp.price_amount,
          'confidence', cp.confidence_score
        )) as prices
      FROM competitor_research cr
      LEFT JOIN competitor_prices cp ON cp.competitor_id = cr.id
      WHERE cr.session_id = $1 AND cr.status = 'scraped'
      GROUP BY cr.id
    `, [sessionId]);
        return result.rows.map((row) => ({
            businessName: row.competitor_name,
            website: row.website_url,
            location: row.location,
            priceRange: { min: row.min_price || 0, max: row.max_price || 0 },
            positioning: this.inferPositioning(row.min_price, row.max_price),
            specialties: row.specialties?.filter((s) => s) || [],
            prices: row.prices?.filter((p) => p.price) || [],
        }));
    }
    /**
     * Infer market positioning from prices
     */
    inferPositioning(min, max) {
        const avg = (min + max) / 2;
        if (avg < 200)
            return 'budget';
        if (avg < 400)
            return 'mid-range';
        if (avg < 700)
            return 'premium';
        return 'luxury';
    }
    /**
     * Update session status
     */
    async updateSessionStatus(sessionId, status) {
        await db_js_1.pool.query(`
      UPDATE price_wizard_sessions SET status = $2, updated_at = NOW() WHERE id = $1
    `, [sessionId, status]);
    }
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
exports.PriceResearchService = PriceResearchService;
