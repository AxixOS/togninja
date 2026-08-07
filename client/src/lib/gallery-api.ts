import { 
  Gallery, 
  GalleryImage, 
  GalleryVisitor, 
  GalleryStats, 
  GalleryFormData,
  GalleryAuthData,
  GalleryAccessLog
} from '../types/gallery';

// Get all galleries (admin only)
export async function getGalleries(opts?: { trash?: boolean }): Promise<Gallery[]> {
  try {
    // Trash is a distinct server-side view; the default list excludes deleted galleries.
    const response = await fetch(`/api/admin/galleries${opts?.trash ? '?trash=true' : ''}`, {
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const galleries = await response.json();
    return galleries;
  } catch (error) {
    // console.error removed
    throw error;
  }
}

// Restore a gallery out of Trash.
export async function restoreGallery(id: string): Promise<void> {
  const res = await fetch(`/api/admin/galleries/${id}/restore`, {
    method: 'POST',
    credentials: 'include',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to restore gallery');
  }
}

// Permanently delete a gallery. Only valid once it is in Trash.
export async function deleteGalleryPermanently(id: string): Promise<void> {
  const res = await fetch(`/api/admin/galleries/${id}/permanent`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to delete gallery');
  }
}

// Get a single gallery by ID (admin only)
export async function getGalleryById(id: string): Promise<Gallery> {
  try {
    // Admin-only endpoint. This used to hit the PUBLIC /api/galleries/:slug route,
    // which applies the client-facing expiry gate and 410s on expired/archived
    // galleries — so the admin Edit page could not open them. credentials:'include'
    // so the session cookie is sent explicitly rather than relying on the default.
    const response = await fetch(`/api/admin/galleries/${id}`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      // Prefer the human-readable message over the error code, so the admin sees
      // "This gallery is no longer available." rather than "gallery_expired".
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || error.error || `Failed to fetch gallery (${response.status})`);
    }

    return await response.json();
  } catch (error) {
    // console.error removed
    throw error;
  }
}

// Get a single gallery by slug (public)
export async function getGalleryBySlug(slug: string): Promise<Gallery> {
  try {
    const response = await fetch(`/api/galleries/${slug}`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch gallery');
    }

    return await response.json();
  } catch (error) {
    // console.error removed
    throw error;
  }
}

// Create a new gallery (admin only)
export async function createGallery(galleryData: GalleryFormData): Promise<Gallery> {
  try {
    // console.log removed
    
    // Handle cover image conversion to data URL if provided
    let coverImageUrl = null;
    if (galleryData.coverImage) {
      try {
        const reader = new FileReader();
        const dataUrlPromise = new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(galleryData.coverImage!);
        });
        
        coverImageUrl = await dataUrlPromise;
        // console.log removed
      } catch (uploadError) {
        // console.error removed
      }
    }

    // Generate slug from title
    const slug = galleryData.title
      .toLowerCase()
      .replace(/[^\w\s]/gi, '')
      .replace(/\s+/g, '-')
      .substring(0, 50);

    // Prepare the data for the backend API
    const apiData = {
      title: galleryData.title,
      description: galleryData.description || null,
      slug: slug,
      coverImage: coverImageUrl,
      coverPosition: galleryData.coverPosition || { x: 50, y: 50 },
      coverScale: galleryData.coverScale || 100,
      coverTemplate: galleryData.coverTemplate || null,
      client_id: galleryData.clientId,
      is_public: galleryData.isPublic,
      is_password_protected: galleryData.isPasswordProtected,
      password: galleryData.password
    };

    // console.log removed

    const response = await fetch('/api/galleries', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(apiData),
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorData}`);
    }

    const gallery = await response.json();
    // console.log removed
    return gallery;
  } catch (error) {
    // console.error removed
    throw error;
  }
}

// Update an existing gallery (admin only)
export async function updateGallery(id: string, galleryData: GalleryFormData): Promise<Gallery> {
  try {
    // Handle cover image conversion to data URL if a new file is provided
    let coverImageUrl = galleryData.coverImageUrl || null; // Use existing URL by default
    
    if (galleryData.coverImage) {
      try {
        const reader = new FileReader();
        const dataUrlPromise = new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(galleryData.coverImage!);
        });
        
        coverImageUrl = await dataUrlPromise;
      } catch (uploadError) {
        console.error('Cover image conversion error:', uploadError);
      }
    }

    // Prepare the data for the backend API
    const apiData = {
      title: galleryData.title,
      description: galleryData.description || null,
      coverImage: coverImageUrl,
      coverPosition: galleryData.coverPosition || { x: 50, y: 50 },
      coverScale: galleryData.coverScale || 100,
      coverTemplate: galleryData.coverTemplate || null,
      client_id: galleryData.clientId,
      is_public: galleryData.isPublic,
      is_password_protected: galleryData.isPasswordProtected,
      password: galleryData.password,
      download_enabled: galleryData.downloadEnabled,
    };

    const response = await fetch(`/api/galleries/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(apiData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update gallery');
    }

    return await response.json();
  } catch (error) {
    // console.error removed
    throw error;
  }
}

// Delete a gallery (admin only)
export async function deleteGallery(id: string): Promise<void> {
  try {
    // console.log removed
    
    const response = await fetch(`/api/galleries/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // console.log removed

    if (!response.ok) {
      const errorData = await response.text();
      // console.error removed
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorData}`);
    }

    const result = await response.json();
    // console.log removed
  } catch (error) {
    // console.error removed
    throw error;
  }
}

// Upload images to a gallery (admin only)
export async function uploadGalleryImages(galleryId: string, files: File[]): Promise<GalleryImage[]> {
  try {
    console.log(`[uploadGalleryImages] Starting upload for gallery ${galleryId}`);
    console.log(`[uploadGalleryImages] Files received:`, files);
    console.log(`[uploadGalleryImages] Files count:`, files?.length || 0);
    
    if (!files || files.length === 0) {
      console.error('[uploadGalleryImages] No files to upload!');
      throw new Error('No files selected for upload');
    }
    
    const formData = new FormData();
    
    // Append each file to the form data
    files.forEach((file, index) => {
      console.log(`[uploadGalleryImages] Appending file ${index + 1}:`, file.name, file.type, file.size);
      formData.append('images', file, file.name);
    });

    console.log(`[uploadGalleryImages] FormData prepared with ${files.length} images for gallery ${galleryId}`);

    console.log(`[uploadGalleryImages] Sending request to /api/galleries/${galleryId}/upload`);
    const response = await fetch(`/api/galleries/${galleryId}/upload`, {
      method: 'POST',
      body: formData,
      credentials: 'include', // Include session cookies for authentication
    });

    console.log(`[uploadGalleryImages] Response status: ${response.status}`);
    
    if (!response.ok) {
      let errorMessage = `Upload failed with status ${response.status}`;
      try {
        const error = await response.json();
        console.error('[uploadGalleryImages] Upload failed:', error);
        errorMessage = error.error || errorMessage;
        if (error.details) {
          errorMessage += ` - ${error.details}`;
        }
      } catch (parseErr) {
        console.error('[uploadGalleryImages] Could not parse error response');
      }
      
      if (response.status === 401) {
        throw new Error('Authentication required - please log in as admin first');
      } else if (response.status === 413) {
        throw new Error('File too large - maximum size is 50MB per image');
      }
      throw new Error(errorMessage);
    }

    const result = await response.json();
    console.log(`[uploadGalleryImages] Response body:`, result);
    console.log(`[uploadGalleryImages] Result is array:`, Array.isArray(result));
    console.log(`[uploadGalleryImages] Result length:`, result?.length);
    
    if (!Array.isArray(result)) {
      console.error('[uploadGalleryImages] ERROR: Response is not an array!', result);
      throw new Error('Invalid response from server - expected array of uploaded images');
    }
    
    if (result.length === 0) {
      console.error('[uploadGalleryImages] ERROR: Server returned 0 uploaded images!');
      console.error('[uploadGalleryImages] This means all uploads failed on the server.');
      throw new Error(`Upload failed - server returned 0 images (tried to upload ${files.length} images). Check server logs for errors.`);
    }
    
    if (result.length < files.length) {
      console.warn(`[uploadGalleryImages] WARNING: Only ${result.length} out of ${files.length} images were uploaded successfully`);
    }
    
    console.log(`[uploadGalleryImages] Successfully uploaded ${result.length} images:`, result);
    return result;
  } catch (error) {
    console.error('[uploadGalleryImages] Upload error:', error);
    throw error;
  }
}

// Get images for a gallery (admin only)
export async function getGalleryImages(galleryId: string): Promise<GalleryImage[]> {
  try {
    // Use admin endpoint which works with gallery ID (not slug) and uses session auth
    const response = await fetch(`/api/admin/galleries/${galleryId}/images`, {
      credentials: 'include',
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch gallery images');
    }

    return await response.json();
  } catch (error) {
    // console.error removed
    throw error;
  }
}

// Get gallery visitors (admin only)
export async function getGalleryVisitors(galleryId: string): Promise<GalleryVisitor[]> {
  try {
    const response = await fetch(`/api/galleries/${galleryId}/visitors`);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch gallery visitors');
    }

    return await response.json();
  } catch (error) {
    // console.error removed
    throw error;
  }
}

// Get gallery access logs (admin only)
export async function getGalleryAccessLogs(galleryId: string): Promise<GalleryAccessLog[]> {
  try {
    const response = await fetch(`/api/galleries/${galleryId}/access-logs`);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch gallery access logs');
    }

    return await response.json();
  } catch (error) {
    // console.error removed
    throw error;
  }
}

// Update image order (admin only)
export async function updateImageOrder(galleryId: string, imageIds: string[]): Promise<void> {
  try {
    const response = await fetch(`/api/galleries/${galleryId}/images/reorder`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ imageIds }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update image order');
    }
  } catch (error) {
    // console.error removed
    throw error;
  }
}

// Delete an image (admin only)
export async function deleteGalleryImage(imageId: string): Promise<void> {
  try {
    const response = await fetch(`/api/galleries/images/${imageId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete image');
    }
  } catch (error) {
    // console.error removed
    throw error;
  }
}

// Set gallery cover image (admin only)
export async function setGalleryCoverImage(galleryId: string, imageId: string): Promise<void> {
  try {
    const response = await fetch(`/api/galleries/${galleryId}/cover-image`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ imageId }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to set cover image');
    }
  } catch (error) {
    // console.error removed
    throw error;
  }
}

// Set gallery featured image (admin only)
export async function setGalleryFeaturedImage(galleryId: string, imageId: string): Promise<void> {
  try {
    const response = await fetch(`/api/galleries/${galleryId}/featured-image`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ imageId }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to set featured image');
    }
  } catch (error) {
    // console.error removed
    throw error;
  }
}

// Get gallery stats (admin only)
export async function getGalleryStats(galleryId: string): Promise<GalleryStats> {
  try {
    const response = await fetch(`/api/galleries/${galleryId}/stats`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch gallery stats');
    }

    return await response.json();
  } catch (error) {
    // console.error removed
    throw error;
  }
}

// PUBLIC GALLERY ACCESS FUNCTIONS

// Authenticate to a gallery (public)
export async function authenticateGallery(slug: string, authData: GalleryAuthData): Promise<{ token: string }> {
  try {
    const response = await fetch(`/api/galleries/${slug}/auth`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(authData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Authentication failed');
    }

    return await response.json();
  } catch (error) {
    // console.error removed
    throw error;
  }
}

// Get images for a public gallery (requires JWT)
export async function getPublicGalleryImages(slug: string, token: string): Promise<GalleryImage[]> {
  try {
    const response = await fetch(`/api/galleries/${slug}/images`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch gallery images');
    }

    return await response.json();
  } catch (error) {
    // console.error removed
    throw error;
  }
}

// Toggle favorite status for an image (requires JWT)
export async function toggleImageFavorite(imageId: string, token: string): Promise<void> {
  try {
    const response = await fetch(`/api/galleries/images/${imageId}/favorite`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to toggle favorite status');
    }
  } catch (error) {
    // console.error removed
    throw error;
  }
}

// Download a gallery as ZIP (requires JWT)
export async function downloadGallery(slug: string, token: string): Promise<Blob> {
  try {
    const response = await fetch(`/api/galleries/${slug}/download`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to download gallery');
    }

    return await response.blob();
  } catch (error) {
    // console.error removed
    throw error;
  }
}

// Share gallery via email (admin)
export async function sendGalleryEmail(params: { galleryId?: string; slug?: string; to: string; message?: string; galleryUrl?: string }): Promise<{ ok: boolean; link: string }> {
  const res = await fetch('/api/galleries/send-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ gallery_id: params.galleryId, slug: params.slug, to: params.to, message: params.message, gallery_url: params.galleryUrl }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'Failed to send email');
  return data;
}

// Share gallery via WhatsApp (admin)
export async function sendGalleryWhatsApp(params: { galleryId?: string; slug?: string; toPhone?: string; galleryUrl?: string }): Promise<{ ok: boolean; sent: boolean; link: string; share?: string }> {
  const res = await fetch('/api/galleries/send-whatsapp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ gallery_id: params.galleryId, slug: params.slug, to_phone: params.toPhone, gallery_url: params.galleryUrl }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'Failed to send WhatsApp');
  return data;
}

// Share gallery via SMS (admin)
export async function sendGallerySms(params: { galleryId?: string; slug?: string; toPhone: string; galleryUrl?: string }): Promise<{ ok: boolean; sent: boolean; link: string; info?: string }> {
  const res = await fetch('/api/galleries/send-sms', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ gallery_id: params.galleryId, slug: params.slug, to_phone: params.toPhone, gallery_url: params.galleryUrl }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'Failed to send SMS');
  return data;
}

// Get all public galleries (no authentication required)
export async function getPublicGalleries(limit?: number): Promise<Gallery[]> {
  try {
    const response = await fetch('/api/galleries');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const galleries = await response.json();
    
    // Apply limit if specified
    const result = limit ? galleries.slice(0, limit) : galleries;
    
    return result;
  } catch (error) {
    // console.error removed
    throw error;
  }
}

// HELPER FUNCTIONS

// Hash a password
async function hashPassword(password: string): Promise<string> {
  // In a real implementation, this would use bcrypt
  // For now, we'll just use a simple hash
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Upload a cover image for a gallery
async function uploadGalleryCoverImage(galleryId: string, file: File): Promise<string> {
  try {
    const formData = new FormData();
    formData.append('coverImage', file);
    
    const response = await fetch(`/api/galleries/${galleryId}/cover-upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to upload cover image');
    }

    const { url } = await response.json();
    return url;
  } catch (error) {
    // console.error removed
    throw error;
  }
}

// Helper function to map database schema (snake_case) to TypeScript interface (camelCase)
function mapDatabaseToGallery(dbGallery: any): Gallery {
  return {
    id: dbGallery.id,
    title: dbGallery.title,
    slug: dbGallery.slug || dbGallery.title.toLowerCase().replace(/[^\w\s]/gi, '').replace(/\s+/g, '-'),
    description: dbGallery.description,
    coverImage: dbGallery.cover_image || dbGallery.coverImage || null,
    isPublic: dbGallery.is_public ?? dbGallery.isPublic ?? true,
    isPasswordProtected: dbGallery.is_password_protected ?? dbGallery.isPasswordProtected ?? false,
    password: dbGallery.password || null,
    clientId: dbGallery.client_id || dbGallery.clientId,
    createdBy: dbGallery.created_by || dbGallery.createdBy,
    sortOrder: dbGallery.sort_order || dbGallery.sortOrder || 0,
    createdAt: dbGallery.created_at || dbGallery.createdAt,
    updatedAt: dbGallery.updated_at || dbGallery.updatedAt || dbGallery.created_at || dbGallery.createdAt
  };
}