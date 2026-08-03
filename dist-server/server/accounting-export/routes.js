"use strict";
/**
 * Accounting Export API Routes
 * Express routes for the accounting export system
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const manager_1 = require("./manager");
const zod_1 = require("zod");
const router = (0, express_1.Router)();
const exportManager = new manager_1.AccountingExportManager();
// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================
const ExportRequestSchema = zod_1.z.object({
    profile: zod_1.z.enum([
        'csv_xero',
        'csv_quickbooks',
        'csv_sage',
        'datev_csv',
        'bmd_csv',
        'ubl_peppol',
        'saft_xml',
        'custom'
    ]),
    period_start: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    period_end: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    currency: zod_1.z.string().default('EUR'),
    include_payments: zod_1.z.boolean().default(true),
    include_credit_notes: zod_1.z.boolean().default(true),
    include_drafts: zod_1.z.boolean().default(false),
    filters: zod_1.z.object({
        customer_ids: zod_1.z.array(zod_1.z.string()).optional(),
        status: zod_1.z.array(zod_1.z.string()).optional(),
        min_amount: zod_1.z.number().optional(),
        max_amount: zod_1.z.number().optional(),
        countries: zod_1.z.array(zod_1.z.string()).optional(),
    }).optional(),
});
// ============================================================================
// ROUTES
// ============================================================================
/**
 * GET /api/accounting-export/profiles
 * List available export profiles
 */
router.get('/profiles', async (req, res) => {
    try {
        const profiles = exportManager.getAvailableProfiles();
        res.json({ profiles });
    }
    catch (error) {
        console.error('Error listing profiles:', error);
        res.status(500).json({ error: 'Failed to list export profiles' });
    }
});
/**
 * POST /api/accounting-export/preview
 * Preview export without generating files (validation only)
 */
router.post('/preview', async (req, res) => {
    try {
        const requestData = ExportRequestSchema.parse(req.body);
        // Get data from storage (assuming you have a storage instance)
        const storage = req.storage;
        if (!storage) {
            return res.status(500).json({ error: 'Storage not available' });
        }
        // Fetch invoices, payments, customers
        const invoices = await storage.getCrmInvoices();
        // Fetch invoice items for each invoice
        const invoicesWithItems = await Promise.all(invoices.map(async (invoice) => {
            const items = await storage.getCrmInvoiceItems(invoice.id);
            return { ...invoice, items };
        }));
        const payments = []; // TODO: Implement payments storage
        const customers = await storage.getCrmClients();
        // Run validation only
        const result = await exportManager.export(requestData, invoicesWithItems, payments, customers);
        res.json({
            profile: result.profile,
            period: {
                start: result.period_start,
                end: result.period_end,
            },
            summary: result.manifest.summary,
            validation_errors: result.validation_errors,
            validation_warnings: result.validation_warnings,
            file_count: result.files.length,
        });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ error: 'Invalid request', details: error.errors });
        }
        console.error('Error previewing export:', error);
        res.status(500).json({ error: 'Failed to preview export' });
    }
});
/**
 * POST /api/accounting-export/generate
 * Generate export and return ZIP file
 */
router.post('/generate', async (req, res) => {
    try {
        const requestData = ExportRequestSchema.parse(req.body);
        // Get data from storage
        const storage = req.storage;
        if (!storage) {
            return res.status(500).json({ error: 'Storage not available' });
        }
        const invoices = await storage.getCrmInvoices();
        // Fetch invoice items for each invoice
        const invoicesWithItems = await Promise.all(invoices.map(async (invoice) => {
            const items = await storage.getCrmInvoiceItems(invoice.id);
            return { ...invoice, items };
        }));
        const payments = []; // TODO: Implement payments storage
        const customers = await storage.getCrmClients();
        // Generate export
        const result = await exportManager.export(requestData, invoicesWithItems, payments, customers);
        // Check for validation errors
        if (result.validation_errors.length > 0) {
            return res.status(400).json({
                error: 'Validation failed',
                validation_errors: result.validation_errors,
                validation_warnings: result.validation_warnings,
            });
        }
        // Check if it's a single-file export (PDF or Simple CSV)
        const singleFileFormats = ['pdf_invoice_report', 'csv_simple'];
        const isSingleFile = singleFileFormats.includes(requestData.profile);
        if (isSingleFile && result.files.length === 1) {
            // Send single file directly
            const file = result.files[0];
            const filename = `accounting_export_${requestData.profile}_${requestData.period_start}_${requestData.period_end}.${file.filename.split('.').pop()}`;
            res.setHeader('Content-Type', file.mime_type);
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.setHeader('Content-Length', file.size_bytes);
            res.send(file.content);
        }
        else {
            // Create ZIP package for multi-file exports
            const zipBuffer = await exportManager.createZipPackage(result);
            // Generate filename
            const filename = `accounting_export_${requestData.profile}_${requestData.period_start}_${requestData.period_end}.zip`;
            // Send ZIP file
            res.setHeader('Content-Type', 'application/zip');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.setHeader('Content-Length', zipBuffer.length);
            res.send(zipBuffer);
        }
        // TODO: Save audit log
        console.log('Export generated:', {
            profile: result.profile,
            period: `${result.period_start} to ${result.period_end}`,
            invoices: result.manifest.summary.total_invoices,
            amount: result.manifest.summary.gross_sales,
        });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ error: 'Invalid request', details: error.errors });
        }
        console.error('Error generating export:', error);
        res.status(500).json({ error: 'Failed to generate export' });
    }
});
/**
 * GET /api/accounting-export/period-summary
 * Get summary stats for a period (for the UI)
 */
router.get('/period-summary', async (req, res) => {
    try {
        const { start, end } = req.query;
        if (!start || !end) {
            return res.status(400).json({ error: 'Missing start or end date' });
        }
        const storage = req.storage;
        if (!storage) {
            return res.status(500).json({ error: 'Storage not available' });
        }
        const invoices = await storage.getCrmInvoices();
        // Filter by period
        const periodInvoices = invoices.filter((inv) => {
            const issueDate = new Date(inv.issue_date || inv.issueDate);
            return issueDate >= new Date(start) && issueDate <= new Date(end);
        });
        // Calculate summary
        const summary = {
            total_invoices: periodInvoices.length,
            total_paid: periodInvoices.filter((inv) => inv.status === 'paid').length,
            total_draft: periodInvoices.filter((inv) => inv.status === 'draft').length,
            total_amount: periodInvoices.reduce((sum, inv) => {
                return sum + parseFloat(inv.total_amount || inv.total || '0');
            }, 0),
            by_status: periodInvoices.reduce((acc, inv) => {
                const status = inv.status || 'draft';
                acc[status] = (acc[status] || 0) + 1;
                return acc;
            }, {}),
        };
        res.json({ period: { start, end }, summary });
    }
    catch (error) {
        console.error('Error getting period summary:', error);
        res.status(500).json({ error: 'Failed to get period summary' });
    }
});
/**
 * GET /api/accounting-export/audit-log
 * Get export audit history
 */
router.get('/audit-log', async (req, res) => {
    try {
        // TODO: Implement audit log storage
        res.json({
            logs: [],
            message: 'Audit logging not yet implemented'
        });
    }
    catch (error) {
        console.error('Error getting audit log:', error);
        res.status(500).json({ error: 'Failed to get audit log' });
    }
});
exports.default = router;
