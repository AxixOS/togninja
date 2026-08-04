import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useCart } from '../../context/CartContext';
import { useNavigate } from 'react-router-dom';
import { Check } from 'lucide-react';
import { voucherThumbnail } from '../../lib/voucherThumbnail';

type Voucher = {
  id: string;
  name: string;
  description?: string;
  price: number;
  originalPrice?: number;
  image?: string;
  category?: string;
  route?: string;
  slug?: string;
};

const VoucherPackagesList: React.FC<{ category?: string; limit?: number; featuredIndex?: number }> = ({ category, limit = 3, featuredIndex = 1 }) => {
  const navigate = useNavigate();
  const { addToCart } = useCart();

  const { data: apiProducts } = useQuery({
    queryKey: ['/api/vouchers/products'],
    queryFn: async () => {
      const res = await fetch('/api/vouchers/products');
      if (!res.ok) throw new Error('Failed to fetch vouchers');
      return res.json();
    },
    staleTime: 60_000,
  });

  const vouchers: Voucher[] = useMemo(() => {
    const mapped = (apiProducts || []).map((p: any) => ({
      id: p.id,
      name: p.name,
      description: p.description || p.detailedDescription || p.detailed_description || '',
      price: typeof p.price === 'string' ? parseFloat(p.price) : (p.price || 0),
      originalPrice: p.originalPrice || p.original_price || undefined,
      image: voucherThumbnail(p),
      category: (p.category || p.sessionType || '').toString(),
      route: `/gutschein/${p.slug || p.id}`,
      slug: p.slug || p.id,
    }));

    let filtered = mapped;
    if (category) {
      const catLower = category.toString().toLowerCase();
      filtered = mapped.filter((v) => {
        const s = `${v.category} ${v.id} ${v.name}`.toLowerCase();
        return s.includes(catLower) || v.category.toLowerCase().includes(catLower);
      });
    }

    // fallback to first N
    return filtered.slice(0, limit);
  }, [apiProducts, category, limit]);

  if (!vouchers || vouchers.length === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      {vouchers.map((v, idx) => {
        const isFeatured = idx === featuredIndex;
        return (
          <div key={v.id} className={isFeatured ? 'rounded-xl shadow-2xl p-8 transform scale-105 text-white bg-gradient-to-br from-purple-600 to-pink-600' : 'bg-white rounded-xl shadow-lg p-8'}>
            {isFeatured && (
              <div className="bg-yellow-400 text-gray-900 text-sm font-bold px-3 py-1 rounded-full inline-block mb-4 ml-auto">BESTSELLER</div>
            )}

            <h3 className={isFeatured ? 'text-2xl font-bold mb-4' : 'text-2xl font-bold mb-4 text-purple-900'}>{v.name}</h3>

            <div className={isFeatured ? 'text-3xl font-bold mb-6' : 'text-3xl font-bold text-purple-600 mb-6'}>
              €{v.price}
            </div>

            <ul className={isFeatured ? 'space-y-3 mb-8 text-white/90' : 'space-y-3 mb-8 text-gray-700'}>
              <li className="flex items-start">
                <Check className={isFeatured ? 'h-5 w-5 text-white mr-2 flex-shrink-0 mt-0.5' : 'h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5'} />
                <span className="text-sm">{v.description || 'Inklusive Galerie & Nutzungsrechte'}</span>
              </li>
              <li className="flex items-start">
                <Check className={isFeatured ? 'h-5 w-5 text-white mr-2 flex-shrink-0 mt-0.5' : 'h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5'} />
                <span className="text-sm">Nutzungsrechte privat</span>
              </li>
              <li className="flex items-start">
                <Check className={isFeatured ? 'h-5 w-5 text-white mr-2 flex-shrink-0 mt-0.5' : 'h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5'} />
                <span className="text-sm">Flexible Zustellung</span>
              </li>
            </ul>

            <button
              onClick={() => {
                addToCart({
                  title: v.name,
                  productId: v.id,
                  productSlug: v.slug || v.id,
                  price: Number(v.price) || 0,
                  quantity: 1,
                  packageType: 'Fotoshooting Gutschein',
                  type: 'voucher',
                  description: v.description,
                  imageUrl: v.image,
                });
                navigate('/cart');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={isFeatured ? 'w-full bg-white text-purple-700 font-semibold py-3 px-6 rounded-lg' : 'w-full bg-gray-900 text-white font-semibold py-3 px-6 rounded-lg'}
            >
              Jetzt buchen
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default VoucherPackagesList;
