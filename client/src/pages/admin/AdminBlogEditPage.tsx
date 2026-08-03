import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import AdminLayout from '../../components/admin/AdminLayout';
import AdvancedBlogPostForm from '../../components/admin/AdvancedBlogPostForm';
// Supabase removed - using Neon database API
import { ArrowLeft, AlertCircle, Loader2 } from 'lucide-react';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content?: string;
  content_html: string;
  cover_image?: string;
  tags?: string[];
  status: 'IDEA' | 'DRAFT' | 'PUBLISHED' | 'SCHEDULED' | 'ARCHIVED';
  ideaData?: any;
  image_url_2?: string;
  image_url_3?: string;
  seo_title?: string;
  meta_description?: string;
  author_id: string;
  published_at?: string;
  scheduled_for?: string;
  created_at: string;
  updated_at: string;
  author?: {
    email: string;
  };
}

const AdminBlogEditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchPost(id);
    }
  }, [id]);

  const fetchPost = async (postId: string) => {
    try {
      setLoading(true);
      
      // Fetch post from PostgreSQL API using ID
      const response = await fetch(`/api/blog/posts/${postId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch post');
      }
      
      const postData = await response.json();
      
      // Respect the real DB status for idea-mode / archived / scheduled; only
      // fall back to computing from the published flag for legacy rows.
      let computedStatus: BlogPost['status'] = 'DRAFT';
      if (postData.status === 'IDEA' || postData.status === 'ARCHIVED' || postData.status === 'SCHEDULED') {
        computedStatus = postData.status;
      } else if (postData.published) {
        const pubDate = postData.publishedAt ? new Date(postData.publishedAt) : null;
        computedStatus = (pubDate && pubDate > new Date()) ? 'SCHEDULED' : 'PUBLISHED';
      }

      // Format the post data to match our interface
      const formattedPost: BlogPost = {
        id: postData.id,
        title: postData.title || '',
        slug: postData.slug || '',
        excerpt: postData.excerpt || '',
        content_html: postData.contentHtml || postData.content_html || postData.content || '',
        cover_image: postData.imageUrl || postData.cover_image || '',
        image_url_2: postData.imageUrl2 || postData.image_url_2 || '',
        image_url_3: postData.imageUrl3 || postData.image_url_3 || '',
        tags: postData.tags || [],
        status: computedStatus,
        ideaData: postData.ideaData || null,
        seo_title: postData.seoTitle || postData.seo_title || '',
        meta_description: postData.metaDescription || postData.meta_description || '',
        author_id: postData.authorId || postData.author_id || '',
        published_at: postData.publishedAt || postData.published_at || '',
        scheduled_for: postData.scheduled_for || '',
        created_at: postData.createdAt || postData.created_at || '',
        updated_at: postData.updatedAt || postData.updated_at || ''
      };
      
      setPost(formattedPost);
    } catch (err) {
      console.error('Error fetching post:', err);
      setError('Failed to load blog post. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="animate-spin h-8 w-8 text-purple-600" />
          <span className="ml-2 text-gray-600">Loading post...</span>
        </div>
      </AdminLayout>
    );
  }

  if (!post && !loading) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Post Not Found</h2>
          <p className="text-gray-600 mb-6">The blog post you're looking for doesn't exist or has been removed.</p>
          <Link
            to="/admin/blog"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Blog Posts
          </Link>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Error Loading Post</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link
            to="/admin/blog"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Blog Posts
          </Link>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6 blog-editor-scope">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Link to="/admin/blog" className="flex items-center text-gray-600 hover:text-gray-900 mb-2">
              <ArrowLeft size={16} className="mr-1" /> Back to posts
            </Link>
            <h1 className="text-2xl font-semibold text-gray-900">Edit Blog Post</h1>
            <p className="text-gray-600">Update your blog post with the advanced editor</p>
          </div>
        </div>        {/* Advanced Blog Post Form */}
        {post && <AdvancedBlogPostForm post={post} isEditing={true} />}
      </div>
    </AdminLayout>
  );
};

export default AdminBlogEditPage;