import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { Category, Order, User, Voucher } from '../types';
import { categories, orders as mockOrders, user as mockUser, vouchers as mockVouchers } from '../data/mockData';

interface AppContextType {
  vouchers: Voucher[];
  filteredVouchers: Voucher[];
  categories: Category[];
  selectedCategory: Category | null;
  setSelectedCategory: (category: Category | null) => void;
  user: User | null;
  orders: Order[];
  getVoucherBySlug: (slug: string) => Voucher | undefined;
  getVoucherById: (id: string) => Voucher | undefined;
  addOrder: (order: Omit<Order, 'id' | 'voucherCode' | 'createdAt'>) => Order;
  isLoggedIn: boolean;
  login: () => void;
  logout: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [vouchers] = useState<Voucher[]>(mockVouchers);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [orders, setOrders] = useState<Order[]>([]);

  // Filter vouchers based on selected category
  const filteredVouchers = selectedCategory
    ? vouchers.filter(voucher => voucher.category === selectedCategory)
    : vouchers;

  // Get voucher by slug
  const getVoucherBySlug = (slug: string): Voucher | undefined => {
    return vouchers.find(voucher => voucher.slug === slug);
  };

  // Get voucher by ID
  const getVoucherById = (id: string): Voucher | undefined => {
    return vouchers.find(voucher => voucher.id === id);
  };

  // Add a new order
  const addOrder = (orderData: Omit<Order, 'id' | 'voucherCode' | 'createdAt'>): Order => {
    const newOrder: Order = {
      ...orderData,
      id: `order-${Date.now()}`,
      voucherCode: generateVoucherCode(orderData.voucher.category),
      createdAt: new Date().toISOString().split('T')[0]
    };
    
    setOrders(prevOrders => [...prevOrders, newOrder]);
    return newOrder;
  };

  // Generate a voucher code
  const generateVoucherCode = (category: Category): string => {
    const prefix = category.substring(0, 3).toUpperCase();
    const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${prefix}-${randomPart}`;
  };

  // Login function (in a real app, this would validate credentials)
  const login = () => {
    setUser(mockUser);
    setIsLoggedIn(true);
    setOrders(mockOrders);
  };

  // Logout function
  const logout = () => {
    setUser(null);
    setIsLoggedIn(false);
    setOrders([]);
  };

  // Value provided to consumers of this context
  const contextValue: AppContextType = {
    vouchers,
    filteredVouchers,
    categories,
    selectedCategory,
    setSelectedCategory,
    user,
    orders,
    getVoucherBySlug,
    getVoucherById,
    addOrder,
    isLoggedIn,
    login,
    logout
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};

// Custom hook to use the AppContext
export const useAppContext = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};