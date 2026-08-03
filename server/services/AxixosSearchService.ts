/**
 * AxixOS Intelligence Search Service
 *
 * Drop-in alternative to TavilySearchService for the Price Wizard's competitor
 * DISCOVERY and page-READING steps. Price EXTRACTION stays with
 * OpenAIPriceExtractor — AxixOS is only the search/crawl layer.
 *
 * Backed by the AxixOS Intelligence API (https://axixos-intelligence.onrender.com):
 *   Auth      header  x-axixos-api-key: <AXIXOS_INTERNAL_API_KEY>
 *   Discover  POST /v1/search/web   { query, limit, country, language }
 *                → { results: [{ title, url, snippet, metadata:{ score } }] }
 *   Read page POST /v1/crawl/page   { url }
 *                → { text, title, metaDescription, h1, ... }
 */

interface CompetitorSearchResult {
  name: string;
  website: string;
  content: string;
  relevanceScore: number;
}

export class AxixosSearchService {
  private apiKey: string;
  private baseUrl = (process.env.AXIXOS_API_BASE || 'https://axixos-intelligence.onrender.com').replace(/\/+$/, '');

  constructor() {
    this.apiKey = process.env.AXIXOS_INTERNAL_API_KEY || '';
    if (!this.apiKey) {
      console.warn('⚠️ AXIXOS_INTERNAL_API_KEY not set - AxixOS search disabled');
    }
  }

  /** Whether AxixOS should be used as the discovery/crawl provider. */
  isConfigured(): boolean {
    return !!this.apiKey;
  }

  private headers(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'x-axixos-api-key': this.apiKey,
    };
  }

  private async post(path: string, body: any, timeoutMs = 30000): Promise<any> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method: 'POST',
        signal: controller.signal,
        headers: this.headers(),
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        throw new Error(`AxixOS ${path} error: ${response.status} - ${errorText}`);
      }
      return await response.json();
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Find photography competitors in a location. Same signature + return type as
   * TavilySearchService.searchCompetitors, so PriceResearchService can use either.
   * Uses the German pricing-intent queries so results surface actual price pages.
   */
  async searchCompetitors(
    location: string,
    services: string[],
    maxResults: number = 12,
  ): Promise<CompetitorSearchResult[]> {
    console.log(`🔍 AxixOS: searching for photographers in ${location}...`);
    const queries = this.buildSearchQueries(location, services);
    const all: CompetitorSearchResult[] = [];
    const seenDomains = new Set<string>();
    const errors: string[] = [];

    for (const query of queries) {
      try {
        const perQuery = Math.ceil(maxResults / queries.length) + 2;
        const data = await this.post('/v1/search/web', {
          query,
          limit: perQuery,
          country: 'AT',
          language: 'de',
        });
        const results: any[] = data?.results || [];
        for (const r of results) {
          const website = r.url || r.link || '';
          if (!website) continue;
          const domain = this.extractDomain(website);
          if (seenDomains.has(domain) || this.isIrrelevantSite(domain)) continue;
          seenDomains.add(domain);
          all.push({
            name: this.deriveBusinessName(r.title || r.name || '', website),
            website,
            content: r.snippet || r.content || '', // short; Stage 2 crawls for full text
            relevanceScore: Number(r.metadata?.score ?? r.score ?? 0.5),
          });
        }
        await this.delay(400);
      } catch (error: any) {
        console.error(`  ❌ AxixOS search failed for "${query}":`, error?.message);
        errors.push(error?.message || 'unknown error');
      }
    }

    if (all.length === 0 && errors.length > 0) {
      throw new Error(`All AxixOS searches failed: ${errors[0]}`);
    }
    const sorted = all.sort((a, b) => b.relevanceScore - a.relevanceScore).slice(0, maxResults);
    console.log(`  ✅ AxixOS found ${sorted.length} unique competitors`);
    return sorted;
  }

  /**
   * Deep-read a competitor's site for pricing content via the crawler. Returns
   * the full page text (title + meta + body) for the OpenAI extractor, or '' so
   * the pipeline can fall back to a direct scrape.
   */
  async searchCompetitorPricing(websiteUrl: string, businessName: string): Promise<string> {
    if (!websiteUrl) return '';
    try {
      const data = await this.post('/v1/crawl/page', { url: websiteUrl }, 90000);
      const parts = [data?.title, data?.metaDescription, data?.h1, data?.text].filter(Boolean);
      return parts.join('\n\n');
    } catch (error: any) {
      console.error(`  ❌ AxixOS crawl failed for ${businessName}:`, error?.message);
      return '';
    }
  }

  // ── Helpers (self-contained; mirror TavilySearchService) ──────────────────
  private buildSearchQueries(location: string, services: string[]): string[] {
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
    const queries: string[] = [`Fotograf ${location} Preise Pakete`];
    for (const service of services) {
      const terms = serviceTermsDE[service.toLowerCase()] || [service];
      queries.push(`${terms[0]} ${location} Preise`);
    }
    return queries.slice(0, 4);
  }

  private extractDomain(url: string): string {
    try { return new URL(url).hostname.replace('www.', ''); } catch { return url; }
  }

  private deriveBusinessName(title: string, url: string): string {
    const cleaned = (title || '')
      .replace(/\s*[-–—|:▷⇒]\s*.*$/, '')
      .replace(/\s*\(.*?\)\s*/g, '')
      .replace(/Fotograf(ie|in)?|Photography|Studio/gi, '')
      .trim();
    const generic = /^(preise?|angebot|leistungen|informationen|pakete|kosten|home|startseite|fotoshooting|familienfotos?|portrait|kontakt|über uns|about)\b/i;
    if (cleaned && cleaned.length >= 3 && !generic.test(cleaned)) return cleaned;
    try {
      const base = new URL(url).hostname.replace(/^www\./, '').split('.')[0];
      return base.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()).trim() || cleaned || title;
    } catch { return cleaned || title; }
  }

  private isIrrelevantSite(domain: string): boolean {
    const irrelevant = [
      'facebook.com', 'instagram.com', 'pinterest.com', 'youtube.com', 'linkedin.com',
      'twitter.com', 'tiktok.com', 'yelp.com', 'tripadvisor.com', 'wikipedia.org',
      'amazon.', 'ebay.', 'herold.at', 'gelbeseiten.', 'wko.at', 'firmenabc.at',
      'kununu.com', 'karriere.at', 'willhaben.at', 'google.com', 'maps.google.',
      'newagefotografie.com', 'newagefotografie.at',
    ];
    return irrelevant.some((s) => domain.includes(s));
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
