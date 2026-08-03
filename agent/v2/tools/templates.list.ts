/**
 * Email Templates List Tool
 * Tier 1: Low-risk read-only tool
 * 
 * List and filter email templates
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
  category: z.enum(["general", "welcome", "booking", "payment", "gallery", "any"]).default("any").optional().describe("Filter by template category"),
  search: z.string().optional().describe("Search in template name or description"),
  limit: z.number().int().min(1).max(100).default(50).optional().describe("Maximum number of templates to return")
});

const def: ToolDef<typeof params> = {
  name: "templates_list",
  description: `List email templates available for campaigns and workflows.
  
Use this to answer questions like:
- "What email templates do we have?"
- "Show me welcome email templates"
- "List booking confirmation templates"
- "Which templates are used most?"
- "Search for invoice templates"

Returns: List of email templates with usage statistics`,
  parameters: params,
  authz: ["EMAIL_READ"],
  risk: "low",
  handler: async (ctx: ToolContext, args: z.infer<typeof params>) => {
    try {
      const whereClauses: string[] = [];
      const queryParams: any[] = [];
      let paramIndex = 1;

      if (args.category && args.category !== "any") {
        whereClauses.push(`category = $${paramIndex}`);
        queryParams.push(args.category);
        paramIndex++;
      }

      if (args.search) {
        whereClauses.push(`(name ILIKE $${paramIndex} OR description ILIKE $${paramIndex} OR subject ILIKE $${paramIndex})`);
        queryParams.push(`%${args.search}%`);
        paramIndex++;
      }

      const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

      const query = `
        SELECT 
          id, name, category, description, subject, preview_text,
          thumbnail, variables, is_public, usage_count,
          created_at, updated_at
        FROM email_templates
        ${whereClause}
        ORDER BY usage_count DESC, created_at DESC
        LIMIT $${paramIndex}
      `;
      queryParams.push(args.limit || 50);

      const result = await pool.query(query, queryParams);

      const summaryQuery = `
        SELECT 
          COUNT(*) as total_count,
          COUNT(*) FILTER (WHERE category = 'general') as general_count,
          COUNT(*) FILTER (WHERE category = 'welcome') as welcome_count,
          COUNT(*) FILTER (WHERE category = 'booking') as booking_count,
          COUNT(*) FILTER (WHERE category = 'payment') as payment_count,
          COUNT(*) FILTER (WHERE category = 'gallery') as gallery_count,
          SUM(usage_count) as total_usage
        FROM email_templates
        ${whereClause}
      `;
      const summaryResult = await pool.query(summaryQuery, queryParams.slice(0, -1));
      const summary = summaryResult.rows[0];

      const templates = result.rows.map((row: any) => ({
        id: row.id,
        name: row.name,
        category: row.category,
        description: row.description || "—",
        subject: row.subject,
        preview_text: row.preview_text || "—",
        thumbnail: row.thumbnail,
        variables: row.variables || [],
        is_public: row.is_public,
        usage_count: parseInt(row.usage_count || 0),
        created_at: row.created_at,
        updated_at: row.updated_at
      }));

      return {
        summary: {
          total_templates: parseInt(summary.total_count),
          by_category: {
            general: parseInt(summary.general_count),
            welcome: parseInt(summary.welcome_count),
            booking: parseInt(summary.booking_count),
            payment: parseInt(summary.payment_count),
            gallery: parseInt(summary.gallery_count)
          },
          total_usage: parseInt(summary.total_usage || 0),
          returned: templates.length
        },
        filters: {
          category: args.category || "any",
          search: args.search || "none"
        },
        templates: templates
      };
    } catch (error: any) {
      console.error("❌ Templates list error:", error);
      throw new Error(`Failed to list templates: ${error.message}`);
    }
  }
};

registerTool(def);
export default def;
