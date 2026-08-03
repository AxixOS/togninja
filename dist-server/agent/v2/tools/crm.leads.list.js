"use strict";
/**
 * CRM Leads List Tool
 * Tier 1: Low-risk read-only tool
 *
 * Lists all leads with optional filtering
 */
Object.defineProperty(exports, "__esModule", { value: true });
const zod_1 = require("zod");
const ToolBus_1 = require("../core/ToolBus");
const db_1 = require("../../../server/db");
const schema_1 = require("../../../shared/schema");
const drizzle_orm_1 = require("drizzle-orm");
// Zod schema
const params = zod_1.z.object({
    status: zod_1.z.enum(["new", "contacted", "qualified", "converted", "lost"]).optional(),
    limit: zod_1.z.number().int().min(1).max(100).default(20).optional()
});
// Tool definition
const def = {
    name: "crm_leads_list",
    description: "List all leads, optionally filtered by status. Returns lead records sorted by most recent first.",
    parameters: params,
    authz: ["CRM_READ"],
    risk: "low",
    handler: async (ctx, args) => {
        const limit = args.limit || 20;
        // Build base query
        let queryBuilder = db_1.db
            .select()
            .from(schema_1.crmLeads)
            .orderBy((0, drizzle_orm_1.desc)(schema_1.crmLeads.createdAt));
        // Filter by status if provided
        if (args.status) {
            queryBuilder = queryBuilder.where((0, drizzle_orm_1.eq)(schema_1.crmLeads.status, args.status));
        }
        const results = await queryBuilder.limit(limit);
        return {
            count: results.length,
            leads: results.map(lead => ({
                id: lead.id,
                firstName: lead.firstName,
                lastName: lead.lastName,
                email: lead.email,
                phone: lead.phone,
                status: lead.status,
                source: lead.source,
                notes: lead.notes,
                createdAt: lead.createdAt
            }))
        };
    }
};
(0, ToolBus_1.registerTool)(def);
exports.default = def;
