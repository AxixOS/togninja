import React, { useState } from 'react';
import { createCheckoutSession } from '../../lib/stripe';
import { stripeProducts } from '../../stripe-config';
import { Loader2 } from 'lucide-react';

interface CheckoutButtonProps {
  productId: string;
  className?: string;
  children?: React.ReactNode;
}

const CheckoutButton: React.FC<CheckoutButtonProps> = ({ productId, className, children }) => {
  const [loading, setLoading] = useState(false);

  const handleCheckout = async () => {
    try {
      setLoading(true);
      const product = stripeProducts[productId];
      
      if (!product) {
        throw new Error('Product not found');
      }

      await createCheckoutSession(product.priceId, product.mode);
    } catch (error) {
      // console.error removed
      alert('Failed to start checkout process. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleCheckout}
      disabled={loading}
      className={`flex items-center justify-center ${className}`}
    >
      {loading ? (
        <>
          <Loader2 size={20} className="animate-spin mr-2" />
          Wird geladen...
        </>
      ) : (
        children
      )}
    </button>
  );
};

export default CheckoutButton;