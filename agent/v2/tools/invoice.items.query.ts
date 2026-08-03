/**
 * CRM Invoice Items Query Tool
 * Tier 1: Low-risk read-only tool
 * 
 * Query invoice line items from CRM
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
  invoiceId: z.string().optional().describe("Get line items for a specific invoice ID"),
  invoiceNumber: z.string().optional().describe("Get line items for a specific invoice number"),
  search: z.string().optional().describe("Search in item descriptions"),
  minPrice: z.number().optional().describe("Minimum unit price"),
  maxPrice: z.number().optional().describe("Maximum unit price"),
  limit: z.number().int().min(1).max(500).default(100).optional().describe("Maximum number of items to return")
});

// Tool definition
const def: ToolDef<typeof params> = {
  name: "invoice_items_query",
  description: `Query invoice line items from the CRM system.
  
Use this to answer questions like:
- "What items are on invoice #INV-2024-001?"
- "Show me the line items for this invoice"
- "What did we charge the client for?"
- "List all invoice items with price over €100"
- "Search for 'portrait' in invoice items"

Returns: List of invoice line items with pricing details`,
  parameters: params,
  authz: ["INV_READ"],
  risk: "low",
  handler: async (ctx: ToolContext, args: z.infer<typeof params>) => {
    try {
      // Build WHERE clauses
      const whereClauses: string[] = [];
      const queryParams: any[] = [];
      let paramIndex = 1;

      if (args.invoiceId) {
        whereClauses.push(`it.invoice_id = $${paramIndex}`);
        queryParams.push(args.invoiceId);
        paramIndex++;
      }

      if (args.invoiceNumber) {
        whereClauses.push(`i.invoice_number = $${paramIndex}`);
        queryParams.push(args.invoiceNumber);
        paramIndex++;
      }

      if (args.search) {
        whereClauses.push(`it.description ILIKE $${paramIndex}`);
        queryParams.push(`%${args.search}%`);
        paramIndex++;
      }

      if (args.minPrice !== undefined) {
        whereClauses.push(`it.unit_price::numeric >= $${paramIndex}`);
        queryParams.push(args.minPrice);
        paramIndex++;
      }

      if (args.maxPrice !== undefined) {
        whereClauses.push(`it.unit_price::numeric <= $${paramIndex}`);
        queryParams.push(args.maxPrice);
        paramIndex++;
      }

      const whereClause = whereClauses.length > 0 
        ? `WHERE ${whereClauses.join(' AND ')}` 
        : '';

      // Main query with invoice join
      const query = `
        SELECT 
          it.id,
          it.invoice_id,
          i.invoice_number,
          i.client_id,
          c.first_name || ' ' || c.last_name as client_name,
          it.description,
          it.quantity,
          it.unit_price,
          it.tax_rate,
          it.sort_order,
          (it.quantity::numeric * it.unit_price::numeric) as line_total,
          (it.quantity::numeric * it.unit_price::numeric * (1 + COALESCE(it.tax_rate::numeric, 0) / 100)) as line_total_with_tax,
          it.created_at
        FROM crm_invoice_items it
        JOIN crm_invoices i ON it.invoice_id = i.id
        LEFT JOIN crm_clients c ON i.client_id = c.id
        ${whereClause}
        ORDER BY i.invoice_number DESC, it.sort_order ASC
        LIMIT $${paramIndex}
      `;

      queryParams.push(args.limit || 100);

      const result = await pool.query(query, queryParams);

      // Summary statistics
      const summaryQuery = `
        SELECT 
          COUNT(*) as total_items,
          COUNT(DISTINCT it.invoice_id) as distinct_invoices,
          SUM(it.quantity::numeric * it.unit_price::numeric) as total_value,
          AVG(it.unit_price::numeric) as avg_price,
          MIN(it.unit_price::numeric) as min_price,
          MAX(it.unit_price::numeric) as max_price
        FROM crm_invoice_items it
        JOIN crm_invoices i ON it.invoice_id = i.id
        ${whereClause}
      `;

      const summaryResult = await pool.query(summaryQuery, queryParams.slice(0, -1));
      const summary = summaryResult.rows[0];

      const items = result.rows.map((row: any) => ({
        id: row.id,
        invoice: {
          id: row.invoice_id,
          number: row.invoice_number,
          client_name: row.client_name || "Unknown"
        },
        description: row.description,
        quantity: parseFloat(row.quantity),
        pricing: {
          unit_price: parseFloat(row.unit_price),
          tax_rate: parseFloat(row.tax_rate || 0),
          line_total: parseFloat(row.line_total),
          line_total_with_tax: parseFloat(row.line_total_with_tax),
          currency: "EUR"
        },
        sort_order: row.sort_order,
        created_at: row.created_at
      }));

      return {
        summary: {
          total_items: parseInt(summary.total_items),
          distinct_invoices: parseInt(summary.distinct_invoices),
          total_value: parseFloat(summary.total_value || 0),
          avg_price: parseFloat(summary.avg_price || 0),
          min_price: parseFloat(summary.min_price || 0),
          max_price: parseFloat(summary.max_price || 0),
          currency: "EUR",
          returned: items.length
        },
        filters: {
          invoice_id: args.invoiceId || "any",
          invoice_number: args.invoiceNumber || "any",
          search: args.search || "none",
          price_range: args.minPrice || args.maxPrice 
            ? `€${args.minPrice || 0} - €${args.maxPrice || '∞'}` 
            : "any"
        },
        items: items
      };

    } catch (error: any) {
      console.error("❌ Invoice items query error:", error);
      throw new Error(`Failed to query invoice items: ${error.message}`);
    }
  }
};

// Register the tool
registerTool(def);

export default def;
