"use strict";
/**
 * OpenAI Price Extractor Service
 *
 * Uses GPT to extract structured pricing information from unstructured text.
 * Understands German, context, and photography business terminology.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAIPriceExtractor = void 0;
const openai_1 = __importDefault(require("openai"));
class OpenAIPriceExtractor {
    constructor() {
        this.openai = new openai_1.default({
            apiKey: process.env.OPENAI_API_KEY,
        });
        this.model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
    }
    /**
     * Extract pricing information from competitor website content
     */
    async extractPrices(businessName, websiteContent, websiteUrl) {
        console.log(`  🤖 AI extracting prices for: ${businessName}`);
        if (!websiteContent || websiteContent.length < 50) {
            return {
                businessName,
                website: websiteUrl,
                priceRange: { min: 0, max: 0 },
                positioning: 'mid-range',
                specialties: [],
                prices: [],
            };
        }
        try {
            const response = await this.openai.chat.completions.create({
                model: this.model,
                messages: [
                    {
                        role: 'system',
                        content: `You are an expert at extracting photography pricing information from website content. 
You understand German (Austrian) and English pricing terminology.

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
      "currency": "EUR",
      "priceType": "fixed|starting_from|range_min|range_max|hourly",
      "duration": "2 hours",
      "includedPhotos": 20,
      "deliverables": ["Online gallery", "10 prints"],
      "confidence": 0.9
    }
  ],
  "positioning": "budget|mid-range|premium|luxury",
  "specialties": ["family", "newborn"],
  "location": "Wien"
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
            return {
                businessName,
                website: websiteUrl,
                location: parsed.location,
                priceRange: this.calculatePriceRange(parsed.prices || []),
                positioning: parsed.positioning || 'mid-range',
                specialties: parsed.specialties || [],
                prices: parsed.prices || [],
            };
        }
        catch (error) {
            console.error(`  ❌ AI extraction failed for ${businessName}:`, error.message);
            return {
                businessName,
                website: websiteUrl,
                priceRange: { min: 0, max: 0 },
                positioning: 'mid-range',
                specialties: [],
                prices: [],
            };
        }
    }
    /**
     * Generate market analysis and pricing recommendations
     */
    async analyzeMarket(location, serviceType, competitorData) {
        console.log(`📊 AI analyzing market for ${serviceType} in ${location}...`);
        // Map service type keywords for fuzzy matching
        const serviceKeywords = {
            'Family Portrait': ['family', 'portrait', 'familienfotos', 'familien'],
            'Newborn Photography': ['newborn', 'baby', 'neugeborene', 'babybauch'],
            'Wedding Photography': ['wedding', 'hochzeit', 'braut'],
            'Corporate Photography': ['corporate', 'business', 'branding', 'portrait'],
            'Event Photography': ['event', 'veranstaltung', 'party'],
        };
        // Get keywords for this service type (or use the type itself)
        const keywords = serviceKeywords[serviceType] || [serviceType.toLowerCase()];
        // Collect all prices for this service type using fuzzy matching
        const allPrices = [];
        competitorData.forEach(comp => {
            comp.prices
                .filter(p => {
                if (serviceType === 'all')
                    return true;
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
        if (allPrices.length === 0) {
            // If no exact matches, try using all prices
            console.log('   ⚠️  No matching prices, using all available prices');
            competitorData.forEach(comp => {
                comp.prices.forEach(p => {
                    if (p.price && p.price > 0) {
                        allPrices.push(p.price);
                    }
                });
            });
        }
        if (allPrices.length === 0) {
            return this.getDefaultAnalysis(location, serviceType);
        }
        // Calculate statistics
        allPrices.sort((a, b) => a - b);
        const stats = {
            min: allPrices[0],
            max: allPrices[allPrices.length - 1],
            median: allPrices[Math.floor(allPrices.length / 2)],
            average: Math.round(allPrices.reduce((a, b) => a + b, 0) / allPrices.length),
            quartile25: allPrices[Math.floor(allPrices.length * 0.25)],
            quartile75: allPrices[Math.floor(allPrices.length * 0.75)],
        };
        try {
            const response = await this.openai.chat.completions.create({
                model: this.model,
                messages: [
                    {
                        role: 'system',
                        content: `You are a photography business pricing strategist. 
Generate actionable pricing recommendations based on market data.
Consider Austrian market specifics and Vienna pricing expectations.`
                    },
                    {
                        role: 'user',
                        content: `Analyze this photography market data and generate pricing recommendations.

Location: ${location}
Service: ${serviceType}
Competitors analyzed: ${competitorData.length}

Price Statistics:
- Minimum: €${stats.min}
- Maximum: €${stats.max}
- Median: €${stats.median}
- Average: €${stats.average}
- 25th percentile: €${stats.quartile25}
- 75th percentile: €${stats.quartile75}

Competitor Data:
${competitorData.map(c => `- ${c.businessName}: ${c.positioning}, prices €${c.priceRange.min}-€${c.priceRange.max}`).join('\n')}

Return JSON with:
{
  "recommendations": [
    {
      "tier": "basic",
      "suggestedPrice": 250,
      "reasoning": "Why this price",
      "competitiveAdvantage": "What to emphasize at this tier"
    },
    {
      "tier": "standard", 
      "suggestedPrice": 400,
      "reasoning": "...",
      "competitiveAdvantage": "..."
    },
    {
      "tier": "premium",
      "suggestedPrice": 600,
      "reasoning": "...",
      "competitiveAdvantage": "..."
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
                recommendations: parsed.recommendations || this.getDefaultRecommendations(stats),
                marketInsights: parsed.marketInsights || 'Market analysis completed.',
            };
        }
        catch (error) {
            console.error('❌ Market analysis failed:', error.message);
            return {
                location,
                serviceType,
                competitorCount: competitorData.length,
                priceStats: stats,
                recommendations: this.getDefaultRecommendations(stats),
                marketInsights: 'AI analysis unavailable. Recommendations based on statistical analysis.',
            };
        }
    }
    /**
     * Calculate price range from extracted prices
     */
    calculatePriceRange(prices) {
        if (prices.length === 0)
            return { min: 0, max: 0 };
        const amounts = prices.map(p => p.price).filter(p => p > 0);
        if (amounts.length === 0)
            return { min: 0, max: 0 };
        return {
            min: Math.min(...amounts),
            max: Math.max(...amounts),
        };
    }
    /**
     * Default recommendations when AI fails
     */
    getDefaultRecommendations(stats) {
        return [
            {
                tier: 'basic',
                suggestedPrice: Math.round(stats.quartile25 * 1.05),
                reasoning: `Competitive entry price, slightly above 25th percentile (€${stats.quartile25})`,
                competitiveAdvantage: 'Emphasize value and quick turnaround',
            },
            {
                tier: 'standard',
                suggestedPrice: stats.median,
                reasoning: `Market median pricing (€${stats.median})`,
                competitiveAdvantage: 'Balance of quality and value',
            },
            {
                tier: 'premium',
                suggestedPrice: Math.round(stats.quartile75 * 0.95),
                reasoning: `Premium positioning near 75th percentile (€${stats.quartile75})`,
                competitiveAdvantage: 'Premium experience and deliverables',
            },
        ];
    }
    /**
     * Default analysis when no data available
     */
    getDefaultAnalysis(location, serviceType) {
        return {
            location,
            serviceType,
            competitorCount: 0,
            priceStats: { min: 0, max: 0, median: 0, average: 0, quartile25: 0, quartile75: 0 },
            recommendations: [],
            marketInsights: 'Insufficient data for market analysis. Try adding competitor prices manually.',
        };
    }
}
exports.OpenAIPriceExtractor = OpenAIPriceExtractor;
