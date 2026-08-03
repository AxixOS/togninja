import React from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '../../components/admin/AdminLayout';
import AdvancedGalleryForm from '../../components/admin/AdvancedGalleryForm';
import { ArrowLeft } from 'lucide-react';

const GalleryCreatePage: React.FC = () => {
  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Link to="/admin/galleries" className="flex items-center text-gray-600 hover:text-gray-900 mb-2">
              <ArrowLeft size={16} className="mr-1" /> Back to galleries
            </Link>
            <h1 className="text-2xl font-semibold text-gray-900">Create New Gallery</h1>
            <p className="text-gray-600">Create a client photo gallery with our advanced editor</p>
          </div>
        </div>

        {/* Advanced Gallery Form */}
        <AdvancedGalleryForm />
      </div>
    </AdminLayout>
  );
};

export default GalleryCreatePage;