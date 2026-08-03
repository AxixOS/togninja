/**
 * Online Bookings Pending List Tool
 * Tier 1: Low-risk read-only tool
 * 
 * List pending online booking requests
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

const params = z.object({
  status: z.enum(["pending", "confirmed", "cancelled", "completed", "any"]).default("pending").optional().describe("Filter by booking status"),
  sessionType: z.string().optional().describe("Filter by session type"),
  startDate: z.string().optional().describe("Filter bookings requested after this date (YYYY-MM-DD)"),
  endDate: z.string().optional().describe("Filter bookings requested before this date (YYYY-MM-DD)"),
  limit: z.number().int().min(1).max(500).default(100).optional().describe("Maximum number of bookings to return")
});

const def: ToolDef<typeof params> = {
  name: "bookings_pending_list",
  description: `List online booking requests from the website.
  
Use this to answer questions like:
- "Show me pending booking requests"
- "What new bookings came in today?"
- "List unprocessed booking inquiries"
- "How many bookings are waiting for confirmation?"
- "Show me wedding photography booking requests"

Returns: List of online booking requests with client details`,
  parameters: params,
  authz: ["BOOKING_READ"],
  risk: "low",
  handler: async (ctx: ToolContext, args: z.infer<typeof params>) => {
    try {
      const whereClauses: string[] = [];
      const queryParams: any[] = [];
      let paramIndex = 1;

      if (args.status && args.status !== "any") {
        whereClauses.push(`status = $${paramIndex}`);
        queryParams.push(args.status);
        paramIndex++;
      }

      if (args.sessionType) {
        whereClauses.push(`session_type ILIKE $${paramIndex}`);
        queryParams.push(`%${args.sessionType}%`);
        paramIndex++;
      }

      if (args.startDate) {
        whereClauses.push(`created_at >= $${paramIndex}::timestamp`);
        queryParams.push(args.startDate);
        paramIndex++;
      }

      if (args.endDate) {
        whereClauses.push(`created_at <= $${paramIndex}::timestamp + interval '1 day'`);
        queryParams.push(args.endDate);
        paramIndex++;
      }

      const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

      const query = `
        SELECT 
          id, form_id, session_id, client_name, client_email, client_phone,
          form_data, requested_date, requested_time, session_type, status,
          notes, admin_notes, processed_at, processed_by, created_at, updated_at
        FROM online_bookings
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${paramIndex}
      `;
      queryParams.push(args.limit || 100);

      const result = await pool.query(query, queryParams);

      const summaryQuery = `
        SELECT 
          COUNT(*) as total_count,
          COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
          COUNT(*) FILTER (WHERE status = 'confirmed') as confirmed_count,
          COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_count,
          COUNT(*) FILTER (WHERE status = 'completed') as completed_count
        FROM online_bookings
        ${whereClause}
      `;
      const summaryResult = await pool.query(summaryQuery, queryParams.slice(0, -1));
      const summary = summaryResult.rows[0];

      const bookings = result.rows.map((row: any) => ({
        id: row.id,
        client: {
          name: row.client_name,
          email: row.client_email,
          phone: row.client_phone || "—"
        },
        session_type: row.session_type,
        status: row.status,
        requested: {
          date: row.requested_date,
          time: row.requested_time
        },
        form_data: row.form_data,
        notes: row.notes || "—",
        admin_notes: row.admin_notes || "—",
        processed: row.processed_at ? {
          at: row.processed_at,
          by: row.processed_by
        } : null,
        created_at: row.created_at
      }));

      return {
        summary: {
          total_bookings: parseInt(summary.total_count),
          pending: parseInt(summary.pending_count),
          confirmed: parseInt(summary.confirmed_count),
          cancelled: parseInt(summary.cancelled_count),
          completed: parseInt(summary.completed_count),
          returned: bookings.length
        },
        filters: {
          status: args.status || "pending",
          session_type: args.sessionType || "any",
          date_range: args.startDate || args.endDate 
            ? `${args.startDate || 'beginning'} to ${args.endDate || 'now'}` 
            : "all time"
        },
        bookings: bookings
      };
    } catch (error: any) {
      console.error("❌ Bookings pending list error:", error);
      throw new Error(`Failed to list pending bookings: ${error.message}`);
    }
  }
};

registerTool(def);
export default def;
