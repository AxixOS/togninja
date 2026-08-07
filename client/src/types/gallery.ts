export interface CoverTemplateSettings {
  templateId: string;
  category?: 'full-cover' | 'split-layout' | 'minimal' | 'creative' | 'collage';
  textPosition: 'top-left' | 'top-center' | 'top-right' | 'center' | 'bottom-left' | 'bottom-center' | 'bottom-right' | 'left-center' | 'right-center';
  textAlignment: 'left' | 'center' | 'right';
  overlay: 'none' | 'dark' | 'light' | 'gradient-bottom' | 'gradient-top' | 'gradient-left' | 'gradient-right' | 'vignette' | 'cinematic';
  titleSize: 'small' | 'medium' | 'large' | 'xlarge' | 'xxlarge';
  showSubtitle: boolean;
  showButton: boolean;
  buttonStyle: 'solid' | 'outline' | 'pill' | 'minimal' | 'arrow';
  fontStyle: 'modern' | 'elegant' | 'bold' | 'minimal' | 'script' | 'vintage' | 'geometric';
  imageStyle: 'full' | 'left-half' | 'right-half' | 'top-half' | 'bottom-half' | 'inset' | 'portrait-left' | 'portrait-right' | 'circle-center' | 'diagonal';
  subtitle?: string;
  accentColor?: string;
  borderStyle?: 'none' | 'thin' | 'thick' | 'double';
}

export interface Gallery {
  id: string;
  title: string;
  slug: string;
  description?: string;
  coverImage: string | null;
  coverPosition?: { x: number; y: number };
  coverScale?: number;
  coverTemplate?: CoverTemplateSettings;
  featuredImage?: GalleryImage | null;
  isPublic?: boolean;
  isPasswordProtected?: boolean;
  password?: string | null;
  clientId?: string;
  createdBy?: string;
  sortOrder?: number;
  createdAt: string;
  updatedAt: string;
  // Legacy fields for backward compatibility
  downloadEnabled?: boolean;
  watermarkEnabled?: boolean;
  maxDownloadsPerVisitor?: number;
  expiresAt?: string;
  clientEmail?: string;
  isFeatured?: boolean;
}

export interface GalleryImage {
  id: string;
  galleryId: string;
  originalUrl: string;
  displayUrl: string;
  thumbUrl: string;
  filename: string;
  title?: string;
  description?: string;
  altText?: string;
  sizeBytes: number;
  width?: number;
  height?: number;
  contentType: string;
  cameraMake?: string;
  cameraModel?: string;
  lensModel?: string;
  focalLength?: string;
  aperture?: string;
  shutterSpeed?: string;
  iso?: number;
  capturedAt: string | null;
  orderIndex: number;
  isFeatured?: boolean;
  downloadCount?: number;
  viewCount?: number;
  favoriteCount?: number;
  createdAt: string;
  uploadedAt?: string;
  sharedToTogninja?: boolean;
  isFavorite?: boolean;
  rating?: 'love' | 'maybe' | 'reject' | null;
  slideshowSelected?: boolean;
}

export interface GalleryVisitor {
  id: string;
  galleryId: string;
  name?: string;
  email: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  accessToken: string;
  passwordAttempts?: number;
  lastAccess?: string;
  totalVisits?: number;
  totalDownloads?: number;
  isBlocked?: boolean;
  notes?: string;
  createdAt: string;
}

export interface ImageAction {
  id: string;
  visitorId: string;
  imageId: string;
  action: 'VIEW' | 'FAVORITE' | 'DOWNLOAD';
  createdAt: string;
}

export interface GalleryStats {
  totalVisitors: number;
  uniqueVisitors: number;
  totalViews: number;
  totalFavorites: number;
  totalDownloads: number;
  totalImages: number;
  dailyStats: {
    date: string;
    views: number;
    favorites: number;
    downloads: number;
  }[];
  topImages: {
    imageId: string;
    thumbUrl: string;
    views: number;
    favorites: number;
    downloads: number;
  }[];
}

export interface GalleryFormData {
  title: string;
  description?: string;
  password?: string;
  downloadEnabled: boolean;
  watermarkEnabled?: boolean;
  invisibleWatermarkEnabled?: boolean;
  // null clears the sunset date; undefined leaves it untouched.
  expiresAt?: string | null;
  status?: 'ACTIVE' | 'ARCHIVED' | 'SHARED';
  clientEmail?: string;
  isFeatured?: boolean;
  sortOrder?: number;
  coverImage?: File | null;
  coverImageUrl?: string; // Existing cover image URL (for updates without new file)
  coverPosition?: { x: number; y: number };
  coverScale?: number;
  coverTemplate?: CoverTemplateSettings;
  clientId?: string;
  isPublic?: boolean;
  isPasswordProtected?: boolean;
}

export interface GalleryAuthData {
  email: string;
  firstName?: string;
  lastName?: string;
  password?: string;
}

export interface GalleryAccessLog {
  id: string;
  galleryId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  accessedAt: string;
  ipAddress?: string;
  userAgent?: string;
}