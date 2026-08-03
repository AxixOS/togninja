import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar } from 'lucide-react';
import { BlogPost } from '../../types/blog';

interface RelatedPostsProps {
  currentPostId: string;
  posts: BlogPost[];
}

const RelatedPosts: React.FC<RelatedPostsProps> = ({ currentPostId, posts }) => {
  // Filter out the current post and limit to 3 related posts
  const relatedPosts = posts
    .filter(post => post.id !== currentPostId)
    .slice(0, 3);

  if (relatedPosts.length === 0) {
    return null;
  }

  return (
    <div className="mt-12 pt-8 border-t border-gray-200">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Related Posts</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {relatedPosts.map(post => (
          <div key={post.id} className="bg-white rounded-lg shadow-md overflow-hidden transition-transform hover:shadow-lg hover:-translate-y-1">
            {post.cover_image && (
              <Link to={`/blog/${post.slug}`} className="block aspect-[14/9] overflow-hidden bg-gray-100">
                <img
                  src={post.cover_image}
                  alt={post.title}
                  className="w-full h-full object-contain transition-transform hover:scale-105"
                  loading="lazy"
                />
              </Link>
            )}
            
            <div className="p-4">
              <h3 className="text-lg font-bold text-gray-800 mb-2 line-clamp-2">
                <Link to={`/blog/${post.slug}`} className="hover:text-purple-600 transition-colors">
                  {post.title}
                </Link>
              </h3>
              
              {post.published_at && (
                <div className="flex items-center text-sm text-gray-500 mb-2">
                  <Calendar size={14} className="mr-1" />
                  {new Date(post.published_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </div>
              )}
              
              {post.excerpt && (
                <p className="text-gray-600 text-sm line-clamp-2 mb-3">
                  {post.excerpt}
                </p>
              )}
              
              <Link 
                to={`/blog/${post.slug}`}
                className="text-purple-600 hover:text-purple-800 text-sm font-medium inline-flex items-center"
              >
                Read more
                <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RelatedPosts;