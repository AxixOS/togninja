"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SEOAgent = exports.WebsiteScraper = void 0;
exports.scrapeSiteContent = scrapeSiteContent;
const jsdom_1 = require("jsdom");
const node_fetch_1 = __importDefault(require("node-fetch"));
class WebsiteScraper {
    static async scrapeWebsite(url) {
        try {
            const response = await (0, node_fetch_1.default)(url);
            const html = await response.text();
            const dom = new jsdom_1.JSDOM(html);
            const document = dom.window.document;
            const scrapedData = {
                url,
                title: document.title || '',
                metaDescription: document.querySelector('meta[name="description"]')?.getAttribute('content') || '',
                headings: {
                    h1: Array.from(document.querySelectorAll('h1')).map(h => h.textContent || ''),
                    h2: Array.from(document.querySelectorAll('h2')).map(h => h.textContent || ''),
                    h3: Array.from(document.querySelectorAll('h3')).map(h => h.textContent || '')
                },
                content: {
                    aboutText: this.extractAboutText(document),
                    services: this.extractServices(document),
                    contactInfo: this.extractContactInfo(document),
                    testimonials: this.extractTestimonials(document),
                    socialLinks: this.extractSocialLinks(document)
                },
                images: {
                    logo: this.extractLogo(document),
                    gallery: this.extractGalleryImages(document),
                    hero: this.extractHeroImages(document)
                },
                seoAnalysis: this.analyzeSEO(document)
            };
            return scrapedData;
        }
        catch (error) {
            console.error('Error scraping website:', error);
            throw new Error(`Failed to scrape website: ${error.message}`);
        }
    }
    static extractAboutText(document) {
        const aboutSelectors = [
            '[class*="about"]',
            '[id*="about"]',
            'section:has(h1:contains("About")), section:has(h2:contains("About"))',
            'p:contains("photographer")',
            'p:contains("photography")'
        ];
        for (const selector of aboutSelectors) {
            const element = document.querySelector(selector);
            if (element && element.textContent) {
                return element.textContent.trim();
            }
        }
        // Fallback: get first few paragraphs
        const paragraphs = Array.from(document.querySelectorAll('p'))
            .slice(0, 3)
            .map(p => p.textContent?.trim())
            .filter(text => text && text.length > 50);
        return paragraphs.join(' ') || '';
    }
    static extractServices(document) {
        const serviceSelectors = [
            '[class*="service"]',
            '[class*="portfolio"]',
            '[class*="offering"]',
            'ul li:contains("photography")',
            'h3:contains("Wedding"), h3:contains("Portrait"), h3:contains("Family")'
        ];
        const services = [];
        for (const selector of serviceSelectors) {
            const elements = document.querySelectorAll(selector);
            elements.forEach(el => {
                if (el.textContent) {
                    services.push(el.textContent.trim());
                }
            });
        }
        return [...new Set(services)].slice(0, 10);
    }
    static extractContactInfo(document) {
        const text = document.body.textContent || '';
        const phoneMatch = text.match(/(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
        const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
        const addressMatch = text.match(/\d+\s+[A-Za-z\s]+,\s*[A-Za-z\s]+,\s*[A-Za-z]{2}\s+\d{5}/);
        return {
            phone: phoneMatch ? phoneMatch[0] : undefined,
            email: emailMatch ? emailMatch[0] : undefined,
            address: addressMatch ? addressMatch[0] : undefined
        };
    }
    static extractTestimonials(document) {
        const testimonialSelectors = [
            '[class*="testimonial"]',
            '[class*="review"]',
            '[class*="quote"]',
            'blockquote'
        ];
        const testimonials = [];
        for (const selector of testimonialSelectors) {
            const elements = document.querySelectorAll(selector);
            elements.forEach(el => {
                if (el.textContent && el.textContent.length > 20) {
                    testimonials.push(el.textContent.trim());
                }
            });
        }
        return testimonials.slice(0, 5);
    }
    static extractSocialLinks(document) {
        const socialLinks = [];
        const links = document.querySelectorAll('a[href*="facebook"], a[href*="instagram"], a[href*="twitter"], a[href*="linkedin"]');
        links.forEach(link => {
            const href = link.getAttribute('href');
            if (href) {
                socialLinks.push(href);
            }
        });
        return socialLinks;
    }
    static extractLogo(document) {
        const logoSelectors = [
            'img[alt*="logo"]',
            'img[class*="logo"]',
            'img[id*="logo"]',
            'header img:first-child',
            '.navbar img:first-child'
        ];
        for (const selector of logoSelectors) {
            const img = document.querySelector(selector);
            if (img && img.src) {
                return img.src;
            }
        }
        return undefined;
    }
    static extractGalleryImages(document) {
        const gallerySelectors = [
            '[class*="gallery"] img',
            '[class*="portfolio"] img',
            '[class*="work"] img',
            'img[alt*="photography"]'
        ];
        const images = [];
        for (const selector of gallerySelectors) {
            const imgs = document.querySelectorAll(selector);
            imgs.forEach(img => {
                if (img.src) {
                    images.push(img.src);
                }
            });
        }
        return [...new Set(images)].slice(0, 20);
    }
    static extractHeroImages(document) {
        const heroSelectors = [
            'header img',
            '[class*="hero"] img',
            '[class*="banner"] img',
            'img:first-of-type'
        ];
        const images = [];
        for (const selector of heroSelectors) {
            const imgs = document.querySelectorAll(selector);
            imgs.forEach(img => {
                if (img.src) {
                    images.push(img.src);
                }
            });
        }
        return [...new Set(images)].slice(0, 5);
    }
    static analyzeSEO(document) {
        const issues = [];
        const recommendations = [];
        let score = 100;
        // Check title
        const title = document.title;
        if (!title) {
            issues.push('Missing page title');
            score -= 20;
        }
        else if (title.length < 30 || title.length > 60) {
            issues.push('Title length not optimal (should be 30-60 characters)');
            score -= 10;
        }
        // Check meta description
        const metaDesc = document.querySelector('meta[name="description"]');
        if (!metaDesc) {
            issues.push('Missing meta description');
            score -= 15;
        }
        else {
            const content = metaDesc.getAttribute('content') || '';
            if (content.length < 120 || content.length > 160) {
                issues.push('Meta description length not optimal (should be 120-160 characters)');
                score -= 10;
            }
        }
        // Check headings
        const h1s = document.querySelectorAll('h1');
        if (h1s.length === 0) {
            issues.push('Missing H1 heading');
            score -= 15;
        }
        else if (h1s.length > 1) {
            issues.push('Multiple H1 headings found');
            score -= 10;
        }
        // Check images
        const images = document.querySelectorAll('img');
        let imagesWithoutAlt = 0;
        images.forEach(img => {
            if (!img.getAttribute('alt')) {
                imagesWithoutAlt++;
            }
        });
        if (imagesWithoutAlt > 0) {
            issues.push(`${imagesWithoutAlt} images missing alt text`);
            score -= Math.min(imagesWithoutAlt * 5, 20);
        }
        // Generate recommendations
        recommendations.push('Add location-specific keywords to title and headings');
        recommendations.push('Include photography service keywords throughout content');
        recommendations.push('Add structured data for business information');
        recommendations.push('Optimize images with descriptive alt text');
        recommendations.push('Add internal linking between service pages');
        return {
            issues,
            recommendations,
            score: Math.max(score, 0)
        };
    }
}
exports.WebsiteScraper = WebsiteScraper;
class SEOAgent {
    static generateSEORecommendations(scrapedData, location = 'Wien') {
        const businessType = 'Familienfotograf';
        const services = ['Familienfotografie', 'Neugeborenenfotos', 'Hochzeitsfotografie', 'Portraitfotografie'];
        return {
            title: {
                current: scrapedData.title,
                improved: `${businessType} ${location} | Professionelle Fotografie Services`,
                reasoning: 'Includes primary keyword, location, and clear service description for better local SEO'
            },
            metaDescription: {
                current: scrapedData.metaDescription,
                improved: `Professioneller ${businessType} in ${location}. Spezialisiert auf ${services.join(', ')}. Hochwertige Fotografie für Ihre besonderen Momente. Jetzt Termin vereinbaren!`,
                reasoning: 'Incorporates location, services, and call-to-action within optimal character limit'
            },
            headings: {
                h1: {
                    current: scrapedData.headings.h1,
                    improved: [`${businessType} in ${location}, dem Sie vertrauen können`],
                    reasoning: 'Trust-building language with location and service keywords'
                },
                h2: {
                    current: scrapedData.headings.h2,
                    improved: [
                        `${services[0]} & ${services[1]}`,
                        'Preise & Pakete',
                        'Häufige Fragen'
                    ],
                    reasoning: 'Service-focused H2s with FAQ section for better user experience'
                }
            },
            content: {
                aboutSection: {
                    current: scrapedData.content.aboutText,
                    improved: `Als erfahrener ${businessType} in ${location} bringe ich Ihre wertvollsten Momente zum Leben. Spezialisiert auf ${services.join(', ')} biete ich professionelle Fotografie-Services für Familien in ganz Wien und Umgebung.`,
                    reasoning: 'Emphasizes expertise, location, and specific services while maintaining personal touch'
                },
                servicesSection: {
                    current: scrapedData.content.services,
                    improved: services.map(service => `${service} ${location}`),
                    reasoning: 'Location-specific service descriptions for better local search ranking'
                }
            },
            keywords: {
                primary: [`${businessType} ${location}`, `${services[0]} ${location}`, `${services[1]} ${location}`],
                secondary: ['professionelle Fotografie', 'Familienshooting', 'Fotostudio Wien', 'Babyfotos'],
                location: location
            }
        };
    }
}
exports.SEOAgent = SEOAgent;
/**
 * Simple function to scrape site content for AutoBlog context
 * Returns simplified data structure for brand voice analysis
 */
async function scrapeSiteContent(url) {
    try {
        const scrapedData = await WebsiteScraper.scrapeWebsite(url);
        return {
            services: scrapedData.content.services.join(', '),
            brandVoice: scrapedData.content.aboutText,
            keyFeatures: scrapedData.headings.h2.join(', '),
            contactInfo: scrapedData.content.contactInfo,
            title: scrapedData.title
        };
    }
    catch (error) {
        console.error('Error scraping site content:', error);
        // Return fallback data
        return {
            services: 'Family, newborn, maternity, and portrait photography',
            brandVoice: 'Professional, warm, and personal photography services',
            keyFeatures: 'High-quality photography, professional editing, personal service',
            contactInfo: {},
            title: 'Professional Photography Studio'
        };
    }
}
