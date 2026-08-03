/**
 * Invoice Create Tool
 * Tier 2: Medium-risk safe write
 * 
 * Creates a new invoice draft
 * Requires confirmation in auto_safe mode
 */

import { z } from "zod";
import { registerTool } from "../core/ToolBus";
import { ToolDef, ToolContext } from "../core/Types";
import { db } from "../../../server/db";
import { crmInvoices, crmInvoiceItems } from "../../../shared/schema";
import { randomUUID } from "crypto";

// Zod schema
const params = z.object({
  clientId: z.string().uuid("Valid client ID required"),
  items: z.array(z.object({
    description: z.string(),
    quantity: z.number().int().min(1).default(1),
    unitPrice: z.number().min(0),
    amount: z.number().min(0).optional() // Auto-calculated if not provided
  })).min(1, "At least one invoice item required"),
  dueDate: z.string().optional(), // ISO date string
  notes: z.string().optional(),
  taxRate: z.number().min(0).max(100).default(0).optional(), // percentage
  __confirm: z.boolean().optional()
});

// Tool definition
const def: ToolDef<typeof params> = {
  name: "invoices_create",
  description: "Create a new invoice draft for a client. The invoice will be created in 'draft' status and can be sent later.",
  parameters: params,
  authz: ["INV_WRITE"],
  risk: "medium", // Creating invoices requires confirmation
  handler: async (ctx: ToolContext, args: z.infer<typeof params>) => {
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
        invoiceId: "inv_simulated_" + randomUUID()
      };
    }
    
    // Generate invoice number (simple incrementing format)
    const year = new Date().getFullYear();
    const invoiceNumber = `INV-${year}-${Date.now().toString().slice(-6)}`;
    
    // Create invoice
    const invoiceId = randomUUID();
    
    await db.insert(crmInvoices).values({
      id: invoiceId,
      clientId: args.clientId,
      invoiceNumber,
      status: "draft",
      subtotal: subtotal.toFixed(2),
      taxAmount: taxAmount.toFixed(2),
      total: totalAmount.toFixed(2),
      dueDate,
      issueDate: new Date(),
      notes: args.notes || null,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    // Create invoice items
    for (const item of processedItems) {
      await db.insert(crmInvoiceItems).values({
        id: randomUUID(),
        invoiceId,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice.toFixed(2),
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

registerTool(def);

export default def;
