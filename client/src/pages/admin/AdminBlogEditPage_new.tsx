import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import AdminLayout from '../../components/admin/AdminLayout';
import BlogPostForm from '../../components/admin/BlogPostForm';
import { supabase } from '../../lib/supabase';
import { ArrowLeft, AlertCircle, Loader2 } from 'lucide-react';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  content: string;
  content_html: string;
  cover_image?: string;
  status: 'DRAFT' | 'PUBLISHED' | 'SCHEDULED';
  published: boolean;
  author_id: string;
  published_at?: string;
  scheduled_for?: string;
  created_at: string;
  updated_at: string;
  seo_title?: string;
  meta_description?: string;
  tags?: string[];
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
      setError(null);
      
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('id', postId)
        .single();
      
      if (error) throw error;
      
      setPost(data);
    } catch (err) {
      // console.error removed
      setError('Failed to load blog post. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-64">
          <div className="text-center">
            <Loader2 className="animate-spin h-8 w-8 text-purple-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading blog post...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (error || !post) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <div className="flex items-center">
            <Link
              to="/admin/blog"
              className="mr-4 p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Edit Blog Post</h1>
              <p className="text-gray-600">Post not found or failed to load</p>
            </div>
          </div>

          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start">
            <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 mr-2" />
            <span>{error || 'Blog post not found'}</span>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Link
              to="/admin/blog"
              className="mr-4 p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Edit Blog Post</h1>
              <p className="text-gray-600">Modify and update your blog article</p>
            </div>
          </div>
        </div>

        {/* Blog Post Form */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <BlogPostForm post={post} isEditing={true} />
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminBlogEditPage;
