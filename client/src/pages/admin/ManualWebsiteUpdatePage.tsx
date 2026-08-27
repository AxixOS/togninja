   import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AdminLayout from '../../components/admin/AdminLayout';
import { useLanguage } from '../../context/LanguageContext';
import { Save, Eye, RotateCcw, FileText, Globe, Check, X, Upload, Trash2, Image as ImageIcon, Sparkles, TrendingUp, Wand2 } from 'lucide-react';
import { manualPageManifest, type ManualPageDefinition, type ManualPageSection, type ManualPageField } from '../../../../shared/manualPages';
import { SITE } from '../../config/site';
import { useAuthorityMap } from '../../hooks/useAuthorityMap';
import Cropper, { Area } from 'react-easy-crop';

// Default the editor's language to the studio's own locale (window.__SITE_CONFIG__ →
// SITE.lang) rather than always German, so an English-market studio starts in English.
const DEFAULT_EDITOR_LANG: 'de' | 'en' = (SITE.lang || '').toLowerCase().startsWith('de') ? 'de' : 'en';

// The image-slot list is built per studio inside HomepageImagesManager, from its own
// Authority Map. The fixed list that stood here named six of the origin studio's services
// as the only addressable slots.

interface PageContent {
  id?: string;
  pageId: string;
  language: string;
  draftContent: Record<string, string>;
  publishedContent: Record<string, string>;
  status: string;
  publishedAt?: string;
  updatedAt?: string;
}

const createImageElement = (url: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous');
    image.src = url;
  });
};

const getCroppedImageBlob = async (imageSrc: string, crop: Area, mimeType: string): Promise<Blob> => {
  const image = await createImageElement(imageSrc);
  const canvas = document.createElement('canvas');
  const targetWidth = Math.round(crop.width);
  const targetHeight = Math.round(crop.height);
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Canvas context unavailable');
  }

  ctx.drawImage(
    image,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    targetWidth,
    targetHeight
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Failed to crop image'));
        return;
      }
      resolve(blob);
    }, mimeType || 'image/jpeg', 0.92);
  });
};

// Homepage Images Manager Component
const HomepageImagesManager: React.FC = () => {
  // Needed for the section labels, which read the studio's own service names.
  const { t } = useLanguage();
  // The service slots come from the studio's own Authority Map — see the note at the
  // <select> below for why a fixed list was wrong.
  const { map: authorityMap } = useAuthorityMap();
  const imageSections = useMemo(() => {
    const fixed = [
      { value: 'hero', label: 'Hero / Main Grid' },
      { value: 'content-1', label: 'Content Block 1' },
      { value: 'content-2', label: 'Content Block 2' },
    ];
    const services = (authorityMap?.pillars || [])
      .filter((p: any) => p?.href && p?.label)
      .map((p: any) => ({
        value: 'services-' + String(p.href).replace(/^\/+|\/+$/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        label: `Services – ${p.label}`,
      }));
    return [...fixed, ...services, { value: 'faq', label: 'FAQ' }];
  }, [authorityMap]);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [newImageSection, setNewImageSection] = useState('hero');
  const [uploadMethod, setUploadMethod] = useState<'url' | 'file'>('file');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  // Confirmation shown after a successful upload.
  const [uploadNote, setUploadNote] = useState<string | null>(null);
  const [replacingImage, setReplacingImage] = useState<any | null>(null);
  const [replaceMethod, setReplaceMethod] = useState<'url' | 'file'>('file');
  const [replaceUrl, setReplaceUrl] = useState('');
  const [replaceFile, setReplaceFile] = useState<File | null>(null);
  const queryClient = useQueryClient();

  // Admin token helper (read fresh from localStorage each call)
  const getAdminToken = () => (typeof window !== 'undefined' ? (localStorage.getItem('ADMIN_TOKEN') || '') : '');
  const withAdminHeaders = () => ({ 'x-admin-token': getAdminToken() });
  const withAdminJsonHeaders = () => ({ 'Content-Type': 'application/json', 'x-admin-token': getAdminToken() });

  // Fetch homepage images
  const { data: images, isLoading } = useQuery({
    queryKey: ['/api/homepage/images'],
    queryFn: async () => {
      const res = await fetch('/api/homepage/images', {
        credentials: 'include',
        headers: withAdminHeaders()
      });
      if (!res.ok) throw new Error('Failed to fetch images');
      return res.json();
    }
  });

  // Add image via URL mutation
  const addImageMutation = useMutation({
    mutationFn: async (data: { section: string; url: string }) => {
      const res = await fetch('/api/homepage/images', {
        method: 'POST',
        credentials: 'include',
        headers: withAdminJsonHeaders(),
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error('Failed to add image');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/homepage/images'] });
      setNewImageUrl('');
    }
  });

  // Upload image file mutation — supports selecting multiple files at once.
  const uploadImageMutation = useMutation({
    mutationFn: async (data: { files: File[]; section: string }) => {
      // Files upload one at a time, so report which one is in flight — a multi-file
      // upload otherwise sits on a single static label with no sign of progress.
      for (let i = 0; i < data.files.length; i++) {
        const file = data.files[i];
        setUploadProgress(i + 1);
        const formData = new FormData();
        formData.append('image', file);
        formData.append('section', data.section);

        const res = await fetch('/api/homepage/images/upload', {
          method: 'POST',
          credentials: 'include',
          headers: withAdminHeaders(),
          body: formData
        });
        if (!res.ok) {
          const error = await res.json().catch(() => ({}));
          throw new Error(error.message || `Failed to upload ${file.name}`);
        }
      }
      return { ok: true, count: data.files.length };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['/api/homepage/images'] });
      // Confirm it worked. The selection used to just clear, which is
      // indistinguishable from the upload silently doing nothing.
      const n = (result as any)?.count ?? selectedFiles.length;
      setUploadNote(`${n} image${n === 1 ? '' : 's'} uploaded and added to your homepage.`);
      window.setTimeout(() => setUploadNote(null), 6000);
      setSelectedFiles([]);
      setUploadProgress(0);
    },
    onError: () => setUploadProgress(0)
  });

  // Delete image mutation
  const deleteImageMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/homepage/images/${id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: withAdminHeaders()
      });
      if (!res.ok) throw new Error('Failed to delete image');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/homepage/images'] });
    }
  });

  const handleAddImage = () => {
    if (uploadMethod === 'url') {
      if (!newImageUrl.trim()) return;
      addImageMutation.mutate({
        section: newImageSection,
        url: newImageUrl.trim()
      });
    } else {
      if (!selectedFiles.length) return;
      uploadImageMutation.mutate({
        files: selectedFiles,
        section: newImageSection
      });
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length) {
      setSelectedFiles(Array.from(files));
    }
  };

  const handleReplaceFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      setReplaceFile(files[0]);
    }
  };

  // Replace image mutation
  const replaceImageMutation = useMutation({
    mutationFn: async (data: { id: string; file?: File; url?: string }) => {
      if (data.file) {
        // Upload new file
        const formData = new FormData();
        formData.append('image', data.file);
        formData.append('section', replacingImage.section);

        const uploadRes = await fetch('/api/homepage/images/upload', {
          method: 'POST',
          credentials: 'include',
          headers: withAdminHeaders(),
          body: formData
        });
        if (!uploadRes.ok) {
          const error = await uploadRes.json();
          throw new Error(error.message || 'Failed to upload image');
        }
        const uploadData = await uploadRes.json();
        
        // No second request. The upload replaces the section server-side, atomically.
        // This used to fire a DELETE and never look at the response, so a failed delete
        // left two images on one section and the homepage showed whichever sorted first.
        return uploadData;
      } else if (data.url) {
        // Update with new URL
        const res = await fetch(`/api/homepage/images/${data.id}`, {
          method: 'PUT',
          credentials: 'include',
          headers: withAdminJsonHeaders(),
          body: JSON.stringify({ url: data.url })
        });
        if (!res.ok) throw new Error('Failed to update image');
        return res.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/homepage/images'] });
      setReplacingImage(null);
      setReplaceFile(null);
      setReplaceUrl('');
    }
  });

  const handleReplace = () => {
    if (!replacingImage) return;
    
    if (replaceMethod === 'file' && replaceFile) {
      replaceImageMutation.mutate({ id: replacingImage.id, file: replaceFile });
    } else if (replaceMethod === 'url' && replaceUrl.trim()) {
      replaceImageMutation.mutate({ id: replacingImage.id, url: replaceUrl.trim() });
    }
  };

  return (
    <div className="space-y-6">
      {/* Add New Image */}
      <div className="bg-white rounded-lg border-2 border-dashed border-purple-200 p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Upload size={20} />
          Add New Image
        </h3>
        
        {/* Upload Method Toggle */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setUploadMethod('file')}
            className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
              uploadMethod === 'file'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Upload File (Recommended)
          </button>
          <button
            onClick={() => setUploadMethod('url')}
            className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
              uploadMethod === 'url'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Use URL
          </button>
        </div>

        <div className="space-y-4">
          {uploadMethod === 'file' ? (
            /* File Upload */
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Image File
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="file"
                  multiple
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={handleFileSelect}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                {selectedFiles.length > 0 && (
                  <div className="text-sm text-green-600 flex items-center gap-1">
                    <Check size={16} />
                    {selectedFiles.length === 1 ? selectedFiles[0].name : `${selectedFiles.length} images selected`}
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                JPG, PNG, or WebP • Max 20MB each • You can select several files at once
              </p>
            </div>
          ) : (
            /* URL Input */
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Image URL</label>
              <input
                type="text"
                value={newImageUrl}
                onChange={(e) => setNewImageUrl(e.target.value)}
                placeholder="https://example.com/image.jpg"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Section</label>
            <select
              value={newImageSection}
              onChange={(e) => setNewImageSection(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              {/* The three fixed slots, then one per service from the studio's own
                  Authority Map.

                  A previous pass relabelled the six services- entries but left their
                  VALUES as services-family|pregnancy|newborn|business|event|product. Those
                  are the origin studio's slots. A studio whose crawl produced, say,
                  services-fashion-photography had no way to address its own slot from this
                  screen at all — so "you can add images later in Website Studio", which
                  the onboarding step tells them, was not true. Derived with the same
                  expression HomePage uses for its cards, so the two cannot drift. */}
              {imageSections.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          <button
            onClick={handleAddImage}
            disabled={
              (uploadMethod === 'url' && !newImageUrl.trim()) ||
              (uploadMethod === 'file' && !selectedFiles.length) ||
              addImageMutation.isPending ||
              uploadImageMutation.isPending
            }
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Upload size={16} />
            {addImageMutation.isPending || uploadImageMutation.isPending
              ? uploadMethod === 'file'
                // "Uploading to B2" named the storage provider, which means nothing to a
                // studio and is wrong for anyone on Supabase. Show real progress instead.
                ? `Saving image ${uploadProgress} of ${selectedFiles.length}...`
                : 'Adding...'
              : uploadMethod === 'file'
              ? `Save ${selectedFiles.length || ''} image${selectedFiles.length === 1 ? '' : 's'} to homepage`.replace(/\s+/g, ' ')
              : 'Add Image'}
          </button>

          {uploadNote && (
            <div className="text-sm text-green-700 bg-green-50 border border-green-200 p-3 rounded-lg flex items-center gap-2">
              <Check size={16} />
              {uploadNote}
            </div>
          )}

          {uploadImageMutation.isError && (
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
              {uploadImageMutation.error?.message || 'Upload failed'}
            </div>
          )}
        </div>
      </div>

      {/* Current Images */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <ImageIcon size={20} />
          Current Homepage Images ({images?.length || 0})
        </h3>
        
        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">Loading images...</p>
          </div>
        ) : images && images.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {images.map((image: any) => (
              <div key={image.id} className="relative group border border-gray-200 rounded-lg overflow-hidden">
                <img
                  src={image.url}
                  alt={image.alt || 'Homepage image'}
                  className="w-full h-48 object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400x300?text=Image+Not+Found';
                  }}
                />
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 flex items-center justify-center gap-3">
                  <button
                    onClick={() => {
                      setReplacingImage(image);
                      setReplaceMethod('file');
                      setReplaceUrl('');
                      setReplaceFile(null);
                    }}
                    className="opacity-0 group-hover:opacity-100 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-all flex items-center gap-2"
                  >
                    <Upload size={16} />
                    Replace
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('Delete this image?')) {
                        deleteImageMutation.mutate(image.id);
                      }
                    }}
                    className="opacity-0 group-hover:opacity-100 bg-red-600 text-white p-2 rounded-full hover:bg-red-700 transition-all"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
                <div className="p-3 bg-gray-50">
                  <p className="text-sm font-medium text-gray-700">{image.section}</p>
                  {image.title && <p className="text-xs text-gray-500 mt-1">{image.title}</p>}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <ImageIcon size={48} className="mx-auto mb-4 opacity-30" />
            <p>No images yet. Add your first image above.</p>
          </div>
        )}
      </div>

      {/* Replace Image Modal */}
      {replacingImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-gray-900">
                  Replace Image: {replacingImage.section}
                </h3>
                <button
                  onClick={() => setReplacingImage(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Current Image Preview */}
              <div className="mb-6">
                <p className="text-sm font-medium text-gray-700 mb-2">Current Image:</p>
                <img
                  src={replacingImage.url}
                  alt="Current"
                  className="w-full h-48 object-cover rounded-lg border border-gray-200"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400x300?text=Current+Image';
                  }}
                />
              </div>

              {/* Upload Method Toggle */}
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setReplaceMethod('file')}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                    replaceMethod === 'file'
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Upload New File
                </button>
                <button
                  onClick={() => setReplaceMethod('url')}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                    replaceMethod === 'url'
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Use URL
                </button>
              </div>

              {/* Replace Input */}
              <div className="space-y-4 mb-6">
                {replaceMethod === 'file' ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select New Image File
                    </label>
                    <input
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp"
                      onChange={handleReplaceFileSelect}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                    {replaceFile && (
                      <div className="mt-2 text-sm text-green-600 flex items-center gap-1">
                        <Check size={16} />
                        {replaceFile.name} ({(replaceFile.size / 1024 / 1024).toFixed(2)} MB)
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      New Image URL
                    </label>
                    <input
                      type="text"
                      value={replaceUrl}
                      onChange={(e) => setReplaceUrl(e.target.value)}
                      placeholder="https://example.com/new-image.jpg"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setReplacingImage(null)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReplace}
                  disabled={
                    (replaceMethod === 'file' && !replaceFile) ||
                    (replaceMethod === 'url' && !replaceUrl.trim()) ||
                    replaceImageMutation.isPending
                  }
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Upload size={16} />
                  {replaceImageMutation.isPending
                    ? replaceMethod === 'file'
                      ? 'Uploading...'
                      : 'Updating...'
                    : 'Replace Image'}
                </button>
              </div>

              {replaceImageMutation.isError && (
                <div className="mt-4 text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                  {replaceImageMutation.error?.message || 'Replace failed'}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Portfolio Images Manager Component
const PortfolioImagesManager: React.FC = () => {
  // Needed for the category labels, which read the studio's own naming.
  const { t } = useLanguage();
  const [newImageUrl, setNewImageUrl] = useState('');
  const [newImageCategory, setNewImageCategory] = useState('family');
  const [newImageTitle, setNewImageTitle] = useState('');
  const [uploadMethod, setUploadMethod] = useState<'url' | 'file'>('file');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadNote, setUploadNote] = useState<string | null>(null);
  const [replacingImage, setReplacingImage] = useState<any | null>(null);
  const [replaceMethod, setReplaceMethod] = useState<'url' | 'file'>('file');
  const [replaceUrl, setReplaceUrl] = useState('');
  const [replaceFile, setReplaceFile] = useState<File | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const queryClient = useQueryClient();

  const getAdminToken = () => (typeof window !== 'undefined' ? (localStorage.getItem('ADMIN_TOKEN') || '') : '');
  const withAdminHeaders = () => ({ 'x-admin-token': getAdminToken() });
  const withAdminJsonHeaders = () => ({ 'Content-Type': 'application/json', 'x-admin-token': getAdminToken() });
  // The studio's own photographs, from the crawl of the site they already have. A public GET —
  // the list is nothing but image addresses from their own public website.
  const { data: ownPhotosRaw } = useQuery({
    queryKey: ['/api/setup/crawled-images'],
    queryFn: async () => (await fetch('/api/setup/crawled-images')).json(),
    staleTime: 5 * 60_000,
  });
  const ownPhotos: any[] = Array.isArray(ownPhotosRaw?.images) ? ownPhotosRaw.images : [];
  const [addingOwn, setAddingOwn] = useState<string | null>(null);

  const addOwnPhoto = async (img: { url: string; label?: string }) => {
    setAddingOwn(img.url);
    try {
      const res = await fetch('/api/portfolio/images', {
        method: 'POST',
        headers: withAdminJsonHeaders(),
        // The server copies the bytes into the studio's own bucket before recording the row, so
        // what is stored is a copy rather than a link to the site they are migrating away from.
        body: JSON.stringify({ category: newImageCategory, url: img.url, alt: img.label || '', title: img.label || '' }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({} as any));
        setUploadNote(body?.error || 'Could not add that photograph.');
        return;
      }
      queryClient.invalidateQueries({ queryKey: ['/api/portfolio/images'] });
    } catch {
      setUploadNote('Could not reach the server.');
    } finally {
      setAddingOwn(null);
    }
  };

  // Category IDs are structural (portfolio images are stored against them); the labels
  // are the studio's own and come from the same keys the public portfolio page uses,
  // so renaming a category in Website Studio renames it in both places. They were
  // previously hardcoded to New Age's service list here and on the public page.
  const categories = ['family', 'newborn', 'maternity', 'wedding', 'business', 'event', 'featured']
    .map((value) => {
      const key = `portfolio.category.${value}`;
      const label = t(key);
      return { value, label: label && label !== key ? label : value };
    });

  // Named in the picker below, so it is clear where a chosen photograph lands.
  const categoryLabel = categories.find((c) => c.value === newImageCategory)?.label || newImageCategory;

  // Fetch portfolio images
  const { data: images, isLoading } = useQuery({
    queryKey: ['/api/portfolio/images'],
    queryFn: async () => {
      const res = await fetch('/api/portfolio/images', {
        credentials: 'include',
        headers: withAdminHeaders()
      });
      if (!res.ok) throw new Error('Failed to fetch images');
      return res.json();
    }
  });

  // Add image via URL mutation
  const addImageMutation = useMutation({
    mutationFn: async (data: { category: string; url: string; title?: string }) => {
      const res = await fetch('/api/portfolio/images', {
        method: 'POST',
        credentials: 'include',
        headers: withAdminJsonHeaders(),
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error('Failed to add image');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/portfolio/images'] });
      setNewImageUrl('');
      setNewImageTitle('');
    }
  });

  // Upload image file mutation
  const uploadImageMutation = useMutation({
    // Portfolio accepted ONE file at a time while the homepage uploader already took
    // several — adding a portfolio set meant repeating the whole flow per photo.
    mutationFn: async (data: { files: File[]; category: string; title?: string }) => {
      for (let i = 0; i < data.files.length; i++) {
        setUploadProgress(i + 1);
        const formData = new FormData();
        formData.append('image', data.files[i]);
        formData.append('category', data.category);
        // A single title across a batch would label every image identically, so it
        // only applies when one file is being uploaded.
        if (data.title && data.files.length === 1) formData.append('title', data.title);

        const res = await fetch('/api/portfolio/images/upload', {
          method: 'POST',
          credentials: 'include',
          headers: withAdminHeaders(),
          body: formData
        });
        if (!res.ok) {
          const error = await res.json().catch(() => ({}));
          throw new Error(error.message || `Failed to upload ${data.files[i].name}`);
        }
      }
      return { ok: true, count: data.files.length };
    },
    onSuccess: (result: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/portfolio/images'] });
      const n = result?.count ?? 1;
      setUploadNote(`${n} image${n === 1 ? '' : 's'} added to your portfolio.`);
      window.setTimeout(() => setUploadNote(null), 6000);
      setSelectedFiles([]);
      setNewImageTitle('');
      setUploadProgress(0);
    },
    onError: () => setUploadProgress(0)
  });

  // Delete image mutation
  const deleteImageMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/portfolio/images/${id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: withAdminHeaders()
      });
      if (!res.ok) throw new Error('Failed to delete image');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/portfolio/images'] });
    }
  });

  // Replace image mutation
  const replaceImageMutation = useMutation({
    mutationFn: async (data: { id: string; file?: File; url?: string }) => {
      if (data.file) {
        const formData = new FormData();
        formData.append('image', data.file);
        formData.append('category', replacingImage.category);

        const uploadRes = await fetch('/api/portfolio/images/upload', {
          method: 'POST',
          credentials: 'include',
          headers: withAdminHeaders(),
          body: formData
        });
        if (!uploadRes.ok) throw new Error('Failed to upload new image');
        const uploadedImage = await uploadRes.json();

        // Delete old image
        await fetch(`/api/portfolio/images/${data.id}`, {
          method: 'DELETE',
          credentials: 'include',
          headers: withAdminHeaders()
        });

        return uploadedImage;
      } else if (data.url) {
        const res = await fetch(`/api/portfolio/images/${data.id}`, {
          method: 'PUT',
          credentials: 'include',
          headers: withAdminJsonHeaders(),
          body: JSON.stringify({ url: data.url })
        });
        if (!res.ok) throw new Error('Failed to update image URL');
        return res.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/portfolio/images'] });
      setReplacingImage(null);
      setReplaceUrl('');
      setReplaceFile(null);
    }
  });

  const handleAddImage = () => {
    if (uploadMethod === 'url') {
      if (!newImageUrl.trim()) return;
      addImageMutation.mutate({
        category: newImageCategory,
        url: newImageUrl.trim(),
        title: newImageTitle.trim() || undefined
      });
    } else {
      if (!selectedFiles.length) return;
      uploadImageMutation.mutate({
        files: selectedFiles,
        category: newImageCategory,
        title: newImageTitle.trim() || undefined
      });
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length) {
      setSelectedFiles(Array.from(files));
    }
  };

  const handleReplaceFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      setReplaceFile(files[0]);
    }
  };

  const handleReplace = () => {
    if (!replacingImage) return;
    if (replaceMethod === 'file' && replaceFile) {
      replaceImageMutation.mutate({ id: replacingImage.id, file: replaceFile });
    } else if (replaceMethod === 'url' && replaceUrl.trim()) {
      replaceImageMutation.mutate({ id: replacingImage.id, url: replaceUrl.trim() });
    }
  };

  const filteredImages = images?.filter((img: any) => 
    filterCategory === 'all' || img.category === filterCategory
  );

  const groupedImages = categories.reduce((acc: any, cat) => {
    acc[cat.value] = filteredImages?.filter((img: any) => img.category === cat.value) || [];
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Add New Image */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Upload size={20} className="text-purple-600" />
          Add Portfolio Image
        </h3>

        <div className="space-y-4">
          {/* Category Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
            <select
              value={newImageCategory}
              onChange={(e) => setNewImageCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              {categories.map((cat) => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
          </div>

          {/* Title Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Title (optional)</label>
            <input
              type="text"
              value={newImageTitle}
              onChange={(e) => setNewImageTitle(e.target.value)}
              placeholder="E.g., Family Joy, Wedding Day"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          {/* Upload Method Toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => setUploadMethod('file')}
              className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                uploadMethod === 'file'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Upload File
            </button>
            <button
              onClick={() => setUploadMethod('url')}
              className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                uploadMethod === 'url'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Use URL
            </button>
          </div>

          {/* Upload/URL Input */}
          {uploadMethod === 'file' ? (
            <div>
              <input
                type="file"
                multiple
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={handleFileSelect}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
              <p className="mt-1 text-xs text-gray-500">You can select several files at once.</p>
              {selectedFiles.length > 0 && (
                <div className="mt-2 text-sm text-green-600 flex items-center gap-1">
                  <Check size={16} />
                  {selectedFiles.length === 1
                    ? `${selectedFiles[0].name} (${(selectedFiles[0].size / 1024 / 1024).toFixed(2)} MB)`
                    : `${selectedFiles.length} images selected`}
                </div>
              )}
            </div>
          ) : (
            <input
              type="text"
              value={newImageUrl}
              onChange={(e) => setNewImageUrl(e.target.value)}
              placeholder="https://example.com/image.jpg"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          )}

          {/* Submit Button */}
          <button
            onClick={handleAddImage}
            disabled={
              (uploadMethod === 'file' && !selectedFiles.length) ||
              (uploadMethod === 'url' && !newImageUrl.trim()) ||
              addImageMutation.isPending ||
              uploadImageMutation.isPending
            }
            className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Upload size={18} />
            {addImageMutation.isPending || uploadImageMutation.isPending
              ? uploadMethod === 'file'
                ? `Saving image ${uploadProgress} of ${selectedFiles.length}...`
                : 'Adding...'
              : uploadMethod === 'file'
              ? `Save ${selectedFiles.length || ''} image${selectedFiles.length === 1 ? '' : 's'} to portfolio`.replace(/\s+/g, ' ')
              : 'Add Image'}
          </button>

          {uploadNote && (
            <div className="text-sm text-green-700 bg-green-50 border border-green-200 p-3 rounded-lg flex items-center gap-2">
              <Check size={16} />
              {uploadNote}
            </div>
          )}

          {uploadImageMutation.isError && (
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
              {uploadImageMutation.error?.message || 'Upload failed'}
            </div>
          )}
        </div>
      </div>

      {/*
        THEIR OWN PHOTOGRAPHS, from the site they already have.

        The crawler has recorded every image on the studio's existing website since it shipped,
        and the setup wizard offers them for the nine site slots. Nothing offered them here — so
        a studio whose portfolio is empty was asked to re-upload work that is already in the
        database. Measured on a real site: 35 photographs available, portfolio showing zero.
        crawledImages() reads the most recent crawl and does not expire, so this keeps working
        long after onboarding.

        POST /api/portfolio/images copies the bytes into the studio's own bucket (v1.9.185), so
        choosing one here stores a copy rather than a link to the site they are leaving.
      */}
      {ownPhotos.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold flex items-center gap-2 mb-1">
            <ImageIcon size={20} />
            From your existing website
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            {ownPhotos.length} photograph{ownPhotos.length === 1 ? '' : 's'} we found on your site.
            Choosing one stores a copy in your own bucket, so it keeps working the day your old site goes
            — and files it under <strong>{categoryLabel}</strong>, the category selected above.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            {ownPhotos.map((img: any) => (
              <button
                key={img.url}
                type="button"
                disabled={addingOwn === img.url}
                onClick={() => addOwnPhoto(img)}
                title={img.label || 'Add to portfolio'}
                className="group relative aspect-square overflow-hidden rounded-lg border border-gray-200 hover:border-purple-400 disabled:opacity-50"
              >
                <img src={img.url} alt={img.label || ''} loading="lazy" className="h-full w-full object-cover" />
                <span className="absolute inset-x-0 bottom-0 bg-black/60 text-white text-[10px] px-1 py-0.5 truncate">
                  {addingOwn === img.url ? 'Adding…' : (img.label || 'Add')}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Filter and Current Images */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <ImageIcon size={20} />
            Portfolio Images ({images?.length || 0})
          </h3>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
          >
            <option value="all">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.value} value={cat.value}>{cat.label}</option>
            ))}
          </select>
        </div>
        
        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">Loading images...</p>
          </div>
        ) : filteredImages && filteredImages.length > 0 ? (
          <div className="space-y-6">
            {filterCategory === 'all' ? (
              // Show grouped by category
              categories.map((cat) => {
                const catImages = groupedImages[cat.value];
                if (!catImages || catImages.length === 0) return null;
                return (
                  <div key={cat.value} className="border-t pt-4 first:border-t-0 first:pt-0">
                    <h4 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
                      <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">
                        {cat.label}
                      </span>
                      <span className="text-gray-500 text-sm">({catImages.length})</span>
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {catImages.map((image: any) => (
                        <div key={image.id} className="relative group border border-gray-200 rounded-lg overflow-hidden">
                          <img
                            src={image.url}
                            alt={image.alt || 'Portfolio image'}
                            className="w-full h-32 object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400x300?text=Image+Not+Found';
                            }}
                          />
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 flex items-center justify-center gap-2">
                            <button
                              onClick={() => {
                                setReplacingImage(image);
                                setReplaceMethod('file');
                                setReplaceUrl('');
                                setReplaceFile(null);
                              }}
                              className="opacity-0 group-hover:opacity-100 bg-purple-600 text-white px-3 py-1.5 rounded-lg hover:bg-purple-700 transition-all text-sm flex items-center gap-1"
                            >
                              <Upload size={14} />
                              Replace
                            </button>
                            <button
                              onClick={() => {
                                if (confirm('Delete this image?')) {
                                  deleteImageMutation.mutate(image.id);
                                }
                              }}
                              className="opacity-0 group-hover:opacity-100 bg-red-600 text-white p-1.5 rounded-full hover:bg-red-700 transition-all"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                          {image.title && (
                            <div className="p-2 bg-gray-50">
                              <p className="text-xs text-gray-600 truncate">{image.title}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })
            ) : (
              // Show flat list for filtered category
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {filteredImages.map((image: any) => (
                  <div key={image.id} className="relative group border border-gray-200 rounded-lg overflow-hidden">
                    <img
                      src={image.url}
                      alt={image.alt || 'Portfolio image'}
                      className="w-full h-32 object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400x300?text=Image+Not+Found';
                      }}
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 flex items-center justify-center gap-2">
                      <button
                        onClick={() => {
                          setReplacingImage(image);
                          setReplaceMethod('file');
                          setReplaceUrl('');
                          setReplaceFile(null);
                        }}
                        className="opacity-0 group-hover:opacity-100 bg-purple-600 text-white px-3 py-1.5 rounded-lg hover:bg-purple-700 transition-all text-sm flex items-center gap-1"
                      >
                        <Upload size={14} />
                        Replace
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Delete this image?')) {
                            deleteImageMutation.mutate(image.id);
                          }
                        }}
                        className="opacity-0 group-hover:opacity-100 bg-red-600 text-white p-1.5 rounded-full hover:bg-red-700 transition-all"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    {image.title && (
                      <div className="p-2 bg-gray-50">
                        <p className="text-xs text-gray-600 truncate">{image.title}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <ImageIcon size={48} className="mx-auto mb-4 opacity-30" />
            <p>No portfolio images yet. Add your first image above.</p>
          </div>
        )}
      </div>

      {/* Replace Image Modal */}
      {replacingImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-gray-900">
                  Replace Image: {replacingImage.category}
                </h3>
                <button
                  onClick={() => setReplacingImage(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Current Image Preview */}
              <div className="mb-6">
                <p className="text-sm font-medium text-gray-700 mb-2">Current Image:</p>
                <img
                  src={replacingImage.url}
                  alt="Current"
                  className="w-full h-48 object-cover rounded-lg border border-gray-200"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400x300?text=Current+Image';
                  }}
                />
              </div>

              {/* Upload Method Toggle */}
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setReplaceMethod('file')}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                    replaceMethod === 'file'
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Upload New File
                </button>
                <button
                  onClick={() => setReplaceMethod('url')}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                    replaceMethod === 'url'
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Use URL
                </button>
              </div>

              {/* Replace Input */}
              <div className="space-y-4 mb-6">
                {replaceMethod === 'file' ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select New Image File
                    </label>
                    <input
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp"
                      onChange={handleReplaceFileSelect}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                    {replaceFile && (
                      <div className="mt-2 text-sm text-green-600 flex items-center gap-1">
                        <Check size={16} />
                        {replaceFile.name} ({(replaceFile.size / 1024 / 1024).toFixed(2)} MB)
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      New Image URL
                    </label>
                    <input
                      type="text"
                      value={replaceUrl}
                      onChange={(e) => setReplaceUrl(e.target.value)}
                      placeholder="https://example.com/new-image.jpg"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setReplacingImage(null)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReplace}
                  disabled={
                    (replaceMethod === 'file' && !replaceFile) ||
                    (replaceMethod === 'url' && !replaceUrl.trim()) ||
                    replaceImageMutation.isPending
                  }
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Upload size={16} />
                  {replaceImageMutation.isPending
                    ? replaceMethod === 'file'
                      ? 'Uploading...'
                      : 'Updating...'
                    : 'Replace Image'}
                </button>
              </div>

              {replaceImageMutation.isError && (
                <div className="mt-4 text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                  {replaceImageMutation.error?.message || 'Replace failed'}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ManualWebsiteUpdatePage: React.FC<{ embedded?: boolean }> = ({ embedded }) => {
  const [selectedPage, setSelectedPage] = useState<ManualPageDefinition | null>(manualPageManifest[0] || null);
  // The studio's OWN pages — generated from their Authority Map, so absent from the fixed
  // manifest above. Listed beneath it so the pages they most want to edit are findable from
  // the screen that claims to edit any public page.
  const { data: studioPagesRaw } = useQuery({
    queryKey: ['/api/admin/landing-pages'],
    queryFn: async () => (await fetch('/api/admin/landing-pages')).json(),
    staleTime: 60_000,
  });
  const studioPages: any[] = Array.isArray(studioPagesRaw) ? studioPagesRaw : [];
  const [language, setLanguage] = useState<'de' | 'en'>(DEFAULT_EDITOR_LANG);
  const [editedContent, setEditedContent] = useState<Record<string, string>>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  // What the page held when it loaded — the thing "Modified" is measured against.
  //
  // The badge used to test `editedContent[key] !== undefined`, but editedContent is
  // seeded below with EVERY field on the page. So every field was flagged Modified from
  // the moment the editor opened, whether or not anybody had touched it. Clicking
  // "Improve SEO ranking" on one field looked identical to rewriting the whole page,
  // and there was no way to see what the AI had actually changed.
  const [loadedContent, setLoadedContent] = useState<Record<string, string>>({});
  const [uploadingFields, setUploadingFields] = useState<Record<string, boolean>>({});
  const [uploadErrors, setUploadErrors] = useState<Record<string, string | null>>({});
  const [dragOverFields, setDragOverFields] = useState<Record<string, boolean>>({});
  const [cropModal, setCropModal] = useState<{
    field: ManualPageField;
    file: File;
    imageSrc: string;
    mimeType: string;
  } | null>(null);
  const [cropPosition, setCropPosition] = useState({ x: 0, y: 0 });
  const [cropZoom, setCropZoom] = useState(1);
  const [cropOrientation, setCropOrientation] = useState<'landscape' | 'portrait' | 'wide'>('landscape');
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isProcessingCrop, setIsProcessingCrop] = useState(false);
  // Transient banner confirming a Save/Publish result (auto-dismisses).
  const [actionNote, setActionNote] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  // AI field enhancement (refine in tone / SEO-optimise), keyed by translationKey.
  const [aiFieldBusy, setAiFieldBusy] = useState<Record<string, 'refine' | 'seo' | 'generate'>>({});
  const [aiFieldTips, setAiFieldTips] = useState<Record<string, string[]>>({});
  const [aiFieldError, setAiFieldError] = useState<Record<string, string>>({});
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  // Load field-specific orientation preferences from localStorage
  const getFieldOrientation = (fieldId: string): 'landscape' | 'portrait' | 'wide' => {
    const saved = localStorage.getItem(`cropOrientation_${fieldId}`);
    return (saved === 'landscape' || saved === 'portrait' || saved === 'wide') ? saved : 'landscape';
  };

  // Save field-specific orientation preference
  const saveFieldOrientation = (fieldId: string, orientation: 'landscape' | 'portrait' | 'wide') => {
    localStorage.setItem(`cropOrientation_${fieldId}`, orientation);
  };

  // Fetch page content
  const { data: pageContent, isLoading } = useQuery<PageContent>({
    queryKey: ['/api/manual-pages', selectedPage?.id, language],
    queryFn: async () => {
      if (!selectedPage) return null;
      const res = await fetch(`/api/manual-pages/${selectedPage.id}?language=${language}`);
      if (!res.ok) throw new Error('Failed to fetch page content');
      return res.json();
    },
    enabled: !!selectedPage
  });

  // Initialize edited content when page content loads
  useEffect(() => {
    if (pageContent) {
      // Prepare defaults from translation keys so admins see current site copy even before saving
      const defaults: Record<string, string> = {};
      if (selectedPage) {
        for (const section of selectedPage.sections) {
          for (const field of section.fields) {
            try {
              // t() returns the key itself when no translation exists. Only seed the
              // field with real copy; otherwise leave it blank (e.g. image slots) so the
              // editor never shows a raw translation key as the current value.
              const resolved = t(field.translationKey);
              defaults[field.translationKey] = resolved && resolved !== field.translationKey ? resolved : '';
            } catch {
              defaults[field.translationKey] = '';
            }
          }
        }
      }

      // Merge defaults -> published -> draft (draft takes precedence)
      const mergedContent = {
        ...defaults,
        ...(pageContent.publishedContent || {}),
        ...(pageContent.draftContent || {})
      } as Record<string, string>;
      setEditedContent(mergedContent);
      setLoadedContent(mergedContent);
      setHasUnsavedChanges(false);
    } else {
      setEditedContent({});
      setLoadedContent({});
      setHasUnsavedChanges(false);
    }
  }, [pageContent, selectedPage?.id, language]);

  // Show a banner for a few seconds, then clear it.
  const flashNote = (kind: 'success' | 'error', text: string) => {
    setActionNote({ kind, text });
    window.setTimeout(() => setActionNote(cur => (cur && cur.text === text ? null : cur)), 6000);
  };

  // Turn a failed response into something the studio can act on (or quote to support),
  // rather than a generic "please try again" that hides the actual server error.
  const describeFailure = async (res: Response): Promise<string> => {
    if (res.status === 401 || res.status === 403) return 'your session expired — sign in again';
    try {
      const body = await res.json();
      if (body?.detail) return String(body.detail);
      if (body?.error) return String(body.error);
    } catch { /* non-JSON error body */ }
    return `server error ${res.status}`;
  };

  // Is a landing page currently serving "/"? Drives the notice on the Homepage entry.
  const { data: studioConfig } = useQuery<any>({
    queryKey: ['/api/studio-config'],
    queryFn: async () => {
      const res = await fetch('/api/studio-config');
      if (!res.ok) return {};
      return res.json();
    },
  });
  const homepageLandingSlug: string | null = studioConfig?.homepageLandingSlug || null;

  const unsetHomepageMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/admin/landing-pages/unset-homepage', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error('Failed to switch homepage');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/studio-config'] });
      flashNote('success', 'Your website now uses this homepage. Open “View Website” to check it.');
    },
    onError: () => flashNote('error', 'Could not switch the homepage. Please try again.'),
  });

  // ---- Which public pages this studio runs -------------------------------
  // Disabled pages are not deleted; they stay as templates and can be switched
  // back on, arriving with whatever copy onboarding already wrote for them.
  const { data: sitePages } = useQuery<any>({
    queryKey: ['/api/admin/site-pages'],
    queryFn: async () => {
      const res = await fetch('/api/admin/site-pages', { credentials: 'include' });
      if (!res.ok) return null;
      return res.json();
    },
  });

  const savePagesMutation = useMutation({
    mutationFn: async (enabled: Record<string, boolean>) => {
      const res = await fetch('/api/admin/site-pages', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      });
      if (!res.ok) throw new Error('Failed to save');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/site-pages'] });
      flashNote('success', 'Page visibility updated.');
    },
    onError: () => flashNote('error', 'Could not update page visibility.'),
  });

  const togglePage = (id: string, on: boolean) => {
    const current: Record<string, boolean> = { ...(sitePages?.enabled || {}) };
    current[id] = on;
    // Mirror the server rule locally so the UI does not briefly show both halves of
    // a locale pair enabled.
    for (const [a, b] of (sitePages?.localePairs || [])) {
      if (id === a && on) current[b] = false;
      if (id === b && on) current[a] = false;
    }
    savePagesMutation.mutate(current);
  };

  // Save draft mutation
  const saveDraftMutation = useMutation({
    mutationFn: async () => {
      if (!selectedPage) return;
      const res = await fetch(`/api/manual-pages/${selectedPage.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language,
          draftContent: editedContent,
          action: 'save_draft'
        })
      });
      if (!res.ok) throw new Error(await describeFailure(res));
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/manual-pages'] });
      setLoadedContent(editedContent);
      setHasUnsavedChanges(false);
      flashNote('success', 'Draft saved. It is not live yet — click Publish to put it on the website.');
    },
    onError: (err: any) => flashNote('error', `Could not save the draft (${err?.message || 'unknown error'}).`),
  });

  // Publish mutation
  const publishMutation = useMutation({
    mutationFn: async () => {
      if (!selectedPage) return;
      const res = await fetch(`/api/manual-pages/${selectedPage.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language,
          draftContent: editedContent,
          action: 'publish'
        })
      });
      if (!res.ok) throw new Error(await describeFailure(res));
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/manual-pages'] });
      setLoadedContent(editedContent);
      setHasUnsavedChanges(false);
      flashNote('success', '✓ Published — your changes are now live on the website.');
    },
    onError: (err: any) => flashNote('error', `Publish failed — nothing was changed on the live site (${err?.message || 'unknown error'}).`),
  });

  // Reset mutation
  const resetMutation = useMutation({
    mutationFn: async () => {
      if (!selectedPage) return;
      const res = await fetch(`/api/manual-pages/${selectedPage.id}?language=${language}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to reset');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/manual-pages'] });
      setEditedContent({});
      setHasUnsavedChanges(false);
    }
  });

  const handleFieldChange = (fieldId: string, value: string) => {
    setEditedContent(prev => ({ ...prev, [fieldId]: value }));
    setHasUnsavedChanges(true);
  };

  // Refine the field text in the studio's tone, SEO-optimise it, or GENERATE
  // optimal copy from scratch. The result replaces the field value (still a
  // draft until Save/Publish). 'generate' works on an empty field; the other
  // modes need existing text to improve.
  const enhanceField = async (field: ManualPageField, mode: 'refine' | 'seo' | 'generate') => {
    const key = field.translationKey;
    const current = (editedContent[key] || '').trim();
    if (mode !== 'generate' && !current) {
      setAiFieldError(prev => ({ ...prev, [key]: 'Enter some text first, then let AI improve it — or use AI Generate to create it from scratch.' }));
      return;
    }
    // Give the model the page's other filled fields so generated copy stays
    // coherent with what's already there (e.g. a description that matches the title).
    const context: Array<{ label: string; value: string }> = [];
    if (selectedPage) {
      for (const section of selectedPage.sections) {
        for (const f of section.fields) {
          if (f.type === 'image' || f.translationKey === key) continue;
          const v = (editedContent[f.translationKey] || '').trim();
          if (v) context.push({ label: f.label, value: v });
        }
      }
    }
    setAiFieldBusy(prev => ({ ...prev, [key]: mode }));
    setAiFieldError(prev => { const n = { ...prev }; delete n[key]; return n; });
    try {
      const res = await fetch('/api/manual-pages/enhance-field', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          text: current,
          mode,
          label: field.label,
          helperText: field.helperText || '',
          pageName: selectedPage?.label || '',
          context: context.slice(0, 12),
          language,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.result) throw new Error(data?.error || 'AI could not improve this field');
      handleFieldChange(key, data.result);
      setAiFieldTips(prev => ({ ...prev, [key]: Array.isArray(data.tips) ? data.tips : [] }));
    } catch (e: any) {
      setAiFieldError(prev => ({ ...prev, [key]: e?.message || 'AI enhancement failed' }));
    } finally {
      setAiFieldBusy(prev => { const n = { ...prev }; delete n[key]; return n; });
    }
  };

  // Small AI toolbar rendered under editable text fields. AI copy tools only make sense on
  // prose — not on a URL/link field (e.g. the Reviews page URL, where real reviews pull from
  // the studio's Google listing), an image slot, or an image-manager (richText) field.
  const renderAiTools = (field: ManualPageField) => {
    if (field.type === 'url' || field.type === 'image' || field.type === 'richText') return null;
    const key = field.translationKey;
    const busy = aiFieldBusy[key];
    const tips = aiFieldTips[key];
    const err = aiFieldError[key];
    return (
      <div className="mt-2">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => enhanceField(field, 'generate')}
            disabled={!!busy}
            className="inline-flex items-center gap-1.5 rounded-md bg-gradient-to-r from-purple-600 to-pink-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            title="Let AI write optimal, on-brand copy for this field from scratch"
          >
            <Wand2 className="h-3.5 w-3.5" />
            {busy === 'generate' ? 'Generating…' : 'AI Generate'}
          </button>
          <button
            type="button"
            onClick={() => enhanceField(field, 'refine')}
            disabled={!!busy}
            className="inline-flex items-center gap-1.5 rounded-md border border-purple-300 bg-purple-50 px-3 py-1.5 text-xs font-semibold text-purple-700 hover:bg-purple-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Sparkles className="h-3.5 w-3.5" />
            {busy === 'refine' ? 'Refining…' : 'Refine in my tone'}
          </button>
          <button
            type="button"
            onClick={() => enhanceField(field, 'seo')}
            disabled={!!busy}
            className="inline-flex items-center gap-1.5 rounded-md border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <TrendingUp className="h-3.5 w-3.5" />
            {busy === 'seo' ? 'Optimising…' : 'Improve SEO ranking'}
          </button>
        </div>
        {err && <p className="mt-1.5 text-xs text-red-600">{err}</p>}
        {tips && tips.length > 0 && (
          <div className="mt-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2">
            {/* "applied" read as "done, it is live". It is not: the rewrite sits in the
                draft until Publish. Say which, in the same breath as the tips. */}
            <p className="text-xs font-semibold text-emerald-800 mb-1">
              Rewritten in the draft — click <strong>Publish</strong> to put it on the website. What changed:
            </p>
            <ul className="list-disc pl-4 text-xs text-emerald-700 space-y-0.5">
              {tips.map((tp, i) => <li key={i}>{tp}</li>)}
            </ul>
          </div>
        )}
      </div>
    );
  };

  // Handles image uploads and stores the returned serve URL in the draft content map.
  const handleImageUpload = async (field: ManualPageField, file: File) => {
    setUploadErrors(prev => ({ ...prev, [field.id]: null }));
    setUploadingFields(prev => ({ ...prev, [field.id]: true }));

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folderName', 'Manual Website Images');
      formData.append('context', field.translationKey);

      const response = await fetch('/api/files/upload', {
        method: 'POST',
        body: formData
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.error || 'File upload failed');
      }

      // Use the B2 URL from the response
      const fileUrl = payload.url || payload.thumbnailUrl;

      if (!fileUrl) {
        throw new Error('No URL returned from upload');
      }

      handleFieldChange(field.translationKey, fileUrl);
      return fileUrl;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'File upload failed';
      setUploadErrors(prev => ({ ...prev, [field.id]: message }));
      throw error;
    } finally {
      setUploadingFields(prev => ({ ...prev, [field.id]: false }));
    }
  };

  const handleImageClick = (field: ManualPageField, file: File) => {
    const imageSrc = URL.createObjectURL(file);
    setCropModal({ field, file, imageSrc, mimeType: file.type || 'image/jpeg' });
    setCropPosition({ x: 0, y: 0 });
    setCropZoom(1);
    setCroppedAreaPixels(null);
    // Load the saved orientation preference for this specific field
    setCropOrientation(getFieldOrientation(field.id));
  };

  const closeCropModal = () => {
    if (cropModal?.imageSrc?.startsWith('blob:')) {
      URL.revokeObjectURL(cropModal.imageSrc);
    }
    setCropModal(null);
    setCroppedAreaPixels(null);
    setCropPosition({ x: 0, y: 0 });
    setCropZoom(1);
    setIsProcessingCrop(false);
  };

  const onCropComplete = useCallback((_: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const handleCropConfirm = async (useOriginal = false) => {
    if (!cropModal) return;
    setIsProcessingCrop(true);

    try {
      let fileToUpload = cropModal.file;

      // Only skip cropping when the user explicitly clicks "Use Original".
      // Every orientation (incl. Wide Hero) otherwise crops to its frame.
      const shouldUseOriginal = useOriginal;

      if (!shouldUseOriginal && croppedAreaPixels) {
        const croppedBlob = await getCroppedImageBlob(cropModal.imageSrc, croppedAreaPixels, cropModal.mimeType);
        const extension = cropModal.file.name.includes('.') ? cropModal.file.name.split('.').pop() : 'jpg';
        const nextName = `cropped-${Date.now()}.${extension}`;
        fileToUpload = new File([croppedBlob], nextName, { type: cropModal.mimeType || 'image/jpeg' });
      }

      await handleImageUpload(cropModal.field, fileToUpload);
      closeCropModal();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to process image';
      setUploadErrors(prev => ({ ...prev, [cropModal.field.id]: message }));
    } finally {
      setIsProcessingCrop(false);
    }
  };

  const getFieldValue = (field: ManualPageField): string => {
    return editedContent[field.translationKey] || '';
  };

  const handleDragOver = (e: React.DragEvent, fieldId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverFields(prev => ({ ...prev, [fieldId]: true }));
  };

  const handleDragLeave = (e: React.DragEvent, fieldId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverFields(prev => ({ ...prev, [fieldId]: false }));
  };

  const handleDrop = (e: React.DragEvent, field: ManualPageField) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverFields(prev => ({ ...prev, [field.id]: false }));

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        handleImageClick(field, file);
      } else {
        setUploadErrors(prev => ({ ...prev, [field.id]: 'Please drop an image file' }));
      }
    }
  };

  const renderField = (field: ManualPageField) => {
    const value = getFieldValue(field);
    // Genuinely different from what loaded — not merely present.
    const isModified = (editedContent[field.translationKey] ?? '') !== (loadedContent[field.translationKey] ?? '');

    if (field.type === 'longForm') {
      return (
        <div key={field.id} className="mb-6">
          <label className="text-sm font-medium text-gray-700 mb-2 flex items-center">
            {field.label}
            {isModified && <span className="ml-2 px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs rounded">Modified</span>}
          </label>
          {field.helperText && (
            <p className="text-xs text-gray-500 mb-2">{field.helperText}</p>
          )}
          <textarea
            value={value}
            onChange={(e) => handleFieldChange(field.translationKey, e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            placeholder={`Enter ${field.label.toLowerCase()}...`}
          />
          {renderAiTools(field)}
          <p className="text-xs text-gray-400 mt-1">Key: {field.translationKey}</p>
        </div>
      );
    }

    if (field.type === 'image') {
      const isUploading = uploadingFields[field.id];
      const errorMessage = uploadErrors[field.id];
      const isDragOver = dragOverFields[field.id];

      return (
        <div key={field.id} className="mb-6">
          <label className="text-sm font-medium text-gray-700 mb-2 flex items-center">
            {field.label}
            {isModified && <span className="ml-2 px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs rounded">Modified</span>}
          </label>
          {field.helperText && (
            <p className="text-xs text-gray-500 mb-2">{field.helperText}</p>
          )}

          {/* Drag and Drop Zone */}
          <div
            onDragOver={(e) => handleDragOver(e, field.id)}
            onDragLeave={(e) => handleDragLeave(e, field.id)}
            onDrop={(e) => handleDrop(e, field)}
            className={`relative border-2 border-dashed rounded-lg transition-all ${
              isDragOver
                ? 'border-purple-500 bg-purple-50'
                : value
                ? 'border-gray-300 bg-gray-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            {value ? (
              <div className="relative group">
                {/* Logos are shown exactly as they appear in the site header
                    (contained on a white strip, header height) rather than
                    stretched/cropped like a photo. */}
                {field.translationKey.toLowerCase().includes('logo') ? (
                  <div className="rounded-lg overflow-hidden">
                    <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center">
                      <img src={value} alt={field.label} className="h-14 w-auto max-w-[220px] object-contain" />
                      <span className="ml-auto text-[10px] uppercase tracking-wide text-gray-400">Header preview</span>
                    </div>
                    <div className="bg-gray-900 px-4 py-3 flex items-center">
                      <img src={value} alt={field.label} className="h-14 w-auto max-w-[220px] object-contain" />
                      <span className="ml-auto text-[10px] uppercase tracking-wide text-gray-500">On dark</span>
                    </div>
                  </div>
                ) : (
                  <img
                    src={value}
                    alt={field.label}
                    className="w-full max-h-64 object-contain bg-gray-50 rounded-lg"
                  />
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all rounded-lg flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity text-white text-center px-4">
                    <p className="text-sm font-medium mb-2">Drop new image to replace</p>
                    <p className="text-xs">or click Upload Image below</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center">
                <div className={`mx-auto w-16 h-16 mb-4 rounded-full flex items-center justify-center ${
                  isDragOver ? 'bg-purple-100' : 'bg-gray-100'
                }`}>
                  <svg
                    className={`w-8 h-8 ${isDragOver ? 'text-purple-600' : 'text-gray-400'}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                </div>
                <p className={`text-sm font-medium mb-1 ${isDragOver ? 'text-purple-600' : 'text-gray-700'}`}>
                  {isDragOver ? 'Drop image here' : 'Drag & drop image here'}
                </p>
                <p className="text-xs text-gray-500">or use the Upload Image button below</p>
              </div>
            )}
          </div>

          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
            <input
              type="text"
              value={value}
              onChange={(e) => handleFieldChange(field.translationKey, e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
              placeholder={`Paste image URL or drag & drop...`}
            />
            <label className={`inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors ${isUploading ? 'bg-gray-200 text-gray-500' : 'bg-purple-600 text-white hover:bg-purple-700'}`}>
              {isUploading ? 'Uploading…' : 'Upload Image'}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={isUploading}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleImageClick(field, file);
                    e.target.value = '';
                  }
                }}
              />
            </label>
            {value && (
              <button
                type="button"
                onClick={() => handleFieldChange(field.translationKey, '')}
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Remove
              </button>
            )}
          </div>
          {errorMessage && (
            <p className="text-xs text-red-600 mt-2">{errorMessage}</p>
          )}
          <p className="text-xs text-gray-400 mt-1">Key: {field.translationKey}</p>
        </div>
      );
    }

    return (
      <div key={field.id} className="mb-4">
        <label className="text-sm font-medium text-gray-700 mb-2 flex items-center">
          {field.label}
          {isModified && <span className="ml-2 px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs rounded">Modified</span>}
        </label>
        {field.helperText && (
          <p className="text-xs text-gray-500 mb-2">{field.helperText}</p>
        )}
        <input
          type="text"
          value={value}
          onChange={(e) => handleFieldChange(field.translationKey, e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          placeholder={`Enter ${field.label.toLowerCase()}...`}
        />
        {renderAiTools(field)}
        <p className="text-xs text-gray-400 mt-1">Key: {field.translationKey}</p>
      </div>
    );
  };

  const renderSection = (section: ManualPageSection) => {
    return (
      <div key={section.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900">{section.label}</h3>
          {section.description && (
            <p className="text-sm text-gray-600 mt-1">{section.description}</p>
          )}
        </div>
        {section.fields.map(renderField)}
      </div>
    );
  };

  // When hosted inside the Website Studio tabs, skip the inner AdminLayout (the Studio
  // provides it) — using a stable `inner` const so children never remount on re-render.
  const inner = (
    <>
      <div className="flex h-[calc(100vh-4rem)]">
        {/* Sidebar - Page List */}
        <div className="w-80 bg-gray-50 border-r border-gray-200 overflow-y-auto">
          <div className="p-4 border-b border-gray-200 bg-white">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <FileText className="mr-2" size={20} />
              Manual Website Update
            </h2>
            <p className="text-sm text-gray-600 mt-1">Edit any public page content</p>
          </div>

          {/* Language Selector */}
          <div className="p-4 border-b border-gray-200 bg-white">
            <label className="block text-sm font-medium text-gray-700 mb-2">Language</label>
            <div className="flex gap-2">
              <button
                onClick={() => setLanguage('de')}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  language === 'de'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                🇩🇪 Deutsch
              </button>
              <button
                onClick={() => setLanguage('en')}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  language === 'en'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                🇬🇧 English
              </button>
            </div>
          </div>

          {/* Page List */}
          <div className="p-2">
            {manualPageManifest.map((page) => (
              <button
                key={page.id}
                onClick={() => setSelectedPage(page)}
                className={`w-full text-left px-4 py-3 rounded-lg mb-1 transition-colors ${
                  selectedPage?.id === page.id
                    ? 'bg-purple-100 border border-purple-300 text-purple-900'
                    : 'hover:bg-gray-100 text-gray-700'
                }`}
              >
                <div className="font-medium">{page.label}</div>
                <div className="text-xs text-gray-500 mt-1">{page.route}</div>
                {page.tags && page.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {page.tags.map((tag, idx) => (
                      <span key={idx} className="px-2 py-0.5 bg-gray-200 text-gray-600 text-xs rounded">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </button>
            ))}

            {/*
              THE STUDIO'S OWN PAGES.

              Everything above comes from shared/manualPages.ts, a fixed manifest of the
              fourteen pages this product ships with. A studio's service pages are rows in
              landing_pages, generated from their Authority Map during onboarding, so they can
              never appear in a hardcoded list — and they are the pages a photographer most
              wants to edit. "Edit any public page content" was excluding their money pages.

              Links out rather than selectable here: these are landing pages with their own
              editor, not translation-keyed manifest pages, and pretending otherwise would mean
              a panel of fields that do not apply to them.
            */}
            {studioPages.length > 0 && (
              <div className="mt-6 pt-4 border-t border-gray-200">
                <div className="px-4 pb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Your service pages
                </div>
                {studioPages.map((p: any) => (
                  <a
                    key={p.id}
                    href={`/admin/landing-pages/${p.id}`}
                    className="block w-full text-left px-4 py-3 rounded-lg mb-1 hover:bg-gray-100 text-gray-700 transition-colors"
                  >
                    <div className="font-medium flex items-center gap-2">
                      {p.title || p.slug}
                      {p.status !== 'published' && (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] rounded uppercase tracking-wide">
                          {p.status || 'draft'}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">/{p.slug}</div>
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto">
          {selectedPage ? (
            <div className="max-w-4xl mx-auto p-8">
              {/* Header */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">{selectedPage.label}</h1>
                    <p className="text-sm text-gray-600 mt-1">{selectedPage.description}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Globe size={16} className="text-gray-400" />
                      <code className="text-sm bg-gray-100 px-2 py-1 rounded">{selectedPage.route}</code>
                      {selectedPage.previewUrl && (
                        <a
                          href={selectedPage.previewUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-purple-600 hover:text-purple-700 flex items-center"
                        >
                          <Eye size={14} className="mr-1" />
                          Preview
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => saveDraftMutation.mutate()}
                      disabled={!hasUnsavedChanges || saveDraftMutation.isPending}
                      className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      <Save size={16} />
                      Save Draft
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Publish changes to live website?')) {
                          publishMutation.mutate();
                        }
                      }}
                      disabled={publishMutation.isPending}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      <Check size={16} />
                      {publishMutation.isPending ? 'Publishing…' : 'Publish'}
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Reset to default content? This will delete all customizations.')) {
                          resetMutation.mutate();
                        }
                      }}
                      disabled={resetMutation.isPending}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      <RotateCcw size={16} />
                      Reset
                    </button>
                  </div>
                </div>

                {/* Save/Publish result banner */}
                {actionNote && (
                  <div
                    role="status"
                    className={`flex items-center gap-2 p-3 rounded-lg border text-sm font-medium ${
                      actionNote.kind === 'success'
                        ? 'bg-green-50 border-green-300 text-green-800'
                        : 'bg-red-50 border-red-300 text-red-800'
                    }`}
                  >
                    {actionNote.kind === 'success' ? <Check size={16} /> : <X size={16} />}
                    <span>{actionNote.text}</span>
                    <button
                      type="button"
                      onClick={() => setActionNote(null)}
                      className="ml-auto text-current/70 hover:text-current"
                      aria-label="Dismiss"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}

                {/* While a landing page is set as "/", NOTHING edited here reaches the
                    homepage — not the copy, not the homepage images, not the reviews
                    carousel. Onboarding sets that automatically, so a studio can work
                    across several of these entries, click View Website, and see a page
                    it never edited. Shown on every entry, not just Homepage, because
                    the override invalidates all of them equally. */}
                {homepageLandingSlug && (
                  <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
                    <p className="font-medium mb-1">Your website homepage is a landing page, not the pages below.</p>
                    <p className="mb-3">
                      “/” is being served by the landing page <code className="px-1 bg-amber-100 rounded">{homepageLandingSlug}</code>.
                      Until you switch, “View Website” shows that page — homepage copy, homepage
                      images and the reviews carousel edited here will not appear on it.
                    </p>
                    <button
                      onClick={() => unsetHomepageMutation.mutate()}
                      disabled={unsetHomepageMutation.isPending}
                      className="px-3 py-1.5 bg-amber-600 text-white rounded hover:bg-amber-700 disabled:opacity-50"
                    >
                      {unsetHomepageMutation.isPending ? 'Switching…' : 'Use my edited homepage instead'}
                    </button>
                  </div>
                )}

                {/* Which pages this studio publishes. Shown once, above the editor,
                    because it decides what a visitor can reach at all. */}
                {sitePages?.pages?.length > 0 && (
                  <details className="mb-4 rounded-lg border border-gray-200 bg-white">
                    <summary className="cursor-pointer select-none px-4 py-3 text-sm font-medium text-gray-900">
                      Pages on your website
                      <span className="ml-2 font-normal text-gray-500">
                        — switch pages on or off{sitePages.usingDefaults ? ' (using defaults for your language)' : ''}
                      </span>
                    </summary>
                    <div className="border-t border-gray-200 px-4 py-3">
                      <p className="mb-3 text-xs text-gray-500">
                        Switching a page off redirects it to the equivalent live page — nothing is deleted,
                        and you can switch it back on at any time. Pages you have never used stay available
                        as templates.
                      </p>
                      <div className="space-y-2">
                        {sitePages.pages.map((p: any) => {
                          const on = sitePages.enabled?.[p.id] ?? false;
                          return (
                            <label key={p.id} className="flex items-center gap-3 text-sm">
                              <input
                                type="checkbox"
                                checked={on}
                                disabled={savePagesMutation.isPending}
                                onChange={(e) => togglePage(p.id, e.target.checked)}
                                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                              />
                              <span className={on ? 'text-gray-900' : 'text-gray-400'}>{p.label}</span>
                              <code className="text-xs text-gray-400">{p.route}</code>
                              {!on && p.redirectTo && (
                                <span className="text-xs text-gray-400">→ redirects to {p.redirectTo}</span>
                              )}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  </details>
                )}

                {/* Status Indicator */}
                {pageContent && (
                  <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${
                        pageContent.status === 'published' ? 'bg-green-500' : 'bg-yellow-500'
                      }`} />
                      <span className="text-sm text-gray-700">
                        Status: <strong>{pageContent.status || 'default'}</strong>
                      </span>
                    </div>
                    {pageContent.publishedAt && (
                      <div className="text-sm text-gray-600">
                        Last published: {new Date(pageContent.publishedAt).toLocaleString()}
                      </div>
                    )}
                    {hasUnsavedChanges && (
                      <div className="ml-auto flex items-center gap-2 text-yellow-600">
                        <X size={14} />
                        <span className="text-sm font-medium">Unsaved changes</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Sections */}
              {selectedPage.id === 'homepage-images' ? (
                <HomepageImagesManager />
              ) : selectedPage.id === 'portfolio-images' ? (
                <PortfolioImagesManager />
              ) : isLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
                  <p className="text-gray-600 mt-4">Loading page content...</p>
                </div>
              ) : (
                selectedPage.sections.map(renderSection)
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              <p>Select a page to edit</p>
            </div>
          )}
        </div>
      </div>
    {cropModal && (
      <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 px-4">
        <div className="w-full max-w-4xl rounded-2xl bg-white p-6 shadow-2xl">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Adjust Image Position</h2>
              <p className="text-sm text-gray-600 mb-2">Choose orientation, drag to reposition, and zoom to frame perfectly.</p>
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <span className="inline-flex w-4 h-4 bg-gray-200 rounded border border-gray-300 items-center justify-center">🖱️</span>
                  Drag to move
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-flex w-4 h-4 bg-gray-200 rounded border border-gray-300 items-center justify-center">🔍</span>
                  Scroll to zoom
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={closeCropModal}
              className="rounded-full bg-gray-100 p-2 text-gray-600 hover:bg-gray-200"
              aria-label="Close cropper"
            >
              <X size={18} />
            </button>
          </div>

          {/* Orientation Toggle */}
          <div className="mb-4 flex gap-2">
            <button
              type="button"
              onClick={() => {
                setCropOrientation('landscape');
                if (cropModal) saveFieldOrientation(cropModal.field.id, 'landscape');
              }}
              className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                cropOrientation === 'landscape'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Landscape (16:10)
            </button>
            <button
              type="button"
              onClick={() => {
                setCropOrientation('portrait');
                if (cropModal) saveFieldOrientation(cropModal.field.id, 'portrait');
              }}
              className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                cropOrientation === 'portrait'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Portrait (10:16)
            </button>
            <button
              type="button"
              onClick={() => {
                setCropOrientation('wide');
                if (cropModal) saveFieldOrientation(cropModal.field.id, 'wide');
              }}
              className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                cropOrientation === 'wide'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Wide Hero
            </button>
          </div>

          {/* react-easy-crop draws its own draggable crop area (dimmed surround +
              grid) from the chosen aspect. A previous decorative overlay sat on
              top of it and swallowed the drag, so the reposition never worked —
              it's gone; the native crop UI is both draggable and clearer. */}
          <div className="relative mb-2 h-96 w-full overflow-hidden rounded-xl bg-black">
            <Cropper
              image={cropModal.imageSrc}
              crop={cropPosition}
              zoom={cropZoom}
              aspect={cropOrientation === 'landscape' ? 16 / 10 : cropOrientation === 'portrait' ? 10 / 16 : 16 / 9}
              cropShape="rect"
              showGrid={true}
              onCropChange={setCropPosition}
              onZoomChange={setCropZoom}
              onCropComplete={onCropComplete}
              zoomWithWheel
              restrictPosition={false}
            />
          </div>
          <p className="mb-4 text-center text-xs font-medium text-gray-500">
            {cropOrientation === 'landscape' ? 'Landscape · 16:10' : cropOrientation === 'portrait' ? 'Portrait · 10:16' : 'Wide Hero · 16:9'}
            {' · '}Drag the image to reposition · scroll or use the slider to zoom
          </p>

          <div className="mb-6">
            <label className="mb-2 flex items-center justify-between text-sm font-medium text-gray-700">
              <span>Zoom: {cropZoom.toFixed(2)}x</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setCropZoom(Math.max(1, cropZoom - 0.1))}
                  className="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-xs font-semibold"
                >
                  −
                </button>
                <button
                  type="button"
                  onClick={() => setCropZoom(1)}
                  className="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-xs font-semibold"
                >
                  Reset
                </button>
                <button
                  type="button"
                  onClick={() => setCropZoom(Math.min(3, cropZoom + 0.1))}
                  className="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-xs font-semibold"
                >
                  +
                </button>
              </div>
            </label>
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={cropZoom}
              onChange={(e) => setCropZoom(Number(e.target.value))}
              className="w-full accent-purple-600"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={closeCropModal}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => handleCropConfirm(true)}
                disabled={isProcessingCrop}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Use Original
              </button>
              <button
                type="button"
                onClick={() => handleCropConfirm(false)}
                disabled={isProcessingCrop}
                className="rounded-lg bg-purple-600 px-5 py-2 text-sm font-semibold text-white hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isProcessingCrop ? 'Saving…' : cropOrientation === 'wide' ? 'Save Wide Hero Crop' : 'Save Crop'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  );
  return embedded ? inner : <AdminLayout>{inner}</AdminLayout>;
};

export default ManualWebsiteUpdatePage;
