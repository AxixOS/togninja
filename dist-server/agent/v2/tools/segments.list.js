"use strict";
/**
 * Email Segments List Tool
 * Tier 1: Low-risk read-only tool
 *
 * List email subscriber segments
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
    isActive: zod_1.z.boolean().optional().describe("Filter by active status"),
    search: zod_1.z.string().optional().describe("Search in segment name or description"),
    limit: zod_1.z.number().int().min(1).max(100).default(50).optional().describe("Maximum number of segments to return")
});
const def = {
    name: "segments_list",
    description: `List email subscriber segments for targeted campaigns.
  
Use this to answer questions like:
- "What email segments do we have?"
- "Show me subscriber segments"
- "Which segments have the most subscribers?"
- "List active segments"

Returns: List of email segments with subscriber counts`,
    parameters: params,
    authz: ["EMAIL_READ"],
    risk: "low",
    handler: async (ctx, args) => {
        try {
            const whereClauses = [];
            const queryParams = [];
            let paramIndex = 1;
            if (args.isActive !== undefined) {
                whereClauses.push(`is_active = $${paramIndex}`);
                queryParams.push(args.isActive);
                paramIndex++;
            }
            if (args.search) {
                whereClauses.push(`(name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`);
                queryParams.push(`%${args.search}%`);
                paramIndex++;
            }
            const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
            const query = `
        SELECT 
          id, name, description, conditions, subscriber_count,
          is_active, created_at, updated_at
        FROM email_segments
        ${whereClause}
        ORDER BY subscriber_count DESC, created_at DESC
        LIMIT $${paramIndex}
      `;
            queryParams.push(args.limit || 50);
            const result = await pool.query(query, queryParams);
            const summaryQuery = `
        SELECT 
          COUNT(*) as total_count,
          COUNT(*) FILTER (WHERE is_active = true) as active_count,
          COUNT(*) FILTER (WHERE is_active = false) as inactive_count,
          SUM(subscriber_count) as total_subscribers,
          AVG(subscriber_count) as avg_subscribers
        FROM email_segments
        ${whereClause}
      `;
            const summaryResult = await pool.query(summaryQuery, queryParams.slice(0, -1));
            const summary = summaryResult.rows[0];
            const segments = result.rows.map((row) => ({
                id: row.id,
                name: row.name,
                description: row.description || "—",
                conditions: row.conditions,
                subscriber_count: parseInt(row.subscriber_count || 0),
                is_active: row.is_active,
                created_at: row.created_at,
                updated_at: row.updated_at
            }));
            return {
                summary: {
                    total_segments: parseInt(summary.total_count),
                    active: parseInt(summary.active_count),
                    inactive: parseInt(summary.inactive_count),
                    total_subscribers_in_segments: parseInt(summary.total_subscribers || 0),
                    avg_subscribers_per_segment: Math.round(parseFloat(summary.avg_subscribers || 0)),
                    returned: segments.length
                },
                filters: {
                    is_active: args.isActive !== undefined ? args.isActive : "any",
                    search: args.search || "none"
                },
                segments: segments
            };
        }
        catch (error) {
            console.error("❌ Segments list error:", error);
            throw new Error(`Failed to list segments: ${error.message}`);
        }
    }
};
(0, ToolBus_1.registerTool)(def);
exports.default = def;
