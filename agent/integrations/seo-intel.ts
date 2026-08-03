import { neon } from "../../server/db-compat.js";
import { serpSearch } from "./serp";
import * as keyword from "keyword-extractor";

const sql = neon(process.env.DATABASE_URL!);

/**
 * Analyze keyword gaps using SERP data and extract keywords
 */
export async function analyzeKeywordGap(studioId: string, query: string) {
  console.log(`Analyzing keyword gap for query: ${query}`);
  
  const serp = await serpSearch(query);
  const textBlobs = serp?.organic_results?.map((r: any) => r.snippet).join(" ") || "";
  
  // Extract German keywords
  const kws = keyword.extract(textBlobs, { 
    language: "german", 
    remove_digits: true,
    return_changed_case: false,
    remove_duplicates: true
  });
  
  const unique = [...new Set(kws)].slice(0, 30);

  // Store in database
  try {
    await sql`
      INSERT INTO seo_intel (studio_id, query, serp_json, extracted_keywords)
      VALUES (${studioId}, ${query}, ${JSON.stringify(serp)}, ${unique})
    `;
  } catch (error) {
    console.error('Error storing SEO intel:', error);
  }

  return { serp, unique };
}

/**
 * Get existing blog post titles/H1s to avoid duplicates
 */
export async function existingBlogH1s(studioId: string): Promise<string[]> {
  try {
    const results = await sql`
      SELECT title FROM blog_posts 
      WHERE author_id = (SELECT id FROM users LIMIT 1)
    `;
    
    return results.map((row: any) => (row.title as string).toLowerCase());
  } catch (error) {
    console.error('Error fetching existing blog titles:', error);
    return [];
  }
}

/**
 * Get recent SEO intelligence for a studio
 */
export async function getRecentSEOIntel(studioId: string, limit: number = 10) {
  try {
    const results = await sql`
      SELECT query, extracted_keywords, created_at
      FROM seo_intel 
      WHERE studio_id = ${studioId}
      ORDER BY created_at DESC
      LIMIT ${limit}
    `;
    
    return results;
  } catch (error) {
    console.error('Error fetching recent SEO intel:', error);
    return [];
  }
}

/**
 * Get all unique keywords discovered for a studio
 */
export async function getAllDiscoveredKeywords(studioId: string): Promise<string[]> {
  try {
    const results = await sql`
      SELECT DISTINCT unnest(extracted_keywords) as keyword
      FROM seo_intel 
      WHERE studio_id = ${studioId}
      ORDER BY keyword
    `;
    
    return results.map((row: any) => row.keyword);
  } catch (error) {
    console.error('Error fetching discovered keywords:', error);
    return [];
  }
}