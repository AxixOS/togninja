/**
 * CRM Appointments Query Tool
 * Tier 1: Low-risk read-only tool
 * 
 * Query and filter studio appointments from CRM
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
  status: z.enum(["scheduled", "confirmed", "completed", "cancelled", "no_show", "any"]).default("any").optional().describe("Filter by appointment status"),
  appointmentType: z.enum(["consultation", "photoshoot", "delivery", "meeting", "any"]).default("any").optional().describe("Filter by appointment type"),
  clientId: z.string().optional().describe("Filter by specific client ID"),
  startDate: z.string().optional().describe("Filter appointments starting after this date (YYYY-MM-DD)"),
  endDate: z.string().optional().describe("Filter appointments starting before this date (YYYY-MM-DD)"),
  upcoming: z.boolean().optional().describe("If true, only show future appointments"),
  limit: z.number().int().min(1).max(500).default(100).optional().describe("Maximum number of appointments to return")
});

// Tool definition
const def: ToolDef<typeof params> = {
  name: "appointments_query",
  description: `Query and filter studio appointments from the CRM system.
  
Use this to answer questions like:
- "What appointments do I have this week?"
- "Show me all upcoming photoshoots"
- "List all appointments for client John Smith"
- "Which consultations are scheduled for next month?"
- "Show me completed appointments from last week"
- "Are there any cancelled appointments?"
- "What's on the calendar for tomorrow?"

Returns: Filtered list of appointments with client information`,
  parameters: params,
  authz: ["CALENDAR_READ"],
  risk: "low",
  handler: async (ctx: ToolContext, args: z.infer<typeof params>) => {
    try {
      // Build WHERE clauses — query photography_sessions (the table the CALENDAR
      // shows). studio_appointments was empty, so the agent used to report "no
      // appointments" while the calendar had hundreds of sessions.
      const whereClauses: string[] = [];
      const queryParams: any[] = [];
      let paramIndex = 1;

      if (args.status && args.status !== "any") {
        whereClauses.push(`ps.status = $${paramIndex}`);
        queryParams.push(args.status);
        paramIndex++;
      }

      if (args.appointmentType && args.appointmentType !== "any") {
        whereClauses.push(`ps.session_type ILIKE $${paramIndex}`);
        queryParams.push(`%${args.appointmentType}%`);
        paramIndex++;
      }

      if (args.clientId) {
        whereClauses.push(`ps.client_id = $${paramIndex}`);
        queryParams.push(args.clientId);
        paramIndex++;
      }

      if (args.startDate) {
        whereClauses.push(`ps.start_time >= $${paramIndex}::timestamp`);
        queryParams.push(args.startDate);
        paramIndex++;
      }

      if (args.endDate) {
        whereClauses.push(`ps.start_time <= $${paramIndex}::timestamp + interval '1 day'`);
        queryParams.push(args.endDate);
        paramIndex++;
      }

      if (args.upcoming) {
        whereClauses.push(`ps.start_time >= NOW()`);
      }

      const whereClause = whereClauses.length > 0
        ? `WHERE ${whereClauses.join(' AND ')}`
        : '';

      // Main query with client join — reads photography_sessions (the calendar).
      const query = `
        SELECT
          ps.id,
          ps.title,
          ps.session_type,
          ps.status,
          ps.start_time,
          ps.end_time,
          ps.location_name,
          ps.notes,
          ps.google_calendar_event_id,
          ps.client_id,
          COALESCE(NULLIF(TRIM(ps.client_name), ''), c.first_name || ' ' || c.last_name) as client_name,
          COALESCE(ps.client_email, c.email) as client_email,
          COALESCE(ps.client_phone, c.phone) as client_phone,
          ps.created_at,
          ps.updated_at
        FROM photography_sessions ps
        LEFT JOIN crm_clients c ON ps.client_id = c.id::text
        ${whereClause}
        ORDER BY ps.start_time ${args.upcoming ? 'ASC' : 'DESC'}
        LIMIT $${paramIndex}
      `;

      queryParams.push(args.limit || 100);

      const result = await pool.query(query, queryParams);

      // Summary statistics
      const summaryQuery = `
        SELECT
          COUNT(*) as total_count,
          COUNT(*) FILTER (WHERE ps.status = 'scheduled') as scheduled_count,
          COUNT(*) FILTER (WHERE ps.status = 'confirmed') as confirmed_count,
          COUNT(*) FILTER (WHERE ps.status = 'completed') as completed_count,
          COUNT(*) FILTER (WHERE ps.status = 'cancelled') as cancelled_count,
          COUNT(*) FILTER (WHERE ps.status = 'no_show') as no_show_count,
          COUNT(*) FILTER (WHERE ps.start_time >= NOW()) as upcoming_count
        FROM photography_sessions ps
        ${whereClause}
      `;

      const summaryResult = await pool.query(summaryQuery, queryParams.slice(0, -1));
      const summary = summaryResult.rows[0];

      const appointments = result.rows.map((row: any) => ({
        id: row.id,
        title: row.title,
        type: row.session_type || "session",
        status: row.status,
        timing: {
          start: row.start_time,
          end: row.end_time,
          duration_minutes: (row.end_time && row.start_time)
            ? Math.round((new Date(row.end_time).getTime() - new Date(row.start_time).getTime()) / 60000)
            : null
        },
        location: row.location_name || "Studio",
        client: {
          id: row.client_id,
          name: row.client_name || "Unknown",
          email: row.client_email || "—",
          phone: row.client_phone || "—"
        },
        notes: row.notes || "—",
        synced_to_google: !!row.google_calendar_event_id,
        created_at: row.created_at,
        updated_at: row.updated_at
      }));

      return {
        summary: {
          total_appointments: parseInt(summary.total_count),
          by_status: {
            scheduled: parseInt(summary.scheduled_count),
            confirmed: parseInt(summary.confirmed_count),
            completed: parseInt(summary.completed_count),
            cancelled: parseInt(summary.cancelled_count),
            no_show: parseInt(summary.no_show_count)
          },
          upcoming: parseInt(summary.upcoming_count),
          returned: appointments.length
        },
        filters: {
          status: args.status || "any",
          type: args.appointmentType || "any",
          client_id: args.clientId || "any",
          date_range: args.startDate || args.endDate 
            ? `${args.startDate || 'beginning'} to ${args.endDate || 'now'}` 
            : "all time",
          upcoming_only: args.upcoming || false
        },
        appointments: appointments
      };

    } catch (error: any) {
      console.error("❌ Appointments query error:", error);
      throw new Error(`Failed to query appointments: ${error.message}`);
    }
  }
};

// Register the tool
registerTool(def);

export default def;
