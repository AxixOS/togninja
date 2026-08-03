import React from 'react';

/**
 * Shared, config-driven gallery-cover renderer.
 *
 * ONE source of truth for how a cover looks, used by the Cover Designer preview,
 * the wizard preview, and the live public gallery page — so what a photographer
 * designs is exactly what the client sees. The transform (focal point, zoom,
 * rotation) is expressed in resolution-independent units (object-position %,
 * scale factor, degrees) so it renders identically at any container size.
 */

export interface CoverTransform {
  x: number;        // focal point % (0..100)
  y: number;        // focal point % (0..100)
  rotation?: number; // degrees
}

export interface CoverTemplateLike {
  textPosition?: string;
  textAlignment?: 'left' | 'center' | 'right';
  overlay?: string;
  titleSize?: string;
  showSubtitle?: boolean;
  showButton?: boolean;
  buttonStyle?: string;
  fontStyle?: string;
  imageStyle?: string;
}

export interface GalleryCoverProps {
  imageUrl?: string;
  title: string;
  subtitle?: string;
  position?: CoverTransform;
  scale?: number; // percent, 100 = neutral
  template?: CoverTemplateLike | null;
  isMobile?: boolean;
  buttonLabel?: string;
  onOpenGallery?: () => void;
  className?: string;
  style?: React.CSSProperties;
  /** Designer-only: interaction handlers layered on the image container. */
  interactive?: boolean;
  dragging?: boolean;
  onImageMouseDown?: (e: React.MouseEvent<HTMLDivElement>) => void;
  onImageMouseMove?: (e: React.MouseEvent<HTMLDivElement>) => void;
  onImageMouseUp?: () => void;
  onImageWheel?: (e: React.WheelEvent<HTMLDivElement>) => void;
}

const textPositionClasses = (position?: string) => ({
  'top-left': 'items-start justify-start text-left pt-8 pl-8',
  'top-center': 'items-start justify-center text-center pt-8',
  'top-right': 'items-start justify-end text-right pt-8 pr-8',
  'center': 'items-center justify-center text-center',
  'bottom-left': 'items-end justify-start text-left pb-8 pl-8',
  'bottom-center': 'items-end justify-center text-center pb-8',
  'bottom-right': 'items-end justify-end text-right pb-8 pr-8',
  'left-center': 'items-center justify-start text-left pl-8',
  'right-center': 'items-center justify-end text-right pr-8',
}[position || 'center'] || 'items-center justify-center text-center');

const overlayClasses = (overlay?: string) => ({
  'none': '',
  'dark': 'bg-black/40',
  'light': 'bg-white/30',
  'gradient-bottom': 'bg-gradient-to-t from-black/70 via-black/20 to-transparent',
  'gradient-top': 'bg-gradient-to-b from-black/70 via-black/20 to-transparent',
  'gradient-left': 'bg-gradient-to-r from-black/70 via-black/20 to-transparent',
  'gradient-right': 'bg-gradient-to-l from-black/70 via-black/20 to-transparent',
  'vignette': 'bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.4)_100%)]',
  'cinematic': 'bg-gradient-to-t from-black/80 via-transparent to-black/30',
}[overlay || 'dark'] || '');

const titleSizeClasses = (size?: string, isMobile = false) => ({
  'small': isMobile ? 'text-lg' : 'text-2xl',
  'medium': isMobile ? 'text-xl' : 'text-3xl',
  'large': isMobile ? 'text-2xl' : 'text-4xl',
  'xlarge': isMobile ? 'text-3xl' : 'text-5xl',
  'xxlarge': isMobile ? 'text-4xl' : 'text-6xl',
}[size || 'large'] || (isMobile ? 'text-2xl' : 'text-4xl'));

const fontStyleClasses = (style?: string) => ({
  'modern': 'font-sans tracking-wide',
  'elegant': 'font-serif tracking-widest uppercase',
  'bold': 'font-bold tracking-tight',
  'minimal': 'font-light tracking-[0.3em] uppercase',
  'script': 'font-serif italic tracking-wide',
  'vintage': 'font-serif tracking-[0.2em] uppercase',
  'geometric': 'font-sans font-black tracking-[0.15em] uppercase',
}[style || 'modern'] || 'font-sans tracking-wide');

const buttonClasses = (style?: string) => ({
  'solid': 'bg-white text-gray-900 px-6 py-2 font-medium',
  'outline': 'border-2 border-white text-white px-6 py-2 font-medium',
  'pill': 'bg-white text-gray-900 px-8 py-2 rounded-full font-medium',
  'minimal': 'text-white underline underline-offset-4 font-light',
  'arrow': 'text-white font-medium flex items-center gap-2 after:content-["→"]',
}[style || 'solid'] || 'bg-white text-gray-900 px-6 py-2 font-medium');

const imageContainerStyle = (imageStyle?: string): React.CSSProperties => {
  switch (imageStyle) {
    case 'left-half': return { width: '50%', left: 0 };
    case 'right-half': return { width: '50%', right: 0 };
    case 'top-half': return { height: '60%', top: 0 };
    case 'bottom-half': return { height: '60%', bottom: 0 };
    case 'inset': return { inset: '20px' };
    case 'portrait-left': return { width: '45%', left: '5%', top: '10%', bottom: '10%' };
    case 'portrait-right': return { width: '45%', right: '5%', top: '10%', bottom: '10%' };
    case 'circle-center': return { width: '50%', height: '70%', left: '25%', top: '5%', borderRadius: '50%' };
    case 'diagonal': return { width: '70%', clipPath: 'polygon(0 0, 100% 0, 70% 100%, 0 100%)' };
    default: return {};
  }
};

const GalleryCover: React.FC<GalleryCoverProps> = ({
  imageUrl,
  title,
  subtitle,
  position = { x: 50, y: 50 },
  scale = 100,
  template,
  isMobile = false,
  buttonLabel = 'OPEN GALLERY',
  onOpenGallery,
  className = '',
  style,
  interactive = false,
  dragging = false,
  onImageMouseDown,
  onImageMouseMove,
  onImageMouseUp,
  onImageWheel,
}) => {
  const t: CoverTemplateLike = {
    textPosition: 'center', textAlignment: 'center', overlay: 'dark', titleSize: 'large',
    showSubtitle: true, showButton: true, buttonStyle: 'solid', fontStyle: 'modern',
    imageStyle: 'full', ...(template || {}),
  };
  const x = position?.x ?? 50;
  const y = position?.y ?? 50;
  const rotation = position?.rotation ?? 0;
  const isSplit = t.imageStyle === 'left-half' || t.imageStyle === 'right-half';

  const Btn = ({ dark = false }: { dark?: boolean }) =>
    onOpenGallery ? (
      <button
        type="button"
        onClick={onOpenGallery}
        className={`${buttonClasses(t.buttonStyle)} ${dark ? 'bg-gray-900 text-white' : ''} ${isMobile ? 'text-xs px-4 py-1' : ''} transition-transform hover:scale-105`}
      >
        {buttonLabel}
      </button>
    ) : (
      <span className={`inline-block ${buttonClasses(t.buttonStyle)} ${dark ? 'bg-gray-900 text-white' : ''} ${isMobile ? 'text-xs px-4 py-1' : ''}`}>
        {buttonLabel}
      </span>
    );

  return (
    <div className={`relative overflow-hidden bg-gray-100 ${className}`} style={style}>
      {/* Image */}
      <div
        className="absolute overflow-hidden"
        style={{
          inset: t.imageStyle === 'inset' ? '16px' : 0,
          borderRadius: t.imageStyle === 'inset' ? '8px' : 0,
          ...imageContainerStyle(t.imageStyle),
        }}
        onMouseDown={interactive ? onImageMouseDown : undefined}
        onMouseMove={interactive ? onImageMouseMove : undefined}
        onMouseUp={interactive ? onImageMouseUp : undefined}
        onMouseLeave={interactive ? onImageMouseUp : undefined}
        onWheel={interactive ? onImageWheel : undefined}
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={title}
            className={`w-full h-full object-cover ${interactive ? (dragging ? 'cursor-grabbing' : 'cursor-grab') : ''}`}
            style={{
              objectPosition: `${x}% ${y}%`,
              transform: `scale(${scale / 100}) rotate(${rotation}deg)`,
              transformOrigin: `${x}% ${y}%`,
            }}
            draggable={false}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-purple-900 to-fuchsia-800" />
        )}
      </div>

      {/* Overlay */}
      <div className={`absolute inset-0 ${overlayClasses(t.overlay)}`} />

      {/* Split-layout text panel */}
      {isSplit && (
        <div className={`absolute top-0 bottom-0 ${t.imageStyle === 'left-half' ? 'right-0' : 'left-0'} w-1/2 bg-white flex flex-col items-center justify-center p-4`}>
          <h2 className={`${titleSizeClasses(t.titleSize, isMobile)} ${fontStyleClasses(t.fontStyle)} text-gray-900 mb-2 text-center`}>{title}</h2>
          {t.showSubtitle && subtitle && (
            <p className={`text-gray-500 ${isMobile ? 'text-xs' : 'text-sm'} tracking-wider mb-4 text-center`}>{subtitle}</p>
          )}
          {t.showButton && <Btn dark />}
        </div>
      )}

      {/* Inset-layout caption */}
      {t.imageStyle === 'inset' && (
        <div className="absolute bottom-0 left-0 right-0 bg-white p-4 text-center">
          <h2 className={`${titleSizeClasses('small', isMobile)} ${fontStyleClasses(t.fontStyle)} text-gray-900`}>{title}</h2>
          {t.showSubtitle && subtitle && <p className="text-gray-500 text-xs tracking-wider">{subtitle}</p>}
        </div>
      )}

      {/* Full-cover overlay text (default) */}
      {!isSplit && t.imageStyle !== 'inset' && (
        <div className={`absolute inset-0 flex flex-col ${textPositionClasses(t.textPosition)} p-6 pointer-events-none`}>
          <div className={`${t.textAlignment === 'center' ? 'text-center' : t.textAlignment === 'right' ? 'text-right' : 'text-left'} pointer-events-auto`}>
            <h2 className={`${titleSizeClasses(t.titleSize, isMobile)} ${fontStyleClasses(t.fontStyle)} text-white mb-2 drop-shadow-lg`}>{title}</h2>
            {t.showSubtitle && subtitle && (
              <p className={`text-white/85 ${isMobile ? 'text-xs' : 'text-sm'} tracking-wider mb-4 drop-shadow`}>{subtitle}</p>
            )}
            {t.showButton && <Btn />}
          </div>
        </div>
      )}
    </div>
  );
};

export default GalleryCover;
