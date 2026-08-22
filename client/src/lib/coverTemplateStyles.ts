// How a cover template turns into actual styles.
//
// These six mappers lived inside GalleryCoverDesigner, which meant only the DESIGNER could
// draw a cover. The studio picked from 24 templates, positioned the focal point, chose an
// overlay and a font, saved — and the client opened the gallery to a plain image with the
// title in the same default type as every other gallery. The cover_template column was
// written and never read; the designer was a closed loop.
//
// Extracted verbatim so the page a client sees is rendered from the same mapping as the
// preview the studio approved. Reimplementing them separately would have produced two
// covers that drift apart, which is worse than one that was never applied.
import type { CoverTemplateSettings } from '../types/gallery';

type TextPosition = CoverTemplateSettings['textPosition'];
type Overlay = CoverTemplateSettings['overlay'];
type TitleSize = CoverTemplateSettings['titleSize'];
type FontStyle = CoverTemplateSettings['fontStyle'];
type ButtonStyle = CoverTemplateSettings['buttonStyle'];
type ImageStyle = CoverTemplateSettings['imageStyle'];

export const getTextPositionClasses = (position: TextPosition): string => {
  const positions: Record<string, string> = {
    'top-left': 'items-start justify-start text-left pt-8 pl-8',
    'top-center': 'items-start justify-center text-center pt-8',
    'top-right': 'items-start justify-end text-right pt-8 pr-8',
    'center': 'items-center justify-center text-center',
    'bottom-left': 'items-end justify-start text-left pb-8 pl-8',
    'bottom-center': 'items-end justify-center text-center pb-8',
    'bottom-right': 'items-end justify-end text-right pb-8 pr-8',
    'left-center': 'items-center justify-start text-left pl-8',
    'right-center': 'items-center justify-end text-right pr-8',
  };
  return positions[position] || positions['center'];
};

export const getOverlayClasses = (overlay: Overlay): string => {
  const overlays: Record<string, string> = {
    'none': '',
    'dark': 'bg-black/40',
    'light': 'bg-white/30',
    'gradient-bottom': 'bg-gradient-to-t from-black/70 via-black/20 to-transparent',
    'gradient-top': 'bg-gradient-to-b from-black/70 via-black/20 to-transparent',
    'gradient-left': 'bg-gradient-to-r from-black/70 via-black/20 to-transparent',
    'gradient-right': 'bg-gradient-to-l from-black/70 via-black/20 to-transparent',
    'vignette': 'bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.4)_100%)]',
    'cinematic': 'bg-gradient-to-t from-black/80 via-transparent to-black/30',
  };
  return overlays[overlay] || '';
};

export const getTitleSizeClasses = (size: TitleSize, isMobile: boolean): string => {
  const sizes: Record<string, string> = {
    'small': isMobile ? 'text-lg' : 'text-2xl',
    'medium': isMobile ? 'text-xl' : 'text-3xl',
    'large': isMobile ? 'text-2xl' : 'text-4xl',
    'xlarge': isMobile ? 'text-3xl' : 'text-5xl',
    'xxlarge': isMobile ? 'text-4xl' : 'text-6xl',
  };
  return sizes[size] || sizes['large'];
};

export const getFontStyleClasses = (style: FontStyle): string => {
  const styles: Record<string, string> = {
    'modern': 'font-sans tracking-wide',
    'elegant': 'font-serif tracking-widest uppercase',
    'bold': 'font-bold tracking-tight',
    'minimal': 'font-light tracking-[0.3em] uppercase',
    'script': 'font-serif italic tracking-wide',
    'vintage': 'font-serif tracking-[0.2em] uppercase',
    'geometric': 'font-sans font-black tracking-[0.15em] uppercase',
  };
  return styles[style] || styles['modern'];
};

export const getButtonClasses = (style: ButtonStyle): string => {
  const styles: Record<string, string> = {
    'solid': 'bg-white text-gray-900 px-6 py-2 font-medium',
    'outline': 'border-2 border-white text-white px-6 py-2 font-medium',
    'pill': 'bg-white text-gray-900 px-8 py-2 rounded-full font-medium',
    'minimal': 'text-white underline underline-offset-4 font-light',
    'arrow': 'text-white font-medium flex items-center gap-2 after:content-["→"]',
  };
  return styles[style] || styles['solid'];
};

export const getImageContainerStyle = (imageStyle: ImageStyle): React.CSSProperties => {
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

/**
 * The settings a gallery falls back to when the studio never opened the designer.
 *
 * Matches the column default in shared/schema.ts, so an old gallery and a new one render
 * the same way rather than one of them landing on `undefined` and losing its cover.
 */
export const DEFAULT_COVER_TEMPLATE: CoverTemplateSettings = {
  templateId: 'classic-center',
  textPosition: 'center',
  textAlignment: 'center',
  overlay: 'dark',
  titleSize: 'large',
  showSubtitle: true,
  showButton: true,
  buttonStyle: 'outline',
  fontStyle: 'elegant',
  imageStyle: 'full',
};
