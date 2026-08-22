import React from 'react';
import { SITE } from '../../config/site';
import { formatCurrency as formatMoney } from '../../utils/currency';
import { getEffectiveLocale } from '../../lib/dateFormat';

// CACHE BUST v3 - FORCE REBUILD - 20251210-1628
const TEMPLATE_VERSION = 'v3.0.0-20251210-1628';

interface InvoiceTemplateProps {
  invoice: {
    invoice_number: string;
    client_name: string;
    client_email: string;
    client_address?: string;
    due_date: string;
    created_at: string;
    currency: string;
    payment_terms: string;
    notes?: string;
    subtotal_amount: number;
    tax_amount: number;
    discount_amount: number;
    discount_type?: 'fixed' | 'percentage';
    discount_value?: number;
    total_amount: number;
    items: Array<{
      description: string;
      quantity: number;
      unit_price: number;
      tax_rate: number;
      line_total: number;
    }>;
  };
  companyInfo?: {
    name: string;
    address: string;
    email: string;
    phone: string;
    website?: string;
  };
}

const InvoiceTemplate: React.FC<InvoiceTemplateProps> = ({ 
  invoice, 
  companyInfo = {
    name: SITE.name,
    address: "Julius-Tandler-Platz 5/13, 1090 Wien, Austria",
    email: SITE.email,
    phone: SITE.phone,
    website: SITE.url.replace(/^https?:\/\//, '')
  }
}) => {
  // Debug logging (CACHE BUST v3 - FORCED REBUILD)
  console.log(`📄 ADMIN INVOICE TEMPLATE RENDERING (${TEMPLATE_VERSION}):`, invoice);
  console.log('📄 CLIENT NAME:', invoice.client_name);
  console.log('📄 TOTAL AMOUNT:', invoice.total_amount);
  console.log('📄 CREATED AT:', invoice.created_at);
  console.log('📄 ITEMS COUNT:', invoice.items?.length);
  
  // The invoice carries its own currency (a historical invoice keeps the currency it was
  // raised in), so that stays the source of truth here; only the LOCALE was wrong — it was
  // pinned to 'de-DE', which gave an English studio German number conventions. The shared
  // helper resolves the studio's locale and already falls back to "amount CODE" rather than
  // a euro sign when Intl rejects an unknown currency code.
  const formatCurrency = (amount: number) => {
    const safeAmount = (amount === null || amount === undefined || isNaN(amount)) ? 0 : amount;
    return formatMoney(safeAmount, invoice.currency || 'EUR');
  };

  const formatDate = (dateString: string) => {
    if (!dateString) {
      console.warn('No date provided to formatDate');
      return 'No Date';
    }
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        console.warn('Invalid date:', dateString);
        return 'Invalid Date';
      }
      return date.toLocaleDateString(getEffectiveLocale());
    } catch (error) {
      console.error('Date formatting error:', error, dateString);
      return 'Invalid Date';
    }
  };
  return (
    <div className="invoice-template max-w-4xl mx-auto bg-white p-8 shadow-lg">
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{companyInfo.name}</h1>
          <div className="text-gray-600 space-y-1">
            <p>{companyInfo.address}</p>
            <p>{companyInfo.email}</p>
            <p>{companyInfo.phone}</p>
            {companyInfo.website && <p>{companyInfo.website}</p>}
          </div>
        </div>
        <div className="text-right">
          <h2 className="text-2xl font-bold text-purple-600 mb-2">INVOICE</h2>
          <div className="text-gray-600 space-y-1">
            <p><strong>Invoice #:</strong> {invoice.invoice_number}</p>
            <p><strong>Date:</strong> {formatDate(invoice.created_at)}</p>
            <p><strong>Due Date:</strong> {formatDate(invoice.due_date)}</p>
          </div>
        </div>
      </div>

      {/* Client Information */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Bill To:</h3>
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="font-medium text-gray-900">{invoice.client_name}</p>
          <p className="text-gray-600">{invoice.client_email}</p>
          {invoice.client_address && (
            <p className="text-gray-600">{invoice.client_address}</p>
          )}
        </div>
      </div>

      {/* Invoice Items */}
      <div className="mb-8">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="text-left p-3 font-semibold text-gray-900 border-b-2 border-gray-300">
                Description
              </th>
              <th className="text-center p-3 font-semibold text-gray-900 border-b-2 border-gray-300">
                Qty
              </th>
              <th className="text-right p-3 font-semibold text-gray-900 border-b-2 border-gray-300">
                Unit Price
              </th>
              <th className="text-right p-3 font-semibold text-gray-900 border-b-2 border-gray-300">
                Tax Rate
              </th>
              <th className="text-right p-3 font-semibold text-gray-900 border-b-2 border-gray-300">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item, index) => (
              <tr key={index} className="border-b border-gray-200">
                <td className="p-3 text-gray-900">{item.description}</td>
                <td className="p-3 text-center text-gray-900">{item.quantity}</td>
                <td className="p-3 text-right text-gray-900">
                  {formatCurrency(item.unit_price)}
                </td>
                <td className="p-3 text-right text-gray-900">{item.tax_rate}%</td>
                <td className="p-3 text-right text-gray-900">
                  {formatCurrency(item.line_total)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div className="flex justify-end mb-8">
        <div className="w-64">
          <div className="space-y-2">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal:</span>
              <span>{formatCurrency(invoice.subtotal_amount)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Tax:</span>
              <span>{formatCurrency(invoice.tax_amount)}</span>
            </div>
            {invoice.discount_amount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount{invoice.discount_type === 'percentage' && invoice.discount_value ? ` (${invoice.discount_value}%)` : ''}:</span>
                <span>-{formatCurrency(invoice.discount_amount)}</span>
              </div>
            )}
            <div className="border-t pt-2">
              <div className="flex justify-between text-xl font-bold text-gray-900">
                <span>Total:</span>
                <span>{formatCurrency(invoice.total_amount)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Terms */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Payment Terms</h3>
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-gray-700 mb-2">
            <strong>Payment Terms:</strong> {invoice.payment_terms}
          </p>
          <p className="text-gray-700">
            Payment is due within the specified terms. Late payments may be subject to additional charges.
          </p>
        </div>
      </div>

      {/* Notes */}
      {invoice.notes && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Notes</h3>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-gray-700">{invoice.notes}</p>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="border-t pt-6 text-center text-gray-500">
        <p>Thank you for your business!</p>
        <p className="text-sm mt-2">
          For questions about this invoice, please contact {companyInfo.email}
        </p>
      </div>
    </div>
  );
};

export default InvoiceTemplate;
