# TogNinja Accounting Export & Compliance Module (AEX)

## Overview

The **Accounting Export & Compliance Module** transforms your TogNinja CRM invoices into standards-ready files that your accountant or accounting software can import without manual intervention.

## Features

### 📊 **Canonical Ledger Schema (CLS)**
- Standardized internal representation of accounting data
- Supports invoices, payments, customers, tax rates, and journal entries
- Currency conversion and multi-jurisdiction tax handling

### 🔄 **Export Adapters**
Currently available:
- **Xero CSV** - Xero-compatible CSV format
- **DATEV CSV** - Austrian/German accountant format (Buchungsstapel)

Coming soon:
- QuickBooks Online CSV
- Sage CSV
- BMD CSV (Austria)
- UBL 2.1 / PEPPOL BIS (EU e-invoicing)
- SAF-T XML (tax audit file)

### ✅ **Validation & Compliance**
- VAT ID validation
- Reverse charge detection
- OSS/IOSS compliance flags
- Invoice sequencing verification
- Rounding error detection
- Tax jurisdiction rules

### 📦 **Export Package**
Each export creates a ZIP file containing:
- CSV/XML files in the selected format
- `manifest.json` with export metadata and checksums
- `validation_report.txt` (if warnings/errors exist)
- SHA-256 checksums for data integrity

## Architecture

```
server/accounting-export/
├── types.ts              # TypeScript interfaces & types
├── transformer.ts        # CRM → CLS data transformer
├── manager.ts           # Export orchestration
├── routes.ts            # Express API routes
├── index.ts             # Module exports
├── adapters/
│   ├── csv-xero.ts      # Xero adapter
│   ├── csv-datev.ts     # DATEV adapter
│   └── ... (more adapters)
├── validators/
│   └── ... (validation rules)
└── formatters/
    └── ... (output formatters)
```

## API Endpoints

### `GET /api/accounting-export/profiles`
List available export profiles.

**Response:**
```json
{
  "profiles": [
    {
      "profile": "csv_xero",
      "name": "Xero CSV",
      "description": "Xero-compatible CSV export for invoices and payments"
    },
    {
      "profile": "datev_csv",
      "name": "DATEV CSV (Buchungsstapel)",
      "description": "DATEV-compatible CSV export for DACH accountants"
    }
  ]
}
```

### `POST /api/accounting-export/preview`
Validate export without generating files.

**Request:**
```json
{
  "profile": "csv_xero",
  "period_start": "2025-10-01",
  "period_end": "2025-10-31",
  "currency": "EUR",
  "include_payments": true,
  "include_credit_notes": true,
  "include_drafts": false
}
```

**Response:**
```json
{
  "profile": "csv_xero",
  "period": {
    "start": "2025-10-01",
    "end": "2025-10-31"
  },
  "summary": {
    "total_invoices": 42,
    "total_credit_notes": 2,
    "total_payments": 35,
    "net_sales": 15420.50,
    "tax_collected": 3084.10,
    "gross_sales": 18504.60,
    "currency": "EUR"
  },
  "validation_errors": [],
  "validation_warnings": [
    {
      "severity": "warning",
      "code": "ROUNDING_ADJUSTMENT",
      "message": "Amount rounded to DATEV precision: 123.45 → 123.46",
      "invoice_number": "INV-2025-001"
    }
  ],
  "file_count": 3
}
```

### `POST /api/accounting-export/generate`
Generate and download export ZIP file.

**Request:** Same as preview

**Response:** ZIP file download with:
- `files/` directory with CSV/XML files
- `manifest.json`
- `validation_report.txt` (if applicable)

### `GET /api/accounting-export/period-summary`
Get invoice summary for a date range.

**Query params:**
- `start`: Start date (YYYY-MM-DD)
- `end`: End date (YYYY-MM-DD)

## Usage Example

### Frontend (React)

```typescript
// Preview export
const response = await fetch('/api/accounting-export/preview', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({
    profile: 'csv_xero',
    period_start: '2025-10-01',
    period_end: '2025-10-31',
    currency: 'EUR',
    include_payments: true,
    include_credit_notes: true,
    include_drafts: false,
  }),
});

const data = await response.json();
console.log('Validation issues:', data.validation_errors, data.validation_warnings);

// Generate and download
const exportResponse = await fetch('/api/accounting-export/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({ /* same params */ }),
});

const blob = await exportResponse.blob();
const url = window.URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'accounting_export.zip';
a.click();
```

## Canonical Ledger Schema (CLS)

### Invoice Fields
| Field | Type | Description |
|-------|------|-------------|
| `number` | string | Invoice number (e.g., "INV-2025-001") |
| `issue_date` | string | ISO 8601 date |
| `due_date` | string | ISO 8601 date or null |
| `customer_id` | string | Customer reference |
| `currency` | string | ISO 4217 code (EUR, USD, etc.) |
| `fx_rate` | number | Exchange rate (default 1.0) |
| `net_total` | number | Sum of line net amounts |
| `tax_total` | number | Sum of line tax amounts |
| `gross_total` | number | net_total + tax_total |
| `status` | enum | 'draft', 'sent', 'paid', 'overdue', 'cancelled', 'credited' |
| `is_credit_note` | boolean | Credit note flag |
| `reverse_charge` | boolean | Reverse charge flag (EU B2B) |
| `oss_ioss_flag` | boolean | OSS/IOSS compliance |

### Line Item Fields
| Field | Type | Description |
|-------|------|-------------|
| `sequence` | number | Line number (1, 2, 3...) |
| `sku` | string | Product SKU or null |
| `description` | string | Line description |
| `qty` | number | Quantity |
| `unit_price` | number | Price per unit |
| `discount` | number | Discount amount |
| `net` | number | qty * unit_price - discount |
| `tax_code` | string | Tax code (AT-20, EU-RC, etc.) |
| `tax_rate` | number | Decimal rate (0.20 for 20%) |
| `tax_amount` | number | net * tax_rate |
| `gross` | number | net + tax_amount |
| `account_code` | string | GL account code or null |

## Export Formats

### Xero CSV

**Files generated:**
- `xero_sales.csv` - Invoice lines
- `xero_payments.csv` - Payment records
- `xero_tax_summary.csv` - Tax totals by rate

**Columns (sales):**
```
*ContactName, EmailAddress, POAddressLine1, POAddressLine2, POCity, POPostalCode, 
POCountry, *InvoiceNumber, *InvoiceDate, DueDate, *Description, *Quantity, 
*UnitAmount, Discount, AccountCode, *TaxType, TaxAmount, TrackingName1, 
TrackingOption1, Currency
```

### DATEV CSV (Buchungsstapel)

**Files generated:**
- `EXTF_Buchungsstapel.csv` - Booking records
- `EXTF_Kontenbeschriftungen.csv` - Chart of accounts

**Format:**
- DATEV ASCII Format Version 510
- Semicolon-separated
- German decimal separator (comma)
- BU-Schlüssel for tax codes
- Economic year period

## Compliance Features

### EU VAT Handling
- Automatic reverse charge detection for B2B cross-border
- VAT ID validation
- OSS/IOSS threshold tracking
- Jurisdiction-specific tax rates

### Austrian/German (DACH) Specifics
- DATEV Buchungsstapel format
- BU-Schlüssel tax codes
- Economic year mapping
- DDMM date format
- Commercial rounding rules

### Audit Trail
- SHA-256 checksums for all files
- Manifest with generation metadata
- Version tracking for adapters
- Read-only export history (TODO)

## Development

### Adding a New Adapter

1. Create adapter file in `adapters/`:

```typescript
// adapters/csv-quickbooks.ts
import type { ExportAdapter, CLSExportData, ExportFile } from '../types';

export class QuickBooksCSVAdapter implements ExportAdapter {
  readonly name = 'QuickBooks CSV';
  readonly version = '1.0.0';
  readonly profile = 'csv_quickbooks' as const;
  readonly description = 'QuickBooks Online CSV export';

  transform(data: CLSExportData): ExportFile[] {
    // Transform logic here
    return [];
  }

  validate(data: CLSExportData) {
    // Validation logic
    return [];
  }

  getRequiredFields(): string[] {
    return ['number', 'issue_date', 'customer_name'];
  }
}
```

2. Register in `manager.ts`:

```typescript
import { QuickBooksCSVAdapter } from './adapters/csv-quickbooks';

// In registerAdapters()
const quickbooks = new QuickBooksCSVAdapter();
this.adapters.set('csv_quickbooks', quickbooks);
```

3. Update type definitions in `types.ts`:

```typescript
export type ExportProfile = 
  | 'csv_xero'
  | 'csv_quickbooks'  // Add this
  | 'csv_sage'
  | 'datev_csv'
  | 'bmd_csv'
  | 'ubl_peppol'
  | 'saft_xml'
  | 'custom';
```

## Testing

```typescript
// Test data transformation
const clsData = CLSTransformer.buildExportData(
  invoices,
  payments,
  customers,
  { start: '2025-10-01', end: '2025-10-31' },
  'EUR'
);

// Test adapter
const xeroAdapter = new XeroCSVAdapter();
const files = xeroAdapter.transform(clsData);
const issues = xeroAdapter.validate(clsData);

console.log('Generated files:', files.length);
console.log('Validation issues:', issues);
```

## Roadmap

- [ ] Payment records storage and export
- [ ] Audit log persistence
- [ ] Scheduled exports
- [ ] SFTP/API delivery
- [ ] QuickBooks Online adapter
- [ ] Sage adapter
- [ ] BMD adapter (Austria)
- [ ] UBL 2.1 / PEPPOL BIS adapter
- [ ] SAF-T XML adapter
- [ ] Credit note handling
- [ ] Multi-currency FX snapshots
- [ ] Advanced filtering (by customer, status, etc.)

## License

Part of TogNinja CRM system.
