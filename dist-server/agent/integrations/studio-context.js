"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rebuildStudioContext = rebuildStudioContext;
exports.getStudioContext = getStudioContext;
exports.getStudioIntelligenceSummary = getStudioIntelligenceSummary;
const serverless_1 = require("@neondatabase/serverless");
const website_profile_1 = require("./website-profile");
const sql = (0, serverless_1.neon)(process.env.DATABASE_URL);
/**
 * Gather latest profile + SEO intel and store on studios.context_json
 */
async function rebuildStudioContext(studioId) {
    console.log(`Rebuilding studio context for: ${studioId}`);
    try {
        // Get latest website profile
        const websiteProfile = await (0, website_profile_1.getWebsiteProfile)(studioId);
        // Get latest SEO intelligence
        const seoResults = await sql `
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
        await sql `
      UPDATE studios 
      SET context_json = ${JSON.stringify(context)}
      WHERE id = ${studioId}
    `;
        console.log('Studio context rebuilt successfully');
        return context;
    }
    catch (error) {
        console.error('Error rebuilding studio context:', error);
        throw error;
    }
}
/**
 * Get cached studio context
 */
async function getStudioContext(studioId) {
    try {
        const results = await sql `
      SELECT context_json 
      FROM studios 
      WHERE id = ${studioId}
    `;
        return results[0]?.context_json || {};
    }
    catch (error) {
        console.error('Error getting studio context:', error);
        return {};
    }
}
/**
 * Get comprehensive studio intelligence summary
 */
async function getStudioIntelligenceSummary(studioId) {
    try {
        const [context, recentSEO, websiteProfile] = await Promise.all([
            getStudioContext(studioId),
            sql `SELECT * FROM seo_intel WHERE studio_id = ${studioId} ORDER BY created_at DESC LIMIT 5`,
            (0, website_profile_1.getWebsiteProfile)(studioId)
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
    }
    catch (error) {
        console.error('Error getting studio intelligence summary:', error);
        return null;
    }
}
