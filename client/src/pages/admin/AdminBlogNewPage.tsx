import React from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '../../components/admin/AdminLayout';
import AdvancedBlogPostForm from '../../components/admin/AdvancedBlogPostForm';
import { ArrowLeft } from 'lucide-react';

const AdminBlogNewPage: React.FC = () => {
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
              <h1 className="text-2xl font-semibold text-gray-900">Create New Blog Post</h1>
              <p className="text-gray-600">Create and publish a new blog article with our advanced editor</p>
            </div>
          </div>
        </div>

        {/* Advanced Blog Post Form */}
        <AdvancedBlogPostForm />
      </div>
    </AdminLayout>
  );
};

export default AdminBlogNewPage;