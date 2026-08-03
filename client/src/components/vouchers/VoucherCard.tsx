import React from 'react';
import { Link } from 'react-router-dom';
import { Voucher } from '../../types';
import { Calendar, Tag, Percent } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

interface VoucherCardProps {
  voucher: Voucher;
}

const VoucherCard: React.FC<VoucherCardProps> = ({ voucher }) => {
  const { t } = useLanguage();
  const discountPercentage = Math.round(((voucher.price - voucher.discountPrice) / voucher.price) * 100);
  
  return (
    <Link 
      to={`/voucher/${voucher.slug}`}
      className="bg-white rounded-lg shadow-md overflow-hidden transition-transform duration-300 hover:shadow-lg hover:-translate-y-1 flex flex-col h-full"
    >
      <div className="relative">
        <div className="aspect-[4/3] overflow-hidden">
          <img 
            src={voucher.image} 
            alt={voucher.title}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="absolute top-3 right-3 bg-orange-500 text-white px-2 py-1 rounded-md flex items-center text-sm font-semibold">
          <Percent size={16} className="mr-1" /> {discountPercentage}% OFF
        </div>
      </div>
      
      <div className="p-4 flex-grow flex flex-col justify-between">
        <div>
          <div className="flex items-center mb-2">
            <Tag size={16} className="text-purple-600 mr-2" />
            <span className="text-xs font-semibold text-purple-600 uppercase">{voucher.category}</span>
          </div>
          
          <h3 className="text-lg font-semibold text-gray-800 mb-2">{voucher.title}</h3>
          
          <p className="text-gray-600 text-sm mb-3">
            {voucher.description.length > 90 
              ? `${voucher.description.substring(0, 90)}...` 
              : voucher.description}
          </p>
        </div>
        
        <div>
          <div className="flex items-center mb-2">
            <Calendar size={16} className="text-gray-500 mr-2" />
            <span className="text-xs text-gray-500">
              {t('vouchers.validUntil')} {new Date(voucher.validUntil).toLocaleDateString()}
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <span className="text-gray-500 line-through text-sm">€{voucher.price.toFixed(2)}</span>
              <span className="text-purple-600 font-bold text-lg ml-2">€{voucher.discountPrice.toFixed(2)}</span>
            </div>
            
            <span className="text-gray-600 text-xs">
              {voucher.stock > 0 ? `${voucher.stock} ${t('vouchers.available')}` : t('vouchers.soldOut')}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default VoucherCard;