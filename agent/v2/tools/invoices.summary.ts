/**
 * CRM Invoices Summary Tool
 * Tier 1: Low-risk read-only tool
 * 
 * Generate revenue and invoice statistics
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
  startDate: z.string().optional().describe("Start date for summary (YYYY-MM-DD)"),
  endDate: z.string().optional().describe("End date for summary (YYYY-MM-DD)"),
  includeDetails: z.boolean().default(false).optional().describe("Include detailed breakdown by client")
});

// Tool definition
const def: ToolDef<typeof params> = {
  name: "invoices_summary",
  description: `Generate comprehensive invoice and revenue summary.
  
Use this to answer questions like:
- "What's our total revenue this month?"
- "How much money is outstanding?"
- "What's our collection rate?"
- "Show me revenue breakdown by status"
- "How much is overdue?"
- "What's our average invoice amount?"

Returns: Complete financial summary with revenue, outstanding, and payment statistics`,
  parameters: params,
  authz: ["INV_READ"],
  risk: "low",
  handler: async (ctx: ToolContext, args: z.infer<typeof params>) => {
    try {
      // Build date filter
      const whereClauses: string[] = [];
      const queryParams: any[] = [];
      let paramIndex = 1;

      if (args.startDate) {
        whereClauses.push(`issue_date >= $${paramIndex}`);
        queryParams.push(args.startDate);
        paramIndex++;
      }

      if (args.endDate) {
        whereClauses.push(`issue_date <= $${paramIndex}`);
        queryParams.push(args.endDate);
        paramIndex++;
      }

      const whereClause = whereClauses.length > 0 
        ? `WHERE ${whereClauses.join(' AND ')}` 
        : '';

      // Main summary query
      const summaryQuery = `
        SELECT 
          COUNT(*) as total_invoices,
          COUNT(*) FILTER (WHERE status = 'draft') as draft_count,
          COUNT(*) FILTER (WHERE status = 'sent') as sent_count,
          COUNT(*) FILTER (WHERE status = 'paid') as paid_count,
          COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_count,
          COUNT(*) FILTER (WHERE status != 'paid' AND status != 'cancelled' AND due_date < CURRENT_DATE) as overdue_count,
          
          SUM(total::numeric) as total_billed,
          SUM(total::numeric) FILTER (WHERE status = 'paid') as total_paid,
          SUM(total::numeric) FILTER (WHERE status != 'paid' AND status != 'cancelled') as total_outstanding,
          SUM(total::numeric) FILTER (WHERE status != 'paid' AND status != 'cancelled' AND due_date < CURRENT_DATE) as total_overdue,
          SUM(total::numeric) FILTER (WHERE status = 'draft') as draft_amount,
          SUM(total::numeric) FILTER (WHERE status = 'sent') as sent_amount,
          
          AVG(total::numeric) as avg_invoice_amount,
          AVG(total::numeric) FILTER (WHERE status = 'paid') as avg_paid_amount,
          
          MIN(total::numeric) as min_invoice,
          MAX(total::numeric) as max_invoice,
          
          ROUND(
            (SUM(total::numeric) FILTER (WHERE status = 'paid')::numeric / 
             NULLIF(SUM(total::numeric) FILTER (WHERE status != 'cancelled')::numeric, 0) * 100),
            2
          ) as collection_rate,
          
          COUNT(DISTINCT client_id) as unique_clients
        FROM crm_invoices
        ${whereClause}
      `;

      const summaryResult = await pool.query(summaryQuery, queryParams);
      const stats = summaryResult.rows[0];

      // Age analysis of outstanding invoices
      const agingQuery = `
        SELECT 
          COUNT(*) FILTER (WHERE days_overdue = 0) as current_count,
          COUNT(*) FILTER (WHERE days_overdue BETWEEN 1 AND 30) as overdue_1_30_count,
          COUNT(*) FILTER (WHERE days_overdue BETWEEN 31 AND 60) as overdue_31_60_count,
          COUNT(*) FILTER (WHERE days_overdue BETWEEN 61 AND 90) as overdue_61_90_count,
          COUNT(*) FILTER (WHERE days_overdue > 90) as overdue_90plus_count,
          
          SUM(total::numeric) FILTER (WHERE days_overdue = 0) as current_amount,
          SUM(total::numeric) FILTER (WHERE days_overdue BETWEEN 1 AND 30) as overdue_1_30_amount,
          SUM(total::numeric) FILTER (WHERE days_overdue BETWEEN 31 AND 60) as overdue_31_60_amount,
          SUM(total::numeric) FILTER (WHERE days_overdue BETWEEN 61 AND 90) as overdue_61_90_amount,
          SUM(total::numeric) FILTER (WHERE days_overdue > 90) as overdue_90plus_amount
        FROM (
          SELECT 
            total,
            CASE 
              WHEN status = 'paid' THEN -1
              WHEN due_date >= CURRENT_DATE THEN 0
              ELSE (CURRENT_DATE - due_date)
            END as days_overdue
          FROM crm_invoices
          ${whereClause}
        ) AS aged_invoices
        WHERE days_overdue >= 0
      `;

      const agingResult = await pool.query(agingQuery, queryParams);
      const aging = agingResult.rows[0];

      const result: any = {
        period: args.startDate || args.endDate 
          ? `${args.startDate || 'beginning'} to ${args.endDate || 'now'}` 
          : "all time",
        
        overview: {
          total_invoices: parseInt(stats.total_invoices),
          unique_clients: parseInt(stats.unique_clients),
          total_billed: parseFloat(stats.total_billed || 0),
          total_paid: parseFloat(stats.total_paid || 0),
          total_outstanding: parseFloat(stats.total_outstanding || 0),
          total_overdue: parseFloat(stats.total_overdue || 0),
          collection_rate: parseFloat(stats.collection_rate || 0),
          currency: "EUR"
        },

        by_status: {
          draft: {
            count: parseInt(stats.draft_count),
            amount: parseFloat(stats.draft_amount || 0)
          },
          sent: {
            count: parseInt(stats.sent_count),
            amount: parseFloat(stats.sent_amount || 0)
          },
          paid: {
            count: parseInt(stats.paid_count),
            amount: parseFloat(stats.total_paid || 0)
          },
          overdue: {
            count: parseInt(stats.overdue_count),
            amount: parseFloat(stats.total_overdue || 0)
          },
          cancelled: {
            count: parseInt(stats.cancelled_count)
          }
        },

        aging_analysis: {
          current: {
            count: parseInt(aging.current_count || 0),
            amount: parseFloat(aging.current_amount || 0),
            description: "Not yet due"
          },
          overdue_1_30_days: {
            count: parseInt(aging.overdue_1_30_count || 0),
            amount: parseFloat(aging.overdue_1_30_amount || 0),
            description: "1-30 days overdue"
          },
          overdue_31_60_days: {
            count: parseInt(aging.overdue_31_60_count || 0),
            amount: parseFloat(aging.overdue_31_60_amount || 0),
            description: "31-60 days overdue"
          },
          overdue_61_90_days: {
            count: parseInt(aging.overdue_61_90_count || 0),
            amount: parseFloat(aging.overdue_61_90_amount || 0),
            description: "61-90 days overdue"
          },
          overdue_90plus_days: {
            count: parseInt(aging.overdue_90plus_count || 0),
            amount: parseFloat(aging.overdue_90plus_amount || 0),
            description: "Over 90 days overdue"
          }
        },

        statistics: {
          average_invoice: parseFloat(stats.avg_invoice_amount || 0),
          average_paid_invoice: parseFloat(stats.avg_paid_amount || 0),
          smallest_invoice: parseFloat(stats.min_invoice || 0),
          largest_invoice: parseFloat(stats.max_invoice || 0),
          currency: "EUR"
        }
      };

      // Optional: Include client breakdown
      if (args.includeDetails) {
        const clientQuery = `
          SELECT 
            c.id,
            c.first_name || ' ' || c.last_name as client_name,
            c.email,
            c.company,
            COUNT(i.id) as invoice_count,
            SUM(i.total::numeric) as total_billed,
            SUM(i.total::numeric) FILTER (WHERE i.status = 'paid') as total_paid,
            SUM(i.total::numeric) FILTER (WHERE i.status != 'paid' AND i.status != 'cancelled') as outstanding
          FROM crm_clients c
          JOIN crm_invoices i ON c.id = i.client_id
          ${whereClause}
          GROUP BY c.id, c.first_name, c.last_name, c.email, c.company
          ORDER BY total_billed DESC
          LIMIT 20
        `;

        const clientResult = await pool.query(clientQuery, queryParams);
        
        result.top_clients = clientResult.rows.map((row: any) => ({
          id: row.id,
          name: row.client_name,
          email: row.email,
          company: row.company || "—",
          invoice_count: parseInt(row.invoice_count),
          total_billed: parseFloat(row.total_billed),
          total_paid: parseFloat(row.total_paid || 0),
          outstanding: parseFloat(row.outstanding || 0),
          currency: "EUR"
        }));
      }

      return result;

    } catch (error: any) {
      console.error("❌ Invoices summary error:", error);
      throw new Error(`Failed to generate invoice summary: ${error.message}`);
    }
  }
};

// Register the tool
registerTool(def);

export default def;
