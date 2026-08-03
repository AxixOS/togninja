import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { BlogTag } from '../../types/blog';
import { useLanguage } from '../../context/LanguageContext';

interface BlogSidebarProps {
  tags: BlogTag[];
  isAdmin?: boolean;
}

const BlogSidebar: React.FC<BlogSidebarProps> = ({ tags, isAdmin = false }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTag = searchParams.get('tag') || '';
  const { language } = useLanguage();
  
  const handleTagClick = (tagSlug: string) => {
    const newSearchParams = new URLSearchParams(searchParams);
    if (tagSlug === currentTag) {
      newSearchParams.delete('tag');
    } else {
      newSearchParams.set('tag', tagSlug);
    }
    newSearchParams.set('page', '1'); // Reset to first page on tag change
    setSearchParams(newSearchParams);
  };
  
  return (
    <div className="space-y-6">
      {/* Categories */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">{language === 'de' ? 'Kategorien' : 'Categories'}</h2>
        <ul className="space-y-2">
          {tags.map(tag => (
            <li key={tag.id}>
              <button
                onClick={() => handleTagClick(tag.slug)}
                className={`flex items-center text-gray-600 hover:text-purple-600 transition-colors ${
                  tag.slug === currentTag ? 'font-semibold text-purple-600' : ''
                }`}
              >
                <svg className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
                {tag.name}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Newsletter Signup */}
      {!isAdmin && (
        <div className="bg-purple-50 rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">{language === 'de' ? 'Newsletter abonnieren' : 'Subscribe to Our Newsletter'}</h2>
          <p className="text-gray-600 mb-4">
            {language === 'de' ? 'Bleiben Sie auf dem Laufenden mit unseren neuesten Fotografie-Tipps und Sonderangeboten.' : 'Stay updated with our latest photography tips and special offers.'}
          </p>
          <form className="space-y-4">
            <input
              type="email"
              placeholder={language === 'de' ? 'Ihre E-Mail-Adresse' : 'Your email address'}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-purple-600"
            />
            <button
              type="submit"
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              {language === 'de' ? 'Abonnieren' : 'Subscribe'}
            </button>
          </form>
        </div>
      )}
      
      {/* Recent Posts */}
      {!isAdmin && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">{language === 'de' ? 'Neueste Beiträge' : 'Recent Posts'}</h2>
          <div className="space-y-4">
            {/* This would be populated dynamically in a real implementation */}
            <div className="border-b border-gray-200 pb-4">
              <a href="#" className="text-purple-600 hover:text-purple-800 font-medium">
                Tips for Perfect Family Photos
              </a>
              <p className="text-sm text-gray-500 mt-1">June 15, 2025</p>
            </div>
            <div className="border-b border-gray-200 pb-4">
              <a href="#" className="text-purple-600 hover:text-purple-800 font-medium">
                Choosing the Right Location for Your Shoot
              </a>
              <p className="text-sm text-gray-500 mt-1">June 10, 2025</p>
            </div>
            <div>
              <a href="#" className="text-purple-600 hover:text-purple-800 font-medium">
                How to Prepare for Your Newborn Session
              </a>
              <p className="text-sm text-gray-500 mt-1">June 5, 2025</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BlogSidebar;