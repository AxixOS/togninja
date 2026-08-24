import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { useCart } from '../context/CartContext';
import VoucherCodeInput from '../components/cart/VoucherCodeInput';
import VoucherFlow from '../components/voucher/VoucherFlow';
import { VoucherService, AppliedVoucher } from '../services/voucherService';
import { Trash2, ShoppingBag, ArrowLeft, Gift } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useStudioCurrency } from '../hooks/useStudioCurrency';

const CartPage: React.FC = () => {
  const { items, removeItem, updateQuantity, total, clearCart } = useCart();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { format: money } = useStudioCurrency();
  const [appliedVoucher, setAppliedVoucher] = useState<AppliedVoucher | undefined>();
  const [showVoucherFlow, setShowVoucherFlow] = useState(false);
  const [selectedVoucherItem, setSelectedVoucherItem] = useState<any>(null);

  // Dynamic-priced voucher offer launched from a landing page. The price is
  // carried in a SERVER-SIGNED token (?offer=…) so it can't be edited; the token
  // is decoded here only for display, then re-verified server-side at checkout.
  // (Legacy ?amount/&title still opens the flow but is not tamper-proof.)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const decodeOffer = (token: string): { amount: number; title: string; slug?: string } | null => {
      try {
        let b = token.split('.')[0].replace(/-/g, '+').replace(/_/g, '/');
        while (b.length % 4) b += '=';
        const j = JSON.parse(atob(b));
        const amt = (Number(j.a) || 0) / 100;
        return amt > 0 ? { amount: amt, title: String(j.t || 'Gutschein'), slug: j.s ? String(j.s) : undefined } : null;
      } catch { return null; }
    };
    const offerToken = params.get('offer');
    let item: any = null;
    if (offerToken) {
      const dec = decodeOffer(offerToken);
      // productSlug lets product-restricted coupons match this offer at checkout.
      if (dec) item = { name: dec.title, title: dec.title, price: dec.amount, type: 'voucher', offerToken, productSlug: dec.slug };
    } else {
      const amount = parseFloat(params.get('amount') || '');
      if (amount > 0) {
        const title = (params.get('title') || 'Gutschein').slice(0, 120);
        item = { name: title, title, price: amount, type: 'voucher' };
      }
    }
    if (item) {
      setSelectedVoucherItem(item);
      setShowVoucherFlow(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleQuantityChange = (id: string, value: number) => {
    if (value > 0 && value <= 10) {
      updateQuantity(id, value);
    }
  };

  const handleApplyVoucher = async (code: string) => {
    // Ask backend to validate taking into account product-specific restrictions
    const response = await fetch('/api/vouchers/coupons/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code,
        orderAmount: Math.round(total * 100) / 100,
        items: items.map(i => ({
          productId: (i as any).productId,
          productSlug: (i as any).productSlug,
          sku: (i as any).sku || (i as any).productSlug,
          name: i.title || i.name,
          price: i.price,
          quantity: i.quantity,
        }))
      })
    });

    const result = await response.json();

    if (response.ok && result.valid && result.coupon) {
      const discountAmount = Math.round(parseFloat(result.coupon.discountAmount) * 100);
      setAppliedVoucher({
        code: result.coupon.code,
        discount: discountAmount,
        type: result.coupon.discountType === 'percentage' ? 'percentage' : 'fixed',
      });
      return { success: true, discount: discountAmount, message: 'Gutscheincode erfolgreich angewendet!' };
    }

    return { success: false, message: result.error || 'Ungültiger Gutscheincode' };
  };

  const handleRemoveVoucher = () => {
    setAppliedVoucher(undefined);
  };

  const discountedTotal = VoucherService.calculateDiscountedTotal(
    Math.round(total * 100), 
    appliedVoucher
  ) / 100;

  const handleCheckout = (itemId?: string) => {
    // Check if this is a specific voucher item
    const item = itemId ? items.find(i => i.id === itemId) : null;
    const isVoucherItem = item?.type === 'voucher' || item?.name?.toLowerCase().includes('gutschein') || item?.name?.toLowerCase().includes('voucher');
    
    if (isVoucherItem && item) {
      setSelectedVoucherItem(item);
      setShowVoucherFlow(true);
      return;
    }
    
    // If no specific item ID provided, check if cart contains any voucher items
    if (!itemId) {
      const voucherItems = items.filter(item => 
        item.type === 'voucher' || 
        item.name?.toLowerCase().includes('gutschein') || 
        item.title?.toLowerCase().includes('voucher')
      );
      
      // If there are voucher items, redirect to personalize the first one
      if (voucherItems.length > 0) {
        setSelectedVoucherItem(voucherItems[0]);
        setShowVoucherFlow(true);
        return;
      }
    }
    
    // Every sellable item is a photo-shoot product, so route through the REAL
    // Stripe checkout (the voucher flow) rather than the legacy demo /checkout
    // page, which could never take a real payment (guaranteed lost sale).
    if (items.length > 0) {
      setSelectedVoucherItem(items[0]);
      setShowVoucherFlow(true);
      return;
    }
  };

  const handleVoucherFlowComplete = (voucherCheckoutData: any) => {
    // Since the voucher flow now redirects to Stripe,
    // this completion handler is for when users return from successful payment
    console.log('Voucher purchase completed:', voucherCheckoutData);
    
    // Clear the voucher item from cart
    if (selectedVoucherItem) {
      removeItem(selectedVoucherItem.id);
    }
    
    // Reset voucher flow state
    setShowVoucherFlow(false);
    setSelectedVoucherItem(null);

    // Redirect to the localized success page instead of a raw browser alert().
    navigate('/vouchers/success');
  };

  const handleBackFromVoucherFlow = () => {
    setShowVoucherFlow(false);
    setSelectedVoucherItem(null);
  };

  // Show voucher flow if a voucher item is being processed
  if (showVoucherFlow && selectedVoucherItem) {
    const slug = (selectedVoucherItem as any).productSlug as string | undefined;
    const initialVoucher = appliedVoucher
      ? { code: appliedVoucher.code, discountCents: appliedVoucher.discount }
      : undefined;
    return (
      <VoucherFlow
        voucherType={selectedVoucherItem.name}
        baseAmount={selectedVoucherItem.price}
        productSlug={slug}
        offerToken={(selectedVoucherItem as any).offerToken}
        initialVoucher={initialVoucher}
        onComplete={handleVoucherFlowComplete}
        onBack={handleBackFromVoucherFlow}
      />
    );
  }

  if (items.length === 0) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-2xl mx-auto text-center">
            <ShoppingBag size={64} className="text-gray-400 mx-auto mb-6" />
            <h1 className="text-2xl font-bold text-gray-800 mb-4">
              Ihr Warenkorb ist leer
            </h1>
            <p className="text-gray-600 mb-8">
              Entdecken Sie unsere Fotografie-Pakete und fügen Sie sie Ihrem Warenkorb hinzu.
            </p>
            <button
              onClick={() => navigate('/vouchers')}
              className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
            >
              Pakete ansehen
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <button 
          onClick={() => navigate('/vouchers')}
          className="flex items-center text-purple-600 hover:text-purple-700 mb-6"
        >
          <ArrowLeft size={20} className="mr-2" />
          {language === 'en' ? 'Back' : 'Zurück'}
        </button>

        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-8">
          Warenkorb
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-lg p-6">
              {items.map(item => {
                const isVoucherItem = item.type === 'voucher' || item.name?.toLowerCase().includes('gutschein') || item.title?.toLowerCase().includes('voucher');
                
                return (
                  <div key={item.id} className="flex flex-col sm:flex-row sm:items-center py-4 border-b border-gray-200 last:border-0 gap-4">
                    {/* Thumbnail Image */}
                    {item.imageUrl && (
                      <div className="flex-shrink-0">
                        <img 
                          src={item.imageUrl} 
                          alt={item.title}
                          className="w-20 h-20 object-cover rounded-lg"
                        />
                      </div>
                    )}
                    
                    <div className="flex-grow">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-semibold text-gray-800">{item.title}</h3>
                        {isVoucherItem && (
                          <Gift size={16} className="text-purple-600" />
                        )}
                      </div>
                      <p className="text-gray-600 text-sm">{item.packageType}</p>
                      {item.description && (
                        <p className="text-gray-600 text-sm mt-1">
                          {item.description.length > 100 
                            ? `${item.description.substring(0, 100)}...` 
                            : item.description}
                        </p>
                      )}
                      {isVoucherItem && (
                        <p className="text-purple-600 text-sm font-medium mt-1">
                          Personalisierung verfügbar
                        </p>
                      )}
                    </div>

                    <div className="flex items-center space-x-4">
                      {/* Quantity controls - hide for vouchers as they need personalization */}
                      {!isVoucherItem && (
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                            className="text-gray-500 hover:text-gray-700"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="1"
                            max="10"
                            value={item.quantity}
                            onChange={(e) => handleQuantityChange(item.id, parseInt(e.target.value))}
                            className="w-16 text-center border border-gray-300 rounded-lg"
                          />
                          <button
                            onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                            className="text-gray-500 hover:text-gray-700"
                          >
                            +
                          </button>
                        </div>
                      )}

                      {/* Voucher personalization button */}
                      {isVoucherItem && (
                        <button
                          onClick={() => handleCheckout(item.id)}
                          className="bg-purple-600 hover:bg-purple-700 text-white text-sm px-4 py-2 rounded-lg transition-colors"
                        >
                          Personalisieren
                        </button>
                      )}

                      <div className="text-right min-w-[100px]">
                        <div className="font-semibold text-gray-800">
                          {money(item.price * item.quantity)}
                        </div>
                        <div className="text-sm text-gray-500">
                          {money(item.price)} pro Stück
                        </div>
                      </div>

                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">
                Zusammenfassung
              </h2>

              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-gray-600">
                  <span>Zwischensumme</span>
                  <span>{money(total)}</span>
                </div>
                {appliedVoucher && (
                  <div className="flex justify-between text-green-600">
                    <span>Rabatt ({appliedVoucher.code})</span>
                    <span>-{money(appliedVoucher.discount / 100)}</span>
                  </div>
                )}
              </div>

              <div className="border-t border-gray-200 pt-4 mb-6">
                <div className="flex justify-between text-xl font-bold text-gray-800">
                  <span>Gesamt</span>
                  <span>{money(discountedTotal)}</span>
                </div>
              </div>

              {/* Voucher Code Input */}
              <div className="mb-6">
                <VoucherCodeInput
                  onApplyVoucher={handleApplyVoucher}
                  appliedVoucher={appliedVoucher}
                  onRemoveVoucher={handleRemoveVoucher}
                />
              </div>

              <div className="space-y-4">
                {(() => {
                  const hasVouchers = items.some(item => 
                    item.type === 'voucher' || 
                    item.name?.toLowerCase().includes('gutschein') || 
                    item.title?.toLowerCase().includes('voucher')
                  );
                  
                  return (
                    <button
                      onClick={() => handleCheckout()}
                      className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
                    >
                      {hasVouchers ? 'Gutschein personalisieren' : 'Zur Kasse'}
                    </button>
                  );
                })()}

                <button
                  onClick={clearCart}
                  className="w-full border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium py-3 px-6 rounded-lg transition-colors"
                >
                  Warenkorb leeren
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default CartPage;