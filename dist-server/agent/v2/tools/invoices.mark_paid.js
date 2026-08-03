"use strict";
/**
 * Invoice Mark Paid Tool
 * Tier 3: HIGH-RISK action
 *
 * Marks an invoice as paid - financial transaction
 * ALWAYS requires confirmation
 */
Object.defineProperty(exports, "__esModule", { value: true });
const zod_1 = require("zod");
const ToolBus_1 = require("../core/ToolBus");
const db_1 = require("../../../server/db");
const schema_1 = require("../../../shared/schema");
const drizzle_orm_1 = require("drizzle-orm");
const crypto_1 = require("crypto");
// Zod schema
const params = zod_1.z.object({
    invoiceId: zod_1.z.string().uuid("Valid invoice ID required"),
    paymentMethod: zod_1.z.enum(["cash", "bank_transfer", "credit_card", "paypal", "stripe", "other"]).default("bank_transfer"),
    paymentDate: zod_1.z.string().optional(), // ISO date, defaults to now
    notes: zod_1.z.string().optional(),
    __confirm: zod_1.z.boolean().optional() // MUST be true to execute
});
// Tool definition
const def = {
    name: "invoices_mark_paid",
    description: "Mark an invoice as paid. This is a financial transaction and cannot be easily undone. Records payment in the system.",
    parameters: params,
    authz: ["INV_WRITE", "ADMIN"], // Requires admin scope - financial action
    risk: "high", // ALWAYS requires confirmation
    handler: async (ctx, args) => {
        // Get invoice
        const [invoice] = await db_1.db
            .select()
            .from(schema_1.crmInvoices)
            .where((0, drizzle_orm_1.eq)(schema_1.crmInvoices.id, args.invoiceId))
            .limit(1);
        if (!invoice) {
            throw new Error(`Invoice not found: ${args.invoiceId}`);
        }
        if (invoice.status === "paid") {
            throw new Error(`Invoice ${invoice.invoiceNumber} is already marked as paid`);
        }
        if (invoice.status === "cancelled") {
            throw new Error(`Cannot mark cancelled invoice ${invoice.invoiceNumber} as paid`);
        }
        const paymentDate = args.paymentDate ? new Date(args.paymentDate) : new Date();
        // In dry-run mode, DO NOT EXECUTE
        if (ctx.dryRun) {
            return {
                success: true,
                simulated: true,
                message: `Invoice mark paid simulated. Would mark ${invoice.invoiceNumber} (€${invoice.totalAmount}) as paid`,
                warning: "This was a simulation - invoice status was not actually changed"
            };
        }
        // Record payment
        await db_1.db.insert(schema_1.crmInvoicePayments).values({
            id: (0, crypto_1.randomUUID)(),
            invoiceId: invoice.id,
            amount: invoice.totalAmount,
            paymentMethod: args.paymentMethod,
            paymentDate,
            notes: args.notes || null,
            createdAt: new Date()
        });
        // Update invoice status
        await db_1.db
            .update(schema_1.crmInvoices)
            .set({
            status: "paid",
            paidAt: paymentDate,
            updatedAt: new Date()
        })
            .where((0, drizzle_orm_1.eq)(schema_1.crmInvoices.id, invoice.id));
        return {
            success: true,
            message: `Invoice ${invoice.invoiceNumber} marked as paid. Amount: €${invoice.totalAmount}`,
            invoiceNumber: invoice.invoiceNumber,
            amount: invoice.totalAmount,
            paymentMethod: args.paymentMethod,
            paidAt: paymentDate.toISOString()
        };
    }
};
(0, ToolBus_1.registerTool)(def);
exports.default = def;
