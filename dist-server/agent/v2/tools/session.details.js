"use strict";
/**
 * Session Details Tool
 * Tier 1: Low-risk read-only tool
 *
 * Get comprehensive details about a photography session
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const zod_1 = require("zod");
const ToolBus_1 = require("../core/ToolBus");
const pg_1 = __importDefault(require("pg"));
const { Pool } = pg_1.default;
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('neon.tech') ? { rejectUnauthorized: false } : undefined
});
const params = zod_1.z.object({
    sessionId: zod_1.z.string().optional().describe("Get details for a specific session ID"),
    clientName: zod_1.z.string().optional().describe("Find session by client name"),
    upcoming: zod_1.z.boolean().optional().describe("If true, get the next upcoming session"),
    status: zod_1.z.enum(["scheduled", "in_progress", "completed", "cancelled", "any"]).default("any").optional().describe("Filter by session status")
});
const def = {
    name: "session_details",
    description: `Get comprehensive details about a photography session including tasks, equipment, and timeline.
  
Use this to answer questions like:
- "Tell me about my next session"
- "What are the details for the Smith wedding?"
- "Show me session info for client John"
- "What's the status of my current session?"

Returns: Full session details with related information`,
    parameters: params,
    authz: ["SESSION_READ"],
    risk: "low",
    handler: async (ctx, args) => {
        try {
            const whereClauses = [];
            const queryParams = [];
            let paramIndex = 1;
            if (args.sessionId) {
                whereClauses.push(`s.id = $${paramIndex}`);
                queryParams.push(args.sessionId);
                paramIndex++;
            }
            if (args.clientName) {
                whereClauses.push(`s.client_name ILIKE $${paramIndex}`);
                queryParams.push(`%${args.clientName}%`);
                paramIndex++;
            }
            if (args.upcoming) {
                whereClauses.push(`s.start_time >= NOW()`);
            }
            if (args.status && args.status !== "any") {
                whereClauses.push(`s.status = $${paramIndex}`);
                queryParams.push(args.status);
                paramIndex++;
            }
            const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
            const orderBy = args.upcoming ? 'ORDER BY s.start_time ASC' : 'ORDER BY s.start_time DESC';
            const query = `
        SELECT 
          s.*
        FROM photography_sessions s
        ${whereClause}
        ${orderBy}
        LIMIT 1
      `;
            const result = await pool.query(query, queryParams);
            if (result.rows.length === 0) {
                return {
                    found: false,
                    message: "No session found matching the criteria",
                    filters: {
                        session_id: args.sessionId || "any",
                        client_name: args.clientName || "any",
                        upcoming: args.upcoming || false,
                        status: args.status || "any"
                    }
                };
            }
            const session = result.rows[0];
            // Get tasks for this session
            const tasksQuery = `
        SELECT id, task_type, title, status, due_date, assigned_to
        FROM session_tasks
        WHERE session_id = $1
        ORDER BY due_date ASC
      `;
            const tasksResult = await pool.query(tasksQuery, [session.id]);
            // Get equipment for this session
            const equipmentQuery = `
        SELECT equipment_name, equipment_type, rental_required, rental_cost
        FROM session_equipment
        WHERE session_id = $1
      `;
            const equipmentResult = await pool.query(equipmentQuery, [session.id]);
            // Get communications for this session
            const commsQuery = `
        SELECT communication_type, subject, sent_at, response_received
        FROM session_communications
        WHERE session_id = $1
        ORDER BY sent_at DESC
        LIMIT 5
      `;
            const commsResult = await pool.query(commsQuery, [session.id]);
            const tasks = tasksResult.rows.map((t) => ({
                id: t.id,
                type: t.task_type,
                title: t.title,
                status: t.status,
                due_date: t.due_date,
                assigned_to: t.assigned_to || "Unassigned"
            }));
            const equipment = equipmentResult.rows.map((e) => ({
                name: e.equipment_name,
                type: e.equipment_type,
                rental: e.rental_required,
                cost: e.rental_cost ? parseFloat(e.rental_cost) : 0
            }));
            const communications = commsResult.rows.map((c) => ({
                type: c.communication_type,
                subject: c.subject,
                sent_at: c.sent_at,
                response_received: c.response_received
            }));
            return {
                found: true,
                session: {
                    id: session.id,
                    title: session.title,
                    description: session.description || "—",
                    type: session.session_type,
                    status: session.status,
                    timing: {
                        start: session.start_time,
                        end: session.end_time,
                        duration_hours: session.start_time && session.end_time
                            ? Math.round((new Date(session.end_time).getTime() - new Date(session.start_time).getTime()) / 3600000 * 10) / 10
                            : null
                    },
                    client: {
                        id: session.client_id,
                        name: session.client_name || "—",
                        email: session.client_email || "—",
                        phone: session.client_phone || "—"
                    },
                    location: {
                        name: session.location_name || "—",
                        address: session.location_address || "—",
                        coordinates: session.location_coordinates
                    },
                    weather: {
                        dependent: session.weather_dependent,
                        golden_hour_optimized: session.golden_hour_optimized,
                        backup_plan: session.backup_plan || "—"
                    },
                    pricing: {
                        base_price: session.base_price ? parseFloat(session.base_price) : 0,
                        deposit_amount: session.deposit_amount ? parseFloat(session.deposit_amount) : 0,
                        deposit_paid: session.deposit_paid,
                        final_payment: session.final_payment ? parseFloat(session.final_payment) : 0,
                        final_payment_paid: session.final_payment_paid,
                        payment_status: session.payment_status,
                        currency: "EUR"
                    },
                    workflow: {
                        editing_status: session.editing_status,
                        delivery_status: session.delivery_status,
                        delivery_date: session.delivery_date,
                        portfolio_worthy: session.portfolio_worthy
                    },
                    team: {
                        equipment_list: session.equipment_list || [],
                        crew_members: session.crew_members || []
                    },
                    reminders: {
                        confirmation_sent: session.confirmation_sent,
                        reminder_sent: session.reminder_sent,
                        follow_up_sent: session.follow_up_sent
                    },
                    notes: session.notes || "—",
                    tags: session.tags || [],
                    created_at: session.created_at,
                    updated_at: session.updated_at
                },
                tasks: {
                    total: tasks.length,
                    pending: tasks.filter((t) => t.status === 'pending').length,
                    completed: tasks.filter((t) => t.status === 'completed').length,
                    items: tasks
                },
                equipment: {
                    total: equipment.length,
                    rental_count: equipment.filter((e) => e.rental).length,
                    total_rental_cost: equipment.reduce((sum, e) => sum + (e.rental ? e.cost : 0), 0),
                    items: equipment
                },
                recent_communications: communications
            };
        }
        catch (error) {
            console.error("❌ Session details error:", error);
            throw new Error(`Failed to get session details: ${error.message}`);
        }
    }
};
(0, ToolBus_1.registerTool)(def);
exports.default = def;
