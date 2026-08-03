"use strict";
/**
 * Lead Sources List Tool
 * Tier 1: Low-risk read-only tool
 *
 * List lead sources with statistics
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
    isActive: zod_1.z.boolean().optional().describe("Filter by active status"),
    withStats: zod_1.z.boolean().default(true).optional().describe("Include lead count statistics for each source")
});
// Tool definition
const def = {
    name: "lead_sources_list",
    description: `List lead sources configured in the CRM, optionally with lead count statistics.
  
Use this to answer questions like:
- "What lead sources do we track?"
- "Where do our leads come from?"
- "Show me all active lead sources"
- "Which lead source brings the most leads?"
- "How many leads came from Instagram?"

Returns: List of lead sources with optional lead statistics`,
    parameters: params,
    authz: ["LEAD_READ"],
    risk: "low",
    handler: async (ctx, args) => {
        try {
            // Build WHERE clauses
            const whereClauses = [];
            const queryParams = [];
            let paramIndex = 1;
            if (args.isActive !== undefined) {
                whereClauses.push(`ls.is_active = $${paramIndex}`);
                queryParams.push(args.isActive);
                paramIndex++;
            }
            const whereClause = whereClauses.length > 0
                ? `WHERE ${whereClauses.join(' AND ')}`
                : '';
            let query;
            if (args.withStats !== false) {
                // Query with lead statistics
                query = `
          SELECT 
            ls.id,
            ls.name,
            ls.is_active,
            ls.sort_order,
            ls.created_at,
            ls.updated_at,
            COUNT(l.id) as total_leads,
            COUNT(l.id) FILTER (WHERE l.status = 'new') as new_leads,
            COUNT(l.id) FILTER (WHERE l.status = 'contacted') as contacted_leads,
            COUNT(l.id) FILTER (WHERE l.status = 'qualified') as qualified_leads,
            COUNT(l.id) FILTER (WHERE l.status = 'converted') as converted_leads,
            COUNT(l.id) FILTER (WHERE l.status = 'lost') as lost_leads,
            COALESCE(SUM(l.value::numeric), 0) as total_value,
            COALESCE(SUM(l.value::numeric) FILTER (WHERE l.status = 'converted'), 0) as converted_value
          FROM lead_sources ls
          LEFT JOIN crm_leads l ON l.source = ls.name
          ${whereClause}
          GROUP BY ls.id
          ORDER BY ls.sort_order ASC, ls.name ASC
        `;
            }
            else {
                // Simple query without statistics
                query = `
          SELECT 
            ls.id,
            ls.name,
            ls.is_active,
            ls.sort_order,
            ls.created_at,
            ls.updated_at
          FROM lead_sources ls
          ${whereClause}
          ORDER BY ls.sort_order ASC, ls.name ASC
        `;
            }
            const result = await pool.query(query, queryParams);
            // Overall summary
            const summaryQuery = `
        SELECT 
          COUNT(*) as total_sources,
          COUNT(*) FILTER (WHERE is_active = true) as active_sources,
          COUNT(*) FILTER (WHERE is_active = false) as inactive_sources
        FROM lead_sources ls
        ${whereClause}
      `;
            const summaryResult = await pool.query(summaryQuery, queryParams);
            const summary = summaryResult.rows[0];
            // Total leads summary
            let leadsSummary = null;
            if (args.withStats !== false) {
                const leadsQuery = `
          SELECT 
            COUNT(*) as total_leads,
            COUNT(*) FILTER (WHERE status = 'converted') as converted_leads,
            COALESCE(SUM(value::numeric), 0) as total_value
          FROM crm_leads
        `;
                const leadsResult = await pool.query(leadsQuery);
                leadsSummary = leadsResult.rows[0];
            }
            const sources = result.rows.map((row) => {
                const base = {
                    id: row.id,
                    name: row.name,
                    is_active: row.is_active,
                    sort_order: row.sort_order,
                    created_at: row.created_at,
                    updated_at: row.updated_at
                };
                if (args.withStats !== false) {
                    const totalLeads = parseInt(row.total_leads);
                    const convertedLeads = parseInt(row.converted_leads);
                    return {
                        ...base,
                        statistics: {
                            total_leads: totalLeads,
                            by_status: {
                                new: parseInt(row.new_leads),
                                contacted: parseInt(row.contacted_leads),
                                qualified: parseInt(row.qualified_leads),
                                converted: convertedLeads,
                                lost: parseInt(row.lost_leads)
                            },
                            conversion_rate: totalLeads > 0
                                ? Math.round((convertedLeads / totalLeads) * 100)
                                : 0,
                            value: {
                                total: parseFloat(row.total_value),
                                converted: parseFloat(row.converted_value),
                                currency: "EUR"
                            }
                        }
                    };
                }
                return base;
            });
            const response = {
                summary: {
                    total_sources: parseInt(summary.total_sources),
                    active: parseInt(summary.active_sources),
                    inactive: parseInt(summary.inactive_sources),
                    returned: sources.length
                },
                filters: {
                    is_active: args.isActive !== undefined ? args.isActive : "any",
                    with_stats: args.withStats !== false
                },
                sources: sources
            };
            if (leadsSummary) {
                response.leads_overview = {
                    total_leads: parseInt(leadsSummary.total_leads),
                    converted_leads: parseInt(leadsSummary.converted_leads),
                    total_value: parseFloat(leadsSummary.total_value || 0),
                    currency: "EUR"
                };
            }
            return response;
        }
        catch (error) {
            console.error("❌ Lead sources list error:", error);
            throw new Error(`Failed to list lead sources: ${error.message}`);
        }
    }
};
// Register the tool
(0, ToolBus_1.registerTool)(def);
exports.default = def;
