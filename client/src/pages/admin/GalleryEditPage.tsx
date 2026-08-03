import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import AdminLayout from '../../components/admin/AdminLayout';
import AdvancedGalleryForm from '../../components/admin/AdvancedGalleryForm';
import { Gallery } from '../../types/gallery';
import { getGalleryById } from '../../lib/gallery-api';
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react';

const GalleryEditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [gallery, setGallery] = useState<Gallery | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchGallery(id);
    }
  }, [id]);

  const fetchGallery = async (galleryId: string) => {
    try {
      setLoading(true);
      const data = await getGalleryById(galleryId);
      setGallery(data);
    } catch (err) {
      // console.error removed
      setError('Failed to load gallery. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <Link to="/admin/galleries" className="inline-flex items-center text-gray-600 hover:text-gray-900">
            <ArrowLeft size={16} className="mr-1" />
            <span>Back to Galleries</span>
          </Link>
          <h1 className="text-2xl font-semibold text-gray-900 mt-2">Edit Gallery</h1>
          <p className="text-gray-600">Update gallery settings</p>
        </div>        {/* Content */}
        <div className="bg-white rounded-lg shadow p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 text-purple-600 animate-spin" />
              <span className="ml-2 text-gray-600">Loading gallery...</span>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start">
              <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 mr-2" />
              <span>{error}</span>
            </div>          ) : gallery ? (
            <AdvancedGalleryForm gallery={gallery} isEditing={true} />
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">Gallery not found.</p>
              <Link
                to="/admin/galleries"
                className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700"
              >
                Return to galleries
              </Link>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default GalleryEditPage;