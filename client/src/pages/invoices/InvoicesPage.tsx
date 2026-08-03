import React, { useEffect, useState } from 'react';
import { Plus, Download, Send, Eye, Edit, Trash2, MessageCircle, Link, Share, Phone, ExternalLink, Printer } from 'lucide-react';
import { listInvoices, createInvoice, updateInvoiceStatus, deleteInvoice } from '../../api/invoices';
import InvoiceTemplate from '../../components/invoice/InvoiceTemplate';
import PriceListModal from '../../components/invoice/PriceListModal';
import { SITE } from '../../config/site';

// CACHE BUST v3 - FORCE REBUILD - 20251210-1628
const INVOICE_VIEWER_VERSION = 'v3.0.0-20251210-1628';

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
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled' | 'awaiting_payment';
  due_date: string;
  payment_terms: string;
  notes?: string;
  pdf_url?: string;
  created_at: string;
  client?: {
    name: string;
    email: string;
    address1?: string;
    city?: string;
    country?: string;
  };
  items?: Array<{
    description: string;
    quantity: number;
    unit_price: number;
    tax_rate: number;
    line_total: number;
  }>;
}

// FORCE REBUILD v4 - Critical timestamp to force Vite rebuild
const INVOICES_PAGE_BUILD = 'v4-REBUILD-20251210-1835';
console.log('🔥🔥🔥 INVOICES PAGE MODULE LOADED:', INVOICES_PAGE_BUILD);

export default function InvoicesPage() {
  // IMMEDIATE LOG ON EVERY RENDER
  console.log('🔥 InvoicesPage RENDER - BUILD:', INVOICES_PAGE_BUILD, new Date().toISOString());
  
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPriceListModal, setShowPriceListModal] = useState(false);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [showSMSModal, setShowSMSModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [whatsAppPhone, setWhatsAppPhone] = useState('');
  const [smsPhone, setSmsPhone] = useState('');
  const [emailAddress, setEmailAddress] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'preview'>('list');

  // Debug: Component mount
  useEffect(() => {
    console.log('📦 InvoicesPage component mounted/updated');
    console.log('📦 handlePreviewInvoice function exists:', typeof handlePreviewInvoice);
  }, []);

  // New invoice form state
  const [newInvoice, setNewInvoice] = useState({
    client_id: '',
    client_name: '',
    client_email: '',
    client_address: '',
    client_city: '',
    client_country: '',
    due_date: '',
    payment_terms: '30 days',
    currency: 'EUR',
    notes: '',
    discount_amount: 0,
    items: [] as Array<{
      description: string;
      quantity: number;
      unit_price: number;
      tax_rate: number;
    }>
  });

  useEffect(() => {
    fetchInvoices();
    fetchClients();
  }, []);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const data = await listInvoices();
      setInvoices(data ?? []);
    } catch (err: any) {
      setError(err.message ?? 'Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const response = await fetch('/api/crm/clients', {
        credentials: 'include'
      });
      if (!response.ok) {
        console.error('Failed to fetch clients:', response.status, response.statusText);
        return;
      }
      const data = await response.json();
      // Server returns clients array directly, not wrapped in an object
      setClients(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load clients:', err);
    }
  };

  const handleCreateInvoice = async () => {
    try {
      // Validate required fields
      if (!newInvoice.client_id) {
        setError('Please select a client');
        return;
      }
      
      if (!newInvoice.due_date) {
        setError('Please set a due date');
        return;
      }
      
      if (newInvoice.items.length === 0) {
        setError('Please add at least one invoice item');
        return;
      }
      
      // Calculate total
      const subtotal = newInvoice.items.reduce((sum, item) => 
        sum + (item.quantity * item.unit_price), 0
      );
      const taxTotal = newInvoice.items.reduce((sum, item) => 
        sum + (item.quantity * item.unit_price * (item.tax_rate || 0) / 100), 0
      );
      const total = subtotal + taxTotal - (newInvoice.discount_amount || 0);

      const invoiceData = {
        clientId: newInvoice.client_id,
        issueDate: new Date().toISOString().split('T')[0],
        dueDate: newInvoice.due_date,
        paymentTerms: newInvoice.payment_terms,
        currency: newInvoice.currency,
        notes: newInvoice.notes,
        discountAmount: newInvoice.discount_amount || 0,
        subtotal: subtotal,
        taxAmount: taxTotal,
        total: total,
        status: 'DRAFT',
        items: newInvoice.items.map((item, index) => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unit_price,
          taxRate: item.tax_rate || 0,
          sortOrder: index
        }))
      };

      console.log('Creating invoice with data:', invoiceData);
      const payload = {
        client_id: invoiceData.clientId,
        issue_date: invoiceData.issueDate,
        due_date: invoiceData.dueDate,
        payment_terms: invoiceData.paymentTerms,
        currency: invoiceData.currency,
        notes: invoiceData.notes,
        discount_amount: invoiceData.discountAmount,
        subtotal: invoiceData.subtotal,
        tax_amount: invoiceData.taxAmount,
        total: invoiceData.total,
        status: invoiceData.status,
        items: invoiceData.items.map(it => ({
          description: it.description,
          quantity: it.quantity,
          unit_price: it.unitPrice,
          tax_rate: it.taxRate,
        })),
      } as any;
      const createdInvoice = await createInvoice(payload);
      console.log('Invoice created successfully:', createdInvoice);
      
      setShowCreateModal(false);
      fetchInvoices();
      
      // Show success message with options
      const shouldSendEmail = window.confirm(
        `Invoice ${createdInvoice.invoiceNumber || createdInvoice.id} created successfully!\n\nWould you like to send it via email to the client now?`
      );
      
      if (shouldSendEmail) {
        try {
          const response = await fetch(`/api/crm/invoices/${createdInvoice.id}/email`, {
            method: 'POST',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              subject: `Rechnung ${createdInvoice.invoiceNumber || createdInvoice.id} - ${SITE.name}`,
              message: 'Anbei senden wir Ihnen Ihre Rechnung zu. Bei Fragen stehen wir Ihnen gerne zur Verfügung.',
              includeAttachment: true
            })
          });
          
          const result = await response.json();
          if (result.success || response.ok) {
            alert('Invoice created and email sent successfully!');
          } else {
            alert('Invoice created, but email sending failed. You can send it manually from the invoice list.');
          }
        } catch (emailError) {
          console.error('Email sending error:', emailError);
          alert('Invoice created, but email sending failed. You can send it manually from the invoice list.');
        }
      }
      
      // Reset form
      setNewInvoice({
        client_id: '',
        client_name: '',
        client_email: '',
        client_address: '',
        client_city: '',
        client_country: '',
        due_date: '',
        payment_terms: '30 days',
        currency: 'EUR',
        notes: '',
        discount_amount: 0,
        items: []
      });
    } catch (err: any) {
      console.error('Invoice creation error:', err);
      setError(err.message || 'Failed to create invoice');
    }
  };

  const handleStatusUpdate = async (invoiceId: string, status: string) => {
    try {
      await updateInvoiceStatus(invoiceId, status);
      fetchInvoices();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteInvoice = async (invoiceId: string) => {
    if (window.confirm('Are you sure you want to delete this invoice?')) {
      try {
        await deleteInvoice(invoiceId);
        fetchInvoices();
      } catch (err: any) {
        setError(err.message);
      }
    }
  };

  // NEW FUNCTION - Complete rewrite to force rebuild
  const openInvoicePreview = async (invoice: Invoice) => {
    console.log('🎯 NEW openInvoicePreview CALLED! v4', invoice);
    alert(`Opening invoice: ${invoice.invoice_number} for ${invoice.client_name}`);
    
    try {
      // Fetch full invoice details including items
      // Use session-based auth (cookies) - no Bearer token needed
      console.log('🚀 Starting fetch...');
      const response = await fetch(`/api/crm/invoices/${invoice.id}`, {
        credentials: 'include'
      });
      console.log('🚀 Fetch completed. Status:', response.status, response.ok);
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Invoice fetch failed:', response.status, errorText);
        throw new Error(`Failed to load invoice details: ${response.status}`);
      }
      const fullInvoice = await response.json();
      
      // FORCE ALERT TO CONFIRM NEW CODE IS LOADED - v3
      alert(`✅ INVOICE VIEWER ${INVOICE_VIEWER_VERSION} LOADED!\n\nClient: ${fullInvoice.client?.firstName} ${fullInvoice.client?.lastName}\nTotal: €${fullInvoice.total}`);
      
      // Debug: Log the raw invoice data (CACHE BUST v3)
      console.log(`🔍 [${INVOICE_VIEWER_VERSION}] RAW INVOICE DATA FROM SERVER:`, fullInvoice);
      console.log('🔍 CLIENT DATA:', fullInvoice.client);
      console.log('🔍 ITEMS DATA:', fullInvoice.items);
      
      // Helper: Parse decimal strings from database
      const parseDecimal = (value: any): number => {
        if (!value) return 0;
        const parsed = typeof value === 'string' ? parseFloat(value) : Number(value);
        return isNaN(parsed) ? 0 : parsed;
      };
      
      // Helper: Format database date to ISO string
      const formatDbDate = (dateStr: any): string => {
        if (!dateStr) return new Date().toISOString();
        try {
          const date = new Date(dateStr);
          return isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
        } catch {
          return new Date().toISOString();
        }
      };
      
      // Extract client data
      const clientFirstName = fullInvoice.client?.firstName || fullInvoice.client?.first_name || '';
      const clientLastName = fullInvoice.client?.lastName || fullInvoice.client?.last_name || '';
      const clientFullName = `${clientFirstName} ${clientLastName}`.trim() || 'Unknown Client';
      const clientEmail = fullInvoice.client?.email || '';
      const clientAddress = fullInvoice.client?.address || '';
      const clientCity = fullInvoice.client?.city || '';
      const clientCountry = fullInvoice.client?.country || '';
      const clientPhone = fullInvoice.client?.phone || '';
      const clientVatNumber = fullInvoice.client?.vatNumber || fullInvoice.client?.vat_number || '';
      const fullClientAddress = `${clientAddress}${clientCity ? ', ' + clientCity : ''}${clientCountry ? ', ' + clientCountry : ''}`.trim();
      
      // Map the data to match what InvoiceTemplate expects
      const mappedInvoice = {
        id: fullInvoice.id,
        invoice_number: fullInvoice.invoiceNumber || 'N/A',
        client_id: fullInvoice.clientId,
        client_name: clientFullName,
        client_email: clientEmail,
        client_address: fullClientAddress,
        due_date: formatDbDate(fullInvoice.dueDate),
        created_at: formatDbDate(fullInvoice.issueDate), // Use issueDate for invoice date!
        currency: fullInvoice.currency || 'EUR',
        payment_terms: fullInvoice.paymentTerms || 'Net 30',
        notes: fullInvoice.notes || '',
        status: fullInvoice.status || 'draft',
        subtotal_amount: parseDecimal(fullInvoice.subtotal),
        tax_amount: parseDecimal(fullInvoice.taxAmount),
        discount_amount: parseDecimal(fullInvoice.discountAmount),
        total_amount: parseDecimal(fullInvoice.total),
        amount: parseDecimal(fullInvoice.total),
        // Nested client object for alternate template format
        client: {
          name: clientFullName,
          email: clientEmail,
          address1: clientAddress,
          city: clientCity,
          country: clientCountry,
          phone: clientPhone,
          vatNumber: clientVatNumber
        },
        items: (fullInvoice.items || []).map((item: any) => {
          const quantity = parseDecimal(item.quantity);
          const unitPrice = parseDecimal(item.unitPrice);
          const taxRate = parseDecimal(item.taxRate);
          const lineTotal = quantity * unitPrice; // Calculate line total
          
          return {
            description: item.description || 'No description',
            quantity: quantity,
            unit_price: unitPrice,
            tax_rate: taxRate,
            line_total: lineTotal
          };
        })
      };
      
      console.log('✅ MAPPED INVOICE FOR TEMPLATE:', mappedInvoice);
      console.warn('✅ CLIENT NAME:', mappedInvoice.client_name, 'TOTAL:', mappedInvoice.total_amount);
      
      console.log('🚀 Setting selectedInvoice and viewMode...');
      setSelectedInvoice(mappedInvoice as any);
      setViewMode('preview');
      console.log('🚀 State set successfully!');
    } catch (error) {
      console.error('❌ ERROR in handlePreviewInvoice:', error);
      console.error('❌ Error details:', error instanceof Error ? error.message : String(error));
      alert('Failed to load invoice preview. Please try again.');
    }
  };

  const handleAddItemFromPriceList = (item: any) => {
    const newItem = {
      description: item.name,
      quantity: 1,
      unit_price: item.price,
      tax_rate: item.taxRate || 0
    };
    
    setNewInvoice(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));
  };

  const handleSendWhatsApp = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setShowWhatsAppModal(true);
    
    // Pre-populate phone number if available from client data
    const selectedClient = clients.find(c => c.id === invoice.client_id);
    if (selectedClient?.phone) {
      setWhatsAppPhone(selectedClient.phone);
    } else {
      setWhatsAppPhone('');
    }
  };

  const handleConfirmWhatsAppSend = async () => {
    if (!selectedInvoice || !whatsAppPhone.trim()) {
      alert('Please enter a valid phone number');
      return;
    }

    try {
      const response = await fetch('/api/invoices/share-whatsapp', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          invoice_id: selectedInvoice.id,
          phone_number: whatsAppPhone.replace(/[^\d+]/g, '') // Keep only digits and +
        }),
      });

      const result = await response.json();
      
      if (result.success && result.whatsapp_url) {
        // Open WhatsApp with the prepared message
        window.open(result.whatsapp_url, '_blank');
        
        alert('WhatsApp message opened successfully! Please send the message from WhatsApp.');
        
        // Update invoice status to 'sent' if it was draft
        if (selectedInvoice.status === 'draft') {
          await handleStatusUpdate(selectedInvoice.id, 'sent');
        }
        
        setShowWhatsAppModal(false);
        setWhatsAppPhone('');
        setSelectedInvoice(null);
        
        // Refresh invoices to show updated status
        fetchInvoices();
      } else {
        alert('Failed to create WhatsApp message: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('WhatsApp send error:', error);
      alert('Failed to send WhatsApp message. Please try again.');
    }
  };

  // SMS Handler
  const handleSendSMS = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setShowSMSModal(true);
    
    // Pre-populate phone number if available from client data
    const selectedClient = clients.find(c => c.id === invoice.client_id);
    if (selectedClient?.phone) {
      setSmsPhone(selectedClient.phone);
    } else {
      setSmsPhone('');
    }
  };

  const handleConfirmSMSSend = async () => {
    if (!selectedInvoice || !smsPhone.trim()) {
      alert('Please enter a valid phone number');
      return;
    }

    try {
      const response = await fetch(`/api/crm/invoices/${selectedInvoice.id}/sms`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          phoneNumber: smsPhone.replace(/[^\d+]/g, '') // Clean phone number
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        alert('SMS sent successfully!');
        
        // Update invoice status to 'sent' if it was draft
        if (selectedInvoice.status === 'draft') {
          await handleStatusUpdate(selectedInvoice.id, 'sent');
        }
        
        setShowSMSModal(false);
        setSmsPhone('');
        setSelectedInvoice(null);
        
        // Refresh invoices to show updated status
        fetchInvoices();
      } else {
        alert('Failed to send SMS: ' + result.error);
      }
    } catch (error) {
      console.error('SMS send error:', error);
      alert('Failed to send SMS message');
    }
  };

  // Email Handler
  const handleSendEmail = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setShowEmailModal(true);
    
    // Pre-populate email address if available from client data
    const selectedClient = clients.find(c => c.id === invoice.client_id);
    if (selectedClient?.email) {
      setEmailAddress(selectedClient.email);
    } else if (invoice.client?.email) {
      setEmailAddress(invoice.client.email);
    } else {
      setEmailAddress('');
    }
  };

  const handleConfirmEmailSend = async () => {
    if (!selectedInvoice || !emailAddress.trim()) {
      alert('Please enter a valid email address');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailAddress)) {
      alert('Please enter a valid email address');
      return;
    }

    try {
      const response = await fetch(`/api/crm/invoices/${selectedInvoice.id}/email`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          subject: `Rechnung ${selectedInvoice.invoice_number} - ${SITE.name}`,
          message: 'Anbei senden wir Ihnen Ihre Rechnung zu. Bei Fragen stehen wir Ihnen gerne zur Verfügung.',
          includeAttachment: true
        }),
      });

      const result = await response.json();
      
      if (result.success || response.ok) {
        alert('Email sent successfully!');
        
        // Update invoice status to 'sent' if it was draft
        if (selectedInvoice.status === 'draft') {
          await handleStatusUpdate(selectedInvoice.id, 'sent');
        }
        
        setShowEmailModal(false);
        setEmailAddress('');
        setSelectedInvoice(null);
        
        // Refresh invoices to show updated status
        fetchInvoices();
      } else {
        alert('Failed to send email: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Email send error:', error);
      alert('Failed to send email message');
    }
  };

  // PDF Download Function
  const downloadInvoicePDF = async (invoiceId: string, invoiceNumber: string) => {
    try {
      const response = await fetch(`/api/crm/invoices/${invoiceId}/pdf`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': 'application/pdf'
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('PDF download error:', errorText);
        throw new Error(`PDF generation failed: ${response.status}`);
      }
      
      const blob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `Rechnung-${invoiceNumber || invoiceId}.pdf`;
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      alert('PDF downloaded successfully!');
    } catch (error) {
      console.error('PDF download error:', error);
      alert('PDF download failed. Please try again.');
    }
  };

  // Copy Invoice Link to Clipboard Function
  const copyInvoiceLinkToClipboard = async (invoiceId: string) => {
    const baseUrl = window.location.origin;
    const shareableLink = `${baseUrl}/invoice/${invoiceId}`;
    
    try {
      await navigator.clipboard.writeText(shareableLink);
      alert('Invoice link copied to clipboard!');
    } catch (error) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = shareableLink;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert('Invoice link copied to clipboard!');
    }
  };

  // Open Public Invoice Link in New Tab
  const openPublicInvoiceLink = (invoiceId: string) => {
    const baseUrl = window.location.origin;
    const shareableLink = `${baseUrl}/invoice/${invoiceId}`;
    window.open(shareableLink, '_blank');
  };

  // Share Invoice via WhatsApp Function
  const shareInvoiceViaWhatsApp = (invoiceId: string, invoiceNumber: string) => {
    const baseUrl = window.location.origin;
    const shareableLink = `${baseUrl}/invoice/${invoiceId}`;
    const message = encodeURIComponent(
      `Hi! Here's your invoice #${invoiceNumber}: ${shareableLink}`
    );
    
    // Open WhatsApp with pre-filled message
    const whatsappUrl = `https://wa.me/?text=${message}`;
    window.open(whatsappUrl, '_blank');
  };

  const calculateInvoiceTotals = () => {
    const subtotal = newInvoice.items.reduce((sum, item) => 
      sum + (item.quantity * item.unit_price), 0
    );
    const discountAmount = (subtotal * (newInvoice.discount_amount || 0)) / 100;
    const afterDiscount = subtotal - discountAmount;
    const taxAmount = afterDiscount * 0.19; // 19% VAT
    const total = afterDiscount + taxAmount;

    return {
      subtotal,
      discountAmount,
      taxAmount,
      total
    };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'text-green-600 bg-green-100';
      case 'sent': return 'text-blue-600 bg-blue-100';
      case 'overdue': return 'text-red-600 bg-red-100';
      case 'cancelled': return 'text-gray-600 bg-gray-100';
      case 'awaiting_payment': return 'text-orange-600 bg-orange-100';
      default: return 'text-yellow-600 bg-yellow-100';
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-lg">Loading invoices...</div>
    </div>
  );

  if (error) return (
    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
      {error}
    </div>
  );

  if (viewMode === 'preview' && selectedInvoice) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setViewMode('list')}
            className="text-gray-600 hover:text-gray-800"
          >
            ← Back to Invoices
          </button>
          <div className="flex space-x-2">
            <button
              onClick={() => handleSendEmail(selectedInvoice)}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              <Send className="w-4 h-4" />
              <span>Send Email</span>
            </button>
            <button
              onClick={() => handleSendWhatsApp(selectedInvoice)}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              <MessageCircle className="w-4 h-4" />
              <span>WhatsApp</span>
            </button>
            <button
              onClick={() => handleSendSMS(selectedInvoice)}
              className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
            >
              <Phone className="w-4 h-4" />
              <span>SMS</span>
            </button>
            <button 
              onClick={() => downloadInvoicePDF(selectedInvoice.id, selectedInvoice.invoice_number)}
              className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
            >
              <Download className="w-4 h-4" />
              <span>Download PDF</span>
            </button>
            <button 
              onClick={() => window.print()}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              <Printer className="w-4 h-4" />
              <span>Print</span>
            </button>
          </div>
        </div>
        <InvoiceTemplate invoice={selectedInvoice} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Invoices</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          <span>Create Invoice</span>
        </button>
      </div>

      {/* Invoices Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Invoice
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Client
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Amount
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Due Date
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {invoices.map((invoice) => (
              <tr key={invoice.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    #{invoice.invoice_number}
                  </div>
                  <div className="text-sm text-gray-500">
                    {new Date(invoice.created_at).toLocaleDateString()}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {invoice.client?.name || invoice.client_id}
                  </div>
                  <div className="text-sm text-gray-500">
                    {invoice.client?.email}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  €{invoice.total_amount.toFixed(2)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(invoice.status)}`}>
                    {invoice.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {new Date(invoice.due_date).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end space-x-2">
                    <button
                      onClick={() => {
                        console.log('👁️👁️👁️ EYE ICON CLICKED v4!', invoice);
                        openInvoicePreview(invoice);
                      }}
                      className="text-blue-600 hover:text-blue-900"
                      title="Preview Invoice"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => openPublicInvoiceLink(invoice.id)}
                      className="text-indigo-600 hover:text-indigo-900"
                      title="Open Public Link"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => downloadInvoicePDF(invoice.id, invoice.invoice_number)}
                      className="text-green-600 hover:text-green-900"
                      title="Download PDF"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => copyInvoiceLinkToClipboard(invoice.id)}
                      className="text-purple-600 hover:text-purple-900"
                      title="Copy Link"
                    >
                      <Link className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => shareInvoiceViaWhatsApp(invoice.id, invoice.invoice_number)}
                      className="text-green-500 hover:text-green-700"
                      title="Share via WhatsApp"
                    >
                      <Share className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleSendWhatsApp(invoice)}
                      className="text-green-600 hover:text-green-900"
                      title="Send via WhatsApp"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleSendSMS(invoice)}
                      className="text-purple-600 hover:text-purple-900"
                      title="Send via SMS"
                    >
                      <Phone className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleSendEmail(invoice)}
                      className="text-blue-600 hover:text-blue-900"
                      title="Send via Email"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteInvoice(invoice.id)}
                      className="text-red-600 hover:text-red-900"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create Invoice Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Invoice</h3>
              
              {/* Client Information */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Client *
                  </label>
                  <select
                    value={newInvoice.client_id}
                    onChange={(e) => {
                      const selectedClient = clients.find(c => c.id === e.target.value);
                      setNewInvoice(prev => ({ 
                        ...prev, 
                        client_id: e.target.value,
                        client_name: selectedClient ? `${selectedClient.firstName} ${selectedClient.lastName}` : '',
                        client_email: selectedClient?.email || ''
                      }));
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select a client...</option>
                    {clients.map(client => (
                      <option key={client.id} value={client.id}>
                        {client.firstName} {client.lastName} ({client.email})
                      </option>
                    ))}
                  </select>
                  {newInvoice.client_id && (
                    <div className="mt-2 text-sm text-gray-600">
                      <p><strong>Email:</strong> {newInvoice.client_email}</p>
                      <p><strong>Phone:</strong> {clients.find(c => c.id === newInvoice.client_id)?.phone || 'N/A'}</p>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={newInvoice.due_date}
                    onChange={(e) => setNewInvoice(prev => ({ ...prev, due_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Items Section */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-md font-medium text-gray-900">Invoice Items</h4>
                  <div className="space-x-2">
                    <button
                      onClick={() => {
                        setNewInvoice(prev => ({
                          ...prev,
                          items: [...prev.items, {
                            description: '',
                            quantity: 1,
                            unit_price: 0,
                            tax_rate: 0,
                            line_total: 0
                          }]
                        }));
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      + Add Item
                    </button>
                    <button
                      onClick={() => setShowPriceListModal(true)}
                      className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                    >
                      Add from Price Guide
                    </button>
                  </div>
                </div>
                
                {newInvoice.items.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 rounded-lg">
                    <p className="text-gray-500 mb-4">No items added yet</p>
                    <button
                      onClick={() => {
                        setNewInvoice(prev => ({
                          ...prev,
                          items: [{
                            description: '',
                            quantity: 1,
                            unit_price: 0,
                            tax_rate: 0,
                            line_total: 0
                          }]
                        }));
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Add Your First Item
                    </button>
                  </div>
                ) : (
                  newInvoice.items.map((item, index) => (
                  <div key={index} className="grid grid-cols-5 gap-2 mb-2 p-3 bg-gray-50 rounded">
                    <input
                      type="text"
                      placeholder="Description"
                      value={item.description}
                      onChange={(e) => {
                        const newItems = [...newInvoice.items];
                        newItems[index].description = e.target.value;
                        setNewInvoice(prev => ({ ...prev, items: newItems }));
                      }}
                      className="px-2 py-1 border rounded"
                    />
                    <input
                      type="number"
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={(e) => {
                        const newItems = [...newInvoice.items];
                        newItems[index].quantity = parseInt(e.target.value) || 0;
                        setNewInvoice(prev => ({ ...prev, items: newItems }));
                      }}
                      className="px-2 py-1 border rounded"
                    />
                    <input
                      type="number"
                      placeholder="Price"
                      value={item.unit_price}
                      onChange={(e) => {
                        const newItems = [...newInvoice.items];
                        newItems[index].unit_price = parseFloat(e.target.value) || 0;
                        setNewInvoice(prev => ({ ...prev, items: newItems }));
                      }}
                      className="px-2 py-1 border rounded"
                    />
                    <input
                      type="number"
                      placeholder="Tax %"
                      value={item.tax_rate}
                      onChange={(e) => {
                        const newItems = [...newInvoice.items];
                        newItems[index].tax_rate = parseFloat(e.target.value) || 0;
                        setNewInvoice(prev => ({ ...prev, items: newItems }));
                      }}
                      className="px-2 py-1 border rounded"
                    />
                    <button
                      onClick={() => {
                        const newItems = newInvoice.items.filter((_, i) => i !== index);
                        setNewInvoice(prev => ({ ...prev, items: newItems }));
                      }}
                      className="px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                    >
                      Remove
                    </button>
                  </div>
                )))}
                
              </div>

              {/* Totals Preview */}
              {newInvoice.items.length > 0 && (
                <div className="mb-6 p-4 bg-gray-50 rounded">
                  <h4 className="font-medium mb-2">Invoice Totals</h4>
                  {(() => {
                    const totals = calculateInvoiceTotals();
                    return (
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span>Subtotal:</span>
                          <span>€{totals.subtotal.toFixed(2)}</span>
                        </div>
                        {totals.discountAmount > 0 && (
                          <div className="flex justify-between">
                            <span>Discount:</span>
                            <span>-€{totals.discountAmount.toFixed(2)}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span>Tax (19%):</span>
                          <span>€{totals.taxAmount.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between font-bold">
                          <span>Total:</span>
                          <span>€{totals.total.toFixed(2)}</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end space-x-4">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateInvoice}
                  className={`px-6 py-2 rounded font-medium ${
                    !newInvoice.client_id || !newInvoice.due_date || newInvoice.items.length === 0
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                  disabled={!newInvoice.client_id || !newInvoice.due_date || newInvoice.items.length === 0}
                  title={
                    !newInvoice.client_id ? 'Please select a client'
                    : !newInvoice.due_date ? 'Please set a due date'
                    : newInvoice.items.length === 0 ? 'Please add at least one item'
                    : 'Create invoice and optionally send via email'
                  }
                >
                  Create Invoice & Send
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Price List Modal */}
      {showPriceListModal && (
        <PriceListModal
          onClose={() => setShowPriceListModal(false)}
          onSelectItem={handleAddItemFromPriceList}
        />
      )}

      {/* WhatsApp Share Modal */}
      {showWhatsAppModal && selectedInvoice && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-6 border w-[500px] shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  📱 Send Invoice via WhatsApp
                </h3>
                <button
                  onClick={() => {
                    setShowWhatsAppModal(false);
                    setWhatsAppPhone('');
                    setSelectedInvoice(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              
              <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="font-medium text-blue-900 mb-2">Invoice Details</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <p className="text-blue-700">
                    <span className="font-medium">Invoice:</span> #{selectedInvoice.invoice_number || selectedInvoice.id}
                  </p>
                  <p className="text-blue-700">
                    <span className="font-medium">Amount:</span> €{selectedInvoice.total_amount?.toFixed(2) || '0.00'}
                  </p>
                  <p className="text-blue-700">
                    <span className="font-medium">Client:</span> {selectedInvoice.client?.name || clients.find(c => c.id === selectedInvoice.client_id)?.firstName + ' ' + clients.find(c => c.id === selectedInvoice.client_id)?.lastName || 'Unknown'}
                  </p>
                  <p className="text-blue-700">
                    <span className="font-medium">Due:</span> {new Date(selectedInvoice.due_date).toLocaleDateString('de-DE')}
                  </p>
                </div>
              </div>

              <div className="mb-4">
                <label htmlFor="whatsapp-phone" className="block text-sm font-medium text-gray-700 mb-2">
                  WhatsApp Phone Number *
                </label>
                <input
                  type="tel"
                  id="whatsapp-phone"
                  value={whatsAppPhone}
                  onChange={(e) => setWhatsAppPhone(e.target.value)}
                  placeholder="+43 677 123 4567"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Include country code (e.g., +43 for Austria, +49 for Germany)
                </p>
              </div>

              <div className="mb-6 p-4 bg-green-50 rounded-lg border border-green-200">
                <h4 className="font-medium text-green-900 mb-2">📱 WhatsApp Message Preview</h4>
                <div className="text-sm text-green-800 bg-white p-3 rounded border italic">
                  "Hallo! 👋 Hier ist Ihre Rechnung #{selectedInvoice.invoice_number || selectedInvoice.id} von {SITE.name} über €{selectedInvoice.total_amount?.toFixed(2) || '0.00'}.

                  Sie können die Rechnung hier einsehen: [Invoice Link]

                  Bei Fragen stehen wir Ihnen gerne zur Verfügung! 📸

                  Vielen Dank für Ihr Vertrauen!
                  {SITE.name} Team"
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowWhatsAppModal(false);
                    setWhatsAppPhone('');
                    setSelectedInvoice(null);
                  }}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmWhatsAppSend}
                  disabled={!whatsAppPhone.trim()}
                  className={`px-6 py-2 rounded font-medium flex items-center space-x-2 ${
                    whatsAppPhone.trim() 
                      ? 'bg-green-600 text-white hover:bg-green-700' 
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Send via WhatsApp</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SMS Share Modal */}
      {showSMSModal && selectedInvoice && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-6 border w-[500px] shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  📱 Send Invoice via SMS
                </h3>
                <button
                  onClick={() => {
                    setShowSMSModal(false);
                    setSmsPhone('');
                    setSelectedInvoice(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              
              <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="font-medium text-blue-900 mb-2">Invoice Details</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <p className="text-blue-700">
                    <span className="font-medium">Invoice:</span> #{selectedInvoice.invoice_number || selectedInvoice.id}
                  </p>
                  <p className="text-blue-700">
                    <span className="font-medium">Amount:</span> €{selectedInvoice.total_amount?.toFixed(2) || '0.00'}
                  </p>
                  <p className="text-blue-700">
                    <span className="font-medium">Client:</span> {selectedInvoice.client?.name || clients.find(c => c.id === selectedInvoice.client_id)?.firstName + ' ' + clients.find(c => c.id === selectedInvoice.client_id)?.lastName || 'Unknown'}
                  </p>
                  <p className="text-blue-700">
                    <span className="font-medium">Due:</span> {new Date(selectedInvoice.due_date).toLocaleDateString('de-DE')}
                  </p>
                </div>
              </div>

              <div className="mb-4">
                <label htmlFor="sms-phone" className="block text-sm font-medium text-gray-700 mb-2">
                  SMS Phone Number *
                </label>
                <input
                  type="tel"
                  id="sms-phone"
                  value={smsPhone}
                  onChange={(e) => setSmsPhone(e.target.value)}
                  placeholder="+43 677 123 4567"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Include country code (e.g., +43 for Austria, +49 for Germany)
                </p>
              </div>

              <div className="mb-6 p-4 bg-purple-50 rounded-lg border border-purple-200">
                <h4 className="font-medium text-purple-900 mb-2">📱 SMS Message Preview</h4>
                <div className="text-sm text-purple-800 bg-white p-3 rounded border italic">
                  "Hallo! Hier ist Ihre Rechnung #{selectedInvoice.invoice_number || selectedInvoice.id} von {SITE.name} über €{selectedInvoice.total_amount?.toFixed(2) || '0.00'}.

                  Rechnung ansehen: [Invoice Link]

                  Bei Fragen: +43 677 633 99210

                  {SITE.name} Team"
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowSMSModal(false);
                    setSmsPhone('');
                    setSelectedInvoice(null);
                  }}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmSMSSend}
                  disabled={!smsPhone.trim()}
                  className={`px-6 py-2 rounded font-medium flex items-center space-x-2 ${
                    smsPhone.trim() 
                      ? 'bg-purple-600 text-white hover:bg-purple-700' 
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  <Phone className="w-4 h-4" />
                  <span>Send via SMS</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Email Share Modal */}
      {showEmailModal && selectedInvoice && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-6 border w-[500px] shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  📧 Send Invoice via Email
                </h3>
                <button
                  onClick={() => {
                    setShowEmailModal(false);
                    setEmailAddress('');
                    setSelectedInvoice(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              
              <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="font-medium text-blue-900 mb-2">Invoice Details</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <p className="text-blue-700">
                    <span className="font-medium">Invoice:</span> #{selectedInvoice.invoice_number || selectedInvoice.id}
                  </p>
                  <p className="text-blue-700">
                    <span className="font-medium">Amount:</span> €{selectedInvoice.total_amount?.toFixed(2) || '0.00'}
                  </p>
                  <p className="text-blue-700">
                    <span className="font-medium">Client:</span> {selectedInvoice.client?.name || clients.find(c => c.id === selectedInvoice.client_id)?.firstName + ' ' + clients.find(c => c.id === selectedInvoice.client_id)?.lastName || 'Unknown'}
                  </p>
                  <p className="text-blue-700">
                    <span className="font-medium">Due:</span> {new Date(selectedInvoice.due_date).toLocaleDateString('de-DE')}
                  </p>
                </div>
              </div>

              <div className="mb-4">
                <label htmlFor="email-address" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  id="email-address"
                  value={emailAddress}
                  onChange={(e) => setEmailAddress(e.target.value)}
                  placeholder="client@example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  The invoice PDF will be sent as an email attachment
                </p>
              </div>

              <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="font-medium text-blue-900 mb-2">📧 Email Preview</h4>
                <div className="text-sm text-blue-800 bg-white p-3 rounded border">
                  <p className="font-medium mb-2">Subject: Rechnung {selectedInvoice.invoice_number || selectedInvoice.id} - {SITE.name}</p>
                  <p className="italic">
                    "Liebe/r Kunde,
                    <br /><br />
                    anbei senden wir Ihnen Ihre Rechnung zu. Bei Fragen stehen wir Ihnen gerne zur Verfügung.
                    <br /><br />
                    Rechnungsnummer: {selectedInvoice.invoice_number || selectedInvoice.id}<br />
                    Betrag: €{selectedInvoice.total_amount?.toFixed(2) || '0.00'}<br />
                    Fälligkeitsdatum: {new Date(selectedInvoice.due_date).toLocaleDateString('de-DE')}
                    <br /><br />
                    Mit freundlichen Grüßen,<br />
                    {SITE.name} Team"
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowEmailModal(false);
                    setEmailAddress('');
                    setSelectedInvoice(null);
                  }}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmEmailSend}
                  disabled={!emailAddress.trim()}
                  className={`px-6 py-2 rounded font-medium flex items-center space-x-2 ${
                    emailAddress.trim() 
                      ? 'bg-blue-600 text-white hover:bg-blue-700' 
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  <Send className="w-4 h-4" />
                  <span>Send via Email</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
