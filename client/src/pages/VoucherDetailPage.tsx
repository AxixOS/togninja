import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { Calendar, Tag, AlertCircle, Info, ArrowLeft } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { SEOHead } from '../components/SEO/SEOHead';

interface ApiVoucher {
  id: string;
  name: string;
  description: string | null;
  detailedDescription?: string | null;
  price: number;
  originalPrice?: number | null;
  category?: string | null;
  validityPeriod?: number | null;
  validUntil?: string | null;
  imageUrl?: string | null;
  thumbnailUrl?: string | null;
  termsAndConditions?: string | null;
  slug?: string | null;
  isActive?: boolean;
}

const VoucherDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { language, t } = useLanguage();
  const [quantity, setQuantity] = useState(1);
  const [voucher, setVoucher] = useState<ApiVoucher | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Translation is now handled server-side via the language parameter
  const getTranslatedDescription = (description: string | null): string => {
    if (!description) return '';
    return description;
  };

  useEffect(() => {
    let active = true;
    async function fetchVoucher() {
      setLoading(true);
      setError(null);
      try {
        if (!slug) throw new Error(t('voucherDetail.noVoucherSlug'));
        const res = await fetch(`/api/vouchers/products/${encodeURIComponent(slug)}?language=${language}`);
        if (!res.ok) {
          throw new Error(`Fetch failed: ${res.status}`);
        }
        const data = await res.json();
        const mapped: ApiVoucher = {
          id: data.id,
          name: data.name,
          description: data.description ?? null,
          detailedDescription: data.detailedDescription ?? data.detailed_description ?? null,
          price: typeof data.price === 'string' ? parseFloat(data.price) : data.price,
          originalPrice: typeof (data.originalPrice ?? data.original_price) === 'string' ? parseFloat(data.originalPrice ?? data.original_price) : (data.originalPrice ?? data.original_price),
          category: data.category ?? null,
          validityPeriod: data.validityPeriod ?? data.validity_period ?? null,
          imageUrl: data.imageUrl ?? data.image_url ?? null,
          thumbnailUrl: data.thumbnailUrl ?? data.thumbnail_url ?? null,
          termsAndConditions: data.termsAndConditions ?? data.terms_and_conditions ?? null,
          slug: data.slug ?? slug,
          isActive: data.isActive ?? data.is_active ?? true,
        };
        if (active) setVoucher(mapped);
      } catch (e: any) {
        if (active) setError(e.message);
      } finally {
        if (active) setLoading(false);
      }
    }
    fetchVoucher();
    return () => { active = false; };
  }, [slug, language]);

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 text-center">
          <p className="text-gray-600">{t('voucherDetail.loadingVoucher')}</p>
        </div>
      </Layout>
    );
  }

  if (error || !voucher) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 text-center">
          <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-4 text-gray-800">{t('voucherDetail.voucherNotFound')}</h1>
          <p className="text-gray-600 mb-8">
            {error ? (language === 'de' ? `Fehler: ${error}` : `Error: ${error}`) : (t('voucherDetail.theRequestedVoucherCould'))}
          </p>
          <button
            onClick={() => navigate('/vouchers')}
            className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
          >
            {t('voucherDetail.browseVouchers')}
          </button>
        </div>
      </Layout>
    );
  }
  
  // Placeholder availability logic (extend when DB has these fields)
  const isAvailable = true;
  const isValid = voucher.isActive !== false;
  
  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value >= 1 && value <= 99) setQuantity(value);
  };

  return (
    <Layout>
      <SEOHead
        title={`${voucher.name} – Fotoshooting Gutschein Wien | New Age Fotografie`}
        description={
          (voucher.description || '').slice(0, 150) ||
          `${voucher.name}: Fotoshooting-Gutschein von New Age Fotografie Wien – das perfekte Geschenk.`
        }
        canonical={`/gutschein/${voucher.slug || slug}`}
        ogImage={voucher.imageUrl || voucher.thumbnailUrl || undefined}
      />
      <div className="container mx-auto px-4 py-8">
        {/* Back button */}
        <button 
          onClick={() => navigate('/vouchers')}
          className="flex items-center text-purple-600 hover:text-purple-800 mb-6 transition-colors"
        >
          <ArrowLeft size={16} className="mr-1" /> {t('voucherDetail.backToVouchers')}
        </button>
        
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="md:grid md:grid-cols-2">
            {/* Voucher image */}
            <div className="md:col-span-1">
              <img
                src={voucher.imageUrl || voucher.thumbnailUrl || 'https://via.placeholder.com/800x600?text=Voucher'}
                alt={voucher.name}
                className="w-full h-full object-cover"
              />
            </div>
            
            {/* Voucher details */}
            <div className="md:col-span-1 p-6 md:p-8">
              <div className="flex items-center mb-4">
                <Tag size={16} className="text-purple-600 mr-2" />
                <span className="text-sm font-semibold text-purple-600 uppercase">{voucher.category}</span>
              </div>
              
              <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4">{voucher.name}</h1>
              
              <div className="flex items-center mb-6">
                <div className="mr-6 flex items-center">
                  <Calendar size={16} className="text-gray-500 mr-1" />
                  <span className="text-sm text-gray-500">
                    {t('voucherDetail.validUntil')} {new Date(voucher.validUntil).toLocaleDateString()}
                  </span>
                </div>
                
                <div className="flex items-center">
                  <span className={`inline-block w-2 h-2 rounded-full mr-1 ${isValid ? 'bg-green-500' : 'bg-red-500'}`}></span>
                  <span className="text-sm text-gray-500">
                    {isValid ? (t('voucherDetail.active')) : (t('voucherDetail.expired'))}
                  </span>
                </div>
              </div>
              
              <div className="mb-6">
                {voucher.originalPrice && voucher.originalPrice > voucher.price && (
                  <span className="text-gray-500 line-through text-lg">€{voucher.originalPrice.toFixed(2)}</span>
                )}
                <span className="text-purple-600 font-bold text-3xl ml-2">€{voucher.price.toFixed(2)}</span>
              </div>
              
              <p className="text-gray-700 mb-6">{getTranslatedDescription(voucher.description)}</p>
              
              <div className="mb-6">
                <p className="text-gray-700 mb-2">
                  <span className="font-semibold">{t('voucherDetail.voucherId')}</span> {voucher.id}
                </p>
                <p className="text-gray-700">
                  <span className="font-semibold">Status:</span> {voucher.isActive ? (t('voucherDetail.active2')) : (t('voucherDetail.inactive'))}
                </p>
              </div>
              
              {isAvailable && isValid ? (
                <div className="mb-6">
                  <label className="block text-gray-700 font-medium mb-2">{t('voucherDetail.quantity')}</label>
                  <div className="flex items-center mb-4">
                    <input
                      type="number"
                      min="1"
                      max={99}
                      value={quantity}
                      onChange={handleQuantityChange}
                      className="w-20 px-3 py-2 border border-gray-300 rounded-lg mr-4 focus:ring-2 focus:ring-purple-600 focus:border-purple-600"
                    />
                  </div>
                  
                  {/* Two button options */}
                  <div className="space-y-3">
                    {/* Personalisieren Button - Triggers voucher flow */}
                    <button 
                      onClick={() => {
                        // Navigate to personalization checkout with proper route
                        navigate(`/checkout/voucher/${voucher.id}?personalize=true&quantity=${quantity}`);
                      }}
                      className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-3 px-6 rounded-lg transition-colors flex items-center justify-center"
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002 2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      {t('voucherDetail.buyNowPersonalize')} - €{(voucher.price * quantity).toFixed(2)}
                    </button>
                  </div>
                  
                  <div className="mt-3 text-center">
                    <p className="text-sm text-gray-600">
                      💎 {t('voucherDetail.chooseADesignAdd')}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                  <div className="flex items-start">
                    <AlertCircle size={20} className="text-red-500 mr-2 mt-0.5" />
                    <p className="text-red-700">
                      {!isAvailable 
                        ? (t('voucherDetail.thisVoucherIsCurrently'))
                        : (t('voucherDetail.thisVoucherHasExpired'))}
                    </p>
                  </div>
                </div>
              )}
              
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex items-start">
                  <Info size={20} className="text-gray-500 mr-2 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-2">{t('voucherDetail.termsConditions')}</h3>
                    <p className="text-gray-700 text-sm">{voucher.termsAndConditions || (t('voucherDetail.noAdditionalConditions'))}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default VoucherDetailPage;