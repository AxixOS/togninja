export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  content: string; // Plain text content (required)
  content_html: string; // HTML content
  cover_image?: string; // Updated from image_url
  image_url_2?: string; // Feature image 2
  image_url_3?: string; // Feature image 3
  status: 'DRAFT' | 'PUBLISHED' | 'SCHEDULED'; // New status field
  published: boolean; // Kept for backward compatibility
  author_id: string;
  author?: {
    id: string;
    email: string;
  };
  published_at?: string;
  scheduled_for?: string; // New scheduled date field
  created_at: string;
  updated_at: string;
  seo_title?: string;
  meta_description?: string;
  tags?: string[];
  read_time?: number; // New estimated read time
  view_count?: number; // New view analytics
}

export interface BlogTag {
  id: string;
  name: string;
  slug: string;
  created_at?: string;
  updated_at?: string;
}

export interface BlogPostsResponse {
  posts: BlogPost[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface BlogPostFormData {
  title: string;
  excerpt?: string;
  contentHtml: string;
  coverImage?: string;
  imageUrl2?: string;
  imageUrl3?: string;
  tags?: string[];
  status: 'DRAFT' | 'PUBLISHED' | 'SCHEDULED';
  seoTitle?: string;
  metaDescription?: string;
  publishedAt?: string;
  scheduledFor?: string; // New scheduled date field
}