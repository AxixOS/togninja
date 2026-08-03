import React, { useState, useRef, useEffect } from 'react';
import { Move, RotateCcw, Check, X } from 'lucide-react';

interface CoverImagePositionerProps {
  imageUrl: string;
  initialPosition?: { x: number; y: number };
  onPositionChange: (position: { x: number; y: number }) => void;
  onCancel?: () => void;
  aspectRatio?: number; // width/height ratio of the container
}

/**
 * A component that allows users to position a cover image by setting a focal point.
 * The focal point determines which part of the image remains visible when cropped.
 * Position values are percentages (0-100) from top-left corner.
 */
const CoverImagePositioner: React.FC<CoverImagePositionerProps> = ({
  imageUrl,
  initialPosition = { x: 50, y: 50 },
  onPositionChange,
  onCancel,
  aspectRatio = 4 / 3
}) => {
  const [position, setPosition] = useState(initialPosition);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Reset position when image changes
  useEffect(() => {
    setPosition(initialPosition);
    setImageLoaded(false);
  }, [imageUrl, initialPosition]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    updatePosition(e);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      updatePosition(e);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    updatePositionFromTouch(e);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isDragging) {
      updatePositionFromTouch(e);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const updatePosition = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    
    setPosition({ x, y });
  };

  const updatePositionFromTouch = (e: React.TouchEvent) => {
    if (!containerRef.current || !e.touches[0]) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const touch = e.touches[0];
    const x = Math.max(0, Math.min(100, ((touch.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((touch.clientY - rect.top) / rect.height) * 100));
    
    setPosition({ x, y });
  };

  const handleReset = () => {
    setPosition({ x: 50, y: 50 });
  };

  const handleSave = () => {
    onPositionChange(position);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Move size={16} />
          <span>Drag to set the focal point of your cover image</span>
        </div>
        <div className="text-xs text-gray-400">
          Position: {Math.round(position.x)}%, {Math.round(position.y)}%
        </div>
      </div>
      
      {/* Full Image with Focal Point Marker */}
      <div 
        ref={containerRef}
        className="relative cursor-crosshair select-none border-2 border-gray-200 rounded-lg overflow-hidden"
        style={{ aspectRatio: '16/9' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <img
          src={imageUrl}
          alt="Cover image"
          className="w-full h-full object-cover"
          style={{ objectPosition: '50% 50%' }}
          onLoad={() => setImageLoaded(true)}
          draggable={false}
        />
        
        {/* Focal Point Marker */}
        {imageLoaded && (
          <div
            className="absolute w-8 h-8 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
            style={{ left: `${position.x}%`, top: `${position.y}%` }}
          >
            {/* Crosshair */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-full h-0.5 bg-white shadow-lg" />
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-0.5 h-full bg-white shadow-lg" />
            </div>
            {/* Circle */}
            <div className="absolute inset-1 rounded-full border-2 border-white shadow-lg" />
            <div className="absolute inset-2 rounded-full bg-purple-500 opacity-60" />
          </div>
        )}
        
        {/* Overlay showing crop preview area */}
        <div 
          className="absolute inset-0 border-4 border-purple-500 border-dashed opacity-30 pointer-events-none"
          style={{
            // Show the visible area based on the aspect ratio
          }}
        />
      </div>

      {/* Preview Section */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-gray-700">Preview how customers will see it:</p>
        <div className="grid grid-cols-3 gap-4">
          {/* Gallery Card Preview */}
          <div className="space-y-1">
            <p className="text-xs text-gray-500 text-center">Gallery Card</p>
            <div 
              className="relative overflow-hidden rounded-lg border border-gray-200"
              style={{ aspectRatio: '4/3' }}
            >
              <img
                src={imageUrl}
                alt="Card preview"
                className="w-full h-full object-cover"
                style={{ objectPosition: `${position.x}% ${position.y}%` }}
                draggable={false}
              />
            </div>
          </div>
          
          {/* Wide Banner Preview */}
          <div className="space-y-1">
            <p className="text-xs text-gray-500 text-center">Wide Banner</p>
            <div 
              className="relative overflow-hidden rounded-lg border border-gray-200"
              style={{ aspectRatio: '21/9' }}
            >
              <img
                src={imageUrl}
                alt="Banner preview"
                className="w-full h-full object-cover"
                style={{ objectPosition: `${position.x}% ${position.y}%` }}
                draggable={false}
              />
            </div>
          </div>
          
          {/* Square Preview */}
          <div className="space-y-1">
            <p className="text-xs text-gray-500 text-center">Square</p>
            <div 
              className="relative overflow-hidden rounded-lg border border-gray-200"
              style={{ aspectRatio: '1/1' }}
            >
              <img
                src={imageUrl}
                alt="Square preview"
                className="w-full h-full object-cover"
                style={{ objectPosition: `${position.x}% ${position.y}%` }}
                draggable={false}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-2 border-t">
        <button
          type="button"
          onClick={handleReset}
          className="flex items-center gap-1 px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <RotateCcw size={14} />
          Reset to Center
        </button>
        
        <div className="flex items-center gap-2">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="flex items-center gap-1 px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg transition-colors"
            >
              <X size={14} />
              Cancel
            </button>
          )}
          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-1 px-4 py-2 text-sm text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
          >
            <Check size={14} />
            Save Position
          </button>
        </div>
      </div>
    </div>
  );
};

export default CoverImagePositioner;
