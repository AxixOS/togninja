import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, X, Heart, Download, Play, Pause, Maximize2 } from 'lucide-react';
import { GalleryImage } from '../../types/gallery';

interface SlideshowProps {
  images: GalleryImage[];
  startIndex: number;
  onClose: () => void;
  onToggleFavorite?: (imageId: string) => void;
  favorites?: Set<string>;
  downloadEnabled?: boolean;
  authToken?: string;
  galleryId?: string;
}

const Slideshow: React.FC<SlideshowProps> = ({ 
  images, 
  startIndex, 
  onClose, 
  onToggleFavorite,
  favorites = new Set(),
  downloadEnabled = true,
  authToken,
  galleryId
}) => {
  const [showIntro, setShowIntro] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(startIndex);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const currentImage = images[currentIndex];

  // Auto-hide intro after 3 seconds
  useEffect(() => {
    if (showIntro) {
      const timer = setTimeout(() => {
        setShowIntro(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showIntro]);

  const skipIntro = () => {
    setShowIntro(false);
  };
  const isFavorite = favorites.has(currentImage.id);

  // Navigation functions
  const next = useCallback(() => {
    setImageLoaded(false);
    setCurrentIndex((prev) => (prev + 1) % images.length);
  }, [images.length]);

  const previous = useCallback(() => {
    setImageLoaded(false);
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  }, [images.length]);

  const goToImage = useCallback((index: number) => {
    setImageLoaded(false);
    setCurrentIndex(index);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowLeft':
          previous();
          break;
        case 'ArrowRight':
          next();
          break;
        case 'Escape':
          onClose();
          break;
        case ' ':
          e.preventDefault();
          setIsPlaying(prev => !prev);
          break;
        case 'f':
        case 'F':
          toggleFullscreen();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [next, previous, onClose]);

  // Auto-advance slideshow
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      next();
    }, 3000); // 3 seconds per image

    return () => clearInterval(interval);
  }, [isPlaying, next]);

  // Fullscreen support
  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (err) {
      console.error('Fullscreen error:', err);
    }
  };

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Preload adjacent images
  useEffect(() => {
    const preloadImage = (index: number) => {
      if (index >= 0 && index < images.length) {
        const img = new Image();
        img.src = images[index].displayUrl || images[index].originalUrl;
      }
    };

    // Preload next and previous images
    preloadImage(currentIndex + 1);
    preloadImage(currentIndex - 1);
  }, [currentIndex, images]);

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = currentImage.originalUrl;
    link.download = currentImage.filename || `image-${currentIndex + 1}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFavoriteToggle = () => {
    if (onToggleFavorite) {
      onToggleFavorite(currentImage.id);
    }
  };

  const handleRating = async (rating: 'love' | 'maybe' | 'reject') => {
    if (!galleryId || !authToken) return;
    
    try {
      const response = await fetch(`/api/galleries/${galleryId}/images/${currentImage.id}/rating`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({ rating }),
      });

      if (!response.ok) {
        throw new Error('Failed to update rating');
      }

      // Update local state
      currentImage.rating = rating;
      
      // Force re-render by triggering next/previous (hacky but works)
      setImageLoaded(false);
      setTimeout(() => setImageLoaded(true), 10);
    } catch (error) {
      console.error('Error updating rating:', error);
      alert('Failed to update rating. Please try again.');
    }
  };

  // Intro screen render
  if (showIntro) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
        <div className="text-center animate-fade-in">
          {/* Logo/Brand */}
          <div className="mb-8 animate-scale-in">
            <div className="w-32 h-32 mx-auto bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mb-4 animate-pulse">
              <svg className="w-20 h-20 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h1 className="text-4xl font-bold text-white mb-2">Gallery Showcase</h1>
            <p className="text-gray-300 text-lg">Presenting {images.length} beautiful moments</p>
          </div>
          
          {/* Skip button */}
          <button
            onClick={skipIntro}
            className="mt-8 px-6 py-3 bg-white/20 hover:bg-white/30 text-white rounded-full backdrop-blur-sm transition-all"
          >
            Skip Intro →
          </button>
        </div>

        <style>{`
          @keyframes fade-in {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes scale-in {
            from { transform: scale(0.8); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
          }
          .animate-fade-in {
            animation: fade-in 1s ease-out;
          }
          .animate-scale-in {
            animation: scale-in 0.8s ease-out;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/80 to-transparent p-4 z-10">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          {/* Image Counter */}
          <div className="text-white text-sm font-medium">
            {currentIndex + 1} / {images.length}
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="text-white hover:text-gray-300 transition-colors p-2 rounded-lg hover:bg-white/10"
            title="Close (ESC)"
          >
            <X size={24} />
          </button>
        </div>
      </div>

      {/* Main Image Area */}
      <div className="flex-1 flex items-center justify-center relative px-16">
        {/* Previous Button */}
        <button
          onClick={previous}
          className="absolute left-4 text-white hover:text-gray-300 transition-colors z-10 p-3 rounded-full hover:bg-white/10"
          title="Previous (←)"
        >
          <ChevronLeft size={48} />
        </button>

        {/* Image Container */}
        <div className="relative max-w-full max-h-full flex items-center justify-center">
          {!imageLoaded && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
            </div>
          )}
          
          <img
            src={currentImage.displayUrl || currentImage.originalUrl}
            alt={currentImage.title || currentImage.filename}
            className={`max-w-full max-h-[85vh] object-contain transition-opacity duration-300 ${
              imageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageLoaded(true)}
          />
        </div>

        {/* Next Button */}
        <button
          onClick={next}
          className="absolute right-4 text-white hover:text-gray-300 transition-colors z-10 p-3 rounded-full hover:bg-white/10"
          title="Next (→)"
        >
          <ChevronRight size={48} />
        </button>
      </div>

      {/* Bottom Controls */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6 z-10">
        <div className="max-w-7xl mx-auto">
          {/* Image Info */}
          <div className="mb-4">
            {currentImage.title && (
              <h3 className="text-white text-lg font-semibold mb-1">
                {currentImage.title}
              </h3>
            )}
            {currentImage.description && (
              <p className="text-gray-300 text-sm">
                {currentImage.description}
              </p>
            )}
          </div>

          {/* Controls Row */}
          <div className="flex items-center justify-between">
            {/* Left Controls */}
            <div className="flex items-center gap-3">
              {/* Play/Pause */}
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-white transition-colors"
                title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
              >
                {isPlaying ? <Pause size={20} /> : <Play size={20} />}
                <span className="text-sm font-medium">
                  {isPlaying ? 'Pause' : 'Play'}
                </span>
              </button>

              {/* Fullscreen */}
              <button
                onClick={toggleFullscreen}
                className="p-2 bg-white/20 hover:bg-white/30 rounded-lg text-white transition-colors"
                title={isFullscreen ? 'Exit Fullscreen (F)' : 'Fullscreen (F)'}
              >
                <Maximize2 size={20} />
              </button>
            </div>

            {/* Right Controls */}
            <div className="flex items-center gap-3">
              {/* Rating Emojis */}
              {authToken && galleryId && (
                <div className="flex items-center gap-2 mr-2">
                  <button
                    onClick={() => handleRating('love')}
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-2xl shadow-lg transition-all ${
                      currentImage.rating === 'love' 
                        ? 'bg-green-500 scale-110 ring-2 ring-white' 
                        : 'bg-white/20 hover:bg-green-500/80 hover:scale-105'
                    }`}
                    title="Love it!"
                  >
                    😊
                  </button>
                  <button
                    onClick={() => handleRating('maybe')}
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-2xl shadow-lg transition-all ${
                      currentImage.rating === 'maybe' 
                        ? 'bg-yellow-400 scale-110 ring-2 ring-white' 
                        : 'bg-white/20 hover:bg-yellow-400/80 hover:scale-105'
                    }`}
                    title="Maybe"
                  >
                    😐
                  </button>
                  <button
                    onClick={() => handleRating('reject')}
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-2xl shadow-lg transition-all ${
                      currentImage.rating === 'reject' 
                        ? 'bg-red-500 scale-110 ring-2 ring-white' 
                        : 'bg-white/20 hover:bg-red-500/80 hover:scale-105'
                    }`}
                    title="Not for me"
                  >
                    ☹️
                  </button>
                </div>
              )}

              {/* Favorite */}
              {onToggleFavorite && (
                <button
                  onClick={handleFavoriteToggle}
                  className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                  title={isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
                >
                  <Heart
                    size={24}
                    className={isFavorite ? 'fill-red-500 text-red-500' : 'text-white'}
                  />
                </button>
              )}

              {/* Download */}
              {downloadEnabled && (
                <button
                  onClick={handleDownload}
                  className="p-2 bg-white/20 hover:bg-white/30 rounded-lg text-white transition-colors"
                  title="Download Image"
                >
                  <Download size={24} />
                </button>
              )}
            </div>
          </div>

          {/* Thumbnail Strip */}
          <div className="mt-6 overflow-x-auto scrollbar-hide">
            <div className="flex gap-2 pb-2">
              {images.map((image, index) => (
                <button
                  key={image.id}
                  onClick={() => goToImage(index)}
                  className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden transition-all ${
                    index === currentIndex
                      ? 'ring-2 ring-white scale-110'
                      : 'opacity-60 hover:opacity-100'
                  }`}
                >
                  <img
                    src={image.thumbUrl || image.displayUrl || image.originalUrl}
                    alt={image.title || `Image ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Keyboard Shortcuts Hint (fades out after 3 seconds) */}
      <div className="absolute top-20 left-1/2 transform -translate-x-1/2 bg-black/60 text-white px-4 py-2 rounded-lg text-sm animate-fade-out pointer-events-none">
        Use ← → arrows to navigate, Space to play/pause, ESC to close
      </div>
    </div>
  );
};

export default Slideshow;
