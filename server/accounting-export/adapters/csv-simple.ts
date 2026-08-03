/**
 * Simple CSV Adapter
 * Single CSV file with all invoice data
 */

import type { ExportAdapter, CLSExportData, ExportFile, ValidationError, ValidationWarning } from '../types';
import { createHash } from 'crypto';

export class SimpleCSVAdapter implements ExportAdapter {
  readonly name = 'Simple CSV';
  readonly profile = 'csv_simple' as const;
  readonly description = 'Single CSV file with all invoice line items';
  readonly version = '1.0.0';

  /**
   * Transform CLS data to Simple CSV
   */
  transform(data: CLSExportData): ExportFile[] {
    const csv = this.generateCSV(data);
    const content = csv;
    const buffer = Buffer.from(content, 'utf-8');
    const checksum = createHash('sha256').update(content).digest('hex');

    return [
      {
        filename: 'invoices.csv',
        content,
        mime_type: 'text/csv',
        size_bytes: buffer.length,
        checksum_sha256: checksum,
      },
    ];
  }

  /**
   * Validate data
   */
  validate(data: CLSExportData): Array<ValidationError | ValidationWarning> {
    const issues: Array<ValidationError | ValidationWarning> = [];

    // Check for invoices without lines
    for (const invoice of data.invoices) {
      if (invoice.lines.length === 0) {
        issues.push({
          severity: 'warning',
          code: 'NO_LINE_ITEMS',
          message: 'Invoice has no line items',
          invoice_number: invoice.number,
        });
      }
    }

    return issues;
  }

  /**
   * Get required fields for this adapter
   */
  getRequiredFields(): string[] {
    return ['number', 'issue_date', 'customer_name', 'lines'];
  }

  /**
   * Generate single CSV with all invoice data
   */
  private generateCSV(data: CLSExportData): string {
    const lines: string[] = [];

    // Header
    lines.push([
      'Invoice Number',
      'Invoice Date',
      'Due Date',
      'Customer Name',
      'Customer Email',
      'Line Number',
      'Description',
      'Quantity',
      'Unit Price',
      'Discount',
      'Net Amount',
      'Tax Rate %',
      'Tax Amount',
      'Gross Amount',
      'Tax Code',
      'Invoice Status',
      'Currency',
    ].join(','));

    // Data rows
    for (const invoice of data.invoices) {
      for (const line of invoice.lines) {
        lines.push([
          this.csvEscape(invoice.number),
          invoice.issue_date,
          invoice.due_date,
          this.csvEscape(invoice.customer_name),
          this.csvEscape(invoice.customer_email || ''),
          line.sequence.toString(),
          this.csvEscape(line.description),
          this.formatNumber(line.qty),
          this.formatNumber(line.unit_price),
          this.formatNumber(line.discount),
          this.formatNumber(line.net),
          this.formatNumber(line.tax_rate * 100),
          this.formatNumber(line.tax_amount),
          this.formatNumber(line.gross),
          line.tax_code,
          invoice.status,
          data.currency,
        ].join(','));
      }
    }

    return lines.join('\n');
  }

  /**
   * Escape CSV field
   */
  private csvEscape(value: string): string {
    if (!value) return '';
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  /**
   * Format number to 2 decimal places
   */
  private formatNumber(value: number): string {
    return value.toFixed(2);
  }
}
