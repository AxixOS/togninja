import { useMemo } from 'react';

export const useDemoMode = () => {
  const isDemoMode = useMemo(() => {
    return import.meta.env.DEV || 
           import.meta.env.VITE_DEMO_MODE === 'true' ||
           window.location.hostname.includes('demo');
  }, []);

  const demoConfig = useMemo(() => ({
    isDemoMode,
    studioName: import.meta.env.VITE_DEMO_STUDIO_NAME || 'Demo Photography Studio',
    studioEmail: import.meta.env.VITE_DEMO_STUDIO_EMAIL || 'demo@photographycrm.com',
    studioPhone: import.meta.env.VITE_DEMO_STUDIO_PHONE || '+1 (555) 123-4567',
    restrictions: {
      maxClients: 100,
      maxGalleries: 50,
      maxInvoices: 50,
      canDelete: false,
      canExport: false,
      paymentsEnabled: false,
      emailsEnabled: false
    },
    sampleData: {
      clientsCount: 25,
      galleriesCount: 15,
      invoicesCount: 18,
      revenueThisMonth: 12450.00,
      sessionsThisWeek: 8
    }
  }), [isDemoMode]);

  return demoConfig;
};