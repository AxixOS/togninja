import React, { useState, useEffect } from 'react';
import { CreditCard, MapPin, Gift, Edit2, ChevronDown, ArrowLeft } from 'lucide-react';
import VoucherCodeInput from '../cart/VoucherCodeInput';
import type { VoucherPersonalizationData } from './VoucherPersonalization';
import { getAttributedCampaignId } from '../../lib/attribution';
import { useLanguage } from '../../context/LanguageContext';
import { SITE } from '../../config/site';

interface EnhancedCheckoutPageProps {
  voucherData?: VoucherPersonalizationData;
  baseAmount: number;
  onCheckout: (checkoutData: CheckoutData) => void;
  productSlug?: string;
  offerToken?: string;
  initialVoucher?: { code: string; discountCents: number };
  onBack?: () => void;
}

interface CheckoutData {
  email: string;
  voucherData: VoucherPersonalizationData;
  paymentMethod: string;
  appliedVoucherCode?: string;
  discount?: number;
}

const EnhancedCheckoutPage: React.FC<EnhancedCheckoutPageProps> = ({
  voucherData,
  baseAmount,
  onCheckout,
  productSlug,
  offerToken,
  initialVoucher,
  onBack
}) => {
  const { language } = useLanguage();
  const de = language === 'de';
  const [email, setEmail] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [appliedVoucherCode, setAppliedVoucherCode] = useState<string>();
  const [discount, setDiscount] = useState(0);
  const [showVoucherInput, setShowVoucherInput] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [productDescription, setProductDescription] = useState<string | undefined>(undefined);
  const [productHeroImage, setProductHeroImage] = useState<string | undefined>(undefined);
  const [productNameFromApi, setProductNameFromApi] = useState<string | undefined>(undefined);

  const deliveryAmount = voucherData?.deliveryOption.price || 0;
  const subtotal = baseAmount + deliveryAmount;
  const total = subtotal - discount;
  const needsShipping = !!(voucherData && (voucherData.deliveryOption.price > 0 || (voucherData.deliveryOption.id || '').startsWith('post-')));
  const hasShippingAddress = !!(voucherData && voucherData.shippingAddress && voucherData.shippingAddress.address1 && voucherData.shippingAddress.city && voucherData.shippingAddress.zip && voucherData.shippingAddress.country);

  // Prefill from cart-applied voucher if provided
  useEffect(() => {
    if (initialVoucher && initialVoucher.code) {
      setAppliedVoucherCode(initialVoucher.code);
      setDiscount(Math.max(0, (initialVoucher.discountCents || 0) / 100));
      setShowVoucherInput(false);
    }
  }, [initialVoucher]);

  // Fetch product detail (for description and hero image) when slug is provided
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        if (!productSlug) return;
        const r = await fetch(`/api/vouchers/products/${encodeURIComponent(productSlug)}`);
        if (!r.ok) return;
        const j = await r.json();
        const desc = j?.description || j?.detailedDescription || j?.detailed_description || undefined;
        const heroImg = j?.imageUrl || j?.image_url || undefined;
        const pName = j?.name || undefined;
        if (active) {
          setProductNameFromApi(typeof pName === 'string' ? pName : undefined);
          setProductDescription(typeof desc === 'string' ? desc : undefined);
          setProductHeroImage(typeof heroImg === 'string' ? heroImg : undefined);
        }
      } catch {
        // ignore
      }
    })();
    return () => { active = false; };
  }, [productSlug]);

  // Map productSlug to a human-readable product name for Stripe line item naming.
  // Handles ANY slug generically by capitalizing each segment.
  const productNameFromSlug = (slug?: string): string | undefined => {
    if (!slug) return undefined;
    // Convert "family-classic" → "Family Classic", "studio-fotografie-basic" → "Studio Fotografie Basic"
    return slug
      .split('-')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  };

  // Backend validation for voucher codes using product context
  const applyVoucherViaBackend = async (code: string): Promise<{ success: boolean; discount?: number; message: string }> => {
    try {
      const response = await fetch('/api/vouchers/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          orderAmount: Math.round(subtotal * 100) / 100,
          items: [
            {
              productSlug: productSlug,
              sku: productSlug,
              name: productNameFromApi || productNameFromSlug(productSlug) || `Fotoshooting Gutschein - ${voucherData?.selectedDesign?.occasion || 'Personalisiert'}`,
              price: baseAmount,
              quantity: 1,
            },
          ],
        }),
      });
      const result = await response.json();
      if (response.ok && result.valid && result.coupon) {
        const discountAmount = Math.round(parseFloat(result.coupon.discountAmount) * 100);
        setAppliedVoucherCode(result.coupon.code);
        setDiscount(discountAmount / 100);
        setShowVoucherInput(false);
        return { success: true, discount: discountAmount, message: de ? 'Gutscheincode erfolgreich angewendet!' : 'Voucher code applied successfully!' };
      }
      return { success: false, message: result.error || (de ? 'Ungültiger Gutscheincode' : 'Invalid voucher code') };
    } catch (err) {
      return { success: false, message: de ? 'Validierung fehlgeschlagen. Bitte erneut versuchen.' : 'Validation failed. Please try again.' };
    }
  };

  const handleVoucherRemoved = () => {
    setAppliedVoucherCode(undefined);
    setDiscount(0);
  };

  const handleCheckout = async (selectedPaymentMethod?: string) => {
    if (isProcessing) return; // guard against double clicks
    setErrorMessage(null);
    if (!email.trim() || !voucherData) {
      setErrorMessage(de ? 'Bitte E-Mail eingeben.' : 'Please enter your email.');
      return;
    }
    if (needsShipping && !hasShippingAddress) {
      setErrorMessage(de ? 'Lieferadresse fehlt. Bitte zurück und Adresse ausfüllen.' : 'Shipping address is missing. Please go back and fill in the address.');
      return;
    }

    const finalPaymentMethod = selectedPaymentMethod || paymentMethod;
    setIsProcessing(true);

    try {
      const payload = {
        items: [
          {
            name: productNameFromApi || productNameFromSlug(productSlug) || `Fotoshooting Gutschein - ${voucherData.selectedDesign?.occasion || 'Personalisiert'}`,
            price: Math.round(baseAmount * 100),
            quantity: 1,
            sku: productSlug,
            description: productDescription || 'Gutschein'
          },
          ...(deliveryAmount > 0 ? [{
            name: `Gutschein Lieferung - ${voucherData.deliveryOption.name}`,
            price: Math.round(deliveryAmount * 100),
            quantity: 1,
            sku: `delivery-${(voucherData.deliveryOption.name || 'standard').toLowerCase()}`,
            description: 'Lieferkosten'
          }] : [])
        ],
        customerEmail: email.trim(),
        voucherData: {
          ...voucherData,
          // Pass URL so backend PDF can embed it
          customImageUrl: voucherData.customImageUrl || undefined,
          productDescription: productDescription || undefined,
          productHeroImage: productHeroImage || undefined // Fallback to product default image
        },
        appliedVoucherCode,
        discount: Math.round(discount * 100),
        mode: 'voucher',
        paymentMethod: finalPaymentMethod,
        // Email→order attribution: campaign that drove this purchase (if any).
        campaignId: getAttributedCampaignId() || undefined,
        // Server-signed landing-page offer price (tamper-proof). When present the
        // server verifies it and charges the SIGNED amount, ignoring items[].price.
        offerToken: offerToken || undefined
      };

      console.log('➡️ Creating checkout session with payload:', payload);

      const response = await fetch('/api/checkout/create-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      let result: any = {};
      try { result = await response.json(); } catch {}

      if (!response.ok) {
        console.error('❌ Checkout session creation failed:', result);
        setErrorMessage(result?.error || (de ? 'Checkout konnte nicht gestartet werden.' : 'Checkout could not be started.'));
        setIsProcessing(false);
        return;
      }

      if (result?.url) {
        console.log('✅ Redirecting to Stripe Checkout:', result.url);
        window.location.href = result.url;
      } else {
        console.warn('⚠️ Kein URL Feld in Antwort. Result:', result);
        setErrorMessage(de ? 'Fehler: Keine Weiterleitungs-URL erhalten. Bitte später erneut versuchen.' : 'Error: No redirect URL received. Please try again later.');
        setIsProcessing(false);
      }
    } catch (error) {
      console.error('Unexpected checkout error:', error);
      setErrorMessage(de ? 'Unerwarteter Fehler beim Start des Checkouts.' : 'Unexpected error while starting the checkout.');
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {SITE.logo ? (
                <img src={SITE.logo} alt={SITE.name} className="h-9 w-auto" />
              ) : (
                <div className="w-9 h-9 bg-purple-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-sm">
                    {SITE.name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase()}
                  </span>
                </div>
              )}
              <span className="font-semibold">{SITE.name}</span>
            </div>
            <div className="flex items-center text-sm text-gray-500">
              <CreditCard size={16} className="mr-1.5" />
              {de ? 'Sichere Bezahlung' : 'Secure checkout'}
            </div>
          </div>
        </div>
      </header>

      {/* Breadcrumb + Back */}
      <div className="max-w-6xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center text-purple-600 hover:text-purple-700 text-sm"
          >
            <ArrowLeft size={18} className="mr-1" />
            {de ? 'Zurück zur Personalisierung' : 'Back to personalization'}
          </button>
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <span>{de ? 'Warenkorb' : 'Cart'}</span>
            <ChevronDown size={16} className="rotate-[-90deg]" />
            <span className="text-gray-900 font-medium">{de ? 'Kasse' : 'Checkout'}</span>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Checkout Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Email Address */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold mb-4">{de ? 'E-Mail Adresse eingeben' : 'Enter your email address'}</h3>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {de ? 'E-Mail *' : 'Email *'}
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={de ? 'ihre-email@beispiel.de' : 'your-email@example.com'}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  handleCheckout();
                }}
                disabled={isProcessing || !email.trim() || !voucherData || (needsShipping && !hasShippingAddress)}
                className={`w-full ${isProcessing ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'} disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center space-x-2`}
              >
                {isProcessing ? (
                  <>
                    <svg className="animate-spin h-5 w-5 mr-2 text-white" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                    {de ? 'Wird weitergeleitet...' : 'Redirecting...'}
                  </>
                ) : (
                  <span>{de ? 'Weiter' : 'Continue'}</span>
                )}
              </button>
              {errorMessage && (
                <p className="text-sm text-red-600 mt-3">{errorMessage}</p>
              )}
              {needsShipping && !hasShippingAddress && (
                <p className="text-sm text-red-600 mt-2">{de ? 'Für die gewählte Versandart ist eine Lieferadresse erforderlich. Bitte gehen Sie zurück und füllen Sie die Adresse aus.' : 'A shipping address is required for the selected shipping method. Please go back and fill in the address.'}</p>
              )}
            </div>

            {/* Payment Methods */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold mb-4">{de ? 'Zahlungsart' : 'Payment method'}</h3>
              <div className="space-y-3">
                <label 
                  className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                  onClick={() => email.trim() && voucherData && (!needsShipping || hasShippingAddress) && handleCheckout('card')}
                >
                  <input
                    type="radio"
                    name="payment"
                    value="card"
                    checked={paymentMethod === 'card'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="text-blue-600"
                  />
                  <CreditCard size={20} className="text-gray-600" />
                  <span>{de ? 'Kreditkarte / Debitkarte / Klarna' : 'Credit card / Debit card / Klarna'}</span>
                  {paymentMethod === 'card' && email.trim() && voucherData && (!needsShipping || hasShippingAddress) && (
                    <span className="ml-auto text-sm text-green-600">{de ? '✓ Bereit zum Checkout' : '✓ Ready to check out'}</span>
                  )}
                </label>
              </div>
              
              {(!email.trim() || !voucherData) && (
                <p className="text-sm text-gray-500 mt-3">
                  {de ? 'Bitte geben Sie Ihre E-Mail-Adresse ein, um eine Zahlungsart zu wählen.' : 'Please enter your email address to choose a payment method.'}
                </p>
              )}
              {needsShipping && !hasShippingAddress && (
                <p className="text-sm text-red-600 mt-2">{de ? 'Lieferadresse fehlt: Bitte zur Personalisierung zurückkehren und Adresse ergänzen.' : 'Shipping address is missing: please return to personalization and add the address.'}</p>
              )}
            </div>
          </div>

          {/* Right Column - Order Summary */}
          <div className="space-y-6">
            {/* Voucher Details */}
            {voucherData && (
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-start space-x-4">
                  <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden">
                    {voucherData.customPhoto ? (
                      <img 
                        src={URL.createObjectURL(voucherData.customPhoto)}
                        alt="Custom voucher"
                        className="w-full h-full object-cover"
                      />
                    ) : voucherData.selectedDesign ? (
                      <img 
                        src={voucherData.selectedDesign.image}
                        alt={voucherData.selectedDesign.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                          (e.target as HTMLImageElement).parentElement!.innerHTML = `
                            <div class="w-full h-full flex items-center justify-center text-gray-400">
                              <Gift size="24" />
                            </div>
                          `;
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <Gift size={24} />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">{de ? 'Fotoshooting Gutschein' : 'Photo shoot voucher'}</h3>
                    <p className="text-sm text-gray-600">
                      {voucherData.selectedDesign?.occasion || (de ? 'Eigenes Foto' : 'Own photo')}
                    </p>
                    {voucherData.personalMessage && (
                      <p className="text-sm text-gray-600 mt-1 italic">
                        "{voucherData.personalMessage.substring(0, 50)}..."
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{baseAmount.toFixed(2)} €</p>
                  </div>
                </div>

                {/* Delivery Method */}
                <div className="mt-4 pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">1</span>
                      <span className="text-sm">{voucherData.deliveryOption.name}</span>
                    </div>
                    <span className="text-sm font-medium">
                      {voucherData.deliveryOption.price === 0 ? (de ? 'Kostenlos' : 'Free') : `${voucherData.deliveryOption.price.toFixed(2)} €`}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Order Summary */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold mb-4">{de ? 'Bestellübersicht' : 'Order summary'}</h3>

              <div className="space-y-3">
                <div className="flex justify-between">
                  <span>{de ? 'Zwischensumme' : 'Subtotal'}</span>
                  <span>{baseAmount.toFixed(2)} €</span>
                </div>

                <div className="flex justify-between">
                  <span>{de ? 'Versandkosten' : 'Shipping'}</span>
                  <span>{deliveryAmount === 0 ? (de ? 'Kostenlos' : 'Free') : `${deliveryAmount.toFixed(2)} €`}</span>
                </div>

                {discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>{de ? 'Rabatt' : 'Discount'} ({appliedVoucherCode})</span>
                    <span>-{discount.toFixed(2)} €</span>
                  </div>
                )}

                <div className="border-t pt-3">
                  <div className="flex justify-between font-semibold text-lg">
                    <span>{de ? 'Gesamtpreis' : 'Total'}</span>
                    <span>{total.toFixed(2)} €</span>
                  </div>
                </div>
              </div>

              {/* Voucher Code Section */}
              <div className="mt-6 pt-4 border-t">
                {!appliedVoucherCode ? (
                  <button
                    onClick={() => setShowVoucherInput(!showVoucherInput)}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center space-x-1"
                  >
                    <Gift size={16} />
                    <span>{de ? 'Geschenkkarte oder Rabattcode' : 'Gift card or discount code'}</span>
                    <ChevronDown size={16} className={showVoucherInput ? 'rotate-180' : ''} />
                  </button>
                ) : (
                  <div className="bg-green-50 p-3 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Gift size={16} className="text-green-600" />
                        <span className="text-sm text-green-800">
                          {de ? 'Code' : 'Code'} "{appliedVoucherCode}" {de ? 'angewendet' : 'applied'}
                        </span>
                      </div>
                      <button
                        onClick={handleVoucherRemoved}
                        className="text-red-600 hover:text-red-700 text-sm"
                      >
                        {de ? 'Entfernen' : 'Remove'}
                      </button>
                    </div>
                  </div>
                )}
                
                {showVoucherInput && !appliedVoucherCode && (
                  <div className="mt-3">
                    <VoucherCodeInput
                      onApplyVoucher={async (code) => applyVoucherViaBackend(code)}
                      subtotal={subtotal}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Trust Badges */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="text-center space-y-3">
                <div className="flex items-center justify-center space-x-4">
                  <div className="flex items-center space-x-1 text-green-600">
                    <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                    <span className="text-sm">{de ? 'SSL Verschlüsselt' : 'SSL encrypted'}</span>
                  </div>
                  <div className="flex items-center space-x-1 text-green-600">
                    <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                    <span className="text-sm">{de ? 'Sicher' : 'Secure'}</span>
                  </div>
                </div>
                <p className="text-xs text-gray-500">
                  {de ? 'Ihre Daten werden verschlüsselt übertragen' : 'Your data is transmitted encrypted'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedCheckoutPage;
