import React, { useState, useEffect, useRef } from 'react';
import AdminLayout from '../../../components/admin/AdminLayout';
import { useLanguage } from '../../../context/LanguageContext';
import {
  DollarSign,
  Upload,
  Download,
  Plus,
  Edit,
  Trash2,
  Search,
  FileText,
  CheckCircle,
  AlertCircle,
  X,
  Eye,
  Image as ImageIcon,
  File
} from 'lucide-react';
import { Tag, RefreshCcw, ShieldCheck, Clock } from 'lucide-react';
import { priceListService, PriceListItem } from '../../../lib/invoicing';

const PriceListSettingsPage: React.FC = () => {
  const { t } = useLanguage();
  const [priceList, setPriceList] = useState<PriceListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [showImportModal, setShowImportModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<PriceListItem | null>(null);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importStatus, setImportStatus] = useState<string>('');
  const [importResults, setImportResults] = useState<any>(null);

  // Coupons diagnostics state (admin only)
  const [adminToken, setAdminToken] = useState<string>(() => localStorage.getItem('ADMIN_TOKEN') || '');
  const [showToken, setShowToken] = useState<boolean>(false);
  const [couponStatus, setCouponStatus] = useState<any>(null);
  const [couponLoading, setCouponLoading] = useState<boolean>(false);
  const [couponError, setCouponError] = useState<string>('');

  // Form state for adding/editing items
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    price: '',
    currency: 'EUR',
    taxRate: '20.00',
    unit: 'piece',
    notes: '',
    isActive: true
  });

  // Price guide document state
  const [priceGuideUrl, setPriceGuideUrl] = useState<string | null>(null);
  const [priceGuideFilename, setPriceGuideFilename] = useState<string | null>(null);
  const [priceGuideMimetype, setPriceGuideMimetype] = useState<string | null>(null);
  const [uploadingGuide, setUploadingGuide] = useState(false);
  const [showPriceGuidePreview, setShowPriceGuidePreview] = useState(false);
  const priceGuideInputRef = useRef<HTMLInputElement>(null);

  const categories = [
    'ALL',
    'PRINTS',
    'LEINWAND',
    'LUXUSRAHMEN',
    'DIGITAL',
    'EXTRAS'
  ];

  useEffect(() => {
    fetchPriceList();
    fetchPriceGuideInfo();
  }, []);

  const saveAdminToken = (val: string) => {
    setAdminToken(val);
    if (val) localStorage.setItem('ADMIN_TOKEN', val); else localStorage.removeItem('ADMIN_TOKEN');
  };

  const fetchCouponStatus = async () => {
    try {
      setCouponLoading(true);
      setCouponError('');
      const res = await fetch('/__admin/coupons/status', {
        headers: { 'x-admin-token': adminToken || '' }
      });
      if (res.status === 401) {
        setCouponError('Unauthorized: please enter a valid admin token.');
        setCouponStatus(null);
        return;
      }
      const data = await res.json();
      if (!data?.success) {
        setCouponError('Failed to load coupon status');
        setCouponStatus(null);
        return;
      }
      setCouponStatus(data);
    } catch (e: any) {
      setCouponError(e?.message || 'Error fetching coupon status');
      setCouponStatus(null);
    } finally {
      setCouponLoading(false);
    }
  };

  const refreshCouponsCache = async () => {
    try {
      setCouponLoading(true);
      setCouponError('');
      const res = await fetch('/__admin/refresh-coupons', {
        method: 'POST',
        headers: { 'x-admin-token': adminToken || '' }
      });
      if (res.status === 401) {
        setCouponError('Unauthorized: please enter a valid admin token.');
        return;
      }
      // Reload status after refresh
      await fetchCouponStatus();
    } catch (e: any) {
      setCouponError(e?.message || 'Error refreshing coupons');
    } finally {
      setCouponLoading(false);
    }
  };

  const fetchPriceList = async () => {
    try {
      setLoading(true);
      const items = await priceListService.getPriceListItems();
      setPriceList(items);
    } catch (error) {
      console.error('Failed to fetch price list:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPriceGuideInfo = async () => {
    try {
      const response = await fetch('/api/crm/price-guide/info');
      if (response.ok) {
        const data = await response.json();
        if (data.url) {
          setPriceGuideUrl(data.url);
          setPriceGuideFilename(data.filename);
          setPriceGuideMimetype(data.mimetype);
        }
      }
    } catch (error) {
      console.error('Failed to fetch price guide info:', error);
    }
  };

  const handlePriceGuideUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingGuide(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const uploadResponse = await fetch('/api/crm/price-guide/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) throw new Error('Upload failed');
      const uploadResult = await uploadResponse.json();

      // Save metadata
      await fetch('/api/crm/price-guide/save-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: uploadResult.url,
          filename: uploadResult.filename,
          mimetype: uploadResult.mimetype,
        }),
      });

      setPriceGuideUrl(uploadResult.url);
      setPriceGuideFilename(uploadResult.filename);
      setPriceGuideMimetype(uploadResult.mimetype);
      alert('Price guide uploaded successfully!');
    } catch (error) {
      console.error('Failed to upload price guide:', error);
      alert('Failed to upload price guide. Please try again.');
    } finally {
      setUploadingGuide(false);
      if (priceGuideInputRef.current) priceGuideInputRef.current.value = '';
    }
  };

  const filteredItems = priceList.filter(item => {
    const matchesSearch = item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.category?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'ALL' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleImportCSV = async () => {
    if (!importFile) return;

    try {
      setImportStatus('Processing CSV file...');
      
      const text = await importFile.text();
      const lines = text.split('\\n').filter(line => line.trim());
      const headers = lines[0].split(',').map(h => h.trim());
      
      const items = [];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        if (values.length < 2) continue;
        
        const item = {
          name: values[0] || '',
          description: values[1] || '',
          category: values[2] || 'GENERAL',
          price: parseFloat(values[3]?.replace(/[^0-9.,]/g, '').replace(',', '.')) || 0,
          currency: values[4] || 'EUR',
          taxRate: parseFloat(values[5]) || 19.00,
          unit: values[6] || 'piece',
          notes: values[7] || '',
          isActive: true
        };
        
        if (item.name && item.price > 0) {
          items.push(item);
        }
      }
      
      if (items.length === 0) {
        setImportStatus('No valid items found in CSV');
        return;
      }
      
      setImportStatus(`Importing ${items.length} items...`);
      const result = await priceListService.importPriceList(items);
      
      setImportResults(result);
      setImportStatus(`Successfully imported ${result.length} items!`);
      
      // Refresh the price list
      await fetchPriceList();
      
      // Close modal after a delay
      setTimeout(() => {
        setShowImportModal(false);
        setImportFile(null);
        setImportStatus('');
        setImportResults(null);
      }, 3000);
      
    } catch (error) {
      console.error('Import failed:', error);
      setImportStatus(`Import failed: ${error.message}`);
    }
  };

  const handleAddItem = async () => {
    try {
      const payload = {
        name: formData.name,
        description: formData.description,
        category: formData.category,
        price: parseFloat(formData.price || '0'),
        currency: formData.currency,
        tax_rate: parseFloat(formData.taxRate || '0'),
        unit: formData.unit,
        notes: formData.notes,
        is_active: !!formData.isActive,
      } as any;
      await priceListService.createPriceListItem(payload);
      setShowAddModal(false);
      resetForm();
      fetchPriceList();
    } catch (error) {
      console.error('Failed to add item:', error);
    }
  };

  const handleEditItem = async () => {
    if (!editingItem) return;
    
    try {
      const updates = {
        name: formData.name,
        description: formData.description,
        category: formData.category,
        price: parseFloat(formData.price || '0'),
        currency: formData.currency,
        tax_rate: parseFloat(formData.taxRate || '0'),
        unit: formData.unit,
        notes: formData.notes,
        is_active: !!formData.isActive,
      } as any;
      await priceListService.updatePriceListItem(editingItem.id, updates);
      setEditingItem(null);
      resetForm();
      fetchPriceList();
    } catch (error) {
      console.error('Failed to update item:', error);
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;
    
    try {
      await priceListService.deletePriceListItem(id);
      fetchPriceList();
    } catch (error) {
      console.error('Failed to delete item:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      category: '',
      price: '',
      currency: 'EUR',
      taxRate: '19.00',
      unit: 'piece',
      notes: '',
      isActive: true
    });
  };

  const openEditModal = (item: PriceListItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name || '',
      description: (item as any).description || '',
      category: item.category || '',
      price: (item.price as any)?.toString?.() || String(item.price ?? ''),
      currency: (item as any).currency || 'EUR',
      taxRate: ((item as any).taxRate ?? (item as any).tax_rate ?? 19).toString(),
      unit: (item as any).unit || 'piece',
      notes: (item as any).notes || '',
      isActive: (item as any).isActive !== false && (item as any).is_active !== false
    });
  };

  const exportToCSV = () => {
    const csvContent = [
      ['Name', 'Description', 'Category', 'Price', 'Currency', 'Tax Rate', 'Unit', 'Notes'].join(','),
      ...filteredItems.map(item => [
        item.name,
        (item as any).description,
        item.category,
        String(item.price),
        (item as any).currency,
        (item as any).taxRate ?? (item as any).tax_rate,
        (item as any).unit,
        (item as any).notes
      ].map(field => `"${field || ''}"`).join(','))
    ].join('\\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `price-list-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-emerald-600 mr-3" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Price List Management</h1>
                <p className="text-gray-600">
                  Manage your photography services and product pricing
                </p>
              </div>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={exportToCSV}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </button>
              <button
                onClick={() => setShowImportModal(true)}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Upload className="h-4 w-4 mr-2" />
                Import CSV
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          {/* Price Guide Document Upload */}
          <div className="mb-8">
            <div className="flex items-center mb-3">
              <FileText className="h-5 w-5 text-green-600 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900">Price Guide Document</h2>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Upload your price guide (PDF, JPG, or Word document) as a reference. This will be stored alongside your price list items.
            </p>
            
            <div className="flex items-start gap-4">
              {/* Upload Area */}
              <div className="flex-1">
                <input
                  ref={priceGuideInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
                  onChange={handlePriceGuideUpload}
                  className="hidden"
                />
                <button
                  onClick={() => priceGuideInputRef.current?.click()}
                  disabled={uploadingGuide}
                  className="w-full flex items-center justify-center px-4 py-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-400 focus:outline-none focus:border-green-400 disabled:opacity-50 transition-colors"
                >
                  {uploadingGuide ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-green-600 mr-2"></div>
                      <span className="text-sm text-gray-600">Uploading...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-5 h-5 mr-2 text-gray-400" />
                      <span className="text-sm text-gray-600">
                        {priceGuideUrl ? 'Replace price guide document' : 'Upload price guide (PDF, JPG, Word)'}
                      </span>
                    </>
                  )}
                </button>
              </div>

              {/* Current Document Preview */}
              {priceGuideUrl && (
                <div className="flex-shrink-0 bg-green-50 border border-green-200 rounded-lg p-4 min-w-[250px]">
                  <div className="flex items-center gap-2 mb-2">
                    {priceGuideMimetype?.startsWith('image/') ? (
                      <ImageIcon className="h-5 w-5 text-green-600" />
                    ) : priceGuideMimetype === 'application/pdf' ? (
                      <FileText className="h-5 w-5 text-red-500" />
                    ) : (
                      <File className="h-5 w-5 text-blue-500" />
                    )}
                    <span className="text-sm font-medium text-gray-900 truncate max-w-[180px]">
                      {priceGuideFilename || 'Price Guide'}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <a
                      href={priceGuideUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center px-3 py-1.5 text-xs font-medium text-green-700 bg-green-100 rounded hover:bg-green-200 transition-colors"
                    >
                      <Eye className="h-3 w-3 mr-1" /> View
                    </a>
                    <a
                      href={priceGuideUrl}
                      download={priceGuideFilename}
                      className="flex items-center px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
                    >
                      <Download className="h-3 w-3 mr-1" /> Download
                    </a>
                  </div>
                  {priceGuideMimetype?.startsWith('image/') && (
                    <div className="mt-3">
                      <img 
                        src={priceGuideUrl} 
                        alt="Price Guide Preview" 
                        className="w-full rounded border border-green-200 cursor-pointer hover:opacity-90"
                        onClick={() => setShowPriceGuidePreview(true)}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Coupons Status (Admin) */}
          <div className="mb-8">
            <div className="flex items-center mb-3">
              <Tag className="h-5 w-5 text-purple-600 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900">Coupons Status</h2>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
              <div className="col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Admin Token</label>
                <div className="flex gap-2">
                  <input
                    type={showToken ? 'text' : 'password'}
                    value={adminToken}
                    onChange={(e) => saveAdminToken(e.target.value)}
                    placeholder="Enter admin token"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                  <button
                    onClick={() => setShowToken(s => !s)}
                    className="px-3 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    {showToken ? 'Hide' : 'Show'}
                  </button>
                </div>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={fetchCouponStatus}
                    disabled={!adminToken || couponLoading}
                    className="px-4 py-2 bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200 disabled:opacity-50"
                  >
                    Check Status
                  </button>
                  <button
                    onClick={refreshCouponsCache}
                    disabled={!adminToken || couponLoading}
                    className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
                  >
                    <RefreshCcw className="h-4 w-4 mr-2" /> Refresh Cache
                  </button>
                </div>
                {couponError && (
                  <p className="mt-2 text-sm text-red-600">{couponError}</p>
                )}
              </div>
              <div className="col-span-2">
                <div className="border border-gray-200 rounded-lg p-4">
                  {!couponStatus && !couponLoading && (
                    <p className="text-sm text-gray-500">No status loaded yet.</p>
                  )}
                  {couponLoading && (
                    <p className="text-sm text-gray-500">Loading...</p>
                  )}
                  {couponStatus && (
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <ShieldCheck className="h-3.5 w-3.5 mr-1" /> Active: {couponStatus.count}
                        </span>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          Source: {couponStatus.source}
                        </span>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          <Clock className="h-3.5 w-3.5 mr-1" /> TTL: {Math.ceil((couponStatus?.cache?.millisRemaining || 0)/1000)}s
                        </span>
                      </div>
                      <div className="max-h-40 overflow-auto border border-gray-100 rounded-md">
                        <table className="min-w-full text-sm">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="text-left px-3 py-2 text-gray-600">Code</th>
                              <th className="text-left px-3 py-2 text-gray-600">Type</th>
                              <th className="text-left px-3 py-2 text-gray-600">Value</th>
                              <th className="text-left px-3 py-2 text-gray-600">Allowed SKUs</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(couponStatus.coupons || []).map((c: any) => (
                              <tr key={c.code} className="border-t border-gray-100">
                                <td className="px-3 py-1.5 font-medium text-gray-900">{c.code}</td>
                                <td className="px-3 py-1.5 text-gray-700">{c.type || '-'}</td>
                                <td className="px-3 py-1.5 text-gray-700">{c.percent ?? c.amount ?? '-'}</td>
                                <td className="px-3 py-1.5 text-gray-700 truncate max-w-[260px]">{(c.allowedSkus || ['*']).join(', ')}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search price list items..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </div>
            <div>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                {categories.map(category => (
                  <option key={category} value={category}>
                    {category === 'ALL' ? 'All Categories' : category}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Price List Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Price List Items ({filteredItems.length})
            </h2>
          </div>
          
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading price list...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Item
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Price
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Unit
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredItems.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{item.name}</div>
                          <div className="text-sm text-gray-500">{item.description}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {item.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        €{item.price?.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.unit}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          (item as any).isActive ?? (item as any).is_active
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {(item as any).isActive ?? (item as any).is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => openEditModal(item)}
                          className="text-purple-600 hover:text-purple-900 mr-3"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Import Modal */}
        {showImportModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Import CSV File</h3>
                <button
                  onClick={() => setShowImportModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    CSV File
                  </label>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    CSV format: Name, Description, Category, Price, Currency, Tax Rate, Unit, Notes
                  </p>
                </div>
                
                {importStatus && (
                  <div className={`p-3 rounded-md flex items-center ${
                    importStatus.includes('Success') || importStatus.includes('imported')
                      ? 'bg-green-50 text-green-700'
                      : importStatus.includes('failed') || importStatus.includes('error')
                      ? 'bg-red-50 text-red-700'
                      : 'bg-blue-50 text-blue-700'
                  }`}>
                    {importStatus.includes('Success') || importStatus.includes('imported') ? (
                      <CheckCircle className="h-4 w-4 mr-2" />
                    ) : importStatus.includes('failed') || importStatus.includes('error') ? (
                      <AlertCircle className="h-4 w-4 mr-2" />
                    ) : (
                      <FileText className="h-4 w-4 mr-2" />
                    )}
                    {importStatus}
                  </div>
                )}
                
                <div className="flex space-x-3">
                  <button
                    onClick={handleImportCSV}
                    disabled={!importFile || importStatus.includes('Processing')}
                    className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Import
                  </button>
                  <button
                    onClick={() => setShowImportModal(false)}
                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Add/Edit Modal */}
        {(showAddModal || editingItem) && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">
                  {editingItem ? 'Edit Item' : 'Add New Item'}
                </h3>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingItem(null);
                    resetForm();
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    rows={2}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Category *
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({...formData, category: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="">Select...</option>
                      {categories.filter(c => c !== 'ALL').map(category => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Price *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) => setFormData({...formData, price: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Currency
                    </label>
                    <select
                      value={formData.currency}
                      onChange={(e) => setFormData({...formData, currency: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="EUR">EUR</option>
                      <option value="USD">USD</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tax Rate %
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.taxRate}
                      onChange={(e) => setFormData({...formData, taxRate: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Unit
                    </label>
                    <input
                      type="text"
                      value={formData.unit}
                      onChange={(e) => setFormData({...formData, unit: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    rows={2}
                  />
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
                    className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                  />
                  <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
                    Active
                  </label>
                </div>
                
                <div className="flex space-x-3">
                  <button
                    onClick={editingItem ? handleEditItem : handleAddItem}
                    disabled={!formData.name || !formData.category || !formData.price}
                    className="flex-1 bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {editingItem ? 'Update' : 'Add'} Item
                  </button>
                  <button
                    onClick={() => {
                      setShowAddModal(false);
                      setEditingItem(null);
                      resetForm();
                    }}
                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Price Guide Full Preview Modal */}
      {showPriceGuidePreview && priceGuideUrl && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-8"
          onClick={() => setShowPriceGuidePreview(false)}
        >
          <div className="relative max-w-4xl max-h-full">
            <button
              onClick={() => setShowPriceGuidePreview(false)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300"
            >
              <X className="h-8 w-8" />
            </button>
            <img 
              src={priceGuideUrl} 
              alt="Price Guide" 
              className="max-w-full max-h-[85vh] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default PriceListSettingsPage;