"use strict";
/**
 * Invoice Create Tool
 * Tier 2: Medium-risk safe write
 *
 * Creates a new invoice draft
 * Requires confirmation in auto_safe mode
 */
Object.defineProperty(exports, "__esModule", { value: true });
const zod_1 = require("zod");
const ToolBus_1 = require("../core/ToolBus");
const db_1 = require("../../../server/db");
const schema_1 = require("../../../shared/schema");
const crypto_1 = require("crypto");
// Zod schema
const params = zod_1.z.object({
    clientId: zod_1.z.string().uuid("Valid client ID required"),
    items: zod_1.z.array(zod_1.z.object({
        description: zod_1.z.string(),
        quantity: zod_1.z.number().int().min(1).default(1),
        unitPrice: zod_1.z.number().min(0),
        amount: zod_1.z.number().min(0).optional() // Auto-calculated if not provided
    })).min(1, "At least one invoice item required"),
    dueDate: zod_1.z.string().optional(), // ISO date string
    notes: zod_1.z.string().optional(),
    taxRate: zod_1.z.number().min(0).max(100).default(0).optional(), // percentage
    __confirm: zod_1.z.boolean().optional()
});
// Tool definition
const def = {
    name: "invoices_create",
    description: "Create a new invoice draft for a client. The invoice will be created in 'draft' status and can be sent later.",
    parameters: params,
    authz: ["INV_WRITE"],
    risk: "medium", // Creating invoices requires confirmation
    handler: async (ctx, args) => {
        // Calculate totals
        let subtotal = 0;
        const processedItems = args.items.map(item => {
            const amount = item.amount || (item.quantity * item.unitPrice);
            subtotal += amount;
            return {
                ...item,
                amount
            };
        });
        const taxRate = args.taxRate || 0;
        const taxAmount = subtotal * (taxRate / 100);
        const totalAmount = subtotal + taxAmount;
        // Parse due date or default to 30 days from now
        const dueDate = args.dueDate
            ? new Date(args.dueDate)
            : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        // In dry-run mode, just simulate
        if (ctx.dryRun) {
            return {
                success: true,
                simulated: true,
                message: `Invoice creation simulated. Total: €${totalAmount.toFixed(2)}`,
                invoiceId: "inv_simulated_" + (0, crypto_1.randomUUID)()
            };
        }
        // Generate invoice number (simple incrementing format)
        const year = new Date().getFullYear();
        const invoiceNumber = `INV-${year}-${Date.now().toString().slice(-6)}`;
        // Create invoice
        const invoiceId = (0, crypto_1.randomUUID)();
        await db_1.db.insert(schema_1.crmInvoices).values({
            id: invoiceId,
            clientId: args.clientId,
            invoiceNumber,
            status: "draft",
            subtotal: subtotal.toFixed(2),
            taxAmount: taxAmount.toFixed(2),
            totalAmount: totalAmount.toFixed(2),
            dueDate,
            issueDate: new Date(),
            notes: args.notes || null,
            createdAt: new Date(),
            updatedAt: new Date()
        });
        // Create invoice items
        for (const item of processedItems) {
            await db_1.db.insert(schema_1.crmInvoiceItems).values({
                id: (0, crypto_1.randomUUID)(),
                invoiceId,
                description: item.description,
                quantity: item.quantity,
                unitPrice: item.unitPrice.toFixed(2),
                amount: item.amount.toFixed(2),
                createdAt: new Date()
            });
        }
        return {
            success: true,
            invoiceId,
            invoiceNumber,
            message: `Invoice ${invoiceNumber} created successfully. Total: €${totalAmount.toFixed(2)}`,
            summary: {
                itemCount: processedItems.length,
                subtotal: subtotal.toFixed(2),
                tax: taxAmount.toFixed(2),
                total: totalAmount.toFixed(2),
                dueDate: dueDate.toISOString(),
                status: "draft"
            }
        };
    }
};
(0, ToolBus_1.registerTool)(def);
exports.default = def;
