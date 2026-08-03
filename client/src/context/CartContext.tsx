import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { trackAddToCart } from '../lib/tracking';

interface CartItem {
  id: string;
  title: string;
  name?: string;
  productId?: string;
  productSlug?: string;
  price: number;
  quantity: number;
  packageType: string;
  type?: string; // Added for voucher detection
  description?: string; // Voucher description
  imageUrl?: string; // Voucher thumbnail image
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'id'>) => void;
  addToCart: (item: Omit<CartItem, 'id'>) => void; // Alias for consistency
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  total: number;
  itemCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = 'voucherCart';

export const CartProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Initialize from localStorage
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY);
      if (!stored) return [];
      
      const parsedItems = JSON.parse(stored);
      
      // Migrate old items to add description and imageUrl if missing
      return parsedItems.map((item: CartItem) => ({
        ...item,
        description: item.description || `${item.title} - ${item.packageType}`,
        imageUrl: item.imageUrl || 'https://i.imgur.com/jSFqBCq.jpg' // Default family photo image
      }));
    } catch {
      return [];
    }
  });

  // Persist to localStorage whenever items change
  useEffect(() => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const addItem = (newItem: Omit<CartItem, 'id'>) => {
    setItems(prevItems => [
      ...prevItems,
      { ...newItem, id: `${newItem.title}-${Date.now()}` }
    ]);
    // Conversion tracking: fire once per add (safe no-op if trackers not loaded).
    trackAddToCart({
      id: newItem.productId || newItem.productSlug || newItem.title,
      name: newItem.name || newItem.title,
      value: newItem.price,
      quantity: newItem.quantity,
    });
  };

  const removeItem = (id: string) => {
    setItems(prevItems => prevItems.filter(item => item.id !== id));
  };

  const updateQuantity = (id: string, quantity: number) => {
    setItems(prevItems =>
      prevItems.map(item =>
        item.id === id ? { ...item, quantity } : item
      )
    );
  };

  const clearCart = () => {
    setItems([]);
  };

  const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider value={{
      items,
      addItem,
      addToCart: addItem, // Alias for consistency
      removeItem,
      updateQuantity,
      clearCart,
      total,
      itemCount
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};