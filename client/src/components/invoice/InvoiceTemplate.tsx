import React, { useState, useEffect } from 'react';
import { Lock } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { SITE } from '../../config/site';

const invoiceI18n: Record<string, Record<string, string>> = {
  en: {
    invoice: 'INVOICE',
    quote: 'QUOTE',
    estimate: 'ESTIMATE',
    invoiced: 'INVOICED',
    quoted: 'QUOTED',
    estimated: 'ESTIMATED',
    shipTo: 'SHIP TO:',
    billTo: 'BILL TO:',
    name: 'Name',
    price: 'Price',
    qty: 'Qty',
    lineTotal: 'Line Total',
    taxable: 'Taxable',
    subtotal: 'Subtotal:',
    vat: 'VAT (0%):',
    discount: 'Discount',
    total: 'Total:',
    paidToDate: 'Paid to Date:',
    balance: 'Balance:',
    invoiceSubtotal: 'Invoice Subtotal:',
    invoiceTotal: 'Invoice Total:',
    quoteSubtotal: 'Quote Subtotal:',
    quoteTotal: 'Quote Total:',
    quoteBalance: 'Quote Balance:',
    estimateSubtotal: 'Estimate Subtotal:',
    estimateTotal: 'Estimate Total:',
    estimateBalance: 'Estimate Balance:',
    paid: 'Paid',
    invoiceBalance: 'Invoice Balance:',
    paidInFull: 'PAID IN FULL',
    payNow: 'PAY NOW',
    processing: 'Processing...',
    imageProduct: 'Image & Product file',
    contactStudioName: 'CONTACT STUDIO/NAME',
    address: 'Address',
    notes: 'Notes',
  },
  de: {
    invoice: 'RECHNUNG',
    quote: 'ANGEBOT',
    estimate: 'KOSTENVORANSCHLAG',
    invoiced: 'RECHNUNGSDATUM',
    quoted: 'ANGEBOTSDATUM',
    estimated: 'DATUM',
    shipTo: 'LIEFERADRESSE:',
    billTo: 'RECHNUNGSADRESSE:',
    name: 'Bezeichnung',
    price: 'Preis',
    qty: 'Menge',
    lineTotal: 'Gesamt',
    taxable: 'Steuer',
    subtotal: 'Zwischensumme:',
    vat: 'USt. (0%):',
    discount: 'Rabatt',
    total: 'Gesamtbetrag:',
    paidToDate: 'Bereits bezahlt:',
    balance: 'Offener Betrag:',
    invoiceSubtotal: 'Rechnungs-Zwischensumme:',
    invoiceTotal: 'Rechnungsbetrag:',
    quoteSubtotal: 'Angebots-Zwischensumme:',
    quoteTotal: 'Angebotsbetrag:',
    quoteBalance: 'Offener Angebotsbetrag:',
    estimateSubtotal: 'Kostenvoranschlag-Zwischensumme:',
    estimateTotal: 'Kostenvoranschlagsbetrag:',
    estimateBalance: 'Offener Kostenvoranschlagsbetrag:',
    paid: 'Bezahlt',
    invoiceBalance: 'Offener Rechnungsbetrag:',
    paidInFull: 'VOLLSTÄNDIG BEZAHLT',
    payNow: 'JETZT BEZAHLEN',
    processing: 'Wird verarbeitet...',
    imageProduct: 'Bild & Produktdatei',
    contactStudioName: 'KONTAKT STUDIO/NAME',
    address: 'Adresse',
    notes: 'Anmerkungen',
  }
};

interface StudioConfig {
  logo: string | null;
  studioName: string;
  address: string;
  addressNote: string;
  phone: string;
  email: string;
  openingHours: string;
}

interface InvoiceTemplateProps {
  invoice: {
    id: string;
    invoice_number: string;
    client_id: string;
    amount: number;
    tax_amount: number;
    total_amount: number;
    subtotal_amount: number;
    discount_amount: number;
    discount_type?: 'fixed' | 'percentage';
    discount_value?: number;
    currency: string;
    status: string;
    due_date: string;
    payment_terms: string;
    notes?: string;
    footer_text?: string;
    paid_amount?: number;
    document_type?: string;
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
  };
  showPayButton?: boolean;
  onPayNow?: () => void;
  isProcessingPayment?: boolean;
}

const InvoiceTemplate: React.FC<InvoiceTemplateProps> = ({ invoice, showPayButton = false, onPayNow, isProcessingPayment = false }) => {
  // Debug: Log what the template receives
  console.log('📄 INVOICE TEMPLATE RECEIVED:', invoice);
  
  const { language } = useLanguage();
  const tx = (key: string) => (invoiceI18n[language] || invoiceI18n.en)[key] || invoiceI18n.en[key] || key;
  
  // State for studio configuration
  const [studioConfig, setStudioConfig] = useState<StudioConfig>({
    logo: null,
    studioName: SITE.name,
    address: 'Wehrgasse 11A/2+5, 1050 Wien',
    addressNote: '',
    phone: '+43 699 194 77 607',
    email: SITE.email,
    openingHours: 'Termine nach Vereinbarung'
  });
  const [configLoaded, setConfigLoaded] = useState(false);
  
  // Fetch studio configuration on mount
  useEffect(() => {
    const fetchStudioConfig = async () => {
      try {
        const response = await fetch('/api/studio-config?language=de');
        if (response.ok) {
          const config = await response.json();
          setStudioConfig(config);
        }
      } catch (error) {
        console.error('Failed to fetch studio config:', error);
        // Keep default values if fetch fails
      } finally {
        setConfigLoaded(true);
      }
    };
    
    fetchStudioConfig();
  }, []);
  
  // Calculate balance
  const paidAmount = invoice.paid_amount || 0;
  const balanceDue = invoice.total_amount - paidAmount;
  
  const formatDate = (dateString: string) => {
    if (!dateString) return 'No Date';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid Date';
      const locale = language === 'en' ? 'en-US' : 'de-DE';
      return date.toLocaleDateString(locale, { 
        day: '2-digit', 
        month: 'long', 
        year: 'numeric' 
      }).toUpperCase();
    } catch (e) {
      return 'Invalid Date';
    }
  };

  const formatCurrency = (amount: number, currency: string = 'EUR') => {
    if (amount === null || amount === undefined || isNaN(amount)) return '0,00 €';
    if (language === 'en') {
      return '€' + new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(amount);
    }
    return new Intl.NumberFormat('de-DE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount) + ' €';
  };

  return (
    <>
    <style>{`
      @media (max-width: 640px) {
        .invoice-template {
          padding: 20px !important;
          box-shadow: none !important;
        }
        .invoice-header {
          flex-direction: column !important;
          gap: 20px !important;
        }
        .invoice-title {
          font-size: 28px !important;
          text-align: left !important;
        }
        .invoice-header-right {
          text-align: left !important;
        }
        .invoice-addresses {
          grid-template-columns: 1fr !important;
          gap: 20px !important;
        }
        .invoice-table-wrapper {
          overflow-x: auto !important;
          -webkit-overflow-scrolling: touch !important;
        }
        .invoice-table {
          min-width: 500px !important;
        }
        .invoice-totals-container {
          justify-content: stretch !important;
        }
        .invoice-totals-box,
        .invoice-payment-summary {
          width: 100% !important;
        }
        .invoice-paid-stamp {
          font-size: 32px !important;
          top: 200px !important;
          right: 20px !important;
          padding: 10px 20px !important;
        }
        .invoice-footer-text-box {
          margin-bottom: 20px !important;
        }
      }
    `}</style>
    <div className="invoice-template bg-white" style={{
      maxWidth: '850px',
      margin: '0 auto',
      padding: '60px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      color: '#2c3e50',
      backgroundColor: '#fff',
      boxShadow: '0 0 30px rgba(0,0,0,0.1)',
      position: 'relative'
    }}>
      {/* Header with Logo and Company Info */}
      <div className="invoice-header" style={{
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: '50px'
      }}>
        {/* Left: Company Info */}
        <div style={{ flex: 1 }}>
          {studioConfig.logo ? (
            <img 
              src={studioConfig.logo} 
              alt={studioConfig.studioName}
              style={{
                maxWidth: '180px',
                maxHeight: '80px',
                marginBottom: '20px',
                objectFit: 'contain'
              }}
            />
          ) : !configLoaded ? (
            <div style={{
              width: '140px',
              height: '60px',
              marginBottom: '20px'
            }} />
          ) : (
            <div style={{
              width: '140px',
              height: '60px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '20px',
              borderRadius: '4px'
            }}>
              <div style={{
                color: 'white',
                fontSize: '16px',
                fontWeight: 'bold',
                letterSpacing: '1px',
                textAlign: 'center',
                lineHeight: '1.2'
              }}>
                {studioConfig.studioName.split(' ').map((word, i) => (
                  <React.Fragment key={i}>
                    {word.toUpperCase()}
                    {i < studioConfig.studioName.split(' ').length - 1 && <br/>}
                  </React.Fragment>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Invoice Header */}
        <div className="invoice-header-right" style={{ textAlign: 'right' }}>
          <h1 className="invoice-title" style={{
            fontSize: '48px',
            fontWeight: '300',
            margin: '0 0 15px 0',
            color: '#2c3e50',
            letterSpacing: '3px'
          }}>
            {tx(invoice.document_type || 'invoice')}
          </h1>
          <div style={{ 
            fontSize: '16px', 
            fontWeight: 'bold', 
            color: '#667eea',
            marginBottom: '15px'
          }}>
            #{invoice.invoice_number}
          </div>
          <div style={{ 
            fontSize: '11px', 
            color: '#666',
            fontWeight: 'bold',
            textTransform: 'uppercase',
            letterSpacing: '1px'
          }}>
            {tx(invoice.document_type === 'quote' ? 'quoted' : invoice.document_type === 'estimate' ? 'estimated' : 'invoiced')}: {formatDate(invoice.created_at)}
          </div>
        </div>
      </div>

      {/* Ship To and Bill To Section */}
      <div className="invoice-addresses" style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '40px',
        marginBottom: '50px'
      }}>
        {/* Ship To */}
        <div>
          <div style={{
            fontSize: '10px',
            fontWeight: 'bold',
            textTransform: 'uppercase',
            letterSpacing: '1.5px',
            color: '#667eea',
            marginBottom: '12px'
          }}>
            {tx('shipTo')}
          </div>
          <div style={{ fontSize: '13px', lineHeight: '1.6', color: '#2c3e50' }}>
            <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
              {invoice.client?.name}
            </div>
            {invoice.client?.address1 && (
              <div style={{ color: '#666' }}>{invoice.client.address1}</div>
            )}
            {invoice.client?.city && (
              <div style={{ color: '#666' }}>
                {invoice.client.zip ? `${invoice.client.zip} ` : ''}{invoice.client.city}, {invoice.client?.country || 'Austria'}
              </div>
            )}
            <div style={{ color: '#666', marginTop: '6px' }}>
              {invoice.client?.email}
            </div>
            {invoice.client?.phone && (
              <div style={{ color: '#666' }}>{invoice.client.phone}</div>
            )}
            {invoice.client?.vatNumber && (
              <div style={{ color: '#666' }}>UID: {invoice.client.vatNumber}</div>
            )}
          </div>
        </div>

        {/* Bill To */}
        <div>
          <div style={{
            fontSize: '10px',
            fontWeight: 'bold',
            textTransform: 'uppercase',
            letterSpacing: '1.5px',
            color: '#667eea',
            marginBottom: '12px'
          }}>
            {tx('billTo')}
          </div>
          <div style={{ fontSize: '13px', lineHeight: '1.6', color: '#2c3e50' }}>
            <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
              {invoice.client?.name}
            </div>
            {invoice.client?.address1 && (
              <div style={{ color: '#666' }}>{invoice.client.address1}</div>
            )}
            {invoice.client?.city && (
              <div style={{ color: '#666' }}>
                {invoice.client.zip ? `${invoice.client.zip} ` : ''}{invoice.client.city}, {invoice.client?.country || 'Austria'}
              </div>
            )}
            <div style={{ color: '#666', marginTop: '6px' }}>
              {invoice.client?.email}
            </div>
            {invoice.client?.phone && (
              <div style={{ color: '#666' }}>{invoice.client.phone}</div>
            )}
            {invoice.client?.vatNumber && (
              <div style={{ color: '#666' }}>UID: {invoice.client.vatNumber}</div>
            )}
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div className="invoice-table-wrapper" style={{ marginBottom: '40px', overflowX: 'auto' }}>
      <table className="invoice-table" style={{
        width: '100%',
        borderCollapse: 'collapse',
        marginBottom: '40px'
      }}>
        <thead>
          <tr style={{
            borderBottom: '2px solid #e0e0e0'
          }}>
            <th style={{
              padding: '15px 10px',
              textAlign: 'left',
              fontSize: '11px',
              fontWeight: '600',
              color: '#666',
              textTransform: 'uppercase',
              letterSpacing: '1px'
            }}>
              {tx('name')}
            </th>
            <th style={{
              padding: '15px 10px',
              textAlign: 'right',
              fontSize: '11px',
              fontWeight: '600',
              color: '#666',
              textTransform: 'uppercase',
              letterSpacing: '1px'
            }}>
              {tx('price')}
            </th>
            <th style={{
              padding: '15px 10px',
              textAlign: 'center',
              fontSize: '11px',
              fontWeight: '600',
              color: '#666',
              textTransform: 'uppercase',
              letterSpacing: '1px'
            }}>
              {tx('qty')}
            </th>
            <th style={{
              padding: '15px 10px',
              textAlign: 'right',
              fontSize: '11px',
              fontWeight: '600',
              color: '#666',
              textTransform: 'uppercase',
              letterSpacing: '1px'
            }}>
              {tx('lineTotal')}
            </th>
            <th style={{
              padding: '15px 10px',
              textAlign: 'right',
              fontSize: '11px',
              fontWeight: '600',
              color: '#666',
              textTransform: 'uppercase',
              letterSpacing: '1px'
            }}>
              {tx('taxable')}
            </th>
          </tr>
        </thead>
        <tbody>
          {invoice.items?.map((item, index) => (
            <tr key={index} style={{
              borderBottom: '1px solid #f0f0f0'
            }}>
              <td style={{ 
                padding: '20px 10px',
                fontSize: '13px'
              }}>
                <div style={{ fontWeight: '500', color: '#2c3e50', marginBottom: '4px' }}>
                  {item.description}
                </div>
                <div style={{ fontSize: '11px', color: '#999' }}>
                  {tx('imageProduct')}
                </div>
              </td>
              <td style={{ 
                padding: '20px 10px',
                textAlign: 'right',
                fontSize: '13px',
                color: '#2c3e50'
              }}>
                {formatCurrency(item.unit_price, invoice.currency)}
              </td>
              <td style={{ 
                padding: '20px 10px',
                textAlign: 'center',
                fontSize: '13px',
                color: '#2c3e50'
              }}>
                {item.quantity}
              </td>
              <td style={{ 
                padding: '20px 10px',
                textAlign: 'right',
                fontSize: '13px',
                color: '#2c3e50',
                fontWeight: '500'
              }}>
                {formatCurrency(item.line_total, invoice.currency)}
              </td>
              <td style={{ 
                padding: '20px 10px',
                textAlign: 'right',
                fontSize: '13px',
                color: '#2c3e50'
              }}>
                {formatCurrency(item.line_total * (item.tax_rate || 0) / 100, invoice.currency)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>

      {/* Totals Section */}
      <div className="invoice-totals-container" style={{
        display: 'flex',
        justifyContent: 'flex-end',
        marginBottom: '60px'
      }}>
        <div className="invoice-totals-box" style={{ width: '350px' }}>
          {/* Subtotal */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            padding: '12px 20px',
            fontSize: '13px',
            color: '#666'
          }}>
            <span>{tx('subtotal')}</span>
            <span style={{ fontWeight: '500', color: '#2c3e50' }}>
              {formatCurrency(invoice.subtotal_amount, invoice.currency)}
            </span>
          </div>

          {/* VAT */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            padding: '12px 20px',
            fontSize: '13px',
            color: '#666'
          }}>
            <span>{(() => {
              // Show the ACTUAL effective rate. Prefer the line-item rate; otherwise derive
              // it from tax_amount / subtotal (was hardcoded to 20%, which mislabelled e.g.
              // an €7.20 tax on a €90 subtotal as "20%" when it is really 8%).
              const itemRate = invoice.items?.[0]?.tax_rate || 0;
              const derived = invoice.subtotal_amount > 0 && invoice.tax_amount > 0
                ? Math.round((invoice.tax_amount / invoice.subtotal_amount) * 100)
                : 0;
              const rate = itemRate || derived;
              return language === 'en' ? `VAT (${rate}%):` : `USt. (${rate}%):`;
            })()}</span>
            <span style={{ fontWeight: '500', color: '#2c3e50' }}>
              {formatCurrency(invoice.tax_amount, invoice.currency)}
            </span>
          </div>

          {/* Discount - only show if discount is applied */}
          {invoice.discount_amount > 0 && (
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '12px 20px',
              fontSize: '13px',
              color: '#28a745'
            }}>
              <span>
                {tx('discount')}{invoice.discount_type === 'percentage' && invoice.discount_value ? ` (${invoice.discount_value}%)` : ''}:
              </span>
              <span style={{ fontWeight: '500' }}>
                -{formatCurrency(invoice.discount_amount, invoice.currency)}
              </span>
            </div>
          )}

          {/* Total */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            padding: '15px 20px',
            fontSize: '14px',
            fontWeight: 'bold',
            backgroundColor: '#f8f9fa',
            marginTop: '10px',
            borderRadius: '4px'
          }}>
            <span style={{ color: '#2c3e50' }}>{tx('total')}</span>
            <span style={{ color: '#667eea', fontSize: '16px' }}>
              {formatCurrency(invoice.total_amount, invoice.currency)}
            </span>
          </div>

          {/* Paid to Date */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            padding: '12px 20px',
            fontSize: '13px',
            color: '#666'
          }}>
            <span>{tx('paidToDate')}</span>
            <span style={{ fontWeight: '500', color: '#2c3e50' }}>
              {formatCurrency(paidAmount, invoice.currency)}
            </span>
          </div>

          {/* Balance */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            padding: '12px 20px',
            fontSize: '13px',
            color: '#666'
          }}>
            <span>{tx('balance')}</span>
            <span style={{ fontWeight: '500', color: '#2c3e50' }}>
              {formatCurrency(balanceDue, invoice.currency)}
            </span>
          </div>
        </div>
      </div>

      {/* Payment Summary Box - matches screenshot design */}
      <div className="invoice-totals-container" style={{
        display: 'flex',
        justifyContent: 'flex-end',
        marginBottom: '30px'
      }}>
        <div className="invoice-payment-summary" style={{
          width: '350px',
          border: '1px solid #e0e0e0',
          borderRadius: '8px',
          padding: '20px',
          backgroundColor: '#fafafa'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: '8px',
            fontSize: '13px',
            color: '#666'
          }}>
            <span>{tx((invoice.document_type || 'invoice') + 'Subtotal')}</span>
            <span>{formatCurrency(invoice.subtotal_amount, invoice.currency)}</span>
          </div>
          
          {/* Discount in payment summary */}
          {invoice.discount_amount > 0 && (
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '8px',
              fontSize: '13px',
              color: '#28a745'
            }}>
              <span>
                {tx('discount')}{invoice.discount_type === 'percentage' && invoice.discount_value ? ` (${invoice.discount_value}%)` : ''}:
              </span>
              <span>-{formatCurrency(invoice.discount_amount, invoice.currency)}</span>
            </div>
          )}
          
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: '12px',
            fontSize: '14px',
            fontWeight: '600',
            color: '#2c3e50'
          }}>
            <span>{tx((invoice.document_type || 'invoice') + 'Total')}</span>
            <span>{formatCurrency(invoice.total_amount, invoice.currency)}</span>
          </div>
          
          {paidAmount > 0 && (
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '8px',
              fontSize: '13px',
              color: '#27ae60'
            }}>
              <span>{tx('paid')} {new Date().toLocaleDateString(language === 'en' ? 'en-US' : 'de-DE', { month: 'short', day: 'numeric' })}:</span>
              <span>{formatCurrency(paidAmount, invoice.currency)}</span>
            </div>
          )}
          
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            paddingTop: '12px',
            borderTop: '1px solid #e0e0e0',
            fontSize: '16px',
            fontWeight: 'bold',
            color: balanceDue > 0 ? '#e74c3c' : '#27ae60'
          }}>
            <span>{tx((invoice.document_type || 'invoice') + 'Balance')}</span>
            <span>{formatCurrency(balanceDue, invoice.currency)}</span>
          </div>
          
          {/* Pay Now Button */}
          {showPayButton && balanceDue > 0 && invoice.status !== 'paid' && (
            <button
              onClick={onPayNow}
              disabled={isProcessingPayment}
              style={{
                width: '100%',
                marginTop: '16px',
                padding: '12px 24px',
                backgroundColor: isProcessingPayment ? '#95a5a6' : '#667eea',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: isProcessingPayment ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'background-color 0.2s'
              }}
              onMouseOver={(e) => !isProcessingPayment && (e.currentTarget.style.backgroundColor = '#5a6fd6')}
              onMouseOut={(e) => !isProcessingPayment && (e.currentTarget.style.backgroundColor = '#667eea')}
            >
              <Lock size={16} />
              {isProcessingPayment ? tx('processing') : tx('payNow')}
            </button>
          )}
        </div>
      </div>

      {/* Notes */}
      {invoice.notes && (
        <div className="invoice-notes-box" style={{
          marginBottom: '20px',
          padding: '20px',
          backgroundColor: '#fffdf0',
          borderRadius: '8px',
          borderLeft: '4px solid #f0c040'
        }}>
          <div style={{
            fontSize: '11px',
            fontWeight: 600,
            color: '#8a7000',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            marginBottom: '8px'
          }}>
            {tx('notes')}
          </div>
          <div style={{
            fontSize: '12px',
            color: '#666',
            whiteSpace: 'pre-wrap',
            lineHeight: '1.6'
          }}>
            {invoice.notes}
          </div>
        </div>
      )}

      {/* Custom Footer Text (Terms, Bank Details, etc.) */}
      {invoice.footer_text && (
        <div className="invoice-footer-text-box" style={{
          marginBottom: '30px',
          padding: '20px',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          borderLeft: '4px solid #667eea'
        }}>
          <div style={{
            fontSize: '12px',
            color: '#666',
            whiteSpace: 'pre-wrap',
            lineHeight: '1.6'
          }}>
            {invoice.footer_text}
          </div>
        </div>
      )}

      {/* Footer Contact */}
      <div style={{
        textAlign: 'center',
        paddingTop: '30px',
        borderTop: '1px solid #e0e0e0'
      }}>
        <div style={{
          fontSize: '11px',
          color: '#999',
          letterSpacing: '0.5px'
        }}>
          {studioConfig.studioName.toUpperCase()}
        </div>
        <div style={{
          fontSize: '11px',
          color: '#999',
          marginTop: '8px'
        }}>
          {studioConfig.phone}
        </div>
        <div style={{
          fontSize: '11px',
          color: '#667eea',
          marginTop: '4px'
        }}>
          {studioConfig.email.toUpperCase()}
        </div>
        <div style={{
          fontSize: '10px',
          color: '#999',
          marginTop: '8px'
        }}>
          {studioConfig.address}
        </div>
      </div>

      {/* Paid Stamp - only show if paid */}
      {invoice.status === 'paid' && (
        <div className="invoice-paid-stamp" style={{
          position: 'absolute',
          top: '300px',
          right: '100px',
          transform: 'rotate(-25deg)',
          border: '4px solid #27ae60',
          color: '#27ae60',
          fontSize: '48px',
          fontWeight: 'bold',
          padding: '15px 30px',
          borderRadius: '8px',
          opacity: 0.3,
          letterSpacing: '3px'
        }}>
          {tx('paidInFull')}
        </div>
      )}
    </div>
    </>
  );
};

export default InvoiceTemplate;
