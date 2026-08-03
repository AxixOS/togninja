"use strict";
/**
 * CRM Invoices Query Tool
 * Tier 1: Low-risk read-only tool
 *
 * Query and filter invoices from CRM
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
    status: zod_1.z.enum(["draft", "sent", "paid", "overdue", "cancelled", "any"]).default("any").optional().describe("Filter by payment status"),
    clientId: zod_1.z.string().optional().describe("Filter by specific client ID"),
    minAmount: zod_1.z.number().optional().describe("Minimum invoice amount"),
    maxAmount: zod_1.z.number().optional().describe("Maximum invoice amount"),
    startDate: zod_1.z.string().optional().describe("Filter invoices issued after this date (YYYY-MM-DD)"),
    endDate: zod_1.z.string().optional().describe("Filter invoices issued before this date (YYYY-MM-DD)"),
    overdueDays: zod_1.z.number().int().optional().describe("Show invoices overdue by at least this many days"),
    limit: zod_1.z.number().int().min(1).max(500).default(100).optional().describe("Maximum number of invoices to return")
});
// Tool definition
const def = {
    name: "invoices_query",
    description: `Query and filter invoices from the CRM system.
  
Use this to answer questions like:
- "Show me all unpaid invoices"
- "List invoices over €500"
- "Which invoices are overdue?"
- "Show me all invoices for client John Smith"
- "What invoices were sent in October?"
- "List all paid invoices from last month"

Returns: Filtered list of invoices with detailed information`,
    parameters: params,
    authz: ["INV_READ"],
    risk: "low",
    handler: async (ctx, args) => {
        try {
            // Build WHERE clauses
            const whereClauses = [];
            const queryParams = [];
            let paramIndex = 1;
            if (args.status && args.status !== "any") {
                if (args.status === "overdue") {
                    whereClauses.push(`i.status != 'paid' AND i.due_date < CURRENT_DATE`);
                }
                else {
                    whereClauses.push(`i.status = $${paramIndex}`);
                    queryParams.push(args.status);
                    paramIndex++;
                }
            }
            if (args.clientId) {
                whereClauses.push(`i.client_id = $${paramIndex}`);
                queryParams.push(args.clientId);
                paramIndex++;
            }
            if (args.minAmount !== undefined) {
                whereClauses.push(`i.total::numeric >= $${paramIndex}`);
                queryParams.push(args.minAmount);
                paramIndex++;
            }
            if (args.maxAmount !== undefined) {
                whereClauses.push(`i.total::numeric <= $${paramIndex}`);
                queryParams.push(args.maxAmount);
                paramIndex++;
            }
            if (args.startDate) {
                whereClauses.push(`i.issue_date >= $${paramIndex}`);
                queryParams.push(args.startDate);
                paramIndex++;
            }
            if (args.endDate) {
                whereClauses.push(`i.issue_date <= $${paramIndex}`);
                queryParams.push(args.endDate);
                paramIndex++;
            }
            if (args.overdueDays !== undefined) {
                whereClauses.push(`i.status != 'paid' AND i.due_date < CURRENT_DATE - INTERVAL '${args.overdueDays} days'`);
            }
            const whereClause = whereClauses.length > 0
                ? `WHERE ${whereClauses.join(' AND ')}`
                : '';
            // Main query with client join
            const query = `
        SELECT 
          i.id,
          i.invoice_number,
          i.client_id,
          c.first_name || ' ' || c.last_name as client_name,
          c.email as client_email,
          c.company as client_company,
          i.issue_date,
          i.due_date,
          i.subtotal,
          i.tax_amount,
          i.total,
          i.status,
          i.notes,
          i.created_at,
          i.updated_at,
          CASE 
            WHEN i.status = 'paid' THEN 0
            WHEN i.due_date < CURRENT_DATE THEN (CURRENT_DATE - i.due_date)
            ELSE 0
          END as days_overdue
        FROM crm_invoices i
        LEFT JOIN crm_clients c ON i.client_id = c.id
        ${whereClause}
        ORDER BY i.issue_date DESC
        LIMIT $${paramIndex}
      `;
            queryParams.push(args.limit || 100);
            const result = await pool.query(query, queryParams);
            // Summary statistics
            const summaryQuery = `
        SELECT 
          COUNT(*) as total_count,
          COUNT(*) FILTER (WHERE i.status = 'draft') as draft_count,
          COUNT(*) FILTER (WHERE i.status = 'sent') as sent_count,
          COUNT(*) FILTER (WHERE i.status = 'paid') as paid_count,
          COUNT(*) FILTER (WHERE i.status != 'paid' AND i.due_date < CURRENT_DATE) as overdue_count,
          SUM(i.total::numeric) as total_amount,
          SUM(i.total::numeric) FILTER (WHERE i.status = 'paid') as paid_amount,
          SUM(i.total::numeric) FILTER (WHERE i.status != 'paid') as outstanding_amount,
          SUM(i.total::numeric) FILTER (WHERE i.status != 'paid' AND i.due_date < CURRENT_DATE) as overdue_amount
        FROM crm_invoices i
        ${whereClause}
      `;
            const summaryResult = await pool.query(summaryQuery, queryParams.slice(0, -1));
            const summary = summaryResult.rows[0];
            const invoices = result.rows.map((row) => ({
                id: row.id,
                invoice_number: row.invoice_number,
                client: {
                    id: row.client_id,
                    name: row.client_name || "Unknown",
                    email: row.client_email || "—",
                    company: row.client_company || "—"
                },
                dates: {
                    issued: row.issue_date,
                    due: row.due_date,
                    days_overdue: parseInt(row.days_overdue)
                },
                amounts: {
                    subtotal: parseFloat(row.subtotal),
                    tax: parseFloat(row.tax_amount || 0),
                    total: parseFloat(row.total),
                    currency: "EUR"
                },
                status: row.status,
                notes: row.notes || "—",
                created_at: row.created_at,
                updated_at: row.updated_at
            }));
            return {
                summary: {
                    total_invoices: parseInt(summary.total_count),
                    draft: parseInt(summary.draft_count),
                    sent: parseInt(summary.sent_count),
                    paid: parseInt(summary.paid_count),
                    overdue: parseInt(summary.overdue_count),
                    total_amount: parseFloat(summary.total_amount || 0),
                    paid_amount: parseFloat(summary.paid_amount || 0),
                    outstanding_amount: parseFloat(summary.outstanding_amount || 0),
                    overdue_amount: parseFloat(summary.overdue_amount || 0),
                    currency: "EUR",
                    returned: invoices.length
                },
                filters: {
                    status: args.status || "any",
                    client_id: args.clientId || "any",
                    amount_range: args.minAmount || args.maxAmount
                        ? `€${args.minAmount || 0} - €${args.maxAmount || '∞'}`
                        : "any",
                    date_range: args.startDate || args.endDate
                        ? `${args.startDate || 'beginning'} to ${args.endDate || 'now'}`
                        : "all time"
                },
                invoices: invoices
            };
        }
        catch (error) {
            console.error("❌ Invoices query error:", error);
            throw new Error(`Failed to query invoices: ${error.message}`);
        }
    }
};
// Register the tool
(0, ToolBus_1.registerTool)(def);
exports.default = def;
