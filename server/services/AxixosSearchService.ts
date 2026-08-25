import { config } from '../config-reader';
import { ownDomains, isIrrelevantSite } from '../lib/competitorFilter';
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

/**
 * Where and in what language should a competitor search run?
 *
 * This used to be hardcoded: country 'AT', language 'de', and a query builder that spoke
 * only German — "Fotograf ${location} Preise Pakete". A studio in Shreveport searching for
 * Shreveport therefore asked an Austrian index, in German, for "Fotograf Shreveport Preise
 * Pakete", and was told there were no photographers in their city.
 *
 * COUNTRY IS OMITTED UNLESS IT IS KNOWN. Sending the wrong country filter is far worse than
 * sending none — the search engine infers locale from the query text perfectly well, and a
 * studio researching a market they are not based in (a destination wedding photographer, a
 * studio opening a second city) must not be forced into their home index.
 */
const ISO_BY_COUNTRY: Record<string, string> = {
  'austria': 'AT', 'österreich': 'AT', 'osterreich': 'AT',
  'germany': 'DE', 'deutschland': 'DE',
  'switzerland': 'CH', 'schweiz': 'CH',
  'united states': 'US', 'usa': 'US', 'united states of america': 'US', 'us': 'US',
  'united kingdom': 'GB', 'uk': 'GB', 'great britain': 'GB', 'england': 'GB',
  'ireland': 'IE', 'canada': 'CA', 'australia': 'AU', 'new zealand': 'NZ',
  'france': 'FR', 'spain': 'ES', 'italy': 'IT', 'netherlands': 'NL', 'belgium': 'BE',
};

export interface SearchLocale {
  language: 'de' | 'en';
  /** ISO-3166 alpha-2, or null when it is not known — in which case no filter is sent. */
  country: string | null;
  /** The studio's own city, for probes and prompts that need a real place name. */
  city: string;
}

export async function searchLocale(): Promise<SearchLocale> {
  const lang = String((await config.get('site_language')) || 'en').toLowerCase().slice(0, 2);
  const countryName = String((await config.get('studio_country')) || '').trim().toLowerCase();
  return {
    language: lang === 'de' ? 'de' : 'en',
    country: ISO_BY_COUNTRY[countryName] || null,
    city: String((await config.get('studio_city')) || '').trim(),
  };
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
    const locale = await searchLocale();
    const queries = this.buildSearchQueries(location, services, locale.language);
    // The studio own site is not a competitor. Resolved per tenant rather than hardcoded:
    // the exclusion list named the ORIGIN studio's domain, so every studio built from this
    // image hid that one site and none of them hid their own.
    const own = await ownDomains();
    const all: CompetitorSearchResult[] = [];
    const seenDomains = new Set<string>();
    const errors: string[] = [];

    for (const query of queries) {
      try {
        const perQuery = Math.ceil(maxResults / queries.length) + 2;
        const data = await this.post('/v1/search/web', {
          query,
          limit: perQuery,
          // Omitted entirely when the studio country is not known. See searchLocale().
          ...(locale.country ? { country: locale.country } : {}),
          language: locale.language,
        });
        const results: any[] = data?.results || [];
        for (const r of results) {
          const website = r.url || r.link || '';
          if (!website) continue;
          const domain = this.extractDomain(website);
          if (seenDomains.has(domain) || isIrrelevantSite(domain, own)) continue;
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
  /**
   * Read one page as plain text, with a caller-chosen deadline.
   *
   * searchCompetitorPricing() hardcodes 90 seconds, which is right for a research job
   * running in the background and wrong for the onboarding crawl, where somebody is
   * watching the screen. Same endpoint, same shape, the wait is the caller's to choose.
   */
  async readPageText(url: string, timeoutMs = 30000): Promise<string> {
    if (!url) return '';
    try {
      const data = await this.post('/v1/crawl/page', { url }, timeoutMs);
      return [data?.title, data?.metaDescription, data?.h1, data?.text].filter(Boolean).join('\n\n');
    } catch (error: any) {
      console.warn(`  AxixOS page read failed for ${url}:`, error?.message);
      return '';
    }
  }

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
  private buildSearchQueries(location: string, services: string[], language: 'de' | 'en' = 'en'): string[] {
    const serviceTermsEN: Record<string, string[]> = {
      'family': ['family photographer', 'family photography'],
      'family portrait': ['family photographer', 'family portrait photography'],
      'portrait': ['portrait photographer', 'portrait photography'],
      'portrait photography': ['portrait photographer', 'portrait photography'],
      'wedding': ['wedding photographer', 'wedding photography'],
      'wedding photography': ['wedding photographer', 'wedding photography'],
      'newborn': ['newborn photographer', 'baby photographer'],
      'newborn photography': ['newborn photographer', 'newborn photography'],
      'corporate': ['corporate photographer', 'business headshot photographer'],
      'corporate photography': ['corporate photographer', 'commercial photography'],
      'event': ['event photographer', 'event photography'],
      'event photography': ['event photographer', 'event photography'],
    };
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
    const queries: string[] = [
      de ? `Fotograf ${location} Preise Pakete` : `photographer ${location} pricing packages`,
    ];
    for (const service of services) {
      const terms = map[service.toLowerCase()] || [service];
      queries.push(de ? `${terms[0]} ${location} Preise` : `${terms[0]} ${location} prices`);
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

  /** This studio own domains — never its own competitor. */
  // ownDomains() and isIrrelevantSite() now live in ../lib/competitorFilter so the Tavily
  // path cannot drift from this one again — it already had, in two ways that mattered.

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
