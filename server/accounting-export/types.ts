/**
 * TogNinja Accounting Export (AEX)
 * Canonical Ledger Schema (CLS) - TypeScript Definitions
 * 
 * Purpose: Standardized internal representation for accounting data
 * that can be exported to various accounting formats
 */

// ============================================================================
// CANONICAL LEDGER SCHEMA (CLS)
// ============================================================================

export interface CLSCustomer {
  id: string;
  name: string;
  email: string | null;
  country: string;
  vat_id: string | null;
  address_line1: string | null;
  address_line2: string | null;
  postal_code: string | null;
  city: string | null;
  iban: string | null;
  metadata?: Record<string, any>;
}

export interface CLSTaxRate {
  tax_code: string;
  rate: number;
  jurisdiction: string;
  reverse_charge_flag: boolean;
  description: string;
}

export interface CLSInvoiceLine {
  sequence: number;
  sku: string | null;
  description: string;
  qty: number;
  unit_price: number;
  discount: number;
  net: number;
  tax_code: string;
  tax_rate: number;
  tax_amount: number;
  gross: number;
  account_code: string | null;
}

export interface CLSInvoice {
  // Core identification
  number: string;
  issue_date: string; // ISO 8601
  due_date: string | null;
  customer_id: string;
  
  // Amounts
  currency: string;
  fx_rate: number;
  net_total: number;
  tax_total: number;
  gross_total: number;
  
  // Status & classification
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled' | 'credited' | 'awaiting_payment';
  is_credit_note: boolean;
  original_invoice_number: string | null; // For credit notes
  
  // Lines
  lines: CLSInvoiceLine[];
  
  // Customer snapshot (denormalized for performance)
  customer_name: string;
  customer_email: string | null;
  customer_country: string;
  customer_vat_id: string | null;
  
  // Compliance flags
  oss_ioss_flag: boolean;
  reverse_charge: boolean;
  
  // Metadata
  sequence_id: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  notes: string | null;
}

export interface CLSPayment {
  id: string;
  invoice_number: string;
  payment_date: string; // ISO 8601
  method: string; // 'bank_transfer', 'credit_card', 'cash', 'paypal', etc.
  amount: number;
  currency: string;
  reference: string | null;
  created_at: string;
}

export interface CLSCreditNote extends CLSInvoice {
  is_credit_note: true;
  original_invoice_number: string;
  credit_reason: string;
}

export interface CLSJournalEntry {
  entry_id: string;
  entry_date: string;
  reference: string;
  description: string;
  lines: CLSJournalLine[];
  created_by: string | null;
  created_at: string;
}

export interface CLSJournalLine {
  account_code: string;
  description: string;
  debit: number;
  credit: number;
  tax_code: string | null;
}

export interface CLSAccount {
  code: string;
  name: string;
  type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  parent_code: string | null;
}

export interface CLSCurrencyRate {
  from_currency: string;
  to_currency: string;
  rate: number;
  date: string;
}

// ============================================================================
// EXPORT FORMATS & PROFILES
// ============================================================================

export type ExportProfile = 
  | 'csv_xero'
  | 'csv_quickbooks'
  | 'csv_sage'
  | 'csv_simple'
  | 'pdf_invoice_report'
  | 'datev_csv'
  | 'bmd_csv'
  | 'ubl_peppol'
  | 'saft_xml'
  | 'custom';

export interface ExportRequest {
  profile: ExportProfile;
  period_start: string; // ISO 8601
  period_end: string; // ISO 8601
  currency: string;
  include_payments: boolean;
  include_credit_notes: boolean;
  include_drafts: boolean;
  filters?: ExportFilters;
}

export interface ExportFilters {
  customer_ids?: string[];
  status?: string[];
  min_amount?: number;
  max_amount?: number;
  countries?: string[];
}

export interface ExportResult {
  profile: ExportProfile;
  period_start: string;
  period_end: string;
  generated_at: string;
  files: ExportFile[];
  manifest: ExportManifest;
  validation_errors: ValidationError[];
  validation_warnings: ValidationWarning[];
}

export interface ExportFile {
  filename: string;
  content: string | Buffer;
  mime_type: string;
  size_bytes: number;
  checksum_sha256: string;
}

export interface ExportManifest {
  version: string;
  profile: ExportProfile;
  period: {
    start: string;
    end: string;
  };
  summary: {
    total_invoices: number;
    total_credit_notes: number;
    total_payments: number;
    net_sales: number;
    tax_collected: number;
    gross_sales: number;
    currency: string;
  };
  files: Array<{
    filename: string;
    type: string;
    checksum: string;
  }>;
  generated_at: string;
  generated_by: string | null;
  adapter_version: string;
}

// ============================================================================
// VALIDATION
// ============================================================================

export interface ValidationError {
  severity: 'error';
  code: string;
  message: string;
  field?: string;
  invoice_number?: string;
}

export interface ValidationWarning {
  severity: 'warning';
  code: string;
  message: string;
  field?: string;
  invoice_number?: string;
}

export interface ValidationRule {
  code: string;
  name: string;
  description: string;
  validate: (data: any) => ValidationError[];
}

// ============================================================================
// ADAPTER INTERFACE
// ============================================================================

export interface ExportAdapter {
  readonly name: string;
  readonly version: string;
  readonly profile: ExportProfile;
  readonly description: string;
  
  /**
   * Transform CLS data into the target format
   */
  transform(data: CLSExportData): ExportFile[];
  
  /**
   * Validate data before export
   */
  validate(data: CLSExportData): Array<ValidationError | ValidationWarning>;
  
  /**
   * Get required fields for this adapter
   */
  getRequiredFields(): string[];
}

export interface CLSExportData {
  invoices: CLSInvoice[];
  payments: CLSPayment[];
  customers: CLSCustomer[];
  tax_rates: CLSTaxRate[];
  period: {
    start: string;
    end: string;
  };
  currency: string;
}

// ============================================================================
// AUDIT & COMPLIANCE
// ============================================================================

export interface ExportAuditLog {
  id: string;
  profile: ExportProfile;
  period_start: string;
  period_end: string;
  generated_at: string;
  generated_by: string | null;
  file_count: number;
  total_invoices: number;
  total_amount: number;
  currency: string;
  checksum: string;
  download_count: number;
  last_downloaded_at: string | null;
  metadata?: Record<string, any>;
}

// ============================================================================
// SCHEDULER & AUTOMATION
// ============================================================================

export interface ScheduledExport {
  id: string;
  name: string;
  profile: ExportProfile;
  schedule: string; // Cron expression
  period_type: 'month' | 'quarter' | 'year' | 'custom';
  delivery_method: 'download' | 'email' | 'sftp' | 'api';
  delivery_config: DeliveryConfig;
  enabled: boolean;
  last_run_at: string | null;
  next_run_at: string | null;
  created_by: string;
  created_at: string;
}

export type DeliveryConfig = 
  | { method: 'email'; to: string[]; subject: string }
  | { method: 'sftp'; host: string; port: number; username: string; path: string }
  | { method: 'api'; endpoint: string; httpMethod: 'POST' | 'PUT'; headers: Record<string, string> }
  | { method: 'download' };

// ============================================================================
// TAX COMPLIANCE
// ============================================================================

export interface TaxComplianceCheck {
  invoice_number: string;
  checks: {
    vat_id_valid: boolean;
    reverse_charge_applied: boolean;
    oss_ioss_compliant: boolean;
    sequencing_valid: boolean;
    rounding_correct: boolean;
  };
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface OSSIOSSConfig {
  enabled: boolean;
  registration_country: string;
  registration_number: string;
  threshold_enabled: boolean;
  threshold_amount: number;
}
