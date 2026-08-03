/**
 * CRM Payments Query Tool
 * Tier 1: Low-risk read-only tool
 * 
 * Query invoice payments from CRM
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
  invoiceId: z.string().optional().describe("Filter payments for a specific invoice ID"),
  invoiceNumber: z.string().optional().describe("Filter payments for a specific invoice number"),
  paymentMethod: z.enum(["bank_transfer", "cash", "credit_card", "paypal", "stripe", "any"]).default("any").optional().describe("Filter by payment method"),
  startDate: z.string().optional().describe("Filter payments after this date (YYYY-MM-DD)"),
  endDate: z.string().optional().describe("Filter payments before this date (YYYY-MM-DD)"),
  minAmount: z.number().optional().describe("Minimum payment amount"),
  maxAmount: z.number().optional().describe("Maximum payment amount"),
  limit: z.number().int().min(1).max(500).default(100).optional().describe("Maximum number of payments to return")
});

// Tool definition
const def: ToolDef<typeof params> = {
  name: "payments_query",
  description: `Query invoice payments from the CRM system.
  
Use this to answer questions like:
- "Show me all payments from this month"
- "What payments were made by bank transfer?"
- "List payments for invoice #INV-2024-001"
- "How much was paid via credit card last week?"
- "Show me payments over €500"
- "What payments did we receive today?"

Returns: List of payments with invoice and client details`,
  parameters: params,
  authz: ["PAYMENT_READ"],
  risk: "low",
  handler: async (ctx: ToolContext, args: z.infer<typeof params>) => {
    try {
      // Build WHERE clauses
      const whereClauses: string[] = [];
      const queryParams: any[] = [];
      let paramIndex = 1;

      if (args.invoiceId) {
        whereClauses.push(`p.invoice_id = $${paramIndex}`);
        queryParams.push(args.invoiceId);
        paramIndex++;
      }

      if (args.invoiceNumber) {
        whereClauses.push(`i.invoice_number = $${paramIndex}`);
        queryParams.push(args.invoiceNumber);
        paramIndex++;
      }

      if (args.paymentMethod && args.paymentMethod !== "any") {
        whereClauses.push(`p.payment_method = $${paramIndex}`);
        queryParams.push(args.paymentMethod);
        paramIndex++;
      }

      if (args.startDate) {
        whereClauses.push(`p.payment_date >= $${paramIndex}::date`);
        queryParams.push(args.startDate);
        paramIndex++;
      }

      if (args.endDate) {
        whereClauses.push(`p.payment_date <= $${paramIndex}::date`);
        queryParams.push(args.endDate);
        paramIndex++;
      }

      if (args.minAmount !== undefined) {
        whereClauses.push(`p.amount::numeric >= $${paramIndex}`);
        queryParams.push(args.minAmount);
        paramIndex++;
      }

      if (args.maxAmount !== undefined) {
        whereClauses.push(`p.amount::numeric <= $${paramIndex}`);
        queryParams.push(args.maxAmount);
        paramIndex++;
      }

      const whereClause = whereClauses.length > 0 
        ? `WHERE ${whereClauses.join(' AND ')}` 
        : '';

      // Main query with invoice and client join
      const query = `
        SELECT 
          p.id,
          p.invoice_id,
          i.invoice_number,
          i.client_id,
          c.first_name || ' ' || c.last_name as client_name,
          c.email as client_email,
          p.amount,
          p.payment_method,
          p.payment_reference,
          p.payment_date,
          p.notes,
          p.created_at
        FROM crm_invoice_payments p
        JOIN crm_invoices i ON p.invoice_id = i.id
        LEFT JOIN crm_clients c ON i.client_id = c.id
        ${whereClause}
        ORDER BY p.payment_date DESC
        LIMIT $${paramIndex}
      `;

      queryParams.push(args.limit || 100);

      const result = await pool.query(query, queryParams);

      // Summary statistics
      const summaryQuery = `
        SELECT 
          COUNT(*) as total_payments,
          COUNT(DISTINCT p.invoice_id) as distinct_invoices,
          SUM(p.amount::numeric) as total_amount,
          AVG(p.amount::numeric) as avg_amount,
          COUNT(*) FILTER (WHERE p.payment_method = 'bank_transfer') as bank_transfer_count,
          SUM(p.amount::numeric) FILTER (WHERE p.payment_method = 'bank_transfer') as bank_transfer_amount,
          COUNT(*) FILTER (WHERE p.payment_method = 'cash') as cash_count,
          SUM(p.amount::numeric) FILTER (WHERE p.payment_method = 'cash') as cash_amount,
          COUNT(*) FILTER (WHERE p.payment_method = 'credit_card') as credit_card_count,
          SUM(p.amount::numeric) FILTER (WHERE p.payment_method = 'credit_card') as credit_card_amount,
          COUNT(*) FILTER (WHERE p.payment_method = 'paypal') as paypal_count,
          SUM(p.amount::numeric) FILTER (WHERE p.payment_method = 'paypal') as paypal_amount,
          COUNT(*) FILTER (WHERE p.payment_method = 'stripe') as stripe_count,
          SUM(p.amount::numeric) FILTER (WHERE p.payment_method = 'stripe') as stripe_amount
        FROM crm_invoice_payments p
        JOIN crm_invoices i ON p.invoice_id = i.id
        ${whereClause}
      `;

      const summaryResult = await pool.query(summaryQuery, queryParams.slice(0, -1));
      const summary = summaryResult.rows[0];

      const payments = result.rows.map((row: any) => ({
        id: row.id,
        invoice: {
          id: row.invoice_id,
          number: row.invoice_number,
          client: {
            id: row.client_id,
            name: row.client_name || "Unknown",
            email: row.client_email || "—"
          }
        },
        amount: parseFloat(row.amount),
        currency: "EUR",
        payment_method: row.payment_method,
        payment_reference: row.payment_reference || "—",
        payment_date: row.payment_date,
        notes: row.notes || "—",
        created_at: row.created_at
      }));

      return {
        summary: {
          total_payments: parseInt(summary.total_payments),
          distinct_invoices: parseInt(summary.distinct_invoices),
          total_amount: parseFloat(summary.total_amount || 0),
          avg_amount: parseFloat(summary.avg_amount || 0),
          currency: "EUR",
          by_method: {
            bank_transfer: {
              count: parseInt(summary.bank_transfer_count || 0),
              amount: parseFloat(summary.bank_transfer_amount || 0)
            },
            cash: {
              count: parseInt(summary.cash_count || 0),
              amount: parseFloat(summary.cash_amount || 0)
            },
            credit_card: {
              count: parseInt(summary.credit_card_count || 0),
              amount: parseFloat(summary.credit_card_amount || 0)
            },
            paypal: {
              count: parseInt(summary.paypal_count || 0),
              amount: parseFloat(summary.paypal_amount || 0)
            },
            stripe: {
              count: parseInt(summary.stripe_count || 0),
              amount: parseFloat(summary.stripe_amount || 0)
            }
          },
          returned: payments.length
        },
        filters: {
          invoice_id: args.invoiceId || "any",
          invoice_number: args.invoiceNumber || "any",
          payment_method: args.paymentMethod || "any",
          date_range: args.startDate || args.endDate 
            ? `${args.startDate || 'beginning'} to ${args.endDate || 'now'}` 
            : "all time",
          amount_range: args.minAmount || args.maxAmount 
            ? `€${args.minAmount || 0} - €${args.maxAmount || '∞'}` 
            : "any"
        },
        payments: payments
      };

    } catch (error: any) {
      console.error("❌ Payments query error:", error);
      throw new Error(`Failed to query payments: ${error.message}`);
    }
  }
};

// Register the tool
registerTool(def);

export default def;
