import React, { useEffect, useState, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Download, MessageCircle, Printer, CheckCircle, XCircle } from 'lucide-react';
import InvoiceTemplate from '../components/invoice/InvoiceTemplate';
import { useLanguage } from '../context/LanguageContext';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { SITE } from '../config/site';

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
  document_type?: string;
  documentType?: string;
  disable_online_payment?: boolean;
  online_payment_available?: boolean;
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
    vatNumber?: string;
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
  const invoiceRef = useRef<HTMLDivElement>(null);

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
        disable_online_payment: data.disableOnlinePayment || data.disable_online_payment || false,
        // Older responses predate this field; treating "missing" as available keeps
        // studios that DO have Stripe working if they run an older server build.
        online_payment_available: data.onlinePaymentAvailable !== false,
        footer_text: data.footerText || data.footer_text,
        paid_amount: parseFloat(data.paidAmount || data.paid_amount || '0'),
        created_at: data.issueDate || data.issue_date || data.createdAt || data.created_at,
        client: data.client ? {
          name: `${data.client.firstName || ''} ${data.client.lastName || ''}`.trim() || data.client.name || 'Customer',
          email: data.client.email || '',
          address1: data.client.address || data.client.address1,
          address2: data.client.address2,
          zip: data.client.zip,
          city: data.client.city,
          country: data.client.country,
          phone: data.client.phone,
          vatNumber: data.client.vatNumber,
        } : undefined,
        document_type: data.documentType || data.document_type || 'invoice',
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

  // An optional thank-you, chosen by the person paying.
  //
  // Offered here rather than as a line the studio adds to the invoice: an amount the
  // studio puts on the bill is a surcharge, not a tip. Zero by default and never
  // pre-selected — a tip that has to be actively removed is a dark pattern, and a
  // photographer who wants to keep the client is worse off for it.
  const [tipAmount, setTipAmount] = useState<number>(0);

  const handlePayNow = async () => {
    if (!invoice || isProcessingPayment) return;
    
    try {
      setIsProcessingPayment(true);
      
      const response = await fetch(`/api/invoices/${invoice.id}/create-payment-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        // The tip the CLIENT chose. Sent as a number the server re-validates and caps —
        // this endpoint is public by design, so nothing arriving from here is trusted.
        body: JSON.stringify({ tip: tipAmount > 0 ? tipAmount : undefined }),
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
    if (!invoice || !invoiceRef.current) return;
    
    try {
      const element = invoiceRef.current;

      // Temporarily hide the PAY NOW button for the PDF capture
      const payButtons = element.querySelectorAll('button');
      const hiddenButtons: HTMLElement[] = [];
      payButtons.forEach(btn => {
        if (btn.textContent?.includes('PAY NOW') || btn.textContent?.includes('JETZT BEZAHLEN')) {
          (btn as HTMLElement).style.display = 'none';
          hiddenButtons.push(btn as HTMLElement);
        }
      });

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
      });

      // Restore hidden buttons
      hiddenButtons.forEach(btn => { btn.style.display = ''; });

      // A4 dimensions in mm
      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 5;
      const contentWidth = pageWidth - margin * 2;

      const imgWidth = contentWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgData = canvas.toDataURL('image/png');

      // Handle multi-page if content is taller than one page
      const usableHeight = pageHeight - margin * 2;
      if (imgHeight <= usableHeight) {
        pdf.addImage(imgData, 'PNG', margin, margin, imgWidth, imgHeight);
      } else {
        // Split across pages
        let remainingHeight = imgHeight;
        let sourceY = 0;
        let page = 0;

        while (remainingHeight > 0) {
          if (page > 0) pdf.addPage();

          const sliceHeight = Math.min(usableHeight, remainingHeight);
          // Calculate source slice in canvas pixels
          const sourceSliceHeight = (sliceHeight / imgHeight) * canvas.height;

          const sliceCanvas = document.createElement('canvas');
          sliceCanvas.width = canvas.width;
          sliceCanvas.height = sourceSliceHeight;
          const ctx = sliceCanvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(canvas, 0, sourceY, canvas.width, sourceSliceHeight, 0, 0, canvas.width, sourceSliceHeight);
            const sliceData = sliceCanvas.toDataURL('image/png');
            pdf.addImage(sliceData, 'PNG', margin, margin, imgWidth, sliceHeight);
          }

          sourceY += sourceSliceHeight;
          remainingHeight -= sliceHeight;
          page++;
        }
      }

      pdf.save(`${language === 'en' ? 'Invoice' : 'Rechnung'}-${invoice.invoice_number || invoice.id}.pdf`);
    } catch (error) {
      console.error('PDF download failed:', error);
      alert('PDF download failed. Please try again.');
    }
  };

  const handleWhatsAppContact = () => {
    const message = language === 'en'
      ? `Hello! I have a question about invoice #${invoice?.invoice_number}`
      : `Hallo! Ich habe eine Frage zur Rechnung #${invoice?.invoice_number}`;
    const whatsappUrl = `https://wa.me/${SITE.phone.replace(/[^0-9]/g,'')}?text=${encodeURIComponent(message)}`;
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
            href={SITE.url}
            className="text-purple-600 hover:text-purple-800 underline"
          >
            {language === 'en' ? `Return to ${SITE.name}` : `Zurück zu ${SITE.name}`}
          </a>
        </div>
      </div>
    );
  }

  // Whether this invoice can be paid on this page at all: the studio has not turned
  // card payment off for it, AND this instance has a usable Stripe key. Everything
  // that leads a client toward checkout hangs off this — the button and the tip.
  const canPayOnline = !invoice.disable_online_payment && invoice.online_payment_available !== false;

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
                {(() => {
                  const docType = invoice.document_type || invoice.documentType || 'invoice';
                  const labels: Record<string, Record<string, string>> = {
                    en: { invoice: 'Invoice', quote: 'Quote', estimate: 'Estimate' },
                    de: { invoice: 'Rechnung', quote: 'Angebot', estimate: 'Kostenvoranschlag' }
                  };
                  return (labels[language] || labels.en)[docType] || (labels.en)[docType] || 'Invoice';
                })()} #{invoice.invoice_number}
              </h1>
              <p className="text-sm text-gray-600">
                {language === 'en' ? `From ${SITE.name}` : `Von ${SITE.name}`}
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
        <div ref={invoiceRef} className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* PAY NOW is hidden when the studio switched it off for this invoice, and
              when the instance has no working Stripe key — a button that can only
              503 is worse than no button on a document the client must pay. */}
          <InvoiceTemplate
            invoice={invoice}
            showPayButton={canPayOnline}
            onPayNow={handlePayNow}
            isProcessingPayment={isProcessingPayment}
          />
        </div>
      </div>

      {/* An optional thank-you.

          Only shown when there is something to pay and online payment is on — offering to
          tip on a settled invoice is noise. Nothing is preselected: a tip that has to be
          actively removed is a dark pattern, and a photographer who wants the client back
          next year is worse off for it. */}
      {canPayOnline && String(invoice.status).toLowerCase() !== 'paid' && (
        <div className="max-w-4xl mx-auto px-4 pb-8 no-print">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
            <p className="text-sm font-medium text-gray-900">
              {language === 'en' ? 'Add a tip?' : 'Trinkgeld hinzufügen?'}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              {language === 'en'
                ? 'Entirely optional, and it goes to the photographer.'
                : 'Völlig freiwillig und geht direkt an den Fotografen.'}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {[0, 5, 10, 15].map((pct) => {
                const amount = pct === 0
                  ? 0
                  : Math.round(((parseFloat(String(invoice.total_amount ?? 0)) || 0) * pct) / 100 * 100) / 100;
                const active = Math.abs(tipAmount - amount) < 0.005;
                return (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => setTipAmount(amount)}
                    className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                      active
                        ? 'bg-gray-900 text-white border-gray-900'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    {pct === 0 ? (language === 'en' ? 'No thanks' : 'Nein danke') : `${pct}%`}
                  </button>
                );
              })}
              <div className="flex items-center gap-2 ml-1">
                <span className="text-sm text-gray-500">
                  {language === 'en' ? 'or' : 'oder'}
                </span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={tipAmount > 0 ? String(tipAmount) : ''}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    setTipAmount(Number.isFinite(v) && v > 0 ? v : 0);
                  }}
                  placeholder={language === 'en' ? 'amount' : 'Betrag'}
                  className="w-28 px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
                />
              </div>
            </div>
            {tipAmount > 0 && (
              <p className="mt-3 text-sm text-gray-700">
                {language === 'en'
                  ? `You'll be charged the invoice plus a ${tipAmount.toFixed(2)} tip.`
                  : `Ihnen wird die Rechnung zuzüglich ${tipAmount.toFixed(2)} Trinkgeld berechnet.`}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="bg-white border-t no-print">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="text-center text-sm text-gray-600">
            <p className="mb-2">
              {language === 'en'
                ? <>Questions about this invoice? Contact us on WhatsApp or email us at{' '}</>
                : <>Fragen zu dieser Rechnung? Kontaktieren Sie uns per WhatsApp oder E-Mail an{' '}</>}
              <a
                href={`mailto:${SITE.email}`}
                className="text-purple-600 hover:text-purple-800"
              >
                {SITE.email}
              </a>
            </p>
            <p>
              © 2026 {SITE.name} - {language === 'en' ? 'Professional Photography Services in Vienna' : 'Professionelle Fotografie-Dienstleistungen in Wien'}
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
