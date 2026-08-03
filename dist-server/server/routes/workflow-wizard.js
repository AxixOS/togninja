"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const db_js_1 = require("../db.js");
const router = express_1.default.Router();
// ============================================================================
// CREATE WORKFLOW FROM TEMPLATE
// ============================================================================
router.post('/create-workflow', async (req, res) => {
    try {
        const { templateId, name, description, triggerType, triggerConditions, targetAudience } = req.body;
        // Get template
        const templateResult = await db_js_1.pool.query('SELECT * FROM workflow_templates WHERE id = $1', [templateId]);
        if (templateResult.rows.length === 0) {
            return res.status(404).json({ error: 'Template not found' });
        }
        // Create workflow instance
        const workflowResult = await db_js_1.pool.query(`INSERT INTO workflow_instances (
        template_id, name, description, trigger_type, 
        trigger_conditions, target_audience, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7) 
      RETURNING *`, [
            templateId,
            name,
            description,
            triggerType,
            triggerConditions || {},
            targetAudience || {},
            'active'
        ]);
        res.json({
            success: true,
            workflow: workflowResult.rows[0]
        });
    }
    catch (error) {
        console.error('Create workflow error:', error);
        res.status(500).json({ error: error.message });
    }
});
// ============================================================================
// START WORKFLOW FOR CLIENT
// ============================================================================
router.post('/start-workflow', async (req, res) => {
    try {
        const { workflowId, clientId, context } = req.body;
        if (!workflowId || !clientId) {
            return res.status(400).json({ error: 'workflowId and clientId required' });
        }
        // Get workflow and steps
        const workflowResult = await db_js_1.pool.query('SELECT * FROM workflow_instances WHERE id = $1 AND status = $2', [workflowId, 'active']);
        if (workflowResult.rows.length === 0) {
            return res.status(404).json({ error: 'Workflow not found or not active' });
        }
        const workflow = workflowResult.rows[0];
        // Create execution record
        const executionResult = await db_js_1.pool.query(`INSERT INTO workflow_executions (
        workflow_id, client_id, status, context
      ) VALUES ($1, $2, $3, $4) 
      RETURNING *`, [workflowId, clientId, 'in_progress', context || {}]);
        const execution = executionResult.rows[0];
        // Get workflow steps
        const stepsResult = await db_js_1.pool.query('SELECT * FROM workflow_steps WHERE workflow_id = $1 ORDER BY step_order ASC', [workflowId]);
        // Create step execution records
        for (const step of stepsResult.rows) {
            await db_js_1.pool.query(`INSERT INTO workflow_step_executions (
          execution_id, step_id, status
        ) VALUES ($1, $2, $3)`, [execution.id, step.id, 'pending']);
        }
        res.json({
            success: true,
            execution,
            totalSteps: stepsResult.rows.length
        });
    }
    catch (error) {
        console.error('Start workflow error:', error);
        res.status(500).json({ error: error.message });
    }
});
// ============================================================================
// LIST ALL WORKFLOWS
// ============================================================================
router.get('/workflows', async (req, res) => {
    try {
        const { status, templateId } = req.query;
        let query = 'SELECT * FROM workflow_instances WHERE 1=1';
        const params = [];
        if (status) {
            params.push(status);
            query += ` AND status = $${params.length}`;
        }
        if (templateId) {
            params.push(templateId);
            query += ` AND template_id = $${params.length}`;
        }
        query += ' ORDER BY created_at DESC';
        const result = await db_js_1.pool.query(query, params);
        res.json({
            workflows: result.rows,
            total: result.rows.length
        });
    }
    catch (error) {
        console.error('List workflows error:', error);
        res.status(500).json({ error: error.message });
    }
});
// ============================================================================
// GET WORKFLOW DETAILS
// ============================================================================
router.get('/workflow/:id', async (req, res) => {
    try {
        const { id } = req.params;
        // Get workflow
        const workflowResult = await db_js_1.pool.query('SELECT * FROM workflow_instances WHERE id = $1', [id]);
        if (workflowResult.rows.length === 0) {
            return res.status(404).json({ error: 'Workflow not found' });
        }
        // Get steps
        const stepsResult = await db_js_1.pool.query('SELECT * FROM workflow_steps WHERE workflow_id = $1 ORDER BY step_order ASC', [id]);
        // Get execution count
        const executionsResult = await db_js_1.pool.query('SELECT COUNT(*) as total FROM workflow_executions WHERE workflow_id = $1', [id]);
        res.json({
            workflow: workflowResult.rows[0],
            steps: stepsResult.rows,
            executionCount: parseInt(executionsResult.rows[0].total)
        });
    }
    catch (error) {
        console.error('Get workflow error:', error);
        res.status(500).json({ error: error.message });
    }
});
// ============================================================================
// GET EXECUTION STATUS
// ============================================================================
router.get('/execution/:id', async (req, res) => {
    try {
        const { id } = req.params;
        // Get execution
        const executionResult = await db_js_1.pool.query('SELECT * FROM workflow_executions WHERE id = $1', [id]);
        if (executionResult.rows.length === 0) {
            return res.status(404).json({ error: 'Execution not found' });
        }
        // Get step executions
        const stepExecutionsResult = await db_js_1.pool.query(`SELECT wse.*, ws.step_name, ws.step_type 
       FROM workflow_step_executions wse
       JOIN workflow_steps ws ON wse.step_id = ws.id
       WHERE wse.execution_id = $1
       ORDER BY ws.step_order ASC`, [id]);
        const execution = executionResult.rows[0];
        const stepExecutions = stepExecutionsResult.rows;
        // Calculate progress
        const totalSteps = stepExecutions.length;
        const completedSteps = stepExecutions.filter(s => s.status === 'completed').length;
        const progress = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;
        res.json({
            execution,
            stepExecutions,
            progress: Math.round(progress),
            totalSteps,
            completedSteps
        });
    }
    catch (error) {
        console.error('Get execution error:', error);
        res.status(500).json({ error: error.message });
    }
});
// ============================================================================
// PAUSE WORKFLOW
// ============================================================================
router.post('/pause-workflow', async (req, res) => {
    try {
        const { workflowId } = req.body;
        const result = await db_js_1.pool.query('UPDATE workflow_instances SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *', ['paused', workflowId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Workflow not found' });
        }
        res.json({
            success: true,
            workflow: result.rows[0]
        });
    }
    catch (error) {
        console.error('Pause workflow error:', error);
        res.status(500).json({ error: error.message });
    }
});
// ============================================================================
// RESUME WORKFLOW
// ============================================================================
router.post('/resume-workflow', async (req, res) => {
    try {
        const { workflowId } = req.body;
        const result = await db_js_1.pool.query('UPDATE workflow_instances SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *', ['active', workflowId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Workflow not found' });
        }
        res.json({
            success: true,
            workflow: result.rows[0]
        });
    }
    catch (error) {
        console.error('Resume workflow error:', error);
        res.status(500).json({ error: error.message });
    }
});
// ============================================================================
// CANCEL WORKFLOW
// ============================================================================
router.post('/cancel-workflow', async (req, res) => {
    try {
        const { workflowId } = req.body;
        const result = await db_js_1.pool.query('UPDATE workflow_instances SET status = $1, completed_at = NOW(), updated_at = NOW() WHERE id = $2 RETURNING *', ['cancelled', workflowId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Workflow not found' });
        }
        // Cancel all in-progress executions
        await db_js_1.pool.query(`UPDATE workflow_executions 
       SET status = $1, completed_at = NOW() 
       WHERE workflow_id = $2 AND status = $3`, ['cancelled', workflowId, 'in_progress']);
        res.json({
            success: true,
            workflow: result.rows[0]
        });
    }
    catch (error) {
        console.error('Cancel workflow error:', error);
        res.status(500).json({ error: error.message });
    }
});
// ============================================================================
// LIST WORKFLOW TEMPLATES
// ============================================================================
router.get('/templates', async (req, res) => {
    try {
        const { category } = req.query;
        let query = 'SELECT * FROM workflow_templates WHERE is_active = true';
        const params = [];
        if (category) {
            params.push(category);
            query += ` AND category = $${params.length}`;
        }
        query += ' ORDER BY name ASC';
        const result = await db_js_1.pool.query(query, params);
        res.json({
            templates: result.rows,
            total: result.rows.length
        });
    }
    catch (error) {
        console.error('List templates error:', error);
        res.status(500).json({ error: error.message });
    }
});
// ============================================================================
// TEST WORKFLOW (DRY RUN)
// ============================================================================
router.post('/test-workflow', async (req, res) => {
    try {
        const { workflowId, testContext } = req.body;
        // Get workflow and steps
        const workflowResult = await db_js_1.pool.query('SELECT * FROM workflow_instances WHERE id = $1', [workflowId]);
        if (workflowResult.rows.length === 0) {
            return res.status(404).json({ error: 'Workflow not found' });
        }
        const stepsResult = await db_js_1.pool.query('SELECT * FROM workflow_steps WHERE workflow_id = $1 ORDER BY step_order ASC', [workflowId]);
        // Simulate execution
        const simulationSteps = stepsResult.rows.map(step => ({
            stepNumber: step.step_order,
            stepName: step.step_name,
            stepType: step.step_type,
            delayHours: step.delay_amount || 0,
            delayUnit: step.delay_unit || 'minutes',
            willExecute: true, // In real execution, would check conditions
            config: step.config
        }));
        res.json({
            success: true,
            workflow: workflowResult.rows[0],
            simulatedSteps: simulationSteps,
            totalSteps: simulationSteps.length,
            estimatedDuration: simulationSteps.reduce((sum, s) => sum + (s.delayHours || 0), 0)
        });
    }
    catch (error) {
        console.error('Test workflow error:', error);
        res.status(500).json({ error: error.message });
    }
});
// ============================================================================
// GET WORKFLOW ANALYTICS
// ============================================================================
router.get('/analytics/:workflowId', async (req, res) => {
    try {
        const { workflowId } = req.params;
        const { startDate, endDate } = req.query;
        let query = `
      SELECT 
        metric_name,
        SUM(metric_value) as total_value,
        AVG(metric_value) as avg_value,
        COUNT(*) as occurrences
      FROM workflow_analytics
      WHERE workflow_id = $1
    `;
        const params = [workflowId];
        if (startDate) {
            params.push(startDate);
            query += ` AND recorded_at >= $${params.length}`;
        }
        if (endDate) {
            params.push(endDate);
            query += ` AND recorded_at <= $${params.length}`;
        }
        query += ' GROUP BY metric_name ORDER BY metric_name';
        const result = await db_js_1.pool.query(query, params);
        res.json({
            workflowId,
            metrics: result.rows
        });
    }
    catch (error) {
        console.error('Get analytics error:', error);
        res.status(500).json({ error: error.message });
    }
});
exports.default = router;
