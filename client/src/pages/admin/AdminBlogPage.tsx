import React from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/admin/AdminLayout';
import { Plus } from 'lucide-react';

const AdminBlogPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Blog Posts</h1>
            <p className="text-gray-600">Manage your blog content</p>
          </div>
          <button
            onClick={() => navigate('/admin/blog/new')}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center"
          >
            <Plus size={20} className="mr-2" />
            New Post
          </button>
        </div>

        {/* Redirect to posts page */}
        {navigate('/admin/blog/posts')}
      </div>
    </AdminLayout>
  );
};

export default AdminBlogPage;