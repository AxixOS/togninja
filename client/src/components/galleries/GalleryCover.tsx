import React from 'react';
import {
  getTextPositionClasses,
  getOverlayClasses,
  getTitleSizeClasses,
  getFontStyleClasses,
  getButtonClasses,
  getImageContainerStyle,
} from '../../lib/coverTemplateStyles';

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

// A THIRD copy of these mappers used to sit here — the designer had one, this renderer
// had another, and the two were free to drift. They now come from one module, so a
// template drawn in the admin preview and the same template drawn on the client gallery
// cannot disagree.
const textPositionClasses = (position?: string) => getTextPositionClasses((position || 'center') as any);
const overlayClasses = (overlay?: string) => getOverlayClasses((overlay || 'none') as any);
const titleSizeClasses = (size?: string, isMobile = false) => getTitleSizeClasses((size || 'large') as any, isMobile);
const fontStyleClasses = (style?: string) => getFontStyleClasses((style || 'modern') as any);
const buttonClasses = (style?: string) => getButtonClasses((style || 'solid') as any);
const imageContainerStyle = (imageStyle?: string): React.CSSProperties => getImageContainerStyle((imageStyle || 'full') as any);

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
