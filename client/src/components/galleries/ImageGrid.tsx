import React, { useState, useEffect } from 'react';
import { GalleryImage } from '../../types/gallery';
import { proxiedImgProps } from '../../lib/imageProxy';
import { Heart, Download, Trash2, Eye, Image, Share2, ShoppingCart, Star, Upload } from 'lucide-react';
import { toggleImageFavorite, deleteGalleryImage, setGalleryCoverImage, setGalleryFeaturedImage } from '../../lib/gallery-api';
import PrintOrderModal from './PrintOrderModal';

interface ImageGridProps {
  images: GalleryImage[];
  galleryId: string;
  isAdmin?: boolean;
  isPublic?: boolean;
  authToken?: string;
  /** The in-gallery print store. Off unless the studio has switched it on AND
   *  payment is wired — ordering dispatches a physical print to Prodigi. */
  storeEnabled?: boolean;
  downloadEnabled?: boolean;
  onImageDeleted?: () => void;
  onSetCover?: () => void;
  onImageClick?: (index: number) => void;
  favorites?: Set<string>;
  onToggleFavorite?: (imageId: string) => void;
  selectedForSlideshow?: Set<string>;
  onToggleSelection?: (imageId: string) => void;
  onRunSlideshow?: () => void;
  onClearSelection?: () => void;
  onAddImages?: () => void;
}

const ImageGrid: React.FC<ImageGridProps> = ({ 
  images, 
  galleryId,
  isAdmin = false,
  isPublic = false,
  authToken = '',
  storeEnabled = false,
  downloadEnabled = true,
  onImageDeleted,
  onSetCover,
  onImageClick,
  favorites = new Set(),
  onToggleFavorite,
  selectedForSlideshow: externalSelection,
  onToggleSelection: externalToggleSelection,
  onRunSlideshow,
  onClearSelection,
  onAddImages,
}) => {
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedImageForOrder, setSelectedImageForOrder] = useState<GalleryImage | null>(null);
  const [internalSelection, setInternalSelection] = useState<Set<string>>(new Set());
  
  // Use external selection if provided, otherwise use internal
  const selectedForSlideshow = externalSelection || internalSelection;

  useEffect(() => {
    // Images updated - no additional layout initialization needed for CSS grid
  }, [images]);

  // Keyboard support for lightbox
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isLightboxOpen) return;
      
      if (event.key === 'Escape') {
        closeLightbox();
      } else if (event.key === 'ArrowLeft') {
        navigateImage('prev');
      } else if (event.key === 'ArrowRight') {
        navigateImage('next');
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isLightboxOpen]);

  const openLightbox = (image: GalleryImage, index: number) => {
    // If external slideshow handler is provided, use that instead
    if (onImageClick) {
      onImageClick(index);
      return;
    }
    
    // Otherwise use built-in lightbox
    setSelectedImage(image);
    setCurrentIndex(index);
    setIsLightboxOpen(true);
    
    // Log view action if public
    if (isPublic && authToken) {
      // This would be implemented to log a VIEW action
      // console.log removed
    }
  };

  const closeLightbox = () => {
    setIsLightboxOpen(false);
    setSelectedImage(null);
  };

  const navigateImage = (direction: 'next' | 'prev') => {
    if (images.length <= 1) return;
    
    let newIndex;
    if (direction === 'next') {
      newIndex = (currentIndex + 1) % images.length;
    } else {
      newIndex = (currentIndex - 1 + images.length) % images.length;
    }
    
    setCurrentIndex(newIndex);
    setSelectedImage(images[newIndex]);
  };

  const handleFavoriteToggle = async (image: GalleryImage, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    
    // If external favorite handler is provided, use that
    if (onToggleFavorite) {
      onToggleFavorite(image.id);
      return;
    }
    
    // Otherwise use built-in API call
    if (!isPublic || !authToken) return;
    
    try {
      setLoading(true);
      await toggleImageFavorite(image.id, authToken);
      
      // Update local state
      image.isFavorite = !image.isFavorite;
      setLoading(false);
    } catch (error) {
      // console.error removed
      setLoading(false);
    }
  };

  const handleDownload = async (image: GalleryImage, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!downloadEnabled) return;
    
    try {
      // Fetch the image blob to handle CORS and authentication issues
      const response = await fetch(image.displayUrl, {
        headers: authToken ? {
          'Authorization': `Bearer ${authToken}`,
        } : {}
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch image');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      // Create a download link
      const link = document.createElement('a');
      link.href = url;
      link.download = image.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the blob URL
      window.URL.revokeObjectURL(url);
      
      // Log download action if public
      if (isPublic && authToken) {
        // console.log removed
      }
    } catch (error) {
      // console.error removed
      // Fallback to direct link if blob method fails
      const link = document.createElement('a');
      link.href = image.displayUrl;
      link.download = image.filename;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleDelete = async (image: GalleryImage, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!isAdmin) return;
    
    if (window.confirm('Are you sure you want to delete this image? This action cannot be undone.')) {
      try {
        setLoading(true);
        await deleteGalleryImage(image.id);
        setLoading(false);
        
        if (onImageDeleted) {
          onImageDeleted();
        }
      } catch (error) {
        // console.error removed
        setLoading(false);
      }
    }
  };

  const handleSetCover = async (image: GalleryImage, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!isAdmin) return;
    
    try {
      setLoading(true);
      await setGalleryCoverImage(galleryId, image.id);
      setLoading(false);
      
      if (onSetCover) {
        onSetCover();
      }
    } catch (error) {
      // console.error removed
      setLoading(false);
    }
  };

  const handleSetFeatured = async (image: GalleryImage, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!isAdmin) return;
    
    try {
      setLoading(true);
      await setGalleryFeaturedImage(galleryId, image.id);
      setLoading(false);
      alert('Featured image set successfully!');
      
      if (onSetCover) {
        onSetCover(); // Trigger refresh
      }
    } catch (error) {
      console.error('Error setting featured image:', error);
      setLoading(false);
      alert('Failed to set featured image');
    }
  };

  const handleShareToJpegWriter = async (image: GalleryImage, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!isAdmin) return;
    
    try {
      setLoading(true);
      
      // Update the shared_to_togninja flag
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/gallery_images?id=eq.${image.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          shared_to_togninja: true
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update image status');
      }
      
      // Update local state
      image.sharedToTogninja = true;
      setLoading(false);
      
      alert('Image shared to JpegWriter successfully!');
    } catch (error) {
      // console.error removed
      setLoading(false);
      alert('Failed to share image to JpegWriter. Please try again.');
    }
  };

  const handleOrderPrint = (image: GalleryImage, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedImageForOrder(image);
  };

  const handleCloseOrderModal = () => {
    setSelectedImageForOrder(null);
  };

  const handleRating = async (image: GalleryImage, rating: 'love' | 'maybe' | 'reject', e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      console.log('Rating request:', {
        url: `/api/galleries/${galleryId}/images/${image.id}/rating`,
        galleryId,
        imageId: image.id,
        rating,
        hasAuthToken: !!authToken
      });

      const response = await fetch(`/api/galleries/${galleryId}/images/${image.id}/rating`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({ rating }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Rating update failed:', errorData);
        throw new Error(errorData.error || 'Failed to update rating');
      }

      // Update local state
      image.rating = rating;
      
      // Force re-render by updating loading state
      setLoading(true);
      setTimeout(() => setLoading(false), 100);
      
      console.log('Rating updated successfully');
    } catch (error) {
      console.error('Error updating rating:', error);
      alert('Failed to update rating. Please try again.');
    }
  };

  const toggleImageSelection = (imageId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (externalToggleSelection) {
      externalToggleSelection(imageId);
    } else {
      setInternalSelection(prev => {
        const newSet = new Set(prev);
        if (newSet.has(imageId)) {
          newSet.delete(imageId);
        } else {
          newSet.add(imageId);
        }
        return newSet;
      });
    }
  };

  const handleRunSlideshow = () => {
    if (selectedForSlideshow.size === 0) {
      alert('Please select at least one image for the slideshow');
      return;
    }
    
    // Get selected images in order
    const selectedImages = images.filter(img => selectedForSlideshow.has(img.id));
    
    if (selectedImages.length > 0 && onImageClick) {
      // Open slideshow with first selected image
      const firstIndex = images.indexOf(selectedImages[0]);
      onImageClick(firstIndex);
    }
  };

  const clearSelection = () => {
    if (onClearSelection) {
      onClearSelection();
    } else {
      setInternalSelection(new Set());
    }
  };

  return (
    <div>
      {images.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Image className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Images Yet</h3>
          <p className="text-gray-500 mb-4">
            {isAdmin 
              ? 'Upload images to get started.' 
              : 'This gallery is empty. Check back later.'}
          </p>
          {isAdmin && onAddImages && (
            <button
              onClick={onAddImages}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 transition-colors"
            >
              <Upload className="h-4 w-4 mr-2" />
              Add Images
            </button>
          )}
        </div>
      ) : (
        <div className="gallery-grid grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {images.map((image, index) => (
            <div 
              key={image.id} 
              className="gallery-item relative group"
            >
              {/* Checkbox for slideshow selection */}
              <div className="absolute top-2 left-2 z-10">
                <input
                  type="checkbox"
                  checked={selectedForSlideshow.has(image.id)}
                  onChange={(e) => toggleImageSelection(image.id, e as any)}
                  onClick={(e) => e.stopPropagation()}
                  className="w-5 h-5 rounded border-2 border-white bg-white/80 checked:bg-blue-500 checked:border-blue-500 cursor-pointer shadow-lg"
                />
              </div>

              <div 
                className="aspect-square overflow-hidden rounded-lg cursor-pointer"
                onClick={() => openLightbox(image, index)}
              >
                <img
                  {...proxiedImgProps(image.thumbUrl, { w: 500 })}
                  alt={image.filename}
                  className="w-full h-full object-cover transition-transform group-hover:scale-110"
                  loading="lazy"
                  decoding="async"
                />
                
                {/* Overlay with buttons - positioned inside the clickable area */}
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-opacity flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none">
                  <div className="flex space-x-2 pointer-events-auto">
                  {isPublic && (
                    <button
                      onClick={(e) => handleFavoriteToggle(image, e)}
                      className={`p-2 rounded-full ${
                        (favorites.has(image.id) || image.isFavorite)
                          ? 'bg-red-500 text-white' 
                          : 'bg-white text-gray-800 hover:text-red-500'
                      }`}
                      disabled={loading}
                    >
                      <Heart size={16} className={(favorites.has(image.id) || image.isFavorite) ? 'fill-current' : ''} />
                    </button>
                  )}
                  
                  {downloadEnabled && (
                    <button
                      onClick={(e) => handleDownload(image, e)}
                      className="p-2 rounded-full bg-white text-gray-800 hover:text-blue-500"
                      disabled={loading}
                    >
                      <Download size={16} />
                    </button>
                  )}
                  
                  {/* Was gated on isPublic, which GalleryPage hardcodes to true — so the
                      Order Print button rendered on every image of every client gallery,
                      and ordering dispatched to the print lab with no payment taken. */}
                  {storeEnabled && (
                    <button
                      onClick={(e) => handleOrderPrint(image, e)}
                      className="p-2 rounded-full bg-green-500 text-white hover:bg-green-600"
                      title="Order Print"
                      disabled={loading}
                    >
                      <ShoppingCart size={16} />
                    </button>
                  )}
                  
                  {isAdmin && (
                    <>
                      <button
                        onClick={(e) => handleSetCover(image, e)}
                        className="p-2 rounded-full bg-white text-gray-800 hover:text-purple-500"
                        title="Set as Cover Image"
                        disabled={loading}
                      >
                        <Image size={16} />
                      </button>
                      <button
                        onClick={(e) => handleSetFeatured(image, e)}
                        className="p-2 rounded-full bg-white text-gray-800 hover:text-yellow-500"
                        title="Set as Featured Image"
                        disabled={loading}
                      >
                        <Star size={16} />
                      </button>
                      <button
                        onClick={(e) => handleShareToJpegWriter(image, e)}
                        className={`p-2 rounded-full bg-white text-gray-800 ${
                          image.sharedToTogninja ? 'text-green-500' : 'hover:text-green-500'
                        }`}
                        title={image.sharedToTogninja ? "Shared to JpegWriter" : "Share to JpegWriter"}
                        disabled={loading || image.sharedToTogninja}
                      >
                        <Share2 size={16} />
                      </button>
                      <button
                        onClick={(e) => handleDelete(image, e)}
                        className="p-2 rounded-full bg-white text-gray-800 hover:text-red-500"
                        title="Delete Image"
                        disabled={loading}
                      >
                        <Trash2 size={16} />
                      </button>
                    </>
                  )}
                </div>
                </div>
              </div>
              
              {isPublic && image.isFavorite && (
                <div className="absolute top-2 right-2">
                  <Heart size={16} className="text-red-500 fill-current" />
                </div>
              )}
              
              {isAdmin && image.sharedToTogninja && (
                <div className="absolute top-2 left-2">
                  <Share2 size={16} className="text-green-500" />
                </div>
              )}
              
              {/* Filename and title display below image */}
              <div className="mt-2 px-1">
                {image.title && (
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {image.title}
                  </p>
                )}
                <p className="text-xs text-gray-500 truncate" title={image.filename}>
                  {image.filename}
                </p>
              </div>
              
              {isAdmin && (
                <div className="absolute bottom-2 left-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-xs text-white bg-black bg-opacity-50 p-1 rounded truncate">
                    {image.filename}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      
      {/* Lightbox */}
      {isLightboxOpen && selectedImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-95 z-50 flex items-center justify-center"
          onClick={closeLightbox}
        >
          <div className="relative w-full h-full flex items-center justify-center p-4" onClick={(e) => e.stopPropagation()}>
            {/* Enhanced Close Button */}
            <button
              className="absolute top-4 right-4 text-white hover:text-gray-300 z-20 bg-black bg-opacity-50 rounded-full p-2"
              onClick={closeLightbox}
              title="Close (ESC)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            {/* Back to Gallery Button */}
            <button
              className="absolute top-4 left-4 text-white hover:text-gray-300 z-20 bg-black bg-opacity-50 rounded-full p-2 flex items-center space-x-2"
              onClick={closeLightbox}
              title="Back to Gallery"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span className="text-sm hidden sm:block">Back to Gallery</span>
            </button>
            
            {/* Navigation buttons */}
            {images.length > 1 && (
              <>
                <button
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white hover:text-gray-300 z-10"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigateImage('prev');
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white hover:text-gray-300 z-10"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigateImage('next');
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </>
            )}
            
            <img 
              src={selectedImage.displayUrl} 
              alt={selectedImage.filename}
              className="max-w-[95vw] max-h-[90vh] mx-auto object-contain"
            />
            
            <div className="absolute bottom-4 left-0 right-0 flex justify-center space-x-4">
              {/* Rating Emojis */}
              {isPublic && (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRating(selectedImage, 'love', e);
                    }}
                    className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl shadow-lg transition-all ${
                      selectedImage.rating === 'love' 
                        ? 'bg-green-500 scale-110 ring-2 ring-white' 
                        : 'bg-white/90 hover:bg-green-500/80 hover:scale-105'
                    }`}
                    title="Love it!"
                  >
                    😊
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRating(selectedImage, 'maybe', e);
                    }}
                    className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl shadow-lg transition-all ${
                      selectedImage.rating === 'maybe' 
                        ? 'bg-yellow-400 scale-110 ring-2 ring-white' 
                        : 'bg-white/90 hover:bg-yellow-400/80 hover:scale-105'
                    }`}
                    title="Maybe"
                  >
                    😐
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRating(selectedImage, 'reject', e);
                    }}
                    className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl shadow-lg transition-all ${
                      selectedImage.rating === 'reject' 
                        ? 'bg-red-500 scale-110 ring-2 ring-white' 
                        : 'bg-white/90 hover:bg-red-500/80 hover:scale-105'
                    }`}
                    title="Not for me"
                  >
                    ☹️
                  </button>
                </>
              )}

              {isPublic && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleFavoriteToggle(selectedImage);
                  }}
                  className={`p-2 rounded-full ${
                    selectedImage.isFavorite 
                      ? 'bg-red-500 text-white' 
                      : 'bg-white text-gray-800 hover:text-red-500'
                  }`}
                  disabled={loading}
                >
                  <Heart size={20} className={selectedImage.isFavorite ? 'fill-current' : ''} />
                </button>
              )}
              
              {downloadEnabled && (
                <button
                  onClick={(e) => handleDownload(selectedImage, e)}
                  className="p-2 rounded-full bg-white text-gray-800 hover:text-blue-500"
                  disabled={loading}
                >
                  <Download size={20} />
                </button>
              )}
              
              {isAdmin && (
                <>
                  <button
                    onClick={(e) => handleSetCover(selectedImage, e)}
                    className="p-2 rounded-full bg-white text-gray-800 hover:text-purple-500"
                    title="Set as Cover Image"
                    disabled={loading}
                  >
                    <Image size={20} />
                  </button>
                  <button
                    onClick={(e) => handleShareToJpegWriter(selectedImage, e)}
                    className={`p-2 rounded-full bg-white text-gray-800 ${
                      selectedImage.sharedToTogninja ? 'text-green-500' : 'hover:text-green-500'
                    }`}
                    title={selectedImage.sharedToTogninja ? "Shared to JpegWriter" : "Share to JpegWriter"}
                    disabled={loading || selectedImage.sharedToTogninja}
                  >
                    <Share2 size={20} />
                  </button>
                  <button
                    onClick={(e) => handleDelete(selectedImage, e)}
                    className="p-2 rounded-full bg-white text-gray-800 hover:text-red-500"
                    title="Delete Image"
                    disabled={loading}
                  >
                    <Trash2 size={20} />
                  </button>
                </>
              )}
            </div>
            
            {/* Filename display */}
            <div className="absolute bottom-16 left-0 right-0 text-center">
              <p className="text-sm text-white bg-black bg-opacity-50 inline-block px-2 py-1 rounded">
                {selectedImage.filename}
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Print Order Modal */}
      {selectedImageForOrder && (
        <PrintOrderModal
          image={selectedImageForOrder}
          galleryId={galleryId}
          onClose={handleCloseOrderModal}
          onOrderComplete={(orderId) => {
            console.log('Print order created:', orderId);
          }}
        />
      )}
    </div>
  );
};

export default ImageGrid;