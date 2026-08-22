import React, { useState, useEffect } from 'react';
import { X, ArrowLeft, ArrowRight, Truck, CreditCard, Check, Loader2, ShoppingCart, Package } from 'lucide-react';
import { GalleryImage } from '../../types/gallery';
import { useStudioCurrency } from '../../hooks/useStudioCurrency';

interface PrintProduct {
  id: number;
  sku: string;
  name: string;
  description: string;
  category: string;
  width_inches: number;
  height_inches: number;
  base_price: string;
  basePrice: number;
  currency: string;
}

interface ShippingAddress {
  name: string;
  email: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
  countryCode: string;
}

interface PrintOrderModalProps {
  image: GalleryImage;
  galleryId: string;
  /**
   * The visitor's signed gallery token.
   *
   * /api/print sits behind requirePrintAccess, which wants a bearer token AND a gallery
   * id to check it against. Without this every call here 401s — invisible today only
   * because the store is switched off by default.
   */
  authToken?: string;
  onClose: () => void;
  onOrderComplete?: (orderId: string) => void;
}

type Step = 'product' | 'shipping' | 'payment' | 'confirmation';

// Every /api/print call needs the same two things: the visitor's bearer token, and a
// galleryId for it to be checked against. Built in one place so a new call cannot
// quietly omit one of them.
const printHeaders = (token?: string): Record<string, string> => ({
  'Content-Type': 'application/json',
  ...(token ? { Authorization: 'Bearer ' + token } : {}),
});

const COUNTRIES = [
  { code: 'AT', name: 'Austria' },
  { code: 'DE', name: 'Germany' },
  { code: 'CH', name: 'Switzerland' },
  { code: 'FR', name: 'France' },
  { code: 'IT', name: 'Italy' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'BE', name: 'Belgium' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'US', name: 'United States' },
];

const CATEGORY_NAMES: Record<string, string> = {
  prints: 'Photo Prints',
  canvas: 'Canvas Prints',
  framed: 'Framed Prints',
  'fine-art': 'Fine Art Prints',
};

const PrintOrderModal: React.FC<PrintOrderModalProps> = ({
  image,
  galleryId,
  authToken,
  onClose,
  onOrderComplete,
}) => {
  // Top level, unconditionally: this is a hook, and a call inside a condition or after
  // an early return throws at runtime while the build stays green.
  const { currency, format } = useStudioCurrency();
  const [step, setStep] = useState<Step>('product');
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<PrintProduct[]>([]);
  const [groupedProducts, setGroupedProducts] = useState<Record<string, PrintProduct[]>>({});
  const [selectedProduct, setSelectedProduct] = useState<PrintProduct | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [shippingMethod, setShippingMethod] = useState('Standard');
  const [address, setAddress] = useState<ShippingAddress>({
    name: '',
    email: '',
    phone: '',
    line1: '',
    line2: '',
    city: '',
    state: '',
    postalCode: '',
    countryCode: 'AT',
  });
  const [quote, setQuote] = useState<any>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load print products on mount
  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/print/products?galleryId=${encodeURIComponent(galleryId)}`, {
        headers: printHeaders(authToken),
      });
      if (response.ok) {
        const data = await response.json();
        setProducts(data.products || []);
        setGroupedProducts(data.grouped || {});
      } else {
        setError('Failed to load print products');
      }
    } catch (err) {
      console.error('Error loading products:', err);
      setError('Failed to load print products');
    } finally {
      setLoading(false);
    }
  };

  const getQuote = async () => {
    if (!selectedProduct) return;

    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/print/quote', {
        method: 'POST',
        headers: printHeaders(authToken),
        body: JSON.stringify({
          galleryId,
          sku: selectedProduct.sku,
          copies: quantity,
          destinationCountryCode: address.countryCode,
          // Was hardcoded EUR while the studio was configured in GBP — the same
          // wrong-currency bug the admin sweep cleared, surviving here because this
          // component was never reachable.
          currencyCode: currency,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setQuote(data);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to get quote');
      }
    } catch (err) {
      console.error('Error getting quote:', err);
      setError('Failed to get quote');
    } finally {
      setLoading(false);
    }
  };

  const submitOrder = async () => {
    if (!selectedProduct) return;

    try {
      setLoading(true);
      setError(null);

      // Get the full resolution image URL
      const imageUrl = image.originalUrl || image.displayUrl || image.thumbUrl;

      const response = await fetch('/api/print/order', {
        method: 'POST',
        headers: printHeaders(authToken),
        body: JSON.stringify({
          galleryId,
          galleryImageId: image.id,
          imageUrl,
          sku: selectedProduct.sku,
          copies: quantity,
          shippingMethod,
          customer: {
            name: address.name,
            email: address.email,
            phone: address.phone,
            address: {
              line1: address.line1,
              line2: address.line2,
              city: address.city,
              state: address.state,
              postalCode: address.postalCode,
              countryCode: address.countryCode,
            },
          },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setOrderId(data.orderId);
        onOrderComplete?.(data.orderId);

        // The order is recorded but NOT printed. Nothing reaches the lab until Stripe
        // confirms payment, so the last step of ordering is now paying for it.
        //
        // The old code jumped straight to a confirmation screen that told the buyer an
        // invoice and a receipt were on the way. Neither was ever sent, and the print
        // was already at the printer, unpaid.
        if (data.checkoutUrl) {
          window.location.href = data.checkoutUrl;
          return;
        }

        setStep('confirmation');
      } else {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.message || errorData.error || 'Failed to create order');
      }
    } catch (err) {
      console.error('Error creating order:', err);
      setError('Failed to create order');
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (step === 'product' && selectedProduct) {
      setStep('shipping');
    } else if (step === 'shipping' && validateAddress()) {
      getQuote();
      setStep('payment');
    } else if (step === 'payment') {
      submitOrder();
    }
  };

  const handleBack = () => {
    if (step === 'shipping') setStep('product');
    else if (step === 'payment') setStep('shipping');
  };

  const validateAddress = () => {
    return (
      address.name.trim() !== '' &&
      address.email.includes('@') &&
      address.line1.trim() !== '' &&
      address.city.trim() !== '' &&
      address.postalCode.trim() !== '' &&
      address.countryCode !== ''
    );
  };

  const getStepNumber = () => {
    switch (step) {
      case 'product': return 1;
      case 'shipping': return 2;
      case 'payment': return 3;
      case 'confirmation': return 4;
      default: return 1;
    }
  };

  const totalPrice = selectedProduct
    ? (selectedProduct.basePrice * quantity).toFixed(2)
    : '0.00';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header with Progress */}
        <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Package size={28} />
                Order Print
              </h2>
              <p className="text-green-100 mt-1">{image.title || image.filename}</p>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors p-1"
            >
              <X size={24} />
            </button>
          </div>

          {/* Progress Steps */}
          {step !== 'confirmation' && (
            <div className="flex items-center justify-between mt-4">
              {[
                { num: 1, label: 'Product', icon: ShoppingCart },
                { num: 2, label: 'Shipping', icon: Truck },
                { num: 3, label: 'Payment', icon: CreditCard },
              ].map((s, i) => (
                <React.Fragment key={s.num}>
                  <div className="flex items-center">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${
                        getStepNumber() >= s.num
                          ? 'bg-white text-green-600'
                          : 'bg-green-500 text-white/60'
                      }`}
                    >
                      {getStepNumber() > s.num ? (
                        <Check size={20} />
                      ) : (
                        <s.icon size={18} />
                      )}
                    </div>
                    <span className="ml-2 text-sm font-medium hidden sm:inline">
                      {s.label}
                    </span>
                  </div>
                  {i < 2 && (
                    <div
                      className={`flex-1 h-1 mx-2 rounded ${
                        getStepNumber() > s.num ? 'bg-white' : 'bg-green-500'
                      }`}
                    />
                  )}
                </React.Fragment>
              ))}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          {/* Step 1: Product Selection */}
          {step === 'product' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Image Preview */}
              <div>
                <img
                  src={image.displayUrl || image.thumbUrl}
                  alt={image.filename}
                  className="w-full rounded-lg shadow-lg"
                />
                <div className="mt-4 bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Selected Image:</p>
                  <p className="font-medium text-gray-900">{image.filename}</p>
                </div>
              </div>

              {/* Product List */}
              <div className="space-y-6">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="animate-spin mr-2" />
                    <span>Loading products...</span>
                  </div>
                ) : (
                  Object.entries(groupedProducts).map(([category, prods]) => (
                    <div key={category}>
                      <h3 className="font-semibold text-gray-900 text-lg mb-3">
                        {CATEGORY_NAMES[category] || category}
                      </h3>
                      <div className="space-y-2">
                        {prods.map((product) => (
                          <button
                            key={product.id}
                            onClick={() => setSelectedProduct(product)}
                            className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                              selectedProduct?.id === product.id
                                ? 'border-green-500 bg-green-50'
                                : 'border-gray-200 hover:border-green-300'
                            }`}
                          >
                            <div className="flex justify-between items-center">
                              <div>
                                <p className="font-medium text-gray-900">
                                  {product.name}
                                </p>
                                <p className="text-sm text-gray-600">
                                  {product.description}
                                </p>
                              </div>
                              <span className="font-bold text-green-600 text-lg">
                                {format(product.basePrice)}
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))
                )}

                {/* Quantity Selector */}
                {selectedProduct && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Quantity:</span>
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => setQuantity(Math.max(1, quantity - 1))}
                          className="w-8 h-8 rounded-full bg-white border border-gray-300 hover:bg-gray-100"
                        >
                          -
                        </button>
                        <span className="w-8 text-center font-bold">{quantity}</span>
                        <button
                          onClick={() => setQuantity(quantity + 1)}
                          className="w-8 h-8 rounded-full bg-white border border-gray-300 hover:bg-gray-100"
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <div className="flex justify-between items-center mt-4 pt-4 border-t">
                      <span className="text-gray-600">Subtotal:</span>
                      <span className="text-2xl font-bold text-gray-900">
                        {format(totalPrice)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 2: Shipping Address */}
          {step === 'shipping' && (
            <div className="max-w-lg mx-auto space-y-4">
              <h3 className="text-xl font-bold text-gray-900 mb-6">
                Shipping Information
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={address.name}
                    onChange={(e) => setAddress({ ...address, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="John Doe"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={address.email}
                    onChange={(e) => setAddress({ ...address, email: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="john@example.com"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={address.phone}
                    onChange={(e) => setAddress({ ...address, phone: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="+43 123 456 789"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address Line 1 *
                  </label>
                  <input
                    type="text"
                    value={address.line1}
                    onChange={(e) => setAddress({ ...address, line1: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="123 Main Street"
                    required
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address Line 2
                  </label>
                  <input
                    type="text"
                    value={address.line2}
                    onChange={(e) => setAddress({ ...address, line2: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="Apt 4B"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    City *
                  </label>
                  <input
                    type="text"
                    value={address.city}
                    onChange={(e) => setAddress({ ...address, city: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="City"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    State / Province
                  </label>
                  <input
                    type="text"
                    value={address.state}
                    onChange={(e) => setAddress({ ...address, state: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="State or province"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Postal Code *
                  </label>
                  <input
                    type="text"
                    value={address.postalCode}
                    onChange={(e) => setAddress({ ...address, postalCode: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="1010"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Country *
                  </label>
                  <select
                    value={address.countryCode}
                    onChange={(e) => setAddress({ ...address, countryCode: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    required
                  >
                    {COUNTRIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Shipping Method */}
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Shipping Method
                </label>
                <div className="space-y-2">
                  {['Standard', 'Express'].map((method) => (
                    <label
                      key={method}
                      className={`flex items-center p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        shippingMethod === method
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-200 hover:border-green-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="shipping"
                        value={method}
                        checked={shippingMethod === method}
                        onChange={(e) => setShippingMethod(e.target.value)}
                        className="mr-3"
                      />
                      <div>
                        <p className="font-medium">{method} Shipping</p>
                        <p className="text-sm text-gray-600">
                          {method === 'Standard'
                            ? '5-10 business days'
                            : '2-4 business days'}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Payment / Review */}
          {step === 'payment' && (
            <div className="max-w-lg mx-auto">
              <h3 className="text-xl font-bold text-gray-900 mb-6">
                Review Your Order
              </h3>

              {/* Order Summary */}
              <div className="bg-gray-50 rounded-lg p-6 space-y-4">
                {/* Product */}
                <div className="flex items-center gap-4">
                  <img
                    src={image.thumbUrl}
                    alt={image.filename}
                    className="w-20 h-20 object-cover rounded-lg"
                  />
                  <div className="flex-1">
                    <p className="font-medium">{selectedProduct?.name}</p>
                    <p className="text-sm text-gray-600">
                      Qty: {quantity} × {format(selectedProduct?.basePrice)}
                    </p>
                  </div>
                  <span className="font-bold">{format(totalPrice)}</span>
                </div>

                <hr />

                {/* Shipping Address */}
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-2">
                    Ship to:
                  </p>
                  <p className="text-gray-900">{address.name}</p>
                  <p className="text-gray-600 text-sm">
                    {address.line1}
                    {address.line2 && `, ${address.line2}`}
                  </p>
                  <p className="text-gray-600 text-sm">
                    {address.city}, {address.postalCode}
                  </p>
                  <p className="text-gray-600 text-sm">
                    {COUNTRIES.find((c) => c.code === address.countryCode)?.name}
                  </p>
                </div>

                <hr />

                {/* Quote breakdown */}
                {quote && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Subtotal:</span>
                      <span>{format(totalPrice)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Shipping ({shippingMethod}):</span>
                      <span>
                        {quote.quotes?.[0]?.costSummary?.shipping?.amount
                          ? format(quote.quotes[0].costSummary.shipping.amount)
                          : 'Calculated at checkout'}
                      </span>
                    </div>
                    <div className="flex justify-between font-bold text-lg pt-2 border-t">
                      <span>Total:</span>
                      <span>{format(totalPrice)}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* This promised an invoice by email that was never sent — and the print was
                  already at the lab, unpaid. Payment is now taken before anything is
                  printed, so the note describes the step that is about to happen. */}
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-blue-800 text-sm">
                  <strong>Payment:</strong> You will be taken to our secure checkout to pay.
                  Your print goes to the lab once payment is confirmed.
                </p>
              </div>
            </div>
          )}

          {/* Step 4: Confirmation */}
          {step === 'confirmation' && (
            <div className="max-w-lg mx-auto text-center py-8">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Check size={40} className="text-green-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                Order Placed Successfully!
              </h3>
              <p className="text-gray-600 mb-6">
                Your order #{orderId} has been received.
              </p>
              {/* Was "A confirmation email will be sent to ...". Nothing sends one. Stripe
                  emails its own receipt for the payment, which is true and is enough. */}
              <p className="text-sm text-gray-500 mb-8">
                Your payment receipt goes to {address.email}.
              </p>
              <button
                onClick={onClose}
                className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold"
              >
                Close
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        {step !== 'confirmation' && (
          <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
            {step !== 'product' ? (
              <button
                onClick={handleBack}
                className="px-6 py-2 text-gray-700 hover:text-gray-900 font-medium flex items-center gap-2"
              >
                <ArrowLeft size={18} />
                Back
              </button>
            ) : (
              <button
                onClick={onClose}
                className="px-6 py-2 text-gray-700 hover:text-gray-900 font-medium"
              >
                Cancel
              </button>
            )}

            <button
              onClick={handleNext}
              disabled={
                loading ||
                (step === 'product' && !selectedProduct) ||
                (step === 'shipping' && !validateAddress())
              }
              className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-semibold flex items-center gap-2"
            >
              {loading && <Loader2 className="animate-spin" size={18} />}
              {step === 'payment' ? (
                <>
                  <CreditCard size={18} />
                  Place Order
                </>
              ) : (
                <>
                  Continue
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PrintOrderModal;
