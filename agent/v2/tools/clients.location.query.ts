/**
 * CRM Client Location Query Tool
 * Tier 1: Low-risk read-only tool
 * 
 * Query clients by geographic location (city, state, country)
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
  city: z.string().optional().describe("Filter by city name (partial match)"),
  state: z.string().optional().describe("Filter by state/region name"),
  country: z.string().optional().describe("Filter by country"),
  includeCompanyDetails: z.boolean().default(false).optional().describe("Include company name and financial details"),
  limit: z.number().int().min(1).max(500).default(100).optional().describe("Maximum number of clients to return")
});

// Tool definition
const def: ToolDef<typeof params> = {
  name: "clients_location_query",
  description: `Query CRM clients by geographic location.
  
Use this to answer questions like:
- "How many clients live in Baden?"
- "List all clients in Vienna"
- "Show me clients in Austria"
- "Who are our clients in Germany?"

Returns: count and detailed client list with contact information`,
  parameters: params,
  authz: ["CRM_READ"],
  risk: "low",
  handler: async (ctx: ToolContext, args: z.infer<typeof params>) => {
    try {
      // Build WHERE clause
      const conditions: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (args.city) {
        conditions.push(`LOWER(city) LIKE LOWER($${paramIndex})`);
        values.push(`%${args.city}%`);
        paramIndex++;
      }

      if (args.state) {
        conditions.push(`LOWER(state) LIKE LOWER($${paramIndex})`);
        values.push(`%${args.state}%`);
        paramIndex++;
      }

      if (args.country) {
        conditions.push(`LOWER(country) LIKE LOWER($${paramIndex})`);
        values.push(`%${args.country}%`);
        paramIndex++;
      }

      const whereClause = conditions.length > 0 
        ? `WHERE ${conditions.join(" AND ")}` 
        : "";

      // Get count
      const countQuery = `
        SELECT COUNT(*) as total
        FROM crm_clients
        ${whereClause}
      `;

      const countResult = await pool.query(countQuery, values);
      const totalCount = parseInt(countResult.rows[0].total);

      // Get detailed records
      const selectFields = args.includeCompanyDetails
        ? `client_id, first_name, last_name, email, phone, 
           company, address, city, state, zip, country, 
           lifetime_value, created_at`
        : `client_id, first_name, last_name, email, phone, 
           city, state, country, created_at`;

      const detailQuery = `
        SELECT ${selectFields}
        FROM crm_clients
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${paramIndex}
      `;

      const details = await pool.query(detailQuery, [...values, args.limit || 100]);

      return {
        count: totalCount,
        filters: {
          city: args.city || "any",
          state: args.state || "any",
          country: args.country || "any"
        },
        clients: details.rows.map((row: any) => ({
          client_id: row.client_id,
          name: `${row.first_name} ${row.last_name}`.trim(),
          email: row.email,
          phone: row.phone,
          location: {
            city: row.city,
            state: row.state,
            country: row.country,
            address: row.address,
            zip: row.zip
          },
          ...(args.includeCompanyDetails && {
            company: row.company,
            lifetime_value: parseFloat(row.lifetime_value || 0)
          }),
          since: row.created_at
        }))
      };

    } catch (error: any) {
      console.error("❌ Client location query error:", error);
      throw new Error(`Failed to query clients by location: ${error.message}`);
    }
  }
};

// Register the tool
registerTool(def);

export default def;
