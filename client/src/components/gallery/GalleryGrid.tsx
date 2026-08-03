import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  Search, 
  Filter, 
  Grid, 
  List, 
  Download, 
  Share2, 
  Edit, 
  Trash2, 
  Eye,
  Plus,
  Upload,
  Tag,
  Calendar,
  User,
  MapPin,
  Star,
  Heart,
  Loader2,
  AlertCircle,
  CheckCircle,
  X
} from 'lucide-react';

interface GalleryImage {
  id: string;
  title: string;
  description?: string;
  file_url: string;
  thumbnail_url?: string;
  file_size: number;
  mime_type: string;
  width?: number;
  height?: number;
  tags: string[];
  location?: string;
  date_taken?: string;
  camera_info?: {
    make?: string;
    model?: string;
    iso?: number;
    aperture?: string;
    shutter_speed?: string;
    focal_length?: string;
  };
  iptc_data?: {
    keywords?: string[];
    caption?: string;
    credit?: string;
    source?: string;
    copyright?: string;
  };
  created_at: string;
  updated_at: string;
  created_by: string;
  is_favorite: boolean;
  view_count: number;
  download_count: number;
}

interface GalleryGridProps {
  galleryId?: string;
  showUpload?: boolean;
  allowSelection?: boolean;
  onSelectionChange?: (selectedIds: string[]) => void;
  maxSelection?: number;
}

const GalleryGrid: React.FC<GalleryGridProps> = ({
  galleryId,
  showUpload = false,
  allowSelection = false,
  onSelectionChange,
  maxSelection
}) => {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [filteredImages, setFilteredImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // UI State
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'size' | 'views'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  
  // Modal state
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  
  // Filter state
  const [showFilters, setShowFilters] = useState(false);
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' });
  const [fileSizeRange, setFileSizeRange] = useState<{ min: number; max: number }>({ min: 0, max: 0 });

  const allTags = Array.from(new Set(images.flatMap(img => img.tags)));

  useEffect(() => {
    fetchImages();
  }, [galleryId]);

  useEffect(() => {
    filterAndSortImages();
  }, [images, searchTerm, selectedTags, sortBy, sortOrder, dateRange, fileSizeRange]);

  useEffect(() => {
    if (onSelectionChange) {
      onSelectionChange(selectedImages);
    }
  }, [selectedImages, onSelectionChange]);

  const fetchImages = async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('gallery_images')
        .select('*')
        .order('created_at', { ascending: false });

      if (galleryId) {
        query = query.eq('gallery_id', galleryId);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      setImages(data || []);
    } catch (err) {
      // console.error removed
      setError('Failed to load images');
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortImages = () => {
    let filtered = [...images];

    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(img => 
        img.title.toLowerCase().includes(searchLower) ||
        img.description?.toLowerCase().includes(searchLower) ||
        img.tags.some(tag => tag.toLowerCase().includes(searchLower)) ||
        img.iptc_data?.keywords?.some(keyword => keyword.toLowerCase().includes(searchLower))
      );
    }

    // Tag filter
    if (selectedTags.length > 0) {
      filtered = filtered.filter(img =>
        selectedTags.every(tag => img.tags.includes(tag))
      );
    }

    // Date range filter
    if (dateRange.start || dateRange.end) {
      filtered = filtered.filter(img => {
        const imgDate = new Date(img.date_taken || img.created_at);
        const startDate = dateRange.start ? new Date(dateRange.start) : new Date(0);
        const endDate = dateRange.end ? new Date(dateRange.end) : new Date();
        return imgDate >= startDate && imgDate <= endDate;
      });
    }

    // File size filter
    if (fileSizeRange.min > 0 || fileSizeRange.max > 0) {
      filtered = filtered.filter(img => {
        const size = img.file_size;
        const min = fileSizeRange.min || 0;
        const max = fileSizeRange.max || Infinity;
        return size >= min && size <= max;
      });
    }

    // Sort
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortBy) {
        case 'name':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case 'size':
          aValue = a.file_size;
          bValue = b.file_size;
          break;
        case 'views':
          aValue = a.view_count;
          bValue = b.view_count;
          break;
        case 'date':
        default:
          aValue = new Date(a.date_taken || a.created_at);
          bValue = new Date(b.date_taken || b.created_at);
          break;
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    setFilteredImages(filtered);
  };

  const handleImageSelect = (imageId: string) => {
    if (!allowSelection) return;

    setSelectedImages(prev => {
      const isSelected = prev.includes(imageId);
      let newSelection: string[];

      if (isSelected) {
        newSelection = prev.filter(id => id !== imageId);
      } else {
        if (maxSelection && prev.length >= maxSelection) {
          // Replace the first selected item if at max capacity
          newSelection = [...prev.slice(1), imageId];
        } else {
          newSelection = [...prev, imageId];
        }
      }

      return newSelection;
    });
  };

  const handleBulkAction = async (action: string) => {
    if (selectedImages.length === 0) return;

    try {
      switch (action) {
        case 'delete':
          if (confirm(`Delete ${selectedImages.length} selected images?`)) {
            const { error } = await supabase
              .from('gallery_images')
              .delete()
              .in('id', selectedImages);

            if (error) throw error;

            await fetchImages();
            setSelectedImages([]);
          }
          break;

        case 'download':
          // Implement bulk download
          selectedImages.forEach(async (imageId) => {
            const image = images.find(img => img.id === imageId);
            if (image) {
              window.open(image.file_url, '_blank');
            }
          });
          break;

        case 'favorite':
          const { error: favError } = await supabase
            .from('gallery_images')
            .update({ is_favorite: true })
            .in('id', selectedImages);

          if (favError) throw favError;
          await fetchImages();
          break;

        case 'unfavorite':
          const { error: unfavError } = await supabase
            .from('gallery_images')
            .update({ is_favorite: false })
            .in('id', selectedImages);

          if (unfavError) throw unfavError;
          await fetchImages();
          break;
      }
    } catch (err) {
      // console.error removed
      setError('Failed to perform bulk action');
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Search images..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
          
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center space-x-2 px-4 py-2 border rounded-lg transition-colors ${
              showFilters ? 'bg-purple-50 border-purple-300 text-purple-600' : 'border-gray-300 hover:bg-gray-50'
            }`}
          >
            <Filter className="h-5 w-5" />
            <span>Filters</span>
          </button>
        </div>

        <div className="flex items-center space-x-4">
          {selectedImages.length > 0 && (
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">{selectedImages.length} selected</span>
              <button
                onClick={() => handleBulkAction('favorite')}
                className="p-2 text-gray-600 hover:text-yellow-500 transition-colors"
                title="Add to favorites"
              >
                <Star className="h-5 w-5" />
              </button>
              <button
                onClick={() => handleBulkAction('download')}
                className="p-2 text-gray-600 hover:text-blue-500 transition-colors"
                title="Download selected"
              >
                <Download className="h-5 w-5" />
              </button>
              <button
                onClick={() => handleBulkAction('delete')}
                className="p-2 text-gray-600 hover:text-red-500 transition-colors"
                title="Delete selected"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            </div>
          )}

          <div className="flex items-center space-x-2">
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [sort, order] = e.target.value.split('-');
                setSortBy(sort as any);
                setSortOrder(order as any);
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="date-desc">Newest First</option>
              <option value="date-asc">Oldest First</option>
              <option value="name-asc">Name A-Z</option>
              <option value="name-desc">Name Z-A</option>
              <option value="size-desc">Largest First</option>
              <option value="size-asc">Smallest First</option>
              <option value="views-desc">Most Viewed</option>
            </select>

            <div className="flex border border-gray-300 rounded-lg">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 ${viewMode === 'grid' ? 'bg-purple-50 text-purple-600' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                <Grid className="h-5 w-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 ${viewMode === 'list' ? 'bg-purple-50 text-purple-600' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                <List className="h-5 w-5" />
              </button>
            </div>
          </div>

          {showUpload && (
            <button
              onClick={() => setShowUploadModal(true)}
              className="flex items-center space-x-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Plus className="h-5 w-5" />
              <span>Upload</span>
            </button>
          )}
        </div>
      </div>

      {/* Advanced Filters */}
      {showFilters && (
        <div className="bg-gray-50 p-6 rounded-lg border">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Tags Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
              <div className="flex flex-wrap gap-2">
                {allTags.map(tag => (
                  <button
                    key={tag}
                    onClick={() => {
                      setSelectedTags(prev =>
                        prev.includes(tag)
                          ? prev.filter(t => t !== tag)
                          : [...prev, tag]
                      );
                    }}
                    className={`px-3 py-1 text-sm rounded-full transition-colors ${
                      selectedTags.includes(tag)
                        ? 'bg-purple-100 text-purple-800 border border-purple-300'
                        : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Date Range Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
              <div className="space-y-2">
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Start date"
                />
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="End date"
                />
              </div>
            </div>

            {/* File Size Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">File Size (MB)</label>
              <div className="space-y-2">
                <input
                  type="number"
                  value={fileSizeRange.min || ''}
                  onChange={(e) => setFileSizeRange(prev => ({ ...prev, min: Number(e.target.value) * 1024 * 1024 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Min size"
                />
                <input
                  type="number"
                  value={fileSizeRange.max ? fileSizeRange.max / (1024 * 1024) : ''}
                  onChange={(e) => setFileSizeRange(prev => ({ ...prev, max: Number(e.target.value) * 1024 * 1024 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Max size"
                />
              </div>
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedTags([]);
                setDateRange({ start: '', end: '' });
                setFileSizeRange({ min: 0, max: 0 });
              }}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Clear Filters
            </button>
          </div>
        </div>
      )}

      {/* Results Count */}
      <div className="text-sm text-gray-600">
        Showing {filteredImages.length} of {images.length} images
      </div>

      {/* Gallery Grid/List */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {filteredImages.map(image => (
            <div
              key={image.id}
              className={`relative group cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                selectedImages.includes(image.id)
                  ? 'border-purple-500 shadow-lg'
                  : 'border-transparent hover:border-gray-300'
              }`}
              onClick={() => allowSelection ? handleImageSelect(image.id) : setSelectedImage(image)}
            >
              <div className="aspect-square">
                <img
                  src={image.thumbnail_url || image.file_url}
                  alt={image.title}
                  className="w-full h-full object-cover"
                />
              </div>
              
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all">
                <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  {image.is_favorite && (
                    <Heart className="h-5 w-5 text-red-500 fill-current" />
                  )}
                </div>
                
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedImage(image);
                      setShowImageModal(true);
                    }}
                    className="p-1 bg-white rounded-full shadow-lg hover:bg-gray-100"
                  >
                    <Eye className="h-4 w-4 text-gray-600" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(image.file_url, '_blank');
                    }}
                    className="p-1 bg-white rounded-full shadow-lg hover:bg-gray-100"
                  >
                    <Download className="h-4 w-4 text-gray-600" />
                  </button>
                </div>

                <div className="absolute bottom-0 left-0 right-0 p-2 text-white bg-gradient-to-t from-black via-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-sm font-medium truncate">{image.title}</p>
                  <p className="text-xs text-gray-300">{formatFileSize(image.file_size)}</p>
                </div>
              </div>

              {allowSelection && (
                <div className="absolute top-2 left-2">
                  <div className={`w-6 h-6 rounded-full border-2 transition-colors ${
                    selectedImages.includes(image.id)
                      ? 'bg-purple-600 border-purple-600'
                      : 'bg-white border-gray-300'
                  }`}>
                    {selectedImages.includes(image.id) && (
                      <CheckCircle className="h-6 w-6 text-white" />
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredImages.map(image => (
            <div
              key={image.id}
              className={`flex items-center space-x-4 p-4 border rounded-lg transition-colors ${
                selectedImages.includes(image.id)
                  ? 'bg-purple-50 border-purple-300'
                  : 'bg-white border-gray-200 hover:bg-gray-50'
              }`}
            >
              {allowSelection && (
                <div
                  onClick={() => handleImageSelect(image.id)}
                  className="cursor-pointer"
                >
                  <div className={`w-6 h-6 rounded-full border-2 transition-colors ${
                    selectedImages.includes(image.id)
                      ? 'bg-purple-600 border-purple-600'
                      : 'bg-white border-gray-300'
                  }`}>
                    {selectedImages.includes(image.id) && (
                      <CheckCircle className="h-6 w-6 text-white" />
                    )}
                  </div>
                </div>
              )}

              <div className="w-16 h-16 rounded-lg overflow-hidden">
                <img
                  src={image.thumbnail_url || image.file_url}
                  alt={image.title}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-gray-900 truncate">{image.title}</h3>
                <p className="text-sm text-gray-500 truncate">{image.description}</p>
                <div className="flex items-center space-x-4 mt-1 text-xs text-gray-400">
                  <span>{formatFileSize(image.file_size)}</span>
                  <span>{formatDate(image.created_at)}</span>
                  <span>{image.view_count} views</span>
                  {image.tags.length > 0 && (
                    <div className="flex space-x-1">
                      {image.tags.slice(0, 3).map(tag => (
                        <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                          {tag}
                        </span>
                      ))}
                      {image.tags.length > 3 && (
                        <span className="text-gray-500">+{image.tags.length - 3}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {image.is_favorite && (
                  <Heart className="h-5 w-5 text-red-500 fill-current" />
                )}
                <button
                  onClick={() => {
                    setSelectedImage(image);
                    setShowImageModal(true);
                  }}
                  className="p-2 text-gray-600 hover:text-purple-600 transition-colors"
                >
                  <Eye className="h-5 w-5" />
                </button>
                <button
                  onClick={() => window.open(image.file_url, '_blank')}
                  className="p-2 text-gray-600 hover:text-blue-600 transition-colors"
                >
                  <Download className="h-5 w-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {filteredImages.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <Camera className="h-12 w-12 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No images found</h3>
          <p className="text-gray-600">
            {searchTerm || selectedTags.length > 0 
              ? 'Try adjusting your search or filter criteria'
              : 'Upload some images to get started'
            }
          </p>
        </div>
      )}
    </div>
  );
};

export default GalleryGrid;
