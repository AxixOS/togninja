import React from 'react';
import { Play, ExternalLink } from 'lucide-react';
import { useDemoMode } from '../../hooks/useDemoMode';
import { SITE } from '../../config/site';

const DemoModeIndicator: React.FC = () => {
  const { isDemoMode } = useDemoMode();
  
  if (!isDemoMode) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-purple-600 to-blue-600 text-white py-2 px-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <div className="bg-white/20 p-1.5 rounded-full">
              <Play className="h-3 w-3" />
            </div>
            <span className="font-semibold text-sm">LIVE DEMO</span>
          </div>
          <span className="text-sm opacity-90">
            Explore all features with realistic photography business data
          </span>
        </div>
        
        <div className="hidden md:flex items-center space-x-4">
          <div className="text-xs opacity-75">
            <span>Admin: demo@newagefotografie.com</span>
            <span className="mx-2">•</span>
            <span>Client: client@demo.com</span>
          </div>
          
          <button
            onClick={() => window.open(`${SITE.url}/get-started`, '_blank')}
            className="bg-white text-purple-600 px-4 py-1.5 rounded-full text-sm font-semibold hover:bg-gray-100 transition-colors flex items-center space-x-1"
          >
            <span>Get Started</span>
            <ExternalLink className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default DemoModeIndicator;