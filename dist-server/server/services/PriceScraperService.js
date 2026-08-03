"use strict";
/**
 * Price Scraper Service
 *
 * Scrapes competitor websites to extract pricing information for photography services.
 * Uses Cheerio for HTML parsing, regex patterns for price extraction, and LLM fallback.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.PriceScraperService = void 0;
const cheerio = __importStar(require("cheerio"));
class PriceScraperService {
    constructor() {
        this.MAX_RETRIES = 1;
        this.TIMEOUT_MS = 8000; // 8 seconds - fail fast for non-existent URLs
        // Common price patterns for Austrian/German markets
        this.PRICE_PATTERNS = [
            // €500, € 500, EUR 500
            /€\s*(\d{1,5}(?:[.,]\d{2})?)/gi,
            /EUR\s*(\d{1,5}(?:[.,]\d{2})?)/gi,
            // 500€, 500 EUR
            /(\d{1,5}(?:[.,]\d{2})?)\s*(?:€|EUR)/gi,
            // Price: 500, Preis: 500
            /(?:price|preis|kosten):\s*(\d{1,5}(?:[.,]\d{2})?)/gi,
        ];
        // Photography service keywords
        this.SERVICE_KEYWORDS = {
            family: ['familien', 'family', 'familie', 'kinder', 'children'],
            wedding: ['hochzeit', 'wedding', 'braut', 'bride', 'ehe'],
            newborn: ['newborn', 'neugeborene', 'baby', 'babies'],
            portrait: ['portrait', 'porträt', 'einzelperson', 'person'],
            corporate: ['business', 'corporate', 'firma', 'unternehmen'],
            event: ['event', 'veranstaltung', 'party', 'feier'],
        };
    }
    /**
     * Scrape a single competitor website for pricing information
     */
    async scrapeWebsite(url) {
        try {
            console.log(`🔍 Scraping: ${url}`);
            // Fetch the webpage with timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.TIMEOUT_MS);
            const response = await fetch(url, {
                signal: controller.signal,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Accept-Language': 'de-DE,de;q=0.9,en-US;q=0.8,en;q=0.7',
                },
            });
            clearTimeout(timeoutId);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            const html = await response.text();
            const $ = cheerio.load(html);
            // Extract metadata
            const metadata = {
                title: $('title').text().trim() || undefined,
                description: $('meta[name="description"]').attr('content')?.trim() || undefined,
                contactInfo: {
                    email: this.extractEmail(html),
                    phone: this.extractPhone(html),
                },
            };
            // Find pricing pages
            const pricingUrls = this.findPricingPages($, url);
            // Extract prices from current page
            let prices = this.extractPricesFromHTML($, url);
            // If no prices found on main page, try pricing subpages
            if (prices.length === 0 && pricingUrls.length > 0) {
                console.log(`  📄 Found ${pricingUrls.length} pricing pages, checking first one...`);
                const pricingResult = await this.scrapeWebsite(pricingUrls[0]);
                if (pricingResult.success) {
                    prices = pricingResult.prices;
                }
            }
            console.log(`  ✅ Found ${prices.length} prices`);
            return {
                success: true,
                prices,
                metadata,
            };
        }
        catch (error) {
            console.error(`  ❌ Scraping failed: ${error.message}`);
            return {
                success: false,
                prices: [],
                error: error.message,
            };
        }
    }
    /**
     * Extract prices from HTML using multiple strategies
     */
    extractPricesFromHTML($, url) {
        const prices = [];
        // Strategy 1: Look for common pricing class names
        const pricingSelectors = [
            '.price',
            '.pricing',
            '.preis',
            '.package',
            '.paket',
            '[class*="price"]',
            '[class*="pricing"]',
            '[id*="price"]',
            '[id*="pricing"]',
        ];
        pricingSelectors.forEach(selector => {
            $(selector).each((_, element) => {
                const text = $(element).text();
                const extractedPrices = this.extractPricesFromText(text, url);
                prices.push(...extractedPrices);
            });
        });
        // Strategy 2: Scan entire page text for price patterns
        if (prices.length === 0) {
            const bodyText = $('body').text();
            const extractedPrices = this.extractPricesFromText(bodyText, url);
            prices.push(...extractedPrices);
        }
        // Deduplicate and sort by confidence
        return this.deduplicatePrices(prices);
    }
    /**
     * Extract prices from text using regex patterns
     */
    extractPricesFromText(text, url) {
        const prices = [];
        const processedAmounts = new Set();
        this.PRICE_PATTERNS.forEach(pattern => {
            const matches = text.matchAll(pattern);
            for (const match of matches) {
                const amountStr = match[1].replace(',', '.');
                const amount = parseFloat(amountStr);
                // Filter out unrealistic prices
                if (amount < 50 || amount > 10000 || processedAmounts.has(amount)) {
                    continue;
                }
                processedAmounts.add(amount);
                // Determine service type from context
                const context = this.getTextContext(text, match.index || 0, 100);
                const serviceType = this.inferServiceType(context);
                prices.push({
                    serviceType: serviceType || 'general',
                    amount,
                    currency: 'EUR',
                    url,
                    confidence: this.calculateConfidence(context, amount),
                });
            }
        });
        return prices;
    }
    /**
     * Get surrounding text context for better price interpretation
     */
    getTextContext(text, index, radius) {
        const start = Math.max(0, index - radius);
        const end = Math.min(text.length, index + radius);
        return text.substring(start, end);
    }
    /**
     * Infer service type from surrounding text context
     */
    inferServiceType(context) {
        const lowerContext = context.toLowerCase();
        for (const [serviceType, keywords] of Object.entries(this.SERVICE_KEYWORDS)) {
            if (keywords.some(keyword => lowerContext.includes(keyword))) {
                return serviceType;
            }
        }
        return undefined;
    }
    /**
     * Calculate confidence score based on context and price
     */
    calculateConfidence(context, amount) {
        let confidence = 0.5; // Base confidence
        // Higher confidence if we found service keywords
        const lowerContext = context.toLowerCase();
        if (Object.values(this.SERVICE_KEYWORDS).flat().some(kw => lowerContext.includes(kw))) {
            confidence += 0.2;
        }
        // Higher confidence for realistic price ranges
        if (amount >= 100 && amount <= 2000) {
            confidence += 0.2;
        }
        // Higher confidence if duration or deliverables mentioned
        if (/(\d+)\s*(stunde|hour|min|foto|photo)/i.test(context)) {
            confidence += 0.1;
        }
        return Math.min(1.0, confidence);
    }
    /**
     * Find pricing page URLs from navigation/links
     */
    findPricingPages($, baseUrl) {
        const pricingUrls = [];
        const pricingKeywords = ['price', 'pricing', 'preis', 'preise', 'package', 'paket', 'angebot'];
        $('a').each((_, element) => {
            const href = $(element).attr('href');
            const text = $(element).text().toLowerCase();
            if (href && pricingKeywords.some(kw => text.includes(kw) || href.toLowerCase().includes(kw))) {
                try {
                    const absoluteUrl = new URL(href, baseUrl).toString();
                    if (!pricingUrls.includes(absoluteUrl)) {
                        pricingUrls.push(absoluteUrl);
                    }
                }
                catch { }
            }
        });
        return pricingUrls.slice(0, 3); // Limit to 3 pricing pages
    }
    /**
     * Extract email from HTML
     */
    extractEmail(html) {
        const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
        const matches = html.match(emailPattern);
        return matches?.[0];
    }
    /**
     * Extract phone from HTML
     */
    extractPhone(html) {
        // Austrian phone patterns
        const phonePatterns = [
            /\+43\s*\d{1,4}\s*\d{3,10}/g,
            /0\d{3,4}[\s/-]?\d{3,10}/g,
        ];
        for (const pattern of phonePatterns) {
            const matches = html.match(pattern);
            if (matches)
                return matches[0];
        }
        return undefined;
    }
    /**
     * Deduplicate prices and sort by confidence
     */
    deduplicatePrices(prices) {
        const seen = new Map();
        prices.forEach(price => {
            const key = `${price.serviceType}-${price.amount}`;
            const existing = seen.get(key);
            if (!existing || price.confidence > existing.confidence) {
                seen.set(key, price);
            }
        });
        return Array.from(seen.values()).sort((a, b) => b.confidence - a.confidence);
    }
    /**
     * Batch scrape multiple URLs with rate limiting
     */
    async scrapeMultiple(urls, delayMs = 2000) {
        const results = new Map();
        for (const url of urls) {
            const result = await this.scrapeWebsite(url);
            results.set(url, result);
            // Rate limiting delay
            if (delayMs > 0) {
                await new Promise(resolve => setTimeout(resolve, delayMs));
            }
        }
        return results;
    }
}
exports.PriceScraperService = PriceScraperService;
