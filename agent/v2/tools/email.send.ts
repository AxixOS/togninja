/**
 * Email Send Tool
 * Tier 3: HIGH-RISK action
 * 
 * Actually sends an email to a recipient
 * ALWAYS requires confirmation, even in auto_full mode
 */

import { z } from "zod";
import { registerTool } from "../core/ToolBus";
import { ToolDef, ToolContext } from "../core/Types";
import { db } from "../../../server/db";
import { crmMessages } from "../../../shared/schema";
import { eq } from "drizzle-orm";
import { EnhancedEmailService } from "../../../server/services/enhancedEmailService";

// Zod schema
const params = z.object({
  draftId: z.string().uuid().optional(), // Send existing draft
  to: z.string().email("Valid email address required").optional(),
  subject: z.string().min(1, "Subject is required").optional(),
  body: z.string().min(1, "Email body is required").optional(),
  cc: z.string().email().optional(),
  bcc: z.string().email().optional(),
  clientId: z.string().uuid().optional(),
  __confirm: z.boolean().optional() // MUST be true to execute
});

// Tool definition
const def: ToolDef<typeof params> = {
  name: "email_send",
  description: "Send an email immediately. This action cannot be undone. Either provide draftId to send an existing draft, or provide to/subject/body to send directly.",
  parameters: params,
  authz: ["EMAIL_SEND"],
  risk: "high", // ALWAYS requires confirmation
  handler: async (ctx: ToolContext, args: z.infer<typeof params>) => {
    let emailData: any;
    
    // Load from draft if draftId provided
    if (args.draftId) {
      const [draft] = await db
        .select()
        .from(crmMessages)
        .where(eq(crmMessages.id, args.draftId))
        .limit(1);
      
      if (!draft) {
        throw new Error(`Draft not found: ${args.draftId}`);
      }
      
      if (draft.status !== "draft") {
        throw new Error(`Email ${args.draftId} is not a draft (status: ${draft.status})`);
      }
      
      // Was draft.to / draft.body / draft.cc / draft.bcc. NONE of those columns exist on
      // crm_messages — the real ones are recipient_email and content, and there are no cc
      // or bcc columns at all. Sending a saved draft would have addressed the email to
      // `undefined`.
      emailData = {
        to: draft.recipientEmail!,
        subject: draft.subject!,
        body: draft.content!,
        cc: null,
        bcc: null,
        clientId: draft.clientId
      };
    } else {
      // Use provided data
      if (!args.to || !args.subject || !args.body) {
        throw new Error("Either draftId or (to, subject, body) must be provided");
      }
      
      emailData = {
        to: args.to,
        subject: args.subject,
        body: args.body,
        cc: args.cc,
        bcc: args.bcc,
        clientId: args.clientId
      };
    }
    
    // In dry-run mode, DO NOT SEND
    if (ctx.dryRun) {
      return {
        success: true,
        simulated: true,
        message: `Email send simulated. Would send to: ${emailData.to}`,
        warning: "This was a simulation - no email was actually sent"
      };
    }
    
    try {
      await EnhancedEmailService.sendEmail({
        to: emailData.to,
        subject: emailData.subject,
        content: emailData.body,
        html: emailData.body
      });
      
      // Update draft status if sending from draft
      if (args.draftId) {
        await db
          .update(crmMessages)
          .set({
            status: "sent",
            sentAt: new Date(),
            updatedAt: new Date()
          })
          .where(eq(crmMessages.id, args.draftId));
      } else {
        // Create new message record
        // type / body / to / cc / bcc are not columns on crm_messages. Drizzle resolves
        // a values() key against the model and throws "Cannot read properties of
        // undefined (reading 'name')" on an unknown one, so this insert could only ever
        // have failed. Real columns, plus the two NOT NULL sender fields.
        const { getSenderIdentity } = await import("../lib/senderIdentity");
        const sender = await getSenderIdentity();
        await db.insert(crmMessages).values({
          senderName: sender.name || "Studio",
          senderEmail: sender.email || emailData.to,
          clientId: emailData.clientId || null,
          messageType: "email",
          direction: "outbound",
          subject: emailData.subject,
          content: emailData.body,
          recipientEmail: emailData.to,
          status: "sent",
          sentAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
      
      return {
        success: true,
        message: `Email sent successfully to ${emailData.to}`,
        sentTo: emailData.to,
        subject: emailData.subject,
        sentAt: new Date().toISOString()
      };
      
    } catch (error: any) {
      // Log failure but don't crash
      console.error("[email.send] Failed to send email:", error);
      throw new Error(`Failed to send email: ${error.message}`);
    }
  }
};

registerTool(def);

export default def;
