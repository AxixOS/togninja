/**
 * Email Draft Tool
 * Tier 2: Medium-risk safe write
 * 
 * Composes an email draft without sending it
 * Requires confirmation in auto_safe mode
 */

import { z } from "zod";
import { registerTool } from "../core/ToolBus";
import { ToolDef, ToolContext } from "../core/Types";
import { db } from "../../../server/db";
import { crmMessages } from "../../../shared/schema";
import { randomUUID } from "crypto";

// Zod schema
const params = z.object({
  to: z.string().email("Valid email address required"),
  subject: z.string().min(1, "Subject is required"),
  body: z.string().min(1, "Email body is required"),
  cc: z.string().email().optional(),
  bcc: z.string().email().optional(),
  clientId: z.string().uuid().optional(),
  __confirm: z.boolean().optional() // Confirmation flag for guardrails
});

// Tool definition
const def: ToolDef<typeof params> = {
  name: "email_draft",
  description: "Compose a new email draft. The email will be saved as a draft and NOT sent automatically. Use this to prepare emails for review.",
  parameters: params,
  authz: ["EMAIL_SEND"], // Requires email permission even for drafts
  risk: "medium", // Requires confirmation in auto_safe mode
  handler: async (ctx: ToolContext, args: z.infer<typeof params>) => {
    // In dry-run mode, just simulate
    if (ctx.dryRun) {
      return {
        success: true,
        simulated: true,
        message: "Email draft created (simulated)",
        draftId: "draft_simulated_" + randomUUID()
      };
    }
    
    // Create draft in database
    const draftId = randomUUID();
    
    await db.insert(crmMessages).values({
      id: draftId,
      clientId: args.clientId || null,
      messageType: "email",
      direction: "outbound",
      subject: args.subject,
      content: args.body,
      recipientEmail: args.to,
      status: "draft",
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    return {
      success: true,
      draftId,
      message: `Email draft created successfully. To: ${args.to}, Subject: "${args.subject}"`,
      preview: {
        to: args.to,
        subject: args.subject,
        bodyPreview: args.body.substring(0, 100) + (args.body.length > 100 ? "..." : "")
      }
    };
  }
};

registerTool(def);

export default def;
