
import React, { createContext, useContext, useEffect, useState, useRef } from 'react';

interface AdminUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

interface NeonAuthContextType {
  user: AdminUser | null;
  isAdmin: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const NeonAuthContext = createContext<NeonAuthContextType | undefined>(undefined);

export const NeonAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const isCheckingRef = useRef(false);
  const lastCheckRef = useRef<number>(0);

  useEffect(() => {
    // Only check auth on initial load
    checkAuthStatus();
  }, []); // Remove user dependency that was causing loops

  const checkAuthStatus = async () => {
    // Prevent multiple simultaneous auth checks
    if (isCheckingRef.current) {
      return;
    }
    
    isCheckingRef.current = true;

    try {
      // Always check localStorage first and trust it completely
      const storedUser = localStorage.getItem('admin_user');
      if (storedUser) {
        try {
          const userData = JSON.parse(storedUser);
          console.log('✅ Found stored user:', userData.email, userData.role);
          setUser(userData);
          setIsAdmin(userData.role === 'admin' || userData.role === 'super_admin');
          setLoading(false);
          isCheckingRef.current = false;
          return;
        } catch (parseError) {
          console.log('❌ Failed to parse stored user, removing');
          localStorage.removeItem('admin_user');
        }
      }

      // Verify session with server only if no localStorage
      const response = await fetch('/api/auth/me', {
        method: 'GET',
        credentials: 'include'
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.user) {
          console.log('✅ Server verified user:', result.user.email);
          setUser(result.user);
          setIsAdmin(result.user.role === 'admin' || result.user.role === 'super_admin');
          localStorage.setItem('admin_user', JSON.stringify(result.user));
        } else {
          setUser(null);
          setIsAdmin(false);
        }
      } else {
        setUser(null);
        setIsAdmin(false);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      // Only clear auth if there's a real server error and no localStorage
      const storedUser = localStorage.getItem('admin_user');
      if (!storedUser) {
        setUser(null);
        setIsAdmin(false);
      }
    } finally {
      setLoading(false);
      isCheckingRef.current = false;
    }
  };

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email, password })
      });

      const result = await response.json();
      
      if (result.success && result.user) {
        setUser(result.user);
        setIsAdmin(result.user.role === 'admin' || result.user.role === 'super_admin');
        localStorage.setItem('admin_user', JSON.stringify(result.user));
        return { success: true };
      } else {
        return { success: false, error: result.error || 'Login failed' };
      }
    } catch (error) {
      return { success: false, error: 'Network error: Unable to connect to server' };
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      setIsAdmin(false);
      localStorage.removeItem('admin_user');
    }
  };

  const value = {
    user,
    isAdmin,
    loading,
    login,
    logout,
  };

  return (
    <NeonAuthContext.Provider value={value}>
      {children}
    </NeonAuthContext.Provider>
  );
};

export const useNeonAuth = () => {
  const context = useContext(NeonAuthContext);
  if (context === undefined) {
    throw new Error('useNeonAuth must be used within a NeonAuthProvider');
  }
  return context;
};
