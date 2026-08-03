/**
 * Accounting Export Page
 * Main UI for generating accounting exports
 */

import React, { useState, useEffect } from 'react';
import AdminLayout from '../../../components/admin/AdminLayout';
import { 
  Download, 
  FileText, 
  Calendar, 
  AlertCircle, 
  CheckCircle, 
  Settings,
  Filter
} from 'lucide-react';

interface ExportProfile {
  profile: string;
  name: string;
  description: string;
}

interface PeriodSummary {
  total_invoices: number;
  total_paid: number;
  total_draft: number;
  total_amount: number;
  by_status: Record<string, number>;
}

interface ValidationIssue {
  severity: 'error' | 'warning';
  code: string;
  message: string;
  invoice_number?: string;
  field?: string;
}

export default function AccountingExportPage() {
  // State
  const [profiles, setProfiles] = useState<ExportProfile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<string>('csv_xero');
  const [periodStart, setPeriodStart] = useState<string>(getMonthStart());
  const [periodEnd, setPeriodEnd] = useState<string>(getMonthEnd());
  const [currency, setCurrency] = useState<string>('EUR');
  const [includePayments, setIncludePayments] = useState<boolean>(true);
  const [includeDrafts, setIncludeDrafts] = useState<boolean>(false);
  
  const [periodSummary, setPeriodSummary] = useState<PeriodSummary | null>(null);
  const [validationIssues, setValidationIssues] = useState<ValidationIssue[]>([]);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isPreviewing, setIsPreviewing] = useState<boolean>(false);
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);

  // Load available profiles
  useEffect(() => {
    loadProfiles();
  }, []);

  // Load period summary when dates change
  useEffect(() => {
    if (periodStart && periodEnd) {
      loadPeriodSummary();
    }
  }, [periodStart, periodEnd]);

  async function loadProfiles() {
    try {
      const response = await fetch('/api/accounting-export/profiles', {
        credentials: 'include',
      });
      const data = await response.json();
      setProfiles(data.profiles || []);
    } catch (error) {
      console.error('Failed to load profiles:', error);
    }
  }

  async function loadPeriodSummary() {
    try {
      const response = await fetch(
        `/api/accounting-export/period-summary?start=${periodStart}&end=${periodEnd}`,
        { credentials: 'include' }
      );
      const data = await response.json();
      setPeriodSummary(data.summary);
    } catch (error) {
      console.error('Failed to load period summary:', error);
    }
  }

  async function handlePreview() {
    setIsPreviewing(true);
    setValidationIssues([]);

    try {
      const response = await fetch('/api/accounting-export/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          profile: selectedProfile,
          period_start: periodStart,
          period_end: periodEnd,
          currency,
          include_payments: includePayments,
          include_credit_notes: true,
          include_drafts: includeDrafts,
        }),
      });

      const data = await response.json();
      
      const allIssues = [
        ...(data.validation_errors || []),
        ...(data.validation_warnings || []),
      ];
      setValidationIssues(allIssues);

    } catch (error) {
      console.error('Preview failed:', error);
      alert('Failed to preview export. Please try again.');
    } finally {
      setIsPreviewing(false);
    }
  }

  async function handleGenerate() {
    setIsGenerating(true);

    try {
      const response = await fetch('/api/accounting-export/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          profile: selectedProfile,
          period_start: periodStart,
          period_end: periodEnd,
          currency,
          include_payments: includePayments,
          include_credit_notes: true,
          include_drafts: includeDrafts,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        if (error.validation_errors) {
          setValidationIssues([
            ...(error.validation_errors || []),
            ...(error.validation_warnings || []),
          ]);
          alert('Export validation failed. Please check the issues below.');
          return;
        }
        throw new Error(error.error || 'Export failed');
      }

      // Download the file — respect the server's filename/extension (Simple CSV
      // and PDF come back as single files, others as a .zip package).
      const blob = await response.blob();
      const cd = response.headers.get('Content-Disposition') || '';
      const match = cd.match(/filename="?([^"]+)"?/);
      const ext = (response.headers.get('Content-Type') || '').includes('zip') ? 'zip'
        : (response.headers.get('Content-Type') || '').includes('csv') ? 'csv'
        : (response.headers.get('Content-Type') || '').includes('pdf') ? 'pdf' : 'zip';
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = match ? match[1] : `accounting_export_${selectedProfile}_${periodStart}_${periodEnd}.${ext}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      alert('Export generated successfully!');
      
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to generate export. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  }

  function setQuickPeriod(type: 'this_month' | 'last_month' | 'this_quarter' | 'this_year') {
    const now = new Date();
    let start: Date, end: Date;

    switch (type) {
      case 'this_month':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case 'last_month':
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        end = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case 'this_quarter':
        const quarter = Math.floor(now.getMonth() / 3);
        start = new Date(now.getFullYear(), quarter * 3, 1);
        end = new Date(now.getFullYear(), quarter * 3 + 3, 0);
        break;
      case 'this_year':
        start = new Date(now.getFullYear(), 0, 1);
        end = new Date(now.getFullYear(), 11, 31);
        break;
    }

    setPeriodStart(start.toISOString().split('T')[0]);
    setPeriodEnd(end.toISOString().split('T')[0]);
  }

  const hasErrors = validationIssues.some(i => i.severity === 'error');
  const hasWarnings = validationIssues.some(i => i.severity === 'warning');

  return (
    <AdminLayout>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Accounting Export & Compliance
          </h1>
          <p className="text-gray-600">
            Generate standards-ready export files for your accountant or accounting software
          </p>
        </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Configuration */}
        <div className="lg:col-span-2 space-y-6">
          {/* Export Profile */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Export Profile
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Choose Format
                </label>
                <select
                  value={selectedProfile}
                  onChange={(e) => setSelectedProfile(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  {profiles.map((p) => (
                    <option key={p.profile} value={p.profile}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-sm text-gray-500">
                  {profiles.find((p) => p.profile === selectedProfile)?.description}
                </p>
              </div>
            </div>
          </div>

          {/* Period Selection */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Period Selection
            </h2>

            <div className="space-y-4">
              {/* Quick period buttons */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setQuickPeriod('this_month')}
                  className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-md"
                >
                  This Month
                </button>
                <button
                  onClick={() => setQuickPeriod('last_month')}
                  className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-md"
                >
                  Last Month
                </button>
                <button
                  onClick={() => setQuickPeriod('this_quarter')}
                  className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-md"
                >
                  This Quarter
                </button>
                <button
                  onClick={() => setQuickPeriod('this_year')}
                  className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-md"
                >
                  This Year
                </button>
              </div>

              {/* Date inputs */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Period Start
                  </label>
                  <input
                    type="date"
                    value={periodStart}
                    onChange={(e) => setPeriodStart(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Period End
                  </label>
                  <input
                    type="date"
                    value={periodEnd}
                    onChange={(e) => setPeriodEnd(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Advanced Options */}
          <div className="bg-white rounded-lg shadow p-6">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full flex items-center justify-between text-xl font-semibold mb-4"
            >
              <span className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Advanced Options
              </span>
              <span className="text-sm text-gray-500">
                {showAdvanced ? '▼' : '▶'}
              </span>
            </button>

            {showAdvanced && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="includePayments"
                    checked={includePayments}
                    onChange={(e) => setIncludePayments(e.target.checked)}
                    className="w-4 h-4 text-purple-600 rounded"
                  />
                  <label htmlFor="includePayments" className="text-sm text-gray-700">
                    Include payment records
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="includeDrafts"
                    checked={includeDrafts}
                    onChange={(e) => setIncludeDrafts(e.target.checked)}
                    className="w-4 h-4 text-purple-600 rounded"
                  />
                  <label htmlFor="includeDrafts" className="text-sm text-gray-700">
                    Include draft invoices
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Currency
                  </label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="EUR">EUR (€)</option>
                    <option value="USD">USD ($)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="CHF">CHF (Fr)</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Validation Results */}
          {validationIssues.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Validation Results</h2>
              
              <div className="space-y-2">
                {validationIssues.map((issue, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-lg flex items-start gap-3 ${
                      issue.severity === 'error'
                        ? 'bg-red-50 text-red-800'
                        : 'bg-yellow-50 text-yellow-800'
                    }`}
                  >
                    {issue.severity === 'error' ? (
                      <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <p className="font-medium">{issue.message}</p>
                      {issue.invoice_number && (
                        <p className="text-sm mt-1">Invoice: {issue.invoice_number}</p>
                      )}
                      {issue.field && (
                        <p className="text-sm">Field: {issue.field}</p>
                      )}
                      <p className="text-xs mt-1 opacity-75">Code: {issue.code}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Summary & Actions */}
        <div className="space-y-6">
          {/* Period Summary */}
          {periodSummary && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Period Summary</h2>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total Invoices</span>
                  <span className="font-bold text-xl">{periodSummary.total_invoices}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Paid</span>
                  <span className="text-green-600 font-semibold">{periodSummary.total_paid}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Draft</span>
                  <span className="text-gray-500 font-semibold">{periodSummary.total_draft}</span>
                </div>
                
                <div className="pt-3 border-t border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Total Amount</span>
                    <span className="font-bold text-2xl text-purple-600">
                      {currency} {periodSummary.total_amount.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Actions</h2>
            
            <div className="space-y-3">
              <button
                onClick={handlePreview}
                disabled={isPreviewing || !periodStart || !periodEnd}
                className="w-full px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isPreviewing ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    Validating...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    Validate & Preview
                  </>
                )}
              </button>

              <button
                onClick={handleGenerate}
                disabled={isGenerating || hasErrors || !periodStart || !periodEnd}
                className="w-full px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    Generating...
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5" />
                    Generate & Download
                  </>
                )}
              </button>

              {hasErrors && (
                <p className="text-sm text-red-600 text-center">
                  Fix validation errors before exporting
                </p>
              )}
              {hasWarnings && !hasErrors && (
                <p className="text-sm text-yellow-600 text-center">
                  Export has warnings but can proceed
                </p>
              )}
            </div>
          </div>

          {/* Help */}
          <div className="bg-blue-50 rounded-lg p-4 text-sm">
            <h3 className="font-semibold text-blue-900 mb-2">💡 How it works</h3>
            <ul className="space-y-1 text-blue-800">
              <li>1. Choose your accounting format</li>
              <li>2. Select the export period</li>
              <li>3. Click "Validate" to check for issues</li>
              <li>4. Download the ZIP package</li>
              <li>5. Import into your accounting software</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
    </AdminLayout>
  );
}

// Helper functions
function getMonthStart(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
}

function getMonthEnd(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
}
