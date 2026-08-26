/**
 * OpenAI Price Extractor Service
 * 
 * Uses GPT to extract structured pricing information from unstructured text.
 * Understands German, context, and photography business terminology.
 */

import OpenAI from 'openai';
import { studioMoneyContext } from '../lib/money';
import { tenantOpenAI } from '../lib/openaiClient';

interface ExtractedPrice {
  serviceName: string;
  serviceType: 'family' | 'portrait' | 'wedding' | 'newborn' | 'corporate' | 'event' | 'other';
  packageName?: string;
  price: number;
  currency: string;
  priceType: 'fixed' | 'starting_from' | 'range_min' | 'range_max' | 'hourly';
  duration?: string;
  includedPhotos?: number;
  deliverables?: string[];
  confidence: number;
}

interface CompetitorAnalysis {
  businessName: string;
  website: string;
  location?: string;
  priceRange: { min: number; max: number };
  positioning: 'budget' | 'mid-range' | 'premium' | 'luxury';
  specialties: string[];
  prices: ExtractedPrice[];
  rawContent?: string;
  extractionError?: string; // diagnostic: why 0 prices (empty content, OpenAI error, etc.)
}

interface MarketAnalysis {
  location: string;
  serviceType: string;
  competitorCount: number;
  priceStats: {
    /** How many prices this was computed from. One is not a market. */
    sampleSize: number;
    min: number;
    max: number;
    median: number;
    average: number;
    quartile25: number;
    quartile75: number;
  };
  recommendations: {
    tier: 'basic' | 'standard' | 'premium';
    suggestedPrice: number;
    reasoning: string;
    competitiveAdvantage: string;
    whatsIncluded?: string;
  }[];
  marketInsights: string;
}

export class OpenAIPriceExtractor {
  /**
   * Resolved per call, not per instance.
   *
   * A client built in the constructor captures whichever key existed when the service was
   * created, which on this path was always the platform one. Price research is ongoing work
   * a studio asked for, so it is theirs to fund.
   */
  private async client() {
    const c = await tenantOpenAI('price-extractor');
    if (!c) throw new Error('No OpenAI key configured for price research');
    return c;
  }
  private model: string;

  constructor() {
    // Nothing to construct here — see client() below.
    // Use a chat/completions-compatible model. Deliberately NOT process.env.OPENAI_MODEL —
    // the host sets that to a Responses-API-only model (e.g. a GPT-5/o-series), which
    // 404s on chat/completions and made every extraction return 0 prices. Override with
    // OPENAI_PRICE_MODEL only if you know it supports chat/completions.
    this.model = process.env.OPENAI_PRICE_MODEL || 'gpt-4o-mini';
  }

  /**
   * Extract pricing information from competitor website content
   */
  async extractPrices(
    businessName: string,
    websiteContent: string,
    websiteUrl: string
  ): Promise<CompetitorAnalysis> {
    // The studio own currency. This prompt used to declare "currency": "EUR" as the
    // schema for every tenant, so an American studio scraped dollar prices and had them
    // labelled euros on the way into the database.
    const money = await studioMoneyContext();
    console.log(`  🤖 AI extracting prices for: ${businessName}`);

    if (!websiteContent || websiteContent.length < 50) {
      return {
        businessName,
        website: websiteUrl,
        priceRange: { min: 0, max: 0 },
        positioning: 'mid-range',
        specialties: [],
        prices: [],
        extractionError: `empty/short content (${(websiteContent || '').length} chars)`,
      };
    }

    try {
      const response = await (await this.client()).chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: `You are an expert at extracting photography pricing information from website content.
You read pricing terminology in English and German.

// The German glossary is kept because it costs nothing and a studio may well research a
// German-speaking market. What was removed is the ASSUMPTION: this used to open with
// "You understand German (Austrian)" and close by telling the model to consider Austrian
// market specifics and Vienna pricing expectations, for every studio on every instance.
Common German terms:
- "Preise" = prices
- "Pakete" = packages
- "ab €X" = starting from €X
- "Inklusive" = included
- "Fotos im Onlinegaloerie" = photos in online gallery
- "Bearbeitete Bilder" = edited images

Extract ALL pricing information you can find. Be thorough.
Return valid JSON only.`
          },
          {
            role: 'user',
            content: `Extract pricing information from this photography business website content.

Business: ${businessName}
Website: ${websiteUrl}

Content:
${websiteContent.substring(0, 8000)}

Return a JSON object with this structure:
{
  "prices": [
    {
      "serviceName": "Package or service name",
      "serviceType": "family|portrait|wedding|newborn|corporate|event|other",
      "packageName": "Optional package tier name",
      "price": 299,
      "currency": "${money.currency}",
      "priceType": "fixed|starting_from|range_min|range_max|hourly",
      "duration": "2 hours",
      "includedPhotos": 20,
      "deliverables": ["Online gallery", "10 prints"],
      "confidence": 0.9
    }
  ],
  "positioning": "budget|mid-range|premium|luxury",
  "specialties": ["family", "newborn"],
  "location": "City the business operates in"
}`
          }
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from OpenAI');
      }

      const parsed = JSON.parse(content);
      const prices = parsed.prices || [];

      return {
        businessName,
        website: websiteUrl,
        location: parsed.location,
        priceRange: this.calculatePriceRange(prices),
        positioning: parsed.positioning || 'mid-range',
        specialties: parsed.specialties || [],
        prices,
        extractionError: prices.length === 0 ? `AI returned 0 prices from ${websiteContent.length} chars` : undefined,
      };

    } catch (error: any) {
      console.error(`  ❌ AI extraction failed for ${businessName}:`, error.message);
      return {
        businessName,
        website: websiteUrl,
        priceRange: { min: 0, max: 0 },
        positioning: 'mid-range',
        specialties: [],
        prices: [],
        extractionError: `OpenAI error: ${error.message}`,
      };
    }
  }

  /**
   * Generate market analysis and pricing recommendations
   */
  async analyzeMarket(
    location: string,
    serviceType: string,
    competitorData: CompetitorAnalysis[]
  ): Promise<MarketAnalysis> {
    const money = await studioMoneyContext();
    console.log(`📊 AI analyzing market for ${serviceType} in ${location}...`);

    // Map service type keywords for fuzzy matching
    const serviceKeywords: Record<string, string[]> = {
      'Family Portrait': ['family', 'portrait', 'familienfotos', 'familien'],
      'Newborn Photography': ['newborn', 'baby', 'neugeborene', 'babybauch'],
      'Wedding Photography': ['wedding', 'hochzeit', 'braut'],
      'Corporate Photography': ['corporate', 'business', 'branding', 'portrait'],
      'Event Photography': ['event', 'veranstaltung', 'party'],
    };

    // Get keywords for this service type (or use the type itself)
    const keywords = serviceKeywords[serviceType] || [serviceType.toLowerCase()];

    // Collect all prices for this service type using fuzzy matching
    const allPrices: number[] = [];
    competitorData.forEach(comp => {
      comp.prices
        .filter(p => {
          if (serviceType === 'all') return true;
          const priceType = (p.serviceType || '').toLowerCase();
          return keywords.some(kw => priceType.includes(kw.toLowerCase()));
        })
        .forEach(p => {
          if (p.price && p.price > 0) {
            allPrices.push(p.price);
          }
        });
    });

    console.log(`   💰 Found ${allPrices.length} prices matching "${serviceType}"`);

    // Whether these figures describe the service asked for, or every service pooled.
    // Surfaced to the studio rather than kept in a log line nobody reads.
    let mixedCategories = false;
    if (allPrices.length === 0) {
      // If no exact matches, try using all prices
      console.log('   ⚠️  No matching prices, using all available prices');
      mixedCategories = true;
      competitorData.forEach(comp => {
        comp.prices.forEach(p => {
          if (p.price && p.price > 0) {
            allPrices.push(p.price);
          }
        });
      });
    }

    if (allPrices.length === 0) {
      return this.getAIEstimatedAnalysis(location, serviceType, competitorData);
    }

    // Calculate statistics
    allPrices.sort((a, b) => a - b);

    const OUTLIER_FACTOR = 5;
    let dropped = 0;
    if (allPrices.length >= 5) {
      const mid = allPrices[Math.floor(allPrices.length / 2)];
      if (mid > 0) {
        const kept = allPrices.filter((p) => p <= mid * OUTLIER_FACTOR && p >= mid / OUTLIER_FACTOR);
        // Never let the filter empty the sample or take most of it — that would mean the
        // median itself is the odd one out, and the filter is the thing that is wrong.
        if (kept.length >= Math.ceil(allPrices.length / 2)) {
          dropped = allPrices.length - kept.length;
          allPrices.length = 0;
          allPrices.push(...kept);
        }
      }
    }
    if (dropped > 0) {
      console.log(`   ✂️  Dropped ${dropped} price(s) more than ${OUTLIER_FACTOR}× from the median — almost always another service scraped onto the same page`);
    }

    const stats = {
      // Carried through so the UI can decline to make a claim it has no basis for.
      sampleSize: allPrices.length,
      min: allPrices[0],
      max: allPrices[allPrices.length - 1],
      median: allPrices[Math.floor(allPrices.length / 2)],
      average: Math.round(allPrices.reduce((a, b) => a + b, 0) / allPrices.length),
      quartile25: allPrices[Math.floor(allPrices.length * 0.25)],
      quartile75: allPrices[Math.floor(allPrices.length * 0.75)],
    };

    // What the studio needs to know about how these numbers were arrived at. Both of
    // these used to happen silently: a pooled cross-service sample was labelled as the
    // service asked for, and discarded outliers left no trace.
    const caveat = [
      mixedCategories
        ? `

Note: no prices specific to ${serviceType} were found on the sites we read, so these figures pool every service those studios list. Treat them as a general guide rather than a ${serviceType} benchmark.`
        : '',
      dropped > 0
        ? `

Note: ${dropped} price${dropped === 1 ? '' : 's'} far outside the rest of the range ${dropped === 1 ? 'was' : 'were'} left out — usually another service listed on the same page.`
        : '',
    ].join('');

    try {
      const response = await (await this.client()).chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: `You are a photography business pricing strategist.
Generate actionable pricing recommendations based on market data.
// Was "Consider Austrian market specifics and Vienna pricing expectations." — advice a
// model in Shreveport does not need and should not be given. The market is whatever the
// studio typed into the location box; the currency is the one they actually charge in.
The market you are advising on is ${location}. All figures are in ${money.currency}.`
          },
          {
            role: 'user',
            content: `Analyze this photography market data and generate pricing recommendations.

Location: ${location}
Service: ${serviceType}
Competitors analyzed: ${competitorData.length}

Price Statistics:
- Minimum: ${stats.min} ${money.currency}
- Maximum: ${stats.max} ${money.currency}
- Median: ${stats.median} ${money.currency}
- Average: ${stats.average} ${money.currency}
- 25th percentile: ${stats.quartile25} ${money.currency}
- 75th percentile: ${stats.quartile75} ${money.currency}

Competitor packages (price — package name — what's included, where known):
${competitorData.map(c => {
  const pkgs = (c.prices || [])
    .filter((p: any) => p.price > 0)
    .map((p: any) => `    ${money.currency} ${p.price}${p.packageName ? ` (${p.packageName})` : ''}${p.includes ? ` — ${p.includes}` : ''}`)
    .join('\n');
  return `- ${c.businessName} [${c.positioning}]:\n${pkgs || '    (price only, no package detail)'}`;
}).join('\n')}

For each tier, set "whatsIncluded" to a concise, realistic summary of what competitors at that price point typically include (session length, number of edited images, online gallery, prints, etc.), inferred from the package data above. If detail is sparse, give the typical inclusion for that price in ${location}.

Every suggestedPrice MUST be derived from the Price Statistics above — anchor basic near
the 25th percentile, standard near the median, and premium near the 75th percentile, then
adjust for what the packages include. Do not copy the numbers in the example below; they
are placeholders showing the shape, not prices.

Return JSON with:
{
  "recommendations": [
    {
      "tier": "basic",
      "suggestedPrice": <number near the 25th percentile>,
      "reasoning": "Why this price",
      "competitiveAdvantage": "What to emphasize at this tier",
      "whatsIncluded": "e.g. ~60 min session, 8-10 edited images, online gallery"
    },
    {
      "tier": "standard",
      "suggestedPrice": <number near the median>,
      "reasoning": "...",
      "competitiveAdvantage": "...",
      "whatsIncluded": "..."
    },
    {
      "tier": "premium",
      "suggestedPrice": <number near the 75th percentile>,
      "reasoning": "...",
      "competitiveAdvantage": "...",
      "whatsIncluded": "..."
    }
  ],
  "marketInsights": "2-3 sentence market summary with actionable insight"
}`
          }
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content;
      const parsed = content ? JSON.parse(content) : {};

      return {
        location,
        serviceType,
        competitorCount: competitorData.length,
        priceStats: stats,
        recommendations: this.recommendationsTrackTheMarket(parsed.recommendations, stats)
          ? parsed.recommendations
          : this.getDefaultRecommendations(stats, money.currency),
        marketInsights: (parsed.marketInsights || 'Market analysis completed.') + caveat,
      };

    } catch (error: any) {
      console.error('❌ Market analysis failed:', error.message);
      return {
        location,
        serviceType,
        competitorCount: competitorData.length,
        priceStats: stats,
        recommendations: this.getDefaultRecommendations(stats, money.currency),
        marketInsights: 'AI analysis unavailable. Recommendations based on statistical analysis.' + caveat,
      };
    }
  }

  /**
   * Calculate price range from extracted prices
   */
  private calculatePriceRange(prices: ExtractedPrice[]): { min: number; max: number } {
    if (prices.length === 0) return { min: 0, max: 0 };
    
    const amounts = prices.map(p => p.price).filter(p => p > 0);
    if (amounts.length === 0) return { min: 0, max: 0 };
    
    return {
      min: Math.min(...amounts),
      max: Math.max(...amounts),
    };
  }

  /**
   * Are these recommendations actually derived from the market data, or not?
   *
   * Rewording the prompt is not a guarantee. Every suggestion in the live database was
   * 250 / 400 / 600 regardless of service — the placeholder numbers from the prompt's own
   * JSON example — against medians of 400, 125, 1199 and 2499. A studio was being told to
   * charge 400 for newborn work in a market whose middle is 1199.
   *
   * So the output is checked against the input rather than trusted. Two properties, both
   * of which any genuine recommendation has and the placeholder set does not:
   *
   *   the tiers rise — basic < standard < premium;
   *   the standard tier sits within a factor of two of the observed median.
   *
   * A factor of two is deliberately generous. A studio positioning below or above its
   * market is normal and passes; a set of numbers that has nothing to do with the market
   * does not. Anything that fails falls back to the quartile-derived set, which is
   * anchored to the data by construction.
   */
  private recommendationsTrackTheMarket(recs: any[], stats: any): boolean {
    if (!Array.isArray(recs) || recs.length === 0) return false;

    const by = (t: string) => Number(recs.find((r) => r?.tier === t)?.suggestedPrice) || 0;
    const basic = by('basic'), standard = by('standard'), premium = by('premium');
    if (!(basic > 0 && standard > 0 && premium > 0)) return false;
    if (!(basic < standard && standard < premium)) return false;

    const median = Number(stats?.median) || 0;
    // Nothing to check against. Not a reason to reject — the estimate path produces its
    // own statistics, and the rising-tiers test above still applies.
    if (median <= 0) return true;

    const ratio = standard / median;
    return ratio >= 0.5 && ratio <= 2;
  }

  /**
   * Default recommendations when AI fails — or when the AI's own recommendations turn out
   * not to be anchored to the market data it was given.
   */
  private getDefaultRecommendations(stats: any, cur: string = '') {
    // With no statistics there is nothing to derive a price from, and three tiers of zero
    // read as advice. Returning nothing lets the page say it found nothing.
    if (!(Number(stats?.median) > 0 || Number(stats?.quartile25) > 0)) return [];

    return [
      {
        tier: 'basic' as const,
        suggestedPrice: Math.round(stats.quartile25 * 1.05),
        reasoning: `Competitive entry price, slightly above 25th percentile (${cur} ${stats.quartile25})`,
        competitiveAdvantage: 'Emphasize value and quick turnaround',
      },
      {
        tier: 'standard' as const,
        suggestedPrice: stats.median,
        reasoning: `Market median pricing (${cur} ${stats.median})`,
        competitiveAdvantage: 'Balance of quality and value',
      },
      {
        tier: 'premium' as const,
        suggestedPrice: Math.round(stats.quartile75 * 0.95),
        reasoning: `Premium positioning near 75th percentile (${cur} ${stats.quartile75})`,
        competitiveAdvantage: 'Premium experience and deliverables',
      },
    ];
  }

  /**
   * AI-estimated analysis when no scraped prices are available
   * Uses OpenAI's knowledge of the market the studio actually trades in.
   */
  private async getAIEstimatedAnalysis(
    location: string,
    serviceType: string,
    competitorData: CompetitorAnalysis[]
  ): Promise<MarketAnalysis> {
    console.log(`   🤖 No scraped prices available - generating AI market estimates for ${serviceType} in ${location}...`);

    // The studio's own currency. This path used to instruct the model to answer in EUR for
    // the Austrian market regardless of where the studio actually trades.
    const money = await studioMoneyContext();

    try {
      const response = await (await this.client()).chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: `You are an expert photography business pricing consultant.
Generate realistic market pricing data based on your knowledge of typical prices for photography services.
All prices must be in ${money.currency} and reflect the market for the city given by the user — not any other country's.`
          },
          {
            role: 'user',
            content: `I need realistic market pricing data for "${serviceType}" photography in ${location}.

We found ${competitorData.length} competitor photography businesses but couldn't scrape their actual prices from their websites.
${competitorData.length > 0 ? `Competitors found: ${competitorData.map(c => c.businessName).join(', ')}` : ''}

Based on your knowledge of the photography market in ${location}, provide:
1. Realistic price statistics (what photographers typically charge for ${serviceType} in ${location})
2. Three pricing tier recommendations (basic, standard, premium)

Return JSON:
{
Use your own knowledge of this market for every number. The angle brackets below describe
what each value is; do not return them literally, and do not anchor on any example.

  "priceStats": {
    "min": <lowest typical price>,
    "max": <highest typical price>,
    "median": <middle of the market>,
    "average": <mean price>,
    "quartile25": <25th percentile>,
    "quartile75": <75th percentile>
  },
  "recommendations": [
    {
      "tier": "basic",
      "suggestedPrice": <near your quartile25>,
      "reasoning": "Why this price for entry-level",
      "competitiveAdvantage": "What to emphasize at this price point"
    },
    {
      "tier": "standard",
      "suggestedPrice": <near your median>,
      "reasoning": "Why this price for mid-range",
      "competitiveAdvantage": "What to emphasize"
    },
    {
      "tier": "premium",
      "suggestedPrice": <near your quartile75>,
      "reasoning": "Why this price for premium",
      "competitiveAdvantage": "What to emphasize"
    }
  ],
  "marketInsights": "2-3 sentences about the ${serviceType} photography market in ${location}"
}`
          }
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content;
      const parsed = content ? JSON.parse(content) : {};

      return {
        location,
        serviceType,
        competitorCount: competitorData.length,
        // sampleSize is forced to 0 whatever the model returns: these are estimates, not
        // observed competitor prices, and the UI must not present them as a measured market.
        priceStats: { ...(parsed.priceStats || { min: 0, max: 0, median: 0, average: 0, quartile25: 0, quartile75: 0 }), sampleSize: 0 },
        // The estimate path invents its own statistics, so the check here is only that the
        // tiers are coherent with each other and with those. It still catches the
        // placeholder set.
        recommendations: this.recommendationsTrackTheMarket(parsed.recommendations, parsed.priceStats)
          ? parsed.recommendations
          : this.getDefaultRecommendations(
              parsed.priceStats || { quartile25: 0, median: 0, quartile75: 0 }, money.currency),
        marketInsights: (parsed.marketInsights || 'AI-estimated market data.') + 
          '\n\nNote: These prices are AI estimates based on general market knowledge, not scraped from competitor websites.',
      };

    } catch (error: any) {
      console.error('❌ AI market estimation failed:', error.message);
      return this.getDefaultAnalysis(location, serviceType);
    }
  }

  /**
   * Default analysis when no data available
   */
  private getDefaultAnalysis(location: string, serviceType: string): MarketAnalysis {
    return {
      location,
      serviceType,
      competitorCount: 0,
      // sampleSize 0 is the honest value here: this is the no-data fallback, and the UI
      // must not state a market position from it.
      priceStats: { sampleSize: 0, min: 0, max: 0, median: 0, average: 0, quartile25: 0, quartile75: 0 },
      recommendations: [],
      marketInsights: 'Insufficient data for market analysis. Try adding competitor prices manually.',
    };
  }
}
