import React, { useState, useEffect, useRef } from 'react';
import {
  getTextPositionClasses,
  getOverlayClasses,
  getTitleSizeClasses,
  getFontStyleClasses,
  getButtonClasses,
  getImageContainerStyle,
} from '../../lib/coverTemplateStyles';
import { Monitor, Smartphone, ZoomIn, ZoomOut, Move, Check, X, RotateCcw, RotateCw, ChevronLeft, ChevronRight, Grid, Type } from 'lucide-react';
import GalleryCover from './GalleryCover';
import { SITE } from '../../config/site';

// Cover template definitions
export interface CoverTemplate {
  id: string;
  name: string;
  thumbnail: string;
  category: 'full-cover' | 'split-layout' | 'minimal' | 'creative' | 'collage';
  textPosition: 'top-left' | 'top-center' | 'top-right' | 'center' | 'bottom-left' | 'bottom-center' | 'bottom-right' | 'left-center' | 'right-center';
  textAlignment: 'left' | 'center' | 'right';
  overlay: 'none' | 'dark' | 'light' | 'gradient-bottom' | 'gradient-top' | 'gradient-left' | 'gradient-right' | 'vignette' | 'cinematic';
  titleSize: 'small' | 'medium' | 'large' | 'xlarge' | 'xxlarge';
  showSubtitle: boolean;
  showButton: boolean;
  buttonStyle: 'solid' | 'outline' | 'pill' | 'minimal' | 'arrow';
  fontStyle: 'modern' | 'elegant' | 'bold' | 'minimal' | 'script' | 'vintage' | 'geometric';
  imageStyle: 'full' | 'left-half' | 'right-half' | 'top-half' | 'bottom-half' | 'inset' | 'portrait-left' | 'portrait-right' | 'circle-center' | 'diagonal';
  accentColor?: string;
  borderStyle?: 'none' | 'thin' | 'thick' | 'double';
}

// Extensive library of cover templates organized by category
const COVER_TEMPLATES: CoverTemplate[] = [
  // === FULL COVER DESIGNS ===
  {
    id: 'classic-center',
    name: 'Classic Center',
    thumbnail: 'center',
    category: 'full-cover',
    textPosition: 'center',
    textAlignment: 'center',
    overlay: 'dark',
    titleSize: 'large',
    showSubtitle: true,
    showButton: true,
    buttonStyle: 'outline',
    fontStyle: 'elegant',
    imageStyle: 'full'
  },
  {
    id: 'cinematic',
    name: 'Cinematic',
    thumbnail: 'cinematic',
    category: 'full-cover',
    textPosition: 'bottom-left',
    textAlignment: 'left',
    overlay: 'cinematic',
    titleSize: 'xxlarge',
    showSubtitle: true,
    showButton: false,
    buttonStyle: 'minimal',
    fontStyle: 'bold',
    imageStyle: 'full'
  },
  {
    id: 'elegant-vignette',
    name: 'Elegant Vignette',
    thumbnail: 'vignette',
    category: 'full-cover',
    textPosition: 'center',
    textAlignment: 'center',
    overlay: 'vignette',
    titleSize: 'xlarge',
    showSubtitle: true,
    showButton: true,
    buttonStyle: 'outline',
    fontStyle: 'script',
    imageStyle: 'full'
  },
  {
    id: 'modern-bottom',
    name: 'Modern Bottom',
    thumbnail: 'bottom',
    category: 'full-cover',
    textPosition: 'bottom-center',
    textAlignment: 'center',
    overlay: 'gradient-bottom',
    titleSize: 'large',
    showSubtitle: true,
    showButton: true,
    buttonStyle: 'pill',
    fontStyle: 'modern',
    imageStyle: 'full'
  },
  {
    id: 'headline-top',
    name: 'Headline Top',
    thumbnail: 'top',
    category: 'full-cover',
    textPosition: 'top-center',
    textAlignment: 'center',
    overlay: 'gradient-top',
    titleSize: 'xlarge',
    showSubtitle: false,
    showButton: true,
    buttonStyle: 'solid',
    fontStyle: 'bold',
    imageStyle: 'full'
  },
  {
    id: 'corner-accent',
    name: 'Corner Accent',
    thumbnail: 'corner',
    category: 'full-cover',
    textPosition: 'bottom-left',
    textAlignment: 'left',
    overlay: 'gradient-bottom',
    titleSize: 'medium',
    showSubtitle: true,
    showButton: true,
    buttonStyle: 'arrow',
    fontStyle: 'minimal',
    imageStyle: 'full'
  },
  {
    id: 'full-dark',
    name: 'Full Dark',
    thumbnail: 'full-dark',
    category: 'full-cover',
    textPosition: 'center',
    textAlignment: 'center',
    overlay: 'dark',
    titleSize: 'xxlarge',
    showSubtitle: false,
    showButton: true,
    buttonStyle: 'outline',
    fontStyle: 'geometric',
    imageStyle: 'full'
  },
  {
    id: 'subtle-light',
    name: 'Subtle Light',
    thumbnail: 'light',
    category: 'full-cover',
    textPosition: 'center',
    textAlignment: 'center',
    overlay: 'light',
    titleSize: 'large',
    showSubtitle: true,
    showButton: true,
    buttonStyle: 'solid',
    fontStyle: 'elegant',
    imageStyle: 'full'
  },
  
  // === SPLIT LAYOUT DESIGNS ===
  {
    id: 'split-right',
    name: 'Split Right',
    thumbnail: 'split-r',
    category: 'split-layout',
    textPosition: 'right-center',
    textAlignment: 'center',
    overlay: 'none',
    titleSize: 'large',
    showSubtitle: true,
    showButton: true,
    buttonStyle: 'solid',
    fontStyle: 'modern',
    imageStyle: 'left-half'
  },
  {
    id: 'split-left',
    name: 'Split Left',
    thumbnail: 'split-l',
    category: 'split-layout',
    textPosition: 'left-center',
    textAlignment: 'center',
    overlay: 'none',
    titleSize: 'large',
    showSubtitle: true,
    showButton: true,
    buttonStyle: 'solid',
    fontStyle: 'modern',
    imageStyle: 'right-half'
  },
  {
    id: 'split-elegant',
    name: 'Elegant Split',
    thumbnail: 'split-elegant',
    category: 'split-layout',
    textPosition: 'right-center',
    textAlignment: 'center',
    overlay: 'none',
    titleSize: 'xlarge',
    showSubtitle: true,
    showButton: true,
    buttonStyle: 'outline',
    fontStyle: 'script',
    imageStyle: 'left-half',
    borderStyle: 'thin'
  },
  {
    id: 'portrait-left',
    name: 'Portrait Left',
    thumbnail: 'portrait-l',
    category: 'split-layout',
    textPosition: 'right-center',
    textAlignment: 'center',
    overlay: 'none',
    titleSize: 'large',
    showSubtitle: true,
    showButton: true,
    buttonStyle: 'pill',
    fontStyle: 'elegant',
    imageStyle: 'portrait-left'
  },
  {
    id: 'portrait-right',
    name: 'Portrait Right',
    thumbnail: 'portrait-r',
    category: 'split-layout',
    textPosition: 'left-center',
    textAlignment: 'center',
    overlay: 'none',
    titleSize: 'large',
    showSubtitle: true,
    showButton: true,
    buttonStyle: 'pill',
    fontStyle: 'elegant',
    imageStyle: 'portrait-right'
  },
  {
    id: 'diagonal-split',
    name: 'Diagonal',
    thumbnail: 'diagonal',
    category: 'split-layout',
    textPosition: 'bottom-right',
    textAlignment: 'right',
    overlay: 'none',
    titleSize: 'xlarge',
    showSubtitle: true,
    showButton: true,
    buttonStyle: 'outline',
    fontStyle: 'bold',
    imageStyle: 'diagonal'
  },
  
  // === MINIMAL DESIGNS ===
  {
    id: 'minimal-clean',
    name: 'Clean Minimal',
    thumbnail: 'minimal',
    category: 'minimal',
    textPosition: 'bottom-center',
    textAlignment: 'center',
    overlay: 'none',
    titleSize: 'small',
    showSubtitle: false,
    showButton: false,
    buttonStyle: 'minimal',
    fontStyle: 'minimal',
    imageStyle: 'inset',
    borderStyle: 'thin'
  },
  {
    id: 'minimal-text-only',
    name: 'Text Focus',
    thumbnail: 'text-focus',
    category: 'minimal',
    textPosition: 'center',
    textAlignment: 'center',
    overlay: 'light',
    titleSize: 'xxlarge',
    showSubtitle: true,
    showButton: false,
    buttonStyle: 'minimal',
    fontStyle: 'minimal',
    imageStyle: 'full'
  },
  {
    id: 'inset-frame',
    name: 'Inset Frame',
    thumbnail: 'inset',
    category: 'minimal',
    textPosition: 'bottom-center',
    textAlignment: 'center',
    overlay: 'none',
    titleSize: 'medium',
    showSubtitle: true,
    showButton: true,
    buttonStyle: 'outline',
    fontStyle: 'elegant',
    imageStyle: 'inset'
  },
  {
    id: 'border-frame',
    name: 'Border Frame',
    thumbnail: 'border',
    category: 'minimal',
    textPosition: 'bottom-center',
    textAlignment: 'center',
    overlay: 'none',
    titleSize: 'medium',
    showSubtitle: true,
    showButton: true,
    buttonStyle: 'outline',
    fontStyle: 'elegant',
    imageStyle: 'inset',
    borderStyle: 'double'
  },
  {
    id: 'circle-center',
    name: 'Circle Focus',
    thumbnail: 'circle',
    category: 'minimal',
    textPosition: 'bottom-center',
    textAlignment: 'center',
    overlay: 'none',
    titleSize: 'medium',
    showSubtitle: true,
    showButton: true,
    buttonStyle: 'pill',
    fontStyle: 'modern',
    imageStyle: 'circle-center'
  },
  
  // === CREATIVE DESIGNS ===
  {
    id: 'vintage-film',
    name: 'Vintage Film',
    thumbnail: 'vintage',
    category: 'creative',
    textPosition: 'bottom-left',
    textAlignment: 'left',
    overlay: 'vignette',
    titleSize: 'large',
    showSubtitle: true,
    showButton: false,
    buttonStyle: 'minimal',
    fontStyle: 'vintage',
    imageStyle: 'full'
  },
  {
    id: 'script-overlay',
    name: 'Script Overlay',
    thumbnail: 'script',
    category: 'creative',
    textPosition: 'center',
    textAlignment: 'center',
    overlay: 'dark',
    titleSize: 'xxlarge',
    showSubtitle: false,
    showButton: true,
    buttonStyle: 'outline',
    fontStyle: 'script',
    imageStyle: 'full'
  },
  {
    id: 'geometric',
    name: 'Geometric',
    thumbnail: 'geometric',
    category: 'creative',
    textPosition: 'center',
    textAlignment: 'center',
    overlay: 'dark',
    titleSize: 'large',
    showSubtitle: true,
    showButton: true,
    buttonStyle: 'solid',
    fontStyle: 'geometric',
    imageStyle: 'full',
    borderStyle: 'thick'
  },
  {
    id: 'magazine',
    name: 'Magazine',
    thumbnail: 'magazine',
    category: 'creative',
    textPosition: 'top-left',
    textAlignment: 'left',
    overlay: 'none',
    titleSize: 'xxlarge',
    showSubtitle: true,
    showButton: false,
    buttonStyle: 'minimal',
    fontStyle: 'bold',
    imageStyle: 'full'
  },
  {
    id: 'editorial',
    name: 'Editorial',
    thumbnail: 'editorial',
    category: 'creative',
    textPosition: 'bottom-right',
    textAlignment: 'right',
    overlay: 'gradient-right',
    titleSize: 'xlarge',
    showSubtitle: true,
    showButton: true,
    buttonStyle: 'arrow',
    fontStyle: 'modern',
    imageStyle: 'full'
  }
];

export interface CoverSettings {
  template: CoverTemplate;
  imagePosition: { x: number; y: number };
  imageScale: number;
  title: string;
  subtitle?: string;
}

interface GalleryCoverDesignerProps {
  imageUrl: string;
  galleryTitle: string;
  initialSettings?: Partial<CoverSettings>;
  onSave: (settings: CoverSettings) => void;
  onCancel: () => void;
}

const GalleryCoverDesigner: React.FC<GalleryCoverDesignerProps> = ({
  imageUrl,
  galleryTitle,
  initialSettings,
  onSave,
  onCancel
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState<CoverTemplate>(
    initialSettings?.template || COVER_TEMPLATES[0]
  );
  const [imagePosition, setImagePosition] = useState(
    initialSettings?.imagePosition || { x: 50, y: 50 }
  );
  const [imageScale, setImageScale] = useState(initialSettings?.imageScale || 100);
  const [imageRotation, setImageRotation] = useState<number>((initialSettings?.imagePosition as any)?.rotation || 0);
  const dragRef = useRef<{ px: number; py: number } | null>(null);
  const [title, setTitle] = useState(initialSettings?.title || galleryTitle);
  // Was hardcoded to 'NEW AGE FOTOGRAFIE' — the origin studio's name, pre-filled into
  // the cover of every gallery any photographer created, and carried onto the page their
  // client opens. SITE.name is the tenant's own.
  const [subtitle, setSubtitle] = useState(
    initialSettings?.subtitle ?? (SITE.name || ''),
  );
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [isDragging, setIsDragging] = useState(false);
  const [templatePage, setTemplatePage] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<CoverTemplate['category'] | 'all'>('all');
  const [customTemplates, setCustomTemplates] = useState<CoverTemplate[]>([]);
  const [showNewTemplateModal, setShowNewTemplateModal] = useState(false);

  // Combine built-in and custom templates
  const allTemplates = [...COVER_TEMPLATES, ...customTemplates];
  
  // Filter templates by category
  const filteredTemplates = selectedCategory === 'all' 
    ? allTemplates 
    : allTemplates.filter(t => t.category === selectedCategory);
  
  const templatesPerPage = 6;
  const totalPages = Math.ceil(filteredTemplates.length / templatesPerPage);
  const visibleTemplates = filteredTemplates.slice(
    templatePage * templatesPerPage,
    (templatePage + 1) * templatesPerPage
  );

  // Reset page when category changes
  useEffect(() => {
    setTemplatePage(0);
  }, [selectedCategory]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragRef.current = { px: e.clientX, py: e.clientY };
  };

  // Delta-based panning: move the focal point relative to the drag distance so
  // the image follows the cursor smoothly (the old handler snapped the focal
  // point to the absolute cursor position, which felt jumpy).
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !dragRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const dx = ((e.clientX - dragRef.current.px) / rect.width) * 100;
    const dy = ((e.clientY - dragRef.current.py) / rect.height) * 100;
    dragRef.current = { px: e.clientX, py: e.clientY };
    setImagePosition((p) => ({
      x: Math.max(0, Math.min(100, p.x - dx)),
      y: Math.max(0, Math.min(100, p.y - dy)),
    }));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    dragRef.current = null;
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    setImageScale((s) => Math.max(50, Math.min(300, s + (e.deltaY < 0 ? 5 : -5))));
  };

  const handleReset = () => {
    setImagePosition({ x: 50, y: 50 });
    setImageScale(100);
    setImageRotation(0);
  };

  const handleSave = () => {
    onSave({
      template: selectedTemplate,
      imagePosition: { ...imagePosition, rotation: imageRotation } as any,
      imageScale,
      title,
      subtitle
    });
  };

  // The six style mappers that used to live here now sit in
  // client/src/lib/coverTemplateStyles.ts, because the CLIENT gallery needs them too.
  // While they were local to this component, only the designer could draw a cover: the
  // studio chose a template, saved it, and the client opened the gallery to a plain
  // image with default type. Shared, so the delivered cover and the approved preview
  // cannot drift apart.
  const renderCoverPreview = (isMobile: boolean) => {
    const containerStyle = isMobile
      ? { width: "180px", height: "320px" }
      : { width: "100%", aspectRatio: "16/9" };
    return (
      <GalleryCover
        className={`rounded-lg ${isMobile ? "mx-auto" : ""}`}
        style={containerStyle}
        imageUrl={imageUrl}
        title={title}
        subtitle={subtitle}
        position={{ ...imagePosition, rotation: imageRotation }}
        scale={imageScale}
        template={selectedTemplate}
        isMobile={isMobile}
        interactive
        dragging={isDragging}
        onImageMouseDown={handleMouseDown}
        onImageMouseMove={handleMouseMove}
        onImageMouseUp={handleMouseUp}
        onImageWheel={handleWheel}
      />
    );
  };
  const renderTemplateThumbnail = (template: CoverTemplate, isSelected: boolean) => {
    // Get mini image style for thumbnail
    const getMiniImageStyle = () => {
      switch (template.imageStyle) {
        case 'left-half': return { width: '50%', left: 0 };
        case 'right-half': return { width: '50%', right: 0, left: 'auto' };
        case 'inset': return { inset: '4px' };
        case 'portrait-left': return { width: '40%', left: '5%' };
        case 'portrait-right': return { width: '40%', right: '5%', left: 'auto' };
        case 'circle-center': return { width: '50%', left: '25%', borderRadius: '50%' };
        default: return {};
      }
    };
    
    return (
      <div
        key={template.id}
        onClick={() => setSelectedTemplate(template)}
        className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all group ${
          isSelected
            ? 'border-purple-500 ring-2 ring-purple-200 scale-105'
            : 'border-gray-200 hover:border-purple-300 hover:scale-102'
        }`}
        style={{ width: '100%', aspectRatio: '3 / 2' }}
        title={template.name}
      >
        {/* Mini preview */}
        <div className="absolute inset-0 bg-gray-100">
          {/* Split layout white panel */}
          {(template.imageStyle === 'left-half' || template.imageStyle === 'right-half') && (
            <div 
              className={`absolute top-0 bottom-0 ${template.imageStyle === 'left-half' ? 'right-0' : 'left-0'} w-1/2 bg-white flex items-center justify-center`}
            >
              <Type size={10} className="text-gray-400" />
            </div>
          )}
          
          {/* Image area */}
          <div 
            className="absolute overflow-hidden"
            style={{ 
              inset: 0,
              ...getMiniImageStyle()
            }}
          >
            <img
              src={imageUrl}
              alt={template.name}
              className="w-full h-full object-cover"
              style={{ opacity: template.overlay === 'none' ? 0.8 : 0.7 }}
            />
          </div>
          
          {/* Overlay */}
          <div className={`absolute inset-0 ${getOverlayClasses(template.overlay)}`} />
          
          {/* Text indicator - shows where text will appear */}
          <div className={`absolute inset-0 flex ${getTextPositionClasses(template.textPosition)} p-1`}>
            <div className={`${template.textAlignment === 'center' ? 'text-center' : ''}`}>
              <div className={`text-[5px] font-medium ${
                template.overlay === 'none' && template.imageStyle !== 'left-half' && template.imageStyle !== 'right-half'
                  ? 'text-gray-800 bg-white/80 px-1 rounded'
                  : 'text-white drop-shadow-sm'
              }`}>
                {template.name.split(' ')[0].toUpperCase()}
              </div>
            </div>
          </div>
        </div>

        {/* Selection indicator */}
        {isSelected && (
          <div className="absolute top-1 right-1 w-4 h-4 bg-purple-500 rounded-full flex items-center justify-center">
            <Check size={10} className="text-white" />
          </div>
        )}
        
        {/* Template name on hover */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-1">
          <span className="text-[8px] text-white font-medium">{template.name}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-xl shadow-xl w-full h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-xl font-semibold text-gray-900">Gallery Cover Designer</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
          >
            <Check size={16} />
            Save Cover
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row flex-1 min-h-0">
        {/* Main Preview Area */}
        <div className="flex-1 min-w-0 p-6 bg-gray-50 overflow-y-auto">
          {/* Preview Mode Toggle */}
          <div className="flex items-center justify-center gap-2 mb-6">
            <button
              onClick={() => setPreviewMode('desktop')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                previewMode === 'desktop'
                  ? 'bg-purple-100 text-purple-700'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              <Monitor size={18} />
              Cover
            </button>
            <button
              onClick={() => setPreviewMode('mobile')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                previewMode === 'mobile'
                  ? 'bg-purple-100 text-purple-700'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              <Smartphone size={18} />
              Thumbnails
            </button>
          </div>

          {/* Preview Container */}
          <div className="flex flex-col xl:flex-row items-center justify-center gap-8">
            {/* Desktop Preview */}
            <div className={`w-full max-w-[560px] ${previewMode === 'mobile' ? 'opacity-50 scale-90' : ''}`}>
              <div className="bg-white rounded-lg shadow-lg p-2 w-full">
                {renderCoverPreview(false)}
              </div>
              <p className="text-center text-sm text-gray-500 mt-2">Desktop View</p>
            </div>

            {/* Mobile Preview */}
            <div className={previewMode === 'desktop' ? 'opacity-50 scale-90' : ''}>
              <div className="bg-white rounded-lg shadow-lg p-2">
                {renderCoverPreview(true)}
              </div>
              <p className="text-center text-sm text-gray-500 mt-2">Mobile View</p>
            </div>
          </div>

          {/* Image Controls */}
          <div className="mt-6 flex items-center justify-center gap-6">
            <div className="flex items-center gap-2">
              <Move size={16} className="text-gray-400" />
              <span className="text-sm text-gray-600">
                Position: {Math.round(imagePosition.x)}%, {Math.round(imagePosition.y)}%
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setImageScale(Math.max(50, imageScale - 10))}
                className="p-1 hover:bg-gray-200 rounded"
              >
                <ZoomOut size={18} className="text-gray-600" />
              </button>
              <span className="text-sm text-gray-600 w-16 text-center">{imageScale}%</span>
              <button
                onClick={() => setImageScale(Math.min(200, imageScale + 10))}
                className="p-1 hover:bg-gray-200 rounded"
              >
                <ZoomIn size={18} className="text-gray-600" />
              </button>
            </div>

            <button
              onClick={handleReset}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
            >
              <RotateCcw size={14} />
              Reset
            </button>
          </div>

          {/* Cover Settings - Moved here */}
          <div className="mt-8 max-w-3xl mx-auto">
            <h3 className="font-medium text-gray-900 mb-4 text-center">Cover Settings</h3>
            <div className="grid grid-cols-2 gap-4">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>

              {/* Subtitle */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subtitle</label>
                <input
                  type="text"
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>

              {/* Image Scale Slider */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Zoom · {imageScale}%</label>
                <input
                  type="range"
                  min="50"
                  max="300"
                  value={imageScale}
                  onChange={(e) => setImageScale(parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                />
                <p className="text-xs text-gray-400 mt-1">Tip: scroll on the preview to zoom, drag to reposition.</p>
              </div>

              {/* Rotation Slider */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <RotateCw size={14} /> Rotation · {imageRotation}°
                </label>
                <input
                  type="range"
                  min="-180"
                  max="180"
                  value={imageRotation}
                  onChange={(e) => setImageRotation(parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>-180°</span>
                  <button type="button" onClick={() => setImageRotation(0)} className="hover:text-purple-600">reset</button>
                  <span>180°</span>
                </div>
              </div>
            </div>
          </div>

          {/* Template Selector */}
          <div className="mt-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-gray-900">Gallery Cover</h3>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">{filteredTemplates.length} designs</span>
                <button
                  onClick={() => setShowNewTemplateModal(true)}
                  className="text-sm text-purple-600 hover:text-purple-700 hover:underline font-medium"
                >
                  + ADD NEW
                </button>
              </div>
            </div>
            
            {/* Category Tabs */}
            <div className="flex gap-2 mb-4 flex-wrap">
              {[
                { id: 'all', label: 'All Designs' },
                { id: 'full-cover', label: 'Full Cover' },
                { id: 'split-layout', label: 'Split Layout' },
                { id: 'minimal', label: 'Minimal' },
                { id: 'creative', label: 'Creative' }
              ].map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id as typeof selectedCategory)}
                  className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                    selectedCategory === cat.id
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setTemplatePage(Math.max(0, templatePage - 1))}
                disabled={templatePage === 0}
                className="p-2 rounded-full bg-purple-100 text-purple-600 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={16} />
              </button>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 flex-1">
                {/* No Cover option */}
                <div
                  onClick={() => setSelectedTemplate({ ...COVER_TEMPLATES[0], id: 'no-cover', name: 'No Cover', overlay: 'none', category: 'full-cover' } as CoverTemplate)}
                  className={`flex flex-col items-center justify-center cursor-pointer rounded-lg border-2 transition-colors ${
                    selectedTemplate.id === 'no-cover'
                      ? 'border-purple-500 ring-2 ring-purple-200'
                      : 'border-dashed border-gray-300 hover:border-gray-400'
                  }`}
                  style={{ width: '100%', aspectRatio: '3 / 2' }}
                >
                  <div className="w-6 h-6 rounded-full border-2 border-gray-300 flex items-center justify-center">
                    <X size={12} className="text-gray-400" />
                  </div>
                  <span className="text-[10px] text-gray-500 mt-1">No Cover</span>
                </div>
                
                {visibleTemplates.map(template => 
                  renderTemplateThumbnail(template, selectedTemplate.id === template.id)
                )}
              </div>

              <button
                onClick={() => setTemplatePage(Math.min(totalPages - 1, templatePage + 1))}
                disabled={templatePage >= totalPages - 1}
                className="p-2 rounded-full bg-purple-100 text-purple-600 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight size={16} />
              </button>
            </div>
            
            {/* Page indicator */}
            {totalPages > 1 && (
              <div className="flex justify-center gap-1 mt-3">
                {Array.from({ length: totalPages }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setTemplatePage(i)}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      templatePage === i ? 'bg-purple-600' : 'bg-gray-300 hover:bg-gray-400'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Settings Panel */}
        <div className="w-80 border-l bg-white p-6 space-y-6 overflow-y-auto">
          {/* Template Info */}
          <div className="pt-4 border-t">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Current Template</h4>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="font-medium text-gray-900">{selectedTemplate.name}</p>
              <p className="text-xs text-gray-500 mt-1">
                Text: {selectedTemplate.textPosition.replace('-', ' ')} • 
                Overlay: {selectedTemplate.overlay}
              </p>
            </div>
          </div>

          {/* Tips */}
          <div className="pt-4 border-t">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Tips</h4>
            <ul className="text-xs text-gray-500 space-y-1">
              <li>• Drag on the preview to reposition the image</li>
              <li>• Use zoom to fit more or less of the photo</li>
              <li>• Different templates work better with different photos</li>
              <li>• Check both desktop and mobile previews</li>
            </ul>
          </div>
        </div>
      </div>

      {/* New Template Modal */}
      {showNewTemplateModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Create Custom Template</h3>
                <button
                  onClick={() => setShowNewTemplateModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={20} />
                </button>
              </div>

              <p className="text-sm text-gray-600 mb-4">
                Create a custom cover template with full control over layout, styling, and effects.
              </p>

              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                
                // Handle checkboxes properly - they're only in formData if checked
                const showSubtitle = formData.has('showSubtitle');
                const showButton = formData.has('showButton');
                
                const newTemplate: CoverTemplate = {
                  id: `custom-${Date.now()}`,
                  name: formData.get('name') as string,
                  thumbnail: 'custom',
                  category: formData.get('category') as CoverTemplate['category'],
                  textPosition: formData.get('textPosition') as CoverTemplate['textPosition'],
                  textAlignment: formData.get('textAlignment') as CoverTemplate['textAlignment'],
                  overlay: formData.get('overlay') as CoverTemplate['overlay'],
                  titleSize: formData.get('titleSize') as CoverTemplate['titleSize'],
                  showSubtitle: showSubtitle,
                  showButton: showButton,
                  buttonStyle: formData.get('buttonStyle') as CoverTemplate['buttonStyle'],
                  fontStyle: formData.get('fontStyle') as CoverTemplate['fontStyle'],
                  imageStyle: formData.get('imageStyle') as CoverTemplate['imageStyle'],
                  accentColor: formData.get('accentColor') as string,
                  borderStyle: formData.get('borderStyle') as CoverTemplate['borderStyle']
                };
                
                setCustomTemplates([...customTemplates, newTemplate]);
                setSelectedTemplate(newTemplate);
                setShowNewTemplateModal(false);
              }}>
                <div className="grid grid-cols-2 gap-4">
                  {/* Basic Info */}
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Template Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      required
                      defaultValue={selectedTemplate.name}
                      placeholder="My Custom Template"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Category <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="category"
                      required
                      defaultValue={selectedTemplate.category}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    >
                      <option value="full-cover">Full Cover</option>
                      <option value="split-layout">Split Layout</option>
                      <option value="minimal">Minimal</option>
                      <option value="creative">Creative</option>
                      <option value="collage">Collage</option>
                    </select>
                  </div>

                  {/* Image Style */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Image Style
                    </label>
                    <select
                      name="imageStyle"
                      defaultValue={selectedTemplate.imageStyle}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    >
                      <option value="full">Full</option>
                      <option value="left-half">Left Half</option>
                      <option value="right-half">Right Half</option>
                      <option value="portrait-left">Portrait Left</option>
                      <option value="portrait-right">Portrait Right</option>
                      <option value="inset">Inset</option>
                      <option value="circle-center">Circle Center</option>
                    </select>
                  </div>

                  {/* Text Position */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Text Position
                    </label>
                    <select
                      name="textPosition"
                      defaultValue={selectedTemplate.textPosition}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    >
                      <option value="top-left">Top Left</option>
                      <option value="top-center">Top Center</option>
                      <option value="top-right">Top Right</option>
                      <option value="center">Center</option>
                      <option value="bottom-left">Bottom Left</option>
                      <option value="bottom-center">Bottom Center</option>
                      <option value="bottom-right">Bottom Right</option>
                      <option value="left-center">Left Center</option>
                      <option value="right-center">Right Center</option>
                    </select>
                  </div>

                  {/* Text Alignment */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Text Alignment
                    </label>
                    <select
                      name="textAlignment"
                      defaultValue={selectedTemplate.textAlignment}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    >
                      <option value="left">Left</option>
                      <option value="center">Center</option>
                      <option value="right">Right</option>
                    </select>
                  </div>

                  {/* Overlay Effect */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Overlay Effect (Opacity)
                    </label>
                    <select
                      name="overlay"
                      defaultValue={selectedTemplate.overlay}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    >
                      <option value="none">None</option>
                      <option value="dark">Dark</option>
                      <option value="light">Light</option>
                      <option value="gradient-bottom">Gradient Bottom</option>
                      <option value="gradient-top">Gradient Top</option>
                      <option value="gradient-left">Gradient Left</option>
                      <option value="gradient-right">Gradient Right</option>
                      <option value="vignette">Vignette</option>
                      <option value="cinematic">Cinematic</option>
                    </select>
                  </div>

                  {/* Title Size */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Title Size
                    </label>
                    <select
                      name="titleSize"
                      defaultValue={selectedTemplate.titleSize}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    >
                      <option value="small">Small</option>
                      <option value="medium">Medium</option>
                      <option value="large">Large</option>
                      <option value="xlarge">Extra Large</option>
                      <option value="xxlarge">XX Large</option>
                    </select>
                  </div>

                  {/* Font Style */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Font Style
                    </label>
                    <select
                      name="fontStyle"
                      defaultValue={selectedTemplate.fontStyle}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    >
                      <option value="elegant">Elegant</option>
                      <option value="modern">Modern</option>
                      <option value="bold">Bold</option>
                      <option value="script">Script</option>
                    </select>
                  </div>

                  {/* Border Style */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Border Style
                    </label>
                    <select
                      name="borderStyle"
                      defaultValue={selectedTemplate.borderStyle}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    >
                      <option value="none">None</option>
                      <option value="thin">Thin</option>
                      <option value="thick">Thick</option>
                      <option value="double">Double</option>
                    </select>
                  </div>

                  {/* Button Style */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Button Style
                    </label>
                    <select
                      name="buttonStyle"
                      defaultValue={selectedTemplate.buttonStyle}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    >
                      <option value="solid">Solid</option>
                      <option value="outline">Outline</option>
                      <option value="pill">Pill</option>
                      <option value="minimal">Minimal</option>
                      <option value="arrow">Arrow</option>
                    </select>
                  </div>

                  {/* Accent Color */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Accent Color
                    </label>
                    <input
                      type="color"
                      name="accentColor"
                      defaultValue={selectedTemplate.accentColor || '#6366f1'}
                      className="w-full h-10 px-1 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>

                  {/* Toggle Options */}
                  <div className="col-span-2 space-y-3 bg-gray-50 rounded-lg p-4">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        name="showSubtitle"
                        value="true"
                        defaultChecked={selectedTemplate.showSubtitle}
                        className="w-4 h-4 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
                      />
                      <span className="text-sm font-medium text-gray-700">Show Subtitle</span>
                    </label>

                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        name="showButton"
                        value="true"
                        defaultChecked={selectedTemplate.showButton}
                        className="w-4 h-4 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
                      />
                      <span className="text-sm font-medium text-gray-700">Show Button</span>
                    </label>
                  </div>
                </div>

                <div className="flex gap-2 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowNewTemplateModal(false)}
                    className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    Create Template
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GalleryCoverDesigner;
export { COVER_TEMPLATES };
