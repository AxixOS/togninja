import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Gallery } from '../../types/gallery';
import { 
  ArrowLeft, 
  ArrowRight, 
  Save, 
  AlertCircle, 
  Check,
  FileText,
  Image as ImageIcon,
  Upload,
  Settings,
  Eye,
  Loader2,
  X,
  Lock,
  Download,
  Calendar,
  Share2
} from 'lucide-react';

interface GalleryFormProps {
  gallery?: Gallery;
  isEditing?: boolean;
}

type Step = 'details' | 'upload' | 'settings' | 'preview';

interface FormData {
  title: string;
  description: string;
  coverImage: string;
  downloadEnabled: boolean;
  status: 'ACTIVE' | 'ARCHIVED' | 'SHARED';
  expiresAt: string;
}

const AdvancedGalleryForm: React.FC<GalleryFormProps> = ({ gallery, isEditing = false }) => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<Step>('details');
  const [formData, setFormData] = useState<FormData>({
    title: '',
    description: '',
    coverImage: '',
    downloadEnabled: true,
    status: 'ACTIVE',
    expiresAt: '',
  });
  
  const [password, setPassword] = useState('');
  const [isPasswordProtected, setIsPasswordProtected] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<any[]>([]);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const steps = [
    { id: 'details', label: 'Details', icon: FileText, description: 'Gallery title and description' },
    { id: 'upload', label: 'Upload', icon: Upload, description: 'Add images to gallery' },
    { id: 'settings', label: 'Settings', icon: Settings, description: 'Access and sharing options' },
    { id: 'preview', label: 'Preview', icon: Eye, description: 'Review and publish' }
  ];

  useEffect(() => {
    if (gallery && isEditing) {
      setFormData({
        title: gallery.title || '',
        description: '', // Gallery interface doesn't have description, keep empty
        coverImage: gallery.coverImage || '',
        downloadEnabled: gallery.downloadEnabled,
        status: 'ACTIVE', // Default status
        expiresAt: '', // Gallery interface doesn't have expiration, keep empty
      });
      setIsPasswordProtected(!!gallery.passwordHash);
      if (gallery.id) {
        fetchUploadedImages(gallery.id);
      }
    }
  }, [gallery, isEditing]);

  const fetchUploadedImages = async (galleryId: string) => {
    try {
      const { data, error } = await supabase
        .from('gallery_images')
        .select('*')
        .eq('gallery_id', galleryId)
        .order('order_index');
      
      if (error) throw error;
      setUploadedImages(data || []);
    } catch (err) {
      // console.error removed
    }
  };

  const handleChange = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  const getStepIndex = (step: Step) => steps.findIndex(s => s.id === step);

  const validateStep = (step: Step): boolean => {
    switch (step) {
      case 'details':
        return !!formData.title.trim();
      case 'upload':
        return selectedImages.length > 0 || uploadedImages.length > 0;
      case 'settings':
        return true; // Settings are optional
      case 'preview':
        return true;
      default:
        return false;
    }
  };

  const nextStep = () => {
    const currentIndex = getStepIndex(currentStep);
    if (currentIndex < steps.length - 1 && validateStep(currentStep)) {
      setCurrentStep(steps[currentIndex + 1].id as Step);
    }
  };

  const prevStep = () => {
    const currentIndex = getStepIndex(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1].id as Step);
    }
  };

  const handleCoverImageUpload = async (file: File) => {
    try {
      setImageUploading(true);
      
      const fileExt = file.name.split('.').pop();
      const fileName = `galleries/covers/${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(fileName, file);
      
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage
        .from('images')
        .getPublicUrl(fileName);
      
      handleChange('coverImage', publicUrl);
    } catch (error) {
      // console.error removed
      setError('Failed to upload cover image. Please try again.');
    } finally {
      setImageUploading(false);
    }
  };

  const handleImageUpload = async (files: File[]) => {
    try {
      setImageUploading(true);
      setUploadProgress(0);
      
      const uploadPromises = files.map(async (file, index) => {
        const fileExt = file.name.split('.').pop();
        const fileName = `galleries/images/${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('images')
          .upload(fileName, file);
        
        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage
          .from('images')
          .getPublicUrl(fileName);
        
        // Update progress
        setUploadProgress(((index + 1) / files.length) * 100);
        
        return {
          original_url: publicUrl,
          display_url: publicUrl,
          thumb_url: publicUrl,
          filename: file.name,
          size_bytes: file.size,
          content_type: file.type,
          order_index: uploadedImages.length + index
        };
      });
      
      const newImages = await Promise.all(uploadPromises);
      setUploadedImages(prev => [...prev, ...newImages]);
      setSelectedImages([]);
      
    } catch (error) {
      // console.error removed
      setError('Failed to upload images. Please try again.');
    } finally {
      setImageUploading(false);
      setUploadProgress(0);
    }
  };

  const handleSubmit = async (publish = false) => {
    if (!formData.title.trim()) {
      setError('Gallery title is required');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('You must be logged in to create or edit galleries');
      }
      
      // Generate slug from title
      const slug = formData.title.toLowerCase().replace(/[^\w\s]/gi, '').replace(/\s+/g, '-');
      
      const galleryData = {
        title: formData.title,
        slug,
        coverImage: formData.coverImage || null,
        passwordHash: isPasswordProtected && password ? await hashPassword(password) : null,
        downloadEnabled: formData.downloadEnabled,
        clientId: user.id,
      };
      
      let galleryId: string;
      
      if (isEditing && gallery?.id) {
        const { error } = await supabase
          .from('galleries')
          .update({
            ...galleryData,
            updatedAt: new Date().toISOString()
          })
          .eq('id', gallery.id);
        
        if (error) throw error;
        galleryId = gallery.id;
        setSuccessMessage('Gallery updated successfully!');
      } else {
        const { data: newGallery, error } = await supabase
          .from('galleries')
          .insert({
            ...galleryData,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          })
          .select()
          .single();
        
        if (error) throw error;
        galleryId = newGallery.id;
        setSuccessMessage('Gallery created successfully!');
      }
      
      // Upload images if any
      if (selectedImages.length > 0) {
        await handleImageUpload(selectedImages);
        
        // Insert image records into database
        const imageRecords = uploadedImages.map(img => ({
          ...img,
          galleryId: galleryId
        }));
        
        const { error: imageError } = await supabase
          .from('gallery_images')
          .insert(imageRecords);
        
        if (imageError) {
          throw imageError;
        }
      }
      
      setTimeout(() => {
        navigate('/admin/galleries');
      }, 1500);
      
    } catch (err) {
      // console.error removed
      setError(err instanceof Error ? err.message : 'An error occurred while saving the gallery');
    } finally {
      setLoading(false);
    }
  };

  // Simple password hashing (in production, use proper hashing)
  const hashPassword = async (password: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-between mb-8">
      {steps.map((step, index) => {
        const isActive = step.id === currentStep;
        const isCompleted = validateStep(step.id as Step) && getStepIndex(currentStep) > index;
        const Icon = step.icon;
        
        return (
          <div key={step.id} className="flex items-center">
            <div className="flex flex-col items-center">
              <div className={`
                w-12 h-12 rounded-full flex items-center justify-center border-2 transition-colors
                ${isActive 
                  ? 'bg-purple-600 border-purple-600 text-white' 
                  : isCompleted 
                    ? 'bg-green-600 border-green-600 text-white'
                    : 'bg-gray-100 border-gray-300 text-gray-500'
                }
              `}>
                {isCompleted ? <Check size={20} /> : <Icon size={20} />}
              </div>
              <div className="mt-2 text-center">
                <div className={`text-sm font-medium ${isActive ? 'text-purple-600' : 'text-gray-600'}`}>
                  {step.label}
                </div>
                <div className="text-xs text-gray-500 max-w-24">
                  {step.description}
                </div>
              </div>
            </div>
            {index < steps.length - 1 && (
              <div className={`w-16 h-0.5 mx-4 ${isCompleted ? 'bg-green-600' : 'bg-gray-300'}`} />
            )}
          </div>
        );
      })}
    </div>
  );

  const renderDetailsStep = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Gallery Title <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => handleChange('title', e.target.value)}
          className="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          placeholder="Enter gallery title..."
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Description <span className="text-gray-400">(optional)</span>
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => handleChange('description', e.target.value)}
          rows={4}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          placeholder="Describe this gallery..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Cover Image <span className="text-gray-400">(optional)</span>
        </label>
        {formData.coverImage ? (
          <div className="relative">
            <img
              src={formData.coverImage}
              alt="Cover preview"
              className="w-full h-64 object-cover rounded-lg"
            />
            <button
              onClick={() => handleChange('coverImage', '')}
              className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-full hover:bg-red-700"
            >
              <X size={16} />
            </button>
          </div>
        ) : (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8">
            <div className="text-center">
              <ImageIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <label className="cursor-pointer">
                <span className="text-purple-600 hover:text-purple-700 font-medium">
                  Upload a cover image
                </span>
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleCoverImageUpload(file);
                  }}
                />
              </label>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderUploadStep = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Gallery Images</h3>
        
        {/* Drag & Drop Area */}
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
          <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <label className="cursor-pointer">
            <span className="text-purple-600 hover:text-purple-700 font-medium text-lg">
              Choose images to upload
            </span>
            <span className="block text-gray-500 mt-1">or drag and drop them here</span>
            <input
              type="file"
              className="hidden"
              multiple
              accept="image/*"
              onChange={(e) => {
                const files = Array.from(e.target.files || []);
                setSelectedImages(prev => [...prev, ...files]);
              }}
            />
          </label>
        </div>

        {/* Upload Progress */}
        {imageUploading && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Uploading images...</span>
              <span className="text-sm text-gray-600">{Math.round(uploadProgress)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Selected Images Preview */}
        {selectedImages.length > 0 && (
          <div className="mt-6">
            <h4 className="text-md font-medium text-gray-900 mb-3">
              Selected Images ({selectedImages.length})
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {selectedImages.map((file, index) => (
                <div key={index} className="relative group">
                  <div className="aspect-square overflow-hidden rounded-lg">
                    <img 
                      src={URL.createObjectURL(file)} 
                      alt={`Preview ${index}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedImages(prev => prev.filter((_, i) => i !== index))}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={12} />
                  </button>
                  <div className="absolute bottom-1 left-1 right-1 bg-black bg-opacity-50 text-white text-xs p-1 rounded truncate">
                    {file.name}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Uploaded Images */}
        {uploadedImages.length > 0 && (
          <div className="mt-6">
            <h4 className="text-md font-medium text-gray-900 mb-3">
              Uploaded Images ({uploadedImages.length})
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {uploadedImages.map((image, index) => (
                <div key={index} className="relative group">
                  <div className="aspect-square overflow-hidden rounded-lg">
                    <img 
                      src={image.thumb_url || image.display_url} 
                      alt={image.filename}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="absolute bottom-1 left-1 right-1 bg-black bg-opacity-50 text-white text-xs p-1 rounded truncate">
                    {image.filename}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderSettingsStep = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Gallery Settings</h3>
        
        {/* Password Protection */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-sm font-medium text-gray-900">Password Protection</h4>
              <p className="text-sm text-gray-500">Require a password to view this gallery</p>
            </div>
            <button
              type="button"
              onClick={() => setIsPasswordProtected(!isPasswordProtected)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                isPasswordProtected ? 'bg-purple-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`${
                  isPasswordProtected ? 'translate-x-6' : 'translate-x-1'
                } inline-block h-4 w-4 transform rounded-full bg-white transition`}
              />
            </button>
          </div>
          
          {isPasswordProtected && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Gallery Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                placeholder="Enter password"
              />
            </div>
          )}
        </div>

        {/* Download Settings */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-gray-900">Download Enabled</h4>
              <p className="text-sm text-gray-500">Allow visitors to download images</p>
            </div>
            <button
              type="button"
              onClick={() => handleChange('downloadEnabled', !formData.downloadEnabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                formData.downloadEnabled ? 'bg-purple-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`${
                  formData.downloadEnabled ? 'translate-x-6' : 'translate-x-1'
                } inline-block h-4 w-4 transform rounded-full bg-white transition`}
              />
            </button>
          </div>
        </div>

        {/* Expiration Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Expiration Date <span className="text-gray-400">(optional)</span>
          </label>
          <input
            type="datetime-local"
            value={formData.expiresAt}
            onChange={(e) => handleChange('expiresAt', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          />
          <p className="text-sm text-gray-500 mt-1">
            Leave empty for no expiration
          </p>
        </div>

        {/* Status */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Gallery Status
          </label>
          <select
            value={formData.status}
            onChange={(e) => handleChange('status', e.target.value as FormData['status'])}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          >
            <option value="ACTIVE">Active</option>
            <option value="SHARED">Shared</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </div>
      </div>
    </div>
  );

  const renderPreviewStep = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Gallery Preview</h3>
        
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          {/* Gallery Header */}
          <div className="mb-6">
            {formData.coverImage && (
              <div className="mb-4 flex justify-center bg-gray-100 rounded-lg overflow-hidden">
                <img
                  src={formData.coverImage}
                  alt="Cover"
                  className="max-w-full max-h-64 object-contain"
                />
              </div>
            )}
            
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{formData.title}</h1>
            {formData.description && (
              <p className="text-gray-600 mb-4">{formData.description}</p>
            )}
            
            <div className="flex items-center space-x-4 text-sm text-gray-500">
              <div className="flex items-center">
                <ImageIcon size={16} className="mr-1" />
                {selectedImages.length + uploadedImages.length} images
              </div>
              {isPasswordProtected && (
                <div className="flex items-center">
                  <Lock size={16} className="mr-1" />
                  Password protected
                </div>
              )}
              <div className="flex items-center">
                <Download size={16} className="mr-1" />
                {formData.downloadEnabled ? 'Downloads enabled' : 'View only'}
              </div>
              {formData.expiresAt && (
                <div className="flex items-center">
                  <Calendar size={16} className="mr-1" />
                  Expires {new Date(formData.expiresAt).toLocaleDateString()}
                </div>
              )}
            </div>
          </div>

          {/* Image Grid Preview */}
          {(selectedImages.length > 0 || uploadedImages.length > 0) && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {uploadedImages.slice(0, 8).map((image, index) => (
                <div key={index} className="aspect-square overflow-hidden rounded-lg">
                  <img 
                    src={image.thumb_url || image.display_url} 
                    alt={image.filename}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
              {selectedImages.slice(0, 8 - uploadedImages.length).map((file, index) => (
                <div key={`selected-${index}`} className="aspect-square overflow-hidden rounded-lg">
                  <img 
                    src={URL.createObjectURL(file)} 
                    alt={`Preview ${index}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
              {(selectedImages.length + uploadedImages.length) > 8 && (
                <div className="aspect-square flex items-center justify-center bg-gray-100 rounded-lg">
                  <span className="text-gray-500">
                    +{(selectedImages.length + uploadedImages.length) - 8} more
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'details':
        return renderDetailsStep();
      case 'upload':
        return renderUploadStep();
      case 'settings':
        return renderSettingsStep();
      case 'preview':
        return renderPreviewStep();
      default:
        return renderDetailsStep();
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start mb-6">
          <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 mr-2" />
          <span>{error}</span>
        </div>
      )}
      
      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6">
          {successMessage}
        </div>
      )}

      {renderStepIndicator()}
      
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        {renderCurrentStep()}
        
        <div className="flex items-center justify-between pt-6 mt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={prevStep}
            disabled={getStepIndex(currentStep) === 0}
            className="flex items-center px-4 py-2 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowLeft size={16} className="mr-2" />
            Previous
          </button>
          
          <div className="flex space-x-3">
            {getStepIndex(currentStep) === steps.length - 1 ? (
              <>
                <button
                  type="button"
                  onClick={() => handleSubmit(false)}
                  disabled={loading || !validateStep(currentStep)}
                  className="flex items-center px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="animate-spin mr-2 h-4 w-4" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Save Gallery
                </button>
                <button
                  type="button"
                  onClick={() => handleSubmit(true)}
                  disabled={loading || !validateStep(currentStep)}
                  className="flex items-center px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="animate-spin mr-2 h-4 w-4" />
                  ) : (
                    <Share2 className="mr-2 h-4 w-4" />
                  )}
                  Create Gallery
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={nextStep}
                disabled={!validateStep(currentStep)}
                className="flex items-center px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                Next
                <ArrowRight size={16} className="ml-2" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdvancedGalleryForm;
