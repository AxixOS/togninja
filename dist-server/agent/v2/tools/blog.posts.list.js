"use strict";
/**
 * Blog Posts List Tool
 * Tier 1: Low-risk read-only tool
 *
 * List and filter blog posts
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const zod_1 = require("zod");
const ToolBus_1 = require("../core/ToolBus");
const pg_1 = __importDefault(require("pg"));
const { Pool } = pg_1.default;
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('neon.tech') ? { rejectUnauthorized: false } : undefined
});
const params = zod_1.z.object({
    status: zod_1.z.enum(["DRAFT", "PUBLISHED", "SCHEDULED", "any"]).default("any").optional().describe("Filter by post status"),
    published: zod_1.z.boolean().optional().describe("Filter by published state"),
    search: zod_1.z.string().optional().describe("Search in title, content, or tags"),
    hasTag: zod_1.z.string().optional().describe("Filter posts with a specific tag"),
    limit: zod_1.z.number().int().min(1).max(100).default(50).optional().describe("Maximum number of posts to return")
});
const def = {
    name: "blog_posts_list",
    description: `List and filter blog posts from the CMS.
  
Use this to answer questions like:
- "Show me draft blog posts"
- "List published articles"
- "What posts are scheduled?"
- "Search for posts about weddings"
- "Show me posts with tag 'photography tips'"

Returns: List of blog posts with status and metadata`,
    parameters: params,
    authz: ["CONTENT_READ"],
    risk: "low",
    handler: async (ctx, args) => {
        try {
            const whereClauses = [];
            const queryParams = [];
            let paramIndex = 1;
            if (args.status && args.status !== "any") {
                whereClauses.push(`status = $${paramIndex}`);
                queryParams.push(args.status);
                paramIndex++;
            }
            if (args.published !== undefined) {
                whereClauses.push(`published = $${paramIndex}`);
                queryParams.push(args.published);
                paramIndex++;
            }
            if (args.search) {
                whereClauses.push(`(title ILIKE $${paramIndex} OR content ILIKE $${paramIndex} OR excerpt ILIKE $${paramIndex})`);
                queryParams.push(`%${args.search}%`);
                paramIndex++;
            }
            if (args.hasTag) {
                whereClauses.push(`$${paramIndex} = ANY(tags)`);
                queryParams.push(args.hasTag);
                paramIndex++;
            }
            const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
            const query = `
        SELECT 
          id, title, slug, excerpt, image_url,
          published, published_at, scheduled_for, status,
          tags, meta_description, seo_title,
          created_at, updated_at
        FROM blog_posts
        ${whereClause}
        ORDER BY 
          CASE WHEN status = 'SCHEDULED' THEN scheduled_for END ASC,
          created_at DESC
        LIMIT $${paramIndex}
      `;
            queryParams.push(args.limit || 50);
            const result = await pool.query(query, queryParams);
            const summaryQuery = `
        SELECT 
          COUNT(*) as total_count,
          COUNT(*) FILTER (WHERE status = 'DRAFT') as draft_count,
          COUNT(*) FILTER (WHERE status = 'PUBLISHED') as published_count,
          COUNT(*) FILTER (WHERE status = 'SCHEDULED') as scheduled_count,
          COUNT(*) FILTER (WHERE published = true) as live_count
        FROM blog_posts
        ${whereClause}
      `;
            const summaryResult = await pool.query(summaryQuery, queryParams.slice(0, -1));
            const summary = summaryResult.rows[0];
            const posts = result.rows.map((row) => ({
                id: row.id,
                title: row.title,
                slug: row.slug,
                excerpt: row.excerpt || "—",
                image_url: row.image_url,
                status: row.status,
                published: row.published,
                dates: {
                    published_at: row.published_at,
                    scheduled_for: row.scheduled_for,
                    created_at: row.created_at,
                    updated_at: row.updated_at
                },
                tags: row.tags || [],
                seo: {
                    title: row.seo_title || row.title,
                    description: row.meta_description || "—"
                }
            }));
            return {
                summary: {
                    total_posts: parseInt(summary.total_count),
                    by_status: {
                        draft: parseInt(summary.draft_count),
                        published: parseInt(summary.published_count),
                        scheduled: parseInt(summary.scheduled_count)
                    },
                    live_on_site: parseInt(summary.live_count),
                    returned: posts.length
                },
                filters: {
                    status: args.status || "any",
                    published: args.published !== undefined ? args.published : "any",
                    search: args.search || "none",
                    has_tag: args.hasTag || "any"
                },
                posts: posts
            };
        }
        catch (error) {
            console.error("❌ Blog posts list error:", error);
            throw new Error(`Failed to list blog posts: ${error.message}`);
        }
    }
};
(0, ToolBus_1.registerTool)(def);
exports.default = def;
