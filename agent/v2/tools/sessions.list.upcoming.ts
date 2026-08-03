/**
 * Sessions: List Upcoming
 * Tier 1: Low-risk read-only tool
 *
 * Returns the next N upcoming photography sessions
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
  limit: z.number().int().min(1).max(50).default(5).describe("How many upcoming sessions to return")
});

const def: ToolDef<typeof params> = {
  name: "sessions_list_upcoming",
  description: "List the next upcoming photography sessions. Returns id, title, start_time, end_time, client_name.",
  parameters: params,
  authz: ["CRM_READ"],
  risk: "low",
  handler: async (_ctx: ToolContext, args) => {
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

registerTool(def);

export default def;
