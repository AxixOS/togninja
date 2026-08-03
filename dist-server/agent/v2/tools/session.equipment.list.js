"use strict";
/**
 * Session Equipment List Tool
 * Tier 1: Low-risk read-only tool
 *
 * List equipment associated with photography sessions
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
    sessionId: zod_1.z.string().optional().describe("Get equipment for a specific session ID"),
    equipmentType: zod_1.z.string().optional().describe("Filter by equipment type (e.g., 'camera', 'lighting', 'lens')"),
    rentalOnly: zod_1.z.boolean().optional().describe("If true, only show rental equipment"),
    limit: zod_1.z.number().int().min(1).max(500).default(100).optional().describe("Maximum number of items to return")
});
const def = {
    name: "session_equipment_list",
    description: `List equipment needed for photography sessions.
  
Use this to answer questions like:
- "What equipment do I need for tomorrow's session?"
- "Show me rental equipment costs"
- "List all lighting equipment needed this week"
- "What cameras are booked for weddings?"

Returns: List of session equipment with rental information`,
    parameters: params,
    authz: ["SESSION_READ"],
    risk: "low",
    handler: async (ctx, args) => {
        try {
            const whereClauses = [];
            const queryParams = [];
            let paramIndex = 1;
            if (args.sessionId) {
                whereClauses.push(`e.session_id = $${paramIndex}`);
                queryParams.push(args.sessionId);
                paramIndex++;
            }
            if (args.equipmentType) {
                whereClauses.push(`e.equipment_type ILIKE $${paramIndex}`);
                queryParams.push(`%${args.equipmentType}%`);
                paramIndex++;
            }
            if (args.rentalOnly) {
                whereClauses.push(`e.rental_required = true`);
            }
            const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
            const query = `
        SELECT 
          e.id, e.session_id, e.equipment_name, e.equipment_type,
          e.rental_required, e.rental_cost, e.notes, e.created_at,
          s.title as session_title, s.client_name, s.start_time as session_date
        FROM session_equipment e
        LEFT JOIN photography_sessions s ON e.session_id = s.id
        ${whereClause}
        ORDER BY s.start_time ASC, e.equipment_name ASC
        LIMIT $${paramIndex}
      `;
            queryParams.push(args.limit || 100);
            const result = await pool.query(query, queryParams);
            const summaryQuery = `
        SELECT 
          COUNT(*) as total_count,
          COUNT(*) FILTER (WHERE rental_required = true) as rental_count,
          COUNT(*) FILTER (WHERE rental_required = false OR rental_required IS NULL) as owned_count,
          SUM(CASE WHEN rental_required = true THEN rental_cost::numeric ELSE 0 END) as total_rental_cost,
          COUNT(DISTINCT session_id) as distinct_sessions
        FROM session_equipment e
        ${whereClause}
      `;
            const summaryResult = await pool.query(summaryQuery, queryParams.slice(0, -1));
            const summary = summaryResult.rows[0];
            const equipment = result.rows.map((row) => ({
                id: row.id,
                session: {
                    id: row.session_id,
                    title: row.session_title || "Unknown Session",
                    client_name: row.client_name || "—",
                    date: row.session_date
                },
                equipment_name: row.equipment_name,
                equipment_type: row.equipment_type || "General",
                rental: {
                    required: row.rental_required || false,
                    cost: row.rental_cost ? parseFloat(row.rental_cost) : 0,
                    currency: "EUR"
                },
                notes: row.notes || "—",
                created_at: row.created_at
            }));
            return {
                summary: {
                    total_items: parseInt(summary.total_count),
                    rental_items: parseInt(summary.rental_count),
                    owned_items: parseInt(summary.owned_count),
                    total_rental_cost: parseFloat(summary.total_rental_cost || 0),
                    currency: "EUR",
                    distinct_sessions: parseInt(summary.distinct_sessions),
                    returned: equipment.length
                },
                filters: {
                    session_id: args.sessionId || "any",
                    equipment_type: args.equipmentType || "any",
                    rental_only: args.rentalOnly || false
                },
                equipment: equipment
            };
        }
        catch (error) {
            console.error("❌ Session equipment list error:", error);
            throw new Error(`Failed to list session equipment: ${error.message}`);
        }
    }
};
(0, ToolBus_1.registerTool)(def);
exports.default = def;
