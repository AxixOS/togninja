import React, { useState, useEffect } from 'react';
import { X, Search, ShoppingCart, Check } from 'lucide-react';

interface PriceListItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  type?: string;
  unit: string;
  taxRate: number;
  isActive: boolean;
  notes?: string;
}

interface PriceListModalProps {
  onClose: () => void;
  onSelectItem: (item: PriceListItem) => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  'PRINTS': '🖼️ Prints',
  'LEINWAND': '🎨 Leinwand',
  'LUXUSRAHMEN': '✨ Luxusrahmen',
  'DIGITAL': '💾 Digital',
  'EXTRAS': '📋 Extras',
};

const CATEGORY_ORDER = ['PRINTS', 'LEINWAND', 'LUXUSRAHMEN', 'DIGITAL', 'EXTRAS'];

const PriceListModal: React.FC<PriceListModalProps> = ({ onClose, onSelectItem }) => {
  const [priceList, setPriceList] = useState<PriceListItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<PriceListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [addedItems, setAddedItems] = useState<Set<string>>(new Set());

  // Fetch price list from database API
  useEffect(() => {
    const fetchPriceList = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/crm/price-list');
        if (!response.ok) throw new Error('Failed to load price guide');
        const data = await response.json();
        const mapped: PriceListItem[] = (Array.isArray(data) ? data : []).map((item: any) => ({
          id: item.id,
          name: item.name,
          description: item.description || '',
          price: typeof item.price === 'number' ? item.price : parseFloat(item.price) || 0,
          category: item.category || 'EXTRAS',
          type: item.unit === 'session' || item.unit === 'hour' ? 'service' : 'product',
          unit: item.unit || 'piece',
          taxRate: typeof item.taxRate === 'number' ? item.taxRate : parseFloat(item.taxRate) || 20,
          isActive: item.isActive !== false,
          notes: item.notes || '',
        }));
        // Sort by category order then by price
        mapped.sort((a, b) => {
          const catA = CATEGORY_ORDER.indexOf(a.category);
          const catB = CATEGORY_ORDER.indexOf(b.category);
          const orderA = catA >= 0 ? catA : 999;
          const orderB = catB >= 0 ? catB : 999;
          if (orderA !== orderB) return orderA - orderB;
          return a.price - b.price;
        });
        setPriceList(mapped);
        setFilteredItems(mapped);
      } catch (err: any) {
        console.error('Error fetching price list:', err);
        setError(err.message || 'Failed to load price guide');
      } finally {
        setLoading(false);
      }
    };
    fetchPriceList();
  }, []);

  useEffect(() => {
    let filtered = priceList.filter(item => item.isActive);

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(term) ||
        item.description.toLowerCase().includes(term) ||
        (item.notes && item.notes.toLowerCase().includes(term))
      );
    }

    if (selectedCategory !== 'All') {
      filtered = filtered.filter(item => item.category === selectedCategory);
    }

    setFilteredItems(filtered);
  }, [priceList, searchTerm, selectedCategory]);

  const categories = ['All', ...CATEGORY_ORDER.filter(cat => priceList.some(item => item.category === cat))];

  const handleSelectItem = (item: PriceListItem) => {
    onSelectItem(item);
    setAddedItems(prev => new Set(prev).add(item.id));
    // Don't close - allow adding multiple items
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR'
    }).format(price);
  };

  // Group items by category for display
  const groupedItems = filteredItems.reduce((groups, item) => {
    const cat = item.category;
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(item);
    return groups;
  }, {} as Record<string, PriceListItem[]>);

  const sortedCategories = Object.keys(groupedItems).sort((a, b) => {
    const orderA = CATEGORY_ORDER.indexOf(a);
    const orderB = CATEGORY_ORDER.indexOf(b);
    return (orderA >= 0 ? orderA : 999) - (orderB >= 0 ? orderB : 999);
  });

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-6 border w-11/12 max-w-3xl shadow-lg rounded-lg bg-white mb-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">
              Preisliste
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Click an item to add it to the invoice. You can add multiple items.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Search & Filter */}
        <div className="mb-4 flex items-center space-x-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
            />
          </div>
          <div className="flex space-x-1">
            {categories.map(category => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-3 py-2 text-xs font-medium rounded-md transition-colors ${
                  selectedCategory === category
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {category === 'All' ? 'Alle' : (CATEGORY_LABELS[category] || category)}
              </button>
            ))}
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            <span className="ml-3 text-gray-500">Loading price guide...</span>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        {/* Price List - Grouped by Category */}
        {!loading && !error && (
          <div className="max-h-[60vh] overflow-y-auto pr-1 space-y-4">
            {sortedCategories.map(category => (
              <div key={category}>
                <h4 className="text-sm font-bold text-gray-700 mb-2 sticky top-0 bg-white py-1 border-b border-gray-100">
                  {CATEGORY_LABELS[category] || category}
                  <span className="ml-2 text-xs font-normal text-gray-400">
                    ({groupedItems[category].length} items)
                  </span>
                </h4>
                <div className="space-y-1">
                  {groupedItems[category].map((item) => {
                    const isAdded = addedItems.has(item.id);
                    return (
                      <div
                        key={item.id}
                        onClick={() => handleSelectItem(item)}
                        className={`flex items-center justify-between px-4 py-3 rounded-lg cursor-pointer transition-all ${
                          isAdded
                            ? 'bg-green-50 border border-green-200'
                            : 'bg-white border border-gray-100 hover:border-green-300 hover:bg-green-50'
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900 text-sm">{item.name}</span>
                            {item.notes && (
                              <span className="text-xs text-orange-600 bg-orange-50 px-2 py-0.5 rounded">
                                {item.notes}
                              </span>
                            )}
                          </div>
                          {item.description && (
                            <p className="text-xs text-gray-500 mt-0.5 truncate">{item.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-3 ml-4 flex-shrink-0">
                          <span className="text-lg font-bold text-gray-900">
                            {formatPrice(item.price)}
                          </span>
                          {isAdded ? (
                            <span className="flex items-center gap-1 text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
                              <Check className="w-3 h-3" /> Added
                            </span>
                          ) : (
                            <button className="flex items-center gap-1 text-xs text-white bg-green-600 hover:bg-green-700 px-3 py-1.5 rounded transition-colors">
                              <ShoppingCart className="w-3 h-3" /> Add
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* No Results */}
        {!loading && !error && filteredItems.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <Search className="w-8 h-8 mx-auto mb-3 text-gray-300" />
            <p>No items found matching your search.</p>
          </div>
        )}

        {/* Footer */}
        <div className="mt-4 flex items-center justify-between pt-4 border-t border-gray-200">
          <div className="text-sm text-gray-500">
            {addedItems.size > 0 && (
              <span className="text-green-600 font-medium">
                {addedItems.size} item{addedItems.size !== 1 ? 's' : ''} added to invoice
              </span>
            )}
            {addedItems.size === 0 && (
              <span>{filteredItems.length} item{filteredItems.length !== 1 ? 's' : ''} available</span>
            )}
          </div>
          <button
            onClick={onClose}
            className={`px-5 py-2 rounded-md font-medium transition-colors ${
              addedItems.size > 0
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'text-gray-600 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            {addedItems.size > 0 ? 'Done' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PriceListModal;