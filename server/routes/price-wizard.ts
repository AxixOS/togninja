/**
 * Price Wizard API Routes
 * 
 * Endpoints for autonomous competitive pricing research
 * Uses Tavily API for search + OpenAI for price extraction
 */

import { Router } from 'express';
import { pool } from '../db.js';
import { PriceScraperService } from '../services/PriceScraperService.js';
import { CompetitorDiscoveryService } from '../services/CompetitorDiscoveryService.js';
import { PriceResearchService } from '../services/PriceResearchService.js';

const router = Router();
const scraper = new PriceScraperService();
const discovery = new CompetitorDiscoveryService();
const priceResearch = new PriceResearchService();

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
    // 'manual', not 'completed'. A session created without a search provider has not
    // finished a crawl — it has not started one. Both words produced the same green
    // "completed" badge in the list, above 0 photographers / 0 prices / 0 suggestions,
    // which reads as "we searched your area and there is nobody there" rather than
    // "no search provider is configured". The studio reported it as a failed crawl,
    // which is a fair reading of what the screen said.
    const result = await pool.query(`
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

  } catch (error: any) {
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
    const sessionResult = await pool.query(`
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
      const result = await pool.query(`
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
    await pool.query(`
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

  } catch (error: any) {
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

    console.log(`📋 Re-reading competitor sites for session ${sessionId}`);

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: 'OpenAI API key not configured. Set OPENAI_API_KEY to extract prices.' });
    }

    const countRes = await pool.query(
      `SELECT COUNT(*)::int AS c FROM competitor_research WHERE session_id = $1`, [sessionId]);
    if ((countRes.rows[0]?.c || 0) === 0) {
      return res.status(400).json({ error: 'No competitors to re-read. Run AI Research first, or add a competitor manually.' });
    }

    // Move to 'scraping' and re-read in the background — the UI polls for status.
    await pool.query(`UPDATE price_wizard_sessions SET status = 'scraping', updated_at = NOW() WHERE id = $1`, [sessionId]);
    res.json({ success: true, sessionId, message: 'Re-reading competitor sites. The page will refresh as it progresses.' });

    priceResearch.rescrapeSession(sessionId).catch(async (error) => {
      console.error('Background re-scrape failed:', error);
      await pool.query(`UPDATE price_wizard_sessions SET status = 'completed', updated_at = NOW() WHERE id = $1`, [sessionId]).catch(() => {});
    });

  } catch (error: any) {
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

    const result = await pool.query(`
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

  } catch (error: any) {
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

    const result = await pool.query(`
      SELECT 
        cr.id,
        cr.competitor_name,
        cr.website_url,
        cr.location,
        cr.status,
        cr.scraped_at,
        cr.scrape_error,
        COUNT(cp.id) as price_count
      FROM competitor_research cr
      LEFT JOIN competitor_prices cp ON cp.competitor_id = cr.id
      WHERE cr.session_id = $1
      GROUP BY cr.id
      ORDER BY cr.created_at
    `, [sessionId]);

    res.json(result.rows);

  } catch (error: any) {
    console.error('Error getting competitors:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/price-wizard/diagnostics
 * Actively test the providers the pipeline depends on so failures are obvious:
 * pings OpenAI (extraction) and AxixOS (discovery + crawl). No secrets returned.
 */
router.get('/diagnostics', async (_req, res) => {
  const out: any = { openai: {}, axixos: {}, tavily: { configured: !!process.env.TAVILY_API_KEY } };

  // OpenAI — the extraction engine. A present-but-invalid key passes the "is it
  // set" guard yet throws on every real call, which looks exactly like "0 prices".
  if (!process.env.OPENAI_API_KEY) {
    out.openai = { ok: false, reason: 'OPENAI_API_KEY not set' };
  } else {
    try {
      const OpenAI = (await import('openai')).default;
      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
      await client.chat.completions.create({ model, messages: [{ role: 'user', content: 'ping' }], max_tokens: 1 });
      out.openai = { ok: true, model };
    } catch (e: any) {
      out.openai = { ok: false, reason: e?.message || 'error', status: e?.status || e?.code };
    }
  }

  // AxixOS — discovery (/v1/search/web) + page crawl.
  if (!process.env.AXIXOS_INTERNAL_API_KEY) {
    out.axixos = { ok: false, reason: 'AXIXOS_INTERNAL_API_KEY not set' };
  } else {
    try {
      const base = (process.env.AXIXOS_API_BASE || 'https://axixos-intelligence.onrender.com').replace(/\/+$/, '');
      const h = await fetch(`${base}/health`).catch(() => null);
      const s = await fetch(`${base}/v1/search/web`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-axixos-api-key': process.env.AXIXOS_INTERNAL_API_KEY },
        body: JSON.stringify({ query: 'Fotograf Wien Preise', limit: 2, country: 'AT', language: 'de' }),
      });
      const sj: any = await s.json().catch(() => ({}));
      out.axixos = { ok: s.ok, health: h?.status || null, searchStatus: s.status, searchResults: (sj.results || []).length };
    } catch (e: any) {
      out.axixos = { ok: false, reason: e?.message || 'error' };
    }
  }

  const summary = out.openai.ok
    ? (out.axixos.ok ? 'All providers OK — if research still finds 0 prices, the competitor pages had no readable prices.' : 'OpenAI OK but AxixOS discovery is failing.')
    : `OpenAI is NOT working (${out.openai.reason}). This is why every competitor extracts 0 prices — fix OPENAI_API_KEY on the host.`;
  res.json({ ...out, summary });
});

/**
 * GET /api/price-wizard/prices/:sessionId
 * Get all extracted prices for a session
 */
router.get('/prices/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;

    const result = await pool.query(`
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

  } catch (error: any) {
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
    const pricesResult = await pool.query(`
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
      await pool.query(`
        UPDATE price_wizard_sessions
        SET status = 'completed', suggestions_generated = 0, updated_at = NOW()
        WHERE id = $1
      `, [sessionId]);

      return res.json({ 
        success: true,
        sessionId,
        suggestionsCount: 0,
        suggestions: [],
        message: 'No prices to analyze yet. Add competitor prices with the + button (or run AI Research / Retry Scrape), then click "Generate Suggestions" again.'
      });
    }

    // Group by service type and calculate statistics
    const serviceStats = new Map<string, number[]>();
    
    prices.forEach((price: any) => {
      if (!serviceStats.has(price.service_type)) {
        serviceStats.set(price.service_type, []);
      }
      serviceStats.get(price.service_type)!.push(price.price_amount);
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
        const result = await pool.query(`
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
    await pool.query(`
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

  } catch (error: any) {
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

    const result = await pool.query(`
      SELECT * FROM price_list_suggestions
      WHERE session_id = $1
      ORDER BY service_type, tier
    `, [sessionId]);

    res.json(result.rows);

  } catch (error: any) {
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
    const result = await pool.query(`
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

  } catch (error: any) {
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
    const suggestionResult = await pool.query(`
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
    const priceListResult = await pool.query(`
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
    await pool.query(`
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

  } catch (error: any) {
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

    await pool.query(`
      UPDATE price_list_suggestions
      SET status = 'rejected', updated_at = NOW()
      WHERE id = $1
    `, [suggestionId]);

    res.json({ success: true });

  } catch (error: any) {
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
    const result = await pool.query(`
      INSERT INTO competitor_prices (
        competitor_id, service_type, price_amount, currency, 
        confidence_score, url_source, notes
      ) VALUES ($1, $2, $3, $4, 1.0, 'manual_entry', $5)
      RETURNING id
    `, [competitorId, serviceType, priceAmount, currency, notes || null]);

    // Update competitor status to 'scraped' (we now have data)
    await pool.query(`
      UPDATE competitor_research 
      SET status = 'scraped', scraped_at = NOW() 
      WHERE id = $1
    `, [competitorId]);

    // Get session ID to update prices count
    const sessionResult = await pool.query(`
      SELECT session_id FROM competitor_research WHERE id = $1
    `, [competitorId]);

    if (sessionResult.rows.length > 0) {
      await pool.query(`
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

  } catch (error: any) {
    console.error('Error adding manual price:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/price-wizard/add-competitor
 * Manually add a competitor to a session (for the manual path / when automated
 * discovery isn't available). Prices are then added via /add-manual-price.
 */
router.post('/add-competitor', async (req, res) => {
  try {
    const { sessionId, name, website, location } = req.body;
    if (!sessionId || !name) {
      return res.status(400).json({ error: 'Missing required fields: sessionId, name' });
    }

    const sess = await pool.query(`SELECT location FROM price_wizard_sessions WHERE id = $1`, [sessionId]);
    if (sess.rows.length === 0) return res.status(404).json({ error: 'Session not found' });
    const loc = location || sess.rows[0].location || null;

    const result = await pool.query(`
      INSERT INTO competitor_research (session_id, competitor_name, website_url, location, status, discovery_source)
      VALUES ($1, $2, $3, $4, 'pending', 'manual')
      RETURNING id
    `, [sessionId, name, website || null, loc]);

    await pool.query(`
      UPDATE price_wizard_sessions
      SET competitors_found = competitors_found + 1, updated_at = NOW()
      WHERE id = $1
    `, [sessionId]);

    res.json({ success: true, competitorId: result.rows[0].id, message: 'Competitor added — now add its prices with the + button.' });
  } catch (error: any) {
    console.error('Error adding competitor:', error);
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

    const result = await pool.query(`
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

  } catch (error: any) {
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

    await pool.query(`
      DELETE FROM competitor_prices WHERE id = $1
    `, [priceId]);

    res.json({ success: true });

  } catch (error: any) {
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
    const sessionResult = await pool.query(`
      SELECT id, location, services, status FROM price_wizard_sessions WHERE id = $1
    `, [sessionId]);

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const session = sessionResult.rows[0];

    // Check if API keys are configured (only OpenAI is required; Tavily is optional with fallback)
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ 
        error: 'OpenAI API key not configured. Set OPENAI_API_KEY in your environment.' 
      });
    }

    if (!process.env.AXIXOS_INTERNAL_API_KEY && !process.env.TAVILY_API_KEY) {
      // Without a search provider there is no reliable way to discover + read
      // competitor sites. Fail loudly (and BEFORE wiping any manual data) with
      // an actionable message instead of silently finding nothing.
      return res.status(400).json({
        error: 'Automated competitor discovery needs a search provider (AXIXOS_INTERNAL_API_KEY or a Tavily key). Add it to enable AI Research — or add competitors and prices manually below and click "Generate Suggestions".',
      });
    }

    // Clear any previous data for this session (in case of retry)
    await pool.query(`
      DELETE FROM price_list_suggestions WHERE session_id = $1
    `, [sessionId]);
    
    const competitorIds = await pool.query(`
      SELECT id FROM competitor_research WHERE session_id = $1
    `, [sessionId]);
    
    for (const row of competitorIds.rows) {
      await pool.query(`DELETE FROM competitor_prices WHERE competitor_id = $1`, [row.id]);
    }
    
    await pool.query(`
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

  } catch (error: any) {
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

    // Check if API keys are configured (only OpenAI is required; Tavily is optional with fallback)
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ 
        error: 'OpenAI API key not configured. Set OPENAI_API_KEY in your environment.' 
      });
    }

    const hasProvider = !!process.env.AXIXOS_INTERNAL_API_KEY || !!process.env.TAVILY_API_KEY;

    // Create the session either way, so the manual path always has a workspace.
    const result = await pool.query(`
      INSERT INTO price_wizard_sessions (user_id, location, services, status)
      VALUES ($1, $2, $3, $4)
      RETURNING id, created_at
    `, [userId || null, location, services, hasProvider ? 'discovering' : 'manual']);

    const session = result.rows[0];

    if (!hasProvider) {
      // No search provider → don't kick off a doomed automated run. Give the user
      // a ready workspace and tell them exactly how to proceed.
      return res.json({
        success: true,
        sessionId: session.id,
        location,
        services,
        status: 'manual',
        manual: true,
        createdAt: session.created_at,
        message: 'Session created. Automated discovery needs a search provider (AXIXOS_INTERNAL_API_KEY). Add competitors and prices manually, then click "Generate Suggestions" — or configure the provider and run AI Research.',
      });
    }

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

  } catch (error: any) {
    console.error('Error in quick-start:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
