import React from 'react';
import { Category } from '../../types';
import { useAppContext } from '../../context/AppContext';
import { useLanguage } from '../../context/LanguageContext';

const CategoryFilter: React.FC = () => {
  const { categories, selectedCategory, setSelectedCategory } = useAppContext();
  const { t, language } = useLanguage();

  const handleCategoryChange = (category: Category | null) => {
    setSelectedCategory(category);
  };

  const translateCategory = (category: Category) => {
    switch (category) {
      case 'Familie': return t('categories.family');
      case 'Baby': return t('categories.baby');
      case 'Schwangerschaft': return t('categories.maternity') !== 'categories.maternity' ? t('categories.maternity') : (language === 'de' ? 'Schwangerschaft' : 'Maternity');
      case 'Hochzeit': return t('categories.wedding');
      case 'Business': return t('categories.business');
      case 'Event': return t('categories.event');
      case 'Immobilien': return language === 'de' ? 'Immobilien' : 'Real Estate';
      default: return category;
    }
  };

  return (
    <div className="mb-8">
      <h2 className="text-2xl font-bold mb-6 text-gray-800 text-center">{t('vouchers.filterByCategory')}</h2>
      <div className="flex flex-wrap justify-center gap-3">
        <button
          onClick={() => handleCategoryChange(null)}
          className={`px-6 py-3 rounded-full text-base font-semibold transition-all transform hover:scale-105 ${
            selectedCategory === null
              ? 'bg-purple-600 text-white shadow-lg'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          {t('common.all')}
        </button>
        
        {categories.map(category => (
          <button
            key={category}
            onClick={() => handleCategoryChange(category)}
            className={`px-6 py-3 rounded-full text-base font-semibold transition-all transform hover:scale-105 ${
              selectedCategory === category
                ? 'bg-purple-600 text-white shadow-lg'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {translateCategory(category)}
          </button>
        ))}
      </div>
    </div>
  );
};

export default CategoryFilter;