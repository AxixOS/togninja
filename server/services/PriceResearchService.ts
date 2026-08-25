/**
 * Price Research Service
 * 
 * Orchestrates the full price research pipeline:
 * 1. Tavily search for competitors
 * 2. OpenAI extraction of pricing
 * 3. Market analysis and recommendations
 */

import { TavilySearchService } from './TavilySearchService.js';
import { searchProvider, type SearchProvider } from '../lib/searchProvider';
import { AxixosSearchService } from './AxixosSearchService.js';
import { OpenAIPriceExtractor } from './OpenAIPriceExtractor.js';
import { CompetitorDiscoveryService } from './CompetitorDiscoveryService.js';
import { PriceScraperService } from './PriceScraperService.js';
import { pool } from '../db.js';
import { studioMoneyContext } from '../lib/money';

interface ResearchConfig {
  sessionId: string;
  location: string;
  services: string[];
  maxCompetitors?: number;
}

interface ResearchProgress {
  stage: 'searching' | 'extracting' | 'analyzing' | 'completed' | 'failed';
  competitorsFound: number;
  competitorsProcessed: number;
  pricesExtracted: number;
  message: string;
}

export class PriceResearchService {
  private tavily: TavilySearchService;
  private axixos: AxixosSearchService;
  private openai: OpenAIPriceExtractor;
  private discovery: CompetitorDiscoveryService;
  private scraper: PriceScraperService;

  /**
   * The search account this run is using — the studio own key when they have set one,
   * the platform key otherwise. Resolved once per run by ensureProvider() rather than
   * read from process.env at each decision point, which is what made a studio key
   * invisible to every one of them.
   */
  private provider: SearchProvider | null = null;

  /** Whether a Tavily-shaped search is possible with whatever key was resolved. */
  private get hasTavilyKey(): boolean {
    return this.provider?.kind === 'tavily' && !!this.provider.apiKey;
  }

  /**
   * Resolve the provider and hand its key to the Tavily client.
   *
   * Called at the top of every entry point. Cheap after the first call within a run, and
   * deliberately re-resolved per run so a studio adding a key does not have to wait for a
   * restart to use it.
   */
  private async ensureProvider(): Promise<void> {
    this.provider = await searchProvider();
    if (this.provider.kind === 'tavily') {
      this.tavily = new TavilySearchService(this.provider.apiKey);
    }
  }

  constructor() {
    // Constructed keyless; ensureProvider() supplies the key before any search runs.
    this.tavily = new TavilySearchService(null);
    this.axixos = new AxixosSearchService();
    this.openai = new OpenAIPriceExtractor();
    this.discovery = new CompetitorDiscoveryService();
    this.scraper = new PriceScraperService();
  }

  /**
   * Run full price research for a session
   */
  async runResearch(config: ResearchConfig): Promise<ResearchProgress> {
    // The studio's own currency. Every price fed to the model was labelled with a euro
    // sign regardless of where the studio trades.
    const money = await studioMoneyContext();
    await this.ensureProvider();
    const { sessionId, location, services, maxCompetitors = 12 } = config;
    
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🚀 PRICE RESEARCH: ${location}`);
    console.log(`   Services: ${services.join(', ')}`);
    console.log(`${'='.repeat(60)}\n`);

    try {
      // Stage 1: Search for competitors (Tavily → fallback to Google scraping + curated list)
      await this.updateSessionStatus(sessionId, 'discovering');
      console.log('📍 STAGE 1: Searching for competitors...');
      
      let competitors: { name: string; website: string; content: string; relevanceScore: number }[] = [];
      let discoverySource = 'axixos';

      // Prefer AxixOS Intelligence when configured (searxng search + playwright crawl).
      if (this.axixos.isConfigured()) {
        try {
          competitors = await this.axixos.searchCompetitors(location, services, maxCompetitors);
          console.log(`   ✅ AxixOS found ${competitors.length} competitors`);
        } catch (axErr: any) {
          console.warn(`   ⚠️ AxixOS search failed: ${axErr.message}`);
        }
      }

      // Then Tavily, if AxixOS is unset or returned nothing.
      if (competitors.length === 0 && this.hasTavilyKey) {
        try {
          competitors = await this.tavily.searchCompetitors(location, services, maxCompetitors);
          discoverySource = 'tavily';
          console.log(`   ✅ Tavily found ${competitors.length} competitors`);
        } catch (tavilyError: any) {
          console.warn(`   ⚠️ Tavily search failed: ${tavilyError.message}`);
          console.log('   🔄 Falling back to Google scraping + curated competitors...');
        }
      } else if (competitors.length === 0) {
        console.log('   ⚠️ No search provider configured, using fallback competitor discovery...');
      }

      // Fallback: Use CompetitorDiscoveryService (Google scraping + curated list)
      if (competitors.length === 0) {
        discoverySource = 'fallback';
        const fallbackResults = await this.discovery.discoverCompetitors({
          location,
          services,
          maxResults: maxCompetitors,
        });

        competitors = fallbackResults.map(r => ({
          name: r.name,
          website: r.website,
          content: '', // Will be fetched via direct scraping in Stage 2
          relevanceScore: r.confidence,
        }));
        console.log(`   ✅ Fallback discovery found ${competitors.length} competitors`);
      }

      if (competitors.length === 0) {
        if (!this.provider?.apiKey) {
          // Names no environment variable: this message reaches a photographer, and if
          // the PLATFORM has not configured search there is nothing they can do about it.
          throw new Error('Automatic competitor research is not available on this instance right now. You can still add competitors and their prices by hand, then generate suggestions from those.');
        }
        throw new Error('No competitors found for this location/services. Try a broader location or different service selection.');
      }

      // Save competitors to database
      for (const comp of competitors) {
        await pool.query(`
          INSERT INTO competitor_research (
            session_id, competitor_name, website_url, location, 
            status, discovery_source
          ) VALUES ($1, $2, $3, $4, 'pending', $5)
        `, [sessionId, comp.name, comp.website, location, discoverySource]);
      }

      await pool.query(`
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
          // Gather content from EVERY available source and combine — the search
          // snippet often already contains prices, the AxixOS crawl sometimes
          // returns empty (JS-heavy/bot-protected sites), and a direct scrape can
          // fill the gap. Feeding the union to OpenAI maximises extraction.
          const parts: string[] = [];
          if (comp.content) parts.push(comp.content); // search snippet

          if (this.axixos.isConfigured() && comp.website) {
            try {
              const crawled = await this.axixos.searchCompetitorPricing(comp.website, comp.name);
              if (crawled && crawled.trim().length > 40) parts.push(crawled);
            } catch { /* crawl failed — other sources below */ }
          } else if (comp.website && this.hasTavilyKey) {
            try {
              const pricingContent = await this.tavily.searchCompetitorPricing(comp.website, comp.name);
              if (pricingContent) parts.push(pricingContent);
            } catch { /* ignore */ }
          }

          // Still thin? Direct-scrape the site.
          if (parts.join('\n\n').trim().length < 150 && comp.website) {
            try {
              const scrapeResult = await this.scraper.scrapeWebsite(comp.website);
              if (scrapeResult.success && scrapeResult.metadata) {
                const meta = scrapeResult.metadata as any;
                parts.push([meta.title || '', meta.description || '', meta.textContent || ''].filter(Boolean).join('\n\n'));
                if (scrapeResult.prices && scrapeResult.prices.length > 0) {
                  parts.push('Directly found prices:\n' + scrapeResult.prices.map((p: any) => `${p.serviceType}: ${money.currency} ${p.amount}`).join('\n'));
                }
              }
            } catch { /* ignore */ }
          }

          const fullContent = parts.filter(Boolean).join('\n\n---\n\n');

          // Extract prices with AI
          const analysis = await this.openai.extractPrices(comp.name, fullContent, comp.website);

          // Save extracted prices
          const competitorResult = await pool.query(`
            SELECT id FROM competitor_research 
            WHERE session_id = $1 AND website_url = $2
          `, [sessionId, comp.website]);

          if (competitorResult.rows.length > 0) {
            const competitorId = competitorResult.rows[0].id;

            for (const price of analysis.prices) {
              await pool.query(`
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
                this.inclusionsText(price) || null,
              ]);
              totalPrices++;
            }

            // Update competitor status
            const status = analysis.prices.length > 0 ? 'scraped' : 'failed';
            const error = analysis.prices.length === 0
              ? (analysis.extractionError || `No prices found (content chars: ${(fullContent || '').length})`)
              : null;
            
            await pool.query(`
              UPDATE competitor_research 
              SET status = $2, scraped_at = NOW(), scrape_error = $3
              WHERE id = $1
            `, [competitorId, status, error]);
          }

          console.log(`   ✅ ${comp.name}: ${analysis.prices.length} prices extracted`);

          // Rate limiting
          await this.delay(1000);

        } catch (error: any) {
          console.error(`   ❌ ${comp.name}: ${error.message}`);
        }
      }

      await pool.query(`
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
              await pool.query(`
                INSERT INTO price_list_suggestions (
                  session_id, service_type, tier, suggested_price,
                  market_min, market_median, market_max, sample_size, reasoning, status
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending_review')
              `, [
                sessionId,
                service,
                rec.tier,
                rec.suggestedPrice,
                analysis.priceStats.min,
                analysis.priceStats.median,
                analysis.priceStats.max,
                // How many observed prices are behind those three numbers. Null-safe: an
                // older analysis object without it stores NULL, which the UI reads as
                // "unknown" and declines to state a market position from.
                analysis.priceStats.sampleSize ?? null,
                `${rec.reasoning}\n\nWhat's included: ${rec.whatsIncluded || ''}\n\nCompetitive advantage: ${rec.competitiveAdvantage}\n\nMarket insight: ${analysis.marketInsights}`,
              ]);
              suggestionsCount++;
              console.log(`     ✓ Inserted ${rec.tier} tier: ${money.currency} ${rec.suggestedPrice}`);
            } catch (insertError: any) {
              console.error(`     ✗ Failed to insert ${rec.tier} tier:`, insertError.message);
            }
          }

          console.log(`   ✅ ${service}: Generated 3-tier recommendations`);
        } catch (analysisError: any) {
          console.error(`   ❌ Analysis failed for ${service}:`, analysisError.message);
        }
      }

      // Update session as completed
      await pool.query(`
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

    } catch (error: any) {
      console.error('❌ Research failed:', error);

      // Recorded, not just logged. A hosted studio cannot read the server log, and neither
      // can whoever they ask for help — so the reason has to survive in the row.
      //
      // Capped and stripped of anything key-shaped: an upstream 401 body can echo the
      // credential that was sent, and this string is rendered in the admin.
      const reason = String(error?.message || error || 'Unknown error')
        .replace(/\b(tvly|sk|key)[-_][A-Za-z0-9_-]{8,}/gi, '[key redacted]')
        .slice(0, 500);
      await pool.query(`
        UPDATE price_wizard_sessions SET status = 'failed', error_message = $2, updated_at = NOW() WHERE id = $1
      `, [sessionId, reason]).catch(async () => {
        // The column is added at boot; an instance that has not restarted yet must still
        // record the failure rather than throwing inside the error handler.
        await pool.query(`
          UPDATE price_wizard_sessions SET status = 'failed', updated_at = NOW() WHERE id = $1
        `, [sessionId]).catch(() => {});
      });

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
  private async getCompetitorData(sessionId: string) {
    const result = await pool.query(`
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
          'confidence', cp.confidence_score,
          'packageName', cp.package_name,
          'includes', cp.deliverables
        )) as prices
      FROM competitor_research cr
      LEFT JOIN competitor_prices cp ON cp.competitor_id = cr.id
      WHERE cr.session_id = $1 AND cr.status = 'scraped'
      GROUP BY cr.id
    `, [sessionId]);

    return result.rows.map((row: any) => ({
      businessName: row.competitor_name,
      website: row.website_url,
      location: row.location,
      priceRange: { min: row.min_price || 0, max: row.max_price || 0 },
      positioning: this.inferPositioning(row.min_price, row.max_price),
      specialties: row.specialties?.filter((s: string) => s) || [],
      prices: row.prices?.filter((p: any) => p.price) || [],
    }));
  }

  /**
   * Infer market positioning from prices
   */
  private inferPositioning(min: number, max: number): 'budget' | 'mid-range' | 'premium' | 'luxury' {
    const avg = (min + max) / 2;
    if (avg < 200) return 'budget';
    if (avg < 400) return 'mid-range';
    if (avg < 700) return 'premium';
    return 'luxury';
  }

  /**
   * Update session status
   */
  private async updateSessionStatus(sessionId: string, status: string) {
    await pool.query(`
      UPDATE price_wizard_sessions SET status = $2, updated_at = NOW() WHERE id = $1
    `, [sessionId, status]);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Build a compact human-readable "what's included" string from an extracted
  // price so it can be shown per competitor and fed into the suggestion analysis.
  private inclusionsText(price: any): string {
    const bits: string[] = [];
    if (price.priceType && price.priceType !== 'fixed') bits.push(String(price.priceType).replace(/_/g, ' '));
    if (price.duration) bits.push(String(price.duration));
    if (price.includedPhotos) bits.push(`${price.includedPhotos} edited photos`);
    if (Array.isArray(price.deliverables)) bits.push(...price.deliverables.filter(Boolean));
    return bits.join(' · ');
  }

  private normalizeServices(raw: any): string[] {
    if (Array.isArray(raw)) return raw.filter(Boolean);
    if (typeof raw === 'string') {
      const s = raw.trim();
      if (!s) return [];
      try { const p = JSON.parse(s); return Array.isArray(p) ? p.filter(Boolean) : [s]; } catch { return [s]; }
    }
    return [];
  }

  /**
   * Re-read the sites of a session's EXISTING competitors and extract prices,
   * then regenerate suggestions. This is what the "Retry Scrape" button runs —
   * a real network read (Tavily deep-read if configured, else a direct fetch),
   * not the old no-op that marked everything failed.
   */
  async rescrapeSession(sessionId: string): Promise<ResearchProgress> {
    // The studio's own currency. Every price fed to the model was labelled with a euro
    // sign regardless of where the studio trades.
    const money = await studioMoneyContext();
    await this.ensureProvider();
    const sessionRes = await pool.query(
      `SELECT location, services FROM price_wizard_sessions WHERE id = $1`, [sessionId]);
    if (sessionRes.rows.length === 0) throw new Error('Session not found');
    const location: string = sessionRes.rows[0].location;
    const services = this.normalizeServices(sessionRes.rows[0].services);

    const comps = await pool.query(
      `SELECT id, competitor_name, website_url FROM competitor_research WHERE session_id = $1`, [sessionId]);
    if (comps.rows.length === 0) {
      throw new Error('No competitors to re-read yet. Run AI Research first, or add a competitor manually.');
    }

    const hasAxixos = this.axixos.isConfigured();
    const hasTavily = this.hasTavilyKey;
    await this.updateSessionStatus(sessionId, 'scraping');
    let totalPrices = 0;

    for (const row of comps.rows) {
      const competitorId = row.id;
      const name: string = row.competitor_name;
      const website: string = row.website_url;
      try {
        let fullContent = '';
        if (website && hasAxixos) {
          try { fullContent = await this.axixos.searchCompetitorPricing(website, name); } catch { /* fall through */ }
        } else if (website && hasTavily) {
          try { fullContent = await this.tavily.searchCompetitorPricing(website, name); } catch { /* fall through to direct scrape */ }
        }
        if ((!fullContent || fullContent.trim().length < 50) && website) {
          const scrapeResult = await this.scraper.scrapeWebsite(website);
          if (scrapeResult.success && scrapeResult.metadata) {
            const meta = scrapeResult.metadata as any;
            fullContent = [meta.title || '', meta.description || '', meta.textContent || ''].filter(Boolean).join('\n\n');
            if (scrapeResult.prices && scrapeResult.prices.length > 0) {
              fullContent += '\n\nDirectly found prices:\n' +
                scrapeResult.prices.map((p: any) => `${p.serviceType}: ${money.currency} ${p.amount}`).join('\n');
            }
          }
        }

        const analysis = await this.openai.extractPrices(name, fullContent, website);

        // Replace this competitor's auto-extracted prices, but preserve any the
        // user entered by hand (url_source = 'manual_entry').
        await pool.query(`DELETE FROM competitor_prices WHERE competitor_id = $1 AND COALESCE(url_source,'') <> 'manual_entry'`, [competitorId]);
        for (const price of analysis.prices) {
          await pool.query(`
            INSERT INTO competitor_prices (competitor_id, service_type, package_name, price_amount, currency, confidence_score, url_source, deliverables)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [competitorId, price.serviceType, price.packageName || price.serviceName, price.price,
             price.currency || 'EUR', price.confidence, website, this.inclusionsText(price) || null]);
          totalPrices++;
        }

        const manualCount = await pool.query(
          `SELECT COUNT(*)::int AS c FROM competitor_prices WHERE competitor_id = $1`, [competitorId]);
        const has = (manualCount.rows[0]?.c || 0) > 0;
        const status = has ? 'scraped' : 'failed';
        const error = has ? null
          : (analysis.extractionError
              || ((hasAxixos || hasTavily)
                    ? `Couldn't read prices from the site (${(fullContent || '').length} chars). Add them manually with +.`
                    : 'Automatic price reading is not available on this instance — add prices manually with +.'));
        await pool.query(
          `UPDATE competitor_research SET status = $2, scraped_at = NOW(), scrape_error = $3 WHERE id = $1`,
          [competitorId, status, error]);
        await this.delay(800);
      } catch (e: any) {
        await pool.query(
          `UPDATE competitor_research SET status = 'failed', scraped_at = NOW(), scrape_error = $2 WHERE id = $1`,
          [competitorId, String(e?.message || 'extraction failed').slice(0, 300)]);
      }
    }

    await pool.query(`UPDATE price_wizard_sessions SET prices_extracted = $2, updated_at = NOW() WHERE id = $1`, [sessionId, totalPrices]);
    const suggestions = await this.generateSuggestions(sessionId, location, services);

    return {
      stage: 'completed',
      competitorsFound: comps.rows.length,
      competitorsProcessed: comps.rows.length,
      pricesExtracted: totalPrices,
      message: `Re-read ${comps.rows.length} sites, extracted ${totalPrices} prices, generated ${suggestions} suggestions`,
    };
  }

  /**
   * Analyze the prices collected for a session (from any source — scraped or
   * manually entered) and (re)generate the 3-tier suggestions. Idempotent:
   * clears prior pending suggestions first. Returns the number generated.
   */
  async generateSuggestions(sessionId: string, location: string, servicesRaw: any): Promise<number> {
    const services = this.normalizeServices(servicesRaw);
    await this.updateSessionStatus(sessionId, 'analyzing');
    const competitorData = await this.getCompetitorData(sessionId);

    // Clear previous unreviewed suggestions so a re-run doesn't duplicate them.
    await pool.query(`DELETE FROM price_list_suggestions WHERE session_id = $1 AND status = 'pending_review'`, [sessionId]);

    let suggestionsCount = 0;
    for (const service of services) {
      try {
        const analysis = await this.openai.analyzeMarket(location, service, competitorData);
        for (const rec of analysis.recommendations) {
          try {
            await pool.query(`
              INSERT INTO price_list_suggestions (
                session_id, service_type, tier, suggested_price,
                market_min, market_median, market_max, sample_size, reasoning, status
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending_review')`,
              [sessionId, service, rec.tier, rec.suggestedPrice,
               analysis.priceStats.min, analysis.priceStats.median, analysis.priceStats.max,
               analysis.priceStats.sampleSize ?? null,
               `${rec.reasoning}\n\nWhat's included: ${rec.whatsIncluded || ''}\n\nCompetitive advantage: ${rec.competitiveAdvantage}\n\nMarket insight: ${analysis.marketInsights}`]);
            suggestionsCount++;
          } catch (insertError: any) {
            console.error(`Failed to insert ${rec.tier} suggestion:`, insertError.message);
          }
        }
      } catch (analysisError: any) {
        console.error(`Analysis failed for ${service}:`, analysisError.message);
      }
    }

    await pool.query(
      `UPDATE price_wizard_sessions SET status = 'completed', suggestions_generated = $2, updated_at = NOW() WHERE id = $1`,
      [sessionId, suggestionsCount]);
    return suggestionsCount;
  }
}
