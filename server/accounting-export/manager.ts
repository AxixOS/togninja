/**
 * Accounting Export Manager
 * Main orchestrator for export operations
 */

import type { 
  ExportRequest, 
  ExportResult, 
  ExportManifest,
  ExportProfile,
  ExportFile,
  CLSExportData,
  ExportAdapter
} from './types';
import { CLSTransformer } from './transformer';
import { XeroCSVAdapter } from './adapters/csv-xero';
import { DATEVCSVAdapter } from './adapters/csv-datev';
import { QuickBooksCSVAdapter } from './adapters/csv-quickbooks';
import { SimpleCSVAdapter } from './adapters/csv-simple';
import { PDFReportAdapter } from './adapters/pdf-report';
import { createHash } from 'crypto';
import JSZip from 'jszip';

export class AccountingExportManager {
  private adapters: Map<ExportProfile, ExportAdapter>;

  constructor() {
    this.adapters = new Map();
    this.registerAdapters();
  }

  /**
   * Register all available adapters
   */
  private registerAdapters() {
    const xero = new XeroCSVAdapter();
    const datev = new DATEVCSVAdapter();
    const quickbooks = new QuickBooksCSVAdapter();
    const simpleCSV = new SimpleCSVAdapter();
    const pdfReport = new PDFReportAdapter();

    this.adapters.set('csv_xero', xero);
    this.adapters.set('csv_quickbooks', quickbooks);
    this.adapters.set('csv_simple', simpleCSV);
    this.adapters.set('pdf_invoice_report', pdfReport);
    this.adapters.set('datev_csv', datev);
    
    // Future adapters:
    // this.adapters.set('csv_sage', new SageCSVAdapter());
    // this.adapters.set('bmd_csv', new BMDCSVAdapter());
    // this.adapters.set('ubl_peppol', new UBLPeppolAdapter());
    // this.adapters.set('saft_xml', new SAFTXMLAdapter());
  }

  /**
   * Get available export profiles
   */
  getAvailableProfiles(): Array<{ profile: ExportProfile; name: string; description: string }> {
    const profiles: Array<{ profile: ExportProfile; name: string; description: string }> = [];
    
    for (const [profile, adapter] of Array.from(this.adapters.entries())) {
      profiles.push({
        profile,
        name: adapter.name,
        description: adapter.description,
      });
    }

    return profiles;
  }

  /**
   * Execute export request
   */
  async export(
    request: ExportRequest,
    invoicesData: any[],
    paymentsData: any[],
    customersData: any[]
  ): Promise<ExportResult> {
    const adapter = this.adapters.get(request.profile);
    if (!adapter) {
      throw new Error(`Unknown export profile: ${request.profile}`);
    }

    // Filter invoices by period and status
    const filteredInvoices = this.filterInvoices(invoicesData, request);

    // Build CLS data
    const clsData: CLSExportData = CLSTransformer.buildExportData(
      filteredInvoices,
      paymentsData,
      customersData,
      {
        start: request.period_start,
        end: request.period_end,
      },
      request.currency
    );

    // Validate data
    const validationIssues = adapter.validate(clsData);
    const validation_errors = validationIssues.filter(i => i.severity === 'error');
    const validation_warnings = validationIssues.filter(i => i.severity === 'warning');

    // Stop if there are critical errors
    if (validation_errors.length > 0) {
      return {
        profile: request.profile,
        period_start: request.period_start,
        period_end: request.period_end,
        generated_at: new Date().toISOString(),
        files: [],
        manifest: this.createManifest(request, clsData, [], adapter.version),
        validation_errors,
        validation_warnings,
      };
    }

    // Transform data using adapter
    const files = adapter.transform(clsData);

    // Create manifest
    const manifest = this.createManifest(request, clsData, files, adapter.version);

    return {
      profile: request.profile,
      period_start: request.period_start,
      period_end: request.period_end,
      generated_at: new Date().toISOString(),
      files,
      manifest,
      validation_errors,
      validation_warnings,
    };
  }

  /**
   * Create ZIP package with all files + manifest
   */
  async createZipPackage(result: ExportResult): Promise<Buffer> {
    const zip = new JSZip();

    // Add manifest
    zip.file('manifest.json', JSON.stringify(result.manifest, null, 2));

    // Add files
    const filesFolder = zip.folder('files');
    if (filesFolder) {
      for (const file of result.files) {
        filesFolder.file(file.filename, file.content);
      }
    }

    // Add validation report if there are issues
    if (result.validation_warnings.length > 0 || result.validation_errors.length > 0) {
      const report = this.createValidationReport(result);
      zip.file('validation_report.txt', report);
    }

    return await zip.generateAsync({ type: 'nodebuffer' });
  }

  /**
   * Filter invoices based on request criteria
   */
  private filterInvoices(invoices: any[], request: ExportRequest): any[] {
    return invoices.filter(inv => {
      const issueDate = new Date(inv.issue_date || inv.issueDate);
      const periodStart = new Date(request.period_start);
      const periodEnd = new Date(request.period_end);

      // Date range
      if (issueDate < periodStart || issueDate > periodEnd) {
        return false;
      }

      // Drafts
      if (!request.include_drafts && inv.status === 'draft') {
        return false;
      }

      // Filters
      if (request.filters) {
        if (request.filters.customer_ids && !request.filters.customer_ids.includes(inv.client_id)) {
          return false;
        }
        if (request.filters.status && !request.filters.status.includes(inv.status)) {
          return false;
        }
        if (request.filters.min_amount && inv.total < request.filters.min_amount) {
          return false;
        }
        if (request.filters.max_amount && inv.total > request.filters.max_amount) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Create export manifest
   */
  private createManifest(
    request: ExportRequest,
    data: CLSExportData,
    files: ExportFile[],
    adapterVersion: string
  ): ExportManifest {
    const net_sales = data.invoices.reduce((sum, inv) => sum + inv.net_total, 0);
    const tax_collected = data.invoices.reduce((sum, inv) => sum + inv.tax_total, 0);
    const gross_sales = data.invoices.reduce((sum, inv) => sum + inv.gross_total, 0);

    return {
      version: '1.0.0',
      profile: request.profile,
      period: {
        start: request.period_start,
        end: request.period_end,
      },
      summary: {
        total_invoices: data.invoices.length,
        total_credit_notes: data.invoices.filter(inv => inv.is_credit_note).length,
        total_payments: data.payments.length,
        net_sales,
        tax_collected,
        gross_sales,
        currency: data.currency,
      },
      files: files.map(f => ({
        filename: f.filename,
        type: f.mime_type,
        checksum: f.checksum_sha256,
      })),
      generated_at: new Date().toISOString(),
      generated_by: null,
      adapter_version: adapterVersion,
    };
  }

  /**
   * Create validation report text
   */
  private createValidationReport(result: ExportResult): string {
    const lines: string[] = [];
    
    lines.push('='.repeat(80));
    lines.push('ACCOUNTING EXPORT VALIDATION REPORT');
    lines.push('='.repeat(80));
    lines.push('');
    lines.push(`Profile: ${result.profile}`);
    lines.push(`Period: ${result.period_start} to ${result.period_end}`);
    lines.push(`Generated: ${result.generated_at}`);
    lines.push('');

    if (result.validation_errors.length > 0) {
      lines.push('ERRORS:');
      lines.push('-'.repeat(80));
      for (const error of result.validation_errors) {
        lines.push(`[${error.code}] ${error.message}`);
        if (error.invoice_number) lines.push(`  Invoice: ${error.invoice_number}`);
        if (error.field) lines.push(`  Field: ${error.field}`);
        lines.push('');
      }
    }

    if (result.validation_warnings.length > 0) {
      lines.push('WARNINGS:');
      lines.push('-'.repeat(80));
      for (const warning of result.validation_warnings) {
        lines.push(`[${warning.code}] ${warning.message}`);
        if (warning.invoice_number) lines.push(`  Invoice: ${warning.invoice_number}`);
        if (warning.field) lines.push(`  Field: ${warning.field}`);
        lines.push('');
      }
    }

    lines.push('='.repeat(80));
    
    return lines.join('\n');
  }
}
