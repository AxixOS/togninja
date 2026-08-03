/**
 * CRM Company Report Tool
 * Tier 1: Low-risk read-only tool
 * 
 * Generate report of all clients with company details
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
  onlyWithCompany: z.boolean().default(false).optional().describe("Only include clients with company name filled"),
  sortBy: z.enum(["name", "company", "sales", "date"]).default("company").optional().describe("Sort results by field"),
  limit: z.number().int().min(1).max(1000).default(500).optional().describe("Maximum number of clients to return")
});

// Tool definition
const def: ToolDef<typeof params> = {
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
  handler: async (ctx: ToolContext, args: z.infer<typeof params>) => {
    try {
      // Build WHERE clause
      const whereClause = args.onlyWithCompany 
        ? "WHERE company IS NOT NULL AND company != ''" 
        : "";

      // Determine sort field
      const sortFields: Record<string, string> = {
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

      const clients = result.rows.map((row: any) => ({
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
      const withCompanyCount = clients.filter((c: any) => c.company !== "—").length;
      const totalLifetimeValue = clients.reduce((sum: number, c: any) => sum + c.financials.lifetime_value, 0);

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

    } catch (error: any) {
      console.error("❌ Client company report error:", error);
      throw new Error(`Failed to generate company report: ${error.message}`);
    }
  }
};

// Register the tool
registerTool(def);

export default def;
