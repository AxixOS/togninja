import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Download, MessageCircle, Printer, CheckCircle, XCircle } from 'lucide-react';
import InvoiceTemplate from '../components/invoice/InvoiceTemplate';
import { useLanguage } from '../context/LanguageContext';

interface Invoice {
  id: string;
  invoice_number: string;
  client_id: string;
  amount: number;
  tax_amount: number;
  total_amount: number;
  subtotal_amount: number;
  discount_amount: number;
  currency: string;
  status: string;
  due_date: string;
  payment_terms: string;
  notes?: string;
  footer_text?: string;
  paid_amount?: number;
  created_at: string;
  client?: {
    name: string;
    email: string;
    address1?: string;
    address2?: string;
    zip?: string;
    city?: string;
    country?: string;
    phone?: string;
  };
  items?: Array<{
    description: string;
    quantity: number;
    unit_price: number;
    tax_rate: number;
    line_total: number;
    note?: string;
  }>;
}

const PublicInvoicePage: React.FC = () => {
  const { invoiceId } = useParams<{ invoiceId: string }>();
  const [searchParams] = useSearchParams();
  const { language } = useLanguage();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'success' | 'cancelled' | null>(null);

  // Check for payment result from URL params
  useEffect(() => {
    const payment = searchParams.get('payment');
    const sessionId = searchParams.get('session_id');
    
    if (payment === 'success' && sessionId && invoiceId) {
      setPaymentStatus('success');
      // Verify payment with backend
      verifyPayment(invoiceId, sessionId);
    } else if (payment === 'cancelled') {
      setPaymentStatus('cancelled');
    }
  }, [searchParams, invoiceId]);

  const verifyPayment = async (invId: string, sessionId: string) => {
    try {
      const response = await fetch(`/api/invoices/${invId}/payment-status?session_id=${sessionId}`);
      if (response.ok) {
        // Refresh invoice data to show updated status
        fetchInvoice();
      }
    } catch (err) {
      console.error('Error verifying payment:', err);
    }
  };

  const fetchInvoice = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/invoices/public/${invoiceId}`);
      
      if (!response.ok) {
        throw new Error('Invoice not found');
      }
      
      const data = await response.json();
      
      // Map the API response to our Invoice interface
      const mappedInvoice: Invoice = {
        id: data.id,
        invoice_number: data.invoiceNumber || data.invoice_number,
        client_id: data.clientId || data.client_id,
        amount: parseFloat(data.subtotal || '0'),
        tax_amount: parseFloat(data.taxAmount || data.tax_amount || '0'),
        total_amount: parseFloat(data.total || data.total_amount || '0'),
        subtotal_amount: parseFloat(data.subtotal || data.subtotal_amount || '0'),
        discount_amount: parseFloat(data.discountAmount || data.discount_amount || '0'),
        currency: data.currency || 'EUR',
        status: data.status || 'draft',
        due_date: data.dueDate || data.due_date,
        payment_terms: data.paymentTerms || data.payment_terms || 'Net 30',
        notes: data.notes,
        footer_text: data.footerText || data.footer_text,
        paid_amount: parseFloat(data.paidAmount || data.paid_amount || '0'),
        created_at: data.createdAt || data.created_at || data.issueDate,
        client: data.client ? {
          name: `${data.client.firstName || ''} ${data.client.lastName || ''}`.trim() || data.client.name || 'Customer',
          email: data.client.email || '',
          address1: data.client.address || data.client.address1,
          address2: data.client.address2,
          zip: data.client.zip,
          city: data.client.city,
          country: data.client.country,
          phone: data.client.phone,
        } : undefined,
        items: data.items?.map((item: any) => ({
          description: item.description,
          quantity: parseFloat(item.quantity || '1'),
          unit_price: parseFloat(item.unitPrice || item.unit_price || '0'),
          tax_rate: parseFloat(item.taxRate || item.tax_rate || '0'),
          line_total: parseFloat(item.unitPrice || item.unit_price || '0') * parseFloat(item.quantity || '1'),
          note: item.note,
        })) || [],
      };
      
      setInvoice(mappedInvoice);
    } catch (err: any) {
      setError(err.message || 'Failed to load invoice');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (invoiceId) {
      fetchInvoice();
    }
  }, [invoiceId]);

  const handlePayNow = async () => {
    if (!invoice || isProcessingPayment) return;
    
    try {
      setIsProcessingPayment(true);
      
      const response = await fetch(`/api/invoices/${invoice.id}/create-payment-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();
      
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to create payment session');
      }
      
      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No payment URL returned');
      }
    } catch (err: any) {
      console.error('Payment error:', err);
      alert(err.message || 'Failed to initiate payment. Please try again.');
      setIsProcessingPayment(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!invoice) return;
    
    try {
      const response = await fetch(`/api/crm/invoices/${invoice.id}/pdf`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': 'application/pdf'
        }
      });
      
      if (!response.ok) {
        throw new Error(`PDF generation failed: ${response.status}`);
      }
      
      const blob = await response.blob();
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `${language === 'en' ? 'Invoice' : 'Rechnung'}-${invoice.invoice_number || invoice.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('PDF download failed:', error);
      alert('PDF download failed. Please try again.');
    }
  };

  const handleWhatsAppContact = () => {
    const message = language === 'en'
      ? `Hello! I have a question about invoice #${invoice?.invoice_number}`
      : `Hallo! Ich habe eine Frage zur Rechnung #${invoice?.invoice_number}`;
    const whatsappUrl = `https://wa.me/4367763399210?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handlePrintInvoice = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{language === 'en' ? 'Loading invoice...' : 'Rechnung wird geladen...'}</p>
        </div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-red-600 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{language === 'en' ? 'Invoice Not Found' : 'Rechnung nicht gefunden'}</h1>
          <p className="text-gray-600 mb-4">
            {error || (language === 'en' ? 'The invoice you are looking for does not exist or has been removed.' : 'Die gesuchte Rechnung existiert nicht oder wurde entfernt.')}
          </p>
          <a 
            href="https://newagefotografie.com" 
            className="text-purple-600 hover:text-purple-800 underline"
          >
            {language === 'en' ? 'Return to New Age Fotografie' : 'Zurück zu New Age Fotografie'}
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Payment Status Banner */}
      {paymentStatus === 'success' && (
        <div className="bg-green-600 text-white py-4">
          <div className="max-w-4xl mx-auto px-4 flex items-center justify-center">
            <CheckCircle className="w-6 h-6 mr-2" />
            <span className="font-medium">{language === 'en' ? 'Payment successful! Thank you for your payment.' : 'Zahlung erfolgreich! Vielen Dank für Ihre Zahlung.'}</span>
          </div>
        </div>
      )}
      
      {paymentStatus === 'cancelled' && (
        <div className="bg-yellow-500 text-white py-4">
          <div className="max-w-4xl mx-auto px-4 flex items-center justify-center">
            <XCircle className="w-6 h-6 mr-2" />
            <span className="font-medium">{language === 'en' ? 'Payment was cancelled. You can try again using the Pay Now button.' : 'Zahlung wurde abgebrochen. Sie können es über die Schaltfläche "Jetzt bezahlen" erneut versuchen.'}</span>
          </div>
        </div>
      )}

      {/* Header with Actions */}
      <div className="bg-white shadow-sm border-b no-print">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                {language === 'en' ? 'Invoice' : 'Rechnung'} #{invoice.invoice_number}
              </h1>
              <p className="text-sm text-gray-600">
                {language === 'en' ? 'From New Age Fotografie' : 'Von New Age Fotografie'}
              </p>
            </div>
            
            <div className="flex items-center space-x-3 flex-wrap gap-2">
              <button
                onClick={handleWhatsAppContact}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                <span>{language === 'en' ? 'Contact Us' : 'Kontakt'}</span>
              </button>
              
              <button
                onClick={handlePrintInvoice}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                <Printer className="w-4 h-4" />
                <span>{language === 'en' ? 'Print' : 'Drucken'}</span>
              </button>
              
              <button
                onClick={handleDownloadPDF}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>{language === 'en' ? 'Download PDF' : 'PDF herunterladen'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Invoice Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <InvoiceTemplate 
            invoice={invoice}
            showPayButton={true}
            onPayNow={handlePayNow}
            isProcessingPayment={isProcessingPayment}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="bg-white border-t no-print">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="text-center text-sm text-gray-600">
            <p className="mb-2">
              {language === 'en'
                ? <>Questions about this invoice? Contact us on WhatsApp or email us at{' '}</>
                : <>Fragen zu dieser Rechnung? Kontaktieren Sie uns per WhatsApp oder E-Mail an{' '}</>}
              <a 
                href="mailto:hallo@newagefotografie.com"
                className="text-purple-600 hover:text-purple-800"
              >
                hallo@newagefotografie.com
              </a>
            </p>
            <p>
              © 2026 New Age Fotografie - {language === 'en' ? 'Professional Photography Services in Vienna' : 'Professionelle Fotografie-Dienstleistungen in Wien'}
            </p>
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          .no-print {
            display: none !important;
          }
          
          body {
            margin: 0;
            padding: 0;
          }
          
          .print-only {
            display: block !important;
          }
        }
      `}</style>
    </div>
  );
};

export default PublicInvoicePage;
