import { getJson } from "serpapi";
import PQueue from "p-queue";

// Rate limit to 60 requests per minute for free tier
const queue = new PQueue({ interval: 60000, intervalCap: 60 });

/**
 * Search Google using SerpAPI with rate limiting
 */
export async function serpSearch(q: string) {
  if (!process.env.SERP_API_KEY) {
    console.warn('SERP_API_KEY not configured, returning mock data');
    return {
      organic_results: [
        {
          title: 'Mock Result - Configure SERP_API_KEY',
          link: 'https://example.com',
          snippet: 'This is a mock result. Please configure SERP_API_KEY for real search results.'
        }
      ]
    };
  }

  return queue.add(() =>
    getJson({
      api_key: process.env.SERP_API_KEY,
      engine: "google",
      q,
      gl: "at", // Austria
      hl: "de", // German
      num: 10
    })
  );
}

/**
 * Fetch business reviews using SerpAPI or RapidAPI
 */
export async function fetchReviews(business: string): Promise<string[]> {
  try {
    // Try SerpAPI first
    const res = await serpSearch(`${business} reviews site:google.com OR site:yelp.com OR site:trustpilot.com`);
    const snippets = res?.organic_results?.map((r: any) => r.snippet).filter(Boolean).slice(0, 10) || [];
    
    if (snippets.length > 0) {
      return snippets;
    }

    // Fallback to RapidAPI Google Reviews if available
    if (process.env.RAPID_GOOGLE_REVIEWS_KEY) {
      return await fetchGoogleReviews(business);
    }

    return [];
  } catch (error) {
    console.error('Error fetching reviews:', error);
    return [];
  }
}

/**
 * Fetch Google Reviews using RapidAPI
 */
async function fetchGoogleReviews(business: string): Promise<string[]> {
  try {
    const response = await fetch('https://google-map-places-new-v2.p.rapidapi.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-FieldMask': 'places.displayName,places.reviews',
        'x-rapidapi-host': 'google-map-places-new-v2.p.rapidapi.com',
        'x-rapidapi-key': process.env.RAPID_GOOGLE_REVIEWS_KEY || ''
      },
      body: JSON.stringify({
        textQuery: business,
        locationBias: {
          circle: {
            center: { latitude: 48.2082, longitude: 16.3738 }, // Vienna coordinates
            radius: 10000
          }
        },
        languageCode: 'de',
        regionCode: 'AT'
      })
    });

    if (!response.ok) {
      throw new Error(`RapidAPI error: ${response.status}`);
    }

    const data = await response.json();
    const reviews = data.places?.[0]?.reviews || [];
    
    return reviews.map((review: any) => review.text?.text || '').filter(Boolean).slice(0, 10);
  } catch (error) {
    console.error('Error fetching Google Reviews via RapidAPI:', error);
    return [];
  }
}