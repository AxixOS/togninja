/**
 * PDF Invoice Report Adapter
 * Professional PDF export of invoice data
 */

import type { ExportAdapter, CLSExportData, ExportFile, ValidationError, ValidationWarning } from '../types';
import { createHash } from 'crypto';
import PDFDocument from 'pdfkit';

export class PDFReportAdapter implements ExportAdapter {
  readonly name = 'PDF Invoice Report';
  readonly profile = 'pdf_invoice_report' as const;
  readonly description = 'Professional PDF report with all invoices and line items';
  readonly version = '1.0.0';

  /**
   * Transform CLS data to PDF
   */
  transform(data: CLSExportData): ExportFile[] {
    const pdfBuffer = this.generatePDF(data);
    const checksum = createHash('sha256').update(pdfBuffer).digest('hex');

    return [
      {
        filename: 'invoice_report.pdf',
        content: pdfBuffer,
        mime_type: 'application/pdf',
        size_bytes: pdfBuffer.length,
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
   * Generate PDF document
   */
  private generatePDF(data: CLSExportData): Buffer {
    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({ 
        size: 'A4',
        margin: 50,
        info: {
          Title: 'Invoice Report',
          Author: 'New Age Fotografie CRM',
        }
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Title Page
      doc.fontSize(24).font('Helvetica-Bold').text('Invoice Report', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(12).font('Helvetica').text(`Period: ${data.period.start} to ${data.period.end}`, { align: 'center' });
      doc.moveDown(2);

      // Summary Statistics
      const totalInvoices = data.invoices.length;
      const totalRevenue = data.invoices.reduce((sum, inv) => sum + inv.gross_total, 0);
      const totalTax = data.invoices.reduce((sum, inv) => sum + inv.tax_total, 0);
      const totalNet = data.invoices.reduce((sum, inv) => sum + inv.net_total, 0);

      doc.fontSize(14).font('Helvetica-Bold').text('Summary', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(11).font('Helvetica');
      doc.text(`Total Invoices: ${totalInvoices}`);
      doc.text(`Net Revenue: ${this.formatCurrency(totalNet, data.currency)}`);
      doc.text(`Tax Collected: ${this.formatCurrency(totalTax, data.currency)}`);
      doc.text(`Gross Revenue: ${this.formatCurrency(totalRevenue, data.currency)}`);
      doc.moveDown(2);

      // Invoice Details
      doc.fontSize(14).font('Helvetica-Bold').text('Invoice Details', { underline: true });
      doc.moveDown(1);

      for (const invoice of data.invoices) {
        // Check if we need a new page
        if (doc.y > 700) {
          doc.addPage();
        }

        // Invoice Header
        doc.fontSize(12).font('Helvetica-Bold');
        doc.text(`Invoice ${invoice.number}`, { continued: true });
        doc.font('Helvetica').text(` - ${invoice.status.toUpperCase()}`, { align: 'left' });
        
        doc.fontSize(10).font('Helvetica');
        doc.text(`Date: ${invoice.issue_date}`);
        doc.text(`Customer: ${invoice.customer_name}`);
        if (invoice.customer_email) {
          doc.text(`Email: ${invoice.customer_email}`);
        }
        doc.moveDown(0.5);

        // Line Items Table
        const tableTop = doc.y;
        const itemX = 50;
        const qtyX = 300;
        const priceX = 350;
        const taxX = 410;
        const totalX = 470;

        // Table Header
        doc.fontSize(9).font('Helvetica-Bold');
        doc.text('Description', itemX, tableTop);
        doc.text('Qty', qtyX, tableTop);
        doc.text('Price', priceX, tableTop);
        doc.text('Tax', taxX, tableTop);
        doc.text('Total', totalX, tableTop);

        let lineY = tableTop + 15;
        doc.font('Helvetica').fontSize(9);

        for (const line of invoice.lines) {
          // Check if we need a new page
          if (lineY > 730) {
            doc.addPage();
            lineY = 50;
          }

          doc.text(this.truncate(line.description, 35), itemX, lineY);
          doc.text(line.qty.toString(), qtyX, lineY);
          doc.text(this.formatCurrency(line.unit_price, data.currency), priceX, lineY);
          doc.text(`${(line.tax_rate * 100).toFixed(0)}%`, taxX, lineY);
          doc.text(this.formatCurrency(line.gross, data.currency), totalX, lineY);
          
          lineY += 15;
        }

        // Invoice Totals
        doc.moveDown(0.5);
        doc.fontSize(10).font('Helvetica-Bold');
        const totalsX = 400;
        doc.text('Net:', totalsX, doc.y, { width: 60, align: 'right' });
        doc.text(this.formatCurrency(invoice.net_total, data.currency), totalsX + 70, doc.y - 12);
        
        doc.text('Tax:', totalsX, doc.y, { width: 60, align: 'right' });
        doc.text(this.formatCurrency(invoice.tax_total, data.currency), totalsX + 70, doc.y - 12);
        
        doc.text('Gross:', totalsX, doc.y, { width: 60, align: 'right' });
        doc.text(this.formatCurrency(invoice.gross_total, data.currency), totalsX + 70, doc.y - 12);

        // Separator
        doc.moveDown(1);
        doc.strokeColor('#cccccc').lineWidth(1);
        doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
        doc.moveDown(1);
      }

      // Footer
      const pageCount = doc.bufferedPageRange().count;
      for (let i = 0; i < pageCount; i++) {
        doc.switchToPage(i);
        doc.fontSize(8).font('Helvetica');
        doc.text(
          `Page ${i + 1} of ${pageCount} - Generated: ${new Date().toISOString().split('T')[0]}`,
          50,
          doc.page.height - 50,
          { align: 'center' }
        );
      }

      doc.end();
    }) as any;
  }

  /**
   * Format currency
   */
  private formatCurrency(amount: number, currency: string): string {
    const symbol = this.getCurrencySymbol(currency);
    return `${symbol}${amount.toFixed(2)}`;
  }

  /**
   * Get currency symbol
   */
  private getCurrencySymbol(currency: string): string {
    const symbols: Record<string, string> = {
      EUR: '€',
      USD: '$',
      GBP: '£',
      CHF: 'CHF ',
    };
    return symbols[currency] || currency + ' ';
  }

  /**
   * Truncate long text
   */
  private truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }
}
