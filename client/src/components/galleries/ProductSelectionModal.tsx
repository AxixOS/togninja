import React, { useState, useEffect } from 'react';
import { X, Plus, Minus, ShoppingCart } from 'lucide-react';
import { GalleryImage } from '../../types/gallery';

interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  category: 'print' | 'digital' | 'frame' | 'canvas';
  size?: string;
}

interface ProductSelectionModalProps {
  image: GalleryImage;
  onClose: () => void;
  onAddToCart: (image: GalleryImage, product: Product, quantity: number) => void;
}

const ProductSelectionModal: React.FC<ProductSelectionModalProps> = ({ 
  image, 
  onClose, 
  onAddToCart 
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      
      // Try to fetch products from API
      const response = await fetch('/api/products', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        // Ensure price is a number
        const normalizedProducts = data.map((p: any) => ({
          ...p,
          price: typeof p.price === 'number' ? p.price : parseFloat(p.price) || 0
        }));
        setProducts(normalizedProducts);
      } else {
        // Use default products if API fails
        setProducts(getDefaultProducts());
      }
    } catch (error) {
      console.error('Failed to load products:', error);
      // Fallback to default products
      setProducts(getDefaultProducts());
    } finally {
      setLoading(false);
    }
  };

  const getDefaultProducts = (): Product[] => {
    return [
      // Print products
      { id: 'print-4x6', name: '4x6" Print', description: 'Standard photo print', price: 2.99, category: 'print', size: '4x6' },
      { id: 'print-5x7', name: '5x7" Print', description: 'Medium photo print', price: 4.99, category: 'print', size: '5x7' },
      { id: 'print-8x10', name: '8x10" Print', description: 'Large photo print', price: 9.99, category: 'print', size: '8x10' },
      { id: 'print-11x14', name: '11x14" Print', description: 'Extra large print', price: 19.99, category: 'print', size: '11x14' },
      { id: 'print-16x20', name: '16x20" Print', description: 'Poster size print', price: 34.99, category: 'print', size: '16x20' },
      
      // Canvas prints
      { id: 'canvas-8x10', name: '8x10" Canvas', description: 'Gallery wrapped canvas', price: 39.99, category: 'canvas', size: '8x10' },
      { id: 'canvas-11x14', name: '11x14" Canvas', description: 'Gallery wrapped canvas', price: 59.99, category: 'canvas', size: '11x14' },
      { id: 'canvas-16x20', name: '16x20" Canvas', description: 'Gallery wrapped canvas', price: 89.99, category: 'canvas', size: '16x20' },
      
      // Framed prints
      { id: 'frame-8x10', name: '8x10" Framed Print', description: 'Print with black frame', price: 49.99, category: 'frame', size: '8x10' },
      { id: 'frame-11x14', name: '11x14" Framed Print', description: 'Print with black frame', price: 69.99, category: 'frame', size: '11x14' },
      { id: 'frame-16x20', name: '16x20" Framed Print', description: 'Print with black frame', price: 99.99, category: 'frame', size: '16x20' },
      
      // Digital products
      { id: 'digital-web', name: 'Digital Download (Web)', description: 'High resolution for web use', price: 9.99, category: 'digital' },
      { id: 'digital-print', name: 'Digital Download (Print)', description: 'Maximum resolution for printing', price: 29.99, category: 'digital' },
    ];
  };

  const handleAddToCart = () => {
    if (selectedProduct) {
      onAddToCart(image, selectedProduct, quantity);
      onClose();
    }
  };

  const incrementQuantity = () => setQuantity(q => q + 1);
  const decrementQuantity = () => setQuantity(q => Math.max(1, q - 1));

  const groupedProducts = products.reduce((acc, product) => {
    if (!acc[product.category]) {
      acc[product.category] = [];
    }
    acc[product.category].push(product);
    return acc;
  }, {} as Record<string, Product[]>);

  const categoryNames = {
    print: 'Prints',
    canvas: 'Canvas Prints',
    frame: 'Framed Prints',
    digital: 'Digital Downloads'
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex justify-between items-start">
          <div className="flex-1 mr-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Order Print</h2>
            <p className="text-sm text-gray-600">{image.title || image.filename}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Image Preview */}
            <div className="space-y-4">
              <img
                src={image.displayUrl || image.thumbUrl}
                alt={image.filename}
                className="w-full rounded-lg shadow-lg"
              />
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Selected Image:</p>
                <p className="font-medium text-gray-900">{image.filename}</p>
                {image.title && (
                  <p className="text-sm text-gray-600 mt-1">{image.title}</p>
                )}
              </div>
            </div>

            {/* Product Selection */}
            <div className="space-y-6">
              {loading ? (
                <div className="text-center py-12">
                  <p className="text-gray-500">Loading products...</p>
                </div>
              ) : (
                <>
                  {Object.entries(groupedProducts).map(([category, categoryProducts]) => (
                    <div key={category} className="space-y-3">
                      <h3 className="font-semibold text-gray-900 text-lg">
                        {categoryNames[category as keyof typeof categoryNames]}
                      </h3>
                      <div className="space-y-2">
                        {categoryProducts.map((product) => (
                          <button
                            key={product.id}
                            onClick={() => setSelectedProduct(product)}
                            className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                              selectedProduct?.id === product.id
                                ? 'border-green-500 bg-green-50'
                                : 'border-gray-200 hover:border-green-300 bg-white'
                            }`}
                          >
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <p className="font-medium text-gray-900">{product.name}</p>
                                {product.description && (
                                  <p className="text-sm text-gray-600 mt-1">{product.description}</p>
                                )}
                              </div>
                              <p className="font-semibold text-green-600 ml-4">
                                €{(typeof product.price === 'number' ? product.price : parseFloat(product.price) || 0).toFixed(2)}
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}

                  {/* Quantity Selector */}
                  {selectedProduct && (
                    <div className="bg-gray-50 p-4 rounded-lg space-y-4">
                      <div className="flex items-center justify-between">
                        <label className="font-medium text-gray-900">Quantity:</label>
                        <div className="flex items-center space-x-3">
                          <button
                            onClick={decrementQuantity}
                            className="p-2 rounded-full bg-white border border-gray-300 hover:bg-gray-100"
                          >
                            <Minus size={16} />
                          </button>
                          <span className="text-lg font-semibold w-12 text-center">{quantity}</span>
                          <button
                            onClick={incrementQuantity}
                            className="p-2 rounded-full bg-white border border-gray-300 hover:bg-gray-100"
                          >
                            <Plus size={16} />
                          </button>
                        </div>
                      </div>
                      
                      <div className="pt-4 border-t border-gray-200">
                        <div className="flex justify-between items-center mb-4">
                          <span className="text-gray-600">Subtotal:</span>
                          <span className="text-2xl font-bold text-gray-900">
                            €{((typeof selectedProduct.price === 'number' ? selectedProduct.price : parseFloat(selectedProduct.price) || 0) * quantity).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-between items-center">
            <button
              onClick={onClose}
              className="px-6 py-2 text-gray-700 hover:text-gray-900 font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleAddToCart}
              disabled={!selectedProduct}
              className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed font-semibold flex items-center space-x-2"
            >
              <ShoppingCart size={20} />
              <span>Add to Cart</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductSelectionModal;
