import React, { useState, useEffect } from 'react';
import { X, Download, Printer, Send } from 'lucide-react';
import InvoiceTemplate from './InvoiceTemplate';
import { getInvoice } from '../../api/invoices';

interface InvoiceViewerProps {
  invoiceId: string;
  isOpen: boolean;
  onClose: () => void;
}

const InvoiceViewer: React.FC<InvoiceViewerProps> = ({
  invoiceId,
  isOpen,
  onClose
}) => {
  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && invoiceId) {
      fetchInvoice();
    }
  }, [isOpen, invoiceId]);

  const fetchInvoice = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await getInvoice(invoiceId);
      
      // Format the data for the template
      const formattedInvoice = {
        invoice_number: data.invoice_number,
        client_name: data.crm_clients?.name || 'Unknown Client',
        client_email: data.crm_clients?.email || '',
        client_address: [
          data.crm_clients?.address1,
          data.crm_clients?.city,
          data.crm_clients?.country
        ].filter(Boolean).join(', '),
        due_date: data.due_date,
        created_at: data.created_at,
        currency: data.currency || 'EUR',
        payment_terms: data.payment_terms || 'Net 30',
        notes: data.notes,
        subtotal_amount: data.subtotal_amount || 0,
        tax_amount: data.tax_amount || 0,
        discount_amount: data.discount_amount || 0,
        total_amount: data.total_amount || 0,
        items: data.crm_invoice_items?.map((item: any) => ({
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          tax_rate: item.tax_rate,
          line_total: item.line_total
        })) || []
      };
      
      setInvoice(formattedInvoice);
    } catch (err) {
      // console.error removed
      setError('Failed to load invoice');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    // This would integrate with a PDF generation service
    // For now, we'll use the browser's print to PDF function
    window.print();
  };

  const handleSendInvoice = async () => {
    // This would integrate with an email service
    alert('Email functionality would be integrated here');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 print:hidden">
          <h2 className="text-xl font-semibold text-gray-900">
            Invoice Preview
          </h2>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleSendInvoice}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Send size={16} className="mr-2" />
              Send
            </button>
            <button
              onClick={handleDownloadPDF}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <Download size={16} className="mr-2" />
              PDF
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              <Printer size={16} className="mr-2" />
              Print
            </button>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 p-2"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
              <span className="ml-2 text-gray-600">Loading invoice...</span>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <p className="text-red-600 mb-2">{error}</p>
                <button
                  onClick={fetchInvoice}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  Retry
                </button>
              </div>
            </div>
          ) : invoice ? (
            <InvoiceTemplate invoice={invoice} />
          ) : (
            <div className="flex items-center justify-center h-64">
              <p className="text-gray-600">No invoice data available</p>
            </div>
          )}
        </div>
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          .print\\:hidden {
            display: none !important;
          }
          
          body * {
            visibility: hidden;
          }
          
          .invoice-template, .invoice-template * {
            visibility: visible;
          }
          
          .invoice-template {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
};

export default InvoiceViewer;
