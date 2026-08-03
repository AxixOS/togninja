/**
 * Client Acquisition Analysis Tool
 * Tier 1: Low-risk read-only tool
 * 
 * Track new client acquisition over time
 */

import { z } from "zod";
import { registerTool } from "../core/ToolBus";
import { ToolDef, ToolContext } from "../core/Types";
import pkg from 'pg';
const { Pool } = pkg;

// Create pool connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('neon.tech') ? { rejectUnauthorized: false } : undefined
});

// Zod schema for parameter validation
const params = z.object({
  period: z.enum(["day", "week", "month", "quarter", "year"]).default("month").describe("Time period for grouping"),
  startDate: z.string().optional().describe("Start date for analysis (YYYY-MM-DD)"),
  endDate: z.string().optional().describe("End date for analysis (YYYY-MM-DD)"),
  includeSource: z.boolean().default(false).optional().describe("Include breakdown by acquisition source")
});

// Tool definition
const def: ToolDef<typeof params> = {
  name: "client_acquisition",
  description: `Track and analyze new client acquisition over time.
  
Use this to answer questions like:
- "How many new clients did we get this month?"
- "What's our client growth trend?"
- "Show me new client acquisition by month"
- "How many clients signed up last quarter?"
- "What's our monthly client acquisition rate?"
- "Where are our new clients coming from?"

Returns: Time-series data showing new client acquisition with trends`,
  parameters: params,
  authz: ["CRM_READ"],
  risk: "low",
  handler: async (ctx: ToolContext, args: z.infer<typeof params>) => {
    try {
      // Build date filter
      const whereClauses: string[] = [];
      const queryParams: any[] = [];
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

      // Determine date grouping format
      const dateFormats: Record<string, string> = {
        day: "YYYY-MM-DD",
        week: "IYYY-IW",
        month: "YYYY-MM",
        quarter: "YYYY-Q",
        year: "YYYY"
      };
      const dateFormat = dateFormats[args.period];

      // Main acquisition query
      const query = `
        SELECT 
          TO_CHAR(created_at, '${dateFormat}') as period,
          COUNT(*) as new_clients,
          COUNT(*) FILTER (WHERE status = 'active') as active_count,
          SUM(COALESCE(lifetime_value::numeric, 0)) as total_lifetime_value,
          AVG(COALESCE(lifetime_value::numeric, 0)) as avg_lifetime_value
        FROM crm_clients
        ${whereClause}
        GROUP BY TO_CHAR(created_at, '${dateFormat}')
        ORDER BY period DESC
        LIMIT 100
      `;

      const result = await pool.query(query, queryParams);

      const periods = result.rows.map((row: any) => ({
        period: row.period,
        new_clients: parseInt(row.new_clients),
        active_clients: parseInt(row.active_count),
        total_lifetime_value: parseFloat(row.total_lifetime_value || 0),
        avg_lifetime_value: parseFloat(row.avg_lifetime_value || 0),
        currency: "EUR"
      }));

      // Calculate totals
      const totalNewClients = periods.reduce((sum, p) => sum + p.new_clients, 0);
      const totalValue = periods.reduce((sum, p) => sum + p.total_lifetime_value, 0);
      const avgPerPeriod = periods.length > 0 ? totalNewClients / periods.length : 0;

      // Calculate growth trend
      let growth = null;
      if (periods.length >= 2) {
        const current = periods[0].new_clients;
        const previous = periods[1].new_clients;
        if (previous > 0) {
          growth = {
            current_period: current,
            previous_period: previous,
            change: current - previous,
            percentage: ((current - previous) / previous) * 100,
            direction: current > previous ? "up" : current < previous ? "down" : "flat"
          };
        }
      }

      const response: any = {
        summary: {
          time_period: args.period,
          date_range: args.startDate || args.endDate 
            ? `${args.startDate || 'beginning'} to ${args.endDate || 'now'}` 
            : "all time",
          total_periods: periods.length,
          total_new_clients: totalNewClients,
          average_per_period: Math.round(avgPerPeriod * 10) / 10,
          total_lifetime_value: totalValue,
          currency: "EUR"
        },

        trend: growth,

        best_period: periods.length > 0 
          ? [...periods].sort((a, b) => b.new_clients - a.new_clients)[0]
          : null,

        periods: periods
      };

      // Optional: Include source breakdown
      if (args.includeSource) {
        // Get acquisition sources from leads that converted
        const sourceQuery = `
          SELECT 
            TO_CHAR(c.created_at, '${dateFormat}') as period,
            COALESCE(l.source, 'Direct/Unknown') as source,
            COUNT(DISTINCT c.id) as client_count
          FROM crm_clients c
          LEFT JOIN crm_leads l ON LOWER(c.email) = LOWER(l.email)
          ${whereClause}
          GROUP BY TO_CHAR(c.created_at, '${dateFormat}'), l.source
          ORDER BY period DESC, client_count DESC
        `;

        const sourceResult = await pool.query(sourceQuery, queryParams);
        
        // Group by period
        const sourcesByPeriod: Record<string, any[]> = {};
        sourceResult.rows.forEach((row: any) => {
          if (!sourcesByPeriod[row.period]) {
            sourcesByPeriod[row.period] = [];
          }
          sourcesByPeriod[row.period].push({
            source: row.source,
            count: parseInt(row.client_count)
          });
        });

        response.acquisition_sources = sourcesByPeriod;

        // Overall source summary
        const overallSourceQuery = `
          SELECT 
            COALESCE(l.source, 'Direct/Unknown') as source,
            COUNT(DISTINCT c.id) as total_clients,
            ROUND(
              (COUNT(DISTINCT c.id)::numeric / (SELECT COUNT(*) FROM crm_clients ${whereClause})::numeric * 100),
              2
            ) as percentage
          FROM crm_clients c
          LEFT JOIN crm_leads l ON LOWER(c.email) = LOWER(l.email)
          ${whereClause}
          GROUP BY l.source
          ORDER BY total_clients DESC
        `;

        const overallSourceResult = await pool.query(overallSourceQuery, queryParams);
        
        response.source_summary = overallSourceResult.rows.map((row: any) => ({
          source: row.source,
          total_clients: parseInt(row.total_clients),
          percentage: parseFloat(row.percentage || 0)
        }));
      }

      return response;

    } catch (error: any) {
      console.error("❌ Client acquisition error:", error);
      throw new Error(`Failed to analyze client acquisition: ${error.message}`);
    }
  }
};

// Register the tool
registerTool(def);

export default def;
