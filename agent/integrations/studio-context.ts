import { neon } from "../../server/db-compat.js";
import { getWebsiteProfile } from "./website-profile";

const sql = neon(process.env.DATABASE_URL!);

/**
 * Gather latest profile + SEO intel and store on studios.context_json
 */
export async function rebuildStudioContext(studioId: string) {
  console.log(`Rebuilding studio context for: ${studioId}`);
  
  try {
    // Get latest website profile
    const websiteProfile = await getWebsiteProfile(studioId);
    
    // Get latest SEO intelligence
    const seoResults = await sql`
      SELECT extracted_keywords 
      FROM seo_intel
      WHERE studio_id = ${studioId}
      ORDER BY created_at DESC 
      LIMIT 1
    `;
    
    const seoIntel = seoResults[0];
    
    // Build context object
    const context = {
      brand_title: websiteProfile?.profile_json?.title || "New Age Fotografie",
      brand_description: websiteProfile?.profile_json?.description || "Professional Photography Studio in Vienna",
      brand_colors: websiteProfile?.profile_json?.colors || [],
      main_content: websiteProfile?.profile_json?.main_text?.substring(0, 500) || "",
      top_keywords: seoIntel?.extracted_keywords || [],
      last_refresh: new Date().toISOString(),
      performance_score: websiteProfile?.lighthouse_json?.performance?.score || 0
    };

    // Update studio context
    await sql`
      UPDATE studios 
      SET context_json = ${JSON.stringify(context)}
      WHERE id = ${studioId}
    `;

    console.log('Studio context rebuilt successfully');
    return context;
  } catch (error) {
    console.error('Error rebuilding studio context:', error);
    throw error;
  }
}

/**
 * Get cached studio context
 */
export async function getStudioContext(studioId: string) {
  try {
    const results = await sql`
      SELECT context_json 
      FROM studios 
      WHERE id = ${studioId}
    `;
    
    return results[0]?.context_json || {};
  } catch (error) {
    console.error('Error getting studio context:', error);
    return {};
  }
}

/**
 * Get comprehensive studio intelligence summary
 */
export async function getStudioIntelligenceSummary(studioId: string) {
  try {
    const [context, recentSEO, websiteProfile] = await Promise.all([
      getStudioContext(studioId),
      sql`SELECT * FROM seo_intel WHERE studio_id = ${studioId} ORDER BY created_at DESC LIMIT 5`,
      getWebsiteProfile(studioId)
    ]);

    return {
      brand_context: context,
      recent_seo_queries: recentSEO.map(r => ({
        query: r.query,
        keywords: r.extracted_keywords,
        date: r.created_at
      })),
      website_analysis: {
        title: websiteProfile?.profile_json?.title,
        description: websiteProfile?.profile_json?.description,
        performance: websiteProfile?.lighthouse_json?.performance?.score,
        last_analyzed: websiteProfile?.created_at
      }
    };
  } catch (error) {
    console.error('Error getting studio intelligence summary:', error);
    return null;
  }
}