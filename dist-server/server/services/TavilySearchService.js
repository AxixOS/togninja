"use strict";
/**
 * Tavily Search Service
 *
 * Uses Tavily AI-powered search to find competitors and extract their content.
 * Perfect for price research - searches AND extracts page content in one call.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TavilySearchService = void 0;
class TavilySearchService {
    constructor() {
        this.baseUrl = 'https://api.tavily.com';
        this.apiKey = process.env.TAVILY_API_KEY || '';
        if (!this.apiKey) {
            console.warn('⚠️ TAVILY_API_KEY not set - search will fail');
        }
    }
    /**
     * Search for photography competitors in a specific location
     */
    async searchCompetitors(location, services, maxResults = 12) {
        console.log(`🔍 Tavily: Searching for photographers in ${location}...`);
        // Build search queries for different services
        const searchQueries = this.buildSearchQueries(location, services);
        const allResults = [];
        const seenDomains = new Set();
        for (const query of searchQueries) {
            try {
                const results = await this.search(query, Math.ceil(maxResults / searchQueries.length) + 2);
                for (const result of results) {
                    const domain = this.extractDomain(result.url);
                    // Skip duplicates and irrelevant sites
                    if (seenDomains.has(domain))
                        continue;
                    if (this.isIrrelevantSite(domain))
                        continue;
                    seenDomains.add(domain);
                    allResults.push({
                        name: this.extractBusinessName(result.title),
                        website: result.url,
                        content: result.content,
                        relevanceScore: result.score,
                    });
                }
                // Rate limiting
                await this.delay(500);
            }
            catch (error) {
                console.error(`  ❌ Search failed for "${query}":`, error.message);
            }
        }
        // Sort by relevance and return top results
        const sorted = allResults
            .sort((a, b) => b.relevanceScore - a.relevanceScore)
            .slice(0, maxResults);
        console.log(`  ✅ Found ${sorted.length} unique competitors`);
        return sorted;
    }
    /**
     * Deep search a specific competitor website for pricing information
     */
    async searchCompetitorPricing(websiteUrl, businessName) {
        console.log(`  📄 Fetching pricing for: ${businessName}`);
        const domain = this.extractDomain(websiteUrl);
        const query = `site:${domain} (Preise OR Preis OR pricing OR Pakete OR packages OR investment OR Kosten OR €)`;
        try {
            const results = await this.search(query, 3);
            if (results.length > 0) {
                // Combine content from all pricing-related pages
                return results.map(r => r.content).join('\n\n---\n\n');
            }
            return '';
        }
        catch (error) {
            console.error(`  ❌ Pricing search failed for ${businessName}:`, error.message);
            return '';
        }
    }
    /**
     * Execute a Tavily search
     */
    async search(query, maxResults) {
        const response = await fetch(`${this.baseUrl}/search`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                api_key: this.apiKey,
                query,
                search_depth: 'advanced', // Gets more content from pages
                include_answer: false,
                include_raw_content: false,
                max_results: maxResults,
                include_domains: [],
                exclude_domains: [
                    'facebook.com', 'instagram.com', 'pinterest.com',
                    'youtube.com', 'linkedin.com', 'twitter.com', 'tiktok.com',
                    'yelp.com', 'tripadvisor.com', 'wikipedia.org',
                    'amazon.com', 'ebay.com'
                ],
            }),
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Tavily API error: ${response.status} - ${errorText}`);
        }
        const data = await response.json();
        return data.results || [];
    }
    /**
     * Build search queries for different services
     */
    buildSearchQueries(location, services) {
        const queries = [];
        // German search terms (Austria)
        const serviceTermsDE = {
            family: ['Familienfotograf', 'Familienfotografie'],
            portrait: ['Portraitfotograf', 'Porträtfotografie'],
            wedding: ['Hochzeitsfotograf', 'Hochzeitsfotografie'],
            newborn: ['Neugeborenenfotograf', 'Babyfotograf', 'Newborn Fotograf'],
            corporate: ['Business Fotograf', 'Unternehmensfotografie'],
            event: ['Eventfotograf', 'Veranstaltungsfotografie'],
        };
        // Main query with pricing intent
        queries.push(`Fotograf ${location} Preise Pakete`);
        // Service-specific queries
        for (const service of services) {
            const terms = serviceTermsDE[service] || [service];
            queries.push(`${terms[0]} ${location} Preise`);
        }
        return queries.slice(0, 4); // Limit to 4 queries for cost efficiency
    }
    /**
     * Extract domain from URL
     */
    extractDomain(url) {
        try {
            const urlObj = new URL(url);
            return urlObj.hostname.replace('www.', '');
        }
        catch {
            return url;
        }
    }
    /**
     * Extract business name from search result title
     */
    extractBusinessName(title) {
        return title
            .replace(/\s*[-–—|:]\s*.*$/, '') // Remove everything after separator
            .replace(/\s*\(.*?\)\s*/g, '') // Remove parentheses
            .replace(/Fotograf(ie|in)?|Photography|Studio/gi, '')
            .trim() || title.split(/[-–—|]/)[0].trim();
    }
    /**
     * Check if site is irrelevant (directories, social media, etc.)
     */
    isIrrelevantSite(domain) {
        const irrelevant = [
            'facebook.com', 'instagram.com', 'pinterest.com', 'youtube.com',
            'linkedin.com', 'twitter.com', 'tiktok.com', 'yelp.com',
            'tripadvisor.com', 'wikipedia.org', 'amazon.', 'ebay.',
            'herold.at', 'gelbeseiten.', 'wko.at', 'firmenabc.at',
            'kununu.com', 'karriere.at', 'willhaben.at'
        ];
        return irrelevant.some(site => domain.includes(site));
    }
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
exports.TavilySearchService = TavilySearchService;
