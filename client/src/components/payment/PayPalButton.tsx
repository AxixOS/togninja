import React, { useEffect, useRef } from 'react';

interface PayPalButtonProps {
  amount: number;
  currency?: string;
  onSuccess: (details: any) => void;
  onError?: (error: any) => void;
  onCancel?: () => void;
  disabled?: boolean;
}

declare global {
  interface Window {
    paypal?: any;
  }
}

const PayPalButton: React.FC<PayPalButtonProps> = ({
  amount,
  currency = 'EUR',
  onSuccess,
  onError,
  onCancel,
  disabled = false
}) => {
  const paypalRef = useRef<HTMLDivElement>(null);
  const paypalButtonsRef = useRef<any>(null);

  useEffect(() => {
    // Load PayPal SDK if not already loaded
    if (!window.paypal) {
      const script = document.createElement('script');
      script.src = `https://www.paypal.com/sdk/js?client-id=${process.env.REACT_APP_PAYPAL_CLIENT_ID || 'demo'}&currency=${currency}&locale=de_DE`;
      script.onload = () => initializePayPal();
      document.body.appendChild(script);
    } else {
      initializePayPal();
    }

    return () => {
      // Cleanup PayPal buttons when component unmounts
      if (paypalButtonsRef.current) {
        paypalButtonsRef.current.close();
      }
    };
  }, [amount, currency]);

  const initializePayPal = () => {
    if (window.paypal && paypalRef.current) {
      // Clear existing buttons
      if (paypalRef.current) {
        paypalRef.current.innerHTML = '';
      }

      if (disabled) return;

      paypalButtonsRef.current = window.paypal.Buttons({
        style: {
          layout: 'horizontal',
          color: 'blue',
          shape: 'rect',
          label: 'pay',
          height: 48,
        },
        createOrder: (data: any, actions: any) => {
          return actions.order.create({
            purchase_units: [{
              amount: {
                value: amount.toFixed(2),
                currency_code: currency
              },
              description: 'Fotoshooting Gutschein'
            }]
          });
        },
        onApprove: async (data: any, actions: any) => {
          try {
            const details = await actions.order.capture();
            onSuccess(details);
          } catch (error) {
            console.error('PayPal approval error:', error);
            if (onError) onError(error);
          }
        },
        onError: (error: any) => {
          console.error('PayPal error:', error);
          if (onError) onError(error);
        },
        onCancel: () => {
          console.log('PayPal payment cancelled');
          if (onCancel) onCancel();
        }
      });

      paypalButtonsRef.current.render(paypalRef.current);
    }
  };

  useEffect(() => {
    initializePayPal();
  }, [disabled]);

  if (disabled) {
    return (
      <div className="w-full bg-gray-300 text-gray-500 font-semibold py-3 px-6 rounded-lg flex items-center justify-center space-x-2">
        <span>PayPal</span>
        <span className="text-sm">(E-Mail eingeben)</span>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div ref={paypalRef} className="paypal-button-container" />
    </div>
  );
};

export default PayPalButton;
