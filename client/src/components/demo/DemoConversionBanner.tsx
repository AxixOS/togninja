import React, { useState } from 'react';
import { X, Sparkles, ArrowRight, Users, CheckCircle } from 'lucide-react';
import { SITE } from '../../config/site';

interface DemoConversionBannerProps {
  onClose?: () => void;
  onGetStarted?: () => void;
}

export const DemoConversionBanner: React.FC<DemoConversionBannerProps> = ({ 
  onClose, 
  onGetStarted 
}) => {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  const handleClose = () => {
    setIsVisible(false);
    onClose?.();
  };

  const handleGetStarted = () => {
    window.open(`${SITE.url}/get-started`, '_blank');
    onGetStarted?.();
  };

  return (
    <div className="bg-gradient-to-r from-purple-600 via-blue-600 to-teal-600 text-white py-4 px-6 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute -top-4 -left-4 w-24 h-24 border border-white rounded-full"></div>
        <div className="absolute top-8 right-12 w-16 h-16 border border-white rounded-full"></div>
        <div className="absolute -bottom-2 right-24 w-20 h-20 border border-white rounded-full"></div>
      </div>

      <div className="relative flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="bg-white/20 p-2 rounded-full">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg">
                Ready to Transform Your Photography Business?
              </h3>
              <p className="text-sm opacity-90">
                Join 500+ photographers already using our platform
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-6">
          {/* Social Proof */}
          <div className="hidden md:flex items-center space-x-4 text-sm">
            <div className="flex items-center space-x-1">
              <Users className="h-4 w-4" />
              <span>500+ Studios</span>
            </div>
            <div className="flex items-center space-x-1">
              <CheckCircle className="h-4 w-4" />
              <span>30-Day Free Trial</span>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex items-center space-x-3">
            <button
              onClick={handleGetStarted}
              className="bg-white text-purple-600 px-6 py-2 rounded-full font-semibold hover:bg-gray-100 transition-all duration-200 flex items-center space-x-2 shadow-lg hover:shadow-xl"
            >
              <span>Start Free Trial</span>
              <ArrowRight className="h-4 w-4" />
            </button>
            
            <button
              onClick={handleClose}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
              aria-label="Close banner"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DemoConversionBanner;