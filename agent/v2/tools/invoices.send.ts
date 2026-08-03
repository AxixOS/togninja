/**
 * Invoice Send Tool
 * Tier 3: HIGH-RISK action
 * 
 * Sends an invoice to a client via email
 * ALWAYS requires confirmation
 */

import { z } from "zod";
import { registerTool } from "../core/ToolBus";
import { ToolDef, ToolContext } from "../core/Types";
import { db } from "../../../server/db";
import { crmInvoices, crmClients, crmInvoiceItems } from "../../../shared/schema";
import { eq } from "drizzle-orm";
import { EnhancedEmailService } from "../../../server/services/enhancedEmailService";

// Zod schema
const params = z.object({
  invoiceId: z.string().uuid("Valid invoice ID required"),
  customMessage: z.string().optional(), // Optional custom message to include in email
  __confirm: z.boolean().optional() // MUST be true to execute
});

// Tool definition
const def: ToolDef<typeof params> = {
  name: "invoices_send",
  description: "Send an invoice to a client via email. The invoice status will be updated to 'sent' and the client will receive the invoice.",
  parameters: params,
  authz: ["INV_WRITE", "EMAIL_SEND"],
  risk: "high", // ALWAYS requires confirmation - financial impact
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
      throw new Error(`Invoice ${invoice.invoiceNumber} is already paid`);
    }
    
    // Get client
    const [client] = await db
      .select()
      .from(crmClients)
      .where(eq(crmClients.id, invoice.clientId))
      .limit(1);
    
    if (!client) {
      throw new Error(`Client not found for invoice ${invoice.invoiceNumber}`);
    }
    
    // Get invoice items
    const items = await db
      .select()
      .from(crmInvoiceItems)
      .where(eq(crmInvoiceItems.invoiceId, invoice.id));
    
    // In dry-run mode, DO NOT SEND
    if (ctx.dryRun) {
      return {
        success: true,
        simulated: true,
        message: `Invoice send simulated. Would send ${invoice.invoiceNumber} (€${invoice.total}) to ${client.email}`,
        warning: "This was a simulation - no invoice was actually sent"
      };
    }
    
    // Build email content
    const itemsHtml = items.map(item => `
      <tr>
        <td>${item.description}</td>
        <td>${item.quantity}</td>
        <td>€${item.unitPrice}</td>
        <td>€${item.amount}</td>
      </tr>
    `).join('');
    
    const emailBody = `
      <h2>Invoice ${invoice.invoiceNumber}</h2>
      <p>Dear ${client.firstName} ${client.lastName},</p>
      
      ${args.customMessage ? `<p>${args.customMessage}</p>` : ''}
      
      <p>Please find your invoice details below:</p>
      
      <table border="1" cellpadding="10" style="border-collapse: collapse;">
        <thead>
          <tr>
            <th>Description</th>
            <th>Quantity</th>
            <th>Unit Price</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="3"><strong>Subtotal</strong></td>
            <td><strong>€${invoice.subtotal}</strong></td>
          </tr>
          ${invoice.taxAmount && parseFloat(invoice.taxAmount) > 0 ? `
          <tr>
            <td colspan="3">Tax</td>
            <td>€${invoice.taxAmount}</td>
          </tr>
          ` : ''}
          <tr>
            <td colspan="3"><strong>Total</strong></td>
            <td><strong>€${invoice.total}</strong></td>
          </tr>
        </tfoot>
      </table>
      
      <p>
        <strong>Due Date:</strong> ${invoice.dueDate?.toLocaleDateString()}<br>
        ${invoice.notes ? `<strong>Notes:</strong> ${invoice.notes}` : ''}
      </p>
      
      <p>Thank you for your business!</p>
    `;
    
    try {
      await EnhancedEmailService.sendEmail({
        to: client.email,
        subject: `Invoice ${invoice.invoiceNumber}`,
        content: `Invoice ${invoice.invoiceNumber} - Total: €${invoice.total}`,
        html: emailBody
      });
      
      // Update invoice status
      await db
        .update(crmInvoices)
        .set({
          status: "sent",
          sentAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(crmInvoices.id, invoice.id));
      
      return {
        success: true,
        message: `Invoice ${invoice.invoiceNumber} sent successfully to ${client.email}`,
        invoiceNumber: invoice.invoiceNumber,
        sentTo: client.email,
        amount: invoice.totalAmount,
        sentAt: new Date().toISOString()
      };
      
    } catch (error: any) {
      console.error("[invoices.send] Failed to send invoice:", error);
      throw new Error(`Failed to send invoice: ${error.message}`);
    }
  }
};

registerTool(def);

export default def;
