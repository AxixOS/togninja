import React from 'react';
import { Check } from 'lucide-react';
import CheckoutButton from './CheckoutButton';

interface ProductCardProps {
  id: string;
  title: string;
  subtitle: string;
  price: number;
  features: string[];
  isFeatured?: boolean;
}

const ProductCard: React.FC<ProductCardProps> = ({
  id,
  title,
  subtitle,
  price,
  features,
  isFeatured
}) => {
  return (
    <div 
      className={`bg-white rounded-lg shadow-lg overflow-hidden ${
        isFeatured ? 'border-2 border-purple-600' : ''
      }`}
    >
      {isFeatured && (
        <div className="bg-purple-600 text-white text-center py-2">
          <span className="text-sm font-medium">BESTSELLER</span>
        </div>
      )}
      <div className="p-6">
        <h3 className="text-2xl font-bold text-purple-900 mb-2">{title}</h3>
        <p className="text-gray-600 mb-4">{subtitle}</p>
        <div className="text-3xl font-bold text-purple-600 mb-6">€{price}</div>
        <ul className="space-y-3 mb-6">
          {features.map((feature, i) => (
            <li key={i} className="flex items-center">
              <Check size={20} className="text-green-500 mr-2" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
        <CheckoutButton
          productId={id}
          className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
        >
          Jetzt Buchen
        </CheckoutButton>
      </div>
    </div>
  );
};

export default ProductCard;