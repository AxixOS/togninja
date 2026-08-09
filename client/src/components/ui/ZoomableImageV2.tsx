import React, { useState, useRef, useEffect } from 'react';
import { X, ZoomIn, RotateCcw } from 'lucide-react';
import { proxyImage } from '../../lib/imageProxy';

interface ZoomableImageV2Props {
  src: string;
  alt: string;
  className?: string;
  onError?: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void;
  loading?: 'lazy' | 'eager';
  priority?: boolean;
  width?: number;
  height?: number;
}

const ZoomableImageV2: React.FC<ZoomableImageV2Props> = ({
  src,
  alt,
  className = '',
  onError,
  loading = 'lazy',
  priority = false,
  width,
  height
}) => {
  // No src → render NOTHING. Image slots fall back to '' when the studio has not
  // uploaded a photo for them (they used to fall back to a bundled collage of another
  // studio's clients), and an <img src=""> paints a broken-image icon — visibly worse
  // than the leak that was removed.
  if (!src || !String(src).trim()) return null;

  // Serve a right-sized WebP for the thumbnail instead of the full-resolution
  // original (homepage grids were downloading multi-MB files). The zoom modal
  // still gets a large version. Relative/already-proxied URLs pass through.
  const displaySrc = proxyImage(src, { w: width ? Math.min(1600, Math.round(width * 2)) : 1000 });
  const modalSrc = proxyImage(src, { w: 1600 });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [lastPanPoint, setLastPanPoint] = useState({ x: 0, y: 0 });
  const [isPinching, setIsPinching] = useState(false);
  const [lastPinchDistance, setLastPinchDistance] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imgLoadRef = useRef<HTMLImageElement | null>(null);

  // Preload image for smooth rendering
  useEffect(() => {
    if (!src) return;

    // Reset state for the new source so the fade-in re-evaluates.
    setIsLoaded(false);
    setHasError(false);

    const img = new Image();
    imgLoadRef.current = img;

    // Attach handlers BEFORE setting src, otherwise a cached image can fire
    // its load event before the handler exists and the image never reveals.
    img.onload = () => setIsLoaded(true);
    img.onerror = () => setHasError(true);
    // Preload the SAME (resized) URL the <img> will use — preloading the
    // full-resolution original defeated the resizing entirely.
    img.src = displaySrc;

    // Images served from cache may already be complete and never emit `load`.
    if (img.complete && img.naturalWidth > 0) {
      setIsLoaded(true);
    }

    return () => {
      if (imgLoadRef.current) {
        imgLoadRef.current.onload = null;
        imgLoadRef.current.onerror = null;
      }
    };
  }, [src]);

  // Reset zoom and position when modal opens
  useEffect(() => {
    if (isModalOpen) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
    }
  }, [isModalOpen]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isModalOpen]);

  const handleImageClick = () => {
    if (isLoaded && !hasError) {
      setIsModalOpen(true);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(0.5, Math.min(5, scale * delta));
    setScale(newScale);
  };

  const getDistance = (touch1: React.Touch, touch2: React.Touch) => {
    return Math.sqrt(
      Math.pow(touch2.clientX - touch1.clientX, 2) +
      Math.pow(touch2.clientY - touch1.clientY, 2)
    );
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setLastPanPoint({
        x: e.touches[0].clientX,
        y: e.touches[0].clientY
      });
    } else if (e.touches.length === 2) {
      setIsPinching(true);
      setIsDragging(false);
      const distance = getDistance(e.touches[0], e.touches[1]);
      setLastPinchDistance(distance);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    
    if (e.touches.length === 1 && isDragging && !isPinching) {
      const deltaX = e.touches[0].clientX - lastPanPoint.x;
      const deltaY = e.touches[0].clientY - lastPanPoint.y;
      
      setPosition(prev => ({
        x: prev.x + deltaX,
        y: prev.y + deltaY
      }));
      
      setLastPanPoint({
        x: e.touches[0].clientX,
        y: e.touches[0].clientY
      });
    } else if (e.touches.length === 2 && isPinching) {
      const distance = getDistance(e.touches[0], e.touches[1]);
      const delta = distance / lastPinchDistance;
      const newScale = Math.max(0.5, Math.min(5, scale * delta));
      
      setScale(newScale);
      setLastPinchDistance(distance);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length === 0) {
      setIsDragging(false);
      setIsPinching(false);
    } else if (e.touches.length === 1) {
      setIsPinching(false);
      setIsDragging(true);
      setLastPanPoint({
        x: e.touches[0].clientX,
        y: e.touches[0].clientY
      });
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setLastPanPoint({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    
    const deltaX = e.clientX - lastPanPoint.x;
    const deltaY = e.clientY - lastPanPoint.y;
    
    setPosition(prev => ({
      x: prev.x + deltaX,
      y: prev.y + deltaY
    }));
    
    setLastPanPoint({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleReset = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleZoomIn = () => {
    setScale(prev => Math.min(5, prev * 1.2));
  };

  const handleZoomOut = () => {
    setScale(prev => Math.max(0.5, prev * 0.8));
  };

  // Calculate aspect ratio for preventing layout shift
  const aspectRatio = width && height ? (height / width) * 100 : undefined;

  return (
    <>
      {/* Thumbnail Image */}
      <div 
        className={`relative group cursor-pointer overflow-hidden ${className}`}
        onClick={handleImageClick}
        style={{
          paddingBottom: aspectRatio ? `${aspectRatio}%` : undefined,
          backgroundColor: '#f3f4f6',
        }}
      >
        <img
          src={displaySrc}
          alt={alt}
          className={`
            absolute inset-0 w-full h-full object-cover
            transition-all duration-500 ease-out
            ${isLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-105'}
            group-hover:scale-110
          `}
          onLoad={() => setIsLoaded(true)}
          onError={(e) => {
            setHasError(true);
            if (onError) onError(e);
          }}
          loading={priority ? 'eager' : loading}
          decoding="async"
          // Priority images are the above-the-fold LCP — hint the browser to
          // fetch them ahead of the rest. Lowercase attr works on any React.
          {...(priority ? { fetchpriority: 'high' } : {})}
        />
        
        {/* Loading skeleton */}
        {!isLoaded && !hasError && (
          <div className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 animate-pulse" />
        )}

        {/* Hover zoom icon */}
        {isLoaded && !hasError && (
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-300 flex items-center justify-center">
            <ZoomIn className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </div>
        )}

        {/* Error state */}
        {hasError && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
            <div className="text-center text-gray-400">
              <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-xs">Image not available</p>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center">
          {/* Controls */}
          <div className="absolute top-4 right-4 z-10 flex gap-2">
            <button
              onClick={handleZoomOut}
              className="bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-all"
              aria-label="Zoom out"
            >
              <span className="text-lg">−</span>
            </button>
            <button
              onClick={handleZoomIn}
              className="bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-all"
              aria-label="Zoom in"
            >
              <span className="text-lg">+</span>
            </button>
            <button
              onClick={handleReset}
              className="bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-all"
              aria-label="Reset zoom"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
            <button
              onClick={handleCloseModal}
              className="bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-all"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Zoom level indicator */}
          <div className="absolute top-4 left-4 bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-sm">
            {Math.round(scale * 100)}%
          </div>

          {/* Image Container */}
          <div
            ref={containerRef}
            className="w-full h-full flex items-center justify-center overflow-hidden"
            onWheel={handleWheel}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
          >
            <img
              ref={imageRef}
              src={modalSrc}
              alt={alt}
              className="max-w-none select-none"
              style={{
                transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
                transition: isDragging || isPinching ? 'none' : 'transform 0.2s ease-out'
              }}
              draggable={false}
              onError={onError}
            />
          </div>

          {/* Instructions */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-50 text-white px-4 py-2 rounded-full text-sm text-center">
            <div className="hidden md:block">
              Scroll to zoom • Drag to pan • Click outside to close
            </div>
            <div className="block md:hidden">
              Pinch to zoom • Drag to pan • Tap X to close
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ZoomableImageV2;


