"use strict";
/**
 * Xero CSV Export Adapter
 * Generates Xero-compatible CSV files for invoice import
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.XeroCSVAdapter = void 0;
const crypto_1 = require("crypto");
class XeroCSVAdapter {
    constructor() {
        this.name = 'Xero CSV';
        this.version = '1.0.0';
        this.profile = 'csv_xero';
        this.description = 'Xero-compatible CSV export for invoices and payments';
    }
    transform(data) {
        const files = [];
        // Generate Sales (Invoices) CSV
        const salesCSV = this.generateSalesCSV(data);
        files.push(this.createFile('xero_sales.csv', salesCSV, 'text/csv'));
        // Generate Payments CSV (if available)
        if (data.payments.length > 0) {
            const paymentsCSV = this.generatePaymentsCSV(data);
            files.push(this.createFile('xero_payments.csv', paymentsCSV, 'text/csv'));
        }
        // Generate Tax Summary CSV
        const taxCSV = this.generateTaxSummaryCSV(data);
        files.push(this.createFile('xero_tax_summary.csv', taxCSV, 'text/csv'));
        return files;
    }
    validate(data) {
        const issues = [];
        // Validate invoices
        for (const invoice of data.invoices) {
            // Required fields
            if (!invoice.number) {
                issues.push({
                    severity: 'error',
                    code: 'MISSING_INVOICE_NUMBER',
                    message: 'Invoice number is required',
                    invoice_number: invoice.number,
                });
            }
            if (!invoice.customer_name) {
                issues.push({
                    severity: 'error',
                    code: 'MISSING_CUSTOMER_NAME',
                    message: 'Customer name is required',
                    invoice_number: invoice.number,
                });
            }
            // Validation warnings
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
    getRequiredFields() {
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
     * Generate Sales CSV
     */
    generateSalesCSV(data) {
        const headers = [
            '*ContactName',
            'EmailAddress',
            'POAddressLine1',
            'POAddressLine2',
            'POCity',
            'POPostalCode',
            'POCountry',
            '*InvoiceNumber',
            '*InvoiceDate',
            'DueDate',
            '*Description',
            '*Quantity',
            '*UnitAmount',
            'Discount',
            'AccountCode',
            '*TaxType',
            'TaxAmount',
            'TrackingName1',
            'TrackingOption1',
            'Currency',
        ].join(',');
        const rows = [headers];
        for (const invoice of data.invoices) {
            for (const line of invoice.lines) {
                const row = [
                    this.escapeCSV(invoice.customer_name),
                    this.escapeCSV(invoice.customer_email || ''),
                    '', // Address Line 1
                    '', // Address Line 2
                    '', // City
                    '', // Postal Code
                    this.escapeCSV(invoice.customer_country),
                    this.escapeCSV(invoice.number),
                    invoice.issue_date,
                    invoice.due_date || '',
                    this.escapeCSV(line.description),
                    line.qty.toFixed(2),
                    line.unit_price.toFixed(2),
                    line.discount.toFixed(2),
                    line.account_code || '200', // Default sales account
                    this.getXeroTaxType(line.tax_rate),
                    line.tax_amount.toFixed(2),
                    '', // Tracking Name
                    '', // Tracking Option
                    invoice.currency,
                ].join(',');
                rows.push(row);
            }
        }
        return rows.join('\n');
    }
    /**
     * Generate Payments CSV
     */
    generatePaymentsCSV(data) {
        const headers = [
            '*InvoiceNumber',
            '*PaymentDate',
            '*PaymentAmount',
            'PaymentMethod',
            'Reference',
            'CurrencyCode',
        ].join(',');
        const rows = [headers];
        for (const payment of data.payments) {
            const row = [
                this.escapeCSV(payment.invoice_number),
                payment.payment_date,
                payment.amount.toFixed(2),
                this.escapeCSV(payment.method),
                this.escapeCSV(payment.reference || ''),
                payment.currency,
            ].join(',');
            rows.push(row);
        }
        return rows.join('\n');
    }
    /**
     * Generate Tax Summary CSV
     */
    generateTaxSummaryCSV(data) {
        const headers = [
            'TaxType',
            'TaxRate',
            'NetAmount',
            'TaxAmount',
            'GrossAmount',
            'InvoiceCount',
        ].join(',');
        const rows = [headers];
        // Group by tax rate
        const taxGroups = new Map();
        for (const invoice of data.invoices) {
            for (const line of invoice.lines) {
                const key = `${(line.tax_rate * 100).toFixed(0)}%`;
                const existing = taxGroups.get(key) || { net: 0, tax: 0, gross: 0, count: 0 };
                existing.net += line.net;
                existing.tax += line.tax_amount;
                existing.gross += line.gross;
                existing.count += 1;
                taxGroups.set(key, existing);
            }
        }
        for (const [taxType, amounts] of Array.from(taxGroups.entries())) {
            const row = [
                taxType,
                amounts.net > 0 ? ((amounts.tax / amounts.net) * 100).toFixed(2) : '0.00',
                amounts.net.toFixed(2),
                amounts.tax.toFixed(2),
                amounts.gross.toFixed(2),
                amounts.count.toString(),
            ].join(',');
            rows.push(row);
        }
        return rows.join('\n');
    }
    /**
     * Get Xero tax type from rate
     */
    getXeroTaxType(rate) {
        if (rate === 0)
            return 'Zero Rated';
        if (rate === 0.10)
            return 'Tax on Sales 10%';
        if (rate === 0.13)
            return 'Tax on Sales 13%';
        if (rate === 0.20)
            return 'Tax on Sales 20%';
        return `Tax on Sales ${(rate * 100).toFixed(0)}%`;
    }
    /**
     * Escape CSV field
     */
    escapeCSV(value) {
        if (!value)
            return '';
        const str = String(value);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    }
    /**
     * Create export file with checksum
     */
    createFile(filename, content, mimeType) {
        const buffer = Buffer.from(content, 'utf-8');
        const checksum = (0, crypto_1.createHash)('sha256').update(buffer).digest('hex');
        return {
            filename,
            content,
            mime_type: mimeType,
            size_bytes: buffer.length,
            checksum_sha256: checksum,
        };
    }
}
exports.XeroCSVAdapter = XeroCSVAdapter;
