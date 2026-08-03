"use strict";
/**
 * CRM Leads Query Tool
 * Tier 1: Low-risk read-only tool
 *
 * Query and filter leads from CRM
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const zod_1 = require("zod");
const ToolBus_1 = require("../core/ToolBus");
const pg_1 = __importDefault(require("pg"));
const { Pool } = pg_1.default;
// Create pool connection
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('neon.tech') ? { rejectUnauthorized: false } : undefined
});
// Zod schema for parameter validation
const params = zod_1.z.object({
    source: zod_1.z.string().optional().describe("Filter by lead source (e.g., 'Google Ads', 'Instagram', 'Referral')"),
    status: zod_1.z.enum(["new", "contacted", "qualified", "converted", "lost", "any"]).default("any").optional().describe("Filter by lead status"),
    startDate: zod_1.z.string().optional().describe("Filter leads created after this date (YYYY-MM-DD)"),
    endDate: zod_1.z.string().optional().describe("Filter leads created before this date (YYYY-MM-DD)"),
    priority: zod_1.z.enum(["low", "medium", "high", "any"]).default("any").optional().describe("Filter by priority level"),
    limit: zod_1.z.number().int().min(1).max(500).default(100).optional().describe("Maximum number of leads to return")
});
// Tool definition
const def = {
    name: "leads_query",
    description: `Query and filter leads from the CRM system.
  
Use this to answer questions like:
- "Show me all new leads from this week"
- "How many leads came from Instagram?"
- "List all high-priority leads that haven't been contacted"
- "Show me leads from Google Ads in October"
- "What leads do we have from referrals?"

Returns: Filtered list of leads with detailed information`,
    parameters: params,
    authz: ["CRM_READ"],
    risk: "low",
    handler: async (ctx, args) => {
        try {
            // Build WHERE clauses
            const whereClauses = [];
            const queryParams = [];
            let paramIndex = 1;
            if (args.source) {
                whereClauses.push(`LOWER(source) LIKE LOWER($${paramIndex})`);
                queryParams.push(`%${args.source}%`);
                paramIndex++;
            }
            if (args.status && args.status !== "any") {
                whereClauses.push(`status = $${paramIndex}`);
                queryParams.push(args.status);
                paramIndex++;
            }
            if (args.priority && args.priority !== "any") {
                whereClauses.push(`priority = $${paramIndex}`);
                queryParams.push(args.priority);
                paramIndex++;
            }
            if (args.startDate) {
                whereClauses.push(`created_at >= $${paramIndex}`);
                queryParams.push(args.startDate);
                paramIndex++;
            }
            if (args.endDate) {
                whereClauses.push(`created_at <= $${paramIndex}`);
                queryParams.push(args.endDate);
                paramIndex++;
            }
            const whereClause = whereClauses.length > 0
                ? `WHERE ${whereClauses.join(' AND ')}`
                : '';
            // Main query
            const query = `
        SELECT 
          id,
          name,
          email,
          phone,
          company,
          message,
          source,
          status,
          priority,
          tags,
          follow_up_date,
          value,
          assigned_to,
          created_at,
          updated_at
        FROM crm_leads
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${paramIndex}
      `;
            queryParams.push(args.limit || 100);
            const result = await pool.query(query, queryParams);
            // Count query for statistics
            const countQuery = `
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'new') as new_count,
          COUNT(*) FILTER (WHERE status = 'contacted') as contacted_count,
          COUNT(*) FILTER (WHERE status = 'qualified') as qualified_count,
          COUNT(*) FILTER (WHERE status = 'converted') as converted_count,
          COUNT(*) FILTER (WHERE status = 'lost') as lost_count,
          SUM(COALESCE(value::numeric, 0)) as total_value
        FROM crm_leads
        ${whereClause}
      `;
            const countResult = await pool.query(countQuery, queryParams.slice(0, -1));
            const stats = countResult.rows[0];
            const leads = result.rows.map((row) => ({
                id: row.id,
                name: row.name,
                email: row.email,
                phone: row.phone || "—",
                company: row.company || "—",
                message: row.message || "—",
                source: row.source || "Unknown",
                status: row.status,
                priority: row.priority,
                tags: row.tags || [],
                follow_up_date: row.follow_up_date || null,
                estimated_value: parseFloat(row.value || 0),
                assigned_to: row.assigned_to || null,
                created_at: row.created_at,
                updated_at: row.updated_at
            }));
            return {
                summary: {
                    total_leads: parseInt(stats.total),
                    new: parseInt(stats.new_count),
                    contacted: parseInt(stats.contacted_count),
                    qualified: parseInt(stats.qualified_count),
                    converted: parseInt(stats.converted_count),
                    lost: parseInt(stats.lost_count),
                    total_estimated_value: parseFloat(stats.total_value || 0),
                    currency: "EUR",
                    returned: leads.length
                },
                filters: {
                    source: args.source || "any",
                    status: args.status || "any",
                    priority: args.priority || "any",
                    date_range: args.startDate || args.endDate
                        ? `${args.startDate || 'beginning'} to ${args.endDate || 'now'}`
                        : "all time"
                },
                leads: leads
            };
        }
        catch (error) {
            console.error("❌ Leads query error:", error);
            throw new Error(`Failed to query leads: ${error.message}`);
        }
    }
};
// Register the tool
(0, ToolBus_1.registerTool)(def);
exports.default = def;
