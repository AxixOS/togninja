import { supabase } from './supabase';
import { 
  Gallery, 
  GalleryImage, 
  GalleryVisitor, 
  GalleryStats, 
  GalleryFormData
} from '../types/gallery';

// Enhanced Gallery API using the galleries_enhanced table
export class GalleryEnhancedAPI {
  
  // Get all galleries (admin only)
  async getGalleries(): Promise<Gallery[]> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('Authentication required');
      }

      const { data, error } = await supabase
        .from('galleries_enhanced')
        .select(`
          *,
          gallery_images_enhanced(count)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      return (data || []).map(this.mapDatabaseToGallery);
    } catch (error) {
      // console.error removed
      throw error;
    }
  }

  // Get a single gallery by ID
  async getGalleryById(id: string): Promise<Gallery> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('Authentication required');
      }

      const { data, error } = await supabase
        .from('galleries_enhanced')
        .select(`
          *,
          gallery_images_enhanced(*)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return this.mapDatabaseToGallery(data);
    } catch (error) {
      // console.error removed
      throw error;
    }
  }

  // Create a new gallery
  async createGallery(galleryData: GalleryFormData): Promise<Gallery> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('Authentication required');
      }

      // Generate slug from title
      const slug = this.generateSlug(galleryData.title);

      const insertData = {
        title: galleryData.title,
        slug: slug,
        description: galleryData.description || null,
        password_hash: galleryData.password ? await this.hashPassword(galleryData.password) : null,
        download_enabled: galleryData.downloadEnabled ?? true,
        watermark_enabled: galleryData.watermarkEnabled ?? false,
        expires_at: galleryData.expiresAt || null,
        created_by: session.user.id,
        client_email: galleryData.clientEmail || null,
        is_featured: galleryData.isFeatured ?? false,
        sort_order: galleryData.sortOrder ?? 0
      };

      const { data: gallery, error } = await supabase
        .from('galleries_enhanced')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      return this.mapDatabaseToGallery(gallery);
    } catch (error) {
      // console.error removed
      throw error;
    }
  }

  // Update an existing gallery
  async updateGallery(id: string, galleryData: GalleryFormData): Promise<Gallery> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('Authentication required');
      }

      const updateData: any = {
        title: galleryData.title,
        description: galleryData.description || null,
        download_enabled: galleryData.downloadEnabled ?? true,
        watermark_enabled: galleryData.watermarkEnabled ?? false,
        expires_at: galleryData.expiresAt || null,
        client_email: galleryData.clientEmail || null,
        is_featured: galleryData.isFeatured ?? false,
        sort_order: galleryData.sortOrder ?? 0,
        updated_at: new Date().toISOString()
      };

      // Only update password if provided
      if (galleryData.password) {
        updateData.password_hash = await this.hashPassword(galleryData.password);
      }

      const { data, error } = await supabase
        .from('galleries_enhanced')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return this.mapDatabaseToGallery(data);
    } catch (error) {
      // console.error removed
      throw error;
    }
  }

  // Delete a gallery
  async deleteGallery(id: string): Promise<void> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('Authentication required');
      }

      const { error } = await supabase
        .from('galleries_enhanced')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      // console.error removed
      throw error;
    }
  }

  // Upload images to gallery
  async uploadImages(galleryId: string, files: File[]): Promise<GalleryImage[]> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('Authentication required');
      }

      const uploadedImages: GalleryImage[] = [];

      for (const file of files) {
        // Upload original image
        const originalPath = `galleries/${galleryId}/original/${file.name}`;
        const { data: originalUpload, error: originalError } = await supabase.storage
          .from('gallery-images')
          .upload(originalPath, file);

        if (originalError) throw originalError;

        // Create display and thumbnail versions
        const displayPath = await this.createDisplayVersion(file, galleryId);
        const thumbPath = await this.createThumbnailVersion(file, galleryId);

        // Extract metadata
        const metadata = await this.extractImageMetadata(file);

        // Save to database
        const imageData = {
          gallery_id: galleryId,
          original_url: originalUpload.path,
          display_url: displayPath,
          thumb_url: thumbPath,
          filename: file.name,
          size_bytes: file.size,
          content_type: file.type,
          width: metadata.width,
          height: metadata.height,
          camera_make: metadata.cameraMake,
          camera_model: metadata.cameraModel,
          lens_model: metadata.lensModel,
          focal_length: metadata.focalLength,
          aperture: metadata.aperture,
          shutter_speed: metadata.shutterSpeed,
          iso: metadata.iso,
          captured_at: metadata.capturedAt,
          order_index: uploadedImages.length
        };

        const { data: image, error: imageError } = await supabase
          .from('gallery_images_enhanced')
          .insert(imageData)
          .select()
          .single();

        if (imageError) throw imageError;
        uploadedImages.push(this.mapDatabaseToGalleryImage(image));
      }

      return uploadedImages;
    } catch (error) {
      // console.error removed
      throw error;
    }
  }

  // Get gallery images
  async getGalleryImages(galleryId: string): Promise<GalleryImage[]> {
    try {
      const { data, error } = await supabase
        .from('gallery_images_enhanced')
        .select('*')
        .eq('gallery_id', galleryId)
        .order('order_index', { ascending: true });

      if (error) throw error;
      return (data || []).map(this.mapDatabaseToGalleryImage);
    } catch (error) {
      // console.error removed
      throw error;
    }
  }

  // Share gallery with visitors
  async shareGallery(galleryId: string, visitors: { name?: string; email: string; phone?: string }[]): Promise<GalleryVisitor[]> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('Authentication required');
      }

      const visitorData = visitors.map(visitor => ({
        gallery_id: galleryId,
        name: visitor.name || null,
        email: visitor.email,
        phone: visitor.phone || null,
        access_token: crypto.randomUUID()
      }));

      const { data, error } = await supabase
        .from('gallery_visitors_enhanced')
        .insert(visitorData)
        .select();

      if (error) throw error;
      return (data || []).map(this.mapDatabaseToGalleryVisitor);
    } catch (error) {
      // console.error removed
      throw error;
    }
  }

  // Get gallery statistics
  async getGalleryStats(galleryId: string): Promise<GalleryStats> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('Authentication required');
      }

      // Get visitor count
      const { count: visitorCount } = await supabase
        .from('gallery_visitors_enhanced')
        .select('*', { count: 'exact', head: true })
        .eq('gallery_id', galleryId);

      // Get total views
      const { data: viewData } = await supabase
        .from('gallery_stats_daily_enhanced')
        .select('total_views')
        .eq('gallery_id', galleryId);

      const totalViews = viewData?.reduce((sum, day) => sum + day.total_views, 0) || 0;

      // Get total downloads
      const { data: downloadData } = await supabase
        .from('gallery_stats_daily_enhanced')
        .select('total_downloads')
        .eq('gallery_id', galleryId);

      const totalDownloads = downloadData?.reduce((sum, day) => sum + day.total_downloads, 0) || 0;      return {
        totalVisitors: visitorCount || 0,
        uniqueVisitors: visitorCount || 0,
        totalViews,
        totalDownloads,
        totalImages: 0, // Will be calculated from images
        totalFavorites: 0,
        dailyStats: [],
        topImages: []
      };
    } catch (error) {
      // console.error removed
      throw error;
    }
  }

  // Helper methods
  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^\w\s]/gi, '')
      .replace(/\s+/g, '-')
      .substring(0, 50);
  }

  private async hashPassword(password: string): Promise<string> {
    // Simple hash for now - in production, use bcrypt or similar
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  private async createDisplayVersion(file: File, galleryId: string): Promise<string> {
    // Create a 1920px version - simplified for now
    const displayPath = `galleries/${galleryId}/display/${file.name}`;
    const { data, error } = await supabase.storage
      .from('gallery-images')
      .upload(displayPath, file);
    
    if (error) throw error;
    return data.path;
  }

  private async createThumbnailVersion(file: File, galleryId: string): Promise<string> {
    // Create a 400px version - simplified for now
    const thumbPath = `galleries/${galleryId}/thumb/${file.name}`;
    const { data, error } = await supabase.storage
      .from('gallery-images')
      .upload(thumbPath, file);
    
    if (error) throw error;
    return data.path;
  }
  private async extractImageMetadata(_file: File): Promise<any> {
    // Extract EXIF data - simplified for now
    return {
      width: null,
      height: null,
      cameraMake: null,
      cameraModel: null,
      lensModel: null,
      focalLength: null,
      aperture: null,
      shutterSpeed: null,
      iso: null,
      capturedAt: null
    };
  }

  private mapDatabaseToGallery(data: any): Gallery {
    return {
      id: data.id,
      title: data.title,
      slug: data.slug,
      description: data.description,
      coverImage: data.cover_image,
      passwordHash: data.password_hash,
      downloadEnabled: data.download_enabled,
      watermarkEnabled: data.watermark_enabled,
      maxDownloadsPerVisitor: data.max_downloads_per_visitor,
      expiresAt: data.expires_at,
      clientId: data.created_by,
      clientEmail: data.client_email,
      isFeatured: data.is_featured,
      sortOrder: data.sort_order,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }

  private mapDatabaseToGalleryImage(data: any): GalleryImage {
    return {
      id: data.id,
      galleryId: data.gallery_id,
      originalUrl: data.original_url,
      displayUrl: data.display_url,
      thumbUrl: data.thumb_url,
      filename: data.filename,
      title: data.title,
      description: data.description,
      altText: data.alt_text,
      sizeBytes: data.size_bytes,
      width: data.width,
      height: data.height,
      contentType: data.content_type,
      cameraMake: data.camera_make,
      cameraModel: data.camera_model,
      lensModel: data.lens_model,
      focalLength: data.focal_length,
      aperture: data.aperture,
      shutterSpeed: data.shutter_speed,
      iso: data.iso,
      capturedAt: data.captured_at,
      orderIndex: data.order_index,
      isFeatured: data.is_featured,
      downloadCount: data.download_count,
      viewCount: data.view_count,
      favoriteCount: data.favorite_count,
      createdAt: data.created_at
    };
  }

  private mapDatabaseToGalleryVisitor(data: any): GalleryVisitor {
    return {
      id: data.id,
      galleryId: data.gallery_id,
      name: data.name,
      email: data.email,
      phone: data.phone,
      accessToken: data.access_token,
      passwordAttempts: data.password_attempts,
      lastAccess: data.last_access,
      totalVisits: data.total_visits,
      totalDownloads: data.total_downloads,
      isBlocked: data.is_blocked,
      notes: data.notes,
      createdAt: data.created_at
    };
  }
}

// Export singleton instance
export const galleryEnhancedAPI = new GalleryEnhancedAPI();
