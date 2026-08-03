import React from 'react';
import { Link } from 'react-router-dom';
import { Gallery } from '../../types/gallery';
import { Eye, Download, Lock, Unlock, Calendar, Share2, Trash2, Edit } from 'lucide-react';

interface GalleryCardProps {
  gallery: Gallery;
  isAdmin?: boolean;
  onDelete?: (id: string) => void;
}

const GalleryCard: React.FC<GalleryCardProps> = ({ gallery, isAdmin = false, onDelete }) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onDelete) {
      if (window.confirm(`Are you sure you want to delete the gallery "${gallery.title}"? This action cannot be undone.`)) {
        onDelete(gallery.id);
      }
    }
  };

  const handleShare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const url = `${window.location.origin}/gallery/${gallery.slug}`;
    
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url)
        .then(() => {
          alert('Gallery link copied to clipboard!');
        })
        .catch(err => {
          // console.error removed
          prompt('Copy this link:', url);
        });
    } else {
      prompt('Copy this link:', url);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden transition-transform hover:shadow-xl hover:-translate-y-1">
      <Link to={isAdmin ? `/admin/galleries/${gallery.id}` : `/gallery/${gallery.slug}`}>
        <div className="relative aspect-[4/3] overflow-hidden">
          {gallery.coverImage ? (
            <img 
              src={gallery.coverImage} 
              alt={gallery.title}
              className="w-full h-full object-cover"
              style={{ 
                objectPosition: gallery.coverPosition 
                  ? `${gallery.coverPosition.x}% ${gallery.coverPosition.y}%` 
                  : '50% 50%' 
              }}
            />
          ) : (
            <div className="w-full h-full bg-gray-200 flex items-center justify-center">
              <Eye className="h-12 w-12 text-gray-400" />
            </div>
          )}
          <div className="absolute top-0 left-0 w-full p-2 flex justify-between items-center">
            <div className="flex items-center">
              {gallery.passwordHash ? (
                <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full flex items-center">
                  <Lock size={12} className="mr-1" /> Protected
                </span>
              ) : (
                <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full flex items-center">
                  <Unlock size={12} className="mr-1" /> Public
                </span>
              )}
            </div>
            {!gallery.downloadEnabled && (
              <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full flex items-center">
                <Download size={12} className="mr-1" /> Disabled
              </span>
            )}
          </div>
        </div>
      </Link>
      
      <div className="p-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">
          <Link to={isAdmin ? `/admin/galleries/${gallery.id}` : `/gallery/${gallery.slug}`}>
            {gallery.title}
          </Link>
        </h3>
        
        <div className="flex items-center text-sm text-gray-500 mb-4">
          <Calendar size={14} className="mr-1" />
          Created {formatDate(gallery.createdAt)}
        </div>
        
        <div className="flex justify-between items-center">
          {isAdmin ? (
            <div className="flex space-x-2">
              <Link 
                to={`/admin/galleries/${gallery.id}`}
                className="text-blue-600 hover:text-blue-800 p-1"
                title="View Gallery"
              >
                <Eye size={18} />
              </Link>
              <Link 
                to={`/admin/galleries/${gallery.id}/edit`}
                className="text-green-600 hover:text-green-800 p-1"
                title="Edit Gallery"
              >
                <Edit size={18} />
              </Link>
              <button
                onClick={handleShare}
                className="text-purple-600 hover:text-purple-800 p-1"
                title="Copy Share Link"
              >
                <Share2 size={18} />
              </button>
              <button
                onClick={handleDelete}
                className="text-red-600 hover:text-red-800 p-1"
                title="Delete Gallery"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ) : (
            <Link
              to={`/gallery/${gallery.slug}`}
              className="text-purple-600 hover:text-purple-800 font-medium text-sm"
            >
              View Gallery
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

export default GalleryCard;