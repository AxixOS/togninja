/**
 * Accounting Export API Routes
 * Express routes for the accounting export system
 */

import { Router, Request, Response } from 'express';
import { AccountingExportManager } from './manager';
import type { ExportRequest } from './types';
import { z } from 'zod';
import { pool } from '../db';

const router = Router();
const exportManager = new AccountingExportManager();

const VALID_PROFILES = exportManager.getAvailableProfiles().map((p) => p.profile);

// Load only the invoices within the period, fetching their line items in ONE
// batched query. The previous code fetched items per-invoice over EVERY invoice
// (Promise.all), which exhausts the DB pool on large datasets and 500s the export.
async function loadInvoicesWithItems(storage: any, periodStart: string, periodEnd: string): Promise<any[]> {
  const all = await storage.getCrmInvoices();
  const start = new Date(periodStart);
  const end = new Date(periodEnd + 'T23:59:59');
  const inPeriod = (all || []).filter((inv: any) => {
    const d = new Date(inv.issue_date || inv.issueDate);
    return !isNaN(d.getTime()) && d >= start && d <= end;
  });
  if (inPeriod.length === 0) return [];
  const ids = inPeriod.map((i: any) => i.id);
  const itemsByInvoice = new Map<string, any[]>();
  const { rows } = await pool.query(
    `SELECT * FROM crm_invoice_items WHERE invoice_id = ANY($1) ORDER BY sort_order`,
    [ids],
  );
  for (const it of rows) {
    if (!itemsByInvoice.has(it.invoice_id)) itemsByInvoice.set(it.invoice_id, []);
    itemsByInvoice.get(it.invoice_id)!.push(it);
  }
  return inPeriod.map((inv: any) => ({ ...inv, items: itemsByInvoice.get(inv.id) || [] }));
}

/**
 * The payments received in the period.
 *
 * Both call sites used to read:
 *
 *   const payments: any[] = []; // payments storage not yet implemented
 *
 * crm_invoice_payments has existed the whole time. The consequence was not a missing
 * section in the ZIP — it was an export that positively asserted total_payments: 0 to
 * the studio's accountant, on invoices the studio had marked Paid. An accountant
 * reconciling that sees two unpaid invoices and money in the bank with nothing to match
 * it against.
 *
 * Joined to the invoice so a payment carries the currency and customer it was made
 * against, rather than the transformer falling back to a default for both.
 */
async function loadPayments(periodStart: string, periodEnd: string): Promise<any[]> {
  const { rows } = await pool.query(
    `SELECT p.id,
            p.invoice_id,
            p.amount,
            p.payment_method,
            p.payment_reference,
            p.payment_date,
            p.notes,
            i.invoice_number,
            i.client_id,
            i.currency
       FROM crm_invoice_payments p
       JOIN crm_invoices i ON i.id = p.invoice_id
      WHERE p.payment_date >= $1::date AND p.payment_date <= $2::date
      ORDER BY p.payment_date, p.created_at`,
    [periodStart, periodEnd],
  ).catch((e: any) => {
    // A missing payments table must not fail the whole export — the sales side is still
    // useful. But say so, rather than returning [] and letting it read as "none taken".
    console.warn('[accounting-export] could not read payments:', e?.message || e);
    return { rows: [] as any[] };
  });
  return rows;
}

/**
 * The studio's own currency and country, read from their configuration.
 *
 * Resolved on the SERVER rather than taken from the request body. The client already
 * sends its currency and gets it right, but these two values decide the tax code written
 * into an accounting document — `AT-20` versus `US-20` — and a figure an accountant will
 * rely on should not be settable by whatever posts to the endpoint.
 *
 * Both fall back to empty rather than to a guess. The transformer treats an unknown
 * country by writing a plain `VAT-20` and switching reverse-charge detection off, which
 * is the honest answer for a studio that has not told us where it trades. It used to
 * assume Austria.
 */
async function studioFiscalIdentity(): Promise<{ currency: string; country: string; name: string }> {
  const { rows } = await pool.query(
    `SELECT currency, country, studio_name, business_name FROM studio_configs LIMIT 1`,
  ).catch(() => ({ rows: [] as any[] }));
  const c = rows[0] || {};
  return {
    currency: String(c.currency || '').trim().toUpperCase(),
    country: String(c.country || '').trim().toUpperCase(),
    name: String(c.studio_name || c.business_name || '').trim(),
  };
}

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const ExportRequestSchema = z.object({
  // Accept any string; the handlers validate it against the ACTUALLY registered
  // adapters (a hardcoded enum here drifted out of sync — it listed formats with
  // no adapter and omitted csv_simple/pdf_invoice_report, so valid picks 400'd).
  profile: z.string().min(1),
  period_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  period_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  // The client sends the studio's own currency (useStudioCurrency). The default here
  // only applies to a caller that omits it — it must never be what a US studio gets.
  currency: z.string().default('EUR'),
  country: z.string().optional().nullable(),
  generated_by: z.string().optional().nullable(),
  include_payments: z.boolean().default(true),
  include_credit_notes: z.boolean().default(true),
  include_drafts: z.boolean().default(false),
  filters: z.object({
    customer_ids: z.array(z.string()).optional(),
    status: z.array(z.string()).optional(),
    min_amount: z.number().optional(),
    max_amount: z.number().optional(),
    countries: z.array(z.string()).optional(),
  }).optional(),
});

// ============================================================================
// ROUTES
// ============================================================================

/**
 * GET /api/accounting-export/profiles
 * List available export profiles
 */
router.get('/profiles', async (req: Request, res: Response) => {
  try {
    const profiles = exportManager.getAvailableProfiles();
    res.json({ profiles });
  } catch (error) {
    console.error('Error listing profiles:', error);
    res.status(500).json({ error: 'Failed to list export profiles' });
  }
});

/**
 * POST /api/accounting-export/preview
 * Preview export without generating files (validation only)
 */
router.post('/preview', async (req: Request, res: Response) => {
  try {
    const requestData = ExportRequestSchema.parse(req.body);
    if (!VALID_PROFILES.includes(requestData.profile as any)) {
      return res.status(400).json({ error: `Unknown export format "${requestData.profile}". Available: ${VALID_PROFILES.join(', ')}` });
    }

    const storage = (req as any).storage;
    if (!storage) {
      return res.status(500).json({ error: 'Storage not available' });
    }

    const invoicesWithItems = await loadInvoicesWithItems(storage, requestData.period_start, requestData.period_end);
    const payments = await loadPayments(requestData.period_start, requestData.period_end);

    // The studio's own fiscal identity wins over anything in the body.
    const studio = await studioFiscalIdentity();
    if (studio.currency) requestData.currency = studio.currency;
    requestData.country = studio.country || null;
    requestData.generated_by = studio.name ? `TogNinja Accounting Export — ${studio.name}` : 'TogNinja Accounting Export';
    const customers = await storage.getCrmClients();

    // Run validation only
    const result = await exportManager.export(
      requestData as ExportRequest,
      invoicesWithItems,
      payments,
      customers
    );

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
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request', details: error.errors });
    }
    console.error('Error previewing export:', error);
    res.status(500).json({ error: 'Failed to preview export', details: (error as any)?.message });
  }
});

/**
 * POST /api/accounting-export/generate
 * Generate export and return ZIP file
 */
router.post('/generate', async (req: Request, res: Response) => {
  try {
    const requestData = ExportRequestSchema.parse(req.body);
    if (!VALID_PROFILES.includes(requestData.profile as any)) {
      return res.status(400).json({ error: `Unknown export format "${requestData.profile}". Available: ${VALID_PROFILES.join(', ')}` });
    }

    const storage = (req as any).storage;
    if (!storage) {
      return res.status(500).json({ error: 'Storage not available' });
    }

    const invoicesWithItems = await loadInvoicesWithItems(storage, requestData.period_start, requestData.period_end);
    const payments = await loadPayments(requestData.period_start, requestData.period_end);

    // The studio's own fiscal identity wins over anything in the body.
    const studio = await studioFiscalIdentity();
    if (studio.currency) requestData.currency = studio.currency;
    requestData.country = studio.country || null;
    requestData.generated_by = studio.name ? `TogNinja Accounting Export — ${studio.name}` : 'TogNinja Accounting Export';
    const customers = await storage.getCrmClients();

    // Generate export
    const result = await exportManager.export(
      requestData as ExportRequest,
      invoicesWithItems,
      payments,
      customers
    );

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
    } else {
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

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request', details: error.errors });
    }
    console.error('Error generating export:', error);
    res.status(500).json({ error: 'Failed to generate export', details: (error as any)?.message });
  }
});

/**
 * GET /api/accounting-export/period-summary
 * Get summary stats for a period (for the UI)
 */
router.get('/period-summary', async (req: Request, res: Response) => {
  try {
    const { start, end } = req.query;

    if (!start || !end) {
      return res.status(400).json({ error: 'Missing start or end date' });
    }

    const storage = (req as any).storage;
    if (!storage) {
      return res.status(500).json({ error: 'Storage not available' });
    }

    const invoices = await storage.getCrmInvoices();

    // Filter by period
    const periodInvoices = invoices.filter((inv: any) => {
      const issueDate = new Date(inv.issue_date || inv.issueDate);
      return issueDate >= new Date(start as string) && issueDate <= new Date(end as string);
    });

    // Calculate summary
    const summary = {
      total_invoices: periodInvoices.length,
      total_paid: periodInvoices.filter((inv: any) => inv.status === 'paid').length,
      total_draft: periodInvoices.filter((inv: any) => inv.status === 'draft').length,
      total_amount: periodInvoices.reduce((sum: number, inv: any) => {
        return sum + parseFloat(inv.total_amount || inv.total || '0');
      }, 0),
      by_status: periodInvoices.reduce((acc: any, inv: any) => {
        const status = inv.status || 'draft';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {}),
    };

    res.json({ period: { start, end }, summary });
  } catch (error) {
    console.error('Error getting period summary:', error);
    res.status(500).json({ error: 'Failed to get period summary' });
  }
});

/**
 * GET /api/accounting-export/audit-log
 * Get export audit history
 */
router.get('/audit-log', async (req: Request, res: Response) => {
  try {
    // TODO: Implement audit log storage
    res.json({ 
      logs: [],
      message: 'Audit logging not yet implemented'
    });
  } catch (error) {
    console.error('Error getting audit log:', error);
    res.status(500).json({ error: 'Failed to get audit log' });
  }
});

export default router;
