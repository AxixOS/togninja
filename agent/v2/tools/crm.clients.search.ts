/**
 * CRM Clients Search Tool
 * Tier 1: Low-risk read-only tool
 * 
 * Searches CRM clients by name, email, or phone
 */

import { z } from "zod";
import { registerTool } from "../core/ToolBus";
import { ToolDef, ToolContext } from "../core/Types";
import { db } from "../../../server/db";
import { crmClients } from "../../../shared/schema";
import { or, like, eq } from "drizzle-orm";

// Zod schema for parameter validation
const params = z.object({
  query: z.string().optional().describe("Search query (name, email, phone). Leave empty to list all clients."),
  status: z.enum(["active", "inactive", "prospect", "all"]).default("all").optional().describe("Filter by client status"),
  limit: z.number().int().min(1).max(100).default(50).optional().describe("Maximum results to return"),
  includeArchived: z.boolean().default(false).optional()
});

// Tool definition
const def: ToolDef<typeof params> = {
  name: "crm_clients_search",
  description: `Search or list CRM clients.

Use this to answer questions like:
- "Show me all clients" (no query, lists all)
- "Find client Maria" (search by name)
- "Search for john@email.com" (search by email)
- "List active clients" (filter by status)

If no query is provided, returns all clients up to the limit.`,
  parameters: params,
  authz: ["CRM_READ"], // Requires CRM_READ scope
  risk: "low", // Read-only, no side effects
  handler: async (ctx: ToolContext, args: z.infer<typeof params>) => {
    const limit = args.limit || 50;
    
    // Build base query
    let query = db.select().from(crmClients);
    
    // Apply search filter if query provided
    if (args.query && args.query.length >= 2) {
      const queryStr = args.query.toLowerCase();
      query = query.where(
        or(
          like(crmClients.firstName, `%${queryStr}%`),
          like(crmClients.lastName, `%${queryStr}%`),
          like(crmClients.email, `%${queryStr}%`),
          like(crmClients.phone, `%${queryStr}%`)
        )
      ) as any;
    }
    
    // Apply status filter
    if (args.status && args.status !== "all") {
      query = query.where(eq(crmClients.status, args.status)) as any;
    }
    
    const results = await query.limit(limit);
    
    // Return formatted results
    return {
      count: results.length,
      clients: results.map(client => ({
        id: client.id,
        name: `${client.firstName || ''} ${client.lastName || ''}`.trim(),
        email: client.email,
        phone: client.phone,
        status: client.status,
        company: client.company,
        createdAt: client.createdAt
      }))
    };
  }
};

// Register the tool
registerTool(def);

export default def;
