/**
 * Invoice Mark Paid Tool
 * Tier 3: HIGH-RISK action
 * 
 * Marks an invoice as paid - financial transaction
 * ALWAYS requires confirmation
 */

import { z } from "zod";
import { registerTool } from "../core/ToolBus";
import { ToolDef, ToolContext } from "../core/Types";
import { db } from "../../../server/db";
import { crmInvoices, crmInvoicePayments } from "../../../shared/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

// Zod schema
const params = z.object({
  invoiceId: z.string().uuid("Valid invoice ID required"),
  paymentMethod: z.enum(["cash", "bank_transfer", "credit_card", "paypal", "stripe", "other"]).default("bank_transfer"),
  paymentDate: z.string().optional(), // ISO date, defaults to now
  notes: z.string().optional(),
  __confirm: z.boolean().optional() // MUST be true to execute
});

// Tool definition
const def: ToolDef<typeof params> = {
  name: "invoices_mark_paid",
  description: "Mark an invoice as paid. This is a financial transaction and cannot be easily undone. Records payment in the system.",
  parameters: params,
  authz: ["INV_WRITE", "ADMIN"], // Requires admin scope - financial action
  risk: "high", // ALWAYS requires confirmation
  handler: async (ctx: ToolContext, args: z.infer<typeof params>) => {
    // Get invoice
    const [invoice] = await db
      .select()
      .from(crmInvoices)
      .where(eq(crmInvoices.id, args.invoiceId))
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
        message: `Invoice mark paid simulated. Would mark ${invoice.invoiceNumber} (€${invoice.total}) as paid`,
        warning: "This was a simulation - invoice status was not actually changed"
      };
    }
    
    // Record payment
    await db.insert(crmInvoicePayments).values({
      id: randomUUID(),
      invoiceId: invoice.id,
      amount: invoice.total,
      paymentMethod: args.paymentMethod,
      paymentDate,
      notes: args.notes || null,
      createdBy: null
    });
    
    // Update invoice status
    await db
      .update(crmInvoices)
      .set({
        status: "paid",
        paidDate: paymentDate,
        updatedAt: new Date()
      })
      .where(eq(crmInvoices.id, invoice.id));
    
    return {
      success: true,
      message: `Invoice ${invoice.invoiceNumber} marked as paid. Amount: €${invoice.total}`,
      invoiceNumber: invoice.invoiceNumber,
      amount: invoice.total,
      paymentMethod: args.paymentMethod,
      paidAt: paymentDate.toISOString()
    };
  }
};

registerTool(def);

export default def;
