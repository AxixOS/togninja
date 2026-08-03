"use strict";
/**
 * Agent V2 Tool: Create Workflow from Template
 *
 * Risk: medium (creates automation that will send emails)
 * Scopes: CRM_WRITE, EMAIL_SEND
 *
 * Allows the Agent to create a workflow instance from a pre-defined template.
 * The workflow can be triggered manually or automatically based on CRM events.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const zod_1 = require("zod");
const ToolBus_1 = require("../core/ToolBus");
const db_1 = require("../../../server/db");
const schema_1 = require("@shared/schema");
const drizzle_orm_1 = require("drizzle-orm");
// Zod schema for parameter validation
const params = zod_1.z.object({
    templateName: zod_1.z.string().describe('Name of the workflow template (e.g., "Welcome Email Sequence", "Invoice Reminder")'),
    clientId: zod_1.z.string().optional().describe('Client ID if workflow is for a specific client'),
    leadId: zod_1.z.string().optional().describe('Lead ID if workflow is for a specific lead'),
    triggerType: zod_1.z.enum(['manual', 'new_client', 'booking_confirmed', 'invoice_sent', 'gallery_uploaded', 'time_based'])
        .default('manual')
        .describe('When this workflow should trigger automatically'),
    variables: zod_1.z.record(zod_1.z.any()).optional().describe('Custom variables for email templates (e.g., {photographer_name: "Anna"})')
});
// Tool definition
const def = {
    name: 'workflow_wizard_create',
    description: `Create a workflow instance from a pre-loaded template. 
    
Available templates:
- "Welcome Email Sequence" - Sends welcome email when new client signs up
- "Booking Follow-Up" - Sends preparation emails after booking confirmed
- "Invoice Reminder" - Automated reminders for unpaid invoices (Day 3, 7, 14)
- "Gallery Upload Notification" - Notifies client when photos are ready

Use this when photographer asks to set up email automation, reminders, or automated sequences.

Returns: Workflow instance ID and trigger configuration`,
    parameters: params,
    authz: ['CRM_WRITE', 'EMAIL_SEND'],
    risk: 'medium',
    handler: async (ctx, args) => {
        try {
            ctx.log(`📧 Creating workflow: ${args.templateName}`);
            // Find template by name
            const templates = await db_1.db
                .select()
                .from(schema_1.workflowTemplates)
                .where((0, drizzle_orm_1.eq)(schema_1.workflowTemplates.name, args.templateName));
            if (templates.length === 0) {
                // Try fuzzy match
                const allTemplates = await db_1.db.select().from(schema_1.workflowTemplates);
                const fuzzyMatch = allTemplates.find(t => t.name.toLowerCase().includes(args.templateName.toLowerCase()) ||
                    args.templateName.toLowerCase().includes(t.name.toLowerCase()));
                if (!fuzzyMatch) {
                    throw new Error(`Template not found: "${args.templateName}". Available: ${allTemplates.map(t => t.name).join(', ')}`);
                }
                templates[0] = fuzzyMatch;
            }
            const template = templates[0];
            // Create workflow instance
            const [instance] = await db_1.db
                .insert(schema_1.workflowInstances)
                .values({
                workflowTemplateId: template.id,
                clientId: args.clientId || null,
                leadId: args.leadId || null,
                status: 'active',
                triggerType: args.triggerType,
                variables: args.variables || {},
                createdAt: new Date(),
                updatedAt: new Date(),
            })
                .returning();
            const message = `Created workflow "${template.name}" with ${instance.triggerType} trigger. ${instance.triggerType === 'manual'
                ? 'Use workflow_wizard_activate to start it manually.'
                : `It will automatically trigger on ${instance.triggerType} events.`}`;
            ctx.log(message);
            return {
                instanceId: instance.id,
                templateName: template.name,
                triggerType: instance.triggerType,
                status: instance.status,
                message
            };
        }
        catch (error) {
            ctx.log(`❌ Workflow creation failed: ${error.message}`);
            throw new Error(`Failed to create workflow: ${error.message}`);
        }
    }
};
// Register the tool
(0, ToolBus_1.registerTool)(def);
exports.default = def;
