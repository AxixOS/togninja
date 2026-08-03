import React, { useEffect } from 'react';
import { BlogPost } from '../../types/blog';
import { SITE } from '../../config/site';

interface BlogSEOProps {
  post: BlogPost;
}

const BlogSEO: React.FC<BlogSEOProps> = ({ post }) => {
  useEffect(() => {
    // Set page title
    document.title = post.seo_title || post.title;
    
    // Set meta description
    let metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) {
      metaDescription = document.createElement('meta');
      metaDescription.setAttribute('name', 'description');
      document.head.appendChild(metaDescription);
    }
    metaDescription.setAttribute('content', post.meta_description || post.excerpt || '');
    
    // Set Open Graph tags
    let ogTitle = document.querySelector('meta[property="og:title"]');
    if (!ogTitle) {
      ogTitle = document.createElement('meta');
      ogTitle.setAttribute('property', 'og:title');
      document.head.appendChild(ogTitle);
    }
    ogTitle.setAttribute('content', post.title);
    
    let ogDescription = document.querySelector('meta[property="og:description"]');
    if (!ogDescription) {
      ogDescription = document.createElement('meta');
      ogDescription.setAttribute('property', 'og:description');
      document.head.appendChild(ogDescription);
    }
    ogDescription.setAttribute('content', post.meta_description || post.excerpt || '');
    
    let ogImage = document.querySelector('meta[property="og:image"]');
    if (!ogImage && post.cover_image) {
      ogImage = document.createElement('meta');
      ogImage.setAttribute('property', 'og:image');
      document.head.appendChild(ogImage);
    }
    if (ogImage && post.cover_image) {
      ogImage.setAttribute('content', post.cover_image);
    }
    
    // Set canonical URL
    let canonicalLink = document.querySelector('link[rel="canonical"]');
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.setAttribute('href', `${window.location.origin}/blog/${post.slug}`);
    
    // Add JSON-LD schema
    let jsonLdScript = document.querySelector('#blog-post-jsonld');
    if (!jsonLdScript) {
      jsonLdScript = document.createElement('script');
      jsonLdScript.setAttribute('id', 'blog-post-jsonld');
      jsonLdScript.setAttribute('type', 'application/ld+json');
      document.head.appendChild(jsonLdScript);
    }
    
    const jsonLdData = {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      'headline': post.title,
      'description': post.excerpt || '',
      'image': post.cover_image ? [post.cover_image] : [],
      'datePublished': post.published_at,
      'dateModified': post.updated_at,
      'author': {
        '@type': 'Person',
        'name': post.author?.email?.split('@')[0] || SITE.name
      },
      'publisher': {
        '@type': 'Organization',
        'name': SITE.name,
        'logo': {
          '@type': 'ImageObject',
          'url': `${window.location.origin}/logo.png`
        }
      },
      'mainEntityOfPage': {
        '@type': 'WebPage',
        '@id': `${window.location.origin}/blog/${post.slug}`
      }
    };
    
    jsonLdScript.textContent = JSON.stringify(jsonLdData);
    
    // Clean up on unmount
    return () => {
      document.title = SITE.name;
      if (jsonLdScript) {
        jsonLdScript.remove();
      }
    };
  }, [post]);

  return null; // This component doesn't render anything
};

export default BlogSEO;