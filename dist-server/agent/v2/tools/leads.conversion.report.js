"use strict";
/**
 * CRM Leads Conversion Report Tool
 * Tier 1: Low-risk read-only tool
 *
 * Calculate conversion rates and analyze lead sources
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
    startDate: zod_1.z.string().optional().describe("Start date for analysis (YYYY-MM-DD)"),
    endDate: zod_1.z.string().optional().describe("End date for analysis (YYYY-MM-DD)"),
    groupBy: zod_1.z.enum(["source", "priority", "month"]).default("source").optional().describe("Group conversion data by field")
});
// Tool definition
const def = {
    name: "leads_conversion_report",
    description: `Generate conversion rate analysis for leads.
  
Use this to answer questions like:
- "What's our conversion rate by lead source?"
- "Which marketing channel converts best?"
- "How do Instagram leads compare to Google Ads?"
- "What's our monthly lead conversion trend?"
- "Which lead sources have the highest ROI?"

Returns: Detailed conversion statistics by source, priority, or time period`,
    parameters: params,
    authz: ["CRM_READ"],
    risk: "low",
    handler: async (ctx, args) => {
        try {
            // Build date filter
            const whereClauses = [];
            const queryParams = [];
            let paramIndex = 1;
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
            // Determine grouping
            let groupByField = 'source';
            let groupByLabel = 'Source';
            if (args.groupBy === 'priority') {
                groupByField = 'priority';
                groupByLabel = 'Priority';
            }
            else if (args.groupBy === 'month') {
                groupByField = "TO_CHAR(created_at, 'YYYY-MM')";
                groupByLabel = 'Month';
            }
            // Conversion analysis query
            const query = `
        SELECT 
          ${groupByField} as group_name,
          COUNT(*) as total_leads,
          COUNT(*) FILTER (WHERE status = 'new') as new_count,
          COUNT(*) FILTER (WHERE status = 'contacted') as contacted_count,
          COUNT(*) FILTER (WHERE status = 'qualified') as qualified_count,
          COUNT(*) FILTER (WHERE status = 'converted') as converted_count,
          COUNT(*) FILTER (WHERE status = 'lost') as lost_count,
          ROUND(
            (COUNT(*) FILTER (WHERE status = 'converted')::numeric / NULLIF(COUNT(*)::numeric, 0) * 100), 
            2
          ) as conversion_rate,
          ROUND(
            (COUNT(*) FILTER (WHERE status = 'qualified')::numeric / NULLIF(COUNT(*)::numeric, 0) * 100), 
            2
          ) as qualification_rate,
          ROUND(
            (COUNT(*) FILTER (WHERE status = 'lost')::numeric / NULLIF(COUNT(*)::numeric, 0) * 100), 
            2
          ) as loss_rate,
          SUM(COALESCE(value::numeric, 0)) as total_value,
          SUM(COALESCE(value::numeric, 0)) FILTER (WHERE status = 'converted') as converted_value,
          ROUND(
            AVG(COALESCE(value::numeric, 0)) FILTER (WHERE status = 'converted'),
            2
          ) as avg_deal_size
        FROM crm_leads
        ${whereClause}
        GROUP BY ${groupByField}
        ORDER BY conversion_rate DESC NULLS LAST, total_leads DESC
      `;
            const result = await pool.query(query, queryParams);
            // Overall statistics
            const totalQuery = `
        SELECT 
          COUNT(*) as total_leads,
          COUNT(*) FILTER (WHERE status = 'converted') as total_converted,
          COUNT(*) FILTER (WHERE status = 'lost') as total_lost,
          ROUND(
            (COUNT(*) FILTER (WHERE status = 'converted')::numeric / NULLIF(COUNT(*)::numeric, 0) * 100), 
            2
          ) as overall_conversion_rate,
          SUM(COALESCE(value::numeric, 0)) FILTER (WHERE status = 'converted') as total_revenue
        FROM crm_leads
        ${whereClause}
      `;
            const totalResult = await pool.query(totalQuery, queryParams);
            const totals = totalResult.rows[0];
            const breakdown = result.rows.map((row) => ({
                group: row.group_name || 'Unknown',
                statistics: {
                    total_leads: parseInt(row.total_leads),
                    new: parseInt(row.new_count),
                    contacted: parseInt(row.contacted_count),
                    qualified: parseInt(row.qualified_count),
                    converted: parseInt(row.converted_count),
                    lost: parseInt(row.lost_count)
                },
                rates: {
                    conversion_rate: parseFloat(row.conversion_rate || 0),
                    qualification_rate: parseFloat(row.qualification_rate || 0),
                    loss_rate: parseFloat(row.loss_rate || 0)
                },
                financials: {
                    total_potential_value: parseFloat(row.total_value || 0),
                    converted_value: parseFloat(row.converted_value || 0),
                    avg_deal_size: parseFloat(row.avg_deal_size || 0),
                    currency: "EUR"
                }
            }));
            // Find best and worst performers
            const sorted = [...breakdown].sort((a, b) => b.rates.conversion_rate - a.rates.conversion_rate);
            return {
                summary: {
                    period: args.startDate || args.endDate
                        ? `${args.startDate || 'beginning'} to ${args.endDate || 'now'}`
                        : "all time",
                    grouped_by: groupByLabel,
                    total_leads: parseInt(totals.total_leads),
                    total_converted: parseInt(totals.total_converted),
                    total_lost: parseInt(totals.total_lost),
                    overall_conversion_rate: parseFloat(totals.overall_conversion_rate || 0),
                    total_revenue: parseFloat(totals.total_revenue || 0),
                    currency: "EUR"
                },
                insights: {
                    best_performer: sorted[0]?.group || "N/A",
                    best_conversion_rate: sorted[0]?.rates.conversion_rate || 0,
                    worst_performer: sorted[sorted.length - 1]?.group || "N/A",
                    worst_conversion_rate: sorted[sorted.length - 1]?.rates.conversion_rate || 0,
                    total_groups: breakdown.length
                },
                breakdown: breakdown
            };
        }
        catch (error) {
            console.error("❌ Leads conversion report error:", error);
            throw new Error(`Failed to generate conversion report: ${error.message}`);
        }
    }
};
// Register the tool
(0, ToolBus_1.registerTool)(def);
exports.default = def;
