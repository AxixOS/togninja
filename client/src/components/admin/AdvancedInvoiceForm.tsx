import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Plus, 
  Trash2, 
  FileText,
  User,
  Download,
  Send,
  Mail,
  CreditCard,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Check,
  ShoppingCart,
  Link,
  Share
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../../lib/queryClient';
import { priceListService, PriceListItem, pdfService } from '../../lib/invoicing';
import { useLanguage } from '../../context/LanguageContext';
import { SITE } from '../../config/site';

interface Client {
  id: string;
  name: string;
  email: string;
  address1?: string;
  city?: string;
  country?: string;
}

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
}

interface InvoiceFormData {
  client_id: string;
  issue_date: string;
  due_date: string;
  payment_terms: string;
  currency: string;
  notes?: string;
  footer_text?: string;
  discount_type: 'fixed' | 'percentage';
  discount_value: number;
  discount_amount: number;
  items: InvoiceItem[];
}

interface AdvancedInvoiceFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingInvoice?: Invoice | null;
  prefillClientId?: string | undefined;
}

interface Invoice {
  id: string;
  client_id: string;
  status?: string;
  due_date: string;
  payment_terms: string;
  currency: string;
  notes?: string;
  discount_type?: 'fixed' | 'percentage';
  discount_value?: number;
  discount_amount: number;
  items: InvoiceItem[];
}

const AdvancedInvoiceForm: React.FC<AdvancedInvoiceFormProps> = ({
  isOpen,
  onClose,
  onSuccess,
  editingInvoice,
  prefillClientId
}) => {
  const { t } = useLanguage();
  const [currentStep, setCurrentStep] = useState(1);
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [clientSearch, setClientSearch] = useState('');
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPriceList, setShowPriceList] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [priceList, setPriceList] = useState<PriceListItem[]>([]);
  const [privacyMask, setPrivacyMask] = useState(false);
  const [documentType, setDocumentType] = useState<'invoice' | 'quote' | 'estimate'>('invoice');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // VAT memory functionality
  const getLastUsedVatRate = (): number => {
    const saved = localStorage.getItem('lastUsedVatRate');
    return saved ? parseFloat(saved) : 0;
  };

  const saveLastUsedVatRate = (rate: number): void => {
    localStorage.setItem('lastUsedVatRate', rate.toString());
  };

  // Invoice defaults memory (footer text, payment terms)
  const getSavedFooterText = (): string => {
    return localStorage.getItem('invoiceDefaultFooter') || '';
  };
  const saveFooterText = (text: string): void => {
    localStorage.setItem('invoiceDefaultFooter', text);
  };
  const getSavedPaymentTerms = (): string => {
    return localStorage.getItem('invoiceDefaultPaymentTerms') || 'Net 30';
  };
  const savePaymentTerms = (terms: string): void => {
    localStorage.setItem('invoiceDefaultPaymentTerms', terms);
  };
  const getSavedNotes = (): string => {
    return localStorage.getItem('invoiceDefaultNotes') || '';
  };
  const saveNotes = (text: string): void => {
    localStorage.setItem('invoiceDefaultNotes', text);
  };
  const [footerSaved, setFooterSaved] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);
  const [termsSaved, setTermsSaved] = useState(false);
  const [formData, setFormData] = useState<InvoiceFormData>({
    client_id: '',
    issue_date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
    payment_terms: getSavedPaymentTerms(),
    currency: 'EUR',
    notes: getSavedNotes(),
    footer_text: getSavedFooterText(),
    discount_type: 'fixed',
    discount_value: 0,
    discount_amount: 0,
    items: [
      {
        id: '1',
        description: '',
        quantity: 1,
        unit_price: 0,
        tax_rate: getLastUsedVatRate() // Use remembered VAT rate
      }
    ]
  });

  // Payment tracking states
  const [markAsPaid, setMarkAsPaid] = useState(false);
  const [paymentData, setPaymentData] = useState({
    payment_method: 'cash',
    payment_reference: '',
    payment_notes: ''
  });

  // PDF and Email functionality states
  const [createdInvoice, setCreatedInvoice] = useState<any>(null);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailData, setEmailData] = useState({
    subject: '',
    message: '',
    includeAttachment: true
  });

  // Edit description before adding to invoice
  const [showEditDescriptionModal, setShowEditDescriptionModal] = useState(false);
  const [pendingPriceItem, setPendingPriceItem] = useState<PriceListItem | null>(null);
  const [editableDescription, setEditableDescription] = useState('');

  // Quick client creation states
  const [showQuickClientModal, setShowQuickClientModal] = useState(false);
  const [quickClientData, setQuickClientData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    zip: '',
    country: '',
    company: '',
    notes: ''
  });
  const [creatingClient, setCreatingClient] = useState(false);

  const steps = [
    { id: 1, title: 'Client & Details', icon: User },
    { id: 2, title: 'Line Items', icon: FileText },
    { id: 3, title: 'Payment & Terms', icon: CreditCard },
    { id: 4, title: 'Review & Create', icon: Eye }
  ];

  useEffect(() => {
    if (isOpen) {
      // Reset form state when opening for a NEW invoice (not editing)
      if (!editingInvoice) {
        setCurrentStep(1);
        setFormData({
          client_id: '',
          issue_date: new Date().toISOString().split('T')[0],
          due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          payment_terms: getSavedPaymentTerms(),
          currency: 'EUR',
          notes: getSavedNotes(),
          footer_text: getSavedFooterText(),
          discount_type: 'fixed',
          discount_value: 0,
          discount_amount: 0,
          items: [{ id: '1', description: '', quantity: 1, unit_price: 0, tax_rate: getLastUsedVatRate() }]
        });
        setClientSearch('');
        setError(null);
        setCreatedInvoice(null);
        setMarkAsPaid(false);
        setDocumentType('invoice');
      }
      fetchClients();
      fetchPriceList();
    }
  }, [isOpen]);

  // Load invoice data once clients are loaded (for editing)
  useEffect(() => {
    if (isOpen && editingInvoice && clients.length > 0) {
      loadInvoiceData();
    }
  }, [isOpen, editingInvoice, clients.length]);

  // Apply prefill client when provided and clients are loaded
  useEffect(() => {
    if (!isOpen) return;
    if (!prefillClientId) return;
    if (clients.length === 0) return;
    const c = clients.find(x => x.id === prefillClientId);
    if (c) {
      setFormData(prev => ({ ...prev, client_id: c.id }));
      setClientSearch(c.name);
      setShowClientDropdown(false);
    }
  }, [isOpen, prefillClientId, clients]);

  const fetchPriceList = async () => {
    try {
      const items = await priceListService.getPriceListItems();
      setPriceList(items);
    } catch (err) {
      setPriceList([]);
    }
  };

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowClientDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);  const fetchClients = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch from the PostgreSQL crm_clients table via Express API
      const response = await fetch('/api/crm/clients');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();

      if (data && data.length > 0) {
        // Transform the CRM client data to match our Client interface
        const transformedClients = data.map((client: any) => {
          const firstName = client.firstName || '';
          const lastName = client.lastName || '';
          const fullName = lastName || firstName 
            ? `${lastName}, ${firstName}`.replace(/^,\s*/, '').replace(/,\s*$/, '')
            : '';
          const displayName = fullName || client.email || client.company || 'Unnamed Client';
          
          return {
            id: client.id,
            name: displayName,
            email: client.email || '',
            address1: client.address,
            city: client.city,
            country: client.country
          };
        });
        setClients(transformedClients);
        setFilteredClients(transformedClients);
        // console.log removed
      } else {
        // No clients found in CRM, use sample clients as fallback
        // console.log removed
        const sampleClients = getSampleClients();
        setClients(sampleClients);
        setFilteredClients(sampleClients);
      }
    } catch (err) {
      // console.error removed
      setError('Failed to load clients from database');
      // Fallback to sample clients
      const sampleClients = getSampleClients();
      setClients(sampleClients);
      setFilteredClients(sampleClients);
    } finally {
      setLoading(false);
    }
  };

  // Filter clients based on search input
  const filterClients = (searchTerm: string) => {
    setClientSearch(searchTerm);
    if (!searchTerm.trim()) {
      setFilteredClients(clients);
      return;
    }
    
    const filtered = clients.filter(client =>
      client.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (client.address1 && client.address1.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (client.city && client.city.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    setFilteredClients(filtered);
  };

  // Handle client selection
  const selectClient = (client: Client) => {
    setFormData(prev => ({ ...prev, client_id: client.id }));
    setClientSearch(client.name);
    setShowClientDropdown(false);
  };

  const getSampleClients = (): Client[] => {
    return [
      {
        id: 'sample-1',
        name: 'John Doe',
        email: 'john.doe@example.com',
        address1: '123 Main Street',
        city: 'Boston',
        country: 'USA'
      },
      {
        id: 'sample-2', 
        name: 'Jane Smith',
        email: 'jane.smith@company.com',
        address1: '456 Oak Avenue',
        city: 'Chicago',
        country: 'USA'
      },
      {
        id: 'sample-3',
        name: 'Mike Johnson', 
        email: 'mike.johnson@test.com',
        address1: '789 Pine Street',
        city: 'Miami',
        country: 'USA'
      },
      {
        id: 'sample-4',
        name: 'Sarah Wilson',
        email: 'sarah.wilson@demo.com', 
        address1: '321 Elm Drive',
        city: 'Seattle',
        country: 'USA'
      },
      {
        id: 'sample-5',
        name: 'Robert Brown',
        email: 'robert.brown@shop.com',
        address1: '654 Cedar Lane', 
        city: 'Portland',
        country: 'USA'
      }
    ];
  };

  const loadInvoiceData = async () => {
    if (!editingInvoice?.id) return;
    
    try {
      setLoading(true);
      console.log('📥 Loading invoice data for:', editingInvoice.id);
      // Fetch invoice details including items from the API
      const response = await fetch(`/api/crm/invoices/${editingInvoice.id}`, {
        credentials: 'include'
      });
      
      console.log('📨 Invoice fetch response:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('📦 Invoice data received:', data);
        console.log('📦 Raw client_id from response:', data?.invoice?.client_id);
        const invoice = data.invoice || data;
        const items = data.items || invoice.items || [];
        
        // Find the client for this invoice - convert both to string for comparison
        // Support both camelCase (Drizzle ORM) and snake_case field names
        const invoiceClientId = invoice.client_id || invoice.clientId ? String(invoice.client_id || invoice.clientId) : null;
        console.log('🔍 Looking for client:', invoiceClientId, 'in', clients.length, 'clients');
        
        if (invoiceClientId) {
          const client = clients.find(c => String(c.id) === invoiceClientId);
          if (client) {
            console.log('✅ Found client:', client.name);
            setClientSearch(client.name);
            // Also set the client_id in form data
            setFormData(prev => ({ ...prev, client_id: invoiceClientId }));
          } else {
            console.log('⚠️ Client not found, checking first few client IDs:', clients.slice(0, 3).map(c => c.id));
          }
        } else {
          console.log('⚠️ No client_id in invoice');
        }
        
        // Load invoice data into form
        // Support both camelCase (from Drizzle ORM) and snake_case field names
        const dueDate = invoice.due_date || invoice.dueDate;
        const issueDate = invoice.issue_date || invoice.issueDate;
        setFormData({
          client_id: invoiceClientId || '',
          issue_date: issueDate ? new Date(issueDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          due_date: dueDate ? new Date(dueDate).toISOString().split('T')[0] : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          payment_terms: invoice.payment_terms || invoice.paymentTerms || 'Net 30',
          currency: invoice.currency || 'EUR',
          notes: invoice.notes || '',
          footer_text: invoice.footer_text || invoice.footerText || '',
          discount_type: invoice.discount_type || invoice.discountType || 'fixed',
          discount_value: parseFloat(invoice.discount_value || invoice.discountValue || '0') || 0,
          discount_amount: parseFloat(invoice.discount_amount || invoice.discountAmount || '0') || 0,
          items: items.length > 0 ? items.map((item: any, index: number) => ({
            id: item.id || String(index + 1),
            description: item.description || '',
            quantity: parseFloat(item.quantity) || 1,
            unit_price: parseFloat(item.unit_price || item.unitPrice) || 0,
            tax_rate: parseFloat(item.tax_rate || item.taxRate) || 0
          })) : [{
            id: '1',
            description: '',
            quantity: 1,
            unit_price: 0,
            tax_rate: getLastUsedVatRate()
          }]
        });
        console.log('✅ Form data loaded with', items.length, 'items');
        
        // Load online payment toggle
        // Load document type
        const docType = invoice.document_type || invoice.documentType || 'invoice';
        if (docType === 'invoice' || docType === 'quote' || docType === 'estimate') {
          setDocumentType(docType);
        }
      } else {
        console.error('❌ Failed to fetch invoice:', response.status);
      }
    } catch (err) {
      console.error('Error loading invoice data:', err);
    } finally {
      setLoading(false);
    }
  };

  const calculateItemTotal = (item: InvoiceItem) => {
    const subtotal = item.quantity * item.unit_price;
    const tax = subtotal * (item.tax_rate / 100);
    return subtotal + tax;
  };

  const calculateTotals = () => {
    const subtotal = formData.items.reduce((sum, item) => 
      sum + (item.quantity * item.unit_price), 0);
    const totalTax = formData.items.reduce((sum, item) => 
      sum + (item.quantity * item.unit_price * item.tax_rate / 100), 0);
    
    // Calculate discount based on type
    let discount = 0;
    if (formData.discount_type === 'percentage') {
      // Percentage discount applied to subtotal (before tax)
      discount = subtotal * (formData.discount_value / 100);
    } else {
      // Fixed amount discount
      discount = formData.discount_value;
    }
    
    const total = subtotal + totalTax - discount;

    return { subtotal, totalTax, discount, total, discountValue: formData.discount_value, discountType: formData.discount_type };
  };

  const addItem = () => {
    const newItem: InvoiceItem = {
      id: Date.now().toString(),
      description: '',
      quantity: 1,
      unit_price: 0,
      tax_rate: getLastUsedVatRate() // Use remembered VAT rate
    };
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));
  };

  const removeItem = (itemId: string) => {
    if (formData.items.length > 1) {
      setFormData(prev => ({
        ...prev,
        items: prev.items.filter(item => item.id !== itemId)
      }));
    }
  };
  const updateItem = (itemId: string, updates: Partial<InvoiceItem>) => {
    // If tax_rate is being updated, save it to localStorage for future use
    if (updates.tax_rate !== undefined) {
      saveLastUsedVatRate(updates.tax_rate);
    }
    
    setFormData(prev => ({
      ...prev,
      items: prev.items.map(item => 
        item.id === itemId ? { ...item, ...updates } : item
      )
    }));
  };

  const addNewServiceItem = () => {
    const newItem: InvoiceItem = {
      id: Date.now().toString(),
      description: '',
      quantity: 1,
      unit_price: 0,
      tax_rate: getLastUsedVatRate() // Use remembered VAT rate
    };
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return formData.client_id !== '' && formData.due_date !== '';
      case 2:
        return formData.items.every(item => 
          item.description.trim() !== '' && 
          item.quantity > 0 && 
          item.unit_price >= 0
        );
      case 3:
        return formData.payment_terms !== '';
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 4));
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleQuickClientCreate = async () => {
    try {
      setCreatingClient(true);
      setError(null);

      // Validate required fields
      if (!quickClientData.firstName || !quickClientData.email) {
        setError('First name and email are required');
        return;
      }

      // Create client via API
      const response = await fetch('/api/crm/clients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(quickClientData)
      });

      if (!response.ok) {
        throw new Error('Failed to create client');
      }

      const newClient = await response.json();
      
      // Transform the response to match our Client interface
      const transformedClient = {
        id: newClient.id,
        name: `${newClient.firstName} ${newClient.lastName}`.trim(),
        email: newClient.email,
        address1: newClient.address,
        city: newClient.city,
        country: newClient.country
      };

      // Add to clients list and select it
      setClients(prev => [transformedClient, ...prev]);
      setFilteredClients(prev => [transformedClient, ...prev]);
      setFormData(prev => ({ ...prev, client_id: transformedClient.id }));
      setClientSearch(transformedClient.name);

      // Reset and close modal
      setQuickClientData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        zip: '',
        country: '',
        company: '',
        notes: ''
      });
      setShowQuickClientModal(false);
      setError(null);
      
    } catch (err) {
      setError('Failed to create client. Please try again.');
      console.error('Error creating client:', err);
    } finally {
      setCreatingClient(false);
    }
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);

      // Calculate totals
      const subtotal = formData.items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
      const taxAmount = formData.items.reduce((sum, item) => {
        const itemTax = (item.quantity * item.unit_price) * (item.tax_rate / 100);
        return sum + itemTax;
      }, 0);
      
      // Calculate discount amount based on type
      let discountAmount = 0;
      if (formData.discount_type === 'percentage') {
        discountAmount = subtotal * (formData.discount_value / 100);
      } else {
        discountAmount = formData.discount_value;
      }
      
      const total = subtotal + taxAmount - discountAmount;

      // Prepare payload for our invoices API
      const payload = {
        clientId: formData.client_id || null,
        issueDate: formData.issue_date,
        dueDate: formData.due_date,
        subtotal: subtotal.toString(),
        taxAmount: taxAmount.toString(),
        discountType: formData.discount_type,
        discountValue: formData.discount_value.toString(),
        discountAmount: discountAmount.toString(),
        total: total.toString(),
        status: markAsPaid ? 'paid' : (editingInvoice?.status || 'draft'),
        documentType,
        notes: formData.notes,
        footerText: formData.footer_text,
        items: formData.items.map(item => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unit_price,
          taxRate: item.tax_rate || 0
        }))
      };

      // Check if we're editing or creating
      const isEditing = !!editingInvoice?.id;
      
      // Use the simple update endpoint for edits to avoid routing issues
      let url: string;
      let method: string;
      let bodyPayload: any;
      
      if (isEditing) {
        url = '/api/invoice-edit';
        method = 'POST';
        bodyPayload = { ...payload, invoiceId: editingInvoice.id };
      } else {
        url = '/api/crm/invoices';
        method = 'POST';
        bodyPayload = payload;
      }

      console.log('📝 Submitting invoice:', { isEditing, url, method, bodyPayload });

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload)
      });
      console.log('📨 Response status:', response.status, response.ok);
      const result = await response.json();
      console.log('📦 Response data:', result);
      if (!response.ok || (!result?.ok && !result?.success)) {
        throw new Error(result?.error || `Failed to ${isEditing ? 'update' : 'create'} invoice`);
      }
      setCreatedInvoice(result);

      // Mark as paid immediately via status update if selected
      const invoiceId = isEditing ? editingInvoice.id : result?.invoice_id;
      if (markAsPaid && invoiceId) {
        await fetch('/api/invoices/update-status', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ invoice_id: invoiceId, status: 'paid' })
        }).catch(()=>{});
      }

      onSuccess();
      onClose();
    } catch (err) {
      // console.error removed
      setError(`Failed to ${editingInvoice?.id ? 'update' : 'create'} invoice. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  // PDF Download Function
  const downloadPDF = async () => {
    try {
      const publicId = createdInvoice?.public_id;
      if (!publicId) throw new Error('No invoice link');
      window.open(`/inv/${publicId}`, '_blank');
    } catch (e) {
      setError('PDF download failed. Please try again.');
    }
  };

  // Email Send Function
  const sendEmail = async () => {
    if (!createdInvoice?.invoice_id) return;
    try {
      setLoading(true);
      const to = clients.find(c => c.id === formData.client_id)?.email || '';
      const r = await fetch('/api/invoices/send-email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ invoice_id: createdInvoice.invoice_id, to }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || 'send failed');
      setShowEmailModal(false);
      alert('Invoice email sent.');
    } catch (e) {
      setError('Failed to send email. Please try again.');
    } finally { setLoading(false); }
  };

  // Generate Shareable Link Function
  const generateShareableLink = () => {
    const pid = createdInvoice?.public_id;
    if (!pid) return '';
    const baseUrl = window.location.origin;
    return `${baseUrl}/inv/${pid}`;
  };

  // Copy Link to Clipboard Function
  const copyLinkToClipboard = async () => {
    if (!createdInvoice) return;
    
    const shareableLink = generateShareableLink();
    
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

  // Share via WhatsApp Function
  const shareViaWhatsApp = () => {
    if (!createdInvoice) return;
    
    const client = clients.find(c => c.id === formData.client_id);
    const shareableLink = generateShareableLink();
    const message = encodeURIComponent(
      `Hi ${client?.name || 'there'}! Here's your invoice: ${shareableLink}`
    );
    
    // Open WhatsApp with pre-filled message
    const whatsappUrl = `https://wa.me/?text=${message}`;
    window.open(whatsappUrl, '_blank');
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1: {
        return (
          <div className="space-y-6">
            {/* Document Type Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('doc.type')}
              </label>
              <div className="grid grid-cols-3 gap-3">
                {(['invoice', 'quote', 'estimate'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setDocumentType(type)}
                    className={`p-3 rounded-lg border-2 text-center font-medium transition-all ${
                      documentType === type
                        ? 'border-purple-600 bg-purple-50 text-purple-700'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    {t(`doc.type.${type}`)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Client * {clients.length > 0 && <span className="text-sm text-gray-500">({clients.length} clients available)</span>}
              </label>
              <div className="relative" ref={dropdownRef}>
                <input
                  type="text"
                  value={clientSearch}
                  onChange={(e) => filterClients(e.target.value)}
                  onFocus={() => setShowClientDropdown(true)}
                  placeholder={loading ? 'Loading clients...' : 'Search clients by name, email, or location...'}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  required={!formData.client_id}
                  disabled={loading}
                />
                {showClientDropdown && filteredClients.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {filteredClients.map(client => (
                      <button
                        key={client.id}
                        type="button"
                        onClick={() => selectClient(client)}
                        className="w-full px-3 py-2 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none border-b border-gray-100 last:border-b-0"
                      >
                        <div className="font-medium text-gray-900">{client.name}</div>
                        <div className="text-sm text-gray-500">{client.email}</div>
                        {client.city && (
                          <div className="text-xs text-gray-400">{client.city}{client.country && `, ${client.country}`}</div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
                {showClientDropdown && clientSearch && filteredClients.length === 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-3">
                    <div className="text-gray-500 text-center">No clients found matching "{clientSearch}"</div>
                  </div>
                )}
              </div>              {clients.length === 0 && !loading && (
                <p className="mt-2 text-sm text-amber-600">
                  <AlertCircle className="inline w-4 h-4 mr-1" />
                  No clients found. Using sample clients for demo.
                </p>
              )}
              <div className="mt-2">
                <button
                  type="button"
                  onClick={() => setShowQuickClientModal(true)}
                  className="text-sm text-purple-600 hover:text-purple-800 flex items-center"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add New Client
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Issue Date *
                </label>
                <input
                  type="date"
                  value={formData.issue_date}
                  onChange={(e) => {
                    const newIssueDate = e.target.value;
                    setFormData(prev => {
                      // Recalculate payment terms based on new issue date and existing due date
                      const issueMs = new Date(newIssueDate).getTime();
                      const dueMs = new Date(prev.due_date).getTime();
                      const diffDays = Math.round((dueMs - issueMs) / (1000 * 60 * 60 * 24));
                      let payment_terms = prev.payment_terms;
                      if (diffDays <= 0) {
                        payment_terms = 'Due on receipt';
                      } else if (diffDays <= 15) {
                        payment_terms = 'Net 15';
                      } else if (diffDays <= 30) {
                        payment_terms = 'Net 30';
                      } else {
                        payment_terms = 'Net 60';
                      }
                      return { ...prev, issue_date: newIssueDate, payment_terms };
                    });
                  }}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Due Date *
                </label>
                <input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => {
                    const newDueDate = e.target.value;
                    setFormData(prev => {
                      // Auto-calculate payment terms from issue date and due date
                      const issueMs = new Date(prev.issue_date).getTime();
                      const dueMs = new Date(newDueDate).getTime();
                      const diffDays = Math.round((dueMs - issueMs) / (1000 * 60 * 60 * 24));
                      let payment_terms = prev.payment_terms;
                      if (diffDays <= 0) {
                        payment_terms = 'Due on receipt';
                      } else if (diffDays <= 15) {
                        payment_terms = 'Net 15';
                      } else if (diffDays <= 30) {
                        payment_terms = 'Net 30';
                      } else {
                        payment_terms = 'Net 60';
                      }
                      return { ...prev, due_date: newDueDate, payment_terms };
                    });
                  }}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Currency
                </label>
                <select
                  value={formData.currency}
                  onChange={(e) => setFormData(prev => ({ ...prev, currency: e.target.value }))}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="EUR">EUR (€)</option>
                  <option value="USD">USD ($)</option>
                  <option value="GBP">GBP (£)</option>
                </select>              </div>
            </div>
          </div>
        );
      }

      case 2: {
        return (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">Invoice Items</h3>
              <div className="flex space-x-2">
                <button
                  onClick={() => setShowPriceList(true)}
                  className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg flex items-center text-sm"
                >
                  <ShoppingCart size={16} className="mr-1" />
                  Price List
                </button>
                <button
                  onClick={addItem}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-lg flex items-center text-sm"
                >
                  <Plus size={16} className="mr-1" />
                  Add Item
                </button>              </div>
            </div>

            <div className="space-y-3">
              {formData.items.map((item) => (
                <div key={item.id} className="bg-gray-50 p-4 rounded-lg">
                  <div className="grid grid-cols-12 gap-3 items-start">
                    <div className="col-span-5">
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Description *
                      </label>
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => updateItem(item.id, { description: e.target.value })}
                        placeholder="Item description..."
                        className="w-full p-2 border border-gray-300 rounded focus:ring-1 focus:ring-purple-500"
                        required
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Quantity *
                      </label>
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateItem(item.id, { quantity: parseFloat(e.target.value) || 0 })}
                        min="0"
                        step="0.01"
                        className="w-full p-2 border border-gray-300 rounded focus:ring-1 focus:ring-purple-500"
                        required
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Unit Price
                      </label>
                      <input
                        type="number"
                        value={item.unit_price}
                        onChange={(e) => updateItem(item.id, { unit_price: parseFloat(e.target.value) || 0 })}
                        min="0"
                        step="0.01"
                        className="w-full p-2 border border-gray-300 rounded focus:ring-1 focus:ring-purple-500"
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Tax %
                      </label>
                      <input
                        type="number"
                        value={item.tax_rate}
                        onChange={(e) => updateItem(item.id, { tax_rate: parseFloat(e.target.value) || 0 })}
                        min="0"
                        max="100"
                        step="0.01"
                        className="w-full p-2 border border-gray-300 rounded focus:ring-1 focus:ring-purple-500"
                      />
                    </div>

                    <div className="col-span-1 flex items-end">
                      <button
                        onClick={() => removeItem(item.id)}
                        disabled={formData.items.length === 1}
                        className="p-2 text-red-600 hover:text-red-800 disabled:text-gray-400 disabled:cursor-not-allowed"
                        title="Remove item"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="mt-2 text-right text-sm text-gray-600">
                    Total: {formData.currency} {(calculateItemTotal(item) || 0).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t pt-4">
              <div className="flex justify-end">
                <div className="text-right space-y-1">
                  <div className="text-sm text-gray-600">
                    Subtotal: {formData.currency} {(calculateTotals().subtotal || 0).toFixed(2)}
                  </div>
                  <div className="text-sm text-gray-600">
                    Tax: {formData.currency} {(calculateTotals().totalTax || 0).toFixed(2)}
                  </div>
                  <div className="text-lg font-semibold text-gray-900">
                    Total: {formData.currency} {(calculateTotals().total || 0).toFixed(2)}                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      }

      case 3: {
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Payment Terms *
                  </label>
                  <button
                    type="button"
                    onClick={() => { savePaymentTerms(formData.payment_terms); setTermsSaved(true); setTimeout(() => setTermsSaved(false), 2000); }}
                    className={`text-xs px-2 py-1 rounded transition-colors ${
                      termsSaved ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600 hover:bg-purple-100 hover:text-purple-700'
                    }`}
                  >
                    {termsSaved ? '✓ Saved' : '💾 Save as default'}
                  </button>
                </div>
                <select
                  value={formData.payment_terms}
                  onChange={(e) => {
                    const newTerms = e.target.value;
                    setFormData(prev => {
                      // Auto-calculate due date from payment terms and issue date
                      const issueDate = new Date(prev.issue_date);
                      let due_date = prev.due_date;
                      if (newTerms === 'Due on receipt') {
                        due_date = prev.issue_date;
                      } else if (newTerms === 'Net 15') {
                        const d = new Date(issueDate);
                        d.setDate(d.getDate() + 15);
                        due_date = d.toISOString().split('T')[0];
                      } else if (newTerms === 'Net 30') {
                        const d = new Date(issueDate);
                        d.setDate(d.getDate() + 30);
                        due_date = d.toISOString().split('T')[0];
                      } else if (newTerms === 'Net 60') {
                        const d = new Date(issueDate);
                        d.setDate(d.getDate() + 60);
                        due_date = d.toISOString().split('T')[0];
                      }
                      return { ...prev, payment_terms: newTerms, due_date };
                    });
                  }}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  required
                >
                  <option value="Net 15">Net 15 (15 days)</option>
                  <option value="Net 30">Net 30 (30 days)</option>
                  <option value="Net 60">Net 60 (60 days)</option>
                  <option value="Due on receipt">Due on receipt</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Discount
                </label>
                <div className="flex gap-2">
                  <select
                    value={formData.discount_type}
                    onChange={(e) => setFormData(prev => ({ ...prev, discount_type: e.target.value as 'fixed' | 'percentage' }))}
                    className="w-32 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  >
                    <option value="fixed">Fixed €</option>
                    <option value="percentage">Percent %</option>
                  </select>
                  <div className="relative flex-1">
                    <input
                      type="number"
                      value={formData.discount_value}
                      onChange={(e) => setFormData(prev => ({ ...prev, discount_value: parseFloat(e.target.value) || 0 }))}
                      min="0"
                      step="0.01"
                      max={formData.discount_type === 'percentage' ? 100 : undefined}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 pr-10"
                      placeholder={formData.discount_type === 'percentage' ? '0' : '0.00'}
                    />
                    <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                      {formData.discount_type === 'percentage' ? '%' : '€'}
                    </span>
                  </div>
                </div>
                {formData.discount_type === 'percentage' && formData.discount_value > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    = {formData.currency} {(formData.items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0) * formData.discount_value / 100).toFixed(2)} discount
                  </p>
                )}
              </div>
            </div>

            {/* Immediate Payment Section */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center mb-4">
                <input
                  type="checkbox"
                  id="markAsPaid"
                  checked={markAsPaid}
                  onChange={(e) => setMarkAsPaid(e.target.checked)}
                  className="h-4 w-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                />
                <label htmlFor="markAsPaid" className="ml-2 text-sm font-medium text-green-800">
                  💰 Client paid immediately - Mark invoice as PAID
                </label>
              </div>

              {markAsPaid && (
                <div className="space-y-4 border-t border-green-200 pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-green-700 mb-2">
                        Payment Method *
                      </label>
                      <select
                        value={paymentData.payment_method}
                        onChange={(e) => setPaymentData(prev => ({ ...prev, payment_method: e.target.value }))}
                        className="w-full p-3 border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        required
                      >
                        <option value="cash">Cash</option>
                        <option value="card">Credit/Debit Card</option>
                        <option value="bank_transfer">Bank Transfer</option>
                        <option value="paypal">PayPal</option>
                        <option value="stripe">Stripe</option>
                        <option value="other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-green-700 mb-2">
                        Payment Reference (Optional)
                      </label>
                      <input
                        type="text"
                        value={paymentData.payment_reference}
                        onChange={(e) => setPaymentData(prev => ({ ...prev, payment_reference: e.target.value }))}
                        className="w-full p-3 border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        placeholder="Transaction ID, Check #, etc."
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-green-700 mb-2">
                      Payment Notes (Optional)
                    </label>
                    <textarea
                      value={paymentData.payment_notes}
                      onChange={(e) => setPaymentData(prev => ({ ...prev, payment_notes: e.target.value }))}
                      rows={2}
                      className="w-full p-3 border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="Additional payment details..."
                    />
                  </div>

                  <div className="bg-green-100 p-3 rounded-md">
                    <p className="text-sm text-green-800">
                      ✅ This invoice will be marked as <strong>PAID</strong> and will appear as a completed sale in your dashboard and reports.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Notes (Optional)
                </label>
                <button
                  type="button"
                  onClick={() => { saveNotes(formData.notes || ''); setNotesSaved(true); setTimeout(() => setNotesSaved(false), 2000); }}
                  className={`text-xs px-2 py-1 rounded transition-colors ${
                    notesSaved ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600 hover:bg-purple-100 hover:text-purple-700'
                  }`}
                >
                  {notesSaved ? '✓ Saved' : '💾 Save as default'}
                </button>
              </div>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                placeholder="Additional notes for this invoice..."
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Invoice Footer (Terms, Bank Details, etc.)
                </label>
                <button
                  type="button"
                  onClick={() => { saveFooterText(formData.footer_text || ''); setFooterSaved(true); setTimeout(() => setFooterSaved(false), 2000); }}
                  className={`text-xs px-2 py-1 rounded transition-colors ${
                    footerSaved ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600 hover:bg-purple-100 hover:text-purple-700'
                  }`}
                >
                  {footerSaved ? '✓ Saved' : '💾 Save as default'}
                </button>
              </div>
              <textarea
                value={formData.footer_text}
                onChange={(e) => setFormData(prev => ({ ...prev, footer_text: e.target.value }))}
                rows={4}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                placeholder="Add terms & conditions, payment instructions, bank details, delivery terms, etc. This text will appear at the bottom of the invoice."
              />
              <p className="text-xs text-gray-500 mt-1">
                Example: Bank: Erste Bank | IBAN: AT12 3456 7890 1234 5678 | BIC: GIBAATWWXXX
              </p>
            </div>          </div>
        );
      }

      case 4: {
        const totals = calculateTotals();
        const selectedClient = clients.find(c => c.id === formData.client_id);
        
        return (
          <div className="space-y-6">
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{t(`doc.summary.${documentType}`)}</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Client Details</h4>
                  <p className="text-gray-600">{selectedClient?.name}</p>
                  <p className="text-gray-600">{selectedClient?.email}</p>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-2">{t(`doc.details.${documentType}`)}</h4>
                  <p className="text-gray-600">Issue Date: {new Date(formData.issue_date).toLocaleDateString()}</p>
                  <p className="text-gray-600">Due Date: {new Date(formData.due_date).toLocaleDateString()}</p>
                  <p className="text-gray-600">Payment Terms: {formData.payment_terms}</p>
                  <p className="text-gray-600">Currency: {formData.currency}</p>
                </div>
              </div>

              <div className="mt-6">
                <h4 className="font-medium text-gray-900 mb-2">Line Items</h4>                <div className="space-y-2">
                  {formData.items.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span>{item.description} (x{item.quantity})</span>
                      <span>{formData.currency} {(calculateItemTotal(item) || 0).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 pt-4 border-t">
                <div className="space-y-1 text-right">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal:</span>
                    <span>{formData.currency} {(totals.subtotal || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tax:</span>
                    <span>{formData.currency} {(totals.totalTax || 0).toFixed(2)}</span>
                  </div>
                  {totals.discount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount {formData.discount_type === 'percentage' ? `(${formData.discount_value}%)` : ''}:</span>
                      <span>-{formData.currency} {(totals.discount || 0).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-semibold border-t pt-2">
                    <span>Total:</span>
                    <span>{formData.currency} {(totals.total || 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Status Preview */}
            {markAsPaid && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-medium text-green-800 mb-3">💰 Payment Details Preview</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-green-700">Status:</span>
                    <span className="font-semibold text-green-800">PAID</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-green-700">Amount:</span>
                    <span className="font-semibold text-green-800">{formData.currency} {(totals.total || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-green-700">Payment Method:</span>
                    <span className="text-green-800 capitalize">{paymentData.payment_method.replace('_', ' ')}</span>
                  </div>
                  {paymentData.payment_reference && (
                    <div className="flex justify-between">
                      <span className="text-green-700">Reference:</span>
                      <span className="text-green-800">{paymentData.payment_reference}</span>
                    </div>
                  )}
                  <div className="mt-3 p-2 bg-green-100 rounded text-xs text-green-800">
                    ✅ This sale will appear immediately in your dashboard revenue and reports
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start">
                <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 mr-2" />
                <span>{error}</span>
              </div>
            )}          </div>
        );
      }

      default:
        return null;
    }
  };

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 flex items-center justify-center z-50 p-4 transition-colors duration-300 ${
      privacyMask
        ? 'bg-gray-900 backdrop-blur-xl'
        : 'bg-black bg-opacity-50'
    }`}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {editingInvoice ? t(`doc.edit.${documentType}`) : t(`doc.create.${documentType}`)}
            </h2>
            <p className="text-gray-600">Step {currentStep} of {steps.length}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPrivacyMask(m => !m)}
              className={`p-2 rounded-lg transition-colors ${
                privacyMask
                  ? 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                  : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
              }`}
              title={privacyMask ? 'Show background' : 'Hide background (privacy mode)'}
            >
              {privacyMask ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 p-2"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Step Progress */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className={`
                  flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium
                  ${currentStep >= step.id 
                    ? 'bg-purple-600 text-white' 
                    : 'bg-gray-200 text-gray-600'
                  }
                `}>
                  {currentStep > step.id ? (
                    <Check size={16} />
                  ) : (
                    <step.icon size={16} />
                  )}
                </div>
                <span className={`ml-2 text-sm font-medium ${
                  currentStep >= step.id ? 'text-purple-600' : 'text-gray-500'
                }`}>
                  {step.title}
                </span>
                {index < steps.length - 1 && (
                  <div className={`w-12 h-px mx-4 ${
                    currentStep > step.id ? 'bg-purple-600' : 'bg-gray-300'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {renderStepContent()}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200">
          <button
            onClick={handlePrevious}
            disabled={currentStep === 1}
            className="flex items-center px-4 py-2 text-gray-600 hover:text-gray-800 disabled:text-gray-400 disabled:cursor-not-allowed"
          >
            <ChevronLeft size={16} className="mr-1" />
            Previous
          </button>

          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>

            {currentStep < 4 ? (
              <button
                onClick={handleNext}
                disabled={!validateStep(currentStep)}
                className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                Next
                <ChevronRight size={16} className="ml-1" />
              </button>
            ) : (
              <div className="flex space-x-2">
                {createdInvoice ? (
                  <>
                    <button
                      onClick={downloadPDF}
                      className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      <Download size={16} className="mr-2" />
                      Download PDF
                    </button>
                    <button
                      onClick={() => {
                        const client = clients.find(c => c.id === formData.client_id);
                        setEmailData({
                          subject: `Rechnung ${createdInvoice.invoice_no || createdInvoice.invoiceNumber || createdInvoice.public_id} - ${SITE.name}`,
                          message: `Liebe/r ${client?.name},\n\nanbei senden wir Ihnen Ihre Rechnung zu.\n\nMit freundlichen Grüßen,\n${SITE.name} Team`,
                          includeAttachment: true
                        });
                        setShowEmailModal(true);
                      }}
                      className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      <Send size={16} className="mr-2" />
                      Send Email
                    </button>
                    <button
                      onClick={copyLinkToClipboard}
                      className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                    >
                      <Link size={16} className="mr-2" />
                      Copy Link
                    </button>
                    <button
                      onClick={shareViaWhatsApp}
                      className="flex items-center px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                    >
                      <Share size={16} className="mr-2" />
                      WhatsApp
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="flex items-center px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                        {editingInvoice?.id ? 'Updating...' : 'Creating...'}
                      </>
                    ) : (
                      <>
                        <Check size={16} className="mr-2" />
                        {editingInvoice?.id ? t(`doc.edit.${documentType}`) : t(`doc.create.${documentType}`)}
                      </>
                    )}
                  </button>
                )}
              </div>
            )}          </div>
        </div>
      </motion.div>

      {/* Price List Modal */}
      <AnimatePresence>
        {showPriceList && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]"
            onClick={() => setShowPriceList(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-medium text-gray-900">Select from Price List</h3>
                <button
                  onClick={() => setShowPriceList(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Category Filter */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Filter by Category
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="">All Categories</option>
                  <option value="DIGITAL">Digital Photos</option>
                  <option value="PRINTS">Print Products</option>
                  <option value="SESSIONS">Photo Sessions</option>
                </select>
              </div>

              {/* Complete Price List from API */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {priceList.length > 0 ? (
                  priceList.map((item) => {
                    // Truncate long descriptions for display
                    const displayDesc = item.description && item.description.length > 80 
                      ? item.description.substring(0, 80) + '...' 
                      : (item.description || 'Professional photography service');
                    return (
                    <div key={item.id} className="border border-gray-200 rounded-lg p-4 hover:border-purple-300 transition-colors">
                      <h4 className="font-medium text-gray-900">{item.name}</h4>
                      <p className="text-sm text-gray-600 mb-2 line-clamp-2">{displayDesc}</p>
                      <div className="flex items-center justify-between mb-3">
                        <p className="font-semibold text-purple-600">€{(item.price || 0).toFixed(2)}</p>
                        <span className="text-xs bg-gray-100 px-2 py-1 rounded">{item.category}</span>
                      </div>
                      <button
                        onClick={() => {
                          setPendingPriceItem(item);
                          // Use a clean description for invoice - just name and short description
                          const shortDesc = item.description && item.description.length > 60 
                            ? item.description.substring(0, 60) 
                            : (item.description || '');
                          setEditableDescription(item.name + (shortDesc ? ` - ${shortDesc}` : ''));
                          setShowEditDescriptionModal(true);
                        }}
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded text-sm"
                      >
                        Add to Invoice
                      </button>
                    </div>
                  );})
                ) : (
                  <div className="col-span-full text-center py-8 text-gray-500">
                    Loading price list...
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Description Modal - rendered via portal to escape stacking context */}
      {showEditDescriptionModal && pendingPriceItem && createPortal(
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4"
          style={{ zIndex: 9999 }}
          onClick={() => setShowEditDescriptionModal(false)}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-lg"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Edit Invoice Description</h3>
                <button
                  onClick={() => setShowEditDescriptionModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Item: {pendingPriceItem.name}
                  </label>
                  <p className="text-sm text-gray-500 mb-2">Price: €{(pendingPriceItem.price || 0).toFixed(2)}</p>
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
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
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
                    const newItem: InvoiceItem = {
                      id: Date.now().toString(),
                      description: editableDescription,
                      quantity: 1,
                      unit_price: pendingPriceItem.price || 0,
                      tax_rate: pendingPriceItem.tax_rate || 0
                    };
                    setFormData(prev => ({...prev, items: [...prev.items, newItem]}));
                    setShowEditDescriptionModal(false);
                    setShowPriceList(false);
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
      <AnimatePresence>
        {showEmailModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-xl shadow-2xl w-full max-w-md"
            >
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Mail className="mr-2" size={20} />
                  Send Invoice by Email
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Subject
                    </label>
                    <input
                      type="text"
                      value={emailData.subject}
                      onChange={(e) => setEmailData(prev => ({ ...prev, subject: e.target.value }))}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Message
                    </label>
                    <textarea
                      value={emailData.message}
                      onChange={(e) => setEmailData(prev => ({ ...prev, message: e.target.value }))}
                      rows={4}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="includeAttachment"
                      checked={emailData.includeAttachment}
                      onChange={(e) => setEmailData(prev => ({ ...prev, includeAttachment: e.target.checked }))}
                      className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                    />
                    <label htmlFor="includeAttachment" className="ml-2 text-sm text-gray-700">
                      Include PDF attachment
                    </label>
                  </div>
                </div>
                
                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    onClick={() => setShowEmailModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={sendEmail}
                    disabled={loading}
                    className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send size={16} className="mr-2" />
                        Send Email
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick Client Creation Modal */}
      <AnimatePresence>
        {showQuickClientModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70]"
            onClick={() => !creatingClient && setShowQuickClientModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold text-gray-900">Add New Client</h3>
                <button
                  onClick={() => !creatingClient && setShowQuickClientModal(false)}
                  disabled={creatingClient}
                  className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
                >
                  <X size={20} />
                </button>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-start">
                  <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
                  <span className="text-sm">{error}</span>
                </div>
              )}

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      First Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={quickClientData.firstName}
                      onChange={(e) => setQuickClientData(prev => ({ ...prev, firstName: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      placeholder="John"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Last Name
                    </label>
                    <input
                      type="text"
                      value={quickClientData.lastName}
                      onChange={(e) => setQuickClientData(prev => ({ ...prev, lastName: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      placeholder="Doe"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={quickClientData.email}
                    onChange={(e) => setQuickClientData(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="john.doe@example.com"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={quickClientData.phone}
                    onChange={(e) => setQuickClientData(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="+43 660 123 4567"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Company
                  </label>
                  <input
                    type="text"
                    value={quickClientData.company}
                    onChange={(e) => setQuickClientData(prev => ({ ...prev, company: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="Company Name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Address
                  </label>
                  <input
                    type="text"
                    value={quickClientData.address}
                    onChange={(e) => setQuickClientData(prev => ({ ...prev, address: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="Street Address"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      City
                    </label>
                    <input
                      type="text"
                      value={quickClientData.city}
                      onChange={(e) => setQuickClientData(prev => ({ ...prev, city: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      placeholder="Vienna"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      ZIP Code
                    </label>
                    <input
                      type="text"
                      value={quickClientData.zip}
                      onChange={(e) => setQuickClientData(prev => ({ ...prev, zip: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      placeholder="1010"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Country
                  </label>
                  <input
                    type="text"
                    value={quickClientData.country}
                    onChange={(e) => setQuickClientData(prev => ({ ...prev, country: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="Austria"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes
                  </label>
                  <textarea
                    value={quickClientData.notes}
                    onChange={(e) => setQuickClientData(prev => ({ ...prev, notes: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="Additional notes about the client..."
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6 pt-6 border-t border-gray-200">
                <button
                  onClick={() => !creatingClient && setShowQuickClientModal(false)}
                  disabled={creatingClient}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleQuickClientCreate}
                  disabled={creatingClient || !quickClientData.firstName || !quickClientData.email}
                  className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {creatingClient ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Check size={16} className="mr-2" />
                      Create Client
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdvancedInvoiceForm;
