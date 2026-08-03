import { supabase } from './supabase';
import { BlogPost, BlogTag, BlogPostFormData, BlogPostsResponse } from '../types/blog';

// Get posts with pagination and optional filters
export async function getPosts(
  page = 1,
  limit = 10,
  tag?: string,
  search?: string,
  status: 'DRAFT' | 'PUBLISHED' | 'SCHEDULED' | 'all' = 'PUBLISHED'
): Promise<BlogPostsResponse> {
  try {
    let query = supabase
      .from('blog_posts')
      .select('*', { count: 'exact' });
    
    // Filter by status
    if (status !== 'all') {
      if (status === 'PUBLISHED') {
        // For published posts, also check that they're not scheduled for future
        query = query.eq('status', 'PUBLISHED')
          .or('published_at.is.null,published_at.lte.' + new Date().toISOString());
      } else {
        query = query.eq('status', status);
      }
    }
    
    // Search by title or content
    if (search) {
      query = query.or(`title.ilike.%${search}%,content_html.ilike.%${search}%,excerpt.ilike.%${search}%`);
    }
    
    // Filter by tag
    if (tag) {
      query = query.contains('tags', [tag]);
    }
    
    // Pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    
    // Get paginated data
    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(from, to);
    
    if (error) throw error;
    
    const totalPages = Math.ceil((count || 0) / limit);
    
    return {
      posts: data || [],
      total: count || 0,
      page,
      limit,
      totalPages
    };
  } catch (error) {
    // console.error removed
    throw error;
  }
}

// Get a single post by slug
export async function getPostBySlug(slug: string): Promise<BlogPost> {
  try {
    const { data, error } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('slug', slug)
      .eq('status', 'PUBLISHED')
      .or('published_at.is.null,published_at.lte.' + new Date().toISOString())
      .single();
    
    if (error) throw error;
    
    // Increment view count
    await supabase.rpc('increment_post_views', { post_id: data.id });
    
    return data;
  } catch (error) {
    // console.error removed
    throw error;
  }
}

// Helper function to strip HTML tags for plain text content
function stripHtml(html: string): string {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
}

// Create a new post (admin only)
export async function createPost(postData: BlogPostFormData): Promise<BlogPost> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      throw new Error('Authentication required');
    }

    // Generate slug from title if not provided
    const slug = postData.title.toLowerCase()
      .replace(/[^\w\s]/gi, '')
      .replace(/\s+/g, '-');
    
    // Ensure we have content - use contentHtml or fallback to empty string
    const contentHtml = postData.contentHtml || '';
    const plainTextContent = stripHtml(contentHtml);
    
    // Calculate estimated read time (average 200 words per minute)
    const wordCount = plainTextContent.split(/\s+/).length;
    const readTime = Math.ceil(wordCount / 200);
    
    // Prepare data for insertion
    const newPost = {
      title: postData.title,
      slug: slug,
      excerpt: postData.excerpt || null,
      content: plainTextContent, // Required non-null field
      content_html: contentHtml,
      cover_image: postData.coverImage || null,
      status: postData.status || 'DRAFT',
      author_id: session.user.id,
      published_at: postData.status === 'PUBLISHED' ? new Date().toISOString() : postData.publishedAt || null,
      scheduled_for: postData.status === 'SCHEDULED' ? postData.scheduledFor : null,
      seo_title: postData.seoTitle || null,
      meta_description: postData.metaDescription || null,
      tags: postData.tags || [],
      read_time: readTime,
      view_count: 0
    };
    
    const { data, error } = await supabase
      .from('blog_posts')
      .insert(newPost)
      .select()
      .single();
    
    if (error) throw error;
    
    return data;
  } catch (error) {
    // console.error removed
    throw error;
  }
}

// Update an existing post (admin only)
export async function updatePost(id: string, postData: BlogPostFormData): Promise<BlogPost> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      throw new Error('Authentication required');
    }

    // Ensure we have content - use contentHtml or fallback to empty string
    const contentHtml = postData.contentHtml || '';
    const plainTextContent = stripHtml(contentHtml);

    // Calculate estimated read time (average 200 words per minute)
    const wordCount = plainTextContent.split(/\s+/).length;
    const readTime = Math.ceil(wordCount / 200);

    // Prepare data for update
    const updateData: any = {
      title: postData.title,
      excerpt: postData.excerpt || null,
      content: plainTextContent, // Required non-null field
      content_html: contentHtml,
      status: postData.status || 'DRAFT',
      updated_at: new Date().toISOString(),
      seo_title: postData.seoTitle || null,
      meta_description: postData.metaDescription || null,
      tags: postData.tags || [],
      read_time: readTime
    };
    
    // Only update these fields if they are provided
    if (postData.coverImage) {
      updateData.cover_image = postData.coverImage;
    }
    
    // Set published_at if status is PUBLISHED and it wasn't before
    if (postData.status === 'PUBLISHED' && !postData.publishedAt) {
      updateData.published_at = new Date().toISOString();
    } else if (postData.publishedAt) {
      updateData.published_at = postData.publishedAt;
    }
    
    // Set scheduled_for if status is SCHEDULED
    if (postData.status === 'SCHEDULED' && postData.scheduledFor) {
      updateData.scheduled_for = postData.scheduledFor;
    }
    
    const { data, error } = await supabase
      .from('blog_posts')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    
    return data;
  } catch (error) {
    // console.error removed
    throw error;
  }
}

// Delete a post (admin only)
export async function deletePost(id: string): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      throw new Error('Authentication required');
    }

    const { error } = await supabase
      .from('blog_posts')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  } catch (error) {
    // console.error removed
    throw error;
  }
}

// Publish a post (admin only)
export async function publishPost(id: string): Promise<BlogPost> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      throw new Error('Authentication required');
    }

    const { data, error } = await supabase
      .from('blog_posts')
      .update({
        status: 'PUBLISHED',
        published_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    
    return data;
  } catch (error) {
    // console.error removed
    throw error;
  }
}

// Schedule a post for future publishing (admin only)
export async function schedulePost(id: string, publishDate: Date): Promise<BlogPost> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      throw new Error('Authentication required');
    }

    const { data, error } = await supabase
      .from('blog_posts')
      .update({
        status: 'SCHEDULED',
        scheduled_for: publishDate.toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    
    return data;
  } catch (error) {
    // console.error removed
    throw error;
  }
}

// Upload an image for a blog post (admin only)
export async function uploadImage(file: File): Promise<string> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      throw new Error('Authentication required');
    }

    // Generate a unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
    const filePath = `blog/${fileName}`;
    
    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('images')
      .upload(filePath, file);
    
    if (uploadError) throw uploadError;
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('images')
      .getPublicUrl(filePath);
    
    return publicUrl;
  } catch (error) {
    // console.error removed
    throw error;
  }
}

// Get all tags
export async function getTags(): Promise<BlogTag[]> {
  try {
    const { data, error } = await supabase
      .from('blog_tags')
      .select('*')
      .order('name');
    
    if (error) throw error;
    
    return data || [];
  } catch (error) {
    // console.error removed
    throw error;
  }
}

// Create a new tag (admin only)
export async function createTag(name: string): Promise<BlogTag> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      throw new Error('Authentication required');
    }

    // Generate slug from name
    const slug = name.toLowerCase()
      .replace(/[^\w\s]/gi, '')
      .replace(/\s+/g, '-');
    
    const { data, error } = await supabase
      .from('blog_tags')
      .insert({ name, slug })
      .select()
      .single();
    
    if (error) throw error;
    
    return data;
  } catch (error) {
    // console.error removed
    throw error;
  }
}

// Get comments for a blog post
export async function getPostComments(postId: string): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('blog_comments')
      .select(`
        *,
        author:profiles(id, email, full_name)
      `)
      .eq('post_id', postId)
      .eq('status', 'approved')
      .order('created_at', { ascending: true });
    
    if (error) throw error;
    
    return data || [];
  } catch (error) {
    // console.error removed
    throw error;
  }
}

// Create a new comment
export async function createComment(postId: string, content: string, authorName?: string, authorEmail?: string): Promise<any> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    const commentData: any = {
      post_id: postId,
      content,
      status: 'pending' // All comments start as pending
    };
    
    if (session?.user) {
      // Authenticated user
      commentData.author_id = session.user.id;
    } else {
      // Anonymous comment
      if (!authorName || !authorEmail) {
        throw new Error('Author name and email are required for anonymous comments');
      }
      commentData.author_name = authorName;
      commentData.author_email = authorEmail;
    }
    
    const { data, error } = await supabase
      .from('blog_comments')
      .insert(commentData)
      .select()
      .single();
    
    if (error) throw error;
    
    return data;
  } catch (error) {
    // console.error removed
    throw error;
  }
}

// Get blog analytics (admin only)
export async function getBlogAnalytics(): Promise<any> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      throw new Error('Authentication required');
    }

    // Get post counts by status
    const { data: statusCounts, error: statusError } = await supabase
      .from('blog_posts')
      .select('status')
      .then(({ data, error }) => {
        if (error) throw error;
        const counts = data.reduce((acc: any, post: any) => {
          acc[post.status] = (acc[post.status] || 0) + 1;
          return acc;
        }, {});
        return { data: counts, error: null };
      });

    if (statusError) throw statusError;

    // Get total views
    const { data: viewsData, error: viewsError } = await supabase
      .from('blog_posts')
      .select('view_count')
      .then(({ data, error }) => {
        if (error) throw error;
        const totalViews = data.reduce((sum: number, post: any) => sum + (post.view_count || 0), 0);
        return { data: totalViews, error: null };
      });

    if (viewsError) throw viewsError;

    // Get comment counts
    const { data: commentCounts, error: commentError } = await supabase
      .from('blog_comments')
      .select('status')
      .then(({ data, error }) => {
        if (error) throw error;
        const counts = data.reduce((acc: any, comment: any) => {
          acc[comment.status] = (acc[comment.status] || 0) + 1;
          return acc;
        }, {});
        return { data: counts, error: null };
      });

    if (commentError) throw commentError;

    return {
      posts: statusCounts,
      totalViews: viewsData,
      comments: commentCounts
    };
  } catch (error) {
    // console.error removed
    throw error;
  }
}

// Get popular posts (most viewed)
export async function getPopularPosts(limit = 5): Promise<BlogPost[]> {
  try {
    const { data, error } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('status', 'PUBLISHED')
      .order('view_count', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    
    return data || [];
  } catch (error) {
    // console.error removed
    throw error;
  }
}

// Search posts with advanced filters
export async function searchPosts(
  query: string,
  filters: {
    tags?: string[];
    status?: string;
    dateFrom?: string;
    dateTo?: string;
  } = {}
): Promise<BlogPost[]> {
  try {
    let supabaseQuery = supabase
      .from('blog_posts')
      .select('*')
      .or(`title.ilike.%${query}%,content.ilike.%${query}%,excerpt.ilike.%${query}%`);

    if (filters.status) {
      supabaseQuery = supabaseQuery.eq('status', filters.status);
    }

    if (filters.tags && filters.tags.length > 0) {
      supabaseQuery = supabaseQuery.overlaps('tags', filters.tags);
    }

    if (filters.dateFrom) {
      supabaseQuery = supabaseQuery.gte('created_at', filters.dateFrom);
    }

    if (filters.dateTo) {
      supabaseQuery = supabaseQuery.lte('created_at', filters.dateTo);
    }

    const { data, error } = await supabaseQuery.order('created_at', { ascending: false });
    
    if (error) throw error;
    
    return data || [];
  } catch (error) {
    // console.error removed
    throw error;
  }
}