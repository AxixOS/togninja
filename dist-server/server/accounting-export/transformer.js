"use strict";
/**
 * CRM to CLS Transformer
 * Converts TogNinja CRM invoices to Canonical Ledger Schema
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CLSTransformer = void 0;
/**
 * Transform CRM invoice data to CLS format
 */
class CLSTransformer {
    /**
     * Convert CRM invoice to CLS invoice
     */
    static toCLSInvoice(crmInvoice) {
        const lines = this.extractLines(crmInvoice);
        const net_total = lines.reduce((sum, line) => sum + line.net, 0);
        const tax_total = lines.reduce((sum, line) => sum + line.tax_amount, 0);
        const gross_total = lines.reduce((sum, line) => sum + line.gross, 0);
        return {
            // Core identification
            number: crmInvoice.invoice_number || crmInvoice.invoiceNumber,
            issue_date: this.formatDate(crmInvoice.issue_date || crmInvoice.issueDate),
            due_date: this.formatDate(crmInvoice.due_date || crmInvoice.dueDate),
            customer_id: crmInvoice.client_id || crmInvoice.clientId,
            // Amounts
            currency: crmInvoice.currency || 'EUR',
            fx_rate: parseFloat(crmInvoice.fx_rate || '1.0'),
            net_total,
            tax_total,
            gross_total,
            // Status
            status: this.normalizeStatus(crmInvoice.status),
            is_credit_note: false,
            original_invoice_number: null,
            // Lines
            lines,
            // Customer data (denormalized)
            customer_name: crmInvoice.client_name || crmInvoice.clientName || 'Unknown',
            customer_email: crmInvoice.client_email || crmInvoice.clientEmail || null,
            customer_country: crmInvoice.client_country || crmInvoice.clientCountry || 'AT',
            customer_vat_id: crmInvoice.client_vat_id || crmInvoice.clientVatId || null,
            // Compliance
            oss_ioss_flag: false,
            reverse_charge: this.detectReverseCharge(crmInvoice),
            // Metadata
            sequence_id: parseInt(crmInvoice.id) || 0,
            created_by: crmInvoice.created_by || crmInvoice.createdBy || null,
            created_at: this.formatDate(crmInvoice.created_at || crmInvoice.createdAt),
            updated_at: this.formatDate(crmInvoice.updated_at || crmInvoice.updatedAt),
            notes: crmInvoice.notes || null,
        };
    }
    /**
     * Extract invoice lines from CRM data
     */
    static extractLines(crmInvoice) {
        const items = crmInvoice.items || [];
        return items.map((item, index) => {
            // Handle both snake_case and camelCase field names from database
            const qty = parseFloat(item.quantity || '1');
            const unit_price = parseFloat(item.unitPrice || item.unit_price || '0');
            const discount = parseFloat(item.discount || '0');
            const tax_rate = parseFloat(item.taxRate || item.tax_rate || '20') / 100;
            const net = qty * unit_price - discount;
            const tax_amount = net * tax_rate;
            const gross = net + tax_amount;
            return {
                sequence: index + 1,
                sku: item.sku || null,
                description: item.description || item.name || 'Service',
                qty,
                unit_price,
                discount,
                net,
                tax_code: this.determineTaxCode(tax_rate),
                tax_rate,
                tax_amount,
                gross,
                account_code: item.account_code || null,
            };
        });
    }
    /**
     * Convert CRM customer to CLS customer
     */
    static toCLSCustomer(crmClient) {
        return {
            id: crmClient.id,
            name: crmClient.name || crmClient.firstName + ' ' + crmClient.lastName,
            email: crmClient.email || null,
            country: crmClient.country || 'AT',
            vat_id: crmClient.vat_id || crmClient.vatId || null,
            address_line1: crmClient.address || crmClient.address1 || null,
            address_line2: crmClient.address2 || null,
            postal_code: crmClient.postalCode || crmClient.postal_code || null,
            city: crmClient.city || null,
            iban: crmClient.iban || null,
            metadata: {},
        };
    }
    /**
     * Convert CRM payment to CLS payment
     */
    static toCLSPayment(crmPayment) {
        return {
            id: crmPayment.id,
            invoice_number: crmPayment.invoice_number || crmPayment.invoiceNumber,
            payment_date: this.formatDate(crmPayment.payment_date || crmPayment.paymentDate),
            method: crmPayment.method || 'bank_transfer',
            amount: parseFloat(crmPayment.amount || '0'),
            currency: crmPayment.currency || 'EUR',
            reference: crmPayment.reference || null,
            created_at: this.formatDate(crmPayment.created_at || crmPayment.createdAt),
        };
    }
    /**
     * Get standard tax rates
     */
    static getStandardTaxRates() {
        return [
            {
                tax_code: 'AT-20',
                rate: 0.20,
                jurisdiction: 'AT',
                reverse_charge_flag: false,
                description: 'Austria Standard Rate (20%)',
            },
            {
                tax_code: 'AT-13',
                rate: 0.13,
                jurisdiction: 'AT',
                reverse_charge_flag: false,
                description: 'Austria Reduced Rate (13%)',
            },
            {
                tax_code: 'AT-10',
                rate: 0.10,
                jurisdiction: 'AT',
                reverse_charge_flag: false,
                description: 'Austria Reduced Rate (10%)',
            },
            {
                tax_code: 'EU-RC',
                rate: 0.00,
                jurisdiction: 'EU',
                reverse_charge_flag: true,
                description: 'EU Reverse Charge',
            },
            {
                tax_code: 'EXPORT',
                rate: 0.00,
                jurisdiction: 'ROW',
                reverse_charge_flag: false,
                description: 'Export (0%)',
            },
        ];
    }
    /**
     * Format date to ISO 8601
     */
    static formatDate(date) {
        if (!date)
            return new Date().toISOString().split('T')[0];
        if (typeof date === 'string') {
            return date.split('T')[0];
        }
        return new Date(date).toISOString().split('T')[0];
    }
    /**
     * Normalize invoice status
     */
    static normalizeStatus(status) {
        const s = String(status || 'draft').toLowerCase();
        if (s === 'paid' || s === 'completed')
            return 'paid';
        if (s === 'sent' || s === 'pending')
            return 'sent';
        if (s === 'cancelled' || s === 'voided')
            return 'cancelled';
        if (s === 'overdue')
            return 'overdue';
        return 'draft';
    }
    /**
     * Determine tax code from rate
     */
    static determineTaxCode(rate) {
        if (rate === 0)
            return 'EXPORT';
        if (rate === 0.10)
            return 'AT-10';
        if (rate === 0.13)
            return 'AT-13';
        if (rate === 0.20)
            return 'AT-20';
        return `VAT-${Math.round(rate * 100)}`;
    }
    /**
     * Detect reverse charge scenario
     */
    static detectReverseCharge(invoice) {
        // B2B cross-border within EU
        const hasVatId = !!(invoice.client_vat_id || invoice.clientVatId);
        const isDifferentEU = invoice.client_country !== 'AT' && this.isEUCountry(invoice.client_country);
        return hasVatId && isDifferentEU;
    }
    /**
     * Check if country is in EU
     */
    static isEUCountry(country) {
        const euCountries = [
            'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR',
            'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL',
            'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE'
        ];
        return euCountries.includes(country?.toUpperCase());
    }
    /**
     * Build complete CLS export data
     */
    static buildExportData(invoices, payments, customers, period, currency = 'EUR') {
        return {
            invoices: invoices.map(inv => this.toCLSInvoice(inv)),
            payments: payments.map(pmt => this.toCLSPayment(pmt)),
            customers: customers.map(cust => this.toCLSCustomer(cust)),
            tax_rates: this.getStandardTaxRates(),
            period,
            currency,
        };
    }
}
exports.CLSTransformer = CLSTransformer;
