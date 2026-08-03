/**
 * Agent V2 Tool: Start/Activate Workflow
 * 
 * Risk: medium (triggers email sequences)
 * Scopes: CRM_WRITE, EMAIL_SEND
 * 
 * Starts execution of a workflow instance. Used for manual trigger workflows.
 * For auto-triggered workflows (new_client, invoice_sent, etc.), they start automatically.
 */

import { z } from 'zod';
import { registerTool } from '../core/ToolBus';
import { ToolDef, ToolContext } from '../core/Types';
import { db } from '../../../server/db';
import { workflowInstances } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { workflowExecutionService } from '../../../server/services/WorkflowExecutionService';

// Zod schema for parameter validation
const params = z.object({
  instanceId: z.string().describe('Workflow instance ID to activate (from workflow_wizard_create)'),
});

// Tool definition
const def: ToolDef<typeof params> = {
  name: 'workflow_wizard_activate',
  description: `Start/activate a workflow instance to begin email sequence execution.

Use this to:
- Start a manual workflow immediately
- Test a workflow before setting it to auto-trigger
- Re-run a completed workflow

The workflow will execute all steps in order (send emails, wait delays, conditional checks, etc.)

Returns: Activation status and confirmation message`,
  parameters: params,
  authz: ['CRM_WRITE', 'EMAIL_SEND'],
  risk: 'medium',
  
  handler: async (ctx: ToolContext, args: z.infer<typeof params>) => {
    try {
      ctx.log(`▶️ Activating workflow: ${args.instanceId}`);

      // Get workflow instance
      const [instance] = await db
        .select()
        .from(workflowInstances)
        .where(eq(workflowInstances.id, args.instanceId));

      if (!instance) {
        throw new Error(`Workflow instance not found: ${args.instanceId}`);
      }

      if (instance.status === 'running') {
        throw new Error('Workflow is already running');
      }

      // Start workflow execution (async - doesn't block)
      workflowExecutionService.executeWorkflow(args.instanceId).catch(error => {
        ctx.log(`❌ Workflow execution error: ${error.message}`);
      });

      const message = 'Workflow started successfully. Email sequence is now running in the background.';
      ctx.log(`✅ ${message}`);

      return {
        instanceId: args.instanceId,
        status: 'started',
        message
      };

    } catch (error: any) {
      ctx.log(`❌ Workflow activation failed: ${error.message}`);
      throw new Error(`Failed to activate workflow: ${error.message}`);
    }
  }
};

// Register the tool
registerTool(def);

export default def;
