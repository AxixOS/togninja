"use strict";
/**
 * CRM Clients Search Tool
 * Tier 1: Low-risk read-only tool
 *
 * Searches CRM clients by name, email, or phone
 */
Object.defineProperty(exports, "__esModule", { value: true });
const zod_1 = require("zod");
const ToolBus_1 = require("../core/ToolBus");
const db_1 = require("../../../server/db");
const schema_1 = require("../../../shared/schema");
const drizzle_orm_1 = require("drizzle-orm");
// Zod schema for parameter validation
const params = zod_1.z.object({
    query: zod_1.z.string().optional().describe("Search query (name, email, phone). Leave empty to list all clients."),
    status: zod_1.z.enum(["active", "inactive", "prospect", "all"]).default("all").optional().describe("Filter by client status"),
    limit: zod_1.z.number().int().min(1).max(100).default(50).optional().describe("Maximum results to return"),
    includeArchived: zod_1.z.boolean().default(false).optional()
});
// Tool definition
const def = {
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
    handler: async (ctx, args) => {
        const limit = args.limit || 50;
        // Build base query
        let query = db_1.db.select().from(schema_1.crmClients);
        // Apply search filter if query provided
        if (args.query && args.query.length >= 2) {
            const queryStr = args.query.toLowerCase();
            query = query.where((0, drizzle_orm_1.or)((0, drizzle_orm_1.like)(schema_1.crmClients.firstName, `%${queryStr}%`), (0, drizzle_orm_1.like)(schema_1.crmClients.lastName, `%${queryStr}%`), (0, drizzle_orm_1.like)(schema_1.crmClients.email, `%${queryStr}%`), (0, drizzle_orm_1.like)(schema_1.crmClients.phone, `%${queryStr}%`)));
        }
        // Apply status filter
        if (args.status && args.status !== "all") {
            query = query.where((0, drizzle_orm_1.eq)(schema_1.crmClients.status, args.status));
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
(0, ToolBus_1.registerTool)(def);
exports.default = def;
