"use strict";
/**
 * Session Tasks List Tool
 * Tier 1: Low-risk read-only tool
 *
 * List tasks associated with photography sessions
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
    sessionId: zod_1.z.string().optional().describe("Filter tasks for a specific session ID"),
    status: zod_1.z.enum(["pending", "in_progress", "completed", "cancelled", "any"]).default("any").optional().describe("Filter by task status"),
    taskType: zod_1.z.string().optional().describe("Filter by task type (e.g., 'editing', 'delivery', 'preparation')"),
    assignedTo: zod_1.z.string().optional().describe("Filter by assigned person"),
    overdue: zod_1.z.boolean().optional().describe("If true, only show overdue tasks"),
    limit: zod_1.z.number().int().min(1).max(500).default(100).optional().describe("Maximum number of tasks to return")
});
const def = {
    name: "session_tasks_list",
    description: `List tasks associated with photography sessions.
  
Use this to answer questions like:
- "What tasks are pending for tomorrow's session?"
- "Show me overdue editing tasks"
- "List all delivery tasks"
- "What tasks are assigned to me?"
- "Show completed tasks for session X"

Returns: List of session tasks with status and due dates`,
    parameters: params,
    authz: ["SESSION_READ"],
    risk: "low",
    handler: async (ctx, args) => {
        try {
            const whereClauses = [];
            const queryParams = [];
            let paramIndex = 1;
            if (args.sessionId) {
                whereClauses.push(`t.session_id = $${paramIndex}`);
                queryParams.push(args.sessionId);
                paramIndex++;
            }
            if (args.status && args.status !== "any") {
                whereClauses.push(`t.status = $${paramIndex}`);
                queryParams.push(args.status);
                paramIndex++;
            }
            if (args.taskType) {
                whereClauses.push(`t.task_type ILIKE $${paramIndex}`);
                queryParams.push(`%${args.taskType}%`);
                paramIndex++;
            }
            if (args.assignedTo) {
                whereClauses.push(`t.assigned_to ILIKE $${paramIndex}`);
                queryParams.push(`%${args.assignedTo}%`);
                paramIndex++;
            }
            if (args.overdue) {
                whereClauses.push(`t.status != 'completed' AND t.due_date < NOW()`);
            }
            const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
            const query = `
        SELECT 
          t.id, t.session_id, t.task_type, t.title, t.description,
          t.assigned_to, t.status, t.due_date, t.completed_at, t.created_at,
          s.title as session_title, s.client_name, s.start_time as session_date
        FROM session_tasks t
        LEFT JOIN photography_sessions s ON t.session_id = s.id
        ${whereClause}
        ORDER BY t.due_date ASC NULLS LAST, t.created_at DESC
        LIMIT $${paramIndex}
      `;
            queryParams.push(args.limit || 100);
            const result = await pool.query(query, queryParams);
            const summaryQuery = `
        SELECT 
          COUNT(*) as total_count,
          COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
          COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_count,
          COUNT(*) FILTER (WHERE status = 'completed') as completed_count,
          COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_count,
          COUNT(*) FILTER (WHERE status != 'completed' AND due_date < NOW()) as overdue_count
        FROM session_tasks t
        ${whereClause}
      `;
            const summaryResult = await pool.query(summaryQuery, queryParams.slice(0, -1));
            const summary = summaryResult.rows[0];
            const tasks = result.rows.map((row) => {
                const isOverdue = row.status !== 'completed' && row.due_date && new Date(row.due_date) < new Date();
                return {
                    id: row.id,
                    session: {
                        id: row.session_id,
                        title: row.session_title || "Unknown Session",
                        client_name: row.client_name || "—",
                        date: row.session_date
                    },
                    task_type: row.task_type,
                    title: row.title,
                    description: row.description || "—",
                    assigned_to: row.assigned_to || "Unassigned",
                    status: row.status,
                    due_date: row.due_date,
                    is_overdue: isOverdue,
                    completed_at: row.completed_at,
                    created_at: row.created_at
                };
            });
            return {
                summary: {
                    total_tasks: parseInt(summary.total_count),
                    by_status: {
                        pending: parseInt(summary.pending_count),
                        in_progress: parseInt(summary.in_progress_count),
                        completed: parseInt(summary.completed_count),
                        cancelled: parseInt(summary.cancelled_count)
                    },
                    overdue: parseInt(summary.overdue_count),
                    returned: tasks.length
                },
                filters: {
                    session_id: args.sessionId || "any",
                    status: args.status || "any",
                    task_type: args.taskType || "any",
                    assigned_to: args.assignedTo || "any",
                    overdue_only: args.overdue || false
                },
                tasks: tasks
            };
        }
        catch (error) {
            console.error("❌ Session tasks list error:", error);
            throw new Error(`Failed to list session tasks: ${error.message}`);
        }
    }
};
(0, ToolBus_1.registerTool)(def);
exports.default = def;
