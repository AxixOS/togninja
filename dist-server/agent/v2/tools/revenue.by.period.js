"use strict";
/**
 * Revenue by Period Analysis Tool
 * Tier 1: Low-risk read-only tool
 *
 * Analyze revenue trends over time
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
    period: zod_1.z.enum(["day", "week", "month", "quarter", "year"]).default("month").describe("Time period for grouping"),
    startDate: zod_1.z.string().optional().describe("Start date for analysis (YYYY-MM-DD)"),
    endDate: zod_1.z.string().optional().describe("End date for analysis (YYYY-MM-DD)"),
    source: zod_1.z.enum(["invoices", "vouchers", "both"]).default("both").optional().describe("Revenue source to analyze")
});
// Tool definition
const def = {
    name: "revenue_by_period",
    description: `Analyze revenue trends by time period (daily, weekly, monthly, etc.).
  
Use this to answer questions like:
- "What's our monthly revenue trend?"
- "Show me daily revenue for this week"
- "How does this quarter compare to last quarter?"
- "What was our revenue last month?"
- "Show me revenue growth over the past year"
- "What's our weekly average revenue?"

Returns: Time-series revenue data with trends and comparisons`,
    parameters: params,
    authz: ["INV_READ", "CRM_READ"],
    risk: "low",
    handler: async (ctx, args) => {
        try {
            // Build date filter
            const whereClauses = [];
            const queryParams = [];
            let paramIndex = 1;
            if (args.startDate) {
                whereClauses.push(`tx_date >= $${paramIndex}::date`);
                queryParams.push(args.startDate);
                paramIndex++;
            }
            if (args.endDate) {
                whereClauses.push(`tx_date <= $${paramIndex}::date`);
                queryParams.push(args.endDate);
                paramIndex++;
            }
            const whereClause = whereClauses.length > 0
                ? `WHERE ${whereClauses.join(' AND ')}`
                : '';
            // Determine date grouping format
            const dateFormats = {
                day: "YYYY-MM-DD",
                week: "IYYY-IW",
                month: "YYYY-MM",
                quarter: "YYYY-Q",
                year: "YYYY"
            };
            const dateFormat = dateFormats[args.period];
            // Build combined revenue query
            let revenueQuery = '';
            if (args.source === 'invoices' || args.source === 'both') {
                revenueQuery += `
          SELECT 
            TO_CHAR(issue_date, '${dateFormat}') as period,
            issue_date::date as tx_date,
            SUM(total) FILTER (WHERE status = 'paid') as revenue,
            COUNT(*) FILTER (WHERE status = 'paid') as transaction_count,
            'invoices' as source
          FROM crm_invoices
          GROUP BY TO_CHAR(issue_date, '${dateFormat}'), issue_date::date
        `;
            }
            if (args.source === 'vouchers' || args.source === 'both') {
                if (revenueQuery)
                    revenueQuery += ' UNION ALL ';
                revenueQuery += `
          SELECT 
            TO_CHAR(created_at, '${dateFormat}') as period,
            created_at::date as tx_date,
            SUM(final_amount::numeric) FILTER (WHERE payment_status = 'paid') as revenue,
            COUNT(*) FILTER (WHERE payment_status = 'paid') as transaction_count,
            'vouchers' as source
          FROM voucher_sales
          GROUP BY TO_CHAR(created_at, '${dateFormat}'), created_at::date
        `;
            }
            const query = `
        SELECT 
          period,
          SUM(revenue) as total_revenue,
          SUM(transaction_count) as total_transactions,
          AVG(revenue) as avg_revenue,
          MIN(revenue) as min_revenue,
          MAX(revenue) as max_revenue
        FROM (${revenueQuery}) combined
        ${whereClause}
        GROUP BY period
        ORDER BY period DESC
        LIMIT 100
      `;
            const result = await pool.query(query, queryParams);
            // Calculate totals and trends
            const periods = result.rows.map((row) => ({
                period: row.period,
                revenue: parseFloat(row.total_revenue || 0),
                transactions: parseInt(row.total_transactions || 0),
                average_per_transaction: parseInt(row.total_transactions) > 0
                    ? parseFloat(row.total_revenue || 0) / parseInt(row.total_transactions)
                    : 0,
                currency: "EUR"
            }));
            const totalRevenue = periods.reduce((sum, p) => sum + p.revenue, 0);
            const totalTransactions = periods.reduce((sum, p) => sum + p.transactions, 0);
            const avgPeriodRevenue = periods.length > 0 ? totalRevenue / periods.length : 0;
            // Calculate growth (compare most recent to previous period)
            let growth = null;
            if (periods.length >= 2) {
                const current = periods[0].revenue;
                const previous = periods[1].revenue;
                if (previous > 0) {
                    growth = {
                        amount: current - previous,
                        percentage: ((current - previous) / previous) * 100,
                        direction: current > previous ? "up" : current < previous ? "down" : "flat"
                    };
                }
            }
            // Find peak period
            const peakPeriod = [...periods].sort((a, b) => b.revenue - a.revenue)[0];
            return {
                summary: {
                    time_period: args.period,
                    date_range: args.startDate || args.endDate
                        ? `${args.startDate || 'beginning'} to ${args.endDate || 'now'}`
                        : "all time",
                    source: args.source,
                    total_periods: periods.length,
                    total_revenue: totalRevenue,
                    total_transactions: totalTransactions,
                    average_period_revenue: avgPeriodRevenue,
                    currency: "EUR"
                },
                trend: growth ? {
                    latest_period: periods[0]?.period,
                    latest_revenue: periods[0]?.revenue || 0,
                    previous_period: periods[1]?.period,
                    previous_revenue: periods[1]?.revenue || 0,
                    growth_amount: growth.amount,
                    growth_percentage: Math.round(growth.percentage * 100) / 100,
                    direction: growth.direction
                } : null,
                peak_performance: peakPeriod ? {
                    period: peakPeriod.period,
                    revenue: peakPeriod.revenue,
                    transactions: peakPeriod.transactions
                } : null,
                periods: periods
            };
        }
        catch (error) {
            console.error("❌ Revenue by period error:", error);
            throw new Error(`Failed to analyze revenue by period: ${error.message}`);
        }
    }
};
// Register the tool
(0, ToolBus_1.registerTool)(def);
exports.default = def;
