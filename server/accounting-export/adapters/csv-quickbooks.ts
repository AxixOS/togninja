/**
 * QuickBooks CSV Export Adapter
 * Generates QuickBooks-compatible CSV files for invoice import
 */

import type { 
  ExportAdapter, 
  CLSExportData, 
  ExportFile, 
  ValidationError, 
  ValidationWarning 
} from '../types';
import { createHash } from 'crypto';

export class QuickBooksCSVAdapter implements ExportAdapter {
  readonly name = 'QuickBooks CSV';
  readonly version = '1.0.0';
  readonly profile = 'csv_quickbooks' as const;
  readonly description = 'QuickBooks-compatible CSV export for invoices and payments';

  transform(data: CLSExportData): ExportFile[] {
    const files: ExportFile[] = [];

    // Generate Invoice CSV
    const invoicesCSV = this.generateInvoicesCSV(data);
    files.push(this.createFile('quickbooks_invoices.csv', invoicesCSV, 'text/csv'));

    // Generate Payments CSV (if available)
    if (data.payments.length > 0) {
      const paymentsCSV = this.generatePaymentsCSV(data);
      files.push(this.createFile('quickbooks_payments.csv', paymentsCSV, 'text/csv'));
    }

    // Generate Customer List CSV
    const customersCSV = this.generateCustomersCSV(data);
    files.push(this.createFile('quickbooks_customers.csv', customersCSV, 'text/csv'));

    return files;
  }

  validate(data: CLSExportData): Array<ValidationError | ValidationWarning> {
    const issues: Array<ValidationError | ValidationWarning> = [];

    // Validate invoices
    for (const invoice of data.invoices) {
      // Required fields for QuickBooks
      if (!invoice.number) {
        issues.push({
          severity: 'error',
          code: 'MISSING_INVOICE_NUMBER',
          message: 'Invoice number is required for QuickBooks import',
          invoice_number: invoice.number,
        });
      }

      if (!invoice.customer_name) {
        issues.push({
          severity: 'error',
          code: 'MISSING_CUSTOMER_NAME',
          message: 'Customer name is required for QuickBooks import',
          invoice_number: invoice.number,
        });
      }

      if (!invoice.issue_date) {
        issues.push({
          severity: 'error',
          code: 'MISSING_INVOICE_DATE',
          message: 'Invoice date is required for QuickBooks import',
          invoice_number: invoice.number,
        });
      }

      // Warnings
      if (invoice.lines.length === 0) {
        issues.push({
          severity: 'warning',
          code: 'NO_LINE_ITEMS',
          message: 'Invoice has no line items',
          invoice_number: invoice.number,
        });
      }

      // Check totals consistency
      const calculatedNet = invoice.lines.reduce((sum, line) => sum + line.net, 0);
      const diff = Math.abs(calculatedNet - invoice.net_total);
      if (diff > 0.01) {
        issues.push({
          severity: 'warning',
          code: 'TOTAL_MISMATCH',
          message: `Net total mismatch: ${diff.toFixed(2)} ${invoice.currency}`,
          invoice_number: invoice.number,
        });
      }
    }

    return issues;
  }

  getRequiredFields(): string[] {
    return [
      'number',
      'issue_date',
      'customer_name',
      'currency',
      'net_total',
      'tax_total',
      'gross_total',
    ];
  }

  /**
   * Generate QuickBooks Invoices CSV
   */
  private generateInvoicesCSV(data: CLSExportData): string {
    const headers = [
      'Invoice Number',
      'Customer Name',
      'Customer Email',
      'Invoice Date',
      'Due Date',
      'Terms',
      'Item(Product/Service)',
      'Item Description',
      'Item Quantity',
      'Item Rate',
      'Item Amount',
      'Item Tax Code',
      'Item Tax Amount',
      'Currency',
      'Memo',
    ].join(',');

    const rows: string[] = [headers];

    for (const invoice of data.invoices) {
      if (invoice.lines.length === 0) {
        // Create single row for invoice with no lines
        rows.push(this.createInvoiceRow(invoice, null, data));
      } else {
        // Create row for each line item
        for (const line of invoice.lines) {
          rows.push(this.createInvoiceRow(invoice, line, data));
        }
      }
    }

    return rows.join('\n');
  }

  private createInvoiceRow(invoice: any, line: any | null, data: CLSExportData): string {
    const row = [
      this.escapeCSV(invoice.number),
      this.escapeCSV(invoice.customer_name),
      this.escapeCSV(invoice.customer_email || ''),
      this.formatDate(invoice.issue_date),
      this.formatDate(invoice.due_date || ''),
      invoice.payment_terms || 'Net 30',
      line ? this.escapeCSV(line.description) : 'Service',
      line ? this.escapeCSV(line.description) : 'Professional Photography Services',
      line ? line.qty.toFixed(2) : '1.00',
      line ? line.unit_price.toFixed(2) : invoice.net_total.toFixed(2),
      line ? line.net.toFixed(2) : invoice.net_total.toFixed(2),
      line ? this.getQuickBooksTaxCode(line.tax_rate) : this.getQuickBooksTaxCode(invoice.tax_total / invoice.net_total * 100),
      line ? line.tax_amount.toFixed(2) : invoice.tax_total.toFixed(2),
      data.currency,
      this.escapeCSV(invoice.notes || ''),
    ];

    return row.join(',');
  }

  /**
   * Generate QuickBooks Payments CSV
   */
  private generatePaymentsCSV(data: CLSExportData): string {
    const headers = [
      'Payment Date',
      'Payment Method',
      'Reference Number',
      'Customer Name',
      'Invoice Number',
      'Amount',
      'Currency',
      'Memo',
    ].join(',');

    const rows: string[] = [headers];

    for (const payment of data.payments) {
      const row = [
        this.formatDate(payment.date),
        this.escapeCSV(payment.method),
        this.escapeCSV(payment.reference || ''),
        this.escapeCSV(payment.customer_name),
        this.escapeCSV(payment.invoice_number),
        payment.amount.toFixed(2),
        payment.currency,
        this.escapeCSV(payment.notes || ''),
      ];
      rows.push(row.join(','));
    }

    return rows.join('\n');
  }

  /**
   * Generate Customers CSV
   */
  private generateCustomersCSV(data: CLSExportData): string {
    const headers = [
      'Customer Name',
      'Company Name',
      'Email',
      'Phone',
      'Billing Address Line 1',
      'Billing City',
      'Billing State/Province',
      'Billing ZIP/Postal Code',
      'Billing Country',
      'Currency',
    ].join(',');

    const rows: string[] = [headers];
    const uniqueCustomers = new Map<string, any>();

    // Collect unique customers from invoices
    for (const invoice of data.invoices) {
      if (!uniqueCustomers.has(invoice.customer_name)) {
        uniqueCustomers.set(invoice.customer_name, {
          name: invoice.customer_name,
          email: invoice.customer_email,
          country: invoice.customer_country,
        });
      }
    }

    for (const [name, customer] of uniqueCustomers) {
      const row = [
        this.escapeCSV(name),
        this.escapeCSV(customer.company || ''),
        this.escapeCSV(customer.email || ''),
        this.escapeCSV(customer.phone || ''),
        this.escapeCSV(customer.address || ''),
        this.escapeCSV(customer.city || ''),
        this.escapeCSV(customer.state || ''),
        this.escapeCSV(customer.zip || ''),
        this.escapeCSV(customer.country || ''),
        data.currency,
      ];
      rows.push(row.join(','));
    }

    return rows.join('\n');
  }

  /**
   * Get QuickBooks tax code
   */
  private getQuickBooksTaxCode(taxRate: number): string {
    if (taxRate === 0) return 'NON';
    if (Math.abs(taxRate - 20) < 0.01) return 'TAX';
    if (Math.abs(taxRate - 10) < 0.01) return 'TAX10';
    if (Math.abs(taxRate - 7) < 0.01) return 'TAX7';
    return 'TAX'; // Default
  }

  /**
   * Format date for QuickBooks (MM/DD/YYYY)
   */
  private formatDate(dateStr: string): string {
    if (!dateStr) return '';
    
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    
    return `${month}/${day}/${year}`;
  }

  /**
   * Escape CSV field
   */
  private escapeCSV(value: string): string {
    if (!value) return '';
    
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  /**
   * Create file object with checksum
   */
  private createFile(filename: string, content: string, mimeType: string): ExportFile {
    const checksum = createHash('sha256').update(content).digest('hex');
    
    return {
      filename,
      content,
      mime_type: mimeType,
      checksum_sha256: checksum,
      size: Buffer.byteLength(content, 'utf-8'),
    };
  }
}
