/**
 * Agent V2 Tool: Create Workflow from Template
 * 
 * Risk: medium (creates automation that will send emails)
 * Scopes: CRM_WRITE, EMAIL_SEND
 * 
 * Allows the Agent to create a workflow instance from a pre-defined template.
 * The workflow can be triggered manually or automatically based on CRM events.
 */

import { z } from 'zod';
import { registerTool } from '../core/ToolBus';
import { ToolDef, ToolContext } from '../core/Types';
import { db } from '../../../server/db';
import { workflowTemplates, workflowInstances } from '@shared/schema';
import { eq } from 'drizzle-orm';

// Zod schema for parameter validation
const params = z.object({
  templateName: z.string().describe('Name of the workflow template (e.g., "Welcome Email Sequence", "Invoice Reminder")'),
  clientId: z.string().optional().describe('Client ID if workflow is for a specific client'),
  leadId: z.string().optional().describe('Lead ID if workflow is for a specific lead'),
  triggerType: z.enum(['manual', 'new_client', 'booking_confirmed', 'invoice_sent', 'gallery_uploaded', 'time_based'])
    .default('manual')
    .describe('When this workflow should trigger automatically'),
  variables: z.record(z.any()).optional().describe('Custom variables for email templates (e.g., {photographer_name: "Anna"})')
});

// Tool definition
const def: ToolDef<typeof params> = {
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
  
  handler: async (ctx: ToolContext, args: z.infer<typeof params>) => {
    try {
      ctx.log(`📧 Creating workflow: ${args.templateName}`);

      // Find template by name
      const templates = await db
        .select()
        .from(workflowTemplates)
        .where(eq(workflowTemplates.name, args.templateName));

      if (templates.length === 0) {
        // Try fuzzy match
        const allTemplates = await db.select().from(workflowTemplates);
        const fuzzyMatch = allTemplates.find(t => 
          t.name.toLowerCase().includes(args.templateName.toLowerCase()) ||
          args.templateName.toLowerCase().includes(t.name.toLowerCase())
        );

        if (!fuzzyMatch) {
          throw new Error(`Template not found: "${args.templateName}". Available: ${allTemplates.map(t => t.name).join(', ')}`);
        }

        templates[0] = fuzzyMatch;
      }

      const template = templates[0];

      // Create workflow instance
      const [instance] = await db
        .insert(workflowInstances)
        .values({
          workflowTemplateId: template.id,
          clientId: args.clientId || null,
          leadId: args.leadId || null,
          status: 'active',
          triggerType: args.triggerType as any,
          variables: args.variables || {},
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      const message = `Created workflow "${template.name}" with ${instance.triggerType} trigger. ${
        instance.triggerType === 'manual' 
          ? 'Use workflow_wizard_activate to start it manually.' 
          : `It will automatically trigger on ${instance.triggerType} events.`
      }`;

      ctx.log(message);

      return {
        instanceId: instance.id,
        templateName: template.name,
        triggerType: instance.triggerType,
        status: instance.status,
        message
      };

    } catch (error: any) {
      ctx.log(`❌ Workflow creation failed: ${error.message}`);
      throw new Error(`Failed to create workflow: ${error.message}`);
    }
  }
};

// Register the tool
registerTool(def);

export default def;
