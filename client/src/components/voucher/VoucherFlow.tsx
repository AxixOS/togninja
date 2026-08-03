import React, { useState, useEffect, useRef } from 'react';
import VoucherPersonalization, { type VoucherPersonalizationData } from './VoucherPersonalization';
import EnhancedCheckoutPage from './EnhancedCheckoutPage';
import { ArrowLeft } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

interface VoucherFlowProps {
  voucherType: string;
  baseAmount: number;
  onComplete: (checkoutData: any) => void;
  onBack?: () => void;
  productSlug?: string;
  offerToken?: string;
  initialVoucher?: { code: string; discountCents: number };
}

type FlowStep = 'personalization' | 'checkout' | 'confirmation';

const VoucherFlow: React.FC<VoucherFlowProps> = ({
  voucherType,
  baseAmount,
  onComplete,
  onBack,
  productSlug,
  offerToken,
  initialVoucher,
}) => {
  const { language } = useLanguage();
  // Use sessionStorage to persist voucher flow state
  const getStoredStep = (): FlowStep => {
    try {
      const stored = sessionStorage.getItem(`voucher_flow_step_${voucherType}`);
      return (stored as FlowStep) || 'personalization';
    } catch {
      return 'personalization';
    }
  };

  const getStoredVoucherData = (): VoucherPersonalizationData | null => {
    try {
      const stored = sessionStorage.getItem(`voucher_flow_data_${voucherType}`);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  };

  const [currentStep, setCurrentStep] = useState<FlowStep>(getStoredStep);
  const [voucherData, setVoucherData] = useState<VoucherPersonalizationData | null>(getStoredVoucherData);
  const initialUrlSynced = useRef(false);

  // On mount, read vf query param and sync initial step
  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      const vf = (url.searchParams.get('vf') || '').toLowerCase();
      let desired: FlowStep | null = null;
      if (vf === 'personalization' || vf === 'checkout' || vf === 'confirmation') {
        desired = vf as FlowStep;
      }
      if (desired) {
        // Guard: cannot be in checkout without data
        if (desired === 'checkout' && !getStoredVoucherData()) {
          desired = 'personalization';
        }
        setCurrentStep(desired);
      }
      initialUrlSynced.current = true;
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save state to sessionStorage whenever it changes
  useEffect(() => {
    try {
      sessionStorage.setItem(`voucher_flow_step_${voucherType}`, currentStep);
    } catch (error) {
      console.warn('Failed to save voucher flow step to sessionStorage:', error);
    }
  }, [currentStep, voucherType]);

  useEffect(() => {
    try {
      if (voucherData) {
        sessionStorage.setItem(`voucher_flow_data_${voucherType}`, JSON.stringify(voucherData));
      } else {
        sessionStorage.removeItem(`voucher_flow_data_${voucherType}`);
      }
    } catch (error) {
      console.warn('Failed to save voucher flow data to sessionStorage:', error);
    }
  }, [voucherData, voucherType]);

  // Reflect current step into URL (?vf=...) so browser back navigates within flow without hard reset
  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      const existing = (url.searchParams.get('vf') || '').toLowerCase();
      if (existing !== currentStep) {
        url.searchParams.set('vf', currentStep);
        // Avoid pushing before initial sync to keep history clean
        if (initialUrlSynced.current) {
          window.history.pushState({ vf: currentStep }, '', url.toString());
        } else {
          window.history.replaceState({ vf: currentStep }, '', url.toString());
          initialUrlSynced.current = true;
        }
      }
    } catch {}
  }, [currentStep]);

  // Handle browser back/forward to switch steps without reloading or resetting
  useEffect(() => {
    const onPop = () => {
      try {
        const url = new URL(window.location.href);
        const vf = (url.searchParams.get('vf') || '').toLowerCase();
        if (vf === 'personalization' || vf === 'checkout' || vf === 'confirmation') {
          // Guard: if checkout requested but no data, fallback to personalization
          if (vf === 'checkout' && !getStoredVoucherData()) {
            setCurrentStep('personalization');
          } else {
            setCurrentStep(vf as FlowStep);
          }
        }
      } catch {}
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // Handle browser back/forward to navigate within the flow without hard reset
  useEffect(() => {
    const onPopState = (ev: PopStateEvent) => {
      const state = (ev.state || {}) as any;
      if (state && state.voucherFlow === voucherType) {
        // Move back to personalization if we were in checkout
        setCurrentStep(state.step === 'checkout' ? 'personalization' : 'personalization');
      } else {
        // If unrelated history navigation, preserve flow by defaulting to personalization
        setCurrentStep('personalization');
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [voucherType]);

  const handlePersonalizationComplete = (data: VoucherPersonalizationData) => {
    setVoucherData(data);
    // Push a history state so browser Back returns to personalization, not previous route
    try {
      window.history.pushState({ voucherFlow: voucherType, step: 'checkout' }, '', window.location.href);
    } catch {}
    setCurrentStep('checkout');
  };

  const handleCheckoutComplete = (checkoutData: any) => {
    // Since EnhancedCheckoutPage now redirects to Stripe directly,
    // this might not be called. But if it is, we handle it gracefully.
    console.log('Checkout initiated with Stripe:', checkoutData);
    
    // Clear session storage when checkout is complete
    try {
      sessionStorage.removeItem(`voucher_flow_step_${voucherType}`);
      sessionStorage.removeItem(`voucher_flow_data_${voucherType}`);
    } catch (error) {
      console.warn('Failed to clear voucher flow data from sessionStorage:', error);
    }
    
    // The actual completion will happen on the Stripe success page
    // For now, we can just show a loading state or redirect
    setCurrentStep('confirmation');
  };

  const handleBackToPersonalization = () => {
    setCurrentStep('personalization');
  };

  const handleBackToCart = () => {
    // Clear session storage when going back to cart
    try {
      sessionStorage.removeItem(`voucher_flow_step_${voucherType}`);
      sessionStorage.removeItem(`voucher_flow_data_${voucherType}`);
    } catch (error) {
      console.warn('Failed to clear voucher flow data from sessionStorage:', error);
    }
    // Also clean query param
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete('vf');
      window.history.pushState({}, '', url.toString());
    } catch {}
    
    if (onBack) {
      onBack();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Header */}
      {currentStep !== 'personalization' && (
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-6xl mx-auto px-4 py-3">
            <button
              onClick={currentStep === 'checkout' ? handleBackToPersonalization : handleBackToCart}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              <ArrowLeft size={20} />
              <span>
                {currentStep === 'checkout' 
                  ? (language === 'en' ? 'Back to Personalization' : 'Zurück zur Personalisierung') 
                  : (language === 'en' ? 'Back to Cart' : 'Zurück zum Warenkorb')}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Step Content */}
      {currentStep === 'personalization' && (
        <VoucherPersonalization
          voucherAmount={baseAmount}
          onComplete={handlePersonalizationComplete}
          onBack={handleBackToCart}
        />
      )}

      {currentStep === 'checkout' && voucherData && (
        <EnhancedCheckoutPage
          voucherData={voucherData}
          baseAmount={baseAmount}
          productSlug={productSlug}
          offerToken={offerToken}
          initialVoucher={initialVoucher}
          onBack={handleBackToPersonalization}
          onCheckout={handleCheckoutComplete}
        />
      )}

      {currentStep === 'confirmation' && (
        <div className="max-w-2xl mx-auto pt-16 px-4">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              {language === 'en' ? 'Thank you for your order!' : 'Vielen Dank für Ihre Bestellung!'}
            </h1>
            <p className="text-gray-600 mb-6">
              {language === 'en'
                ? 'Your personalised voucher will be delivered according to the delivery method you chose.'
                : 'Ihr personalisierter Gutschein wird entsprechend Ihrer gewählten Versandart zugestellt.'}
            </p>
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h3 className="font-semibold mb-2">{language === 'en' ? 'Order details:' : 'Bestelldetails:'}</h3>
              <div className="text-sm text-gray-600 space-y-1">
                <p>{language === 'en' ? 'Voucher' : 'Gutschein'}: {voucherType}</p>
                <p>{language === 'en' ? 'Delivery' : 'Versandart'}: {voucherData?.deliveryOption.name}</p>
                <p>{language === 'en' ? 'Amount' : 'Betrag'}: {baseAmount.toFixed(2)} €</p>
              </div>
            </div>
            <button
              onClick={() => window.location.href = '/'}
              className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              {language === 'en' ? 'Back to home' : 'Zur Startseite'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default VoucherFlow;
