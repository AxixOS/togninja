"use strict";
/**
 * Agent V2 Tool: Design & Create Custom Workflow
 *
 * Risk: medium (creates automation that will send emails)
 * Scopes: CRM_WRITE, EMAIL_SEND
 *
 * Allows the Agent to DESIGN and CREATE a brand new workflow template
 * based on natural language description from the user.
 * This solves the problem of users wanting custom automations that
 * don't match pre-existing templates.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const zod_1 = require("zod");
const ToolBus_1 = require("../core/ToolBus");
const db_1 = require("../../../server/db");
const schema_1 = require("@shared/schema");
const crypto_1 = require("crypto");
// Step definition for workflow
const workflowStepSchema = zod_1.z.object({
    stepType: zod_1.z.enum(['send_email', 'wait', 'condition_check', 'create_task', 'update_field', 'send_sms']),
    name: zod_1.z.string().describe('Human-readable name for this step'),
    delayDays: zod_1.z.number().optional().describe('Days to wait before this step (for wait steps or delay before action)'),
    delayHours: zod_1.z.number().optional().describe('Hours to wait'),
    emailSubject: zod_1.z.string().optional().describe('Email subject line (for send_email steps)'),
    emailBody: zod_1.z.string().optional().describe('Email body HTML (for send_email steps). Use {{client_name}}, {{photographer_name}}, {{booking_date}} etc.'),
    condition: zod_1.z.string().optional().describe('Condition to check (for condition_check steps)'),
    taskTitle: zod_1.z.string().optional().describe('Task title (for create_task steps)'),
});
// Zod schema for parameter validation
const params = zod_1.z.object({
    workflowName: zod_1.z.string().describe('Name for this new workflow template (e.g., "Post-Invoice Follow-Up Sequence")'),
    description: zod_1.z.string().describe('Description of what this workflow does'),
    triggerEvent: zod_1.z.enum([
        'invoice_sent',
        'invoice_paid',
        'new_client',
        'booking_confirmed',
        'gallery_uploaded',
        'lead_created',
        'session_completed',
        'manual'
    ]).describe('The CRM event that triggers this workflow'),
    steps: zod_1.z.array(workflowStepSchema).min(1).describe('Array of workflow steps in order'),
    isActive: zod_1.z.boolean().default(true).describe('Whether to activate the workflow immediately'),
});
// Tool definition
const def = {
    name: 'workflow_design',
    description: `Design and create a completely new custom workflow template from scratch.
    
Use this when:
- User describes a workflow that doesn't match existing templates
- User wants a custom email sequence or automation
- User asks to "set up" or "create" a new automated process

This tool creates:
1. A new workflow template in the database
2. All the steps (email, wait, task, etc.)
3. Email templates for any email steps
4. Optionally activates it immediately

Example triggers:
- invoice_sent: Workflow starts when any invoice is sent
- invoice_paid: Workflow starts when invoice marked paid
- new_client: Workflow starts when client created
- booking_confirmed: Workflow starts when booking confirmed
- gallery_uploaded: Workflow starts when photos uploaded
- session_completed: Workflow starts when session marked complete
- manual: Workflow must be started manually

Example step types:
- send_email: Send an email using a template
- wait: Wait X days/hours before next step
- condition_check: Check a condition before proceeding
- create_task: Create a task for the photographer
- update_field: Update a client/lead field

The workflow runs AUTOMATICALLY when the trigger event occurs - no manual action needed!`,
    parameters: params,
    authz: ['CRM_WRITE', 'EMAIL_SEND'],
    risk: 'medium',
    handler: async (ctx, args) => {
        try {
            ctx.log(`📧 Designing new workflow: ${args.workflowName}`);
            ctx.log(`   Trigger: ${args.triggerEvent}`);
            ctx.log(`   Steps: ${args.steps.length}`);
            // Generate IDs
            const templateId = (0, crypto_1.randomUUID)();
            // Create the workflow template
            const [template] = await db_1.db
                .insert(schema_1.workflowTemplates)
                .values({
                id: templateId,
                name: args.workflowName,
                description: args.description,
                triggerEvent: args.triggerEvent,
                isActive: args.isActive,
                isSystem: false, // User-created template
                createdAt: new Date(),
                updatedAt: new Date(),
            })
                .returning();
            ctx.log(`✅ Created workflow template: ${template.id}`);
            // Create steps and email templates
            const createdSteps = [];
            let stepOrder = 0;
            for (const step of args.steps) {
                stepOrder++;
                let emailTemplateId = null;
                // If this is an email step, create the email template first
                if (step.stepType === 'send_email' && step.emailSubject && step.emailBody) {
                    const [emailTemplate] = await db_1.db
                        .insert(schema_1.workflowEmailTemplates)
                        .values({
                        id: (0, crypto_1.randomUUID)(),
                        name: `${args.workflowName} - ${step.name}`,
                        subject: step.emailSubject,
                        htmlContent: step.emailBody,
                        textContent: step.emailBody.replace(/<[^>]*>/g, ''), // Strip HTML for text version
                        variables: ['client_name', 'photographer_name', 'booking_date', 'invoice_amount', 'gallery_link'],
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    })
                        .returning();
                    emailTemplateId = emailTemplate.id;
                    ctx.log(`   📝 Created email template: ${step.name}`);
                }
                // Calculate delay in minutes
                const delayMinutes = ((step.delayDays || 0) * 24 * 60) + ((step.delayHours || 0) * 60);
                // Create the workflow step
                const [createdStep] = await db_1.db
                    .insert(schema_1.workflowSteps)
                    .values({
                    id: (0, crypto_1.randomUUID)(),
                    workflowTemplateId: templateId,
                    stepOrder,
                    stepType: step.stepType,
                    name: step.name,
                    emailTemplateId,
                    delayMinutes: delayMinutes > 0 ? delayMinutes : null,
                    conditionLogic: step.condition || null,
                    taskTitle: step.taskTitle || null,
                    isActive: true,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                })
                    .returning();
                createdSteps.push({
                    order: stepOrder,
                    name: step.name,
                    type: step.stepType,
                    delay: delayMinutes > 0 ? `${step.delayDays || 0}d ${step.delayHours || 0}h` : 'immediate',
                });
                ctx.log(`   ✅ Step ${stepOrder}: ${step.name} (${step.stepType})`);
            }
            // Generate summary
            const summary = `
🎉 **Workflow Created Successfully!**

**Name:** ${args.workflowName}
**Trigger:** When "${args.triggerEvent}" event occurs
**Status:** ${args.isActive ? '✅ Active' : '⏸️ Paused'}

**Steps:**
${createdSteps.map(s => `${s.order}. ${s.name} (${s.type}) - ${s.delay}`).join('\n')}

The workflow will automatically start whenever the trigger event occurs in your CRM. No manual action needed!
`;
            return {
                success: true,
                templateId: template.id,
                workflowName: args.workflowName,
                triggerEvent: args.triggerEvent,
                stepsCreated: createdSteps.length,
                isActive: args.isActive,
                steps: createdSteps,
                message: summary,
            };
        }
        catch (error) {
            ctx.log(`❌ Error creating workflow: ${error.message}`);
            throw new Error(`Failed to create workflow: ${error.message}`);
        }
    }
};
// Register with ToolBus
(0, ToolBus_1.registerTool)(def);
exports.default = def;
