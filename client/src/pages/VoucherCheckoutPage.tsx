import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { ArrowLeft, Calendar, Clock, Users, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import VoucherPersonalization from '@/components/VoucherPersonalization';
import { SITE } from '../config/site';
import { useLanguage } from '../context/LanguageContext';
import { useStudioCurrency } from '../hooks/useStudioCurrency';

// Make sure to call `loadStripe` outside of a component's render to avoid
// recreating the `Stripe` object on every render.
const STRIPE_PUBLIC_KEY = import.meta.env.VITE_STRIPE_PUBLIC_KEY;

// Only load Stripe if we have a valid key
const stripePromise = STRIPE_PUBLIC_KEY ? loadStripe(STRIPE_PUBLIC_KEY) : null;

interface VoucherProduct {
  id: string;
  name: string;
  description: string;
  price: string;
  originalPrice?: string;
  imageUrl: string;
  sessionDuration: number;
  validityPeriod: number;
  termsAndConditions?: string;
}

interface PersonalizationData {
  designType: 'none' | 'birthday' | 'christmas' | 'mothers-day' | 'fathers-day' | 'custom';
  customPhoto?: File;
  message?: string;
  recipientName?: string;
}

const CheckoutForm: React.FC<{ voucher: VoucherProduct }> = ({ voucher }) => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const de = language === 'de';
  const { format: money } = useStudioCurrency();
  const [isProcessing, setIsProcessing] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [personalization, setPersonalization] = useState<PersonalizationData>({ designType: 'none' });
  const [customerDetails, setCustomerDetails] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: ''
  });

  const totalPrice = parseFloat(voucher.price) * quantity;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    if (!acceptedTerms) {
      toast({
        title: de ? "Geschäftsbedingungen erforderlich" : "Terms and conditions required",
        description: de ? "Bitte akzeptieren Sie die Geschäftsbedingungen um fortzufahren." : "Please accept the terms and conditions to continue.",
        variant: "destructive",
      });
      return;
    }

    if (!customerDetails.firstName || !customerDetails.lastName || !customerDetails.email) {
      toast({
        title: de ? "Fehlende Informationen" : "Missing information",
        description: de ? "Bitte füllen Sie alle erforderlichen Felder aus." : "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      // Create payment intent for voucher purchase
      const response = await fetch('/api/vouchers/create-payment-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          voucherId: voucher.id,
          quantity,
          customerDetails,
          personalization,
          amount: Math.round(totalPrice * 100) // Convert to cents
        })
      });

      const { clientSecret } = await response.json();

      const { error } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement)!,
          billing_details: {
            name: `${customerDetails.firstName} ${customerDetails.lastName}`,
            email: customerDetails.email,
            phone: customerDetails.phone,
          },
        }
      });

      if (error) {
        toast({
          title: de ? "Zahlung fehlgeschlagen" : "Payment failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: de ? "Zahlung erfolgreich" : "Payment successful",
          description: de ? "Ihr Gutschein wird per E-Mail versendet!" : "Your voucher will be sent by email!",
        });
        navigate('/vouchers/success');
      }
    } catch (error: any) {
      toast({
        title: de ? "Fehler" : "Error",
        description: error.message || (de ? "Ein Fehler ist aufgetreten" : "An error occurred"),
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Customer Details */}
      <div className="bg-white rounded-lg p-6 shadow-sm border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{de ? 'Ihre Kontaktdaten' : 'Your contact details'}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="firstName">{de ? 'Vorname *' : 'First name *'}</Label>
            <Input
              id="firstName"
              type="text"
              value={customerDetails.firstName}
              onChange={(e) => setCustomerDetails({...customerDetails, firstName: e.target.value})}
              required
            />
          </div>
          <div>
            <Label htmlFor="lastName">{de ? 'Nachname *' : 'Last name *'}</Label>
            <Input
              id="lastName"
              type="text"
              value={customerDetails.lastName}
              onChange={(e) => setCustomerDetails({...customerDetails, lastName: e.target.value})}
              required
            />
          </div>
          <div>
            <Label htmlFor="email">{de ? 'E-Mail *' : 'Email *'}</Label>
            <Input
              id="email"
              type="email"
              value={customerDetails.email}
              onChange={(e) => setCustomerDetails({...customerDetails, email: e.target.value})}
              required
            />
          </div>
          <div>
            <Label htmlFor="phone">{de ? 'Telefon' : 'Phone'}</Label>
            <Input
              id="phone"
              type="tel"
              value={customerDetails.phone}
              onChange={(e) => setCustomerDetails({...customerDetails, phone: e.target.value})}
            />
          </div>
        </div>
      </div>

      {/* Quantity Selection */}
      <div className="bg-white rounded-lg p-6 shadow-sm border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{de ? 'Anzahl' : 'Quantity'}</h3>
        <div className="flex items-center space-x-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
            disabled={quantity <= 1}
          >
            -
          </Button>
          <span className="text-xl font-semibold">{quantity}</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setQuantity(quantity + 1)}
          >
            +
          </Button>
        </div>
      </div>

      {/* Voucher Personalization */}
      <VoucherPersonalization 
        onPersonalizationChange={setPersonalization}
        initialData={personalization}
      />

      {/* Payment Details */}
      <div className="bg-white rounded-lg p-6 shadow-sm border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{de ? 'Zahlungsinformationen' : 'Payment details'}</h3>
        <div className="p-4 border rounded-lg">
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: '16px',
                  color: '#424770',
                  '::placeholder': {
                    color: '#aab7c4',
                  },
                },
              },
            }}
          />
        </div>
      </div>

      {/* Terms and Conditions */}
      <div className="flex items-start space-x-3">
        <Checkbox
          id="terms"
          checked={acceptedTerms}
          onCheckedChange={(checked) => setAcceptedTerms(checked as boolean)}
        />
        <Label htmlFor="terms" className="text-sm text-gray-600 leading-relaxed">
          {de ? (
            <>
              Ich habe die <a href="#" className="text-purple-600 hover:underline">Geschäftsbedingungen</a> gelesen und akzeptiere sie.
              Der Gutschein ist {voucher.validityPeriod} Tage gültig und nicht erstattungsfähig.
            </>
          ) : (
            <>
              I have read and accept the <a href="#" className="text-purple-600 hover:underline">terms and conditions</a>.
              The voucher is valid for {voucher.validityPeriod} days and is non-refundable.
            </>
          )}
        </Label>
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={!stripe || isProcessing || !acceptedTerms}
        className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 text-lg font-semibold"
      >
        {isProcessing ? (
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            <span>{de ? 'Wird verarbeitet...' : 'Processing...'}</span>
          </div>
        ) : (
          `${de ? 'Jetzt kaufen' : 'Buy now'} - ${money(totalPrice)}`
        )}
      </Button>
    </form>
  );
};

const VoucherCheckoutPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const de = language === 'de';
  const { format: money } = useStudioCurrency();
  // The studio's own address as one line; empty when unset, which hides the block.
  const studioAddress = [SITE.address.street, SITE.address.postalCode, SITE.address.city, SITE.address.country]
    .filter(Boolean)
    .join(', ');
  const [voucher, setVoucher] = useState<VoucherProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchVoucher = async () => {
      try {
        // console.log removed
        const response = await fetch(`/api/vouchers/products/${id}`);
        // console.log removed
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        // console.log removed
        setVoucher(data);
      } catch (err: any) {
        // console.error removed
        setError(err.message || 'Gutschein nicht gefunden');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchVoucher();
    } else {
      setError('Keine Gutschein-ID gefunden');
      setLoading(false);
    }
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (error || !voucher) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">{de ? 'Gutschein nicht gefunden' : 'Voucher not found'}</h1>
          <Button onClick={() => navigate('/vouchers')} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {de ? 'Zurück zu den Gutscheinen' : 'Back to vouchers'}
          </Button>
        </div>
      </div>
    );
  }

  // Check if Stripe is available
  if (!stripePromise) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            {de ? 'Zahlungssystem wird eingerichtet' : 'Payment system is being set up'}
          </h1>
          <p className="text-gray-600 mb-4">
            {de ? 'Unser Zahlungssystem wird gerade konfiguriert. Bitte versuchen Sie es später noch einmal oder kontaktieren Sie uns direkt.' : 'Our payment system is currently being configured. Please try again later or contact us directly.'}
          </p>
          <Button onClick={() => navigate('/vouchers')} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {de ? 'Zurück zu den Gutscheinen' : 'Back to vouchers'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <img 
                src="/company-logo.svg" 
                alt={`${SITE.name} Logo`}
                className="h-8 w-auto mr-3"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = "/logo.png"; // Fallback to PNG version
                }}
              />
              {/* Was the literal "NEW AGE FOTOGRAFIE", at the top of the page where a
                  customer enters their card details — the single worst place in the product
                  to name a different business. SITE.name is already imported and used
                  throughout this file. */}
              <span className="text-xl font-bold text-gray-900">{SITE.name}</span>
            </div>
            <Button
              variant="ghost"
              onClick={() => navigate('/vouchers')}
              className="text-purple-600 hover:text-purple-700"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {de ? 'Zurück zu den Gutscheinen' : 'Back to vouchers'}
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Voucher Details */}
          <div>
            <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
              <div className="aspect-w-16 aspect-h-10">
                <img
                  src={voucher.imageUrl}
                  alt={voucher.name}
                  className="w-full h-64 object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = '/placeholder-voucher.jpg';
                  }}
                />
              </div>
              <div className="p-6">
                <div className="flex items-center space-x-2 mb-3">
                  <span className="bg-purple-100 text-purple-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                    {de ? 'FOTOSHOOTING' : 'PHOTO SHOOT'}
                  </span>
                </div>
                
                <h1 className="text-2xl font-bold text-gray-900 mb-3">{voucher.name}</h1>
                
                <div className="flex items-center space-x-4 text-sm text-gray-600 mb-4">
                  <div className="flex items-center space-x-1">
                    <Calendar className="w-4 h-4" />
                    <span>{de ? 'Gültig bis' : 'Valid until'} {new Date(Date.now() + voucher.validityPeriod * 24 * 60 * 60 * 1000).toLocaleDateString(de ? 'de-DE' : 'en-GB')}</span>
                  </div>
                  {voucher.sessionDuration && (
                    <div className="flex items-center space-x-1">
                      <Clock className="w-4 h-4" />
                      <span>{voucher.sessionDuration} {de ? 'Min.' : 'min'}</span>
                    </div>
                  )}
                </div>

                <div className="mb-6">
                  {voucher.originalPrice && (
                    <span className="text-lg text-gray-400 line-through mr-2">{money(voucher.originalPrice)}</span>
                  )}
                  <span className="text-3xl font-bold text-purple-600">{money(voucher.price)}</span>
                </div>

                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
                  <div className="flex items-center mb-2">
                    <img 
                      src="/company-logo.svg" 
                      alt={`${SITE.name} Logo`}
                      className="h-8 w-auto mr-3"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = "/logo.png"; // Fallback to PNG version
                      }}
                    />
                    <h3 className="font-semibold text-purple-900">{de ? 'Anbieter' : 'Provider'}: {SITE.name}</h3>
                  </div>
                  {/* Removed: "Noch 25 Gutscheine" / "25 vouchers left". The 25 was a
                      literal. Nothing counts voucher stock, so it was an invented scarcity
                      claim made to a buyer at the moment they decide to pay — and made in
                      the studio's name, not ours. There is no honest version of it without
                      a real inventory, so it is gone rather than parameterised.

                      Also removed the "Wien, Austria" line beneath it. The studio's own
                      service area, or nothing. */}
                  {SITE.address.city && (
                    <p className="text-xs text-purple-700">
                      {de ? `Fotostudio • ${SITE.address.city}` : `Photography studio • ${SITE.address.city}`}
                    </p>
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2 flex items-center">
                      <Check className="w-4 h-4 mr-2 text-green-600" />
                      {de ? 'Geschäftsbedingungen' : 'Terms and conditions'}
                    </h3>
                    <div className="text-sm text-gray-600 whitespace-pre-line">
                      {voucher.description}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Studio location — the studio's OWN address, hidden when it hasn't set
                one. This block hardcoded Wehrgasse 11A / 1050 Wien, its landmarks
                ("corner of Schönbrunnerstraße", "5 minutes from Kettenbrückengasse")
                and a fixed map pin, shown to every studio's paying customers. */}
            {studioAddress && (
              <div className="mt-6 bg-white rounded-lg shadow-sm border p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">{de ? 'Studio Standort' : 'Studio location'}</h3>
                <div className="space-y-2 mb-4">
                  <p className="text-gray-600">{studioAddress}</p>
                </div>

                <div className="rounded-lg overflow-hidden border">
                  <iframe
                    src={`https://www.google.com/maps?q=${encodeURIComponent(studioAddress)}&output=embed`}
                    width="100%"
                    height="200"
                    style={{ border: 0 }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    title={`${SITE.name} — ${studioAddress}`}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Checkout Form */}
          <div>
            <Elements stripe={stripePromise}>
              <CheckoutForm voucher={voucher} />
            </Elements>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VoucherCheckoutPage;