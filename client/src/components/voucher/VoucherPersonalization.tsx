import React, { useState, useEffect } from 'react';
import { Upload, Check, ChevronRight, ChevronLeft, Camera, Eye, Download, ArrowLeft } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { SITE } from '../../config/site';

interface DeliveryOption {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  detailedDescription?: string;
  isSelected?: boolean;
}

interface DesignTemplate {
  id: string;
  name: string;
  category: string;
  image: string;
  occasion: string;
}

interface VoucherPersonalizationProps {
  onComplete: (personalization: VoucherPersonalizationData) => void;
  voucherAmount: number;
  onBack?: () => void;
}

export interface VoucherPersonalizationData {
  deliveryOption: DeliveryOption;
  selectedDesign?: DesignTemplate;
  customPhoto?: File;
  customImageUrl?: string;
  personalMessage: string;
  recipientName?: string;
  senderName?: string;
  /** Gift: hide the price ("Wert") on the generated voucher PDF. */
  hideValue?: boolean;
  shippingAddress?: {
    address1: string;
    address2?: string;
    city: string;
    zip: string;
    country: string;
  };
}

const VoucherPersonalization: React.FC<VoucherPersonalizationProps> = ({ 
  onComplete, 
  voucherAmount,
  onBack 
}) => {
  const { language } = useLanguage();
  const [currentStep, setCurrentStep] = useState(1);

  // A fixed summary bar is shown at the bottom on steps 1-3; signal the global
  // WhatsApp button to hide so the two don't overlap in the same mobile corner.
  useEffect(() => {
    const showsFixedBar = currentStep !== 4;
    document.body.setAttribute('data-hide-whatsapp', showsFixedBar ? '1' : '0');
    window.dispatchEvent(new CustomEvent('whatsapp-visibility'));
    return () => {
      document.body.removeAttribute('data-hide-whatsapp');
      window.dispatchEvent(new CustomEvent('whatsapp-visibility'));
    };
  }, [currentStep]);

  const [selectedDelivery, setSelectedDelivery] = useState<DeliveryOption | null>(null);
  const [selectedDesign, setSelectedDesign] = useState<DesignTemplate | null>(null);
  const [customPhoto, setCustomPhoto] = useState<File | null>(null);
  const [customImageUrl, setCustomImageUrl] = useState<string | undefined>(undefined);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [designTemplates, setDesignTemplates] = useState<DesignTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [personalMessage, setPersonalMessage] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [senderName, setSenderName] = useState('');
  const [hideValue, setHideValue] = useState(false);
  const [shippingAddress, setShippingAddress] = useState({
    address1: '',
    address2: '',
    city: '',
    zip: '',
    country: 'AT',
  });
  const [addressTouched, setAddressTouched] = useState(false);

  // Translations
  const t = {
    back: language === 'en' ? 'Back' : 'Zurück',
    next: language === 'en' ? 'Next' : 'Weiter',
    step1Title: language === 'en' ? 'Select Delivery' : 'Versandart wählen',
    step2Title: language === 'en' ? 'Choose Design / Upload Photo' : 'Motiv wählen / Foto hochladen',
    step3Title: language === 'en' ? 'Personal Message' : 'Persönliche Widmung',
    step4Title: language === 'en' ? 'Preview & Checkout' : 'Vorschau & Kasse',
    previewTitle: language === 'en' ? 'Voucher Preview' : 'Gutschein Vorschau',
    previewSubtitle: language === 'en' ? 'This is how your personalized voucher will look. Please check all details before payment.' : 'So wird Ihr personalisierter Gutschein aussehen. Bitte überprüfen Sie alle Details vor der Zahlung.',
    showPreview: language === 'en' ? 'Show Preview' : 'Vorschau anzeigen',
    backToEdit: language === 'en' ? 'Back to edit' : 'Zurück bearbeiten',
    payNow: language === 'en' ? 'Pay now & receive voucher' : 'Jetzt bezahlen & Gutschein erhalten',
    afterPayment: language === 'en' ? 'After successful payment, you can download your voucher as PDF.' : 'Nach erfolgreicher Zahlung können Sie Ihren Gutschein als PDF herunterladen.',
    recipientLabel: language === 'en' ? 'Recipient Name (optional)' : 'Empfänger Name (optional)',
    recipientPlaceholder: language === 'en' ? 'Who is this voucher for?' : 'Für wen ist dieser Gutschein?',
    messageLabel: language === 'en' ? 'Personal Message (optional)' : 'Persönliche Nachricht (optional)',
    messagePlaceholder: language === 'en' ? 'Enter your message...' : 'Widmung eingeben...',
    senderLabel: language === 'en' ? 'Your Name (optional)' : 'Ihr Name (optional)',
    senderPlaceholder: language === 'en' ? 'Who is this voucher from?' : 'Von wem ist dieser Gutschein?',
    characters: language === 'en' ? 'characters' : 'Zeichen',
    searchPhoto: language === 'en' ? 'Search Photo' : 'Foto suchen',
    uploadPhotoHint: language === 'en' ? 'Click here to upload your own photo' : 'Klicken Sie hier, um Ihr eigenes Foto hochzuladen',
    validUntil: language === 'en' ? 'Valid until' : 'Gültig bis',
    monthsFromPurchase: language === 'en' ? '12 months from purchase date' : '12 Monate ab Kaufdatum',
    recipient: language === 'en' ? 'Recipient' : 'Empfänger/in',
    from: language === 'en' ? 'From' : 'Von',
    subtotal: language === 'en' ? 'Subtotal' : 'Zwischensumme',
    shipping: language === 'en' ? 'Shipping' : 'Versand',
    fotoshootingVoucher: language === 'en' ? 'Photoshoot Voucher' : 'Fotoshooting Gutschein',
    ownPhoto: language === 'en' ? 'Own Photo' : 'Eigenes Foto',
    voucher: language === 'en' ? 'Voucher' : 'Gutschein',
  };

  // Fetch design templates from API
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/vouchers/templates');
        if (res.ok && !cancelled) {
          const data = await res.json();
          setDesignTemplates(data);
        }
      } catch (e) {
        console.error('Failed to fetch design templates:', e);
      }
      if (!cancelled) setTemplatesLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const deliveryOptions: DeliveryOption[] = [
    {
      id: 'pdf',
      name: language === 'en' ? 'PDF Delivery' : 'PDF Versand',
      description: language === 'en' ? 'Free' : 'Kostenlos',
      price: 0,
      image: 'https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=400&h=300&fit=crop',
      detailedDescription: language === 'en' ? 'Download and print instantly' : 'Sofort downloaden und ausdrucken'
    },
    {
      id: 'post-standard',
      name: 'POST Standard',
      description: '4,49 €',
      price: 4.49,
      image: 'https://images.unsplash.com/photo-1566125882500-87e10f726cdc?w=400&h=300&fit=crop',
      detailedDescription: language === 'en' ? 'Colour print on 200g paper | Postal delivery (3–5 business days)' : 'Farbdruck auf 200g Papier | Versand per Post (3-5 Werktage)'
    },
    {
      id: 'post-premium',
      name: 'POST Premium',
      description: '6,49 €',
      price: 6.49,
      image: 'https://i.postimg.cc/RZ7PBrvT/firstvoucher-lettershop-premium.webp',
      detailedDescription: language === 'en' ? 'Colour print on premium 300g paper incl. matching envelope | Postal delivery (3–5 business days)' : 'Farbdruck auf hochwertigem 300g Papier inkl. passendem Umschlag | Versand per Post (3-5 Werktage)'
    },
    {
      id: 'post-geschenkbox',
      name: language === 'en' ? 'POST Gift Box' : 'POST Geschenkbox',
      description: '34,95 €',
      price: 34.95,
      image: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=400&h=300&fit=crop',
      detailedDescription: language === 'en' ? 'Premium voucher in a gift box | Premium soap (250 ml) & premium chocolates | Postal delivery (3–5 business days) – Free shipping within Austria' : 'Premium-Gutschein in Geschenkbox | Premium-Seife (250 ml) & Premium-Schokoladen | Versand per Post (3-5 Werktage) - Kostenloser Versand innerhalb Österreichs'
    }
  ];

  // Derive categories from fetched templates
  const templateCategories = Array.from(new Set(designTemplates.map(t => t.category)));
  const filteredTemplates = selectedCategory === 'all'
    ? designTemplates
    : designTemplates.filter(t => t.category === selectedCategory);

  const handleDeliverySelect = (delivery: DeliveryOption) => {
    setSelectedDelivery(delivery);
    // Allow all delivery options to proceed to design selection
    setCurrentStep(2);
  };

  const handleDesignSelect = (design: DesignTemplate) => {
    setSelectedDesign(design);
    setCustomPhoto(null);
  };

  // Downscale large images in the browser before upload so big phone/Facebook
  // photos don't exceed the server's request timeout; on any failure (e.g. an
  // undecodable format) fall back to the original file untouched.
  const downscaleImage = async (file: File, maxDim = 2400, quality = 0.85): Promise<Blob> => {
    try {
      if (!file.type.startsWith('image/')) return file;
      const bitmap = await createImageBitmap(file);
      const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
      if (scale >= 1 && file.size < 4 * 1024 * 1024) { bitmap.close?.(); return file; }
      const w = Math.round(bitmap.width * scale), h = Math.round(bitmap.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) { bitmap.close?.(); return file; }
      ctx.drawImage(bitmap, 0, 0, w, h);
      bitmap.close?.();
      const blob: Blob | null = await new Promise((res) => canvas.toBlob((b) => res(b), 'image/jpeg', quality));
      return blob || file;
    } catch {
      return file;
    }
  };

  const handleCustomPhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setCustomPhoto(file);
    setSelectedDesign(null);
    // Upload immediately so we have a URL for backend PDF rendering.
    (async () => {
      setUploading(true);
      setUploadError(null);
      try {
        const blob = await downscaleImage(file);
        const form = new FormData();
        form.append('image', blob, (file.name.replace(/\.[^.]+$/, '') || 'photo') + '.jpg');
        const resp = await fetch('/api/vouchers/upload-photo', { method: 'POST', body: form });
        // The API always replies with JSON. Anything else (a timeout/proxy HTML
        // page or a 5xx error page) means the upload didn't complete — surface a
        // clear message instead of a raw "Unexpected token '<'" JSON-parse error.
        const contentType = resp.headers.get('content-type') || '';
        if (!resp.ok || !contentType.includes('application/json')) {
          if (resp.status === 413) {
            throw new Error(language === 'en' ? 'Image too large — please use a photo under 20 MB.' : 'Bild zu groß – bitte ein Foto unter 20 MB verwenden.');
          }
          throw new Error(language === 'en' ? `Upload failed (server ${resp.status}). Please try again or use a smaller image.` : `Upload fehlgeschlagen (Server ${resp.status}). Bitte erneut versuchen oder ein kleineres Bild verwenden.`);
        }
        const data = await resp.json();
        if (!data?.success || !data?.url) {
          throw new Error(data?.error || (language === 'en' ? 'Upload failed' : 'Upload fehlgeschlagen'));
        }
        setCustomImageUrl(data.url);
      } catch (e: any) {
        setUploadError(e?.message || (language === 'en' ? 'Upload failed. Please try again.' : 'Upload fehlgeschlagen. Bitte erneut versuchen.'));
      } finally {
        setUploading(false);
      }
    })();
  };

  const handleComplete = () => {
    if (selectedDelivery) {
      const needsShipping = selectedDelivery.price > 0 || selectedDelivery.id.startsWith('post-');
      if (needsShipping) {
        setAddressTouched(true);
        const ok = shippingAddress.address1.trim() && shippingAddress.city.trim() && shippingAddress.zip.trim() && shippingAddress.country.trim();
        if (!ok) return;
      }
      const personalizationData: VoucherPersonalizationData = {
        deliveryOption: selectedDelivery,
        selectedDesign: selectedDesign || undefined,
        customPhoto: customPhoto || undefined,
        customImageUrl: customImageUrl || undefined,
        personalMessage,
        recipientName,
        senderName,
        hideValue,
        shippingAddress: (selectedDelivery.price > 0 || selectedDelivery.id.startsWith('post-')) ? {
          address1: shippingAddress.address1.trim(),
          address2: shippingAddress.address2?.trim() || undefined,
          city: shippingAddress.city.trim(),
          zip: shippingAddress.zip.trim(),
          country: shippingAddress.country.trim() || 'AT',
        } : undefined,
      };
      onComplete(personalizationData);
    }
  };

  // Express path: a self-buyer (not a gift) skips design/photo/message and goes
  // straight to checkout with the free PDF voucher.
  const handleExpressBuy = () => {
    const pdf = deliveryOptions.find((o) => o.id === 'pdf') || deliveryOptions[0];
    onComplete({
      deliveryOption: pdf,
      personalMessage: '',
      recipientName: '',
      senderName: '',
    } as VoucherPersonalizationData);
  };

  const isStepComplete = (step: number): boolean => {
    switch (step) {
      case 1:
        return selectedDelivery !== null;
      case 2:
        return selectedDesign !== null || customPhoto !== null;
      case 3:
        // Personal message is OPTIONAL — a self-buyer shouldn't be forced to
        // write a gift note to reach payment.
        return true;
      case 4:
        return false; // Preview step - always show as current until checkout
      default:
        return false;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white">
      {/* Progress Steps */}
      <div className="flex items-center justify-center mb-8">
        {[1, 2, 3, 4].map((step) => (
          <div key={step} className="flex items-center">
            <div className={`
              w-10 h-10 rounded-full flex items-center justify-center text-white font-bold
              ${currentStep === step ? 'bg-blue-600' : 
                isStepComplete(step) ? 'bg-green-500' : 'bg-gray-300'}
            `}>
              {isStepComplete(step) ? <Check size={20} /> : step}
            </div>
            <div className="ml-3 mr-6">
              <p className={`font-medium ${currentStep === step ? 'text-blue-600' : 'text-gray-500'}`}>
                {step === 1 && t.step1Title}
                {step === 2 && t.step2Title}
                {step === 3 && t.step3Title}
                {step === 4 && t.step4Title}
              </p>
            </div>
            {step < 4 && (
              <ChevronRight className="text-gray-400 mr-6" size={20} />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Delivery Options */}
      {currentStep === 1 && (
        <div>
          {onBack && (() => {
            // Visitors arriving from a landing-page offer (?offer=… / ?amount=…)
            // never saw a cart — "Back to Cart" would be wrong.
            const params = (() => {
              try { return new URLSearchParams(window.location.search); } catch { return null; }
            })();
            const cameFromOffer = !!params && (params.has('offer') || params.has('amount'));
            // Explicit return URL from the landing page (?from=/lp/slug). Internal
            // paths only — never follow an absolute/protocol-relative URL.
            const returnTo = (() => {
              const f = params?.get('from') || '';
              return f.startsWith('/') && !f.startsWith('//') ? f : null;
            })();

            const handleBack = () => {
              if (returnTo) { window.location.assign(returnTo); return; }
              if (cameFromOffer) {
                // history.back() is a no-op on a direct load/refresh — fall back
                // to the vouchers page so the button always does something.
                if (window.history.length > 1) window.history.back();
                else window.location.assign('/vouchers');
                return;
              }
              onBack();
            };

            return (
              <button
                type="button"
                onClick={handleBack}
                className="flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-4"
              >
                <ArrowLeft size={20} />
                <span>
                  {cameFromOffer
                    ? (language === 'en' ? 'Back to offer' : 'Zurück zum Angebot')
                    : (language === 'en' ? 'Back to Cart' : 'Zurück zum Warenkorb')}
                </span>
              </button>
            );
          })()}
          {/* Express path — self-buyers skip the gift personalisation entirely. */}
          <div className="mb-6 rounded-xl border border-purple-200 bg-purple-50 p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-sm text-gray-700">
              <strong>{language === 'en' ? 'Just buying for yourself?' : 'Kaufen Sie für sich selbst?'}</strong>{' '}
              {language === 'en'
                ? 'Skip the gift personalisation and check out with a PDF voucher.'
                : 'Überspringen Sie die Geschenk-Personalisierung und kaufen Sie direkt einen PDF-Gutschein.'}
            </p>
            <button
              type="button"
              onClick={handleExpressBuy}
              className="whitespace-nowrap rounded-full bg-purple-600 px-5 py-2.5 font-semibold text-white transition-colors hover:bg-purple-700"
            >
              {language === 'en' ? 'Skip to checkout →' : 'Direkt zur Kasse →'}
            </button>
          </div>
          <h2 className="text-2xl font-bold mb-6 text-center">{t.step1Title}</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {deliveryOptions.map((option) => (
              <div
                key={option.id}
                onClick={() => handleDeliverySelect(option)}
                className={`
                  border-2 rounded-lg p-4 cursor-pointer transition-all hover:shadow-lg
                  ${selectedDelivery?.id === option.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}
                `}
              >
                <div className="h-32 bg-gray-100 rounded-lg mb-3 flex items-center justify-center">
                  <img 
                    src={option.image} 
                    alt={option.name}
                    className="max-h-full max-w-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                      (e.target as HTMLImageElement).parentElement!.innerHTML = `
                        <div class="text-gray-400 text-center">
                          <div class="text-2xl mb-2">📦</div>
                          <div class="text-sm">${option.name}</div>
                        </div>
                      `;
                    }}
                  />
                </div>
                <h3 className="font-semibold text-center">{option.name}</h3>
                <p className="text-center text-gray-600">{option.description}</p>
                {option.detailedDescription && (
                  <p className="text-center text-sm text-gray-500 mt-1">{option.detailedDescription}</p>
                )}
                {selectedDelivery?.id === option.id && (
                  <div className="flex justify-center mt-2">
                    <Check className="text-blue-500" size={20} />
                  </div>
                )}
              </div>
            ))}
          </div>
          {selectedDelivery && (
            <div className="text-center mt-6">
              <button
                onClick={() => setCurrentStep(2)}
                className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                {language === 'en' ? 'Continue to design' : 'weiter zur Gestaltung'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Design/Photo Selection */}
      {currentStep === 2 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column: Design Selection */}
          <div>
            <button
              onClick={() => setCurrentStep(1)}
              className="flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-4"
            >
              <ArrowLeft size={20} />
              <span>{t.back}</span>
            </button>
            <h2 className="text-2xl font-bold mb-6 text-center">{t.step2Title}</h2>
            
            {/* Custom Photo Upload */}
            <div className="mb-8">
              <label className="block w-full">
                <div className={`
                  border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all
                  ${customPhoto ? 'border-green-500 bg-green-50' : 'border-blue-500 bg-blue-50'}
                  hover:bg-blue-100
                `}>
                  <Camera size={48} className="mx-auto mb-4 text-blue-500" />
                  <p className="text-lg font-semibold text-blue-600 mb-2">{t.searchPhoto}</p>
                  <p className="text-gray-600">{t.uploadPhotoHint}</p>
                  {uploading && (
                    <p className="text-blue-600 mt-2 font-semibold">{language === 'en' ? 'Uploading...' : 'Hochladen...'}</p>
                  )}
                  {customPhoto && !uploading && (
                    <p className="text-green-600 mt-2 font-semibold">
                      ✓ {customPhoto.name} {language === 'en' ? 'selected' : 'ausgewählt'}
                    </p>
                  )}
                  {uploadError && (
                    <p className="text-red-600 mt-2">{uploadError}</p>
                  )}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleCustomPhotoUpload}
                  className="hidden"
                />
              </label>
            </div>

            {/* Category Filter Tabs */}
            {templateCategories.length > 1 && (
              <div className="flex flex-wrap gap-2 mb-4">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                    selectedCategory === 'all'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {language === 'en' ? 'All' : 'Alle'}
                </button>
                {templateCategories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 text-sm rounded-full transition-colors capitalize ${
                      selectedCategory === cat
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {cat.replace(/-/g, ' ')}
                  </button>
                ))}
              </div>
            )}

            {/* Design Templates Grid */}
            {templatesLoading ? (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <div key={i} className="border-2 border-gray-200 rounded-lg overflow-hidden animate-pulse">
                    <div className="aspect-square bg-gray-200" />
                    <div className="p-2"><div className="h-4 bg-gray-200 rounded w-3/4 mx-auto" /></div>
                  </div>
                ))}
              </div>
            ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              {filteredTemplates.map((template) => (
                <div
                  key={template.id}
                  onClick={() => handleDesignSelect(template)}
                  className={`
                    border-2 rounded-lg cursor-pointer transition-all hover:shadow-lg
                    ${selectedDesign?.id === template.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}
                  `}
                >
                  <div className="aspect-square bg-gray-100 rounded-t-lg overflow-hidden">
                    <img 
                      src={template.image} 
                      alt={template.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                        (e.target as HTMLImageElement).parentElement!.innerHTML = `
                          <div class="w-full h-full flex items-center justify-center text-gray-400">
                            <div class="text-center">
                              <div class="text-2xl mb-1">🎨</div>
                              <div class="text-xs">${template.occasion}</div>
                            </div>
                          </div>
                        `;
                      }}
                    />
                  </div>
                  <div className="p-2 text-center">
                    <p className="text-sm font-medium">{template.occasion}</p>
                  </div>
                  {selectedDesign?.id === template.id && (
                    <div className="flex justify-center pb-2">
                      <Check className="text-blue-500" size={16} />
                    </div>
                  )}
                </div>
              ))}
            </div>
            )}
          </div>

          {/* Right Column: Voucher Preview */}
          <div className="lg:pl-8">
            <h3 className="text-xl font-bold mb-6 text-center">{language === 'en' ? 'Preview' : 'Vorschau'}</h3>
            
            {(selectedDesign || customPhoto) ? (
              <div className="relative">
                {/* Animated Voucher Preview */}
                <div className="bg-white rounded-lg shadow-xl p-6 mb-6 transform transition-all duration-500 hover:scale-105">
                  <div className="relative overflow-hidden rounded-lg">
                    {/* Main Voucher Image */}
                    <div className="h-64 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg mb-4 flex items-center justify-center relative">
                      {selectedDesign ? (
                        <img 
                          src={selectedDesign.image} 
                          alt={selectedDesign.name}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : customPhoto ? (
                        <img 
                          src={URL.createObjectURL(customPhoto)} 
                          alt="Custom uploaded photo"
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : null}
                      
                      {/* Voucher Overlay */}
                      <div className="absolute inset-0 bg-black bg-opacity-20 rounded-lg flex items-center justify-center">
                        <div className="text-white text-center">
                          <h4 className="text-2xl font-bold mb-2">{t.voucher}</h4>
                          <p className="text-lg">{selectedDesign?.occasion || t.ownPhoto}</p>
                        </div>
                      </div>
                    </div>

                    {/* Voucher Details */}
                    <div className="bg-white p-4 rounded-lg border-t-4 border-blue-500">
                      <div className="flex justify-between items-center mb-3">
                        <div>
                          <h5 className="font-bold text-lg">{t.fotoshootingVoucher}</h5>
                          <p className="text-gray-600 text-sm">{language === 'en' ? '1 person, approx. 30 min' : '1 Person, ca. 30 min'}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-blue-600">{voucherAmount},00 €</p>
                        </div>
                      </div>
                      
                      <div className="border-t pt-3">
                        <p className="text-xs text-gray-500 mb-2">{language === 'en' ? 'Redeemable until: 2 years from purchase date' : 'Einlösbar bis: 2 Jahre ab Kaufdatum'}</p>
                        <div className="bg-gray-100 p-2 rounded text-center">
                          <p className="text-xs font-mono">DEMO-GUTSCHEIN-2024</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Continue Button */}
                <div className="text-center">
                  <button
                    onClick={() => setCurrentStep(3)}
                    className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors w-full lg:w-auto"
                  >
                    {language === 'en' ? 'Add a personal message' : 'Persönliche Nachricht hinzufügen'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center p-12 border-2 border-dashed border-gray-300 rounded-lg">
                <div className="text-gray-400 mb-4">
                  <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-gray-500">{language === 'en' ? 'Select a design or upload a photo to see a preview' : 'Wählen Sie ein Design oder laden Sie ein Foto hoch, um eine Vorschau zu sehen'}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step 3: Personal Message */}
      {currentStep === 3 && (
        <div>
          <button
            onClick={() => setCurrentStep(2)}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-4"
          >
            <ArrowLeft size={20} />
            <span>{t.back}</span>
          </button>
          <h2 className="text-2xl font-bold mb-6 text-center">{t.step3Title}</h2>
          
          <div className="max-w-2xl mx-auto space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t.recipientLabel}
              </label>
              <input
                type="text"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                placeholder={t.recipientPlaceholder}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t.messageLabel}
              </label>
              <textarea
                value={personalMessage}
                onChange={(e) => setPersonalMessage(e.target.value)}
                placeholder={t.messagePlaceholder}
                rows={6}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
              <p className="text-sm text-gray-500 mt-1">
                {personalMessage.length}/500 {t.characters}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t.senderLabel}
              </label>
              <input
                type="text"
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                placeholder={t.senderPlaceholder}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Gift: hide the price on the printed voucher so the recipient never sees it. */}
            <label className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 bg-gray-50 cursor-pointer">
              <input
                type="checkbox"
                checked={hideValue}
                onChange={(e) => setHideValue(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">
                <span className="font-medium">
                  {language === 'en' ? 'This is a gift — hide the price on the voucher' : 'Dies ist ein Geschenk – Preis auf dem Gutschein ausblenden'}
                </span>
                <span className="block text-gray-500">
                  {language === 'en'
                    ? 'The “Value” line is removed so the recipient won’t see what was paid.'
                    : 'Die Zeile „Wert“ wird entfernt, damit der/die Beschenkte den bezahlten Betrag nicht sieht.'}
                </span>
              </span>
            </label>

            {/* Shipping Address for postal delivery */}
            {selectedDelivery && (selectedDelivery.price > 0 || selectedDelivery.id.startsWith('post-')) && (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold">{language === 'en' ? 'Delivery Address' : 'Lieferadresse'}</h3>
                <p className="text-sm text-gray-600">{language === 'en' ? 'Please enter the postal address for shipping the voucher.' : 'Bitte geben Sie die Postadresse für den Versand des Gutscheins ein.'}</p>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{language === 'en' ? 'Street and house number *' : 'Straße und Hausnummer *'}</label>
                  <input
                    type="text"
                    value={shippingAddress.address1}
                    onChange={(e) => setShippingAddress(prev => ({ ...prev, address1: e.target.value }))}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${addressTouched && !shippingAddress.address1.trim() ? 'border-red-500' : 'border-gray-300'}`}
                    placeholder={language === 'en' ? 'e.g. Schönbrunner Str. 25' : 'z.B. Schönbrunner Str. 25'}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{language === 'en' ? 'Address line 2' : 'Adresszusatz'}</label>
                  <input
                    type="text"
                    value={shippingAddress.address2}
                    onChange={(e) => setShippingAddress(prev => ({ ...prev, address2: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={language === 'en' ? 'Staircase, door, floor (optional)' : 'Stiege, Tür, Etage (optional)'}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="md:col-span-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">{language === 'en' ? 'Postcode *' : 'PLZ *'}</label>
                    <input
                      type="text"
                      value={shippingAddress.zip}
                      onChange={(e) => setShippingAddress(prev => ({ ...prev, zip: e.target.value }))}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${addressTouched && !shippingAddress.zip.trim() ? 'border-red-500' : 'border-gray-300'}`}
                      placeholder={language === 'en' ? 'e.g. 1050' : 'z.B. 1050'}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">{language === 'en' ? 'City *' : 'Ort *'}</label>
                    <input
                      type="text"
                      value={shippingAddress.city}
                      onChange={(e) => setShippingAddress(prev => ({ ...prev, city: e.target.value }))}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${addressTouched && !shippingAddress.city.trim() ? 'border-red-500' : 'border-gray-300'}`}
                      placeholder={language === 'en' ? 'e.g. your city' : 'z.B. Ihre Stadt'}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{language === 'en' ? 'Country *' : 'Land *'}</label>
                  <select
                    value={shippingAddress.country}
                    onChange={(e) => setShippingAddress(prev => ({ ...prev, country: e.target.value }))}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${addressTouched && !shippingAddress.country.trim() ? 'border-red-500' : 'border-gray-300'}`}
                  >
                    <option value="AT">{language === 'en' ? 'Austria' : 'Österreich'}</option>
                    <option value="DE">{language === 'en' ? 'Germany' : 'Deutschland'}</option>
                    <option value="CH">{language === 'en' ? 'Switzerland' : 'Schweiz'}</option>
                  </select>
                </div>
                {addressTouched && (!shippingAddress.address1.trim() || !shippingAddress.city.trim() || !shippingAddress.zip.trim()) && (
                  <p className="text-sm text-red-600">{language === 'en' ? 'Please fill in all required fields of the delivery address.' : 'Bitte füllen Sie alle Pflichtfelder der Lieferadresse aus.'}</p>
                )}
              </div>
            )}

            {/* Go to Preview button */}
            <div className="text-center mt-6">
              <button
                onClick={() => {
                  // Personal message is optional now. Still validate the shipping
                  // address when a postal delivery method is selected.
                  if (selectedDelivery && (selectedDelivery.price > 0 || selectedDelivery.id.startsWith('post-'))) {
                    if (!shippingAddress.address1.trim() || !shippingAddress.city.trim() || !shippingAddress.zip.trim()) {
                      setAddressTouched(true);
                      return;
                    }
                  }
                  setCurrentStep(4);
                }}
                className="bg-purple-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-purple-700 transition-colors w-full lg:w-auto"
              >
                <Eye className="inline-block mr-2" size={20} />
                {t.showPreview}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 4: Final Preview before Checkout */}
      {currentStep === 4 && (
        <div>
          <button
            onClick={() => setCurrentStep(3)}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-4"
          >
            <ArrowLeft size={20} />
            <span>{t.back}</span>
          </button>
          <h2 className="text-2xl font-bold mb-6 text-center">{t.previewTitle}</h2>
          <p className="text-center text-gray-600 mb-8">
            {t.previewSubtitle}
          </p>
          
          {/* Voucher Preview Card */}
          <div className="max-w-2xl mx-auto bg-white border-2 border-gray-200 rounded-xl shadow-lg overflow-hidden mb-8">
            {/* Hero Image */}
            <div className="w-full h-64 bg-gray-100 relative overflow-hidden">
              {customImageUrl ? (
                <img 
                  src={customImageUrl} 
                  alt="Voucher Design" 
                  className="w-full h-full object-cover"
                />
              ) : selectedDesign ? (
                <img 
                  src={selectedDesign.image} 
                  alt={selectedDesign.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  <Camera size={48} />
                </div>
              )}
              {/* Overlay with Gutschein badge */}
              <div className="absolute bottom-4 left-4 bg-white/90 px-4 py-2 rounded-lg">
                <span className="font-semibold text-[#b3202e]">{t.voucher}</span>
                {(selectedDesign?.occasion || t.ownPhoto) && (
                  <span className="ml-2 text-gray-600">{selectedDesign?.occasion || t.ownPhoto}</span>
                )}
              </div>
            </div>

            {/* Personal Message as Heading */}
            <div className="p-6">
              <h3 className="text-2xl font-bold text-center text-gray-800 mb-4">
                {personalMessage || (language === 'en' ? 'Your personal message' : 'Ihre persönliche Nachricht')}
              </h3>

              {/* Red Banner */}
              <div className="bg-[#b3202e] text-white py-3 px-4 rounded-lg mb-4">
                <span className="font-semibold">{t.fotoshootingVoucher}</span>
              </div>

              {/* Details */}
              <div className="space-y-2 text-sm text-gray-600">
                {recipientName && (
                  <p><span className="font-medium">{t.recipient}:</span> {recipientName}</p>
                )}
                {senderName && (
                  <p><span className="font-medium">{t.from}:</span> {senderName}</p>
                )}
                <p><span className="font-medium">{t.validUntil}:</span> {t.monthsFromPurchase}</p>
              </div>

              {/* Price */}
              <div className="mt-6 pt-4 border-t text-right">
                <p className="text-2xl font-bold text-gray-800">{voucherAmount.toFixed(2)} €</p>
                {selectedDelivery && selectedDelivery.price > 0 && (
                  <p className="text-sm text-gray-500">+ {selectedDelivery.price.toFixed(2)} € {t.shipping}</p>
                )}
              </div>
            </div>

            {/* Footer with logo placeholder */}
            <div className="bg-gray-50 p-4 text-center border-t">
              <p className="text-xs text-gray-500">
                {SITE.name} | {SITE.url.replace(/^https?:\/\//, '')}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center max-w-2xl mx-auto">
            <button
              onClick={() => setCurrentStep(3)}
              className="px-6 py-3 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-colors w-full sm:w-auto"
            >
              {t.backToEdit}
            </button>
            <button
              onClick={handleComplete}
              className="bg-green-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors w-full sm:w-auto"
            >
              {t.payNow}
            </button>
          </div>

          <p className="text-center text-sm text-gray-500 mt-4">
            {t.afterPayment}
          </p>
        </div>
      )}

      {/* Voucher Preview (fixed bottom) - Hidden on Step 4 since preview is in main content */}
      {selectedDelivery && currentStep !== 4 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-2 z-50">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-xs text-center">Voucher<br/>Preview</span>
              </div>
              <div>
                <h3 className="font-semibold text-sm">{t.fotoshootingVoucher}</h3>
                <p className="text-xs text-gray-600">
                  {selectedDelivery.name} | {selectedDesign?.occasion || customPhoto?.name || t.ownPhoto}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-600">{t.subtotal}</p>
              <p className="font-bold">
                {(voucherAmount + selectedDelivery.price).toFixed(2)} €
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Add bottom padding when footer is visible to prevent content overlap */}
      {selectedDelivery && currentStep !== 4 && (
        <div className="h-20"></div>
      )}
    </div>
  );
};

export default VoucherPersonalization;
