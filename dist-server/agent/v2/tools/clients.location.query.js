"use strict";
/**
 * CRM Client Location Query Tool
 * Tier 1: Low-risk read-only tool
 *
 * Query clients by geographic location (city, state, country)
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
    city: zod_1.z.string().optional().describe("Filter by city name (partial match)"),
    state: zod_1.z.string().optional().describe("Filter by state/region name"),
    country: zod_1.z.string().optional().describe("Filter by country"),
    includeCompanyDetails: zod_1.z.boolean().default(false).optional().describe("Include company name and financial details"),
    limit: zod_1.z.number().int().min(1).max(500).default(100).optional().describe("Maximum number of clients to return")
});
// Tool definition
const def = {
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
    handler: async (ctx, args) => {
        try {
            // Build WHERE clause
            const conditions = [];
            const values = [];
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
           company_name, address, city, state, zip, country, 
           total_sales, outstanding_balance, created_at`
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
                clients: details.rows.map((row) => ({
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
                        company: row.company_name,
                        total_sales: parseFloat(row.total_sales || 0),
                        outstanding_balance: parseFloat(row.outstanding_balance || 0)
                    }),
                    since: row.created_at
                }))
            };
        }
        catch (error) {
            console.error("❌ Client location query error:", error);
            throw new Error(`Failed to query clients by location: ${error.message}`);
        }
    }
};
// Register the tool
(0, ToolBus_1.registerTool)(def);
exports.default = def;
