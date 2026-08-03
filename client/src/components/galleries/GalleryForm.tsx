import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Gallery, GalleryFormData } from '../../types/gallery';
import { createGallery, updateGallery } from '../../lib/gallery-api';
import { Lock, Unlock, Download, Image, Save, AlertCircle, Loader2, Upload } from 'lucide-react';
import ImageUploader from './ImageUploader';

interface GalleryFormProps {
  gallery?: Gallery;
  isEdit?: boolean;
}

const GalleryForm: React.FC<GalleryFormProps> = ({ gallery, isEdit = false }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<GalleryFormData>({
    title: '',
    password: '',
    downloadEnabled: true,
    coverImage: null
  });
  const [isPasswordProtected, setIsPasswordProtected] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showUploader, setShowUploader] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  useEffect(() => {
    if (gallery && isEdit) {
      setFormData({
        title: gallery.title,
        password: '', // We don't get the password back from the API
        downloadEnabled: gallery.downloadEnabled
      });
      setIsPasswordProtected(!!gallery.passwordHash);
      setPreviewUrl(gallery.coverImage);
    }
  }, [gallery, isEdit]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleCoverImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFormData(prev => ({ ...prev, coverImage: file }));

    // Create a preview URL
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      setError('Gallery title is required');
      return;
    }

    if (isPasswordProtected && !formData.password && !isEdit) {
      setError('Password is required for protected galleries');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Prepare data for submission
      const submitData: GalleryFormData = {
        ...formData,
        password: isPasswordProtected ? formData.password : undefined
      };

      if (isEdit && gallery) {
        // If editing and password is empty, don't send it
        if (!submitData.password) {
          delete submitData.password;
        }
        
        await updateGallery(gallery.id, submitData);
        
        if (showUploader) {
          // Stay on the page if the uploader is shown
          setLoading(false);
          setUploadSuccess(true);
          setTimeout(() => setUploadSuccess(false), 3000);
        } else {
          navigate('/admin/galleries');
        }
      } else {
        const newGallery = await createGallery(submitData);
        
        // If it's a new gallery, show the uploader after creation
        setShowUploader(true);
        setLoading(false);
        setUploadSuccess(true);
        setTimeout(() => setUploadSuccess(false), 3000);
        
        // If it's a new gallery, update the URL to the edit page
        navigate(`/admin/galleries/${newGallery.id}/edit`, { replace: true });
      }
    } catch (err) {
      // console.error removed
      setError(err instanceof Error ? err.message : 'An error occurred while saving the gallery');
      setLoading(false);
    }
  };

  const handleUploadComplete = () => {
    // Refresh the gallery data
    if (isEdit && gallery) {
      setUploadSuccess(true);
      setTimeout(() => setUploadSuccess(false), 3000);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start">
          <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 mr-2" />
          <span>{error}</span>
        </div>
      )}

      {uploadSuccess && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-start">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium">
              {isEdit ? "Gallery updated successfully!" : "Gallery created successfully!"}
            </p>
          </div>
        </div>
      )}

      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
          Gallery Title <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="title"
          name="title"
          value={formData.title}
          onChange={handleChange}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          placeholder="Enter gallery title"
          required
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-sm font-medium text-gray-700">
            Access Protection
          </label>
          <div className="relative inline-block w-10 mr-2 align-middle select-none">
            <input
              type="checkbox"
              id="isPasswordProtected"
              checked={isPasswordProtected}
              onChange={() => setIsPasswordProtected(!isPasswordProtected)}
              className="sr-only"
            />
            <label
              htmlFor="isPasswordProtected"
              className={`block overflow-hidden h-6 rounded-full cursor-pointer transition-colors ${
                isPasswordProtected ? 'bg-purple-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`block h-6 w-6 rounded-full bg-white shadow transform transition-transform ${
                  isPasswordProtected ? 'translate-x-4' : 'translate-x-0'
                }`}
              ></span>
            </label>
          </div>
        </div>
        <div className="flex items-center text-sm text-gray-500 mb-2">
          {isPasswordProtected ? (
            <Lock size={16} className="mr-1 text-yellow-500" />
          ) : (
            <Unlock size={16} className="mr-1 text-green-500" />
          )}
          <span>
            {isPasswordProtected
              ? 'Password protected - visitors must enter password to view'
              : 'Public - anyone with the link can view'}
          </span>
        </div>

        {isPasswordProtected && (
          <div className="mt-2">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Gallery Password {!isEdit && <span className="text-red-500">*</span>}
              {isEdit && <span className="text-gray-400 text-xs ml-1">(Leave blank to keep current password)</span>}
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              placeholder={isEdit ? "Enter new password (optional)" : "Enter password"}
              required={isPasswordProtected && !isEdit}
            />
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-sm font-medium text-gray-700">
            Download Options
          </label>
          <div className="relative inline-block w-10 mr-2 align-middle select-none">
            <input
              type="checkbox"
              id="downloadEnabled"
              name="downloadEnabled"
              checked={formData.downloadEnabled}
              onChange={handleChange}
              className="sr-only"
            />
            <label
              htmlFor="downloadEnabled"
              className={`block overflow-hidden h-6 rounded-full cursor-pointer transition-colors ${
                formData.downloadEnabled ? 'bg-purple-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`block h-6 w-6 rounded-full bg-white shadow transform transition-transform ${
                  formData.downloadEnabled ? 'translate-x-4' : 'translate-x-0'
                }`}
              ></span>
            </label>
          </div>
        </div>
        <div className="flex items-center text-sm text-gray-500">
          <Download size={16} className={`mr-1 ${formData.downloadEnabled ? 'text-green-500' : 'text-red-500'}`} />
          <span>
            {formData.downloadEnabled
              ? 'Downloads enabled - visitors can download images'
              : 'Downloads disabled - visitors can only view images'}
          </span>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Cover Image <span className="text-gray-400">(optional)</span>
        </label>
        <div className="mt-1 flex items-center">
          {previewUrl ? (
            <div className="relative">
              <img 
                src={previewUrl} 
                alt="Cover preview" 
                className="h-32 w-auto object-cover rounded-md"
              />
              <button
                type="button"
                onClick={() => {
                  setPreviewUrl(null);
                  setFormData(prev => ({ ...prev, coverImage: null }));
                }}
                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ) : (
            <label className="flex items-center justify-center h-32 w-full border-2 border-dashed border-gray-300 rounded-md cursor-pointer hover:border-gray-400 transition-colors">
              <div className="space-y-1 text-center">
                <Image className="mx-auto h-12 w-12 text-gray-400" />
                <div className="text-sm text-gray-600">
                  <span>Upload cover image</span>
                </div>
              </div>
              <input 
                type="file" 
                className="hidden" 
                accept="image/*"
                onChange={handleCoverImageChange}
              />
            </label>
          )}
        </div>
      </div>

      {(isEdit && gallery || showUploader) && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Upload Gallery Images
          </label>
          <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
            <div className="flex items-center mb-4">
              <Upload className="h-5 w-5 text-purple-600 mr-2" />
              <h3 className="text-lg font-medium text-gray-900">Add Photos to Gallery</h3>
            </div>
            <ImageUploader galleryId={gallery?.id || ''} onUploadComplete={handleUploadComplete} />
          </div>
        </div>
      )}

      <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={() => navigate('/admin/galleries')}
          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
          disabled={loading}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50"
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
              Saving...
            </>
          ) : (
            <>
              <Save className="-ml-1 mr-2 h-4 w-4" />
              {isEdit ? 'Update Gallery' : 'Create Gallery'}
            </>
          )}
        </button>
      </div>
    </form>
  );
};

export default GalleryForm;