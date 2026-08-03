/**
 * Persistent cache utilities using localStorage
 * Provides persistent caching for React Query to prevent image flashing
 */

interface CachedData<T> {
  data: T;
  timestamp: number;
}

/**
 * Retrieve cached data from localStorage
 * @param key - Cache key
 * @param maxAgeMs - Maximum age in milliseconds before cache is considered stale
 * @returns Cached data or undefined if not found/expired
 */
export function getCachedData<T>(key: string, maxAgeMs: number): T | undefined {
  try {
    const cached = localStorage.getItem(key);
    if (!cached) return undefined;
    
    const parsed: CachedData<T> = JSON.parse(cached);
    
    // Check if cache has expired
    if (Date.now() - parsed.timestamp > maxAgeMs) {
      localStorage.removeItem(key);
      return undefined;
    }
    
    return parsed.data;
  } catch (error) {
    // Silently fail and return undefined on any error
    console.warn(`Failed to retrieve cached data for key: ${key}`, error);
    return undefined;
  }
}

/**
 * Store data in localStorage with timestamp
 * @param key - Cache key
 * @param data - Data to cache
 */
export function setCachedData(key: string, data: any): void {
  try {
    const cacheEntry: CachedData<any> = {
      data,
      timestamp: Date.now()
    };
    
    localStorage.setItem(key, JSON.stringify(cacheEntry));
  } catch (error) {
    // Silently fail on storage errors (e.g., quota exceeded)
    console.warn(`Failed to cache data for key: ${key}`, error);
  }
}

/**
 * Clear specific cache entry
 * @param key - Cache key to clear
 */
export function clearCachedData(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.warn(`Failed to clear cache for key: ${key}`, error);
  }
}

/**
 * Clear all cache entries matching a prefix
 * @param prefix - Key prefix to match
 */
export function clearCachedDataByPrefix(prefix: string): void {
  try {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(prefix)) {
        localStorage.removeItem(key);
      }
    });
  } catch (error) {
    console.warn(`Failed to clear cache by prefix: ${prefix}`, error);
  }
}


