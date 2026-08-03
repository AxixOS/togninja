"use strict";
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
exports.analyzeKeywordGap = analyzeKeywordGap;
exports.existingBlogH1s = existingBlogH1s;
exports.getRecentSEOIntel = getRecentSEOIntel;
exports.getAllDiscoveredKeywords = getAllDiscoveredKeywords;
const serverless_1 = require("@neondatabase/serverless");
const serp_1 = require("./serp");
const keyword = __importStar(require("keyword-extractor"));
const sql = (0, serverless_1.neon)(process.env.DATABASE_URL);
/**
 * Analyze keyword gaps using SERP data and extract keywords
 */
async function analyzeKeywordGap(studioId, query) {
    console.log(`Analyzing keyword gap for query: ${query}`);
    const serp = await (0, serp_1.serpSearch)(query);
    const textBlobs = serp?.organic_results?.map((r) => r.snippet).join(" ") || "";
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
        await sql `
      INSERT INTO seo_intel (studio_id, query, serp_json, extracted_keywords)
      VALUES (${studioId}, ${query}, ${JSON.stringify(serp)}, ${unique})
    `;
    }
    catch (error) {
        console.error('Error storing SEO intel:', error);
    }
    return { serp, unique };
}
/**
 * Get existing blog post titles/H1s to avoid duplicates
 */
async function existingBlogH1s(studioId) {
    try {
        const results = await sql `
      SELECT title FROM blog_posts 
      WHERE author_id = (SELECT id FROM users LIMIT 1)
    `;
        return results.map((row) => row.title.toLowerCase());
    }
    catch (error) {
        console.error('Error fetching existing blog titles:', error);
        return [];
    }
}
/**
 * Get recent SEO intelligence for a studio
 */
async function getRecentSEOIntel(studioId, limit = 10) {
    try {
        const results = await sql `
      SELECT query, extracted_keywords, created_at
      FROM seo_intel 
      WHERE studio_id = ${studioId}
      ORDER BY created_at DESC
      LIMIT ${limit}
    `;
        return results;
    }
    catch (error) {
        console.error('Error fetching recent SEO intel:', error);
        return [];
    }
}
/**
 * Get all unique keywords discovered for a studio
 */
async function getAllDiscoveredKeywords(studioId) {
    try {
        const results = await sql `
      SELECT DISTINCT unnest(extracted_keywords) as keyword
      FROM seo_intel 
      WHERE studio_id = ${studioId}
      ORDER BY keyword
    `;
        return results.map((row) => row.keyword);
    }
    catch (error) {
        console.error('Error fetching discovered keywords:', error);
        return [];
    }
}
