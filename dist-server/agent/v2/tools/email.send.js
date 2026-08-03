"use strict";
/**
 * Email Send Tool
 * Tier 3: HIGH-RISK action
 *
 * Actually sends an email to a recipient
 * ALWAYS requires confirmation, even in auto_full mode
 */
Object.defineProperty(exports, "__esModule", { value: true });
const zod_1 = require("zod");
const ToolBus_1 = require("../core/ToolBus");
const db_1 = require("../../../server/db");
const schema_1 = require("../../../shared/schema");
const drizzle_orm_1 = require("drizzle-orm");
const enhancedEmailService_1 = require("../../../server/services/enhancedEmailService");
// Zod schema
const params = zod_1.z.object({
    draftId: zod_1.z.string().uuid().optional(), // Send existing draft
    to: zod_1.z.string().email("Valid email address required").optional(),
    subject: zod_1.z.string().min(1, "Subject is required").optional(),
    body: zod_1.z.string().min(1, "Email body is required").optional(),
    cc: zod_1.z.string().email().optional(),
    bcc: zod_1.z.string().email().optional(),
    clientId: zod_1.z.string().uuid().optional(),
    __confirm: zod_1.z.boolean().optional() // MUST be true to execute
});
// Tool definition
const def = {
    name: "email_send",
    description: "Send an email immediately. This action cannot be undone. Either provide draftId to send an existing draft, or provide to/subject/body to send directly.",
    parameters: params,
    authz: ["EMAIL_SEND"],
    risk: "high", // ALWAYS requires confirmation
    handler: async (ctx, args) => {
        let emailData;
        // Load from draft if draftId provided
        if (args.draftId) {
            const [draft] = await db_1.db
                .select()
                .from(schema_1.crmMessages)
                .where((0, drizzle_orm_1.eq)(schema_1.crmMessages.id, args.draftId))
                .limit(1);
            if (!draft) {
                throw new Error(`Draft not found: ${args.draftId}`);
            }
            if (draft.status !== "draft") {
                throw new Error(`Email ${args.draftId} is not a draft (status: ${draft.status})`);
            }
            emailData = {
                to: draft.to,
                subject: draft.subject,
                body: draft.body,
                cc: draft.cc,
                bcc: draft.bcc,
                clientId: draft.clientId
            };
        }
        else {
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
            await enhancedEmailService_1.EnhancedEmailService.sendEmail({
                to: emailData.to,
                subject: emailData.subject,
                content: emailData.body,
                html: emailData.body
            });
            // Update draft status if sending from draft
            if (args.draftId) {
                await db_1.db
                    .update(schema_1.crmMessages)
                    .set({
                    status: "sent",
                    sentAt: new Date(),
                    updatedAt: new Date()
                })
                    .where((0, drizzle_orm_1.eq)(schema_1.crmMessages.id, args.draftId));
            }
            else {
                // Create new message record
                await db_1.db.insert(schema_1.crmMessages).values({
                    clientId: emailData.clientId || null,
                    type: "email",
                    direction: "outbound",
                    subject: emailData.subject,
                    body: emailData.body,
                    to: emailData.to,
                    cc: emailData.cc || null,
                    bcc: emailData.bcc || null,
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
        }
        catch (error) {
            // Log failure but don't crash
            console.error("[email.send] Failed to send email:", error);
            throw new Error(`Failed to send email: ${error.message}`);
        }
    }
};
(0, ToolBus_1.registerTool)(def);
exports.default = def;
