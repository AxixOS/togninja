"use strict";
/**
 * Invoices List Tool
 * Tier 1: Low-risk read-only tool
 *
 * Lists invoices with optional filtering
 */
Object.defineProperty(exports, "__esModule", { value: true });
const zod_1 = require("zod");
const ToolBus_1 = require("../core/ToolBus");
const db_1 = require("../../../server/db");
const schema_1 = require("../../../shared/schema");
const drizzle_orm_1 = require("drizzle-orm");
// Zod schema
const params = zod_1.z.object({
    clientId: zod_1.z.string().uuid().optional(),
    status: zod_1.z.enum(["draft", "sent", "paid", "overdue", "cancelled"]).optional(),
    limit: zod_1.z.number().int().min(1).max(100).default(20).optional()
});
// Tool definition
const def = {
    name: "invoices_list",
    description: "List invoices, optionally filtered by client or status. Returns invoice records sorted by most recent first.",
    parameters: params,
    authz: ["INV_READ"],
    risk: "low",
    handler: async (ctx, args) => {
        const limit = args.limit || 20;
        // Build query
        let query = db_1.db
            .select()
            .from(schema_1.crmInvoices)
            .where((0, drizzle_orm_1.eq)(schema_1.crmInvoices.studioId, ctx.studioId))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.crmInvoices.createdAt));
        // Filter by client if provided
        if (args.clientId) {
            query = query.where((0, drizzle_orm_1.eq)(schema_1.crmInvoices.clientId, args.clientId));
        }
        // Filter by status if provided
        if (args.status) {
            query = query.where((0, drizzle_orm_1.eq)(schema_1.crmInvoices.status, args.status));
        }
        const results = await query.limit(limit);
        return {
            count: results.length,
            invoices: results.map(invoice => ({
                id: invoice.id,
                invoiceNumber: invoice.invoiceNumber,
                clientId: invoice.clientId,
                status: invoice.status,
                totalAmount: invoice.totalAmount,
                dueDate: invoice.dueDate,
                issueDate: invoice.issueDate,
                paidAt: invoice.paidAt,
                createdAt: invoice.createdAt
            }))
        };
    }
};
(0, ToolBus_1.registerTool)(def);
exports.default = def;
