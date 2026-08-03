import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Tag, User } from 'lucide-react';
import { BlogPost } from '../../types/blog';
import { proxyImage } from '../../lib/imageProxy';

interface BlogPostCardProps {
  post: BlogPost;
  isAdmin?: boolean;
}

const BlogPostCard: React.FC<BlogPostCardProps> = ({ post, isAdmin = false }) => {
  const coverUrl: string | undefined = (post as any).image_url;
  const formattedDate = post.published_at
    ? new Date(post.published_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : null;

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden transition-transform hover:shadow-lg hover:-translate-y-1">
      {coverUrl && (
        <div className="aspect-[14/9] overflow-hidden bg-gray-100">
          <img
            src={proxyImage(coverUrl, { w: 600 })}
            alt={post.title}
            className="w-full h-full object-contain"
            loading="lazy"
            decoding="async"
            onError={(e) => {
              // Fall back to the original URL once if the proxy fails; only
              // then hide the broken image.
              const img = e.currentTarget;
              if (coverUrl && img.src !== coverUrl) {
                img.src = coverUrl;
                return;
              }
              img.style.display = 'none';
              img.parentElement!.classList.add('hidden');
            }}
          />
        </div>
      )}
      
      <div className="p-6">
        {/* Status badge for admin view */}
        {isAdmin && (
          <div className="mb-3">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              post.published ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
            }`}>
              {post.published ? 'PUBLISHED' : 'DRAFT'}
            </span>
          </div>
        )}
        
        <h2 className="text-xl font-bold text-gray-800 mb-2 line-clamp-2">
          <Link to={isAdmin ? `/admin/blog/edit/${post.id}` : `/blog/${post.slug}`} className="hover:text-purple-600 transition-colors">
            {post.title}
          </Link>
        </h2>
        
        {post.excerpt && (
          <p className="text-gray-600 mb-4 line-clamp-3">
            {post.excerpt}
          </p>
        )}
        
        <div className="flex flex-wrap items-center text-sm text-gray-500 mb-3 gap-4">
          {formattedDate && (
            <div className="flex items-center">
              <Calendar size={14} className="mr-1" />
              {formattedDate}
            </div>
          )}
          
          {post.author?.email && (
            <div className="flex items-center">
              <User size={14} className="mr-1" />
              {post.author.email.split('@')[0]}
            </div>
          )}
        </div>
        
        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {post.tags.map((tag, index) => (
              <span 
                key={index}
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 hover:bg-purple-200 transition-colors"
              >
                <Tag size={12} className="mr-1" />
                {tag}
              </span>
            ))}
          </div>
        )}
        
        <Link 
          to={isAdmin ? `/admin/blog/edit/${post.id}` : `/blog/${post.slug}`}
          className="text-purple-600 hover:text-purple-800 font-medium text-sm inline-flex items-center"
        >
          {isAdmin ? 'Edit post' : 'Read more'}
          <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    </div>
  );
};

export default BlogPostCard;