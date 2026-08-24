import React, { useState } from 'react';
import { Tag, Check, X } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useStudioCurrency } from '../../hooks/useStudioCurrency';

interface VoucherCodeInputProps {
  onApplyVoucher?: (code: string) => Promise<{ success: boolean; discount?: number; message: string }>;
  onVoucherApplied?: (code: string, discountAmount: number) => void;
  appliedVoucher?: {
    code: string;
    discount: number;
    type: 'percentage' | 'fixed';
  };
  onRemoveVoucher?: () => void;
  subtotal?: number;
}

const VoucherCodeInput: React.FC<VoucherCodeInputProps> = ({
  onApplyVoucher,
  onVoucherApplied,
  appliedVoucher,
  onRemoveVoucher,
  subtotal = 0
}) => {
  const { language } = useLanguage();
  const de = language === 'de';
  const { format: money } = useStudioCurrency();
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');

  const handleApply = async () => {
    if (!code.trim()) return;
    
    setIsLoading(true);
    setMessage('');
    
    try {
      // For enhanced checkout (direct callback)
      if (onVoucherApplied) {
        // Simple validation for demo - in real app this would call an API
        const testCodes = {
          'WELCOME20': { type: 'percentage' as const, value: 20 },
          'PHOTO50': { type: 'fixed' as const, value: 50 },
          'EARLYBIRD': { type: 'percentage' as const, value: 15 }
        };
        
        const voucherInfo = testCodes[code.trim().toUpperCase() as keyof typeof testCodes];
        if (voucherInfo) {
          const discountAmount = voucherInfo.type === 'percentage' 
            ? (subtotal * voucherInfo.value) / 100
            : voucherInfo.value;
          
          onVoucherApplied(code.trim().toUpperCase(), discountAmount);
          setCode('');
          setMessageType('success');
          setMessage(de ? 'Gutscheincode erfolgreich angewendet!' : 'Voucher code applied successfully!');
        } else {
          setMessageType('error');
          setMessage(de ? 'Ungültiger Gutscheincode' : 'Invalid voucher code');
        }
      } 
      // For cart page (promise-based)
      else if (onApplyVoucher) {
        const result = await onApplyVoucher(code.trim().toUpperCase());
        
        if (result.success) {
          setCode('');
          setMessageType('success');
          setMessage(result.message);
        } else {
          setMessageType('error');
          setMessage(result.message);
        }
      }
    } catch (error) {
      setMessageType('error');
      setMessage(de ? 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.' : 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleApply();
    }
  };

  if (appliedVoucher) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center text-green-700">
            <Check size={20} className="mr-2" />
            <span className="font-medium">{de ? 'Gutscheincode angewendet' : 'Voucher applied'}: {appliedVoucher.code}</span>
          </div>
          <button
            onClick={onRemoveVoucher}
            className="text-green-600 hover:text-green-800"
          >
            <X size={20} />
          </button>
        </div>
        <p className="text-sm text-green-600 mt-1">
          {appliedVoucher.type === 'percentage'
            ? `${appliedVoucher.discount}% ${de ? 'Rabatt' : 'discount'}`
            // CENTS. CartPage.tsx sets this as Math.round(parseFloat(x) * 100), so the
            // major-unit value format() expects is this divided by 100. Printing the raw
            // number put "$5,000.00" under a $50 coupon.
            : `${money(appliedVoucher.discount / 100)} ${de ? 'Rabatt' : 'discount'}`}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex space-x-2">
        <div className="flex-1 relative">
          <Tag size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={de ? 'Gutscheincode eingeben' : 'Enter voucher code'}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            disabled={isLoading}
          />
        </div>
        <button
          onClick={handleApply}
          disabled={!code.trim() || isLoading}
          className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg transition-colors"
        >
          {isLoading ? (de ? 'Prüfen...' : 'Checking...') : (de ? 'Anwenden' : 'Apply')}
        </button>
      </div>
      
      {message && (
        <p className={`text-sm ${
          messageType === 'success' ? 'text-green-600' : 'text-red-600'
        }`}>
          {message}
        </p>
      )}
    </div>
  );
};

export default VoucherCodeInput;
