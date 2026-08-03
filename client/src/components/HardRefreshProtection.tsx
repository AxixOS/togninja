import React, { useEffect, useState } from 'react';
import { AlertTriangle, RefreshCw, Shield } from 'lucide-react';

interface HardRefreshProtectionProps {
  children: React.ReactNode;
  isDevelopment?: boolean;
}

export const HardRefreshProtection: React.FC<HardRefreshProtectionProps> = ({ 
  children, 
  isDevelopment = true 
}) => {
  const [refreshCount, setRefreshCount] = useState(0);
  const [lastRefresh, setLastRefresh] = useState<string | null>(null);
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    // Track page refreshes in development mode
    if (isDevelopment) {
      const refreshKey = 'app-refresh-count';
      const lastRefreshKey = 'app-last-refresh';
      
      const stored = localStorage.getItem(refreshKey);
      const storedCount = stored ? parseInt(stored, 10) : 0;
      const storedLastRefresh = localStorage.getItem(lastRefreshKey);
      
      const now = new Date().toISOString();
      setRefreshCount(storedCount + 1);
      setLastRefresh(storedLastRefresh);
      
      localStorage.setItem(refreshKey, (storedCount + 1).toString());
      localStorage.setItem(lastRefreshKey, now);
      
      // Show warning if refreshing frequently (more than 3 times in 5 minutes)
      if (storedLastRefresh) {
        const lastTime = new Date(storedLastRefresh);
        const timeDiff = Date.now() - lastTime.getTime();
        if (timeDiff < 300000 && storedCount > 2) { // 5 minutes
          setShowWarning(true);
        }
      }
    }

    // Listen for beforeunload to warn about unsaved changes
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const unsavedDrafts = Object.keys(localStorage).filter(key => 
        key.startsWith('email-draft-') || key.startsWith('crm-form-')
      );
      
      if (unsavedDrafts.length > 0) {
        e.preventDefault();
        e.returnValue = 'You have unsaved drafts. Are you sure you want to leave?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDevelopment]);

  if (showWarning && isDevelopment) {
    return (
      <div className="min-h-screen bg-yellow-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="w-6 h-6 text-yellow-600" />
            <h3 className="text-lg font-semibold text-gray-900">
              Frequent Refreshes Detected
            </h3>
          </div>
          
          <div className="space-y-3 text-sm text-gray-600 mb-6">
            <p>
              The page has refreshed <strong>{refreshCount} times</strong> recently. 
              This might indicate development server instability.
            </p>
            
            <div className="bg-blue-50 p-3 rounded-md">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-blue-600" />
                <span className="font-medium text-blue-900">Draft Protection Active</span>
              </div>
              <p className="text-blue-800">
                Your email drafts and form data are automatically saved locally 
                and will be restored if the page refreshes.
              </p>
            </div>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={() => setShowWarning(false)}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Continue Working
            </button>
            <button
              onClick={() => window.location.reload()}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};