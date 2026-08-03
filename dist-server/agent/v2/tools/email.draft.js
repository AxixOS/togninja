"use strict";
/**
 * Email Draft Tool
 * Tier 2: Medium-risk safe write
 *
 * Composes an email draft without sending it
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
    to: zod_1.z.string().email("Valid email address required"),
    subject: zod_1.z.string().min(1, "Subject is required"),
    body: zod_1.z.string().min(1, "Email body is required"),
    cc: zod_1.z.string().email().optional(),
    bcc: zod_1.z.string().email().optional(),
    clientId: zod_1.z.string().uuid().optional(),
    __confirm: zod_1.z.boolean().optional() // Confirmation flag for guardrails
});
// Tool definition
const def = {
    name: "email_draft",
    description: "Compose a new email draft. The email will be saved as a draft and NOT sent automatically. Use this to prepare emails for review.",
    parameters: params,
    authz: ["EMAIL_SEND"], // Requires email permission even for drafts
    risk: "medium", // Requires confirmation in auto_safe mode
    handler: async (ctx, args) => {
        // In dry-run mode, just simulate
        if (ctx.dryRun) {
            return {
                success: true,
                simulated: true,
                message: "Email draft created (simulated)",
                draftId: "draft_simulated_" + (0, crypto_1.randomUUID)()
            };
        }
        // Create draft in database
        const draftId = (0, crypto_1.randomUUID)();
        await db_1.db.insert(schema_1.crmMessages).values({
            id: draftId,
            clientId: args.clientId || null,
            type: "email",
            direction: "outbound",
            subject: args.subject,
            body: args.body,
            to: args.to,
            cc: args.cc || null,
            bcc: args.bcc || null,
            status: "draft",
            sentAt: null,
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
(0, ToolBus_1.registerTool)(def);
exports.default = def;
