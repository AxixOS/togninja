"use strict";
/**
 * CRM Appointments Query Tool
 * Tier 1: Low-risk read-only tool
 *
 * Query and filter studio appointments from CRM
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
    status: zod_1.z.enum(["scheduled", "confirmed", "completed", "cancelled", "no_show", "any"]).default("any").optional().describe("Filter by appointment status"),
    appointmentType: zod_1.z.enum(["consultation", "photoshoot", "delivery", "meeting", "any"]).default("any").optional().describe("Filter by appointment type"),
    clientId: zod_1.z.string().optional().describe("Filter by specific client ID"),
    startDate: zod_1.z.string().optional().describe("Filter appointments starting after this date (YYYY-MM-DD)"),
    endDate: zod_1.z.string().optional().describe("Filter appointments starting before this date (YYYY-MM-DD)"),
    upcoming: zod_1.z.boolean().optional().describe("If true, only show future appointments"),
    limit: zod_1.z.number().int().min(1).max(500).default(100).optional().describe("Maximum number of appointments to return")
});
// Tool definition
const def = {
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
    handler: async (ctx, args) => {
        try {
            // Build WHERE clauses
            const whereClauses = [];
            const queryParams = [];
            let paramIndex = 1;
            if (args.status && args.status !== "any") {
                whereClauses.push(`a.status = $${paramIndex}`);
                queryParams.push(args.status);
                paramIndex++;
            }
            if (args.appointmentType && args.appointmentType !== "any") {
                whereClauses.push(`a.appointment_type = $${paramIndex}`);
                queryParams.push(args.appointmentType);
                paramIndex++;
            }
            if (args.clientId) {
                whereClauses.push(`a.client_id = $${paramIndex}`);
                queryParams.push(args.clientId);
                paramIndex++;
            }
            if (args.startDate) {
                whereClauses.push(`a.start_date_time >= $${paramIndex}::timestamp`);
                queryParams.push(args.startDate);
                paramIndex++;
            }
            if (args.endDate) {
                whereClauses.push(`a.start_date_time <= $${paramIndex}::timestamp + interval '1 day'`);
                queryParams.push(args.endDate);
                paramIndex++;
            }
            if (args.upcoming) {
                whereClauses.push(`a.start_date_time >= NOW()`);
            }
            const whereClause = whereClauses.length > 0
                ? `WHERE ${whereClauses.join(' AND ')}`
                : '';
            // Main query with client join
            const query = `
        SELECT 
          a.id,
          a.title,
          a.description,
          a.appointment_type,
          a.status,
          a.start_date_time,
          a.end_date_time,
          a.location,
          a.notes,
          a.reminder_sent,
          a.reminder_date_time,
          a.google_calendar_event_id,
          a.client_id,
          c.first_name || ' ' || c.last_name as client_name,
          c.email as client_email,
          c.phone as client_phone,
          a.created_at,
          a.updated_at
        FROM studio_appointments a
        LEFT JOIN crm_clients c ON a.client_id = c.id
        ${whereClause}
        ORDER BY a.start_date_time ${args.upcoming ? 'ASC' : 'DESC'}
        LIMIT $${paramIndex}
      `;
            queryParams.push(args.limit || 100);
            const result = await pool.query(query, queryParams);
            // Summary statistics
            const summaryQuery = `
        SELECT 
          COUNT(*) as total_count,
          COUNT(*) FILTER (WHERE status = 'scheduled') as scheduled_count,
          COUNT(*) FILTER (WHERE status = 'confirmed') as confirmed_count,
          COUNT(*) FILTER (WHERE status = 'completed') as completed_count,
          COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_count,
          COUNT(*) FILTER (WHERE status = 'no_show') as no_show_count,
          COUNT(*) FILTER (WHERE appointment_type = 'consultation') as consultation_count,
          COUNT(*) FILTER (WHERE appointment_type = 'photoshoot') as photoshoot_count,
          COUNT(*) FILTER (WHERE appointment_type = 'delivery') as delivery_count,
          COUNT(*) FILTER (WHERE appointment_type = 'meeting') as meeting_count,
          COUNT(*) FILTER (WHERE start_date_time >= NOW()) as upcoming_count
        FROM studio_appointments a
        ${whereClause}
      `;
            const summaryResult = await pool.query(summaryQuery, queryParams.slice(0, -1));
            const summary = summaryResult.rows[0];
            const appointments = result.rows.map((row) => ({
                id: row.id,
                title: row.title,
                description: row.description || "—",
                type: row.appointment_type,
                status: row.status,
                timing: {
                    start: row.start_date_time,
                    end: row.end_date_time,
                    duration_minutes: Math.round((new Date(row.end_date_time).getTime() - new Date(row.start_date_time).getTime()) / 60000)
                },
                location: row.location || "Studio",
                client: {
                    id: row.client_id,
                    name: row.client_name || "Unknown",
                    email: row.client_email || "—",
                    phone: row.client_phone || "—"
                },
                notes: row.notes || "—",
                reminder: {
                    sent: row.reminder_sent,
                    scheduled_at: row.reminder_date_time
                },
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
                    by_type: {
                        consultation: parseInt(summary.consultation_count),
                        photoshoot: parseInt(summary.photoshoot_count),
                        delivery: parseInt(summary.delivery_count),
                        meeting: parseInt(summary.meeting_count)
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
        }
        catch (error) {
            console.error("❌ Appointments query error:", error);
            throw new Error(`Failed to query appointments: ${error.message}`);
        }
    }
};
// Register the tool
(0, ToolBus_1.registerTool)(def);
exports.default = def;
