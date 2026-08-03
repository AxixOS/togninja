"use strict";
/**
 * CRM Company Report Tool
 * Tier 1: Low-risk read-only tool
 *
 * Generate report of all clients with company details
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
    onlyWithCompany: zod_1.z.boolean().default(false).optional().describe("Only include clients with company name filled"),
    sortBy: zod_1.z.enum(["name", "company", "sales", "date"]).default("company").optional().describe("Sort results by field"),
    limit: zod_1.z.number().int().min(1).max(1000).default(500).optional().describe("Maximum number of clients to return")
});
// Tool definition
const def = {
    name: "clients_company_report",
    description: `Generate comprehensive report of all clients with company details.
  
Use this to answer questions like:
- "Generate a report of all clients with company details"
- "Show me all business clients"
- "List clients who have a company registered"
- "Export client company information"

Returns: List of all clients who have company information saved`,
    parameters: params,
    authz: ["CRM_READ"],
    risk: "low",
    handler: async (ctx, args) => {
        try {
            // Build WHERE clause
            const whereClause = args.onlyWithCompany
                ? "WHERE company IS NOT NULL AND company != ''"
                : "";
            // Determine sort field
            const sortFields = {
                name: "last_name, first_name",
                company: "company NULLS LAST, last_name",
                sales: "lifetime_value DESC",
                date: "created_at DESC"
            };
            const sortBy = sortFields[args.sortBy] || sortFields.company;
            const query = `
        SELECT 
          client_id,
          first_name,
          last_name,
          email,
          phone,
          company,
          address,
          city,
          state,
          zip,
          country,
          lifetime_value,
          created_at,
          updated_at
        FROM crm_clients
        ${whereClause}
        ORDER BY ${sortBy}
        LIMIT $1
      `;
            const result = await pool.query(query, [args.limit || 500]);
            const clients = result.rows.map((row) => ({
                client_id: row.client_id,
                name: `${row.first_name} ${row.last_name}`.trim(),
                email: row.email,
                phone: row.phone,
                company: row.company || "—",
                address: {
                    street: row.address || "—",
                    city: row.city || "—",
                    state: row.state || "—",
                    zip: row.zip || "—",
                    country: row.country || "—"
                },
                financials: {
                    lifetime_value: parseFloat(row.lifetime_value || 0),
                    currency: "EUR"
                },
                dates: {
                    created: row.created_at,
                    last_updated: row.updated_at
                }
            }));
            // Calculate summary statistics
            const withCompanyCount = clients.filter((c) => c.company !== "—").length;
            const totalLifetimeValue = clients.reduce((sum, c) => sum + c.financials.lifetime_value, 0);
            return {
                summary: {
                    total_clients: clients.length,
                    with_company: withCompanyCount,
                    without_company: clients.length - withCompanyCount,
                    total_lifetime_value: totalLifetimeValue,
                    currency: "EUR"
                },
                clients: clients
            };
        }
        catch (error) {
            console.error("❌ Client company report error:", error);
            throw new Error(`Failed to generate company report: ${error.message}`);
        }
    }
};
// Register the tool
(0, ToolBus_1.registerTool)(def);
exports.default = def;
