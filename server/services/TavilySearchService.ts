import { searchLocale } from './AxixosSearchService';
import { ownDomains, isIrrelevantSite } from '../lib/competitorFilter';
/**
 * Tavily Search Service
 * 
 * Uses Tavily AI-powered search to find competitors and extract their content.
 * Perfect for price research - searches AND extracts page content in one call.
 */

interface TavilySearchResult {
  title: string;
  url: string;
  content: string;
  raw_content?: string; // full page text when include_raw_content is enabled
  score: number;
  published_date?: string;
}

interface TavilyResponse {
  query: string;
  results: TavilySearchResult[];
  answer?: string;
}

interface CompetitorSearchResult {
  name: string;
  website: string;
  content: string;
  relevanceScore: number;
}

export class TavilySearchService {
  private apiKey: string;
  private baseUrl = 'https://api.tavily.com';

  /**
   * @param apiKey resolved by the caller through server/lib/searchProvider.ts — the
   * studio own key when they have set one, the platform key otherwise. Passed in rather
   * than read here, because reading process.env directly is what made a studio key
   * invisible to this class no matter where they entered it.
   */
  constructor(apiKey?: string | null) {
    this.apiKey = (apiKey || '').trim();
    if (!this.apiKey) {
      console.warn('⚠️ No competitor-search key resolved — search will fail');
    }
  }

  /**
   * Search for photography competitors in a specific location
   */
  async searchCompetitors(
    location: string,
    services: string[],
    maxResults: number = 12
  ): Promise<CompetitorSearchResult[]> {
    console.log(`🔍 Tavily: Searching for photographers in ${location}...`);
    // Presence only. This printed the first eight characters of a live credential on
    // every single search.
    console.log(`   API key configured: ${this.apiKey ? 'yes' : 'NO'}`);

    // Build search queries for different services
    const locale = await searchLocale();
    const searchQueries = this.buildSearchQueries(location, services, locale.language);
    const allResults: CompetitorSearchResult[] = [];
    const seenDomains = new Set<string>();
    // The studio's own hostnames. This path never excluded them, so the wizard could find
    // the studio's own website and report its current prices back as the market.
    const own = await ownDomains();
    const errors: string[] = [];

    for (const query of searchQueries) {
      try {
        console.log(`   🔎 Query: "${query}"`);
        const results = await this.search(query, Math.ceil(maxResults / searchQueries.length) + 2);
        console.log(`   📋 Got ${results.length} results`);
        
        for (const result of results) {
          const domain = this.extractDomain(result.url);
          
          // Skip duplicates and irrelevant sites
          if (seenDomains.has(domain)) continue;
          // `own` is resolved once per search below. Passing it is the whole point of the
          // shared helper: this path had no own-domain exclusion, so the studio scraped its
          // own price list and the wizard reported it back as the market.
          if (isIrrelevantSite(domain, own)) continue;
          
          seenDomains.add(domain);
          allResults.push({
            name: this.deriveBusinessName(result.title, result.url),
            website: result.url,
            // Prefer full page text so the AI extractor has actual prices to work with
            content: result.raw_content || result.content,
            relevanceScore: result.score,
          });
        }

        // Rate limiting
        await this.delay(500);
      } catch (error: any) {
        console.error(`  ❌ Search failed for "${query}":`, error.message);
        errors.push(error.message);
      }
    }

    // If ALL queries failed, throw with details so the session records the reason
    if (allResults.length === 0 && errors.length > 0) {
      throw new Error(`All Tavily searches failed: ${errors[0]}`);
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
  async searchCompetitorPricing(websiteUrl: string, businessName: string): Promise<string> {
    console.log(`  📄 Fetching pricing for: ${businessName}`);

    const domain = this.extractDomain(websiteUrl);
    // Bilingual, and no longer naming one currency symbol: a page priced in dollars or
    // pounds matched none of the money terms and so looked like a site with no prices.
    const query = `site:${domain} (pricing OR prices OR packages OR investment OR rates OR cost OR Preise OR Preis OR Pakete OR Kosten)`;

    try {
      const results = await this.search(query, 3);
      
      if (results.length > 0) {
        // Combine full page content from all pricing-related pages
        return results.map(r => r.raw_content || r.content).join('\n\n---\n\n');
      }
      
      return '';
    } catch (error: any) {
      console.error(`  ❌ Pricing search failed for ${businessName}:`, error.message);
      return '';
    }
  }

  /**
   * Execute a Tavily search
   */
  private async search(query: string, maxResults: number): Promise<TavilySearchResult[]> {
    // Hard timeout so a slow/hung Tavily request can never stall the whole pipeline
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/search`, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          query,
          search_depth: 'advanced', // Gets more content from pages
          include_answer: false,
          include_raw_content: true, // full page text so the AI extractor can find actual prices
          max_results: maxResults,
          include_domains: [],
          exclude_domains: [
            'facebook.com', 'instagram.com', 'pinterest.com',
            'youtube.com', 'linkedin.com', 'twitter.com', 'tiktok.com',
            'yelp.com', 'tripadvisor.com', 'wikipedia.org',
            'amazon.com', 'ebay.com',
            // Exclude our own site so we don't list ourselves as a competitor
            'newagefotografie.com', 'newagefotografie.at',
          ],
        }),
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Tavily API error: ${response.status} - ${errorText}`);
    }

    const data: TavilyResponse = await response.json();
    return data.results || [];
  }

  /**
   * Build search queries for different services
   */
  private buildSearchQueries(location: string, services: string[], language: 'de' | 'en' = 'en'): string[] {
    const queries: string[] = [];

    // English terms. These were absent entirely — the whole builder spoke German, so a
    // studio in Shreveport searched for "Fotograf Shreveport Preise Pakete" and found
    // nobody. Its sibling AxixosSearchService was fixed for this; Tavily was missed, and
    // Tavily is the path a studio takes once they set their OWN key.
    const serviceTermsEN: Record<string, string[]> = {
      'family': ['family photographer', 'family photography'],
      'family portrait': ['family photographer', 'family portrait photography'],
      'portrait': ['portrait photographer', 'portrait photography'],
      'portrait photography': ['portrait photographer', 'portrait photography'],
      'wedding': ['wedding photographer', 'wedding photography'],
      'wedding photography': ['wedding photographer', 'wedding photography'],
      'newborn': ['newborn photographer', 'baby photographer'],
      'newborn photography': ['newborn photographer', 'newborn photography'],
      'maternity': ['maternity photographer', 'maternity photography'],
      'maternity photography': ['maternity photographer', 'maternity photography'],
      'boudoir': ['boudoir photographer', 'boudoir photography'],
      'boudoir photography': ['boudoir photographer', 'boudoir photography'],
      'corporate': ['corporate photographer', 'business headshot photographer'],
      'corporate photography': ['corporate photographer', 'commercial photography'],
      'event': ['event photographer', 'event photography'],
      'event photography': ['event photographer', 'event photography'],
    };

    // Keys support both short IDs (family) and full display names (Family Portrait)
    const serviceTermsDE: Record<string, string[]> = {
      'family': ['Familienfotograf', 'Familienfotografie'],
      'family portrait': ['Familienfotograf', 'Familienfotografie'],
      'portrait': ['Portraitfotograf', 'Porträtfotografie'],
      'portrait photography': ['Portraitfotograf', 'Porträtfotografie'],
      'wedding': ['Hochzeitsfotograf', 'Hochzeitsfotografie'],
      'wedding photography': ['Hochzeitsfotograf', 'Hochzeitsfotografie'],
      'newborn': ['Neugeborenenfotograf', 'Babyfotograf', 'Newborn Fotograf'],
      'newborn photography': ['Neugeborenenfotograf', 'Babyfotograf', 'Newborn Fotograf'],
      'corporate': ['Business Fotograf', 'Unternehmensfotografie'],
      'corporate photography': ['Business Fotograf', 'Unternehmensfotografie'],
      'event': ['Eventfotograf', 'Veranstaltungsfotografie'],
      'event photography': ['Eventfotograf', 'Veranstaltungsfotografie'],
    };

    const de = language === 'de';
    const map = de ? serviceTermsDE : serviceTermsEN;

    // Main query with pricing intent
    queries.push(de
      ? `Fotograf ${location} Preise Pakete`
      : `photographer ${location} pricing packages`);

    // Service-specific queries
    for (const service of services) {
      const key = service.toLowerCase();
      const terms = map[key] || [service];
      queries.push(de
        ? `${terms[0]} ${location} Preise`
        : `${terms[0]} ${location} prices`);
    }

    return queries.slice(0, 4); // Limit to 4 queries for cost efficiency
  }

  /**
   * Extract domain from URL
   */
  private extractDomain(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace('www.', '');
    } catch {
      return url;
    }
  }

  /**
   * Extract business name from search result title
   */
  private extractBusinessName(title: string): string {
    return title
      .replace(/\s*[-–—|:]\s*.*$/, '') // Remove everything after separator
      .replace(/\s*\(.*?\)\s*/g, '')    // Remove parentheses
      .replace(/Fotograf(ie|in)?|Photography|Studio/gi, '')
      .trim() || title.split(/[-–—|]/)[0].trim();
  }

  /**
   * Derive a usable business name. Search-result titles are often the title of a
   * pricing PAGE ("Preise", "Angebot", "Familienfotos Preise") rather than the
   * business name, so when the extracted title is generic or too short we fall
   * back to a human-readable form of the domain (e.g. gabrielepaar.net → "Gabrielepaar").
   */
  private deriveBusinessName(title: string, url: string): string {
    const cleaned = this.extractBusinessName(title);
    const generic = /^(preise?|angebot|leistungen|informationen|pakete|kosten|home|startseite|fotoshooting|familienfotos?|portrait|kontakt|über uns|about)\b/i;

    if (cleaned && cleaned.length >= 3 && !generic.test(cleaned)) {
      return cleaned;
    }

    try {
      const base = new URL(url).hostname.replace(/^www\./, '').split('.')[0];
      const fromDomain = base.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).trim();
      return fromDomain || cleaned || title;
    } catch {
      return cleaned || title;
    }
  }

  // The blocklist that used to sit here was a stale copy of the AxixOS one. See
  // ../lib/competitorFilter.

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
