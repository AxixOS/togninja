import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Image as ImageIcon, Save, Send, Clock, AlertCircle, Loader2 } from 'lucide-react';
import RichTextEditor from './RichTextEditor';
import TagSelector from './TagSelector';
import { BlogPostFormData, BlogPost } from '../../types/blog';
import { createPost, updatePost, publishPost, schedulePost, uploadImage } from '../../lib/blog-api';

interface BlogPostFormProps {
  initialData?: BlogPost;
  isEdit?: boolean;
}

const BlogPostForm: React.FC<BlogPostFormProps> = ({ initialData, isEdit = false }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<BlogPostFormData>({
    title: '',
    excerpt: '',
    contentHtml: '',
    coverImage: '',
    tags: [],
    status: 'DRAFT',
    seoTitle: '',
    metaDescription: '',
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [scheduleDate, setScheduleDate] = useState<string>('');
  const [imageUploading, setImageUploading] = useState(false);
  
  // Initialize form with existing data if editing
  useEffect(() => {
    if (initialData) {
      setFormData({
        title: initialData.title || '',
        excerpt: initialData.excerpt || '',
        contentHtml: initialData.content_html || '',
        coverImage: initialData.cover_image || '',
        tags: initialData.tags?.map(tag => tag.id) || [],
        status: initialData.status || 'DRAFT',
        seoTitle: initialData.seo_title || '',
        metaDescription: initialData.meta_description || '',
        publishedAt: initialData.published_at,
      });
      
      // Set schedule date if post is scheduled
      if (initialData.status === 'SCHEDULED' && initialData.published_at) {
        const date = new Date(initialData.published_at);
        setScheduleDate(date.toISOString().slice(0, 16));
      }
    }
  }, [initialData]);
  
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }
    
    if (!formData.contentHtml.trim()) {
      newErrors.contentHtml = 'Content is required';
    }
    
    if (showScheduleForm && !scheduleDate) {
      newErrors.scheduleDate = 'Schedule date is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when field is edited
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };
  
  const handleContentChange = (html: string) => {
    setFormData(prev => ({ ...prev, contentHtml: html }));
    
    // Clear error when content is edited
    if (errors.contentHtml) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.contentHtml;
        return newErrors;
      });
    }
  };
  
  const handleTagsChange = (selectedTags: string[]) => {
    setFormData(prev => ({ ...prev, tags: selectedTags }));
  };
  
  const handleCoverImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      setImageUploading(true);
      const imageUrl = await uploadImage(file);
      setFormData(prev => ({ ...prev, coverImage: imageUrl }));
    } catch (error) {
      // console.error removed
      alert('Failed to upload image. Please try again.');
    } finally {
      setImageUploading(false);
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    try {
      setIsSubmitting(true);
      
      if (isEdit && initialData) {
        await updatePost(initialData.id, formData);
      } else {
        await createPost(formData);
      }
      
      navigate('/admin/blog');
    } catch (error) {
      // console.error removed
      alert('Failed to save post. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handlePublish = async () => {
    if (!validateForm()) return;
    
    try {
      setIsPublishing(true);
      
      if (isEdit && initialData) {
        // For existing posts, use the publish endpoint
        await publishPost(initialData.id);
      } else {
        // For new posts, create with PUBLISHED status
        await createPost({
          ...formData,
          status: 'PUBLISHED'
        });
      }
      
      navigate('/admin/blog');
    } catch (error) {
      // console.error removed
      alert('Failed to publish post. Please try again.');
    } finally {
      setIsPublishing(false);
    }
  };
  
  const handleSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    try {
      setIsScheduling(true);
      
      const scheduleDateTime = new Date(scheduleDate);
      
      if (isEdit && initialData) {
        // For existing posts, use the schedule endpoint
        await schedulePost(initialData.id, scheduleDateTime);
      } else {
        // For new posts, create with SCHEDULED status
        await createPost({
          ...formData,
          status: 'SCHEDULED',
          publishedAt: scheduleDateTime.toISOString()
        });
      }
      
      navigate('/admin/blog');
    } catch (error) {
      // console.error removed
      alert('Failed to schedule post. Please try again.');
    } finally {
      setIsScheduling(false);
      setShowScheduleForm(false);
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Title */}
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700">
          Title <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="title"
          name="title"
          value={formData.title}
          onChange={handleInputChange}
          className={`mt-1 block w-full rounded-md shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm ${
            errors.title ? 'border-red-300' : 'border-gray-300'
          }`}
          placeholder="Enter post title"
        />
        {errors.title && (
          <p className="mt-1 text-sm text-red-600">{errors.title}</p>
        )}
      </div>
      
      {/* Excerpt */}
      <div>
        <label htmlFor="excerpt" className="block text-sm font-medium text-gray-700">
          Excerpt <span className="text-gray-400">(optional, recommended 280 characters)</span>
        </label>
        <textarea
          id="excerpt"
          name="excerpt"
          value={formData.excerpt}
          onChange={handleInputChange}
          rows={2}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm"
          placeholder="Brief summary of the post"
        />
      </div>
      
      {/* Cover Image */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Cover Image <span className="text-gray-400">(optional)</span>
        </label>
        <div className="mt-1 flex items-center">
          {formData.coverImage ? (
            <div className="relative">
              <img 
                src={formData.coverImage} 
                alt="Cover" 
                className="h-32 w-auto object-cover rounded-md"
              />
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, coverImage: '' }))}
                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <label className="flex items-center justify-center h-32 w-full border-2 border-dashed border-gray-300 rounded-md cursor-pointer hover:border-gray-400 transition-colors">
              <div className="space-y-1 text-center">
                <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
                <div className="text-sm text-gray-600">
                  {imageUploading ? (
                    <div className="flex items-center">
                      <Loader2 className="animate-spin h-4 w-4 mr-2" />
                      Uploading...
                    </div>
                  ) : (
                    <span>Upload cover image</span>
                  )}
                </div>
              </div>
              <input 
                type="file" 
                className="hidden" 
                accept="image/*"
                onChange={handleCoverImageUpload}
                disabled={imageUploading}
              />
            </label>
          )}
        </div>
      </div>
      
      {/* Content */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Content <span className="text-red-500">*</span>
        </label>
        <RichTextEditor 
          initialContent={formData.contentHtml} 
          onChange={handleContentChange}
          placeholder="Write your blog post content here..."
        />
        {errors.contentHtml && (
          <p className="mt-1 text-sm text-red-600">{errors.contentHtml}</p>
        )}
      </div>
      
      {/* Tags */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Tags <span className="text-gray-400">(optional)</span>
        </label>
        <TagSelector 
          selectedTags={formData.tags || []} 
          onChange={handleTagsChange}
          isAdmin={true}
        />
      </div>
      
      {/* SEO Section */}
      <div className="bg-gray-50 p-4 rounded-md">
        <h3 className="text-lg font-medium text-gray-900 mb-4">SEO Settings</h3>
        
        <div className="space-y-4">
          <div>
            <label htmlFor="seoTitle" className="block text-sm font-medium text-gray-700">
              SEO Title <span className="text-gray-400">(defaults to post title)</span>
            </label>
            <input
              type="text"
              id="seoTitle"
              name="seoTitle"
              value={formData.seoTitle}
              onChange={handleInputChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm"
              placeholder="SEO optimized title"
            />
          </div>
          
          <div>
            <label htmlFor="metaDescription" className="block text-sm font-medium text-gray-700">
              Meta Description <span className="text-gray-400">(defaults to excerpt)</span>
            </label>
            <textarea
              id="metaDescription"
              name="metaDescription"
              value={formData.metaDescription}
              onChange={handleInputChange}
              rows={2}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm"
              placeholder="SEO meta description"
            />
          </div>
        </div>
      </div>
      
      {/* Schedule Form */}
      {showScheduleForm && (
        <div className="bg-blue-50 p-4 rounded-md">
          <h3 className="text-lg font-medium text-blue-900 mb-4 flex items-center">
            <Clock className="mr-2" size={20} />
            Schedule Publication
          </h3>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="scheduleDate" className="block text-sm font-medium text-gray-700">
                Publication Date and Time <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                id="scheduleDate"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                className={`mt-1 block w-full rounded-md shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm ${
                  errors.scheduleDate ? 'border-red-300' : 'border-gray-300'
                }`}
                min={new Date().toISOString().slice(0, 16)}
              />
              {errors.scheduleDate && (
                <p className="mt-1 text-sm text-red-600">{errors.scheduleDate}</p>
              )}
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowScheduleForm(false)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                disabled={isScheduling}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSchedule}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                disabled={isScheduling}
              >
                {isScheduling ? (
                  <>
                    <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                    Scheduling...
                  </>
                ) : (
                  <>
                    <Clock className="-ml-1 mr-2 h-4 w-4" />
                    Schedule
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Action Buttons */}
      <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={() => navigate('/admin/blog')}
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
          disabled={isSubmitting || isPublishing || isScheduling}
        >
          Cancel
        </button>
        
        <button
          type="button"
          onClick={() => setShowScheduleForm(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          disabled={isSubmitting || isPublishing || isScheduling || showScheduleForm}
        >
          <Clock className="-ml-1 mr-2 h-4 w-4" />
          Schedule
        </button>
        
        <button
          type="button"
          onClick={handlePublish}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
          disabled={isSubmitting || isPublishing || isScheduling}
        >
          {isPublishing ? (
            <>
              <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
              Publishing...
            </>
          ) : (
            <>
              <Send className="-ml-1 mr-2 h-4 w-4" />
              Publish
            </>
          )}
        </button>
        
        <button
          type="submit"
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50"
          disabled={isSubmitting || isPublishing || isScheduling}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
              Saving...
            </>
          ) : (
            <>
              <Save className="-ml-1 mr-2 h-4 w-4" />
              Save Draft
            </>
          )}
        </button>
      </div>
      
      {/* Warning for unsaved changes */}
      {(isSubmitting || isPublishing || isScheduling) && (
        <div className="flex items-start p-4 rounded-md bg-yellow-50 text-yellow-800">
          <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
          <p className="text-sm">
            Please don't navigate away from this page while your post is being saved.
          </p>
        </div>
      )}
    </form>
  );
};

export default BlogPostForm;