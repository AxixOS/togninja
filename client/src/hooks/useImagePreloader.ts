import { useEffect } from 'react';

/**
 * Hook to preload images in the background
 * This ensures images are cached in the browser before they're needed,
 * further preventing any visual flashing when images are rendered
 * 
 * @param urls - Array of image URLs to preload
 */
export function useImagePreloader(urls: string[]): void {
  useEffect(() => {
    // Filter out empty/invalid URLs
    const validUrls = urls.filter(url => url && typeof url === 'string' && url.trim().length > 0);
    
    if (validUrls.length === 0) return;
    
    // Preload each image
    const images: HTMLImageElement[] = [];
    
    validUrls.forEach(url => {
      try {
        const img = new Image();
        img.src = url;
        images.push(img);
        
        // Optional: Add loading handlers for debugging
        img.onload = () => {
          console.debug(`Preloaded image: ${url}`);
        };
        
        img.onerror = () => {
          console.warn(`Failed to preload image: ${url}`);
        };
      } catch (error) {
        console.warn(`Error preloading image: ${url}`, error);
      }
    });
    
    // Cleanup function (though images persist in browser cache)
    return () => {
      images.forEach(img => {
        img.src = '';
      });
    };
  }, [urls]);
}


