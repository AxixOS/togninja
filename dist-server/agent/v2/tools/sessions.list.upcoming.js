"use strict";
/**
 * Sessions: List Upcoming
 * Tier 1: Low-risk read-only tool
 *
 * Returns the next N upcoming photography sessions
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
    limit: zod_1.z.number().int().min(1).max(50).default(5).describe("How many upcoming sessions to return")
});
const def = {
    name: "sessions_list_upcoming",
    description: "List the next upcoming photography sessions. Returns id, title, start_time, end_time, client_name.",
    parameters: params,
    authz: ["CRM_READ"],
    risk: "low",
    handler: async (_ctx, args) => {
        const q = `
      SELECT id, title, start_time, end_time, client_name
      FROM photography_sessions
      WHERE start_time IS NOT NULL AND start_time >= NOW()
      ORDER BY start_time ASC
      LIMIT $1
    `;
        const result = await pool.query(q, [args.limit]);
        return {
            count: result.rowCount || 0,
            sessions: (result.rows || []).map(r => ({
                id: r.id,
                title: r.title,
                startTime: r.start_time,
                endTime: r.end_time,
                clientName: r.client_name
            }))
        };
    }
};
(0, ToolBus_1.registerTool)(def);
exports.default = def;
