"use strict";
/**
 * Price Wizard API Routes
 *
 * Endpoints for autonomous competitive pricing research
 * Uses Tavily API for search + OpenAI for price extraction
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_js_1 = require("../db.js");
const PriceScraperService_js_1 = require("../services/PriceScraperService.js");
const CompetitorDiscoveryService_js_1 = require("../services/CompetitorDiscoveryService.js");
const PriceResearchService_js_1 = require("../services/PriceResearchService.js");
const router = (0, express_1.Router)();
const scraper = new PriceScraperService_js_1.PriceScraperService();
const discovery = new CompetitorDiscoveryService_js_1.CompetitorDiscoveryService();
const priceResearch = new PriceResearchService_js_1.PriceResearchService();
/**
 * POST /api/price-wizard/start
 * Start a new price research session
 */
router.post('/start', async (req, res) => {
    try {
        const { location, services, userId } = req.body;
        if (!location || !services || !Array.isArray(services)) {
            return res.status(400).json({
                error: 'Missing required fields: location, services (array)'
            });
        }
        // Create session
        const result = await db_js_1.pool.query(`
      INSERT INTO price_wizard_sessions (user_id, location, services, status)
      VALUES ($1, $2, $3, 'discovering')
      RETURNING id, created_at
    `, [userId || null, location, services]);
        const session = result.rows[0];
        res.json({
            success: true,
            sessionId: session.id,
            location,
            services,
            status: 'discovering',
            createdAt: session.created_at,
        });
    }
    catch (error) {
        console.error('Error starting price wizard session:', error);
        res.status(500).json({ error: error.message });
    }
});
/**
 * POST /api/price-wizard/discover
 * Discover competitors for a session
 */
router.post('/discover', async (req, res) => {
    try {
        const { sessionId, maxResults = 10 } = req.body;
        if (!sessionId) {
            return res.status(400).json({ error: 'Missing sessionId' });
        }
        // Get session details
        const sessionResult = await db_js_1.pool.query(`
      SELECT location, services FROM price_wizard_sessions WHERE id = $1
    `, [sessionId]);
        if (sessionResult.rows.length === 0) {
            return res.status(404).json({ error: 'Session not found' });
        }
        const { location, services } = sessionResult.rows[0];
        // Discover competitors
        const competitors = await discovery.discoverCompetitors({
            location,
            services,
            maxResults,
        });
        // Save to database
        const saved = [];
        for (const competitor of competitors) {
            const result = await db_js_1.pool.query(`
        INSERT INTO competitor_research (
          session_id, competitor_name, website_url, location, status, discovery_source
        ) VALUES ($1, $2, $3, $4, 'pending', $5)
        RETURNING id, competitor_name, website_url
      `, [
                sessionId,
                competitor.name,
                competitor.website,
                competitor.location || location,
                competitor.source,
            ]);
            saved.push(result.rows[0]);
        }
        // Update session
        await db_js_1.pool.query(`
      UPDATE price_wizard_sessions
      SET status = 'scraping', competitors_found = $2, updated_at = NOW()
      WHERE id = $1
    `, [sessionId, saved.length]);
        res.json({
            success: true,
            sessionId,
            competitorsFound: saved.length,
            competitors: saved,
        });
    }
    catch (error) {
        console.error('Error discovering competitors:', error);
        res.status(500).json({ error: error.message });
    }
});
/**
 * POST /api/price-wizard/scrape
 * Mark competitors for manual price entry (scraping disabled - URLs are fictional)
 */
router.post('/scrape', async (req, res) => {
    try {
        const { sessionId } = req.body;
        if (!sessionId) {
            return res.status(400).json({ error: 'Missing sessionId' });
        }
        console.log(`📋 Processing scrape for session ${sessionId}`);
        // Get pending competitors
        const result = await db_js_1.pool.query(`
      SELECT id, website_url 
      FROM competitor_research 
      WHERE session_id = $1 AND status = 'pending'
    `, [sessionId]);
        const competitors = result.rows;
        console.log(`Found ${competitors.length} pending competitors`);
        // Mark all as failed immediately (scraping disabled - fallback URLs are fictional)
        // Users can add prices manually using the + button
        for (const competitor of competitors) {
            await db_js_1.pool.query(`
        UPDATE competitor_research 
        SET status = 'failed', scrape_error = 'Manual entry required - click + to add prices' 
        WHERE id = $1
      `, [competitor.id]);
        }
        // Update session to analyzing
        await db_js_1.pool.query(`
      UPDATE price_wizard_sessions
      SET status = 'analyzing', updated_at = NOW()
      WHERE id = $1
    `, [sessionId]);
        console.log(`✅ Marked ${competitors.length} competitors for manual entry, session moved to analyzing`);
        res.json({
            success: true,
            sessionId,
            scrapedCount: 0,
            pricesExtracted: 0,
            message: 'Competitors marked for manual price entry'
        });
    }
    catch (error) {
        console.error('Error in scrape endpoint:', error);
        res.status(500).json({ error: error.message });
    }
});
/**
 * GET /api/price-wizard/status/:sessionId
 * Get status of a price research session
 */
router.get('/status/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;
        const result = await db_js_1.pool.query(`
      SELECT 
        s.id,
        s.location,
        s.services,
        s.status,
        s.competitors_found,
        s.prices_extracted,
        s.suggestions_generated,
        s.created_at,
        s.updated_at,
        COUNT(DISTINCT cr.id) FILTER (WHERE cr.status = 'scraped') as competitors_scraped,
        COUNT(DISTINCT cp.id) as total_prices,
        COUNT(DISTINCT pl.id) as total_suggestions
      FROM price_wizard_sessions s
      LEFT JOIN competitor_research cr ON cr.session_id = s.id
      LEFT JOIN competitor_prices cp ON cp.competitor_id = cr.id
      LEFT JOIN price_list_suggestions pl ON pl.session_id = s.id
      WHERE s.id = $1
      GROUP BY s.id
    `, [sessionId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Session not found' });
        }
        res.json(result.rows[0]);
    }
    catch (error) {
        console.error('Error getting session status:', error);
        res.status(500).json({ error: error.message });
    }
});
/**
 * GET /api/price-wizard/competitors/:sessionId
 * Get all discovered competitors for a session
 */
router.get('/competitors/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;
        const result = await db_js_1.pool.query(`
      SELECT 
        cr.id,
        cr.competitor_name,
        cr.website_url,
        cr.location,
        cr.status,
        cr.scraped_at,
        COUNT(cp.id) as price_count
      FROM competitor_research cr
      LEFT JOIN competitor_prices cp ON cp.competitor_id = cr.id
      WHERE cr.session_id = $1
      GROUP BY cr.id
      ORDER BY cr.created_at
    `, [sessionId]);
        res.json(result.rows);
    }
    catch (error) {
        console.error('Error getting competitors:', error);
        res.status(500).json({ error: error.message });
    }
});
/**
 * GET /api/price-wizard/prices/:sessionId
 * Get all extracted prices for a session
 */
router.get('/prices/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;
        const result = await db_js_1.pool.query(`
      SELECT 
        cp.*,
        cr.competitor_name,
        cr.website_url
      FROM competitor_prices cp
      JOIN competitor_research cr ON cr.id = cp.competitor_id
      WHERE cr.session_id = $1
      ORDER BY cp.service_type, cp.price_amount
    `, [sessionId]);
        res.json(result.rows);
    }
    catch (error) {
        console.error('Error getting prices:', error);
        res.status(500).json({ error: error.message });
    }
});
/**
 * POST /api/price-wizard/analyze
 * Analyze market prices and generate suggestions (LLM integration point)
 */
router.post('/analyze', async (req, res) => {
    try {
        const { sessionId } = req.body;
        if (!sessionId) {
            return res.status(400).json({ error: 'Missing sessionId' });
        }
        // Get all prices for the session
        const pricesResult = await db_js_1.pool.query(`
      SELECT 
        cp.service_type,
        cp.price_amount,
        cp.currency,
        cp.confidence_score
      FROM competitor_prices cp
      JOIN competitor_research cr ON cr.id = cp.competitor_id
      WHERE cr.session_id = $1 AND cp.confidence_score >= 0.5
    `, [sessionId]);
        const prices = pricesResult.rows;
        // If no prices yet, mark session as ready for manual entry
        if (prices.length === 0) {
            await db_js_1.pool.query(`
        UPDATE price_wizard_sessions
        SET status = 'completed', suggestions_generated = 0, updated_at = NOW()
        WHERE id = $1
      `, [sessionId]);
            return res.json({
                success: true,
                sessionId,
                suggestionsCount: 0,
                suggestions: [],
                message: 'No prices to analyze. Add competitor prices manually using the + button, then click "Retry Scrape" to re-analyze.'
            });
        }
        // Group by service type and calculate statistics
        const serviceStats = new Map();
        prices.forEach((price) => {
            if (!serviceStats.has(price.service_type)) {
                serviceStats.set(price.service_type, []);
            }
            serviceStats.get(price.service_type).push(price.price_amount);
        });
        // Generate suggestions for each service type
        const suggestions = [];
        for (const [serviceType, amounts] of serviceStats.entries()) {
            amounts.sort((a, b) => a - b);
            const min = amounts[0];
            const max = amounts[amounts.length - 1];
            const median = amounts[Math.floor(amounts.length / 2)];
            // Three-tier pricing strategy
            const tiers = [
                {
                    tier: 'basic',
                    suggestedPrice: Math.round(min * 1.1), // 10% above min
                    reasoning: `Competitive entry-level pricing. Market minimum: €${min}`,
                },
                {
                    tier: 'standard',
                    suggestedPrice: Math.round(median),
                    reasoning: `Market median pricing. Balanced value proposition. Median: €${median}`,
                },
                {
                    tier: 'premium',
                    suggestedPrice: Math.round(max * 0.9), // 10% below max
                    reasoning: `Premium positioning below market leader. Market maximum: €${max}`,
                },
            ];
            for (const tier of tiers) {
                const result = await db_js_1.pool.query(`
          INSERT INTO price_list_suggestions (
            session_id, service_type, tier, suggested_price, 
            market_min, market_median, market_max, reasoning, status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending_review')
          RETURNING id
        `, [
                    sessionId,
                    serviceType,
                    tier.tier,
                    tier.suggestedPrice,
                    min,
                    median,
                    max,
                    tier.reasoning,
                ]);
                suggestions.push({
                    id: result.rows[0].id,
                    serviceType,
                    ...tier,
                    marketMin: min,
                    marketMedian: median,
                    marketMax: max,
                });
            }
        }
        // Update session
        await db_js_1.pool.query(`
      UPDATE price_wizard_sessions
      SET status = 'completed', suggestions_generated = $2, updated_at = NOW()
      WHERE id = $1
    `, [sessionId, suggestions.length]);
        res.json({
            success: true,
            sessionId,
            suggestionsCount: suggestions.length,
            suggestions,
        });
    }
    catch (error) {
        console.error('Error analyzing prices:', error);
        res.status(500).json({ error: error.message });
    }
});
/**
 * GET /api/price-wizard/suggestions/:sessionId
 * Get all price suggestions for a session
 */
router.get('/suggestions/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;
        const result = await db_js_1.pool.query(`
      SELECT * FROM price_list_suggestions
      WHERE session_id = $1
      ORDER BY service_type, tier
    `, [sessionId]);
        res.json(result.rows);
    }
    catch (error) {
        console.error('Error getting suggestions:', error);
        res.status(500).json({ error: error.message });
    }
});
/**
 * GET /api/price-wizard/sessions
 * Get all research sessions
 */
router.get('/sessions', async (req, res) => {
    try {
        const result = await db_js_1.pool.query(`
      SELECT 
        id,
        location,
        services,
        status,
        competitors_found,
        prices_extracted,
        suggestions_generated,
        created_at,
        updated_at
      FROM price_wizard_sessions
      ORDER BY created_at DESC
      LIMIT 100
    `);
        res.json(result.rows);
    }
    catch (error) {
        console.error('Error getting sessions:', error);
        res.status(500).json({ error: error.message });
    }
});
/**
 * POST /api/price-wizard/activate-suggestion
 * Activate a single suggestion - creates a price list entry and marks it as activated
 */
router.post('/activate-suggestion', async (req, res) => {
    try {
        const { suggestionId, adjustedPrice, description } = req.body;
        if (!suggestionId) {
            return res.status(400).json({ error: 'Missing suggestionId' });
        }
        // Get suggestion
        const suggestionResult = await db_js_1.pool.query(`
      SELECT * FROM price_list_suggestions WHERE id = $1
    `, [suggestionId]);
        if (suggestionResult.rows.length === 0) {
            return res.status(404).json({ error: 'Suggestion not found' });
        }
        const suggestion = suggestionResult.rows[0];
        if (suggestion.status !== 'pending_review') {
            return res.status(400).json({ error: 'Suggestion is not pending review' });
        }
        const finalPrice = adjustedPrice || suggestion.suggested_price;
        // Create price list entry so it appears in Invoice "Select from Price List"
        const serviceName = `${suggestion.service_type} (${suggestion.tier})`;
        const priceListResult = await db_js_1.pool.query(`
      INSERT INTO price_list_items (
        name,
        category,
        price,
        description,
        currency,
        is_active
      ) VALUES ($1, $2, $3, $4, $5, true)
      RETURNING id, name, price
    `, [
            serviceName,
            'Photography',
            finalPrice,
            description || suggestion.reasoning || `AI-recommended ${suggestion.tier} tier pricing based on competitive market analysis`,
            suggestion.currency || 'EUR'
        ]);
        const priceListItem = priceListResult.rows[0];
        // Mark suggestion as activated with the final price and link to price list item
        await db_js_1.pool.query(`
      UPDATE price_list_suggestions
      SET 
        status = 'activated',
        user_adjusted_price = $2,
        activated_product_id = $3,
        activated_at = NOW(),
        updated_at = NOW()
      WHERE id = $1
    `, [suggestionId, finalPrice, priceListItem.id]);
        res.json({
            success: true,
            suggestion_id: suggestionId,
            price_list_id: priceListItem.id,
            service_name: priceListItem.name,
            activated_price: finalPrice,
            message: 'Price activated and added to your Price List successfully'
        });
    }
    catch (error) {
        console.error('Error activating suggestion:', error);
        res.status(500).json({ error: error.message });
    }
});
/**
 * POST /api/price-wizard/reject-suggestion
 * Reject a suggestion
 */
router.post('/reject-suggestion', async (req, res) => {
    try {
        const { suggestionId } = req.body;
        if (!suggestionId) {
            return res.status(400).json({ error: 'Missing suggestionId' });
        }
        await db_js_1.pool.query(`
      UPDATE price_list_suggestions
      SET status = 'rejected', updated_at = NOW()
      WHERE id = $1
    `, [suggestionId]);
        res.json({ success: true });
    }
    catch (error) {
        console.error('Error rejecting suggestion:', error);
        res.status(500).json({ error: error.message });
    }
});
/**
 * POST /api/price-wizard/add-manual-price
 * Add competitor price manually (when scraping fails)
 */
router.post('/add-manual-price', async (req, res) => {
    try {
        const { competitorId, serviceType, priceAmount, currency = 'EUR', notes } = req.body;
        if (!competitorId || !serviceType || priceAmount === undefined) {
            return res.status(400).json({
                error: 'Missing required fields: competitorId, serviceType, priceAmount'
            });
        }
        // Insert manual price
        const result = await db_js_1.pool.query(`
      INSERT INTO competitor_prices (
        competitor_id, service_type, price_amount, currency, 
        confidence_score, url_source, notes
      ) VALUES ($1, $2, $3, $4, 1.0, 'manual_entry', $5)
      RETURNING id
    `, [competitorId, serviceType, priceAmount, currency, notes || null]);
        // Update competitor status to 'scraped' (we now have data)
        await db_js_1.pool.query(`
      UPDATE competitor_research 
      SET status = 'scraped', scraped_at = NOW() 
      WHERE id = $1
    `, [competitorId]);
        // Get session ID to update prices count
        const sessionResult = await db_js_1.pool.query(`
      SELECT session_id FROM competitor_research WHERE id = $1
    `, [competitorId]);
        if (sessionResult.rows.length > 0) {
            await db_js_1.pool.query(`
        UPDATE price_wizard_sessions
        SET prices_extracted = prices_extracted + 1, updated_at = NOW()
        WHERE id = $1
      `, [sessionResult.rows[0].session_id]);
        }
        res.json({
            success: true,
            priceId: result.rows[0].id,
            message: 'Manual price added successfully'
        });
    }
    catch (error) {
        console.error('Error adding manual price:', error);
        res.status(500).json({ error: error.message });
    }
});
/**
 * GET /api/price-wizard/competitor/:competitorId/prices
 * Get all prices for a competitor
 */
router.get('/competitor/:competitorId/prices', async (req, res) => {
    try {
        const { competitorId } = req.params;
        const result = await db_js_1.pool.query(`
      SELECT 
        id,
        service_type,
        price_amount,
        currency,
        confidence_score,
        url_source,
        notes,
        created_at
      FROM competitor_prices
      WHERE competitor_id = $1
      ORDER BY created_at DESC
    `, [competitorId]);
        res.json({
            success: true,
            prices: result.rows
        });
    }
    catch (error) {
        console.error('Error fetching competitor prices:', error);
        res.status(500).json({ error: error.message });
    }
});
/**
 * DELETE /api/price-wizard/price/:priceId
 * Delete a competitor price entry
 */
router.delete('/price/:priceId', async (req, res) => {
    try {
        const { priceId } = req.params;
        await db_js_1.pool.query(`
      DELETE FROM competitor_prices WHERE id = $1
    `, [priceId]);
        res.json({ success: true });
    }
    catch (error) {
        console.error('Error deleting price:', error);
        res.status(500).json({ error: error.message });
    }
});
/**
 * POST /api/price-wizard/research
 * Run FULL automated research using Tavily + OpenAI
 * This is the new production endpoint for real competitor research
 */
router.post('/research', async (req, res) => {
    try {
        const { sessionId } = req.body;
        if (!sessionId) {
            return res.status(400).json({ error: 'Missing sessionId' });
        }
        // Get session details
        const sessionResult = await db_js_1.pool.query(`
      SELECT id, location, services, status FROM price_wizard_sessions WHERE id = $1
    `, [sessionId]);
        if (sessionResult.rows.length === 0) {
            return res.status(404).json({ error: 'Session not found' });
        }
        const session = sessionResult.rows[0];
        // Check if API keys are configured
        if (!process.env.TAVILY_API_KEY || !process.env.OPENAI_API_KEY) {
            return res.status(500).json({
                error: 'API keys not configured. Set TAVILY_API_KEY and OPENAI_API_KEY.'
            });
        }
        // Clear any previous data for this session (in case of retry)
        await db_js_1.pool.query(`
      DELETE FROM price_list_suggestions WHERE session_id = $1
    `, [sessionId]);
        const competitorIds = await db_js_1.pool.query(`
      SELECT id FROM competitor_research WHERE session_id = $1
    `, [sessionId]);
        for (const row of competitorIds.rows) {
            await db_js_1.pool.query(`DELETE FROM competitor_prices WHERE competitor_id = $1`, [row.id]);
        }
        await db_js_1.pool.query(`
      DELETE FROM competitor_research WHERE session_id = $1
    `, [sessionId]);
        // Run research in background (don't await)
        // Return immediately so the frontend can poll for status
        res.json({
            success: true,
            sessionId,
            message: 'Research started. Poll /status endpoint for updates.',
        });
        // Run the actual research
        priceResearch.runResearch({
            sessionId,
            location: session.location,
            services: session.services,
            maxCompetitors: 12,
        }).catch(error => {
            console.error('Background research failed:', error);
        });
    }
    catch (error) {
        console.error('Error starting research:', error);
        res.status(500).json({ error: error.message });
    }
});
/**
 * POST /api/price-wizard/quick-start
 * Combined endpoint: Create session AND start research in one call
 */
router.post('/quick-start', async (req, res) => {
    try {
        const { location, services, userId } = req.body;
        if (!location || !services || !Array.isArray(services)) {
            return res.status(400).json({
                error: 'Missing required fields: location, services (array)'
            });
        }
        // Check if API keys are configured
        if (!process.env.TAVILY_API_KEY || !process.env.OPENAI_API_KEY) {
            return res.status(500).json({
                error: 'API keys not configured. Set TAVILY_API_KEY and OPENAI_API_KEY.'
            });
        }
        // Create session
        const result = await db_js_1.pool.query(`
      INSERT INTO price_wizard_sessions (user_id, location, services, status)
      VALUES ($1, $2, $3, 'discovering')
      RETURNING id, created_at
    `, [userId || null, location, services]);
        const session = result.rows[0];
        // Return immediately
        res.json({
            success: true,
            sessionId: session.id,
            location,
            services,
            status: 'discovering',
            createdAt: session.created_at,
            message: 'Research started. Poll /status endpoint for updates.',
        });
        // Run the actual research in background
        priceResearch.runResearch({
            sessionId: session.id,
            location,
            services,
            maxCompetitors: 12,
        }).catch(error => {
            console.error('Background research failed:', error);
        });
    }
    catch (error) {
        console.error('Error in quick-start:', error);
        res.status(500).json({ error: error.message });
    }
});
exports.default = router;
