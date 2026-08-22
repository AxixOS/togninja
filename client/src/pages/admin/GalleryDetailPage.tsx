import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, HelpCircle, Upload, Check, Settings, FolderOpen, MessageSquare, 
  FileText, Trash2, Image as ImageIcon, Sun, Moon, X, ChevronLeft, ChevronRight, ChevronDown,
  Eye, EyeOff, Download, ShoppingCart, Clock, Calendar, Sparkles, Grid3X3, Grid2X2,
  LayoutGrid, ExternalLink, Plus, MoreVertical, Loader2, AlertCircle, Share2,
  Mail, Clipboard, Phone, Play, Video, Lock, Link as LinkIcon, Users, Tag, 
  CreditCard, Truck, Edit2, Copy, Info, Palette, Smartphone, Monitor, Droplet, Shield
} from 'lucide-react';
import { getGalleryById, deleteGallery, getGalleryImages } from '../../lib/gallery-api';
import { COVER_TEMPLATES, CoverTemplate } from '../../components/galleries/GalleryCoverDesigner';
import { SITE } from '../../config/site';
import { galleryPublicUrl, galleryDisplayUrl } from '../../lib/galleryUrl';

interface GalleryImage {
  id: string;
  filename: string;
  // camelCase, because that is what GET /api/admin/galleries/:id/images returns
  // (server/routes.ts:5768-5776). This interface used to declare snake_case, so every
  // read resolved to undefined and the admin showed a blank tile for every photo.
  originalUrl: string;
  displayUrl: string;
  thumbUrl: string;
  sizeBytes?: number;
}

interface Gallery {
  id: string;
  title: string;
  // The address a client is given. It is assigned by the server on create; the admin
  // used to link to /gallery/<uuid> instead, which resolves only because the public
  // route falls back to an id lookup — so clients got a database key in their link.
  slug?: string;
  description?: string;
  coverImage?: string;
  isPublic?: boolean;
  downloadEnabled?: boolean;
  isPasswordProtected?: boolean;
  createdAt?: string;
  expiresAt?: string;
  clientId?: string;
  clientName?: string;
}

type SettingsTab = 'design' | 'experience' | 'availability' | 'shopping' | 'downloads';
type ThumbnailStyle = 'masonry' | 'grid' | 'rows';
type Theme = 'light' | 'dark';
type NavigationType = 'icons' | 'text' | 'both';

/**
 * A settings tab whose controls do not persist yet.
 *
 * This page carried around forty controls across five tabs — theme, spacing, thumbnail
 * size, slideshow, video, price list, tax, payment methods, download resolutions — and
 * the only write in the whole file was a publish toggle. Everything else changed local
 * state and stopped there: no save button, no request, and for most of them no column
 * to save into.
 *
 * They are left visible because they document the intended shape of the feature, but
 * they are inert and say so. A control that looks live and silently discards what you
 * typed is worse than one that admits it is not ready — particularly on a settings
 * screen a studio checks before sending a client a link.
 */
const PreviewTab: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="border-t border-gray-200">
    <div className="flex items-start gap-2 px-4 py-3 bg-amber-50 text-amber-800">
      <AlertCircle size={16} className="mt-0.5 shrink-0" />
      <p className="text-xs">
        <span className="font-medium">Preview only.</span> These controls are not connected yet —
        nothing here is saved. Expiry, watermarks, downloads and password protection are on the
        Availability and Downloads tabs, and in the gallery editor.
      </p>
    </div>
    <div className="pointer-events-none opacity-50 select-none">{children}</div>
  </div>
);

const GalleryDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  // Gallery data
  const [gallery, setGallery] = useState<Gallery | null>(null);
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Selection
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  
  // Settings panel
  const [showSettings, setShowSettings] = useState(false);
  const [activeSettingsTab, setActiveSettingsTab] = useState<SettingsTab>('design');
  
  // Design settings
  const [galleryType, setGalleryType] = useState<'proofing' | 'virtual-ips'>('proofing');
  const [coverView, setCoverView] = useState<'cover' | 'thumbnails'>('cover');
  const [thumbnailStyle, setThumbnailStyle] = useState<ThumbnailStyle>('grid');
  const [theme, setTheme] = useState<Theme>('light');
  const [spacing, setSpacing] = useState(50);
  const [thumbnailSize, setThumbnailSize] = useState(50);
  const [showFilenames, setShowFilenames] = useState(true);
  const [navigationType, setNavigationType] = useState<NavigationType>('icons');
  const [showBrandLogo, setShowBrandLogo] = useState(true);
  
  // Watermark settings
  const [selectedWatermark, setSelectedWatermark] = useState<string | null>(null);
  const [showWatermarkPicker, setShowWatermarkPicker] = useState(false);
  const [watermarkOpacity, setWatermarkOpacity] = useState(50);
  const [watermarkPosition, setWatermarkPosition] = useState<'center' | 'corner' | 'tile'>('corner');
  const [visibleWatermarkEnabled, setVisibleWatermarkEnabled] = useState(true);
  const [invisibleWatermarkEnabled, setInvisibleWatermarkEnabled] = useState(true);
  const [patternWatermarkEnabled, setPatternWatermarkEnabled] = useState(false);
  
  // Cover images
  const [coverImages, setCoverImages] = useState<string[]>([]);
  const [selectedCover, setSelectedCover] = useState(0);
  const [selectedCoverTemplate, setSelectedCoverTemplate] = useState<CoverTemplate>(COVER_TEMPLATES[0]);
  const [coverTemplateCategory, setCoverTemplateCategory] = useState<CoverTemplate['category'] | 'all'>('all');
  const [coverTemplatePage, setCoverTemplatePage] = useState(0);
  const [showCoverDesigner, setShowCoverDesigner] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  
  // Experience settings
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [welcomeMessageEnabled, setWelcomeMessageEnabled] = useState(false);
  const [slideshowEnabled, setSlideshowEnabled] = useState(true);
  const [slideshowLocation, setSlideshowLocation] = useState<'pre-gallery' | 'nav-button' | 'both'>('both');
  const [slideshowStyle, setSlideshowStyle] = useState<'simple' | 'ken-burns'>('ken-burns');
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [videoLocation, setVideoLocation] = useState<'pre-gallery' | 'nav-button' | 'both'>('pre-gallery');
  const [videoUrl, setVideoUrl] = useState('');
  const [registerToView, setRegisterToView] = useState(true);
  const [registerRequirement, setRegisterRequirement] = useState<'email' | 'email-name'>('email-name');
  
  // Availability settings
  const [galleryLink, setGalleryLink] = useState('');
  const [attachedShoot, setAttachedShoot] = useState('');
  const [restrictAccess, setRestrictAccess] = useState(false);
  const [expirationEnabled, setExpirationEnabled] = useState(false);
  const [expirationDate, setExpirationDate] = useState('');
  const [placeholderEnabled, setPlaceholderEnabled] = useState(false);
  const [includeOnCatalog, setIncludeOnCatalog] = useState(false);
  
  // Shopping settings
  const [priceList, setPriceList] = useState('Online Shop');
  const [taxSetting, setTaxSetting] = useState('UsT');
  const [paymentMethods, setPaymentMethods] = useState(4);
  const [shippingMethods, setShippingMethods] = useState(0);
  const [allowCoupons, setAllowCoupons] = useState(true);
  const [allowQuickBuy, setAllowQuickBuy] = useState(false);
  
  // Downloads settings
  const [visitorDownloadResolution, setVisitorDownloadResolution] = useState('original');
  const [clientDownloadResolution, setClientDownloadResolution] = useState('original');
  const [showAdvancedDownloads, setShowAdvancedDownloads] = useState(false);
  const [showVisitorPresetPicker, setShowVisitorPresetPicker] = useState(false);
  const [showClientPresetPicker, setShowClientPresetPicker] = useState(false);
  const [allowIndividualDownload, setAllowIndividualDownload] = useState(true);
  const [allowZipDownload, setAllowZipDownload] = useState(true);
  const [requireEmailBeforeDownload, setRequireEmailBeforeDownload] = useState(false);
  const [addWatermarkToDownloads, setAddWatermarkToDownloads] = useState(false);
  
  // Sidebar panels
  const [expandedPanels, setExpandedPanels] = useState({
    settings: true,
    folders: false,
    activityFeed: false,
    notes: false,
    setupAssistant: false
  });
  
  // Stats
  const [storageUsed, setStorageUsed] = useState('0 MB');
  const [photoCount, setPhotoCount] = useState(0);
  const [publishedDate, setPublishedDate] = useState<string | null>(null);
  const [viewCount, setViewCount] = useState(0);
  const [downloadCount, setDownloadCount] = useState(0);
  const [favoriteCount, setFavoriteCount] = useState(0);
  const [lastActivity, setLastActivity] = useState<string | null>(null);
  const [uniqueVisitors, setUniqueVisitors] = useState(0);

  useEffect(() => {
    if (id) {
      fetchGalleryData(id);
    }
  }, [id]);

  const fetchGalleryData = async (galleryId: string) => {
    try {
      setLoading(true);
      const galleryData = await getGalleryById(galleryId);
      setGallery(galleryData);

      // Show the studio what this gallery ACTUALLY has set.
      //
      // These six controls were initialised to hardcoded defaults and never read the
      // gallery — so a shoot with watermarking switched off displayed the watermark
      // toggle ON, a gallery with downloads disabled displayed them enabled, and a
      // sunset date the studio had set showed as "no expiry". That is worse than a
      // control that does not save: it is a control that reports the opposite of the
      // truth, on the screen a studio would check before sending a client a link.
      //
      // These are the only six with a column behind them (shared/schema.ts:697-707).
      // The rest of this panel is marked as a preview, because inventing a value for a
      // column that does not exist is how the first six ended up lying.
      const g: any = galleryData;
      setVisibleWatermarkEnabled(g.visibleWatermark === true);
      setInvisibleWatermarkEnabled(g.invisibleWatermark === true);
      setAllowZipDownload(g.downloadEnabled !== false);
      setRestrictAccess(g.isPasswordProtected === true);
      setIncludeOnCatalog(g.isPublic === true);
      setExpirationEnabled(Boolean(g.expiresAt));
      setExpirationDate(g.expiresAt ? new Date(g.expiresAt).toISOString().slice(0, 10) : '');

      // Fetch images
      const imagesData = await getGalleryImages(galleryId);
      setImages((imagesData || []) as any);
      setPhotoCount(imagesData?.length || 0);
      
      // Calculate storage
      const totalBytes = imagesData?.reduce((acc: number, img: any) => acc + (img.sizeBytes || 0), 0) || 0;
      setStorageUsed(formatBytes(totalBytes));
      
      // Set cover images from first 4 images
      const covers = imagesData?.slice(0, 4).map((img: any) => img.thumbUrl || img.displayUrl) || [];
      setCoverImages(covers);
      
      // Set published date
      if (galleryData.createdAt) {
        setPublishedDate(new Date(galleryData.createdAt).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        }));
      }
      
      // Fetch analytics
      try {
        const analyticsResponse = await fetch(`/api/galleries/${galleryId}/analytics`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        if (analyticsResponse.ok) {
          const analyticsData = await analyticsResponse.json();
          setViewCount(analyticsData.analytics.view_count || 0);
          setDownloadCount(analyticsData.analytics.download_count || 0);
          setUniqueVisitors(analyticsData.emailCaptures?.length || 0);
          
          if (analyticsData.analytics.last_viewed_at) {
            setLastActivity(new Date(analyticsData.analytics.last_viewed_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            }));
          }
        }
      } catch (err) {
        console.error('Error fetching analytics:', err);
        // Don't fail the whole page if analytics fail
      }
    } catch (err) {
      console.error('Error fetching gallery:', err);
      setError('Failed to load gallery');
    } finally {
      setLoading(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const toggleSelectAll = () => {
    if (selectedImages.length === images.length) {
      setSelectedImages([]);
    } else {
      setSelectedImages(images.map(img => img.id));
    }
  };

  const toggleImageSelection = (imageId: string) => {
    setSelectedImages(prev =>
      prev.includes(imageId) 
        ? prev.filter(id => id !== imageId)
        : [...prev, imageId]
    );
  };

  const togglePanel = (panel: keyof typeof expandedPanels) => {
    setExpandedPanels(prev => ({ ...prev, [panel]: !prev[panel] }));
  };

  const handlePublish = async () => {
    try {
      const response = await fetch(`/api/galleries/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ isPublic: !gallery?.isPublic })
      });
      if (response.ok) {
        const updated = await response.json();
        setGallery(updated);
      }
    } catch (err) {
      console.error('Error updating gallery:', err);
    }
  };

  // Persist the settings that have somewhere to go.
  //
  // Before this, the only write in this entire 2,100-line page was handlePublish, which
  // toggles isPublic. Around forty other controls across five tabs changed local state
  // and nothing else — no save button, no request, no column.
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  const saveSettings = async () => {
    if (!id) return;
    setSavingSettings(true);
    setSettingsError(null);
    setSettingsSaved(false);
    try {
      const body: Record<string, any> = {
        visibleWatermark: visibleWatermarkEnabled,
        invisibleWatermark: invisibleWatermarkEnabled,
        downloadEnabled: allowZipDownload,
        isPublic: includeOnCatalog,
        // null clears the sunset date; a date string sets it. Sent as an absolute
        // instant so it does not shift by the viewer's timezone.
        expiresAt: expirationEnabled && expirationDate
          ? new Date(`${expirationDate}T23:59:59`).toISOString()
          : null,
      };
      // Password protection is only sent when it is being switched OFF here. Switching it
      // ON needs a password, and this panel has no field for one — the server would
      // rightly refuse (password_required), so the wizard owns that direction.
      if (!restrictAccess) body.isPasswordProtected = false;

      const response = await fetch(`/api/galleries/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.message || data?.error || 'Could not save these settings.');

      setGallery((prev) => (prev ? { ...prev, ...data } : prev));
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 2500);
    } catch (err) {
      setSettingsError((err as Error).message);
    } finally {
      setSavingSettings(false);
    }
  };

  const copyGalleryLink = async () => {
    const link = galleryPublicUrl(gallery?.slug, { absolute: true });
    if (!link) {
      alert('This gallery has no public address yet.');
      return;
    }
    try {
      await navigator.clipboard.writeText(link);
      alert('Gallery link copied to clipboard!');
    } catch {
      // Clipboard access is refused outside a secure context, and silently swallowing
      // that leaves the studio believing they copied a link they did not.
      window.prompt('Copy the gallery link:', link);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <Loader2 className="h-12 w-12 text-teal-500 animate-spin" />
      </div>
    );
  }

  if (error || !gallery) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <p className="text-gray-600">{error || 'Gallery not found'}</p>
        <Link to="/admin/galleries" className="mt-4 text-teal-600 hover:text-teal-700">
          ← Back to Galleries
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Left Sidebar - Shoot Navigation */}
      <div className="w-64 bg-white border-r border-gray-200 flex-shrink-0 relative">
        <div className="p-4">
          {/* Back to Galleries */}
          <Link to="/admin/galleries" className="flex items-center text-gray-500 hover:text-gray-700 text-sm mb-4">
            <ChevronLeft size={16} className="mr-1" />
            GALLERIES
          </Link>
          
          {/* Date Badge */}
          <div className="bg-teal-500 text-white rounded-lg p-2 w-14 text-center mb-4">
            <div className="text-xs font-medium">
              {new Date(gallery.createdAt || '').toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}
            </div>
            <div className="text-xl font-bold">
              {new Date(gallery.createdAt || '').getDate()}
            </div>
            <div className="text-xs">
              {new Date(gallery.createdAt || '').getFullYear()}
            </div>
          </div>
          
          {/* Gallery Title */}
          <h2 className="font-semibold text-gray-900 mb-1">{gallery.title}</h2>
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
            Gallery
          </span>
          
          {/* Quick Actions */}
          <div className="mt-6">
            <div className="flex items-center text-teal-600 font-medium text-sm mb-4">
              <Plus size={16} className="mr-2" />
              Quick Actions
            </div>
            
            <nav className="space-y-1">
              <button 
                className="w-full flex items-center px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg"
              >
                <HelpCircle size={18} className="mr-3" />
                Overview
              </button>
              <button 
                className="w-full flex items-center px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg"
              >
                <Check size={18} className="mr-3" />
                Design Proofs
              </button>
              <div className="flex items-center px-3 py-2 text-sm text-teal-600 bg-teal-50 rounded-lg font-medium">
                <ImageIcon size={18} className="mr-3" />
                Galleries
              </div>
              <button 
                className="w-full flex items-center px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg"
              >
                <Mail size={18} className="mr-3" />
                Emails
              </button>
              <button 
                className="w-full flex items-center px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg"
              >
                <FileText size={18} className="mr-3" />
                Questionnaires
              </button>
              <button 
                className="w-full flex items-center px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg"
              >
                <FileText size={18} className="mr-3" />
                Contracts
              </button>
              <button 
                className="w-full flex items-center px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg"
              >
                <ShoppingCart size={18} className="mr-3" />
                Orders & Quotes
              </button>
              <button 
                className="w-full flex items-center px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg"
              >
                <Clipboard size={18} className="mr-3" />
                Credits & Coupons
              </button>
              <button 
                className="w-full flex items-center px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg"
              >
                <MessageSquare size={18} className="mr-3" />
                Clients & Contacts
              </button>
              <button 
                className="w-full flex items-center px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg"
              >
                <FileText size={18} className="mr-3" />
                Documents
              </button>
              <button 
                className="w-full flex items-center px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg"
              >
                <Calendar size={18} className="mr-3" />
                Dates & Tasks
              </button>
            </nav>
          </div>
        </div>
        
        {/* User Info at Bottom */}
        <div className="absolute bottom-0 left-0 w-full p-4 border-t border-gray-200 bg-white">
          <div className="text-xs text-gray-500 mb-2">Users</div>
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white text-xs font-medium">
              {gallery.clientName?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'NA'}
            </div>
            <button className="ml-2 w-6 h-6 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 hover:border-gray-400">
              <Plus size={12} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {/* Gallery Thumbnail */}
              <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100">
                {gallery.coverImage ? (
                  <img src={gallery.coverImage} alt={gallery.title} className="w-full h-full object-cover" />
                ) : images[0]?.thumbUrl ? (
                  <img src={images[0].thumbUrl} alt={gallery.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon size={24} className="text-gray-400" />
                  </div>
                )}
              </div>
              {/* Title */}
              <div>
                <h1 className="text-2xl font-semibold text-gray-900 flex items-center">
                  {gallery.title}
                  <button 
                    onClick={() => navigate(`/admin/galleries/${id}/edit`)}
                    className="ml-2 text-teal-500 hover:text-teal-600"
                  >
                    ✏️
                  </button>
                </h1>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <button className="flex items-center text-teal-600 hover:text-teal-700 text-sm">
                <HelpCircle size={16} className="mr-1" />
                Get Help
              </button>
              <button 
                onClick={() => navigate(`/admin/galleries/${id}/edit?step=upload`)}
                className="bg-teal-500 hover:bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-medium"
              >
                Upload Photos
              </button>
            </div>
          </div>
        </div>

        {/* Photo Grid Area */}
        <div className="flex-1 overflow-auto p-6">
          {/* Select All Bar */}
          <div className="flex items-center justify-between mb-4">
            <label className="flex items-center text-sm text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedImages.length === images.length && images.length > 0}
                onChange={toggleSelectAll}
                className="mr-2 rounded border-gray-300 text-teal-500 focus:ring-teal-500"
              />
              Select all
            </label>
            <button className="text-gray-400 hover:text-gray-600">
              <MoreVertical size={20} />
            </button>
          </div>

          {/* Photo Grid */}
          {images.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 bg-white rounded-lg border-2 border-dashed border-gray-300">
              <ImageIcon size={48} className="text-gray-400 mb-4" />
              <p className="text-gray-600 mb-4">No photos uploaded yet</p>
              <button 
                onClick={() => navigate(`/admin/galleries/${id}/edit?step=upload`)}
                className="bg-teal-500 hover:bg-teal-600 text-white px-4 py-2 rounded-lg"
              >
                Upload Photos
              </button>
            </div>
          ) : (
            <div className={`grid gap-2 ${
              thumbnailStyle === 'masonry' ? 'grid-cols-6 md:grid-cols-8 lg:grid-cols-10' :
              thumbnailStyle === 'grid' ? 'grid-cols-5 md:grid-cols-8 lg:grid-cols-10' :
              'grid-cols-4 md:grid-cols-6 lg:grid-cols-8'
            }`}>
              {images.map((image) => (
                <div 
                  key={image.id}
                  className={`relative aspect-square rounded overflow-hidden cursor-pointer group ${
                    selectedImages.includes(image.id) ? 'ring-2 ring-teal-500 ring-offset-2' : ''
                  }`}
                  onClick={() => toggleImageSelection(image.id)}
                >
                  <img 
                    src={image.thumbUrl || image.displayUrl} 
                    alt={image.filename}
                    className="w-full h-full object-cover"
                  />
                  {/* Selection overlay */}
                  <div className={`absolute inset-0 transition-opacity ${
                    selectedImages.includes(image.id) ? 'bg-teal-500/30' : 'bg-black/0 group-hover:bg-black/10'
                  }`}>
                    {selectedImages.includes(image.id) && (
                      <div className="absolute top-1 right-1 w-5 h-5 bg-teal-500 rounded-full flex items-center justify-center">
                        <Check size={12} className="text-white" />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Sidebar */}
      <div className="w-80 bg-white border-l border-gray-200 flex-shrink-0 overflow-y-auto">
        {/* Publish Controls */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-end space-x-2">
            <button 
              onClick={copyGalleryLink}
              className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600"
              title="Copy Link"
            >
              <Share2 size={18} />
            </button>
            <button 
              onClick={() => { const u = galleryPublicUrl(gallery?.slug); if (u) window.open(u, '_blank'); }}
              className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600"
              title="Preview"
            >
              <Eye size={18} />
            </button>
            <button 
              onClick={handlePublish}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                gallery.isPublic 
                  ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                  : 'bg-teal-500 text-white hover:bg-teal-600'
              }`}
            >
              {gallery.isPublic ? 'Unpublish' : 'Publish'}
            </button>
          </div>
        </div>

        {/* Settings Panel */}
        <div className="border-b border-gray-200">
          <button 
            onClick={() => setShowSettings(true)}
            className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-50"
          >
            <div className="flex items-center">
              <Settings size={18} className="mr-3 text-gray-500" />
              <span className="font-medium text-gray-900">SETTINGS</span>
            </div>
            <ChevronRight size={18} className="text-gray-400" />
          </button>
        </div>

        {/* Folders Panel */}
        <div className="border-b border-gray-200">
          <button 
            onClick={() => togglePanel('folders')}
            className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-50"
          >
            <div className="flex items-center">
              <FolderOpen size={18} className="mr-3 text-gray-500" />
              <span className="font-medium text-gray-900">FOLDERS</span>
            </div>
            <ChevronRight size={18} className={`text-gray-400 transition-transform ${expandedPanels.folders ? 'rotate-90' : ''}`} />
          </button>
          {expandedPanels.folders && (
            <div className="px-4 pb-4">
              <button className="text-teal-600 hover:text-teal-700 text-sm flex items-center">
                <Plus size={14} className="mr-1" />
                Add Folder
              </button>
            </div>
          )}
        </div>

        {/* Activity Feed Panel */}
        <div className="border-b border-gray-200">
          <button 
            onClick={() => togglePanel('activityFeed')}
            className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-50"
          >
            <div className="flex items-center">
              <MessageSquare size={18} className="mr-3 text-gray-500" />
              <span className="font-medium text-gray-900">ACTIVITY FEED</span>
            </div>
            <ChevronRight size={18} className={`text-gray-400 transition-transform ${expandedPanels.activityFeed ? 'rotate-90' : ''}`} />
          </button>
          {expandedPanels.activityFeed && (
            <div className="px-4 pb-4 space-y-3">
              {/* Views */}
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center text-gray-700">
                  <Eye size={16} className="mr-2 text-blue-500" />
                  <span>Views</span>
                </div>
                <span className="font-semibold text-gray-900">{viewCount}</span>
              </div>
              
              {/* Downloads */}
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center text-gray-700">
                  <Download size={16} className="mr-2 text-purple-500" />
                  <span>Downloads</span>
                </div>
                <span className="font-semibold text-gray-900">{downloadCount}</span>
              </div>
              
              {/* Email Addresses Entered */}
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center text-gray-700">
                  <Mail size={16} className="mr-2 text-green-500" />
                  <span>Email Addresses</span>
                </div>
                <span className="font-semibold text-gray-900">{uniqueVisitors}</span>
              </div>
              
              {uniqueVisitors > 0 && (
                <button
                  onClick={() => navigate(`/admin/email-campaigns?gallery=${id}`)}
                  className="w-full mt-2 px-3 py-1.5 text-xs bg-purple-50 text-purple-700 hover:bg-purple-100 rounded transition-colors"
                >
                  View Captured Emails →
                </button>
              )}
            </div>
          )}
        </div>

        {/* Notes Panel */}
        <div className="border-b border-gray-200">
          <button 
            onClick={() => togglePanel('notes')}
            className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-50"
          >
            <div className="flex items-center">
              <FileText size={18} className="mr-3 text-gray-500" />
              <span className="font-medium text-gray-900">NOTES</span>
            </div>
            <ChevronRight size={18} className={`text-gray-400 transition-transform ${expandedPanels.notes ? 'rotate-90' : ''}`} />
          </button>
          {expandedPanels.notes && (
            <div className="px-4 pb-4">
              <textarea 
                placeholder="Add a note..."
                className="w-full p-2 border border-gray-300 rounded text-sm resize-none"
                rows={3}
              />
            </div>
          )}
        </div>

        {/* Setup Assistant Panel */}
        <div className="border-b border-gray-200">
          <button 
            onClick={() => togglePanel('setupAssistant')}
            className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-50"
          >
            <div className="flex items-center">
              <Sparkles size={18} className="mr-3 text-teal-500" />
              <span className="font-medium text-gray-900">SETUP ASSISTANT</span>
              <span className="ml-2 text-sm text-gray-500">5 emails</span>
            </div>
            <ChevronRight size={18} className={`text-gray-400 transition-transform ${expandedPanels.setupAssistant ? 'rotate-90' : ''}`} />
          </button>
        </div>

        {/* Trash */}
        <div className="border-b border-gray-200">
          <button className="w-full px-4 py-3 flex items-center text-left hover:bg-gray-50">
            <Trash2 size={18} className="mr-3 text-red-500" />
            <span className="font-medium text-red-600">Trash</span>
          </button>
        </div>

        {/* Gallery Stats */}
        <div className="p-4 space-y-3 text-sm text-gray-600 border-t border-gray-200">
          {/* Live Status */}
          {publishedDate && gallery.isPublic && (
            <div className="flex items-center">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
              <span className="text-green-600 font-medium">Live on {publishedDate}</span>
            </div>
          )}
          {!gallery.isPublic && (
            <div className="flex items-center">
              <span className="w-2 h-2 bg-gray-400 rounded-full mr-2"></span>
              <span className="text-gray-500">Not published</span>
            </div>
          )}
          
          {/* Photos & Storage */}
          <div className="flex items-center">
            <ImageIcon size={14} className="mr-2 text-teal-500" />
            <span className="text-teal-600 font-medium">{photoCount} photos</span>
            <span className="mx-1 text-gray-400">/</span>
            <span className="text-teal-600 font-medium">{storageUsed} storage</span>
          </div>

          {/* Views & Visitors */}
          <div className="flex items-center">
            <Eye size={14} className="mr-2 text-blue-500" />
            <span>{viewCount} views</span>
            <span className="mx-1 text-gray-400">·</span>
            <span>{uniqueVisitors} visitors</span>
          </div>

          {/* Downloads */}
          <div className="flex items-center">
            <Download size={14} className="mr-2 text-purple-500" />
            <span>{downloadCount} downloads</span>
          </div>

          {/* Favorites */}
          {favoriteCount > 0 && (
            <div className="flex items-center">
              <Sparkles size={14} className="mr-2 text-amber-500" />
              <span>{favoriteCount} favorites</span>
            </div>
          )}

          {/* Last Activity */}
          {lastActivity && (
            <div className="flex items-center text-xs text-gray-400 pt-2 border-t border-gray-100">
              <Clock size={12} className="mr-2" />
              <span>Last activity: {lastActivity}</span>
            </div>
          )}
        </div>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex">
            {/* Settings Content */}
            <div className="flex-1 p-6 overflow-y-auto">
              {/* Gallery Type */}
              <div className="mb-8">
                <h3 className="text-sm font-medium text-gray-700 mb-4">Gallery Type</h3>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setGalleryType('proofing')}
                    className={`p-4 rounded-lg border-2 text-center ${
                      galleryType === 'proofing' 
                        ? 'border-teal-500 bg-teal-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Check size={24} className="mx-auto mb-2 text-gray-600" />
                    <div className="font-medium">Proofing Gallery</div>
                  </button>
                  <button
                    onClick={() => setGalleryType('virtual-ips')}
                    className={`p-4 rounded-lg border-2 text-center ${
                      galleryType === 'virtual-ips' 
                        ? 'border-teal-500 bg-teal-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Eye size={24} className="mx-auto mb-2 text-gray-600" />
                    <div className="font-medium">Virtual IPS</div>
                  </button>
                </div>
                <p className="text-sm text-gray-500 mt-2">Perfect for presenting photos and selling items.</p>
              </div>

              {/* Gallery Cover Preview - Desktop & Mobile */}
              <div className="mb-8">
                <div className="flex items-start justify-center gap-6 py-4 bg-gray-100 rounded-lg">
                  {/* Desktop Preview */}
                  <div className={`transition-all duration-300 ${previewDevice === 'mobile' ? 'opacity-40 scale-90' : 'opacity-100'}`}>
                    <div className="bg-gray-800 rounded-lg p-1 shadow-xl">
                      {/* Browser chrome */}
                      <div className="bg-gray-700 rounded-t px-3 py-1.5 flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-400"></div>
                        <div className="w-2.5 h-2.5 rounded-full bg-yellow-400"></div>
                        <div className="w-2.5 h-2.5 rounded-full bg-green-400"></div>
                        <div className="ml-3 bg-gray-600 rounded px-2 py-0.5 text-[8px] text-gray-300 flex-1 text-center truncate">
                          {galleryDisplayUrl(gallery?.slug)}
                        </div>
                      </div>
                      {/* Screen content */}
                      <div className="w-80 h-48 bg-gray-900 rounded-b overflow-hidden">
                        {coverView === 'cover' ? (
                          <div className="h-full flex items-center relative">
                            {(gallery.coverImage || images[0]?.displayUrl) && (
                              <img 
                                src={gallery.coverImage || images[0]?.displayUrl} 
                                alt="Cover" 
                                className="absolute inset-0 w-full h-full object-cover"
                              />
                            )}
                            <div className={`absolute inset-0 ${
                              selectedCoverTemplate.overlay === 'dark' ? 'bg-black/50' :
                              selectedCoverTemplate.overlay === 'gradient-bottom' ? 'bg-gradient-to-t from-black/70 to-transparent' :
                              selectedCoverTemplate.overlay === 'vignette' ? 'bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.4)_100%)]' :
                              'bg-black/30'
                            }`} />
                            <div className={`relative z-10 p-4 text-white ${
                              selectedCoverTemplate.textPosition === 'center' ? 'text-center mx-auto' :
                              selectedCoverTemplate.textPosition === 'bottom-left' ? 'absolute bottom-4 left-4' :
                              selectedCoverTemplate.textPosition === 'bottom-center' ? 'absolute bottom-4 left-0 right-0 text-center' :
                              ''
                            }`}>
                              <h2 className={`font-bold mb-2 ${
                                selectedCoverTemplate.titleSize === 'large' ? 'text-xl' :
                                selectedCoverTemplate.titleSize === 'xlarge' ? 'text-2xl' : 'text-lg'
                              } ${
                                selectedCoverTemplate.fontStyle === 'elegant' ? 'font-serif tracking-wide' :
                                selectedCoverTemplate.fontStyle === 'modern' ? 'font-sans tracking-tight' :
                                selectedCoverTemplate.fontStyle === 'script' ? 'font-serif italic' : ''
                              }`}>
                                {gallery.title.toUpperCase()}
                              </h2>
                              <button className="bg-white/20 hover:bg-white/30 backdrop-blur text-white px-3 py-1 rounded text-xs">
                                OPEN GALLERY
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="p-2 grid grid-cols-4 gap-1 h-full">
                            {images.slice(0, 8).map((img, i) => (
                              <div key={i} className="aspect-square rounded overflow-hidden">
                                <img src={img.thumbUrl} alt="" className="w-full h-full object-cover" />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <p className="text-center text-xs text-gray-500 mt-2">Desktop</p>
                  </div>

                  {/* Mobile Preview */}
                  <div className={`transition-all duration-300 ${previewDevice === 'desktop' ? 'opacity-40 scale-90' : 'opacity-100'}`}>
                    <div className="bg-gray-900 rounded-[24px] p-2 shadow-xl relative">
                      {/* Phone notch */}
                      <div className="absolute top-3 left-1/2 -translate-x-1/2 w-16 h-4 bg-black rounded-full z-10"></div>
                      {/* Screen */}
                      <div className="w-36 h-72 bg-gray-900 rounded-[18px] overflow-hidden border-2 border-gray-800">
                        {coverView === 'cover' ? (
                          <div className="h-full relative">
                            {(gallery.coverImage || images[0]?.displayUrl) && (
                              <img 
                                src={gallery.coverImage || images[0]?.displayUrl} 
                                alt="Cover" 
                                className="absolute inset-0 w-full h-full object-cover"
                              />
                            )}
                            <div className={`absolute inset-0 ${
                              selectedCoverTemplate.overlay === 'dark' ? 'bg-black/50' :
                              selectedCoverTemplate.overlay === 'gradient-bottom' ? 'bg-gradient-to-t from-black/70 to-transparent' :
                              'bg-black/30'
                            }`} />
                            <div className="absolute bottom-6 left-0 right-0 text-center z-10 px-2">
                              <h2 className="text-white font-bold text-sm mb-2 leading-tight">
                                {gallery.title.toUpperCase()}
                              </h2>
                              <button className="bg-white/20 backdrop-blur text-white px-2 py-1 rounded text-[8px]">
                                OPEN
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="p-1.5 grid grid-cols-2 gap-1 h-full">
                            {images.slice(0, 6).map((img, i) => (
                              <div key={i} className="aspect-square rounded overflow-hidden">
                                <img src={img.thumbUrl} alt="" className="w-full h-full object-cover" />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <p className="text-center text-xs text-gray-500 mt-2">Mobile</p>
                  </div>
                </div>
                
                {/* Cover/Thumbnails & Device Toggle */}
                <div className="flex justify-center mt-4 gap-4">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setCoverView('cover')}
                      className={`flex items-center px-4 py-2 rounded-lg text-sm ${
                        coverView === 'cover' 
                          ? 'bg-teal-100 text-teal-700' 
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      <ImageIcon size={16} className="mr-2" />
                      Cover
                    </button>
                    <button
                      onClick={() => setCoverView('thumbnails')}
                      className={`flex items-center px-4 py-2 rounded-lg text-sm ${
                        coverView === 'thumbnails' 
                          ? 'bg-teal-100 text-teal-700' 
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      <Grid3X3 size={16} className="mr-2" />
                      Thumbnails
                    </button>
                  </div>
                  <div className="border-l border-gray-300 pl-4 flex space-x-2">
                    <button
                      onClick={() => setPreviewDevice('desktop')}
                      className={`flex items-center px-3 py-2 rounded-lg text-sm ${
                        previewDevice === 'desktop' 
                          ? 'bg-teal-100 text-teal-700' 
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      <Monitor size={16} />
                    </button>
                    <button
                      onClick={() => setPreviewDevice('mobile')}
                      className={`flex items-center px-3 py-2 rounded-lg text-sm ${
                        previewDevice === 'mobile' 
                          ? 'bg-teal-100 text-teal-700' 
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      <Smartphone size={16} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Gallery Cover Selection */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-gray-700">Gallery Cover</h3>
                  <button 
                    onClick={() => setShowCoverDesigner(true)}
                    className="text-teal-600 hover:text-teal-700 text-sm font-medium flex items-center gap-1"
                  >
                    <Palette size={14} />
                    Design Cover
                  </button>
                </div>
                
                {/* Cover Template Categories */}
                <div className="flex gap-1 mb-3 flex-wrap">
                  {[
                    { id: 'all', label: 'All' },
                    { id: 'full-cover', label: 'Full' },
                    { id: 'split-layout', label: 'Split' },
                    { id: 'minimal', label: 'Minimal' },
                    { id: 'creative', label: 'Creative' }
                  ].map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => {
                        setCoverTemplateCategory(cat.id as typeof coverTemplateCategory);
                        setCoverTemplatePage(0);
                      }}
                      className={`px-2 py-1 text-xs rounded-full transition-colors ${
                        coverTemplateCategory === cat.id
                          ? 'bg-teal-500 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
                
                {/* Cover Templates Grid */}
                <div className="relative">
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setCoverTemplatePage(Math.max(0, coverTemplatePage - 1))}
                      disabled={coverTemplatePage === 0}
                      className="p-1.5 rounded-full bg-teal-500 text-white disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft size={14} />
                    </button>
                    
                    <div className="flex gap-2 overflow-hidden flex-1">
                      {/* No Cover option */}
                      <button
                        onClick={() => setSelectedCoverTemplate({ ...COVER_TEMPLATES[0], id: 'no-cover' } as CoverTemplate)}
                        className={`flex-shrink-0 w-20 h-14 rounded-lg border-2 border-dashed flex flex-col items-center justify-center transition-all ${
                          selectedCoverTemplate.id === 'no-cover' 
                            ? 'border-teal-500 bg-teal-50' 
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        <X size={12} className="text-gray-400" />
                        <span className="text-[9px] text-gray-500 mt-0.5">No Cover</span>
                      </button>
                      
                      {/* Templates */}
                      {(() => {
                        const filtered = coverTemplateCategory === 'all' 
                          ? COVER_TEMPLATES 
                          : COVER_TEMPLATES.filter(t => t.category === coverTemplateCategory);
                        const perPage = 4;
                        const visible = filtered.slice(coverTemplatePage * perPage, (coverTemplatePage + 1) * perPage);
                        
                        return visible.map(template => (
                          <button
                            key={template.id}
                            onClick={() => setSelectedCoverTemplate(template)}
                            className={`flex-shrink-0 w-20 h-14 rounded-lg overflow-hidden border-2 transition-all relative group ${
                              selectedCoverTemplate.id === template.id 
                                ? 'border-teal-500 ring-2 ring-teal-200' 
                                : 'border-gray-200 hover:border-teal-300'
                            }`}
                          >
                            {/* Mini preview */}
                            <div className="absolute inset-0 bg-gray-200">
                              {coverImages[0] && (
                                <img
                                  src={coverImages[0]}
                                  alt={template.name}
                                  className="w-full h-full object-cover"
                                  style={{ opacity: 0.7 }}
                                />
                              )}
                              {/* Overlay visualization */}
                              <div className={`absolute inset-0 ${
                                template.overlay === 'dark' ? 'bg-black/40' :
                                template.overlay === 'light' ? 'bg-white/30' :
                                template.overlay === 'gradient-bottom' ? 'bg-gradient-to-t from-black/60 to-transparent' :
                                template.overlay === 'gradient-top' ? 'bg-gradient-to-b from-black/60 to-transparent' :
                                template.overlay === 'vignette' ? 'bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.3)_100%)]' :
                                ''
                              }`} />
                              {/* Text position indicator */}
                              <div className={`absolute text-[6px] font-medium text-white drop-shadow ${
                                template.textPosition === 'center' ? 'inset-0 flex items-center justify-center' :
                                template.textPosition === 'bottom-center' ? 'bottom-1 left-0 right-0 text-center' :
                                template.textPosition === 'top-center' ? 'top-1 left-0 right-0 text-center' :
                                template.textPosition === 'bottom-left' ? 'bottom-1 left-1' :
                                template.textPosition === 'bottom-right' ? 'bottom-1 right-1' :
                                template.textPosition === 'top-left' ? 'top-1 left-1' :
                                'inset-0 flex items-center justify-center'
                              }`}>
                                TEXT
                              </div>
                            </div>
                            {/* Selection check */}
                            {selectedCoverTemplate.id === template.id && (
                              <div className="absolute top-0.5 right-0.5 w-3 h-3 bg-teal-500 rounded-full flex items-center justify-center">
                                <Check size={8} className="text-white" />
                              </div>
                            )}
                            {/* Name on hover */}
                            <div className="absolute inset-x-0 bottom-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity py-0.5">
                              <span className="text-[7px] text-white block text-center">{template.name}</span>
                            </div>
                          </button>
                        ));
                      })()}
                    </div>
                    
                    <button 
                      onClick={() => setCoverTemplatePage(coverTemplatePage + 1)}
                      disabled={(() => {
                        const filtered = coverTemplateCategory === 'all' 
                          ? COVER_TEMPLATES 
                          : COVER_TEMPLATES.filter(t => t.category === coverTemplateCategory);
                        return (coverTemplatePage + 1) * 4 >= filtered.length;
                      })()}
                      className="p-1.5 rounded-full bg-teal-500 text-white disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
                
                {/* Selected template info */}
                {selectedCoverTemplate.id !== 'no-cover' && (
                  <div className="mt-2 text-xs text-gray-500">
                    Selected: <span className="font-medium text-gray-700">{selectedCoverTemplate.name}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Settings Sidebar */}
            <div className="w-80 border-l border-gray-200 bg-gray-50 overflow-y-auto">
              <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                <button onClick={() => setShowSettings(false)} className="flex items-center text-red-500 hover:text-red-600">
                  <X size={18} />
                  <span className="ml-1">Close</span>
                </button>
                <span className="font-medium">Settings</span>
              </div>
              
              <nav className="p-2">
                {[
                  { id: 'design', label: 'DESIGN', icon: Sparkles },
                  { id: 'experience', label: 'EXPERIENCE', icon: Eye },
                  { id: 'availability', label: 'AVAILABILITY', icon: Clock },
                  { id: 'shopping', label: 'SHOPPING', icon: ShoppingCart },
                  { id: 'downloads', label: 'DOWNLOADS', icon: Download },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveSettingsTab(tab.id as SettingsTab)}
                    className={`w-full flex items-center px-4 py-3 rounded-lg text-left ${
                      activeSettingsTab === tab.id 
                        ? 'bg-teal-500 text-white' 
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <tab.icon size={18} className="mr-3" />
                    {tab.label}
                  </button>
                ))}
              </nav>

              {/* Design Settings */}
              {activeSettingsTab === 'design' && (
                <PreviewTab>
                <div className="p-4 space-y-6 border-t border-gray-200">
                  {/* Thumbnails Style */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Thumbnails</h4>
                    <div className="text-xs text-gray-500 mb-2">Style</div>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'masonry', icon: Grid2X2 },
                        { id: 'grid', icon: Grid3X3 },
                        { id: 'rows', icon: LayoutGrid },
                      ].map((style) => (
                        <button
                          key={style.id}
                          onClick={() => setThumbnailStyle(style.id as ThumbnailStyle)}
                          className={`p-3 rounded border ${
                            thumbnailStyle === style.id 
                              ? 'border-teal-500 bg-teal-50' 
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <style.icon size={20} className="mx-auto text-gray-600" />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Theme */}
                  <div>
                    <div className="text-xs text-gray-500 mb-2">Theme</div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setTheme('light')}
                        className={`p-3 rounded ${
                          theme === 'light' 
                            ? 'bg-teal-500 text-white' 
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        <Sun size={20} className="mx-auto" />
                      </button>
                      <button
                        onClick={() => setTheme('dark')}
                        className={`p-3 rounded ${
                          theme === 'dark' 
                            ? 'bg-teal-500 text-white' 
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        <Moon size={20} className="mx-auto" />
                      </button>
                    </div>
                  </div>

                  {/* Spacing */}
                  <div>
                    <div className="flex justify-between text-xs text-gray-500 mb-2">
                      <span>Spacing</span>
                      <span>{spacing}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={spacing}
                      onChange={(e) => setSpacing(parseInt(e.target.value))}
                      className="w-full accent-teal-500"
                    />
                  </div>

                  {/* Size */}
                  <div>
                    <div className="flex justify-between text-xs text-gray-500 mb-2">
                      <span>Size</span>
                      <span>{thumbnailSize}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={thumbnailSize}
                      onChange={(e) => setThumbnailSize(parseInt(e.target.value))}
                      className="w-full accent-teal-500"
                    />
                  </div>

                  {/* Show Filenames */}
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={showFilenames}
                      onChange={(e) => setShowFilenames(e.target.checked)}
                      className="mr-2 rounded border-gray-300 text-teal-500 focus:ring-teal-500"
                    />
                    <span className="text-sm text-gray-600">Show filenames on photos</span>
                  </label>

                  {/* Navigation */}
                  <div>
                    <div className="text-xs text-gray-500 mb-2">Navigation</div>
                    <div className="grid grid-cols-3 gap-2">
                      {['icons', 'text', 'both'].map((nav) => (
                        <button
                          key={nav}
                          onClick={() => setNavigationType(nav as NavigationType)}
                          className={`px-3 py-2 rounded text-xs font-medium ${
                            navigationType === nav 
                              ? 'bg-teal-500 text-white' 
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {nav.charAt(0).toUpperCase() + nav.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Show Brand Logo */}
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={showBrandLogo}
                      onChange={(e) => setShowBrandLogo(e.target.checked)}
                      className="mr-2 rounded border-gray-300 text-teal-500 focus:ring-teal-500"
                    />
                    <span className="text-sm text-gray-600">Show brand logo in header</span>
                  </label>

                  {/* Watermark */}
                  <div>
                    <div className="text-xs text-gray-500 mb-2">Watermark</div>
                    
                    {/* Selected Watermark Display */}
                    {selectedWatermark ? (
                      <div className="mb-3 p-3 bg-white border border-gray-200 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center">
                              <Droplet size={16} className="text-teal-500" />
                            </div>
                            <span className="text-sm font-medium text-gray-700">{selectedWatermark}</span>
                          </div>
                          <button 
                            onClick={() => setSelectedWatermark(null)}
                            className="text-gray-400 hover:text-red-500"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                    ) : null}

                    <button 
                      onClick={() => setShowWatermarkPicker(!showWatermarkPicker)}
                      className="w-full flex items-center justify-center px-4 py-2 border border-teal-500 text-teal-600 rounded-lg hover:bg-teal-50"
                    >
                      <Plus size={16} className="mr-2" />
                      Select a watermark
                    </button>

                    {/* Watermark Picker Dropdown */}
                    {showWatermarkPicker && (
                      <div className="mt-2 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                        {/* NAF Templates Header */}
                        <div className="bg-teal-500 text-white px-4 py-2 text-sm font-medium">
                          NAF templates
                        </div>
                        
                        {/* Watermark Options */}
                        <div className="divide-y divide-gray-100">
                          <button
                            onClick={() => {
                              setSelectedWatermark('NAF watermark');
                              setShowWatermarkPicker(false);
                            }}
                            className="w-full px-4 py-3 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                          >
                            <Droplet size={14} className="text-gray-400" />
                            NAF watermark
                          </button>
                          <button
                            onClick={() => {
                              setSelectedWatermark('NAF watermark (invisible)');
                              setShowWatermarkPicker(false);
                            }}
                            className="w-full px-4 py-3 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                          >
                            <Shield size={14} className="text-gray-400" />
                            NAF watermark (invisible)
                          </button>
                        </div>

                        {/* Add New / Cancel */}
                        <div className="border-t border-gray-200 divide-y divide-gray-100">
                          <button
                            onClick={() => {
                              // TODO: Open watermark upload modal
                              setShowWatermarkPicker(false);
                            }}
                            className="w-full px-4 py-3 text-left text-sm text-teal-600 hover:bg-teal-50 flex items-center gap-2"
                          >
                            <Plus size={14} className="text-teal-500" />
                            Add New
                          </button>
                          <button
                            onClick={() => setShowWatermarkPicker(false)}
                            className="w-full px-4 py-3 text-left text-sm text-red-500 hover:bg-red-50 flex items-center gap-2"
                          >
                            <X size={14} className="text-red-400" />
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Watermark Settings (shown when watermark selected) */}
                    {selectedWatermark && (
                      <div className="mt-4 space-y-4">
                        {/* Visible Watermark Toggle */}
                        <div className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg">
                          <div className="flex items-center gap-2">
                            <Droplet size={16} className="text-teal-500" />
                            <div>
                              <div className="text-sm font-medium text-gray-700">Visible Watermark</div>
                              <div className="text-xs text-gray-500">Shows logo on images</div>
                            </div>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={visibleWatermarkEnabled}
                              onChange={(e) => setVisibleWatermarkEnabled(e.target.checked)}
                              className="sr-only peer" 
                            />
                            <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-teal-500"></div>
                          </label>
                        </div>

                        {/* Invisible Watermark Toggle */}
                        <div className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg">
                          <div className="flex items-center gap-2">
                            <Shield size={16} className="text-amber-500" />
                            <div>
                              <div className="text-sm font-medium text-gray-700">Invisible Watermark</div>
                              <div className="text-xs text-gray-500">Hidden data in pixels (AI-resistant)</div>
                            </div>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={invisibleWatermarkEnabled}
                              onChange={(e) => setInvisibleWatermarkEnabled(e.target.checked)}
                              className="sr-only peer" 
                            />
                            <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                          </label>
                        </div>

                        {/* Pattern Watermark Toggle */}
                        <div className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg">
                          <div className="flex items-center gap-2">
                            <LayoutGrid size={16} className="text-purple-500" />
                            <div>
                              <div className="text-sm font-medium text-gray-700">Pattern Overlay</div>
                              <div className="text-xs text-gray-500">Tiles across image (hard to remove)</div>
                            </div>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={patternWatermarkEnabled}
                              onChange={(e) => setPatternWatermarkEnabled(e.target.checked)}
                              className="sr-only peer" 
                            />
                            <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-500"></div>
                          </label>
                        </div>

                        {/* Position */}
                        <div>
                          <div className="text-xs text-gray-500 mb-2">Position</div>
                          <div className="grid grid-cols-3 gap-1">
                            {[
                              { id: 'corner', label: 'Corner' },
                              { id: 'center', label: 'Center' },
                              { id: 'tile', label: 'Tile' }
                            ].map((pos) => (
                              <button
                                key={pos.id}
                                onClick={() => setWatermarkPosition(pos.id as typeof watermarkPosition)}
                                className={`px-2 py-1.5 rounded text-xs font-medium ${
                                  watermarkPosition === pos.id
                                    ? 'bg-teal-500 text-white'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                              >
                                {pos.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Opacity (only for visible watermark) */}
                        {visibleWatermarkEnabled && (
                          <div>
                            <div className="flex justify-between text-xs text-gray-500 mb-2">
                              <span>Visible Opacity</span>
                              <span>{watermarkOpacity}%</span>
                            </div>
                            <input
                              type="range"
                              min="10"
                              max="100"
                              value={watermarkOpacity}
                              onChange={(e) => setWatermarkOpacity(parseInt(e.target.value))}
                              className="w-full accent-teal-500"
                            />
                          </div>
                        )}

                        {/* AI Protection Status */}
                        {(visibleWatermarkEnabled && invisibleWatermarkEnabled) ? (
                          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                            <div className="flex items-start gap-2">
                              <Shield size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
                              <div className="text-xs text-green-800">
                                <strong>Maximum Protection:</strong> Both visible and invisible watermarks enabled. Even if AI removes the visible mark, the invisible data proves ownership.
                              </div>
                            </div>
                          </div>
                        ) : invisibleWatermarkEnabled ? (
                          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                            <div className="flex items-start gap-2">
                              <Shield size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
                              <div className="text-xs text-amber-800">
                                <strong>Invisible Protection:</strong> Hidden watermark data embedded. Consider adding visible mark for deterrence.
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                            <div className="flex items-start gap-2">
                              <Info size={16} className="text-gray-500 mt-0.5 flex-shrink-0" />
                              <div className="text-xs text-gray-600">
                                <strong>Tip:</strong> Enable invisible watermark for best AI-removal protection.
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                </PreviewTab>
              )}

              {/* Experience Settings - Full Featured */}
              {activeSettingsTab === 'experience' && (
                <PreviewTab>
                <div className="p-4 space-y-6 border-t border-gray-200">
                  {/* User flow header */}
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">User flow</div>
                  
                  {/* Welcome Message */}
                  <div>
                    <div className="text-xs text-gray-500 mb-2">Welcome message</div>
                    <div className="flex items-center bg-white border border-gray-300 rounded-lg px-3 py-2">
                      <Mail size={16} className="text-gray-400 mr-2" />
                      <input
                        type="text"
                        value={welcomeMessage}
                        onChange={(e) => setWelcomeMessage(e.target.value)}
                        placeholder="Gallery welcome message"
                        className="flex-1 text-sm border-none focus:ring-0 p-0"
                      />
                      {welcomeMessage && (
                        <button onClick={() => setWelcomeMessage('')} className="text-red-400 hover:text-red-500">
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Slideshow */}
                  <div className="border-t border-gray-200 pt-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-medium text-gray-700">Slideshow</h4>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={slideshowEnabled}
                          onChange={(e) => setSlideshowEnabled(e.target.checked)}
                          className="sr-only peer" 
                        />
                        <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-teal-500"></div>
                        <span className="ms-2 text-xs text-gray-500">{slideshowEnabled ? 'On' : 'Off'}</span>
                      </label>
                    </div>
                    <p className="text-xs text-gray-500 mb-3">
                      Add a slideshow of <span className="text-teal-600 cursor-pointer">all photos</span> or a <span className="text-teal-600 cursor-pointer">specific folder of photos</span>.
                    </p>
                    
                    {slideshowEnabled && (
                      <>
                        <div className="mb-3">
                          <div className="text-xs text-gray-500 mb-2">Show the slideshow...</div>
                          <div className="grid grid-cols-3 gap-2">
                            {[
                              { id: 'pre-gallery', label: 'Pre-gallery' },
                              { id: 'nav-button', label: 'Nav button' },
                              { id: 'both', label: 'Both' },
                            ].map((opt) => (
                              <button
                                key={opt.id}
                                onClick={() => setSlideshowLocation(opt.id as typeof slideshowLocation)}
                                className={`px-2 py-2 rounded-lg text-xs ${
                                  slideshowLocation === opt.id 
                                    ? 'bg-teal-500 text-white' 
                                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                                }`}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </div>
                        
                        <div>
                          <div className="text-xs text-gray-500 mb-2">Slideshow style</div>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              onClick={() => setSlideshowStyle('simple')}
                              className={`px-3 py-2 rounded-lg text-xs ${
                                slideshowStyle === 'simple' 
                                  ? 'bg-teal-500 text-white' 
                                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                              }`}
                            >
                              Simple
                            </button>
                            <button
                              onClick={() => setSlideshowStyle('ken-burns')}
                              className={`px-3 py-2 rounded-lg text-xs ${
                                slideshowStyle === 'ken-burns' 
                                  ? 'bg-teal-500 text-white' 
                                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                              }`}
                            >
                              Ken Burns Effect
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Video */}
                  <div className="border-t border-gray-200 pt-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-medium text-gray-700">Video</h4>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={videoEnabled}
                          onChange={(e) => setVideoEnabled(e.target.checked)}
                          className="sr-only peer" 
                        />
                        <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-teal-500"></div>
                        <span className="ms-2 text-xs text-gray-500">{videoEnabled ? 'On' : 'Off'}</span>
                      </label>
                    </div>
                    <p className="text-xs text-gray-500 mb-3">
                      Add a <span className="text-teal-600 cursor-pointer">Youtube</span> or <span className="text-teal-600 cursor-pointer">Vimeo video</span> to your gallery.
                    </p>
                    
                    {videoEnabled && (
                      <>
                        <div className="mb-3">
                          <div className="text-xs text-gray-500 mb-2">Show the video...</div>
                          <div className="grid grid-cols-3 gap-2">
                            {[
                              { id: 'pre-gallery', label: 'Pre-gallery' },
                              { id: 'nav-button', label: 'Nav button' },
                              { id: 'both', label: 'Both' },
                            ].map((opt) => (
                              <button
                                key={opt.id}
                                onClick={() => setVideoLocation(opt.id as typeof videoLocation)}
                                className={`px-2 py-2 rounded-lg text-xs ${
                                  videoLocation === opt.id 
                                    ? 'bg-teal-500 text-white' 
                                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                                }`}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </div>
                        
                        <div>
                          <div className="text-xs text-gray-500 mb-2">YouTube/Vimeo link</div>
                          <input
                            type="text"
                            value={videoUrl}
                            onChange={(e) => setVideoUrl(e.target.value)}
                            placeholder="https://www.youtube.com"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-teal-500 focus:border-teal-500"
                          />
                        </div>
                      </>
                    )}
                  </div>

                  {/* Register to view */}
                  <div className="border-t border-gray-200 pt-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-medium text-gray-700">Register to view</h4>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={registerToView}
                          onChange={(e) => setRegisterToView(e.target.checked)}
                          className="sr-only peer" 
                        />
                        <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-teal-500"></div>
                        <span className="ms-2 text-xs text-gray-500">{registerToView ? 'Yes' : 'No'}</span>
                      </label>
                    </div>
                    <p className="text-xs text-gray-500 mb-3">
                      Visitors must enter their personal details, like <span className="text-teal-600">email</span> or <span className="text-teal-600">name</span>, before viewing the gallery.
                    </p>
                    
                    {registerToView && (
                      <div>
                        <div className="text-xs text-gray-500 mb-2">Require...</div>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => setRegisterRequirement('email')}
                            className={`px-3 py-2 rounded-lg text-xs ${
                              registerRequirement === 'email' 
                                ? 'bg-teal-500 text-white' 
                                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                            }`}
                          >
                            Email only
                          </button>
                          <button
                            onClick={() => setRegisterRequirement('email-name')}
                            className={`px-3 py-2 rounded-lg text-xs ${
                              registerRequirement === 'email-name' 
                                ? 'bg-teal-500 text-white' 
                                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                            }`}
                          >
                            Email and Name
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                </PreviewTab>
              )}

              {/* Availability Settings - Full Featured */}
              {activeSettingsTab === 'availability' && (
                <div className="p-4 space-y-6 border-t border-gray-200">
                  {/* Gallery Link */}
                  <div>
                    <h4 className="text-xs text-gray-500 mb-2">Link</h4>
                    <div className="flex items-center bg-white border border-gray-300 rounded-lg px-3 py-2">
                      <input
                        type="text"
                        value={galleryPublicUrl(gallery?.slug, { absolute: true }) || ''}
                        readOnly
                        className="flex-1 text-xs text-gray-600 border-none focus:ring-0 p-0 bg-transparent"
                      />
                      <button 
                        onClick={copyGalleryLink}
                        className="text-gray-400 hover:text-teal-500 ml-2"
                        title="Copy link"
                      >
                        <Copy size={14} />
                      </button>
                      <button className="text-gray-400 hover:text-teal-500 ml-2" title="Edit link">
                        <Edit2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Attached to */}
                  <div>
                    <h4 className="text-xs text-gray-500 mb-2">Attached to</h4>
                    {attachedShoot ? (
                      <div className="flex items-center bg-white border border-gray-300 rounded-lg px-3 py-2">
                        <ImageIcon size={14} className="text-gray-400 mr-2" />
                        <span className="flex-1 text-sm text-gray-700">{attachedShoot}</span>
                        <button 
                          onClick={() => setAttachedShoot('')}
                          className="text-red-400 hover:text-red-500"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <button className="w-full text-left px-3 py-2 border border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-teal-500 hover:text-teal-600">
                        + Attach to a shoot
                      </button>
                    )}
                  </div>

                  {/* Restrict Access */}
                  <div className="border-t border-gray-200 pt-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-medium text-gray-700">Restrict access</h4>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={restrictAccess}
                          onChange={(e) => setRestrictAccess(e.target.checked)}
                          className="sr-only peer" 
                        />
                        <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-teal-500"></div>
                        <span className="ms-2 text-xs text-gray-500">{restrictAccess ? 'Yes' : 'No'}</span>
                      </label>
                    </div>
                    <div className="flex items-start bg-gray-50 rounded-lg p-3">
                      <HelpCircle size={16} className="text-gray-400 mr-2 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-gray-500">
                        Give access only to your <span className="text-teal-600">logged in client</span> or optionally add a <span className="text-teal-600">password</span> for visitors who aren't logged in.
                      </p>
                    </div>
                  </div>

                  {/* Expiration */}
                  <div className="border-t border-gray-200 pt-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-medium text-gray-700">Expiration</h4>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={expirationEnabled}
                          onChange={(e) => setExpirationEnabled(e.target.checked)}
                          className="sr-only peer" 
                        />
                        <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-teal-500"></div>
                        <span className="ms-2 text-xs text-gray-500">{expirationEnabled ? 'Yes' : 'No'}</span>
                      </label>
                    </div>
                    <p className="text-xs text-gray-500 mb-2">Specify if the gallery expires, and when.</p>
                    {expirationEnabled && (
                      <input
                        type="date"
                        value={expirationDate}
                        onChange={(e) => setExpirationDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-teal-500 focus:border-teal-500"
                      />
                    )}
                  </div>

                  {/* Placeholder */}
                  <div className="border-t border-gray-200 pt-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-medium text-gray-700">Placeholder</h4>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={placeholderEnabled}
                          onChange={(e) => setPlaceholderEnabled(e.target.checked)}
                          className="sr-only peer" 
                        />
                        <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-teal-500"></div>
                        <span className="ms-2 text-xs text-gray-500">{placeholderEnabled ? 'Yes' : 'No'}</span>
                      </label>
                    </div>
                    <p className="text-xs text-gray-500">A placeholder gallery allows you to collect email addresses to notify once photos are available.</p>
                  </div>

                  {/* Include on Catalog */}
                  <div className="border-t border-gray-200 pt-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-medium text-gray-700">Include on catalog</h4>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={includeOnCatalog}
                          onChange={(e) => setIncludeOnCatalog(e.target.checked)}
                          className="sr-only peer" 
                        />
                        <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-teal-500"></div>
                        <span className="ms-2 text-xs text-gray-500">{includeOnCatalog ? 'Yes' : 'No'}</span>
                      </label>
                    </div>
                    <p className="text-xs text-gray-500">Include this gallery on your brand gallery catalog page.</p>
                  </div>
                  {/* The five controls above are the only ones on this page with a
                      column behind them, so this is the only Save it can honestly offer. */}
                  <div className="pt-4 border-t border-gray-200">
                    <button
                      onClick={saveSettings}
                      disabled={savingSettings}
                      className="w-full px-4 py-2 bg-teal-500 hover:bg-teal-600 disabled:bg-gray-300 text-white rounded-lg text-sm font-medium"
                    >
                      {savingSettings ? 'Saving…' : settingsSaved ? 'Saved' : 'Save settings'}
                    </button>
                    {settingsError && (
                      <p className="mt-2 text-xs text-red-600">{settingsError}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Shopping Settings - Full Featured */}
              {activeSettingsTab === 'shopping' && (
                <PreviewTab>
                <div className="p-4 space-y-6 border-t border-gray-200">
                  {/* Pricing header */}
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Pricing</div>
                  
                  {/* Price List */}
                  <div>
                    <div className="text-xs text-gray-500 mb-2">Price list</div>
                    <div className="flex items-center bg-white border border-gray-300 rounded-lg px-3 py-2">
                      <span className="flex-1 text-sm text-gray-700">{priceList}</span>
                      <button className="text-red-400 hover:text-red-500">
                        <X size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Tax */}
                  <div>
                    <div className="text-xs text-gray-500 mb-2">Tax</div>
                    <div className="flex items-center bg-white border border-gray-300 rounded-lg px-3 py-2">
                      <span className="flex-1 text-sm text-gray-700">{taxSetting}</span>
                      <button className="text-red-400 hover:text-red-500">
                        <X size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Payment Methods */}
                  <div>
                    <div className="text-xs text-gray-500 mb-2">Payment methods</div>
                    <div className="flex items-center bg-white border border-gray-300 rounded-lg px-3 py-2">
                      <span className="flex-1 text-sm text-gray-500">{paymentMethods} methods selected</span>
                      <button className="text-gray-400 hover:text-teal-500">
                        <Edit2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Shipping Methods */}
                  <div>
                    <div className="text-xs text-gray-500 mb-2">Shipping Methods</div>
                    <div className="flex items-center bg-white border border-gray-300 rounded-lg px-3 py-2">
                      <span className="flex-1 text-sm text-gray-500">{shippingMethods} method selected</span>
                      <button className="text-gray-400 hover:text-teal-500">
                        <Edit2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Allow Coupons */}
                  <div className="border-t border-gray-200 pt-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-medium text-gray-700">Allow coupons</h4>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={allowCoupons}
                          onChange={(e) => setAllowCoupons(e.target.checked)}
                          className="sr-only peer" 
                        />
                        <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-teal-500"></div>
                        <span className="ms-2 text-xs text-gray-500">{allowCoupons ? 'Yes' : 'No'}</span>
                      </label>
                    </div>
                    <p className="text-xs text-gray-500">Show or hide the coupon box when gallery visitors are purchasing items and checking out in your gallery.</p>
                  </div>

                  {/* Allow Quick Buy */}
                  <div className="border-t border-gray-200 pt-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-medium text-gray-700">Allow quick buy</h4>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={allowQuickBuy}
                          onChange={(e) => setAllowQuickBuy(e.target.checked)}
                          className="sr-only peer" 
                        />
                        <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-teal-500"></div>
                        <span className="ms-2 text-xs text-gray-500">{allowQuickBuy ? 'No' : 'No'}</span>
                      </label>
                    </div>
                    <p className="text-xs text-gray-500">
                      Allows gallery visitors to optionally skip the Shop and make purchases from the Quick Buy menu by clicking the <span className="text-teal-600 font-medium">Order</span> button on a single photo.
                    </p>
                  </div>

                  {/* Prodigi Integration Info */}
                  <div className="border-t border-gray-200 pt-4">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <div className="flex items-start gap-2">
                        <Truck size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
                        <div className="text-xs text-green-800">
                          <strong>Prodigi Connected:</strong> Print orders are automatically fulfilled through Prodigi API with worldwide shipping.
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Minimum Order Info */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <h5 className="text-sm font-medium text-blue-800 mb-1">Looking to set a minimum order?</h5>
                    <p className="text-xs text-blue-600">
                      Minimum order amount can be found in each of your <span className="text-blue-700 underline cursor-pointer">price lists</span> and applies to all galleries using that price list.
                    </p>
                  </div>
                </div>
                </PreviewTab>
              )}

              {/* Downloads Settings - Full Featured */}
              {activeSettingsTab === 'downloads' && (
                <div className="p-4 space-y-6 border-t border-gray-200">
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Download permissions</h4>
                    <p className="text-xs text-gray-500 mb-4">Specify who can download photos from the gallery, and what size photos they should receive.</p>
                  </div>

                  {/* Gallery Visitor */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Eye size={16} className="text-gray-400 mr-2" />
                        <span className="text-sm text-gray-700">Gallery visitor</span>
                      </div>
                      <div className="relative">
                        <button
                          onClick={() => {
                            setShowVisitorPresetPicker(!showVisitorPresetPicker);
                            setShowClientPresetPicker(false);
                          }}
                          className="px-3 py-1.5 border border-teal-500 rounded-lg text-xs text-teal-600 bg-white hover:bg-teal-50 flex items-center gap-2 min-w-[180px] justify-between"
                        >
                          <span>{
                            visitorDownloadResolution === 'original' ? 'Original Resolution download' :
                            visitorDownloadResolution === 'high' ? 'High Resolution (3000px)' :
                            visitorDownloadResolution === 'medium' ? 'Medium Resolution (2000px)' :
                            visitorDownloadResolution === 'web' ? 'Web Resolution (1200px)' :
                            visitorDownloadResolution === 'low' ? 'Low Resolution (800px)' :
                            'Not Allowed'
                          }</span>
                          <ChevronDown size={14} />
                        </button>
                        
                        {showVisitorPresetPicker && (
                          <div className="absolute right-0 top-full mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden">
                            <div className="bg-gray-100 px-4 py-2 text-xs font-medium text-gray-500 uppercase">Download Preset</div>
                            <div className="divide-y divide-gray-100">
                              {[
                                { id: 'none', label: 'Not Allowed' },
                                { id: 'original', label: 'Original Resolution' },
                                { id: 'high', label: 'High Resolution (3000px)' },
                                { id: 'medium', label: 'Medium Resolution (2000px)' },
                                { id: 'web', label: 'Web Resolution (1200px)' },
                                { id: 'low', label: 'Low Resolution (800px)' },
                              ].map((preset) => (
                                <button
                                  key={preset.id}
                                  onClick={() => {
                                    setVisitorDownloadResolution(preset.id);
                                    setShowVisitorPresetPicker(false);
                                  }}
                                  className={`w-full px-4 py-2.5 text-left text-sm flex items-center justify-between hover:bg-gray-50 ${
                                    visitorDownloadResolution === preset.id ? 'bg-teal-50 text-teal-700' : 'text-gray-700'
                                  }`}
                                >
                                  {preset.label}
                                  {visitorDownloadResolution === preset.id && <Check size={14} className="text-teal-500" />}
                                </button>
                              ))}
                            </div>
                            <div className="border-t border-gray-200">
                              <button className="w-full px-4 py-2.5 text-left text-sm text-teal-600 hover:bg-teal-50 flex items-center gap-2">
                                <Plus size={14} /> Add New
                              </button>
                              <button 
                                onClick={() => setShowVisitorPresetPicker(false)}
                                className="w-full px-4 py-2.5 text-left text-sm text-red-500 hover:bg-red-50 flex items-center gap-2"
                              >
                                <X size={14} /> Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Logged-in Client */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Lock size={16} className="text-gray-400 mr-2" />
                        <span className="text-sm text-gray-700">Logged-in client</span>
                      </div>
                      <div className="relative">
                        <button
                          onClick={() => {
                            setShowClientPresetPicker(!showClientPresetPicker);
                            setShowVisitorPresetPicker(false);
                          }}
                          className="px-3 py-1.5 border border-teal-500 rounded-lg text-xs text-teal-600 bg-white hover:bg-teal-50 flex items-center gap-2 min-w-[180px] justify-between"
                        >
                          <span>{
                            clientDownloadResolution === 'original' ? 'Original Resolution download' :
                            clientDownloadResolution === 'high' ? 'High Resolution (3000px)' :
                            clientDownloadResolution === 'medium' ? 'Medium Resolution (2000px)' :
                            clientDownloadResolution === 'web' ? 'Web Resolution (1200px)' :
                            clientDownloadResolution === 'low' ? 'Low Resolution (800px)' :
                            'Not Allowed'
                          }</span>
                          <ChevronDown size={14} />
                        </button>
                        
                        {showClientPresetPicker && (
                          <div className="absolute right-0 top-full mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden">
                            <div className="bg-gray-100 px-4 py-2 text-xs font-medium text-gray-500 uppercase">Download Preset</div>
                            <div className="divide-y divide-gray-100">
                              {[
                                { id: 'none', label: 'Not Allowed' },
                                { id: 'original', label: 'Original Resolution' },
                                { id: 'high', label: 'High Resolution (3000px)' },
                                { id: 'medium', label: 'Medium Resolution (2000px)' },
                                { id: 'web', label: 'Web Resolution (1200px)' },
                                { id: 'low', label: 'Low Resolution (800px)' },
                              ].map((preset) => (
                                <button
                                  key={preset.id}
                                  onClick={() => {
                                    setClientDownloadResolution(preset.id);
                                    setShowClientPresetPicker(false);
                                  }}
                                  className={`w-full px-4 py-2.5 text-left text-sm flex items-center justify-between hover:bg-gray-50 ${
                                    clientDownloadResolution === preset.id ? 'bg-teal-50 text-teal-700' : 'text-gray-700'
                                  }`}
                                >
                                  {preset.label}
                                  {clientDownloadResolution === preset.id && <Check size={14} className="text-teal-500" />}
                                </button>
                              ))}
                            </div>
                            <div className="border-t border-gray-200">
                              <button className="w-full px-4 py-2.5 text-left text-sm text-teal-600 hover:bg-teal-50 flex items-center gap-2">
                                <Plus size={14} /> Add New
                              </button>
                              <button 
                                onClick={() => setShowClientPresetPicker(false)}
                                className="w-full px-4 py-2.5 text-left text-sm text-red-500 hover:bg-red-50 flex items-center gap-2"
                              >
                                <X size={14} /> Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* New Password-Protected Download */}
                  <button className="w-full flex items-center justify-center px-4 py-2 border border-teal-500 text-teal-600 rounded-lg hover:bg-teal-50">
                    <Plus size={16} className="mr-2" />
                    New password-protected download
                  </button>

                  {/* Show Advanced Settings */}
                  <button 
                    onClick={() => setShowAdvancedDownloads(!showAdvancedDownloads)}
                    className="text-teal-600 hover:text-teal-700 text-sm flex items-center gap-1"
                  >
                    {showAdvancedDownloads ? 'Hide' : 'Show'} advanced settings 
                    <ChevronRight size={14} className={`transition-transform ${showAdvancedDownloads ? 'rotate-90' : ''}`} />
                  </button>

                  {showAdvancedDownloads && (
                    <div className="space-y-4 pt-4 border-t border-gray-200">
                      <label className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Allow downloading individual photos</span>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={allowIndividualDownload}
                            onChange={(e) => setAllowIndividualDownload(e.target.checked)}
                            className="sr-only peer" 
                          />
                          <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-teal-500"></div>
                        </label>
                      </label>
                      <label className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Allow downloading all photos as ZIP</span>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={allowZipDownload}
                            onChange={(e) => setAllowZipDownload(e.target.checked)}
                            className="sr-only peer" 
                          />
                          <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-teal-500"></div>
                        </label>
                      </label>
                      <label className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Require email before download</span>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={requireEmailBeforeDownload}
                            onChange={(e) => setRequireEmailBeforeDownload(e.target.checked)}
                            className="sr-only peer" 
                          />
                          <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-teal-500"></div>
                        </label>
                      </label>
                      <label className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Add watermark to downloads</span>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={addWatermarkToDownloads}
                            onChange={(e) => setAddWatermarkToDownloads(e.target.checked)}
                            className="sr-only peer" 
                          />
                          <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-teal-500"></div>
                        </label>
                      </label>
                    </div>
                  )}
                  {/* The five controls above are the only ones on this page with a
                      column behind them, so this is the only Save it can honestly offer. */}
                  <div className="pt-4 border-t border-gray-200">
                    <button
                      onClick={saveSettings}
                      disabled={savingSettings}
                      className="w-full px-4 py-2 bg-teal-500 hover:bg-teal-600 disabled:bg-gray-300 text-white rounded-lg text-sm font-medium"
                    >
                      {savingSettings ? 'Saving…' : settingsSaved ? 'Saved' : 'Save settings'}
                    </button>
                    {settingsError && (
                      <p className="mt-2 text-xs text-red-600">{settingsError}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GalleryDetailPage;