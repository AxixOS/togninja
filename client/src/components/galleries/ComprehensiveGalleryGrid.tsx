import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Gallery } from '../../types/gallery';
import { useLanguage } from '../../context/LanguageContext';
import { 
  Eye, 
  Download, 
  Share2, 
  Edit, 
  Trash2, 
  Lock, 
  Users, 
  Calendar,
  Star,
  MoreVertical,
  ExternalLink,
  Copy
} from 'lucide-react';

interface ComprehensiveGalleryGridProps {
  galleries: Gallery[];
  isAdmin?: boolean;
  onDelete?: (id: string) => void;
  onShare?: (gallery: Gallery) => void;
  onEdit?: (gallery: Gallery) => void;
  onDuplicate?: (gallery: Gallery) => void;
  onPreview?: (gallery: Gallery) => void;
}

const ComprehensiveGalleryGrid: React.FC<ComprehensiveGalleryGridProps> = ({
  galleries,
  isAdmin = false,
  onDelete,
  onShare,
  onEdit,
  onDuplicate,
  onPreview
}) => {
  const { t } = useLanguage();
  const [selectedGallery, setSelectedGallery] = useState<string | null>(null);
  
  // Debug logging for props
  // console.log removed

  const getGalleryUrl = (gallery: Gallery) => {
    return `/gallery/${gallery.slug}`;
  };

  const getShareUrl = (gallery: Gallery) => {
    return `${window.location.origin}/galleries/${gallery.slug}`;
  };

  const copyShareUrl = async (gallery: Gallery) => {
    try {
      await navigator.clipboard.writeText(getShareUrl(gallery));
      // TODO: Show success message
    } catch (err) {
      // console.error removed
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-20">
      {galleries.map(gallery => (
        <div 
          key={gallery.id}
          className="group bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-200 hover:border-purple-300"
        >
          {/* Gallery Preview */}
          <div className="relative aspect-video bg-gradient-to-br from-purple-50 to-pink-50 overflow-hidden">
            {gallery.coverImage ? (
              <img
                src={gallery.coverImage}
                alt={gallery.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                style={{ 
                  objectPosition: gallery.coverPosition 
                    ? `${gallery.coverPosition.x}% ${gallery.coverPosition.y}%` 
                    : '50% 50%' 
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                <div className="text-center">
                  <div className="w-12 h-12 mx-auto mb-2 bg-purple-100 rounded-full flex items-center justify-center">
                    <svg
                      className="w-6 h-6 text-purple-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <p className="text-sm text-gray-500">No preview</p>
                </div>
              </div>
            )}

            {/* Overlay */}
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
              <div className="flex space-x-2">
                <Link
                  to={getGalleryUrl(gallery)}
                  className="bg-white bg-opacity-90 hover:bg-opacity-100 text-gray-800 p-2 rounded-full transition-all duration-200 transform hover:scale-110"
                >
                  <Eye size={18} />
                </Link>
                {isAdmin && (
                  <>
                    <button
                      onClick={() => onEdit && onEdit(gallery)}
                      className="bg-white bg-opacity-90 hover:bg-opacity-100 text-gray-800 p-2 rounded-full transition-all duration-200 transform hover:scale-110"
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      onClick={() => onShare && onShare(gallery)}
                      className="bg-white bg-opacity-90 hover:bg-opacity-100 text-gray-800 p-2 rounded-full transition-all duration-200 transform hover:scale-110"
                    >
                      <Share2 size={18} />
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Status Badges */}
            <div className="absolute top-3 left-3 flex space-x-2">
              {(gallery.isPasswordProtected || gallery.password) && (
                <div className="bg-yellow-500 text-white px-2 py-1 rounded-full text-xs flex items-center">
                  <Lock size={12} className="mr-1" />
                  Private
                </div>
              )}
              {gallery.isFeatured && (
                <div className="bg-purple-500 text-white px-2 py-1 rounded-full text-xs flex items-center">
                  <Star size={12} className="mr-1" />
                  Featured
                </div>
              )}
            </div>

            {/* Admin Actions Menu */}
            {isAdmin && (
              <div className="absolute top-3 right-3">
                <div className="relative">
                  <button
                    onClick={() => setSelectedGallery(selectedGallery === gallery.id ? null : gallery.id)}
                    className="bg-white bg-opacity-90 hover:bg-opacity-100 text-gray-800 p-2 rounded-full transition-all duration-200"
                  >
                    <MoreVertical size={16} />
                  </button>

                  {selectedGallery === gallery.id && (
                    <div className="absolute right-0 top-10 bg-white rounded-lg shadow-xl border border-gray-300 py-2 z-[9999] min-w-[160px]">
                      <button
                        onClick={() => {
                          onEdit && onEdit(gallery);
                          setSelectedGallery(null);
                        }}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <Edit size={14} className="mr-2" />
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          onPreview && onPreview(gallery);
                          setSelectedGallery(null);
                        }}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <Eye size={14} className="mr-2" />
                        Preview
                      </button>
                      <hr className="my-2" />
                      <button
                        onClick={() => {
                          // console.log removed
                          // console.log removed
                          if (onDelete) {
                            onDelete(gallery.id);
                          } else {
                            // console.error removed
                          }
                          setSelectedGallery(null);
                        }}
                        className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                      >
                        <Trash2 size={14} className="mr-2" />
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Gallery Information */}
          <div className="p-4">
            {/* Title and Description */}
            <div className="mb-3">
              <h3 className="font-semibold text-gray-900 text-lg mb-1 line-clamp-1">
                {gallery.title}
              </h3>
              {gallery.description && (
                <p className="text-gray-600 text-sm line-clamp-2">
                  {gallery.description}
                </p>
              )}
            </div>

            {/* Gallery Stats */}
            <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
              <div className="flex items-center space-x-3">
                <div className="flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  0 images {/* TODO: Get actual count */}
                </div>
                {gallery.clientEmail && (
                  <div className="flex items-center">
                    <Users size={14} className="mr-1" />
                    Client
                  </div>
                )}
              </div>
              <div className="flex items-center">
                <Calendar size={14} className="mr-1" />
                {formatDate(gallery.createdAt)}
              </div>
            </div>

            {/* Features */}
            <div className="flex flex-wrap gap-2 mb-3">
              {gallery.downloadEnabled && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                  <Download size={10} className="mr-1" />
                  Downloads
                </span>
              )}
              {gallery.watermarkEnabled && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                  Watermark
                </span>
              )}
              {gallery.expiresAt && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-orange-100 text-orange-800">
                  Expires
                </span>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
              <Link
                to={getGalleryUrl(gallery)}
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition-colors duration-200"
              >
                <Eye size={14} className="mr-1" />
                {t('action.view')}
              </Link>

              <div className="flex items-center space-x-2">
                {isAdmin ? (
                  <>
                    <button
                      onClick={() => onEdit && onEdit(gallery)}
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                      title={t('action.edit')}
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => onShare && onShare(gallery)}
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                      title={t('gallery.share')}
                    >
                      <Share2 size={16} />
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => copyShareUrl(gallery)}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                    title="Copy Link"
                  >
                    <ExternalLink size={16} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ComprehensiveGalleryGrid;
