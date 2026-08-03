"use strict";
/**
 * DATEV CSV Export Adapter
 * Generates DATEV-compatible Buchungsstapel for Austrian/German accountants
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DATEVCSVAdapter = void 0;
const crypto_1 = require("crypto");
class DATEVCSVAdapter {
    constructor() {
        this.name = 'DATEV CSV (Buchungsstapel)';
        this.version = '1.0.0';
        this.profile = 'datev_csv';
        this.description = 'DATEV-compatible CSV export for DACH accountants';
    }
    transform(data) {
        const files = [];
        // Generate DATEV Buchungsstapel
        const buchungsstapel = this.generateBuchungsstapel(data);
        files.push(this.createFile('EXTF_Buchungsstapel.csv', buchungsstapel, 'text/csv'));
        // Generate DATEV Kontenbeschriftungen (optional but helpful)
        const konten = this.generateKontenbeschriftungen(data);
        files.push(this.createFile('EXTF_Kontenbeschriftungen.csv', konten, 'text/csv'));
        return files;
    }
    validate(data) {
        const issues = [];
        for (const invoice of data.invoices) {
            // DATEV requires specific date formats
            if (!this.isValidDATEVDate(invoice.issue_date)) {
                issues.push({
                    severity: 'error',
                    code: 'INVALID_DATE_FORMAT',
                    message: 'Date must be in DDMM format for DATEV',
                    invoice_number: invoice.number,
                });
            }
            // DATEV has strict rounding rules
            for (const line of invoice.lines) {
                const roundedNet = this.datevRound(line.net);
                if (Math.abs(roundedNet - line.net) > 0.005) {
                    issues.push({
                        severity: 'warning',
                        code: 'ROUNDING_ADJUSTMENT',
                        message: `Amount rounded to DATEV precision: ${line.net.toFixed(2)} → ${roundedNet.toFixed(2)}`,
                        invoice_number: invoice.number,
                    });
                }
            }
            // Check for reverse charge
            if (invoice.reverse_charge && !invoice.customer_vat_id) {
                issues.push({
                    severity: 'error',
                    code: 'REVERSE_CHARGE_NO_VATID',
                    message: 'Reverse charge requires customer VAT ID',
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
            'net_total',
            'tax_total',
            'customer_country',
        ];
    }
    /**
     * Generate DATEV Buchungsstapel
     * Format: DATEV ASCII-Format for bookings
     */
    generateBuchungsstapel(data) {
        const lines = [];
        // Header row 1: Format definition
        lines.push([
            'EXTF', // Format identifier
            '510', // Version
            '21', // Data category (Buchungsstapel)
            'Buchungsstapel', // Data category name
            '8', // Format version
            this.formatDATEVDate(data.period.start),
            this.formatDATEVDate(data.period.end),
            'TogNinja', // Exported from
            '', // Consultant number
            '', // Client number
            '1', // Economic year
            '01', // Economic year start
            '12', // Economic year end
        ].join(';'));
        // Header row 2: Column headers
        lines.push([
            'Umsatz (ohne Soll/Haben-Kz)',
            'Soll/Haben-Kennzeichen',
            'WKZ Umsatz',
            'Kurs',
            'Basis-Umsatz',
            'WKZ Basis-Umsatz',
            'Konto',
            'Gegenkonto (ohne BU-Schlüssel)',
            'BU-Schlüssel',
            'Belegdatum',
            'Belegfeld 1',
            'Belegfeld 2',
            'Skonto',
            'Buchungstext',
            'Postensperre',
            'Diverse Adressnummer',
            'Geschäftspartnerbank',
            'Sachverhalt',
            'Zinssperre',
            'Beleglink',
            'Beleginfo - Art 1',
            'Beleginfo - Inhalt 1',
            'Beleginfo - Art 2',
            'Beleginfo - Inhalt 2',
            'Beleginfo - Art 3',
            'Beleginfo - Inhalt 3',
            'Beleginfo - Art 4',
            'Beleginfo - Inhalt 4',
            'Beleginfo - Art 5',
            'Beleginfo - Inhalt 5',
            'Beleginfo - Art 6',
            'Beleginfo - Inhalt 6',
            'Beleginfo - Art 7',
            'Beleginfo - Inhalt 7',
            'Beleginfo - Art 8',
            'Beleginfo - Inhalt 8',
            'KOST1 - Kostenstelle',
            'KOST2 - Kostenstelle',
            'Kost-Menge',
            'EU-Land u. UStID',
            'EU-Steuersatz',
            'Abw. Versteuerungsart',
            'Sachverhalt L+L',
            'Funktionsergänzung L+L',
            'BU 49 Hauptfunktionstyp',
            'BU 49 Hauptfunktionsnummer',
            'BU 49 Funktionsergänzung',
            'Zusatzinformation - Art 1',
            'Zusatzinformation- Inhalt 1',
            'Zusatzinformation - Art 2',
            'Zusatzinformation - Inhalt 2',
            'Zusatzinformation - Art 3',
            'Zusatzinformation - Inhalt 3',
            'Zusatzinformation - Art 4',
            'Zusatzinformation - Inhalt 4',
            'Zusatzinformation - Art 5',
            'Zusatzinformation - Inhalt 5',
            'Zusatzinformation - Art 6',
            'Zusatzinformation - Inhalt 6',
            'Zusatzinformation - Art 7',
            'Zusatzinformation - Inhalt 7',
            'Zusatzinformation - Art 8',
            'Zusatzinformation - Inhalt 8',
            'Zusatzinformation - Art 9',
            'Zusatzinformation - Inhalt 9',
            'Zusatzinformation - Art 10',
            'Zusatzinformation - Inhalt 10',
            'Zusatzinformation - Art 11',
            'Zusatzinformation - Inhalt 11',
            'Zusatzinformation - Art 12',
            'Zusatzinformation - Inhalt 12',
            'Zusatzinformation - Art 13',
            'Zusatzinformation - Inhalt 13',
            'Zusatzinformation - Art 14',
            'Zusatzinformation - Inhalt 14',
            'Zusatzinformation - Art 15',
            'Zusatzinformation - Inhalt 15',
            'Zusatzinformation - Art 16',
            'Zusatzinformation - Inhalt 16',
            'Zusatzinformation - Art 17',
            'Zusatzinformation - Inhalt 17',
            'Zusatzinformation - Art 18',
            'Zusatzinformation - Inhalt 18',
            'Zusatzinformation - Art 19',
            'Zusatzinformation - Inhalt 19',
            'Zusatzinformation - Art 20',
            'Zusatzinformation - Inhalt 20',
            'Stück',
            'Gewicht',
            'Zahlweise',
            'Forderungsart',
            'Veranlagungsjahr',
            'Zugeordnete Fälligkeit',
            'Skontotyp',
            'Auftragsnummer',
            'Buchungstyp',
            'Ust-Schlüssel (Anzahlungen)',
            'EU-Land (Anzahlungen)',
            'Sachverhalt L+L (Anzahlungen)',
            'EU-Steuersatz (Anzahlungen)',
            'Erlöskonto (Anzahlungen)',
            'Herkunft-Kz',
            'Leerfeld',
            'KOST-Datum',
            'SEPA-Mandatsreferenz',
            'Skontosperre',
            'Gesellschaftername',
            'Beteiligtennummer',
            'Identifikationsnummer',
            'Zeichnernummer',
            'Postensperre bis',
            'Bezeichnung SoBil-Sachverhalt',
            'Kennzeichen SoBil-Buchung',
            'Festschreibung',
            'Leistungsdatum',
            'Datum Zuord. Steuerperiode',
        ].join(';'));
        // Data rows: One per invoice line
        for (const invoice of data.invoices) {
            for (const line of invoice.lines) {
                const buSchluessel = this.getBUSchluessel(line.tax_rate, invoice.reverse_charge);
                const konto = '8400'; // Revenue account (customize per account_code)
                const gegenkonto = '10000'; // Debtor account
                const row = [
                    this.datevRound(line.gross).toFixed(2).replace('.', ','), // Amount (gross)
                    'S', // Debit
                    invoice.currency, // Currency
                    invoice.fx_rate.toFixed(6).replace('.', ','), // FX rate
                    '', // Base amount
                    '', // Base currency
                    konto, // Account (Revenue)
                    gegenkonto, // Counter account (Debtor)
                    buSchluessel, // BU key (tax code)
                    this.formatDATEVDate(invoice.issue_date), // Document date
                    invoice.number, // Document field 1
                    '', // Document field 2
                    '', // Discount
                    this.truncate(line.description, 60), // Posting text
                    '0', // Posting lock
                    '', // Partner number
                    '', // Partner bank
                    '', // Sachverhalt
                    '', // Interest lock
                    '', // Document link
                    // ... rest of fields empty
                    ...Array(94).fill(''),
                ].join(';');
                lines.push(row);
            }
        }
        return lines.join('\n');
    }
    /**
     * Generate DATEV Kontenbeschriftungen (Chart of Accounts)
     */
    generateKontenbeschriftungen(data) {
        const lines = [];
        // Header
        lines.push([
            'EXTF',
            '510',
            '48',
            'Kontenbeschriftungen',
            '5',
            '',
            '',
            'TogNinja',
        ].join(';'));
        lines.push([
            'Konto',
            'Kontenbeschriftung',
            'Sprach-ID',
        ].join(';'));
        // Standard accounts
        const accounts = [
            { code: '8400', name: 'Erlöse 20% USt' },
            { code: '8300', name: 'Erlöse 10% USt' },
            { code: '8500', name: 'Erlöse steuerfrei' },
            { code: '8338', name: 'Innergemeinschaftliche Lieferungen' },
            { code: '10000', name: 'Forderungen aus Lieferungen und Leistungen' },
        ];
        for (const account of accounts) {
            lines.push([
                account.code,
                account.name,
                'de-DE',
            ].join(';'));
        }
        return lines.join('\n');
    }
    /**
     * Get DATEV BU-Schlüssel (tax code)
     */
    getBUSchluessel(taxRate, reverseCharge) {
        if (reverseCharge)
            return '93'; // Reverse charge
        if (taxRate === 0.20)
            return '9'; // 20% VAT
        if (taxRate === 0.13)
            return '2'; // 13% VAT
        if (taxRate === 0.10)
            return '3'; // 10% VAT
        if (taxRate === 0.00)
            return '40'; // Tax-free
        return '9'; // Default to standard rate
    }
    /**
     * Format date for DATEV (DDMM)
     */
    formatDATEVDate(dateStr) {
        const date = new Date(dateStr);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        return day + month;
    }
    /**
     * Validate DATEV date format
     */
    isValidDATEVDate(dateStr) {
        try {
            const date = new Date(dateStr);
            return !isNaN(date.getTime());
        }
        catch {
            return false;
        }
    }
    /**
     * DATEV rounding (2 decimals, commercial rounding)
     */
    datevRound(value) {
        return Math.round(value * 100) / 100;
    }
    /**
     * Truncate string to max length
     */
    truncate(str, maxLen) {
        return str.length > maxLen ? str.substring(0, maxLen) : str;
    }
    /**
     * Create export file
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
exports.DATEVCSVAdapter = DATEVCSVAdapter;
