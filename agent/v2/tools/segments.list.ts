/**
 * Email Segments List Tool
 * Tier 1: Low-risk read-only tool
 * 
 * List email subscriber segments
 */

import { z } from "zod";
import { registerTool } from "../core/ToolBus";
import { ToolDef, ToolContext } from "../core/Types";
import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('neon.tech') ? { rejectUnauthorized: false } : undefined
});

const params = z.object({
  isActive: z.boolean().optional().describe("Filter by active status"),
  search: z.string().optional().describe("Search in segment name or description"),
  limit: z.number().int().min(1).max(100).default(50).optional().describe("Maximum number of segments to return")
});

const def: ToolDef<typeof params> = {
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
  handler: async (ctx: ToolContext, args: z.infer<typeof params>) => {
    try {
      const whereClauses: string[] = [];
      const queryParams: any[] = [];
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

      const segments = result.rows.map((row: any) => ({
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
    } catch (error: any) {
      console.error("❌ Segments list error:", error);
      throw new Error(`Failed to list segments: ${error.message}`);
    }
  }
};

registerTool(def);
export default def;
