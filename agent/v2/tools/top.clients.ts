/**
 * Top Clients Analysis Tool
 * Tier 1: Low-risk read-only tool
 * 
 * Identify highest spending and most valuable clients
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
  metric: z.enum(["revenue", "transactions", "lifetime_value", "recency"]).default("revenue").describe("How to rank clients"),
  limit: z.number().int().min(1).max(100).default(20).optional().describe("Number of top clients to return"),
  startDate: z.string().optional().describe("Only count activity after this date (YYYY-MM-DD)"),
  endDate: z.string().optional().describe("Only count activity before this date (YYYY-MM-DD)"),
  minRevenue: z.number().optional().describe("Minimum revenue threshold")
});

// Tool definition
const def: ToolDef<typeof params> = {
  name: "top_clients",
  description: `Identify and rank top clients by various metrics.
  
Use this to answer questions like:
- "Who are our top 10 clients by revenue?"
- "Show me our most valuable customers"
- "Which clients have made the most purchases?"
- "Who are our VIP clients?"
- "List clients who spent over €1000"
- "Show me our most recent active clients"

Returns: Ranked list of top clients with detailed metrics`,
  parameters: params,
  authz: ["CRM_READ"],
  risk: "low",
  handler: async (ctx: ToolContext, args: z.infer<typeof params>) => {
    try {
      // Build date filter for activity
      const activityWhere: string[] = [];
      const queryParams: any[] = [];
      let paramIndex = 1;

      if (args.startDate) {
        activityWhere.push(`created_at >= $${paramIndex}`);
        queryParams.push(args.startDate);
        paramIndex++;
      }

      if (args.endDate) {
        activityWhere.push(`created_at <= $${paramIndex}`);
        queryParams.push(args.endDate);
        paramIndex++;
      }

      const activityWhereClause = activityWhere.length > 0 
        ? `AND ${activityWhere.join(' AND ')}` 
        : '';

      // Determine ordering
      const orderByMap: Record<string, string> = {
        revenue: "total_revenue DESC",
        transactions: "transaction_count DESC",
        lifetime_value: "c.lifetime_value DESC NULLS LAST",
        recency: "last_activity DESC"
      };
      const orderBy = orderByMap[args.metric] || orderByMap.revenue;

      // Build comprehensive client query with revenue from both invoices and vouchers
      const query = `
        WITH client_invoices AS (
          SELECT 
            client_id,
            SUM(total) FILTER (WHERE status = 'paid') as invoice_revenue,
            COUNT(*) FILTER (WHERE status = 'paid') as invoice_count,
            MAX(issue_date) as last_invoice_date
          FROM crm_invoices
          WHERE 1=1 ${activityWhereClause}
          GROUP BY client_id
        ),
        client_vouchers AS (
          SELECT 
            c.id as client_id,
            SUM(vs.final_amount::numeric) FILTER (WHERE vs.payment_status = 'paid') as voucher_revenue,
            COUNT(*) FILTER (WHERE vs.payment_status = 'paid') as voucher_count,
            MAX(vs.created_at) as last_voucher_date
          FROM crm_clients c
          LEFT JOIN voucher_sales vs ON (
            LOWER(c.email) = LOWER(vs.purchaser_email) OR 
            LOWER(c.email) = LOWER(vs.recipient_email)
          )
          WHERE vs.id IS NOT NULL ${activityWhereClause}
          GROUP BY c.id
        )
        SELECT 
          c.id,
          c.client_id,
          c.first_name,
          c.last_name,
          c.first_name || ' ' || c.last_name as full_name,
          c.email,
          c.phone,
          c.company,
          c.city,
          c.country,
          c.status,
          c.lifetime_value,
          c.created_at as client_since,
          c.last_session_date,
          
          COALESCE(ci.invoice_revenue, 0) + COALESCE(cv.voucher_revenue, 0) as total_revenue,
          COALESCE(ci.invoice_count, 0) + COALESCE(cv.voucher_count, 0) as transaction_count,
          COALESCE(ci.invoice_revenue, 0) as invoice_revenue,
          COALESCE(cv.voucher_revenue, 0) as voucher_revenue,
          COALESCE(ci.invoice_count, 0) as invoice_count,
          COALESCE(cv.voucher_count, 0) as voucher_count,
          
          GREATEST(ci.last_invoice_date, cv.last_voucher_date, c.last_session_date) as last_activity,
          
          CASE 
            WHEN GREATEST(ci.last_invoice_date, cv.last_voucher_date, c.last_session_date) >= CURRENT_DATE - INTERVAL '30 days' THEN 'active'
            WHEN GREATEST(ci.last_invoice_date, cv.last_voucher_date, c.last_session_date) >= CURRENT_DATE - INTERVAL '90 days' THEN 'recent'
            WHEN GREATEST(ci.last_invoice_date, cv.last_voucher_date, c.last_session_date) >= CURRENT_DATE - INTERVAL '180 days' THEN 'inactive'
            ELSE 'dormant'
          END as activity_status
          
        FROM crm_clients c
        LEFT JOIN client_invoices ci ON c.id = ci.client_id
        LEFT JOIN client_vouchers cv ON c.id = cv.client_id
        WHERE 
          (COALESCE(ci.invoice_revenue, 0) + COALESCE(cv.voucher_revenue, 0)) >= $${paramIndex}
        ORDER BY ${orderBy}
        LIMIT $${paramIndex + 1}
      `;

      queryParams.push(args.minRevenue || 0);
      queryParams.push(args.limit || 20);

      const result = await pool.query(query, queryParams);

      const clients = result.rows.map((row: any, index: number) => ({
        rank: index + 1,
        client: {
          id: row.id,
          client_id: row.client_id,
          name: row.full_name,
          email: row.email,
          phone: row.phone || "—",
          company: row.company || "—",
          location: row.city && row.country 
            ? `${row.city}, ${row.country}` 
            : row.city || row.country || "—",
          status: row.status,
          client_since: row.client_since
        },
        metrics: {
          total_revenue: parseFloat(row.total_revenue || 0),
          invoice_revenue: parseFloat(row.invoice_revenue || 0),
          voucher_revenue: parseFloat(row.voucher_revenue || 0),
          lifetime_value: parseFloat(row.lifetime_value || 0),
          transaction_count: parseInt(row.transaction_count || 0),
          invoice_count: parseInt(row.invoice_count || 0),
          voucher_count: parseInt(row.voucher_count || 0),
          avg_transaction_value: parseInt(row.transaction_count) > 0 
            ? parseFloat(row.total_revenue || 0) / parseInt(row.transaction_count)
            : 0,
          currency: "EUR"
        },
        activity: {
          last_activity: row.last_activity,
          last_session: row.last_session_date,
          status: row.activity_status,
          days_since_activity: row.last_activity 
            ? Math.floor((new Date().getTime() - new Date(row.last_activity).getTime()) / (1000 * 60 * 60 * 24))
            : null
        }
      }));

      // Calculate summary statistics
      const totalRevenue = clients.reduce((sum, c) => sum + c.metrics.total_revenue, 0);
      const avgRevenue = clients.length > 0 ? totalRevenue / clients.length : 0;
      const totalTransactions = clients.reduce((sum, c) => sum + c.metrics.transaction_count, 0);

      // Activity breakdown
      const activityBreakdown = {
        active: clients.filter(c => c.activity.status === 'active').length,
        recent: clients.filter(c => c.activity.status === 'recent').length,
        inactive: clients.filter(c => c.activity.status === 'inactive').length,
        dormant: clients.filter(c => c.activity.status === 'dormant').length
      };

      return {
        summary: {
          ranked_by: args.metric,
          date_range: args.startDate || args.endDate 
            ? `${args.startDate || 'beginning'} to ${args.endDate || 'now'}` 
            : "all time",
          total_clients: clients.length,
          total_revenue: totalRevenue,
          average_revenue: avgRevenue,
          total_transactions: totalTransactions,
          min_revenue_filter: args.minRevenue || 0,
          currency: "EUR"
        },

        activity_breakdown: activityBreakdown,

        insights: {
          top_client: clients[0] ? {
            name: clients[0].client.name,
            revenue: clients[0].metrics.total_revenue
          } : null,
          
          top_spender_percentage: clients[0] && totalRevenue > 0
            ? Math.round((clients[0].metrics.total_revenue / totalRevenue) * 10000) / 100
            : 0,
          
          top_3_percentage: totalRevenue > 0
            ? Math.round((clients.slice(0, 3).reduce((sum, c) => sum + c.metrics.total_revenue, 0) / totalRevenue) * 10000) / 100
            : 0
        },

        clients: clients
      };

    } catch (error: any) {
      console.error("❌ Top clients error:", error);
      throw new Error(`Failed to analyze top clients: ${error.message}`);
    }
  }
};

// Register the tool
registerTool(def);

export default def;
