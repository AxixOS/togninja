import { JSDOM } from 'jsdom';
import fetch from 'node-fetch';

export interface ScrapedWebsiteData {
  url: string;
  title: string;
  metaDescription: string;
  headings: {
    h1: string[];
    h2: string[];
    h3: string[];
  };
  content: {
    aboutText: string;
    services: string[];
    contactInfo: {
      phone?: string;
      email?: string;
      address?: string;
    };
    testimonials: string[];
    socialLinks: string[];
  };
  images: {
    logo?: string;
    gallery: string[];
    hero: string[];
  };
  seoAnalysis: {
    issues: string[];
    recommendations: string[];
    score: number;
  };
}

export interface SEORecommendations {
  title: {
    current: string;
    improved: string;
    reasoning: string;
  };
  metaDescription: {
    current: string;
    improved: string;
    reasoning: string;
  };
  headings: {
    h1: {
      current: string[];
      improved: string[];
      reasoning: string;
    };
    h2: {
      current: string[];
      improved: string[];
      reasoning: string;
    };
  };
  content: {
    aboutSection: {
      current: string;
      improved: string;
      reasoning: string;
    };
    servicesSection: {
      current: string[];
      improved: string[];
      reasoning: string;
    };
  };
  keywords: {
    primary: string[];
    secondary: string[];
    location: string;
  };
}

export class WebsiteScraper {
  
  static async scrapeWebsite(url: string): Promise<ScrapedWebsiteData> {
    try {
      const response = await fetch(url);
      const html = await response.text();
      const dom = new JSDOM(html);
      const document = dom.window.document;

      const scrapedData: ScrapedWebsiteData = {
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
    } catch (error) {
      console.error('Error scraping website:', error);
      throw new Error(`Failed to scrape website: ${error.message}`);
    }
  }

  private static extractAboutText(document: Document): string {
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

  private static extractServices(document: Document): string[] {
    const serviceSelectors = [
      '[class*="service"]',
      '[class*="portfolio"]',
      '[class*="offering"]',
      'ul li:contains("photography")',
      'h3:contains("Wedding"), h3:contains("Portrait"), h3:contains("Family")'
    ];

    const services: string[] = [];
    
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

  private static extractContactInfo(document: Document): { phone?: string; email?: string; address?: string } {
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

  private static extractTestimonials(document: Document): string[] {
    const testimonialSelectors = [
      '[class*="testimonial"]',
      '[class*="review"]',
      '[class*="quote"]',
      'blockquote'
    ];

    const testimonials: string[] = [];
    
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

  private static extractSocialLinks(document: Document): string[] {
    const socialLinks: string[] = [];
    const links = document.querySelectorAll('a[href*="facebook"], a[href*="instagram"], a[href*="twitter"], a[href*="linkedin"]');
    
    links.forEach(link => {
      const href = link.getAttribute('href');
      if (href) {
        socialLinks.push(href);
      }
    });

    return socialLinks;
  }

  private static extractLogo(document: Document): string | undefined {
    const logoSelectors = [
      'img[alt*="logo"]',
      'img[class*="logo"]',
      'img[id*="logo"]',
      'header img:first-child',
      '.navbar img:first-child'
    ];

    for (const selector of logoSelectors) {
      const img = document.querySelector(selector) as HTMLImageElement;
      if (img && img.src) {
        return img.src;
      }
    }

    return undefined;
  }

  private static extractGalleryImages(document: Document): string[] {
    const gallerySelectors = [
      '[class*="gallery"] img',
      '[class*="portfolio"] img',
      '[class*="work"] img',
      'img[alt*="photography"]'
    ];

    const images: string[] = [];
    
    for (const selector of gallerySelectors) {
      const imgs = document.querySelectorAll(selector) as NodeListOf<HTMLImageElement>;
      imgs.forEach(img => {
        if (img.src) {
          images.push(img.src);
        }
      });
    }

    return [...new Set(images)].slice(0, 20);
  }

  private static extractHeroImages(document: Document): string[] {
    const heroSelectors = [
      'header img',
      '[class*="hero"] img',
      '[class*="banner"] img',
      'img:first-of-type'
    ];

    const images: string[] = [];
    
    for (const selector of heroSelectors) {
      const imgs = document.querySelectorAll(selector) as NodeListOf<HTMLImageElement>;
      imgs.forEach(img => {
        if (img.src) {
          images.push(img.src);
        }
      });
    }

    return [...new Set(images)].slice(0, 5);
  }

  private static analyzeSEO(document: Document): { issues: string[]; recommendations: string[]; score: number } {
    const issues: string[] = [];
    const recommendations: string[] = [];
    let score = 100;

    // Check title
    const title = document.title;
    if (!title) {
      issues.push('Missing page title');
      score -= 20;
    } else if (title.length < 30 || title.length > 60) {
      issues.push('Title length not optimal (should be 30-60 characters)');
      score -= 10;
    }

    // Check meta description
    const metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      issues.push('Missing meta description');
      score -= 15;
    } else {
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
    } else if (h1s.length > 1) {
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

export class SEOAgent {
  
  static generateSEORecommendations(scrapedData: ScrapedWebsiteData, location: string = 'Wien'): SEORecommendations {
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

/**
 * Simple function to scrape site content for AutoBlog context
 * Returns simplified data structure for brand voice analysis
 */
export async function scrapeSiteContent(url: string) {
  try {
    const scrapedData = await WebsiteScraper.scrapeWebsite(url);
    
    return {
      services: scrapedData.content.services.join(', '),
      brandVoice: scrapedData.content.aboutText,
      keyFeatures: scrapedData.headings.h2.join(', '),
      contactInfo: scrapedData.content.contactInfo,
      title: scrapedData.title
    };
  } catch (error) {
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