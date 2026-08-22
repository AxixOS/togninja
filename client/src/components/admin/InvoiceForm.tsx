import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
// Using Neon database with Express API endpoints
import { invoiceService, priceListService, Invoice, InvoiceItem, PriceListItem, Client } from '../../lib/invoicing';
import { sendInvoiceEmail, shareInvoiceWhatsApp } from '../../api/invoices';
import { 
  Plus, 
  Trash2, 
  Search, 
  Calculator, 
  Save, 
  Send, 
  X,
  Loader2,
  AlertCircle,
  CheckCircle,
  Mail,
  MessageCircle,
  Phone
} from 'lucide-react';
import { SITE } from '../../config/site';
import { useStudioCurrency } from '../../hooks/useStudioCurrency';

interface InvoiceFormProps {
  invoice?: Invoice;
  onSave: (invoice: Invoice) => void;
  onCancel: () => void;
  clients: Client[];
}

const InvoiceForm: React.FC<InvoiceFormProps> = ({
  invoice,
  onSave,
  onCancel,
  clients
}) => {
  const { format: formatPrice, currency } = useStudioCurrency();
  const [formData, setFormData] = useState<Partial<Invoice>>({
    invoice_number: '',
    client_id: '',
    issue_date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: 'draft',
    items: [],
    subtotal: 0,
    tax_amount: 0,
    total_amount: 0,
    currency,
    notes: '',
    terms: 'Payment is due within 30 days.',
    ...invoice
  });

  const [priceList, setPriceList] = useState<PriceListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showPriceList, setShowPriceList] = useState(false);
  const [priceListSearch, setPriceListSearch] = useState('');
  
  // Email and WhatsApp state
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [emailData, setEmailData] = useState({
    email_address: '',
    subject: '',
    message: ''
  });
  const [whatsAppPhone, setWhatsAppPhone] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [sendingWhatsApp, setSendingWhatsApp] = useState(false);

  // Edit description before adding to invoice
  const [showEditDescriptionModal, setShowEditDescriptionModal] = useState(false);
  const [pendingPriceItem, setPendingPriceItem] = useState<PriceListItem | null>(null);
  const [editableDescription, setEditableDescription] = useState('');

  const selectedClient = clients.find(c => c.id === formData.client_id);
  const filteredPriceList = priceList.filter(item =>
    item.name?.toLowerCase().includes(priceListSearch.toLowerCase()) ||
    item.category?.toLowerCase().includes(priceListSearch.toLowerCase()) ||
    item.description?.toLowerCase().includes(priceListSearch.toLowerCase())
  );

  useEffect(() => {
    fetchPriceList();
    if (!invoice) {
      generateInvoiceNumber();
    }
  }, []);

  useEffect(() => {
    calculateTotals();
  }, [formData.items]);

  const fetchPriceList = async () => {
    try {
      const items = await priceListService.getPriceListItems();
      setPriceList(items);
    } catch (err) {
      // Fallback to empty array to prevent modal from breaking
      setPriceList([]);
    }
  };

  const generateInvoiceNumber = async () => {
    try {
      const invoiceNumber = await invoiceService.generateInvoiceNumber();
      setFormData(prev => ({ ...prev, invoice_number: invoiceNumber }));
    } catch (err) {
      // console.error removed
    }
  };

  const calculateTotals = () => {
    const items = formData.items || [];
    const { subtotal, taxAmount, total } = invoiceService.calculateInvoiceTotals(items);
    
    setFormData(prev => ({
      ...prev,
      subtotal,
      tax_amount: taxAmount,
      total_amount: total
    }));
  };

  const addItem = () => {
    const newItem: InvoiceItem = {
      description: '',
      quantity: 1,
      rate: 0,
      amount: 0,
      tax_rate: 0 // Default VAT
    };

    setFormData(prev => ({
      ...prev,
      items: [...(prev.items || []), newItem]
    }));
  };

  const addPriceListItem = (priceItem: PriceListItem, customDescription?: string) => {
    const newItem: InvoiceItem = {
      description: customDescription || priceItem.name + (priceItem.description ? ` - ${priceItem.description}` : ''),
      quantity: 1,
      rate: priceItem.price,
      amount: priceItem.price,
      tax_rate: priceItem.tax_rate || 0,
      category: priceItem.category
    };

    setFormData(prev => ({
      ...prev,
      items: [...(prev.items || []), newItem]
    }));

    setShowPriceList(false);
    setPriceListSearch('');
  };

  const openEditDescriptionModal = (item: PriceListItem) => {
    setPendingPriceItem(item);
    setEditableDescription(item.name + (item.description ? ` - ${item.description}` : ''));
    setShowEditDescriptionModal(true);
  };

  const updateItem = (index: number, field: keyof InvoiceItem, value: any) => {
    const items = [...(formData.items || [])];
    items[index] = { ...items[index], [field]: value };

    // Recalculate amount if quantity or rate changed
    if (field === 'quantity' || field === 'rate') {
      items[index].amount = items[index].quantity * items[index].rate;
    }

    setFormData(prev => ({ ...prev, items }));
  };

  const removeItem = (index: number) => {
    const items = [...(formData.items || [])];
    items.splice(index, 1);
    setFormData(prev => ({ ...prev, items }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.client_id) {
      setError('Please select a client');
      return;
    }

    if (!formData.items || formData.items.length === 0) {
      setError('Please add at least one item');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const invoiceData = {
        ...formData,
        client_name: selectedClient ? `${selectedClient.first_name} ${selectedClient.last_name}` : '',
        client_email: selectedClient?.email || '',
        client_address: selectedClient?.address || ''
      } as Invoice;

      let savedInvoice: Invoice;

      if (invoice?.id) {
        savedInvoice = await invoiceService.updateInvoice(invoice.id, invoiceData);
      } else {
        savedInvoice = await invoiceService.createInvoice(invoiceData);
      }

      setSuccess(invoice?.id ? 'Invoice updated successfully!' : 'Invoice created successfully!');
      setTimeout(() => {
        onSave(savedInvoice);
      }, 1000);

    } catch (err) {
      // console.error removed
      setError('Failed to save invoice. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAndSend = async () => {
    // First save the invoice
    await handleSubmit(new Event('submit') as any);
    
    // Then mark as sent (you could implement email sending here)
    if (formData.id) {
      try {
        await invoiceService.updateInvoice(formData.id, { status: 'sent' });
        setSuccess('Invoice saved and marked as sent!');
      } catch (err) {
        setError('Invoice saved but failed to mark as sent');
      }
    }
  };

  const handleSendEmail = async () => {
    if (!invoice?.id) {
      setError('Please save the invoice first');
      return;
    }

    setSendingEmail(true);
    try {
      const clientEmail = selectedClient?.email || '';
      const invoiceNumber = invoice.invoice_number || formData.invoice_number;
      
      const emailPayload = {
        email_address: emailData.email_address || clientEmail,
        subject: emailData.subject || `Rechnung ${invoiceNumber} - ${SITE.name}`,
        message: emailData.message || 'Vielen Dank für Ihr Vertrauen! Anbei finden Sie Ihre Rechnung für unsere Fotografie-Dienstleistungen.'
      };

      await sendInvoiceEmail(invoice.id, emailPayload);
      setSuccess('Invoice sent successfully via email!');
      setShowEmailModal(false);
      setEmailData({ email_address: '', subject: '', message: '' });
    } catch (err) {
      setError('Failed to send invoice email. Please try again.');
    } finally {
      setSendingEmail(false);
    }
  };

  const handleSendWhatsApp = async () => {
    if (!invoice?.id) {
      setError('Please save the invoice first');
      return;
    }

    setSendingWhatsApp(true);
    try {
      const phone = whatsAppPhone.replace(/[^\d+]/g, ''); // Clean phone number
      const result = await shareInvoiceWhatsApp(invoice.id, phone);
      
      // Open WhatsApp link in new window
      window.open(result.whatsapp_url, '_blank');
      
      setSuccess('WhatsApp share link created successfully!');
      setShowWhatsAppModal(false);
      setWhatsAppPhone('');
    } catch (err) {
      setError('Failed to create WhatsApp share link. Please try again.');
    } finally {
      setSendingWhatsApp(false);
    }
  };

  const openEmailModal = () => {
    if (!invoice?.id && !formData.id) {
      setError('Please save the invoice first');
      return;
    }
    
    setEmailData({
      email_address: selectedClient?.email || '',
      subject: `Rechnung ${invoice?.invoice_number || formData.invoice_number} - ${SITE.name}`,
      message: 'Vielen Dank für Ihr Vertrauen! Anbei finden Sie Ihre Rechnung für unsere Fotografie-Dienstleistungen.'
    });
    setShowEmailModal(true);
  };

  const openWhatsAppModal = () => {
    if (!invoice?.id && !formData.id) {
      setError('Please save the invoice first');
      return;
    }
    
  setWhatsAppPhone((selectedClient as any)?.phone || '');
    setShowWhatsAppModal(true);
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          {invoice ? 'Edit Invoice' : 'Create Invoice'}
        </h2>
        <button
          onClick={onCancel}
          className="p-2 text-gray-600 hover:text-gray-800 transition-colors"
        >
          <X className="h-6 w-6" />
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2">
          <AlertCircle className="h-5 w-5 text-red-500" />
          <span className="text-red-700">{error}</span>
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center space-x-2">
          <CheckCircle className="h-5 w-5 text-green-500" />
          <span className="text-green-700">{success}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Header Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Invoice Number
            </label>
            <input
              type="text"
              value={formData.invoice_number}
              onChange={(e) => setFormData(prev => ({ ...prev, invoice_number: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Client
            </label>
            <select
              value={formData.client_id}
              onChange={(e) => setFormData(prev => ({ ...prev, client_id: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              required
            >
              <option value="">Select a client...</option>
              {clients.map(client => (
                <option key={client.id} value={client.id}>
                  {client.first_name} {client.last_name} {client.company && `(${client.company})`}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Issue Date
            </label>
            <input
              type="date"
              value={formData.issue_date}
              onChange={(e) => setFormData(prev => ({ ...prev, issue_date: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Due Date
            </label>
            <input
              type="date"
              value={formData.due_date}
              onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              required
            />
          </div>
        </div>

        {/* Items Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Invoice Items</h3>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => setShowPriceList(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Search className="h-4 w-4" />
                <span>Price List</span>
              </button>
              <button
                type="button"
                onClick={addItem}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>Add Item</span>
              </button>
            </div>
          </div>

          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Description</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 w-20">Qty</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 w-24">Rate</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 w-20">Tax%</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 w-24">Amount</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 w-12"></th>
                </tr>
              </thead>
              <tbody>
                {(formData.items || []).map((item, index) => (
                  <tr key={index} className="border-t border-gray-200">
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => updateItem(index, 'description', e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="Item description..."
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                        className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        min="0"
                        step="0.01"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        value={item.rate}
                        onChange={(e) => updateItem(index, 'rate', parseFloat(e.target.value) || 0)}
                        className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        min="0"
                        step="0.01"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        value={item.tax_rate || 0}
                        onChange={(e) => updateItem(index, 'tax_rate', parseFloat(e.target.value) || 0)}
                        className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        min="0"
                        max="100"
                        step="0.01"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-medium">{formatPrice(item.amount || 0)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="p-1 text-red-600 hover:text-red-800 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {(!formData.items || formData.items.length === 0) && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                      No items added yet. Click "Add Item" or "Price List" to get started.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="mt-4 flex justify-end">
            <div className="w-64 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Subtotal:</span>
                <span>{formatPrice(formData.subtotal || 0)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Tax:</span>
                <span>{formatPrice(formData.tax_amount || 0)}</span>
              </div>
              <div className="flex justify-between text-lg font-semibold border-t pt-2">
                <span>Total:</span>
                <span>{formatPrice(formData.total_amount || 0)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Notes and Terms */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              rows={4}
              placeholder="Additional notes..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Terms & Conditions
            </label>
            <textarea
              value={formData.terms}
              onChange={(e) => setFormData(prev => ({ ...prev, terms: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              rows={4}
              placeholder="Payment terms and conditions..."
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-4 pt-6 border-t">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          
          {/* Email and WhatsApp buttons for saved invoices */}
          {(invoice?.id || formData.id) && (
            <>
              <button
                type="button"
                onClick={openEmailModal}
                className="flex items-center space-x-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Mail className="h-4 w-4" />
                <span>Send Email</span>
              </button>
              <button
                type="button"
                onClick={openWhatsAppModal}
                className="flex items-center space-x-2 px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
              >
                <MessageCircle className="h-4 w-4" />
                <span>Share WhatsApp</span>
              </button>
            </>
          )}
          
          <button
            type="submit"
            disabled={loading}
            className="flex items-center space-x-2 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            <span>{invoice ? 'Update' : 'Save'} Invoice</span>
          </button>
          {!invoice && (
            <button
              type="button"
              onClick={handleSaveAndSend}
              disabled={loading}
              className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              <span>Save & Send</span>
            </button>
          )}
        </div>
      </form>

      {/* Price List Modal */}
      {showPriceList && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Select from Price List</h3>
                <button
                  onClick={() => setShowPriceList(false)}
                  className="p-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="text"
                  placeholder="Search price list..."
                  value={priceListSearch}
                  onChange={(e) => setPriceListSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="max-h-96 overflow-y-auto p-6">
              <div className="space-y-2">

                {filteredPriceList.map(item => (
                  <div
                    key={item.id}
                    onClick={() => openEditDescriptionModal(item)}
                    className="p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{item.name}</h4>
                        {item.description && (
                          <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                        )}
                        <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                          <span className="px-2 py-1 bg-gray-100 rounded text-xs">{item.category}</span>
                          {item.unit && <span>per {item.unit}</span>}
                          {item.tax_rate && <span>{item.tax_rate}% tax</span>}
                        </div>
                      </div>
                      <div className="text-lg font-semibold text-purple-600">
                        {formatPrice(item.price || 0)}
                      </div>
                    </div>
                  </div>
                ))}
                {filteredPriceList.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No items found matching your search.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Description Modal - rendered via portal to escape stacking context */}
      {showEditDescriptionModal && pendingPriceItem && createPortal(
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center"
          style={{ zIndex: 9999 }}
          onClick={() => setShowEditDescriptionModal(false)}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div
            className="bg-white rounded-lg shadow-lg w-full max-w-lg mx-4"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Edit Invoice Description</h3>
                <button
                  onClick={() => setShowEditDescriptionModal(false)}
                  className="p-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Item:</span> {pendingPriceItem.name}
                  </p>
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Price:</span> {formatPrice(pendingPriceItem.price || 0)}
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description (editable)
                  </label>
                  <textarea
                    value={editableDescription}
                    onChange={(e) => setEditableDescription(e.target.value)}
                    onMouseDown={(e) => e.stopPropagation()}
                    rows={4}
                    autoFocus
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Enter description for the invoice line item..."
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    This description will appear on the invoice
                  </p>
                </div>
              </div>
              
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowEditDescriptionModal(false)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    addPriceListItem(pendingPriceItem, editableDescription);
                    setShowEditDescriptionModal(false);
                    setPendingPriceItem(null);
                  }}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                >
                  Add to Invoice
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Email Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <Mail className="h-5 w-5 mr-2 text-green-600" />
                  Send Invoice via Email
                </h3>
                <button
                  onClick={() => setShowEmailModal(false)}
                  className="p-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={emailData.email_address}
                    onChange={(e) => setEmailData(prev => ({ ...prev, email_address: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="client@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Subject
                  </label>
                  <input
                    type="text"
                    value={emailData.subject}
                    onChange={(e) => setEmailData(prev => ({ ...prev, subject: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Invoice subject"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Message (Optional)
                  </label>
                  <textarea
                    value={emailData.message}
                    onChange={(e) => setEmailData(prev => ({ ...prev, message: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    rows={3}
                    placeholder="Additional message to include with the invoice..."
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowEmailModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendEmail}
                  disabled={sendingEmail || !emailData.email_address}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  {sendingEmail ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Mail className="h-4 w-4" />
                  )}
                  <span>Send Email</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp Modal */}
      {showWhatsAppModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <MessageCircle className="h-5 w-5 mr-2 text-green-500" />
                  Share via WhatsApp
                </h3>
                <button
                  onClick={() => setShowWhatsAppModal(false)}
                  className="p-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Phone className="h-4 w-4 inline mr-1" />
                    WhatsApp Phone Number
                  </label>
                  <input
                    type="tel"
                    value={whatsAppPhone}
                    onChange={(e) => setWhatsAppPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="+43 677 123 4567"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Include country code (e.g., +43 for Austria)
                  </p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm text-green-800">
                    📱 This will create a pre-filled WhatsApp message with the invoice details and link. 
                    The WhatsApp app will open in a new window.
                  </p>
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowWhatsAppModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendWhatsApp}
                  disabled={sendingWhatsApp || !whatsAppPhone}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
                >
                  {sendingWhatsApp ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <MessageCircle className="h-4 w-4" />
                  )}
                  <span>Open WhatsApp</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoiceForm;
