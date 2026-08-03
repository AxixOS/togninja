/**
 * Price Wizard Research Tool
 * Tier 2: Medium-risk autonomous tool
 * 
 * Autonomously discovers competitors, scrapes pricing data, and generates market recommendations
 */

import { z } from "zod";
import { registerTool } from "../core/ToolBus";
import { ToolDef, ToolContext } from "../core/Types";

// Zod schema for parameter validation
const params = z.object({
  location: z.string().min(2).describe("Geographic location to research (e.g., 'Wien', 'Salzburg', 'Graz')"),
  services: z.array(z.enum(["family", "wedding", "newborn", "portrait", "corporate", "event"]))
    .min(1)
    .describe("Photography service types to research pricing for"),
  maxCompetitors: z.number().int().min(1).max(20).default(10).optional()
    .describe("Maximum number of competitors to discover and scrape (default: 10)")
});

// Tool definition
const def: ToolDef<typeof params> = {
  name: "price_wizard_research",
  description: `Autonomously research competitor pricing in the photography market.

This tool will:
1. Search for competitor photography businesses in the specified location
2. Scrape pricing information from their websites
3. Analyze market rates and calculate statistics (min, median, max)
4. Generate 3-tier pricing recommendations (basic, standard, premium)
5. Return detailed pricing suggestions with market context

Use this to answer questions like:
- "What are competitors charging for family photography in Wien?"
- "Research wedding photography prices in Salzburg"
- "What should I charge for newborn sessions in Graz?"
- "Analyze corporate photography rates in my area"

The tool respects rate limits (2s delays) and returns a session ID for later review in the admin UI.

Returns: Price research results with competitor data, extracted prices, and AI-generated suggestions`,
  parameters: params,
  authz: ["CRM_READ", "PRICE_RESEARCH"],
  risk: "medium",
  handler: async (ctx: ToolContext, args: z.infer<typeof params>) => {
    try {
      const BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000';
      
      ctx.log(`🔍 Starting price research for ${args.services.join(', ')} in ${args.location}`);

      // Step 1: Start research session
      const startResponse = await fetch(`${BASE_URL}/api/price-wizard/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: args.location,
          services: args.services,
          userId: ctx.userId || null,
        }),
      });

      if (!startResponse.ok) {
        throw new Error(`Failed to start session: ${startResponse.statusText}`);
      }

      const startData = await startResponse.json();
      const sessionId = startData.sessionId;
      
      ctx.log(`✅ Session created: ${sessionId}`);

      // Step 2: Discover competitors
      ctx.log(`🕵️  Discovering competitors...`);
      const discoverResponse = await fetch(`${BASE_URL}/api/price-wizard/discover`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          maxResults: args.maxCompetitors || 10,
        }),
      });

      if (!discoverResponse.ok) {
        throw new Error(`Failed to discover competitors: ${discoverResponse.statusText}`);
      }

      const discoverData = await discoverResponse.json();
      const competitorsFound = discoverData.competitorsFound;
      
      ctx.log(`✅ Found ${competitorsFound} competitors`);

      if (competitorsFound === 0) {
        return {
          success: false,
          session_id: sessionId,
          location: args.location,
          services: args.services,
          message: "No competitors found in this location. Try a broader search area or different services.",
          competitors_found: 0,
          prices_extracted: 0,
          suggestions_generated: 0
        };
      }

      // Step 3: Scrape prices (this takes time due to rate limiting)
      ctx.log(`📊 Scraping competitor prices (this may take 30-60 seconds)...`);
      const scrapeResponse = await fetch(`${BASE_URL}/api/price-wizard/scrape`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });

      if (!scrapeResponse.ok) {
        throw new Error(`Failed to scrape prices: ${scrapeResponse.statusText}`);
      }

      const scrapeData = await scrapeResponse.json();
      const pricesExtracted = scrapeData.pricesExtracted;
      
      ctx.log(`✅ Extracted ${pricesExtracted} prices from ${scrapeData.scrapedCount} competitors`);

      if (pricesExtracted === 0) {
        return {
          success: false,
          session_id: sessionId,
          location: args.location,
          services: args.services,
          message: "No prices could be extracted from competitor websites. They may not publicly list prices.",
          competitors_found: competitorsFound,
          competitors_scraped: scrapeData.scrapedCount,
          prices_extracted: 0,
          suggestions_generated: 0
        };
      }

      // Step 4: Analyze market and generate suggestions
      ctx.log(`🧠 Analyzing market prices and generating recommendations...`);
      const analyzeResponse = await fetch(`${BASE_URL}/api/price-wizard/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });

      if (!analyzeResponse.ok) {
        throw new Error(`Failed to analyze prices: ${analyzeResponse.statusText}`);
      }

      const analyzeData = await analyzeResponse.json();
      
      ctx.log(`✅ Generated ${analyzeData.suggestionsCount} pricing recommendations`);

      // Get final results
      const suggestionsResponse = await fetch(`${BASE_URL}/api/price-wizard/suggestions/${sessionId}`);
      const suggestions = await suggestionsResponse.json();

      const pricesResponse = await fetch(`${BASE_URL}/api/price-wizard/prices/${sessionId}`);
      const prices = await pricesResponse.json();

      const competitorsResponse = await fetch(`${BASE_URL}/api/price-wizard/competitors/${sessionId}`);
      const competitors = await competitorsResponse.json();

      // Format results for Agent
      const serviceBreakdown = suggestions.reduce((acc: any, s: any) => {
        if (!acc[s.service_type]) {
          acc[s.service_type] = {
            market_range: {
              minimum: s.market_min,
              median: s.market_median,
              maximum: s.market_max,
              currency: "EUR"
            },
            recommendations: {}
          };
        }
        
        acc[s.service_type].recommendations[s.tier] = {
          suggested_price: s.suggested_price,
          reasoning: s.reasoning,
          confidence: "high"
        };
        
        return acc;
      }, {});

      return {
        success: true,
        session_id: sessionId,
        location: args.location,
        services: args.services,
        research_summary: {
          competitors_found: competitorsFound,
          competitors_scraped: scrapeData.scrapedCount,
          prices_extracted: pricesExtracted,
          suggestions_generated: analyzeData.suggestionsCount
        },
        competitors: competitors.map((c: any) => ({
          name: c.competitor_name,
          website: c.website_url,
          location: c.location,
          prices_found: c.price_count,
          status: c.status
        })),
        pricing_analysis: serviceBreakdown,
        top_prices: prices.slice(0, 10).map((p: any) => ({
          competitor: p.competitor_name,
          service: p.service_type,
          price: p.price_amount,
          currency: p.currency,
          confidence: p.confidence_score
        })),
        next_steps: [
          `Review detailed suggestions in admin UI: /admin/price-wizard?session=${sessionId}`,
          "Adjust recommendations based on your unique value proposition",
          "Use price_wizard_activate tool to apply selected prices to your price lists"
        ]
      };

    } catch (error: any) {
      ctx.log(`❌ Price research failed: ${error.message}`);
      throw new Error(`Price wizard research failed: ${error.message}`);
    }
  }
};

// Register the tool
registerTool(def);

export default def;
