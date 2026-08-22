import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Gallery, GalleryFormData, CoverTemplateSettings } from '../../types/gallery';
import { createGallery, updateGallery, uploadGalleryImages, sendGalleryEmail, sendGalleryWhatsApp, sendGallerySms } from '../../lib/gallery-api';
import CoverImagePositioner from '../galleries/CoverImagePositioner';
import GalleryCoverDesigner, { CoverSettings, COVER_TEMPLATES } from '../galleries/GalleryCoverDesigner';
import SearchableClientDropdown from './SearchableClientDropdown';
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
  Share2,
  Move,
  Palette,
  Mail,
  MessageCircle,
  Phone,
  Copy,
  Link,
  CheckCircle
} from 'lucide-react';

interface GalleryFormProps {
  gallery?: Gallery;
  isEditing?: boolean;
  onSuccess?: () => void;
}

type Step = 'details' | 'cover' | 'upload' | 'settings' | 'preview';

// Internal form state interface
interface FormState {
  title: string;
  description: string;
  downloadEnabled: boolean;
  status: 'ACTIVE' | 'ARCHIVED' | 'SHARED';
  expiresAt: string;
  clientId?: string;
}

interface Client {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

const AdvancedGalleryForm: React.FC<GalleryFormProps> = ({ gallery, isEditing = false, onSuccess }) => {
  const navigate = useNavigate();
  // Open on the step the caller asked for. The gallery detail page's "Upload Photos"
  // buttons used to navigate to /admin/galleries/:id/upload, which is not a registered
  // route in App.tsx — the most obvious button in the product went nowhere. They now
  // deep-link here with ?step=upload.
  const requestedStep = (() => {
    const q = new URLSearchParams(window.location.search).get('step');
    const valid = ['details', 'cover', 'upload', 'settings', 'preview'];
    return q && valid.includes(q) ? (q as Step) : 'details';
  })();
  const [currentStep, setCurrentStep] = useState<Step>(requestedStep);
  const [formData, setFormData] = useState<FormState>({
    title: '',
    description: '',
    downloadEnabled: true,
    status: 'ACTIVE',
    expiresAt: '',
    clientId: '',
  });
  const [clients, setClients] = useState<Client[]>([]);
  const [password, setPassword] = useState('');
  const [isPasswordProtected, setIsPasswordProtected] = useState(false);
  const [watermarkEnabled, setWatermarkEnabled] = useState(false);
  const [invisibleWatermarkEnabled, setInvisibleWatermarkEnabled] = useState(false);
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [uploadedImages, setUploadedImages] = useState<any[]>([]);  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [coverImageUrl, setCoverImageUrl] = useState<string>('');
  const [coverPosition, setCoverPosition] = useState<{ x: number; y: number }>({ x: 50, y: 50 });
  const [coverScale, setCoverScale] = useState<number>(100);
  const [coverTemplate, setCoverTemplate] = useState<CoverTemplateSettings | null>(null);
  const [showPositioner, setShowPositioner] = useState(false);
  const [showCoverDesigner, setShowCoverDesigner] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [savedGalleryId, setSavedGalleryId] = useState<string | null>(null);
  const [savedGallerySlug, setSavedGallerySlug] = useState<string | null>(null);
  const [shareEmail, setShareEmail] = useState('');
  const [sharePhone, setSharePhone] = useState('');
  const [shareMessage, setShareMessage] = useState('');
  const [shareSending, setShareSending] = useState(false);
  const [shareSuccess, setShareSuccess] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  const steps = [
    { id: 'details', label: 'Details', icon: FileText, description: 'Gallery title and description' },
    { id: 'cover', label: 'Cover', icon: Palette, description: 'Design gallery cover' },
    { id: 'upload', label: 'Upload', icon: Upload, description: 'Add images to gallery' },
    { id: 'settings', label: 'Settings', icon: Settings, description: 'Access and sharing options' },
    { id: 'preview', label: 'Preview', icon: Eye, description: 'Review and publish' }
  ];

  useEffect(() => {
    fetchClients();
  }, []);

  // datetime-local needs "YYYY-MM-DDTHH:mm" in LOCAL time; a raw ISO string does not
  // populate the input.
  const toDateTimeLocal = (value?: string): string => {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  useEffect(() => {
    if (gallery && isEditing) {
      setFormData({
        title: gallery.title || '',
        // These three were hardcoded to ''/'ACTIVE' when loading an existing gallery,
        // so the form never showed the studio its OWN saved values: an expired gallery
        // opened showing status ACTIVE and a blank expiry date, contradicting the
        // banner above it and making "extend the expiry date below" impossible to act
        // on. Saving then wrote those defaults back, silently discarding the sunset
        // date the studio had deliberately set, and wiping the description.
        description: (gallery as any).description || '',
        downloadEnabled: gallery.downloadEnabled,
        status: ((gallery as any).status as FormState['status']) || 'ACTIVE',
        expiresAt: toDateTimeLocal((gallery as any).expiresAt),
        clientId: (gallery as any).clientId || '',
      });
      setIsPasswordProtected(gallery.isPasswordProtected || false);
      setCoverImageUrl(gallery.coverImage || '');
      setCoverPosition(gallery.coverPosition || { x: 50, y: 50 });
      setCoverScale(gallery.coverScale || 100);
      setCoverTemplate(gallery.coverTemplate || null);
      if (gallery.id) {
        fetchUploadedImages(gallery.id);
      }
    }
  }, [gallery, isEditing]);

  const fetchClients = async () => {
    try {
      const response = await fetch('/api/crm/clients', {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setClients(data);
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  const fetchUploadedImages = async (galleryId: string) => {
    try {
      const response = await fetch(`/api/admin/galleries/${galleryId}/images`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch images');
      const data = await response.json();
      console.log('[GalleryForm] Fetched uploaded images:', data);
      console.log('[GalleryForm] First image URL fields:', data?.[0] ? {
        url: data[0].url,
        thumbUrl: data[0].thumbUrl,
        displayUrl: data[0].displayUrl,
        originalUrl: data[0].originalUrl
      } : 'no images');
      setUploadedImages(data || []);
    } catch (err) {
      console.error('Error fetching images:', err);
    }
  };

  const handleChange = (field: keyof FormState, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  const getStepIndex = (step: Step) => steps.findIndex(s => s.id === step);

  const validateStep = (step: Step): boolean => {
    switch (step) {
      case 'details':
        return !!formData.title.trim();
      case 'cover':
        return true; // Cover is optional
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
      
      // Convert to base64 data URL
      const reader = new FileReader();
      const dataUrlPromise = new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      
      const publicUrl = await dataUrlPromise;
      setCoverImageUrl(publicUrl);
      setCoverImage(file);
    } catch (error) {
      console.error('Cover upload error:', error);
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
        // Convert to base64 data URL
        const reader = new FileReader();
        const dataUrlPromise = new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        
        const publicUrl = await dataUrlPromise;
        
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
      console.error('Image upload error:', error);
      setError('Failed to upload images. Please try again.');
    } finally {
      setImageUploading(false);
      setUploadProgress(0);
    }
  };

  const handleSubmit = async (showShare: boolean = false) => {
    if (!formData.title.trim()) {
      setError('Gallery title is required');
      return;
    }
      try {
      setLoading(true);
      setError(null);
      
      // Prepare gallery data using GalleryFormData interface
      const galleryFormData: GalleryFormData = {
        title: formData.title,
        description: formData.description,
        password: isPasswordProtected ? password : undefined,
        isPasswordProtected: isPasswordProtected,
        downloadEnabled: formData.downloadEnabled,
        watermarkEnabled: watermarkEnabled,
        invisibleWatermarkEnabled: invisibleWatermarkEnabled,
        coverImage: coverImage,
        coverImageUrl: coverImageUrl, // Send existing URL if no new file
        coverPosition: coverPosition,
        coverScale: coverScale,
        coverTemplate: coverTemplate || undefined,
        // Was the literal `true`. There is no UI control for this, and the form never
        // read the gallery's current value — so EVERY save republished the gallery,
        // putting a client's shoot back onto the unauthenticated GET /api/galleries
        // list. Harmless only while the field was being silently dropped on the way to
        // the database; live the moment that was fixed.
        //
        // Preserve what the gallery already has, and default a NEW one to private: a
        // delivery gallery is nobody else's business, and a studio who deliberately
        // made one public keeps it that way through an edit.
        isPublic: isEditing ? ((gallery as any)?.isPublic ?? false) : false,
        clientId: formData.clientId || undefined,
        // The sunset date and status were never sent, so editing them did nothing —
        // a studio could not extend an expiry or un-archive a gallery from this form,
        // which is exactly what the expired-gallery banner asks it to do. The
        // datetime-local value is local wall-clock time; send an absolute instant.
        // null (not undefined) so clearing the field actually removes the expiry.
        expiresAt: formData.expiresAt ? new Date(formData.expiresAt).toISOString() : null,
        status: formData.status,
      };
      
      let galleryId: string;
      let gallerySlug: string;
      
      if (isEditing && gallery?.id) {
        const updatedGallery = await updateGallery(gallery.id, galleryFormData);
        galleryId = updatedGallery.id;
        gallerySlug = updatedGallery.slug || formData.title.toLowerCase().replace(/[^\w\s]/gi, '').replace(/\s+/g, '-');
        setSuccessMessage('Gallery updated successfully!');
      } else {
        const newGallery = await createGallery(galleryFormData);
        galleryId = newGallery.id;
        gallerySlug = newGallery.slug || formData.title.toLowerCase().replace(/[^\w\s]/gi, '').replace(/\s+/g, '-');
        setSuccessMessage('Gallery created successfully!');
      }
      
      // Store gallery info for sharing
      setSavedGalleryId(galleryId);
      setSavedGallerySlug(gallerySlug);
      
      // Upload images if any were selected (for both create and edit)
      console.log('[GalleryForm] Selected images count:', selectedImages.length);
      console.log('[GalleryForm] Gallery ID for upload:', galleryId);
      
      if (selectedImages.length > 0) {
        setImageUploading(true);
        setSuccessMessage(`Uploading ${selectedImages.length} images...`);
        try {
          console.log('[GalleryForm] Starting upload...');
          const uploadedResult = await uploadGalleryImages(galleryId, selectedImages);
          console.log('[GalleryForm] Upload result:', uploadedResult);
          console.log('[GalleryForm] Upload successful. Refreshing gallery images...');
          
          // Refresh the uploaded images list to show newly uploaded images
          await fetchUploadedImages(galleryId);
          
          // Clear selected images since they're now uploaded
          setSelectedImages([]);
          
          setSuccessMessage(isEditing ? 'Gallery and images updated!' : 'Gallery created with images!');
        } catch (uploadErr) {
          console.error('[GalleryForm] Upload failed:', uploadErr);
          throw uploadErr;
        } finally {
          setImageUploading(false);
        }
      } else {
        console.log('[GalleryForm] No images to upload');
      }
      
      // If showShare is true, open share modal instead of navigating away
      if (showShare) {
        setLoading(false);
        setShowShareModal(true);
      } else {
        setTimeout(() => {
          if (onSuccess) {
            onSuccess();
          } else {
            navigate('/admin/galleries');
          }
        }, 1500);
      }
        } catch (err) {
      console.error('Gallery save error:', err);
      setImageUploading(false);
      
      // Extract specific error message
      let errorMessage = 'An error occurred while saving the gallery';
      if (err && typeof err === 'object') {
        if ('message' in err) {
          errorMessage = (err as Error).message;
        } else if ('error' in err) {
          errorMessage = (err as any).error;
        } else if ('details' in err) {
          errorMessage = (err as any).details;
        }
      }
      
      setError(errorMessage);
    } finally {
      if (!showShare) {
        setLoading(false);
      }
    }
  };

  // Share functionality
  const getGalleryUrl = () => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/gallery/${savedGallerySlug || formData.title.toLowerCase().replace(/[^\w\s]/gi, '').replace(/\s+/g, '-')}`;
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(getGalleryUrl());
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  const handleSendEmail = async () => {
    if (!shareEmail.trim()) {
      setError('Please enter an email address');
      return;
    }
    try {
      setShareSending(true);
      setShareSuccess(null);
      await sendGalleryEmail({
        galleryId: savedGalleryId || undefined,
        slug: savedGallerySlug || undefined,
        to: shareEmail,
        message: shareMessage || undefined,
        galleryUrl: getGalleryUrl()
      });
      setShareSuccess('Email sent successfully!');
      setShareEmail('');
      setShareMessage('');
    } catch (err) {
      setError((err as Error).message || 'Failed to send email');
    } finally {
      setShareSending(false);
    }
  };

  const handleSendWhatsApp = async () => {
    try {
      setShareSending(true);
      const result = await sendGalleryWhatsApp({
        galleryId: savedGalleryId || undefined,
        slug: savedGallerySlug || undefined,
        toPhone: sharePhone || undefined,
        galleryUrl: getGalleryUrl()
      });
      // Open WhatsApp link if provided
      if (result.share) {
        window.open(result.share, '_blank');
      } else {
        // Fallback: create WhatsApp link manually
        const message = encodeURIComponent(`Check out my gallery: ${getGalleryUrl()}`);
        window.open(`https://wa.me/?text=${message}`, '_blank');
      }
      setShareSuccess('WhatsApp opened!');
    } catch (err) {
      // Fallback to manual WhatsApp share
      const message = encodeURIComponent(`Check out my gallery: ${getGalleryUrl()}`);
      window.open(`https://wa.me/?text=${message}`, '_blank');
    } finally {
      setShareSending(false);
    }
  };

  const handleSendSms = async () => {
    if (!sharePhone.trim()) {
      setError('Please enter a phone number');
      return;
    }
    try {
      setShareSending(true);
      setShareSuccess(null);
      await sendGallerySms({
        galleryId: savedGalleryId || undefined,
        slug: savedGallerySlug || undefined,
        toPhone: sharePhone,
        galleryUrl: getGalleryUrl()
      });
      setShareSuccess('SMS sent successfully!');
      setSharePhone('');
    } catch (err) {
      setError((err as Error).message || 'Failed to send SMS');
    } finally {
      setShareSending(false);
    }
  };

  const renderShareModal = () => {
    if (!showShareModal) return null;

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Share2 className="w-6 h-6" />
                <h2 className="text-xl font-bold">Share Gallery</h2>
              </div>
              <button
                onClick={() => {
                  setShowShareModal(false);
                  if (onSuccess) {
                    onSuccess();
                  } else {
                    navigate('/admin/galleries');
                  }
                }}
                className="p-1 hover:bg-white/20 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-purple-100 text-sm mt-1">
              {formData.title}
            </p>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4">
            {/* Success message */}
            {shareSuccess && (
              <div className="flex items-center gap-2 p-3 bg-green-50 text-green-700 rounded-lg">
                <CheckCircle className="w-5 h-5" />
                <span>{shareSuccess}</span>
              </div>
            )}

            {/* Error message */}
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg">
                <AlertCircle className="w-5 h-5" />
                <span>{error}</span>
              </div>
            )}

            {/* Copy Link */}
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-gray-700 font-medium">
                  <Link className="w-5 h-5" />
                  Gallery Link
                </div>
                <button
                  onClick={handleCopyLink}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    linkCopied
                      ? 'bg-green-100 text-green-700'
                      : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                  }`}
                >
                  {linkCopied ? (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy Link
                    </>
                  )}
                </button>
              </div>
              <div className="text-sm text-gray-500 bg-gray-50 p-2 rounded break-all">
                {getGalleryUrl()}
              </div>
            </div>

            {/* Share via Email */}
            <div className="border rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-700 font-medium mb-3">
                <Mail className="w-5 h-5" />
                Send via Email
              </div>
              <div className="space-y-2">
                <input
                  type="email"
                  placeholder="recipient@email.com"
                  value={shareEmail}
                  onChange={(e) => setShareEmail(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
                <textarea
                  placeholder="Add a personal message (optional)"
                  value={shareMessage}
                  onChange={(e) => setShareMessage(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
                <button
                  onClick={handleSendEmail}
                  disabled={shareSending || !shareEmail.trim()}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {shareSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                  Send Email
                </button>
              </div>
            </div>

            {/* WhatsApp & SMS */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleSendWhatsApp}
                disabled={shareSending}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                <MessageCircle className="w-5 h-5" />
                WhatsApp
              </button>
              <button
                onClick={() => {
                  // Open SMS with pre-filled message
                  const message = encodeURIComponent(`Check out my gallery: ${getGalleryUrl()}`);
                  window.open(`sms:?body=${message}`, '_blank');
                }}
                disabled={shareSending}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                <Phone className="w-5 h-5" />
                SMS
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 border-t">
            <button
              onClick={() => {
                setShowShareModal(false);
                if (onSuccess) {
                  onSuccess();
                } else {
                  navigate('/admin/galleries');
                }
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    );
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
          Client <span className="text-gray-400">(optional)</span>
        </label>
        <SearchableClientDropdown
          clients={clients}
          selectedClientId={formData.clientId || ''}
          onSelect={(clientId) => handleChange('clientId', clientId)}
          placeholder="Select a client..."
        />
        <p className="mt-1 text-sm text-gray-500">
          Link this gallery to a specific client in your CRM
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Cover Image <span className="text-gray-400">(optional)</span>
        </label>
        {coverImageUrl ? (
          <div className="relative w-full rounded-lg overflow-hidden bg-gray-100" style={{ maxHeight: '400px' }}>
            <img
              src={coverImageUrl}
              alt="Cover preview"
              className="w-full h-auto max-h-96 object-contain"
            />
            <button
              type="button"
              onClick={() => {
                setCoverImageUrl('');
                setCoverPosition({ x: 50, y: 50 });
                setCoverScale(100);
                setCoverTemplate(null);
              }}
              className="absolute top-2 right-2 p-2 bg-red-600 text-white rounded-full hover:bg-red-700 shadow-lg z-10"
              title="Remove cover image"
            >
              <X size={16} />
            </button>
            <div className="absolute bottom-2 left-2 bg-black bg-opacity-60 text-white text-xs px-3 py-1.5 rounded">
              Cover uploaded • Design in next step
            </div>
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
              <p className="text-xs text-gray-500 mt-2">You'll be able to design the cover in the next step</p>
            </div>
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Description <span className="text-gray-400">(optional)</span>
        </label>
        <textarea
          value={formData.description || ''}
          onChange={(e) => handleChange('description', e.target.value)}
          rows={4}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          placeholder="Describe this gallery..."
        />
      </div>
    </div>
  );

  const renderCoverStep = () => (
    <div className="h-[calc(100vh-300px)] min-h-[600px]">
      {coverImageUrl ? (
        <div className="h-full">
          <div className="text-center mb-4">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Design Your Gallery Cover</h3>
            <p className="text-sm text-gray-600">
              Choose a template and customize how your gallery cover appears to clients
            </p>
          </div>
          
          <div className="h-[calc(100%-80px)]">
            <GalleryCoverDesigner
              imageUrl={coverImageUrl}
              galleryTitle={formData.title || 'Gallery Title'}
              initialSettings={{
                template: coverTemplate ? COVER_TEMPLATES.find(t => t.id === coverTemplate.templateId) || COVER_TEMPLATES[0] : COVER_TEMPLATES[0],
                imagePosition: coverPosition,
                imageScale: coverScale,
                title: formData.title,
                subtitle: coverTemplate?.subtitle || 'NEW AGE FOTOGRAFIE'
              }}
              onSave={(settings: CoverSettings) => {
                setCoverPosition(settings.imagePosition);
                setCoverScale(settings.imageScale);
                setCoverTemplate({
                  templateId: settings.template.id,
                  textPosition: settings.template.textPosition,
                  textAlignment: settings.template.textAlignment,
                  overlay: settings.template.overlay,
                  titleSize: settings.template.titleSize,
                  showSubtitle: settings.template.showSubtitle,
                  showButton: settings.template.showButton,
                  buttonStyle: settings.template.buttonStyle,
                  fontStyle: settings.template.fontStyle,
                  imageStyle: settings.template.imageStyle,
                  subtitle: settings.subtitle
                });
                // Auto-advance to next step after saving
                nextStep();
              }}
              onCancel={() => {
                // Go back to details step
                const currentIndex = getStepIndex(currentStep);
                if (currentIndex > 0) {
                  setCurrentStep(steps[currentIndex - 1].id as Step);
                }
              }}
            />
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="bg-gray-50 rounded-lg p-8 max-w-md mx-auto">
            <Palette className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Cover Image</h3>
            <p className="text-sm text-gray-600 mb-4">
              You haven't uploaded a cover image yet. You can go back to add one or skip this step.
            </p>
            <button
              type="button"
              onClick={() => {
                const currentIndex = getStepIndex(currentStep);
                if (currentIndex > 0) {
                  setCurrentStep(steps[currentIndex - 1].id as Step);
                }
              }}
              className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              <ArrowLeft size={16} className="mr-2" />
              Go Back to Add Cover Image
            </button>
          </div>
        </div>
      )}
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
              {uploadedImages.map((image, index) => {
                const imageUrl = image.thumbUrl || image.thumb_url || image.displayUrl || image.display_url || image.originalUrl || image.url;
                return (
                  <div key={image.id || index} className="relative group">
                    <div className="aspect-square overflow-hidden rounded-lg bg-gray-100 flex items-center justify-center">
                      {imageUrl ? (
                        <img 
                          src={imageUrl} 
                          alt={image.filename || `Image ${index + 1}`}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            console.error('Image failed to load:', imageUrl);
                            // Replace with placeholder
                            const parent = (e.target as HTMLImageElement).parentElement;
                            if (parent) {
                              parent.innerHTML = `<div class="w-full h-full flex flex-col items-center justify-center text-gray-400 p-2">
                                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                                <span class="text-xs mt-1 text-center">Failed to load</span>
                              </div>`;
                            }
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <ImageIcon size={32} />
                        </div>
                      )}
                    </div>
                    <div className="absolute bottom-1 left-1 right-1 bg-black bg-opacity-50 text-white text-xs p-1 rounded truncate">
                      {image.filename || `Image ${index + 1}`}
                    </div>
                  </div>
                );
              })}
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
            </div>            <button
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

        {/* Watermark Settings */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-gray-900">Visible Watermark</h4>
              <p className="text-sm text-gray-500">Add visible watermark overlay to images</p>
            </div>
            <button
              type="button"
              onClick={() => setWatermarkEnabled(!watermarkEnabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                watermarkEnabled ? 'bg-purple-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`${
                  watermarkEnabled ? 'translate-x-6' : 'translate-x-1'
                } inline-block h-4 w-4 transform rounded-full bg-white transition`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            <div>
              <h4 className="text-sm font-medium text-gray-900">Invisible Watermark</h4>
              <p className="text-sm text-gray-500">Embed invisible steganographic watermark</p>
            </div>
            <button
              type="button"
              onClick={() => setInvisibleWatermarkEnabled(!invisibleWatermarkEnabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                invisibleWatermarkEnabled ? 'bg-purple-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`${
                  invisibleWatermarkEnabled ? 'translate-x-6' : 'translate-x-1'
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
            type="datetime-local"            value={formData.expiresAt || ''}
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
            onChange={(e) => handleChange('status', e.target.value)}
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
          {/* Gallery Cover Preview - Shows exactly how the cover will look */}
          <div className="mb-6">            {coverImageUrl && (
              <div className="mb-4 relative bg-gray-100 rounded-lg overflow-hidden" style={{ aspectRatio: '16/9' }}>
                <img
                  src={coverImageUrl}
                  alt="Cover"
                  className="absolute inset-0 w-full h-full object-cover"
                  style={{ 
                    objectPosition: `${coverPosition.x}% ${coverPosition.y}%`,
                    transform: `scale(${coverScale / 100})`,
                    transformOrigin: `${coverPosition.x}% ${coverPosition.y}%`
                  }}
                />
                {/* Cover overlay with title - shows template styling */}
                {coverTemplate && (
                  <div className={`absolute inset-0 flex items-center justify-center ${
                    coverTemplate.overlay === 'dark' ? 'bg-black/40' :
                    coverTemplate.overlay === 'light' ? 'bg-white/30' :
                    coverTemplate.overlay === 'gradient-bottom' ? 'bg-gradient-to-t from-black/70 via-transparent to-transparent' :
                    coverTemplate.overlay === 'gradient-top' ? 'bg-gradient-to-b from-black/70 via-transparent to-transparent' : ''
                  }`}>
                    <div className="text-center">
                      <h2 className={`text-white font-medium drop-shadow-lg ${
                        coverTemplate.titleSize === 'xlarge' ? 'text-3xl md:text-4xl' :
                        coverTemplate.titleSize === 'large' ? 'text-2xl md:text-3xl' :
                        coverTemplate.titleSize === 'medium' ? 'text-xl md:text-2xl' : 'text-lg md:text-xl'
                      } ${
                        coverTemplate.fontStyle === 'elegant' ? 'tracking-widest uppercase' :
                        coverTemplate.fontStyle === 'bold' ? 'font-bold' :
                        coverTemplate.fontStyle === 'minimal' ? 'font-light tracking-[0.2em]' : ''
                      }`}>
                        {formData.title}
                      </h2>
                      {coverTemplate.showSubtitle && coverTemplate.subtitle && (
                        <p className="text-white/80 text-sm mt-2 tracking-wider">{coverTemplate.subtitle}</p>
                      )}
                      {coverTemplate.showButton && (
                        <button className={`mt-4 ${
                          coverTemplate.buttonStyle === 'solid' ? 'bg-white text-gray-900 px-6 py-2' :
                          coverTemplate.buttonStyle === 'outline' ? 'border-2 border-white text-white px-6 py-2' :
                          'bg-white text-gray-900 px-6 py-2 rounded-full'
                        } text-sm font-medium`}>
                          OPEN GALLERY
                        </button>
                      )}
                    </div>
                  </div>
                )}
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
              )}              <div className="flex items-center">
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
                    src={image.thumbUrl || image.thumb_url || image.displayUrl || image.display_url || image.originalUrl || image.url} 
                    alt={image.filename || `Image ${index + 1}`}
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
      case 'cover':
        return renderCoverStep();
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
            {/* Save Draft button - always visible */}
            <button
              type="button"
              onClick={() => handleSubmit(false)}
              disabled={loading || imageUploading}
              className="flex items-center px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              {(loading || imageUploading) ? (
                <Loader2 className="animate-spin mr-2 h-4 w-4" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              {imageUploading ? 'Uploading...' : 'Save Draft'}
            </button>
            
            {getStepIndex(currentStep) === steps.length - 1 ? (
              <button
                type="button"
                onClick={() => handleSubmit(true)}
                disabled={loading || imageUploading || !validateStep(currentStep)}
                className="flex items-center px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                {(loading || imageUploading) ? (
                  <Loader2 className="animate-spin mr-2 h-4 w-4" />
                ) : (
                  <Share2 className="mr-2 h-4 w-4" />
                )}
                {imageUploading ? 'Uploading Images...' : 'Share Gallery'}
              </button>
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
      
      {/* Share Modal */}
      {renderShareModal()}
    </div>
  );
};

export default AdvancedGalleryForm;
