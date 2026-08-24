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
    // camelCase throughout, and every delivery setting included.
    //
    // This object used to mix conventions — snake_case for client_id / is_public /
    // is_password_protected — and the server handed it straight to Drizzle, which
    // silently drops any key that is not a property of the table object and lets the
    // column default apply. Galleries were created unprotected AND public no matter
    // what the studio ticked. The server normalises both conventions now
    // (server/lib/galleryInput.ts); sending one consistently is the other half.
    const apiData = {
      title: galleryData.title,
      description: galleryData.description || null,
      slug: slug,
      coverImage: coverImageUrl,
      coverPosition: galleryData.coverPosition || { x: 50, y: 50 },
      coverScale: galleryData.coverScale || 100,
      coverTemplate: galleryData.coverTemplate || null,
      clientId: galleryData.clientId,
      isPublic: galleryData.isPublic,
      isPasswordProtected: galleryData.isPasswordProtected,
      password: galleryData.password,
      downloadEnabled: galleryData.downloadEnabled,
      watermarkEnabled: galleryData.watermarkEnabled,
      invisibleWatermarkEnabled: galleryData.invisibleWatermarkEnabled,
      expiresAt: galleryData.expiresAt,
      status: galleryData.status,
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
    // Every field the wizard can change. expiresAt, status and the two watermark
    // toggles were absent from this whitelist, so those controls appeared to save and
    // never did — the columns, the server-side field mapping and the enforcement all
    // existed; only this object literal was missing them.
    //
    // expiresAt is passed through as-is rather than defaulted: null CLEARS the sunset
    // date and undefined leaves it untouched, which is the contract GalleryFormData
    // documents, and `|| null` would collapse the two into one.
    const apiData = {
      title: galleryData.title,
      description: galleryData.description || null,
      coverImage: coverImageUrl,
      coverPosition: galleryData.coverPosition || { x: 50, y: 50 },
      coverScale: galleryData.coverScale || 100,
      coverTemplate: galleryData.coverTemplate || null,
      clientId: galleryData.clientId,
      isPublic: galleryData.isPublic,
      isPasswordProtected: galleryData.isPasswordProtected,
      password: galleryData.password,
      downloadEnabled: galleryData.downloadEnabled,
      watermarkEnabled: galleryData.watermarkEnabled,
      invisibleWatermarkEnabled: galleryData.invisibleWatermarkEnabled,
      expiresAt: galleryData.expiresAt,
      status: galleryData.status,
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
/**
 * When the gallery stops opening for the client. null clears it.
 *
 * Deliberately NOT updateGallery(): that takes a whole GalleryFormData, and a partial
 * object passed to it is one forgotten field away from blanking a title or a password
 * on what the studio thought was a date change. PUT /api/galleries/:id is a partial
 * update, so sending only this key is both correct and the smallest thing that can go
 * wrong. The server maps expiresAt -> expires_at and stores NULL for a falsy value.
 */
export async function setGalleryExpiry(id: string, expiresAt: string | null): Promise<void> {
  const response = await fetch(`/api/galleries/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ expiresAt }),
  });
  if (!response.ok) {
    // Carry the server's own words up to the dialog. A bare "failed" leaves the studio
    // with a screenshot and nothing to report.
    let detail = `HTTP ${response.status}`;
    try {
      const body = await response.json();
      detail = body?.message || body?.error || detail;
    } catch { /* not JSON */ }
    throw new Error(detail);
  }
}
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
/** Progress while a batched upload runs. */
export interface UploadProgress {
  uploaded: number;
  total: number;
  batch: number;
  batches: number;
}

// One request per batch, not one request for the whole shoot.
//
// This used to put every selected file into a single FormData and POST it once. The
// server accepts `upload.array("images", 50)` into multer MEMORY storage at 20MB a file,
// so a wedding photographer selecting their 400 delivered frames got a hard rejection
// after the 50th — and the 50 that were allowed would have sat in RAM together, up to a
// gigabyte, which is an OOM kill on a small dyno rather than an upload.
//
// Batching fixes three things at once: it stays under the per-request file cap, it bounds
// peak server memory, and it means a dropped connection costs one batch instead of the
// entire evening.
const MAX_FILES_PER_BATCH = 8;
// Also bound by BYTES, because eight 20MB frames is a very different request from eight
// 2MB ones, and it is the megabytes that exhaust the server, not the file count.
const MAX_BYTES_PER_BATCH = 24 * 1024 * 1024;

function batchFiles(files: File[]): File[][] {
  const batches: File[][] = [];
  let current: File[] = [];
  let bytes = 0;
  for (const file of files) {
    // A single file over the byte budget still gets its own batch — never dropped.
    if (current.length && (current.length >= MAX_FILES_PER_BATCH || bytes + file.size > MAX_BYTES_PER_BATCH)) {
      batches.push(current);
      current = [];
      bytes = 0;
    }
    current.push(file);
    bytes += file.size;
  }
  if (current.length) batches.push(current);
  return batches;
}

async function uploadOneBatch(galleryId: string, batch: File[]): Promise<GalleryImage[]> {
  const formData = new FormData();
  for (const file of batch) formData.append('images', file, file.name);

  const response = await fetch(`/api/galleries/${galleryId}/upload`, {
    method: 'POST',
    body: formData,
    credentials: 'include',
  });

  if (!response.ok) {
    let message = `Upload failed with status ${response.status}`;
    try {
      const error = await response.json();
      message = error.error || message;
      if (error.details) message += ` - ${error.details}`;
    } catch { /* the body was not JSON; the status is all we have */ }
    if (response.status === 401) throw new Error('Please sign in again — your session expired.');
    if (response.status === 413) throw new Error('One of these images is too large. The limit is 20MB per photo.');
    throw new Error(message);
  }

  const result = await response.json();
  if (!Array.isArray(result)) throw new Error('The server did not return the uploaded images.');
  return result;
}

/**
 * Upload images to a gallery, in batches, reporting progress as it goes.
 *
 * Throws only if NOTHING uploaded. A partial failure resolves with what did land and the
 * caller is told how many — losing 400 photographs because the 391st failed would be a
 * worse outcome than an honest partial result.
 */
export async function uploadGalleryImages(
  galleryId: string,
  files: File[],
  onProgress?: (p: UploadProgress) => void,
): Promise<GalleryImage[]> {
  if (!files || files.length === 0) throw new Error('No files selected for upload');

  const batches = batchFiles(files);
  const uploaded: GalleryImage[] = [];
  const failures: string[] = [];

  for (let i = 0; i < batches.length; i++) {
    try {
      const result = await uploadOneBatch(galleryId, batches[i]);
      uploaded.push(...result);
    } catch (err) {
      // One retry: the commonest cause of a mid-upload failure is a transient network
      // blip, and re-selecting four hundred files to redo one batch is not a fix.
      try {
        const result = await uploadOneBatch(galleryId, batches[i]);
        uploaded.push(...result);
      } catch (retryErr) {
        failures.push((retryErr as Error).message);
      }
    }
    // typeof, not just optional-chaining: a dead caller in this repo passed a STRING
    // as the third argument back when it was ignored, and reviving that path would have
    // turned a silently-discarded folder name into a TypeError mid-upload.
    if (typeof onProgress === 'function') {
      onProgress({ uploaded: uploaded.length, total: files.length, batch: i + 1, batches: batches.length });
    }
  }

  if (!uploaded.length) {
    throw new Error(failures[0] || `Upload failed — none of the ${files.length} images were saved.`);
  }
  if (uploaded.length < files.length) {
    console.warn(`[uploadGalleryImages] ${uploaded.length}/${files.length} uploaded; ${failures.length} batch(es) failed`);
  }
  return uploaded;
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
// POSTed to /api/galleries/images/:id/favorite, which has never existed — a 404 on every
// call. The real route is PATCH /api/galleries/:galleryId/images/:imageId/favorite, and
// it needs the gallery id because that is what the access token is checked against.
export async function toggleImageFavorite(
  galleryId: string,
  imageId: string,
  isFavorite: boolean,
  token: string,
): Promise<void> {
  try {
    const response = await fetch(`/api/galleries/${galleryId}/images/${imageId}/favorite`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ isFavorite }),
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