"use strict";
/**
 * Client Update Tool
 * Tier 2: Medium-risk safe write
 *
 * Updates an existing client record
 * Requires confirmation in auto_safe mode
 */
Object.defineProperty(exports, "__esModule", { value: true });
const zod_1 = require("zod");
const ToolBus_1 = require("../core/ToolBus");
const db_1 = require("../../../server/db");
const schema_1 = require("../../../shared/schema");
const drizzle_orm_1 = require("drizzle-orm");
// Zod schema - all fields optional except clientId
const params = zod_1.z.object({
    clientId: zod_1.z.string().uuid("Valid client ID required"),
    firstName: zod_1.z.string().optional(),
    lastName: zod_1.z.string().optional(),
    email: zod_1.z.string().email().optional(),
    phone: zod_1.z.string().optional(),
    address: zod_1.z.string().optional(),
    city: zod_1.z.string().optional(),
    state: zod_1.z.string().optional(),
    zip: zod_1.z.string().optional(),
    company: zod_1.z.string().optional(),
    notes: zod_1.z.string().optional(),
    status: zod_1.z.enum(["active", "inactive", "archived"]).optional(),
    __confirm: zod_1.z.boolean().optional()
});
// Tool definition
const def = {
    name: "clients_update",
    description: "Update an existing client's information. Only provided fields will be updated, others remain unchanged.",
    parameters: params,
    authz: ["CRM_WRITE"],
    risk: "medium", // Modifying client data requires confirmation
    handler: async (ctx, args) => {
        const { clientId, __confirm, ...updates } = args;
        // Check if client exists
        const [existingClient] = await db_1.db
            .select()
            .from(schema_1.crmClients)
            .where((0, drizzle_orm_1.eq)(schema_1.crmClients.id, clientId))
            .limit(1);
        if (!existingClient) {
            throw new Error(`Client not found: ${clientId}`);
        }
        // In dry-run mode, just simulate
        if (ctx.dryRun) {
            return {
                success: true,
                simulated: true,
                message: `Client update simulated for ${existingClient.firstName} ${existingClient.lastName}`,
                updates
            };
        }
        // Perform update
        await db_1.db
            .update(schema_1.crmClients)
            .set({
            ...updates,
            updatedAt: new Date()
        })
            .where((0, drizzle_orm_1.eq)(schema_1.crmClients.id, clientId));
        // Get updated client
        const [updatedClient] = await db_1.db
            .select()
            .from(schema_1.crmClients)
            .where((0, drizzle_orm_1.eq)(schema_1.crmClients.id, clientId));
        return {
            success: true,
            message: `Client updated successfully: ${updatedClient.firstName} ${updatedClient.lastName}`,
            clientId,
            updatedFields: Object.keys(updates),
            client: {
                id: updatedClient.id,
                name: `${updatedClient.firstName} ${updatedClient.lastName}`,
                email: updatedClient.email,
                phone: updatedClient.phone,
                status: updatedClient.status
            }
        };
    }
};
(0, ToolBus_1.registerTool)(def);
exports.default = def;
