"use strict";
/**
 * Agent V2 Tool: Start/Activate Workflow
 *
 * Risk: medium (triggers email sequences)
 * Scopes: CRM_WRITE, EMAIL_SEND
 *
 * Starts execution of a workflow instance. Used for manual trigger workflows.
 * For auto-triggered workflows (new_client, invoice_sent, etc.), they start automatically.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const zod_1 = require("zod");
const ToolBus_1 = require("../core/ToolBus");
const db_1 = require("../../../server/db");
const schema_1 = require("@shared/schema");
const drizzle_orm_1 = require("drizzle-orm");
const WorkflowExecutionService_1 = require("../../../server/services/WorkflowExecutionService");
// Zod schema for parameter validation
const params = zod_1.z.object({
    instanceId: zod_1.z.string().describe('Workflow instance ID to activate (from workflow_wizard_create)'),
});
// Tool definition
const def = {
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
    handler: async (ctx, args) => {
        try {
            ctx.log(`▶️ Activating workflow: ${args.instanceId}`);
            // Get workflow instance
            const [instance] = await db_1.db
                .select()
                .from(schema_1.workflowInstances)
                .where((0, drizzle_orm_1.eq)(schema_1.workflowInstances.id, args.instanceId));
            if (!instance) {
                throw new Error(`Workflow instance not found: ${args.instanceId}`);
            }
            if (instance.status === 'running') {
                throw new Error('Workflow is already running');
            }
            // Start workflow execution (async - doesn't block)
            WorkflowExecutionService_1.workflowExecutionService.executeWorkflow(args.instanceId).catch(error => {
                ctx.log(`❌ Workflow execution error: ${error.message}`);
            });
            const message = 'Workflow started successfully. Email sequence is now running in the background.';
            ctx.log(`✅ ${message}`);
            return {
                instanceId: args.instanceId,
                status: 'started',
                message
            };
        }
        catch (error) {
            ctx.log(`❌ Workflow activation failed: ${error.message}`);
            throw new Error(`Failed to activate workflow: ${error.message}`);
        }
    }
};
// Register the tool
(0, ToolBus_1.registerTool)(def);
exports.default = def;
