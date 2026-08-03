import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import AdminLayout from '../../components/admin/AdminLayout';
import AdvancedInvoiceForm from '../../components/admin/AdvancedInvoiceForm';
import PaymentTracker from '../../components/admin/PaymentTracker';
import { useLanguage } from '../../context/LanguageContext';
import { 
  Plus, 
  Search, 
  Filter, 
  Eye, 
  EyeOff,
  Edit, 
  Trash2, 
  Download, 
  Send, 
  DollarSign, 
  Calendar, 
  FileText,
  Loader2,
  AlertCircle,
  ArrowRightCircle,
  Clock
} from 'lucide-react';

interface Invoice {
  id: string;
  public_id?: string;
  invoice_number: string;
  client_id: string;
  client_name: string;
  amount: number;
  tax_amount: number;
  total_amount: number;
  status: 'draft' | 'sent' | 'paid' | 'partially_paid' | 'overdue' | 'cancelled' | 'awaiting_payment';
  due_date: string;
  paid_date?: string;
  notes?: string;
  created_at: string;
  document_type?: string;
}

const InvoicesPage: React.FC = () => {
  const location = useLocation();
  const { t } = useLanguage();
  const searchParams = new URLSearchParams(location.search);
  const prefillClientId = searchParams.get('client_id') || searchParams.get('client') || undefined;
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [filteredInvoices, setFilteredInvoices] = useState<Invoice[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);  const [showCreateModal, setShowCreateModal] = useState(Boolean(prefillClientId));
  const [paymentTrackingInvoice, setPaymentTrackingInvoice] = useState<{ id: string; total: number; currency: string } | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<string | null>(null);
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
  const [privacyMode, setPrivacyMode] = useState(() => localStorage.getItem('invoicePrivacyMode') === 'true');

  useEffect(() => {
    fetchInvoices();
  }, []);

  useEffect(() => {
    filterInvoices();
  }, [invoices, searchTerm, statusFilter]);

  // If route param changes at runtime, auto-open when present
  useEffect(() => {
    if (prefillClientId) setShowCreateModal(true);
  }, [prefillClientId]);

  useEffect(() => {
    // Poll payment status for any non-final invoices every 30s
    const interval = setInterval(async () => {
      try {
        const target = invoices.filter(inv => inv.status !== 'paid' && inv.status !== 'cancelled');
        if (!target.length) return;
        const ids = target.map(t => t.id).join(',');
        const resp = await fetch(`/api/invoices/status?ids=${encodeURIComponent(ids)}`);
        if (!resp.ok) return;
        const data = await resp.json();
        const rows = data?.rows || [];
        if (rows.length) {
          setInvoices(prev => prev.map(inv => {
            const row = rows.find((r:any) => r.id === inv.id);
            if (!row) return inv;
            const paid = (row.payment_status || row.status) === 'paid';
            return {
              ...inv,
              status: (row.status || inv.status) as any,
              paid_date: paid ? (row.paid_at || new Date().toISOString()) : inv.paid_date
            };
          }));
        }
      } catch {}
    }, 30000);
    return () => clearInterval(interval);
  }, [invoices]);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/crm/invoices', { credentials: 'include' });
      if (!response.ok) {
        throw new Error('Failed to fetch invoices');
      }
      const data = await response.json();
      const rows = data?.rows || data || [];
      const formatted = rows.map((r: any) => ({
        id: r.id,
        public_id: r.publicId || r.public_id,
        invoice_number: r.invoiceNumber || r.invoice_number || r.invoice_no || '',
        client_id: r.clientId || r.client_id || '',
        client_name: r.clientName || r.client_name || r.client?.name || 'Unknown Client',
        amount: r.subtotal_amount || parseFloat(r.subtotal || r.subtotal_amount || '0') || 0,
        tax_amount: r.tax_amount || parseFloat(r.taxAmount || r.tax || '0') || 0,
        total_amount: r.total_amount || parseFloat(r.total || r.totalAmount || '0') || 0,
        status: (r.status || 'draft').toLowerCase(),
        due_date: r.dueDate || r.due_date,
        paid_date: r.paidDate || r.paid_date,
        notes: r.notes || '',
        created_at: r.createdAt || r.created_at,
        document_type: r.documentType || r.document_type || 'invoice'
      }));
      setInvoices(formatted || []);
    } catch (err) {
      // console.error removed
      setError('Failed to load invoices. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const filterInvoices = () => {
    let filtered = [...invoices];
    
    // Apply search filter
    if (searchTerm && invoices.length > 0) {
      filtered = filtered.filter(invoice => 
        (invoice.invoice_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (invoice.client_name || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(invoice => invoice.status === statusFilter);
    }
    
    setFilteredInvoices(filtered);
  };

  const handleDeleteInvoice = async (id: string) => {
    try {
      setLoading(true);
      // Permanently delete the invoice
      const response = await fetch(`/api/crm/invoices/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to delete invoice');
      
      // Remove from local state
      setInvoices(prevInvoices => prevInvoices.filter(invoice => invoice.id !== id));
      setDeleteConfirmation(null);
    } catch (err) {
      setError('Failed to delete invoice. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/invoices/update-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ invoice_id: id, status: newStatus })
      });
      if (!response.ok) {
        throw new Error('Failed to update invoice status');
      }
      
      // Update local state
      setInvoices(prevInvoices => 
        prevInvoices.map(invoice => 
          invoice.id === id 
            ? { ...invoice, status: newStatus as any, paid_date: newStatus === 'paid' ? new Date().toISOString().split('T')[0] : invoice.paid_date } 
            : invoice
        )
      );
    } catch (err) {
      setError('Failed to update invoice status. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: Invoice['status'], documentType?: string) => {
    // Show document type badge for quotes/estimates
    if (documentType === 'quote') {
      return (
        <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
          Quote
        </span>
      );
    }
    if (documentType === 'estimate') {
      return (
        <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
          Estimate
        </span>
      );
    }

    const statusConfig = {
      draft: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Draft' },
      sent: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Sent' },
      paid: { bg: 'bg-green-100', text: 'text-green-800', label: 'Paid' },
      partially_paid: { bg: 'bg-amber-100', text: 'text-amber-800', label: 'Partially Paid' },
      overdue: { bg: 'bg-red-100', text: 'text-red-800', label: 'Overdue' },
      cancelled: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Cancelled' },
      awaiting_payment: { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Awaiting Payment' }
    };

    const config = statusConfig[status] || { bg: 'bg-gray-100', text: 'text-gray-800', label: status || 'Unknown' };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  const isOverdue = (dueDate: string, status: string) => {
    return status !== 'paid' && new Date(dueDate) < new Date();
  };

  const convertToInvoice = async (invoiceId: string) => {
    if (!confirm('Convert this quote/estimate to an invoice?')) return;
    try {
      const response = await fetch(`/api/crm/invoices/${invoiceId}/convert-to-invoice`, {
        method: 'POST',
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to convert');
      const result = await response.json();
      // Update local state
      setInvoices(prev => prev.map(inv => 
        inv.id === invoiceId 
          ? { ...inv, document_type: 'invoice', invoice_number: result.invoice_number || inv.invoice_number }
          : inv
      ));
      alert('Successfully converted to invoice!');
    } catch (err) {
      alert('Failed to convert. Please try again.');
    }
  };

  const downloadInvoicePDF = async (invoiceId?: string, invoiceNumber?: string) => {
    try {
      if (!invoiceId) throw new Error('Missing invoice ID');
      
      // Open the invoice page in a new window - user can print to PDF from there
      const printWindow = window.open(`/inv/${invoiceId}`, '_blank');
      if (printWindow) {
        // Give the page time to load, then trigger print dialog
        printWindow.onload = () => {
          setTimeout(() => {
            printWindow.print();
          }, 500);
        };
      }
      
    } catch (error) {
      alert('PDF download failed. Please try again.');
    }
  };


  const sendEmail = async (id: string, to?: string) => {
    const email = to || prompt('Send invoice to email address:', '') || '';
    if (!email) return;
    try {
      const r = await fetch('/api/invoices/send-email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ invoice_id: id, to: email }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || 'send failed');
      alert(`Email sent. Link: ${j.link}`);
    } catch (e:any) { alert(e.message || 'send failed'); }
  };

  const sendWhatsApp = async (id: string, phone?: string) => {
    const to = phone || prompt('Recipient WhatsApp number (+countrycode...):', '') || '';
    if (!to) return;
    try {
      const r = await fetch('/api/invoices/send-whatsapp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ invoice_id: id, to_phone: to }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || 'send failed');
      if (j.sent) alert('WhatsApp sent.'); else if (j.share) window.open(j.share, '_blank'); else alert(`Link: ${j.link}`);
    } catch (e:any) { alert(e.message || 'send failed'); }
  };

  const sendSms = async (id: string, phone?: string) => {
    const to = phone || prompt('Recipient SMS number (+countrycode...):', '') || '';
    if (!to) return;
    try {
      const r = await fetch('/api/invoices/send-sms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ invoice_id: id, to_phone: to }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || 'send failed');
      alert(j.sent ? 'SMS sent.' : 'SMS provider not configured. Link copied.');
    } catch (e:any) { alert(e.message || 'send failed'); }
  };

  const getTotalStats = () => {
    if (!filteredInvoices || filteredInvoices.length === 0) {
      return { totalAmount: 0, paidAmount: 0, overdueAmount: 0, awaitingPaymentCount: 0, awaitingPaymentAmount: 0 };
    }
    
    const totalAmount = filteredInvoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
    const paidAmount = filteredInvoices
      .filter(inv => inv.status === 'paid')
      .reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
    const overdueAmount = filteredInvoices
      .filter(inv => inv.status === 'overdue')
      .reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
    const awaitingPaymentInvoices = filteredInvoices.filter(inv => inv.status === 'awaiting_payment');
    const awaitingPaymentCount = awaitingPaymentInvoices.length;
    const awaitingPaymentAmount = awaitingPaymentInvoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);

    return { totalAmount, paidAmount, overdueAmount, awaitingPaymentCount, awaitingPaymentAmount };
  };

  const stats = getTotalStats();

  const togglePrivacyMode = () => {
    setPrivacyMode(prev => {
      const next = !prev;
      localStorage.setItem('invoicePrivacyMode', String(next));
      return next;
    });
  };

  const mask = (value: string) => privacyMode ? '•••••' : value;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">{t('invoice.management')}</h1>
            <p className="text-gray-600">{t('invoice.create')}, {t('invoice.edit')}</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={togglePrivacyMode}
              className={`p-2 rounded-lg border transition-colors ${privacyMode ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-500 border-gray-300 hover:bg-gray-50'}`}
              title={privacyMode ? 'Show figures' : 'Hide figures'}
            >
              {privacyMode ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
            <button
            onClick={() => setShowCreateModal(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center"
          >
            <Plus size={20} className="mr-2" />
            {t('doc.new.invoice')}
          </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">{t('invoice.totalInvoiced')}</p>
                <p className="text-2xl font-semibold text-gray-900">{mask(`€${(stats.totalAmount || 0).toFixed(2)}`)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">{t('invoice.paidAmount')}</p>
                <p className="text-2xl font-semibold text-gray-900">{mask(`€${(stats.paidAmount || 0).toFixed(2)}`)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Clock className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Awaiting Payment</p>
                <p className="text-2xl font-semibold text-gray-900">{mask(String(stats.awaitingPaymentCount || 0))}</p>
                <p className="text-xs text-gray-500">{mask(`€${(stats.awaitingPaymentAmount || 0).toFixed(2)}`)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <Calendar className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">{t('invoice.overdueAmount')}</p>
                <p className="text-2xl font-semibold text-gray-900">{mask(`€${(stats.overdueAmount || 0).toFixed(2)}`)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search invoices..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>
            
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="all">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="paid">Paid</option>
              <option value="awaiting_payment">Awaiting Payment</option>
              <option value="overdue">Overdue</option>
              <option value="cancelled">Cancelled</option>
            </select>

            <button className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              <Filter size={20} className="mr-2" />
              More Filters
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start">
            <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 mr-2" />
            <span>{error}</span>
          </div>
        )}

        {/* Invoices Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 text-purple-600 animate-spin" />
              <span className="ml-2 text-gray-600">Loading invoices...</span>
            </div>
          ) : filteredInvoices.length > 0 ? (
            <div className="overflow-x-auto">
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredInvoices.map((invoice) => (
                    <tr key={invoice.id} className={`hover:bg-gray-50 ${
                      isOverdue(invoice.due_date, invoice.status) ? 'bg-red-50' : ''
                    }`}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{invoice.invoice_number}</div>
                          <div className="text-sm text-gray-500">
                            Created {new Date(invoice.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {invoice.client_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{mask(`€${(invoice.total_amount || 0).toFixed(2)}`)}</div>
                        <div className="text-sm text-gray-500">
                          {mask(`€${(invoice.amount || 0).toFixed(2)}`)} + {mask(`€${(invoice.tax_amount || 0).toFixed(2)}`)} tax
                        </div>
                      </td>                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(invoice.status, invoice.document_type)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`text-sm ${
                          isOverdue(invoice.due_date, invoice.status) ? 'text-red-600 font-medium' : 'text-gray-900'
                        }`}>
                          {new Date(invoice.due_date).toLocaleDateString()}
                        </div>
                        {invoice.paid_date && (
                          <div className="text-sm text-green-600">
                            Paid {new Date(invoice.paid_date).toLocaleDateString()}
                          </div>
                        )}
                      </td>                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">                        <div className="flex space-x-2">
                          <a 
                            href={`/inv/${invoice.id || ''}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-600 hover:text-blue-900" 
                            title="View Invoice"
                          >
                            <Eye size={16} />
                          </a>                          <button 
                            onClick={() => setEditingInvoiceId(invoice.id)}
                            className="text-yellow-600 hover:text-yellow-900" 
                            title="Edit Invoice"
                          >
                            <Edit size={16} />
                          </button>
                          <button 
                            onClick={() => setPaymentTrackingInvoice({ 
                              id: invoice.id, 
                              total: invoice.total_amount || 0, 
                              currency: 'EUR' 
                            })}
                            className="text-purple-600 hover:text-purple-900" 
                            title="Track Payments"
                          >
                            <DollarSign size={16} />
                          </button>
                          <button 
                            onClick={() => downloadInvoicePDF(invoice.id, invoice.invoice_number)}
                            className="text-indigo-600 hover:text-indigo-900" 
                            title="Download PDF"
                          >
                            <Download size={16} />
                          </button>
                          <button 
                            onClick={() => {
                              const link = `${window.location.origin}/inv/${invoice.id}`;
                              navigator.clipboard.writeText(link);
                              alert('Invoice link copied to clipboard!');
                            }} 
                            className="text-cyan-600 hover:text-cyan-900" 
                            title="Copy Invoice Link"
                          >
                            <FileText size={16} />
                          </button>
                          <button onClick={() => sendEmail(invoice.id)} className="text-indigo-600 hover:text-indigo-900" title="Send Email">
                            <Send size={16} />
                          </button>
                          <button onClick={() => sendWhatsApp(invoice.id)} className="text-green-600 hover:text-green-900" title="Send WhatsApp">
                            <Send size={16} />
                          </button>
                          <button onClick={() => sendSms(invoice.id)} className="text-emerald-600 hover:text-emerald-900" title="Send SMS">
                            <Send size={16} />
                          </button>
                          {(invoice.document_type === 'quote' || invoice.document_type === 'estimate') && (
                            <button 
                              onClick={() => convertToInvoice(invoice.id)}
                              className="text-orange-600 hover:text-orange-900" 
                              title="Convert to Invoice"
                            >
                              <ArrowRightCircle size={16} />
                            </button>
                          )}
                          <button 
                            onClick={() => setDeleteConfirmation(invoice.id)}
                            className="text-red-600 hover:text-red-900" 
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">No invoices found matching your criteria.</p>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Confirm Deletion</h3>
            <p className="text-gray-500 mb-6">
              Are you sure you want to delete this invoice? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setDeleteConfirmation(null)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteConfirmation && handleDeleteInvoice(deleteConfirmation)}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}      {/* Payment Tracker */}
      {paymentTrackingInvoice && (
        <PaymentTracker
          invoiceId={paymentTrackingInvoice.id}
          invoiceTotal={paymentTrackingInvoice.total}
          currency={paymentTrackingInvoice.currency}
          isOpen={Boolean(paymentTrackingInvoice)}
          onClose={() => setPaymentTrackingInvoice(null)}
          onPaymentAdded={() => {
            fetchInvoices();
          }}
        />
      )}

      {/* Create Invoice Modal */}
      <AdvancedInvoiceForm
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          fetchInvoices();
          setShowCreateModal(false);
        }}
        prefillClientId={prefillClientId}
      />

      {/* Edit Invoice Modal */}
      {editingInvoiceId && (
        <AdvancedInvoiceForm
          isOpen={true}
          onClose={() => setEditingInvoiceId(null)}
          onSuccess={() => {
            fetchInvoices();
            setEditingInvoiceId(null);
          }}
          editingInvoice={invoices.find(inv => inv.id === editingInvoiceId) ? (() => {
            const inv = invoices.find(inv => inv.id === editingInvoiceId)!;
            return {
              id: editingInvoiceId,
              client_id: inv.client_id || '',
              status: inv.status,
              due_date: inv.due_date || '',
              payment_terms: 'Net 30',
              currency: 'EUR',
              notes: inv.notes || '',
              discount_type: 'fixed' as const,
              discount_value: 0,
              discount_amount: 0,
              items: []
            };
          })() : undefined}
        />
      )}
    </AdminLayout>
  );
};

export default InvoicesPage;