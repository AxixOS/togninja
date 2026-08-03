"use strict";
/**
 * Workflow Execution Service
 *
 * Executes workflow steps automatically:
 * - Send emails from templates
 * - Send SMS notifications
 * - Create tasks
 * - Update client/lead fields
 * - Wait/delay execution
 * - Conditional branching
 * - Send questionnaires
 *
 * Integrates with email_campaigns for sending
 * Tracks execution in workflow_step_executions table
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.workflowExecutionService = exports.WorkflowExecutionService = void 0;
const db_1 = require("../db");
const schema_1 = require("@shared/schema");
const drizzle_orm_1 = require("drizzle-orm");
const nodemailer_1 = __importDefault(require("nodemailer"));
class WorkflowExecutionService {
    constructor() {
        this.emailTransporter = null;
        this.initializeEmailTransporter();
    }
    /**
     * Initialize email transporter from environment variables
     */
    async initializeEmailTransporter() {
        try {
            const smtpHost = process.env.SMTP_HOST || 'smtp.easyname.com';
            const smtpPort = parseInt(process.env.SMTP_PORT || '587');
            const smtpUser = process.env.SMTP_USER || process.env.EMAIL_USER;
            const smtpPass = process.env.SMTP_PASS || process.env.EMAIL_PASS;
            if (!smtpUser || !smtpPass) {
                console.warn('[WorkflowExecution] SMTP credentials not configured');
                return;
            }
            this.emailTransporter = nodemailer_1.default.createTransport({
                host: smtpHost,
                port: smtpPort,
                secure: false,
                auth: {
                    user: smtpUser,
                    pass: smtpPass,
                },
            });
            console.log('[WorkflowExecution] Email transporter initialized');
        }
        catch (error) {
            console.error('[WorkflowExecution] Failed to initialize email transporter:', error);
        }
    }
    /**
     * Start a workflow execution for a specific client/lead
     */
    async executeWorkflow(instanceId) {
        try {
            console.log(`[WorkflowExecution] Starting workflow instance: ${instanceId}`);
            // Get workflow instance details
            const [instance] = await db_1.db
                .select()
                .from(schema_1.workflowInstances)
                .where((0, drizzle_orm_1.eq)(schema_1.workflowInstances.id, instanceId));
            if (!instance) {
                throw new Error(`Workflow instance not found: ${instanceId}`);
            }
            // Create execution record
            const [execution] = await db_1.db
                .insert(schema_1.workflowExecutions)
                .values({
                workflowInstanceId: instanceId,
                status: 'running',
                startedAt: new Date(),
            })
                .returning();
            // Update instance status
            await db_1.db
                .update(schema_1.workflowInstances)
                .set({ status: 'running', updatedAt: new Date() })
                .where((0, drizzle_orm_1.eq)(schema_1.workflowInstances.id, instanceId));
            // Get workflow steps in order
            const steps = await db_1.db
                .select()
                .from(schema_1.workflowSteps)
                .where((0, drizzle_orm_1.eq)(schema_1.workflowSteps.workflowTemplateId, instance.workflowTemplateId))
                .orderBy(schema_1.workflowSteps.stepOrder);
            console.log(`[WorkflowExecution] Found ${steps.length} steps to execute`);
            const context = {
                workflowId: instance.workflowTemplateId,
                instanceId,
                clientId: instance.clientId || undefined,
                leadId: instance.leadId || undefined,
                variables: instance.variables || {},
            };
            // Execute steps sequentially
            for (const step of steps) {
                const stepResult = await this.executeStep(step, context, execution.id);
                // If step failed and marked as required, stop execution
                if (!stepResult.success) {
                    console.error(`[WorkflowExecution] Step failed: ${step.name}`, stepResult.error);
                    await db_1.db
                        .update(schema_1.workflowExecutions)
                        .set({
                        status: 'failed',
                        completedAt: new Date(),
                        errorMessage: stepResult.error || 'Step execution failed'
                    })
                        .where((0, drizzle_orm_1.eq)(schema_1.workflowExecutions.id, execution.id));
                    await db_1.db
                        .update(schema_1.workflowInstances)
                        .set({ status: 'failed', updatedAt: new Date() })
                        .where((0, drizzle_orm_1.eq)(schema_1.workflowInstances.id, instanceId));
                    return;
                }
                // Handle wait step - schedule next step execution
                if (step.stepType === 'wait' && step.config) {
                    const config = step.config;
                    const delayMs = this.calculateDelay(config);
                    console.log(`[WorkflowExecution] Wait step - delaying ${delayMs}ms before next step`);
                    // In production, you'd queue this with a job scheduler (Bull, Agenda, etc.)
                    // For now, we'll use setTimeout for demo purposes
                    if (delayMs > 0) {
                        await new Promise(resolve => setTimeout(resolve, Math.min(delayMs, 5000))); // Max 5s for demo
                    }
                }
                // Handle conditional step - check condition and skip if false
                if (step.stepType === 'condition_check' && step.config) {
                    const config = step.config;
                    const conditionMet = await this.evaluateCondition(config, context);
                    if (!conditionMet) {
                        console.log(`[WorkflowExecution] Condition not met, skipping subsequent steps`);
                        break;
                    }
                }
            }
            // Mark execution as completed
            await db_1.db
                .update(schema_1.workflowExecutions)
                .set({
                status: 'completed',
                completedAt: new Date()
            })
                .where((0, drizzle_orm_1.eq)(schema_1.workflowExecutions.id, execution.id));
            await db_1.db
                .update(schema_1.workflowInstances)
                .set({ status: 'completed', updatedAt: new Date() })
                .where((0, drizzle_orm_1.eq)(schema_1.workflowInstances.id, instanceId));
            console.log(`[WorkflowExecution] Workflow completed: ${instanceId}`);
        }
        catch (error) {
            console.error(`[WorkflowExecution] Workflow execution failed:`, error);
            throw error;
        }
    }
    /**
     * Execute a single workflow step
     */
    async executeStep(step, context, executionId) {
        try {
            console.log(`[WorkflowExecution] Executing step: ${step.name} (${step.stepType})`);
            // Create step execution record
            const [stepExecution] = await db_1.db
                .insert(schema_1.workflowStepExecutions)
                .values({
                workflowExecutionId: executionId,
                workflowStepId: step.id,
                status: 'running',
                startedAt: new Date(),
            })
                .returning();
            let result;
            switch (step.stepType) {
                case 'send_email':
                    result = await this.executeSendEmail(step, context);
                    break;
                case 'send_sms':
                    result = await this.executeSendSMS(step, context);
                    break;
                case 'create_task':
                    result = await this.executeCreateTask(step, context);
                    break;
                case 'update_field':
                    result = await this.executeUpdateField(step, context);
                    break;
                case 'wait':
                    result = { success: true, output: 'Wait step acknowledged' };
                    break;
                case 'condition_check':
                    result = { success: true, output: 'Condition evaluated' };
                    break;
                case 'send_questionnaire':
                    result = await this.executeSendQuestionnaire(step, context);
                    break;
                default:
                    result = { success: false, error: `Unknown step type: ${step.stepType}` };
            }
            // Update step execution record
            await db_1.db
                .update(schema_1.workflowStepExecutions)
                .set({
                status: result.success ? 'completed' : 'failed',
                completedAt: new Date(),
                output: result.output ? JSON.stringify(result.output) : null,
                errorMessage: result.error || null,
            })
                .where((0, drizzle_orm_1.eq)(schema_1.workflowStepExecutions.id, stepExecution.id));
            return result;
        }
        catch (error) {
            console.error(`[WorkflowExecution] Step execution error:`, error);
            return { success: false, error: error.message };
        }
    }
    /**
     * Send email from workflow template
     */
    async executeSendEmail(step, context) {
        try {
            const config = step.config;
            const templateId = config?.templateId;
            if (!templateId) {
                return { success: false, error: 'No email template specified' };
            }
            // Get email template
            const [template] = await db_1.db
                .select()
                .from(schema_1.workflowEmailTemplates)
                .where((0, drizzle_orm_1.eq)(schema_1.workflowEmailTemplates.id, templateId));
            if (!template) {
                return { success: false, error: `Email template not found: ${templateId}` };
            }
            // Get recipient details
            let recipientEmail = '';
            let recipientName = '';
            const variables = { ...context.variables };
            if (context.clientId) {
                const [client] = await db_1.db
                    .select()
                    .from(schema_1.clients)
                    .where((0, drizzle_orm_1.eq)(schema_1.clients.id, context.clientId));
                if (client) {
                    recipientEmail = client.email || '';
                    recipientName = client.name || '';
                    variables.client_name = client.name;
                    variables.client_email = client.email;
                }
            }
            else if (context.leadId) {
                const [lead] = await db_1.db
                    .select()
                    .from(schema_1.leads)
                    .where((0, drizzle_orm_1.eq)(schema_1.leads.id, context.leadId));
                if (lead) {
                    recipientEmail = lead.email || '';
                    recipientName = lead.name || '';
                    variables.lead_name = lead.name;
                    variables.lead_email = lead.email;
                }
            }
            if (!recipientEmail) {
                return { success: false, error: 'No recipient email found' };
            }
            // Replace variables in template
            let subject = template.subject || 'Notification from New Age Fotografie';
            let htmlContent = template.htmlContent || '';
            let textContent = template.textContent || '';
            // Replace {{variable}} placeholders
            Object.entries(variables).forEach(([key, value]) => {
                const placeholder = `{{${key}}}`;
                subject = subject.replace(new RegExp(placeholder, 'g'), String(value || ''));
                htmlContent = htmlContent.replace(new RegExp(placeholder, 'g'), String(value || ''));
                textContent = textContent.replace(new RegExp(placeholder, 'g'), String(value || ''));
            });
            // Send email
            if (!this.emailTransporter) {
                console.warn('[WorkflowExecution] Email transporter not configured - simulating send');
                return {
                    success: true,
                    output: {
                        simulated: true,
                        to: recipientEmail,
                        subject,
                        message: 'Email transporter not configured (demo mode)'
                    }
                };
            }
            const info = await this.emailTransporter.sendMail({
                from: `"${template.fromName || 'New Age Fotografie'}" <${template.fromEmail || process.env.SMTP_USER}>`,
                to: recipientEmail,
                subject,
                text: textContent,
                html: htmlContent,
            });
            console.log(`[WorkflowExecution] Email sent to ${recipientEmail}: ${info.messageId}`);
            return {
                success: true,
                output: {
                    messageId: info.messageId,
                    to: recipientEmail,
                    subject
                }
            };
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    }
    /**
     * Send SMS notification
     */
    async executeSendSMS(step, context) {
        try {
            // SMS integration would go here (Twilio, Vonage, etc.)
            // For now, simulate SMS send
            const config = step.config;
            const message = config?.message || 'You have a new notification';
            console.log('[WorkflowExecution] SMS send simulated:', message);
            return {
                success: true,
                output: {
                    simulated: true,
                    message: 'SMS service not configured (demo mode)'
                }
            };
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    }
    /**
     * Create task for photographer
     */
    async executeCreateTask(step, context) {
        try {
            // Task creation would integrate with a task management system
            // For now, log the task
            const config = step.config;
            const taskTitle = config?.title || 'New Task';
            const taskDescription = config?.description || '';
            console.log('[WorkflowExecution] Task created:', taskTitle);
            return {
                success: true,
                output: {
                    taskTitle,
                    taskDescription,
                    message: 'Task logged (task system not yet implemented)'
                }
            };
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    }
    /**
     * Update client/lead field
     */
    async executeUpdateField(step, context) {
        try {
            const config = step.config;
            const fieldName = config?.fieldName;
            const fieldValue = config?.fieldValue;
            if (!fieldName) {
                return { success: false, error: 'No field name specified' };
            }
            if (context.clientId) {
                // Update client field
                const updateData = {};
                updateData[fieldName] = fieldValue;
                updateData.updatedAt = new Date();
                await db_1.db
                    .update(schema_1.clients)
                    .set(updateData)
                    .where((0, drizzle_orm_1.eq)(schema_1.clients.id, context.clientId));
                console.log(`[WorkflowExecution] Updated client field: ${fieldName}`);
                return { success: true, output: { clientId: context.clientId, fieldName, fieldValue } };
            }
            else if (context.leadId) {
                // Update lead field
                const updateData = {};
                updateData[fieldName] = fieldValue;
                updateData.updatedAt = new Date();
                await db_1.db
                    .update(schema_1.leads)
                    .set(updateData)
                    .where((0, drizzle_orm_1.eq)(schema_1.leads.id, context.leadId));
                console.log(`[WorkflowExecution] Updated lead field: ${fieldName}`);
                return { success: true, output: { leadId: context.leadId, fieldName, fieldValue } };
            }
            return { success: false, error: 'No client or lead ID in context' };
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    }
    /**
     * Send questionnaire to client
     */
    async executeSendQuestionnaire(step, context) {
        try {
            // Questionnaire sending would integrate with the questionnaire system
            // For now, simulate
            const config = step.config;
            const questionnaireId = config?.questionnaireId;
            console.log('[WorkflowExecution] Questionnaire send simulated:', questionnaireId);
            return {
                success: true,
                output: {
                    questionnaireId,
                    message: 'Questionnaire send simulated (integration pending)'
                }
            };
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    }
    /**
     * Calculate delay in milliseconds from wait config
     */
    calculateDelay(config) {
        const value = config?.value || 1;
        const unit = config?.unit || 'hours';
        switch (unit) {
            case 'minutes':
                return value * 60 * 1000;
            case 'hours':
                return value * 60 * 60 * 1000;
            case 'days':
                return value * 24 * 60 * 60 * 1000;
            default:
                return 0;
        }
    }
    /**
     * Evaluate conditional logic
     */
    async evaluateCondition(config, context) {
        try {
            const field = config?.field;
            const operator = config?.operator; // equals, not_equals, contains, greater_than, less_than
            const value = config?.value;
            if (!field || !operator) {
                return true; // Default to true if condition not properly configured
            }
            // Get field value from client/lead
            let actualValue;
            if (context.clientId) {
                const [client] = await db_1.db
                    .select()
                    .from(schema_1.clients)
                    .where((0, drizzle_orm_1.eq)(schema_1.clients.id, context.clientId));
                if (client) {
                    actualValue = client[field];
                }
            }
            else if (context.leadId) {
                const [lead] = await db_1.db
                    .select()
                    .from(schema_1.leads)
                    .where((0, drizzle_orm_1.eq)(schema_1.leads.id, context.leadId));
                if (lead) {
                    actualValue = lead[field];
                }
            }
            // Evaluate condition
            switch (operator) {
                case 'equals':
                    return actualValue === value;
                case 'not_equals':
                    return actualValue !== value;
                case 'contains':
                    return String(actualValue || '').includes(String(value));
                case 'greater_than':
                    return Number(actualValue) > Number(value);
                case 'less_than':
                    return Number(actualValue) < Number(value);
                default:
                    return true;
            }
        }
        catch (error) {
            console.error('[WorkflowExecution] Condition evaluation error:', error);
            return true; // Default to true on error to continue workflow
        }
    }
    /**
     * Handle trigger event - find and start matching workflows
     */
    async handleTrigger(triggerType, triggerData) {
        try {
            console.log(`[WorkflowExecution] Trigger fired: ${triggerType}`, triggerData);
            // Find workflow instances waiting for this trigger
            const instances = await db_1.db
                .select()
                .from(schema_1.workflowInstances)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.workflowInstances.status, 'active'), (0, drizzle_orm_1.eq)(schema_1.workflowInstances.triggerType, triggerType)));
            console.log(`[WorkflowExecution] Found ${instances.length} instances to trigger`);
            // Execute each matching instance
            for (const instance of instances) {
                // Check if trigger data matches instance context
                const shouldTrigger = this.matchesTriggerContext(instance, triggerData);
                if (shouldTrigger) {
                    console.log(`[WorkflowExecution] Triggering instance: ${instance.id}`);
                    // Execute workflow asynchronously
                    this.executeWorkflow(instance.id).catch(error => {
                        console.error(`[WorkflowExecution] Async execution failed:`, error);
                    });
                }
            }
        }
        catch (error) {
            console.error('[WorkflowExecution] Trigger handling error:', error);
        }
    }
    /**
     * Check if trigger data matches workflow instance context
     */
    matchesTriggerContext(instance, triggerData) {
        // If instance has specific client/lead, match against trigger data
        if (instance.clientId && triggerData.clientId) {
            return instance.clientId === triggerData.clientId;
        }
        if (instance.leadId && triggerData.leadId) {
            return instance.leadId === triggerData.leadId;
        }
        // If no specific context, trigger for all
        return true;
    }
}
exports.WorkflowExecutionService = WorkflowExecutionService;
// Export singleton instance
exports.workflowExecutionService = new WorkflowExecutionService();
