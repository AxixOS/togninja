/**
 * Invoices List Tool
 * Tier 1: Low-risk read-only tool
 * 
 * Lists invoices with optional filtering
 */

import { z } from "zod";
import { registerTool } from "../core/ToolBus";
import { ToolDef, ToolContext } from "../core/Types";
import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('neon.tech') ? { rejectUnauthorized: false } : undefined
});

// Zod schema
const params = z.object({
  clientId: z.string().uuid().optional().describe("Filter by specific client ID"),
  status: z.enum(["draft", "sent", "paid", "overdue", "cancelled", "awaiting_payment", "unpaid"]).optional().describe("Filter by status. Use 'unpaid' to get all invoices that are sent or awaiting payment (not yet paid)."),
  limit: z.number().int().min(1).max(100).default(20).optional()
});

// Tool definition
const def: ToolDef<typeof params> = {
  name: "invoices_list",
  description: `List invoices, optionally filtered by client or status. Returns invoice records sorted by most recent first.

IMPORTANT: When the user asks for "unpaid invoices" or "invoices awaiting payment", use status='unpaid' which returns invoices with status 'sent' or 'awaiting_payment'.`,
  parameters: params,
  authz: ["INV_READ"],
  risk: "low",
  handler: async (ctx: ToolContext, args: z.infer<typeof params>) => {
    const limit = args.limit || 20;
    const whereClauses: string[] = [];
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (args.clientId) {
      whereClauses.push(`i.client_id = $${paramIndex}`);
      queryParams.push(args.clientId);
      paramIndex++;
    }

    if (args.status) {
      if (args.status === 'unpaid') {
        whereClauses.push(`i.status IN ('sent', 'awaiting_payment', 'pending')`);
      } else if (args.status === 'overdue') {
        whereClauses.push(`i.status != 'paid' AND i.due_date < CURRENT_DATE`);
      } else {
        whereClauses.push(`i.status = $${paramIndex}`);
        queryParams.push(args.status);
        paramIndex++;
      }
    }

    const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const query = `
      SELECT i.id, i.invoice_number, i.client_id,
             c.first_name || ' ' || c.last_name as client_name,
             c.email as client_email,
             i.status, i.total, i.due_date, i.issue_date, i.created_at
      FROM crm_invoices i
      LEFT JOIN crm_clients c ON i.client_id = c.id
      ${whereClause}
      ORDER BY i.created_at DESC
      LIMIT $${paramIndex}
    `;
    queryParams.push(limit);

    const result = await pool.query(query, queryParams);

    return {
      count: result.rows.length,
      invoices: result.rows.map((row: any) => ({
        id: row.id,
        invoiceNumber: row.invoice_number,
        clientId: row.client_id,
        clientName: row.client_name || 'Unknown',
        clientEmail: row.client_email || '',
        status: row.status,
        total: parseFloat(row.total || 0),
        dueDate: row.due_date,
        issueDate: row.issue_date,
        createdAt: row.created_at
      }))
    };
  }
};

registerTool(def);

export default def;
