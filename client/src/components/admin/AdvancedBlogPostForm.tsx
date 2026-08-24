import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import AdvancedRichTextEditor from './AdvancedRichTextEditor';
import IdeaModePanel from './IdeaModePanel';
import ImageCropper from '../ImageCropper';
import { useLanguage } from '../../context/LanguageContext';
import {
  ArrowLeft, 
  ArrowRight, 
  Save, 
  Send, 
  AlertCircle, 
  Check,
  FileText,
  Image as ImageIcon,
  Settings,
  Eye,
  Upload,
  Loader2,
  X,
  Plus,
  Sparkles,
  Calendar
} from 'lucide-react';

interface BlogPost {
  id?: string;
  title: string;
  slug?: string;
  excerpt: string;
  content_html: string;
  cover_image?: string;
  image_url_2?: string;
  image_url_3?: string;
  video_url?: string;
  tags?: string[];
  status: 'IDEA' | 'DRAFT' | 'PUBLISHED' | 'SCHEDULED' | 'ARCHIVED';
  ideaData?: any;
  pillar?: string;
  seo_title?: string;
  meta_description?: string;
  author_id?: string;
  published_at?: string;
  scheduled_for?: string;
}

interface BlogPostFormProps {
  post?: BlogPost;
  isEditing?: boolean;
}

type Step = 'content' | 'media' | 'meta' | 'preview';
type ImageField = 'cover_image' | 'image_url_2' | 'image_url_3';

interface CropTarget {
  field: ImageField;
  label: string;
  file: File;
}

// Curated tag suggestions for a Vienna portrait studio. Always available so the
// editor never depends on a remote tag table; merged with tags already used on
// existing posts at runtime.
const SUGGESTED_TAGS: string[] = [
  'case-study', 'fallstudie',
  'wien',
  'studio',
  'familienfotos', 'familie', 'kinderfotos', 'geschwister',
  'neugeborenenfotos', 'babyfotos', 'baby',
  'schwangerschaftsfotos', 'babybauch',
  'businessfotos', 'bewerbungsfotos', 'teamfotos', 'linkedin', 'headshots', 'portrait',
  'hochzeitsfotos', 'hochzeit', 'paarfotos', 'event',
  'gutschein', 'geschenk', 'wandbilder', 'produktfotografie',
  'outfits', 'kleidung', 'preise', 'ablauf', 'vorbereitung', 'tipps',
];

// --- Auto-tagging -----------------------------------------------------------
// Rank known tags by how strongly they appear in the post's own text so the
// best matches can be applied without the user hand-picking them. German-aware:
// folds umlauts and matches photo-compound stems (e.g. the tag
// "familienfotos" still scores on body text that only says "Familien…").

const stripHtml = (html: string): string => html.replace(/<[^>]*>/g, ' ');

const normalizeText = (s: string): string =>
  s
    .toLowerCase()
    .replace(/ä/g, 'a')
    .replace(/ö/g, 'o')
    .replace(/ü/g, 'u')
    .replace(/ß/g, 'ss');

// The strings we look for in the text for a given tag: the tag itself, a rough
// singular (trailing "s" dropped), and the stem with a trailing photo-word
// removed so compound tags match their root word.
const tagNeedles = (tag: string): string[] => {
  const t = normalizeText(tag).trim();
  const needles = new Set<string>([t]);
  if (t.endsWith('s')) needles.add(t.slice(0, -1));
  const base = t.replace(/(fotografie|fotos|foto|shootings|shooting|bilder|bild)$/, '');
  if (base.length >= 4 && base !== t) needles.add(base);
  return Array.from(needles).filter((n) => n.length >= 4);
};

const countOccurrences = (haystack: string, needle: string): number => {
  let idx = 0;
  let count = 0;
  while ((idx = haystack.indexOf(needle, idx)) !== -1) {
    count++;
    idx += needle.length;
  }
  return count;
};

// Returns candidate tags ranked best-first, dropping any with no match. Title
// counts 3x and excerpt 2x so headline/summary keywords rank above body asides.
const recommendTagsFromContent = (
  candidates: string[],
  fields: { title?: string; excerpt?: string; contentHtml?: string },
  limit = 8,
): string[] => {
  const haystack = normalizeText(
    [
      fields.title ?? '',
      fields.title ?? '',
      fields.title ?? '',
      fields.excerpt ?? '',
      fields.excerpt ?? '',
      stripHtml(fields.contentHtml ?? ''),
    ].join(' '),
  );
  if (!haystack.trim()) return [];

  return candidates
    .map((tag) => {
      const score = tagNeedles(tag).reduce(
        (best, needle) => Math.max(best, countOccurrences(haystack, needle)),
        0,
      );
      return { tag, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.tag);
};

// Format a stored date (ISO or local string) as the LOCAL "YYYY-MM-DDTHH:mm"
// a datetime-local input expects. The previous code round-tripped through
// toISOString() (UTC), so the displayed time shifted by the timezone offset
// on every keystroke — typing a date visibly "jumped" (e.g. 18/07 → 07/06)
// and could silently land the schedule in the PAST, which publishes the post
// immediately on the next scheduler sweep.
const toLocalInputValue = (v: string): string => {
  const d = new Date(v);
  if (isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const AdvancedBlogPostForm: React.FC<BlogPostFormProps> = ({ post, isEditing = false }) => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const de = language === 'de'; // honour the global EN/DE toggle for this admin form
  const [currentStep, setCurrentStep] = useState<Step>('content');
  const [formData, setFormData] = useState<BlogPost>({
    title: '',
    slug: '',
    excerpt: '',
    content_html: '',
    status: 'DRAFT',
    seo_title: '',
    meta_description: '',
    tags: [],
    scheduled_for: '',
    cover_image: '',
    image_url_2: '',
    image_url_3: '',
    video_url: ''
  });
  
  const [availableTags, setAvailableTags] = useState<{id: string, name: string}[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [videoUploading, setVideoUploading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [pulseSending, setPulseSending] = useState(false);
  const [pulseMsg, setPulseMsg] = useState<string | null>(null);
  // Per-send channel picker for Pulse. All on by default; the server still
  // intersects this with the PULSE_PLATFORMS env allow-list.
  const PULSE_CHANNELS: Array<{ id: string; label: string }> = [
    { id: 'facebook', label: 'Facebook' },
    { id: 'instagram', label: 'Instagram' },
    { id: 'threads', label: 'Threads' },
    { id: 'linkedin', label: 'LinkedIn' },
    { id: 'googlebusiness', label: 'Google Business' },
    { id: 'pinterest', label: 'Pinterest' },
  ];
  const [pulseChannels, setPulseChannels] = useState<string[]>(PULSE_CHANNELS.map((c) => c.id));
  const togglePulseChannel = (id: string) =>
    setPulseChannels((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
  const [cropTarget, setCropTarget] = useState<CropTarget | null>(null);

  const steps = [
    { id: 'content', label: 'Content', icon: FileText, description: 'Write your blog post content' },
    { id: 'media', label: 'Media', icon: ImageIcon, description: 'Add cover image and media' },
    { id: 'meta', label: 'Meta', icon: Settings, description: 'SEO and publishing settings' },
    { id: 'preview', label: 'Preview', icon: Eye, description: 'Review and publish' }
  ];

  useEffect(() => {
    fetchTags();
    
    if (post && isEditing) {
      const mappedData = {
        title: post.title || '',
        slug: post.slug || '',
        excerpt: post.excerpt || '',
        content_html: post.content_html || '',
        status: post.status || 'DRAFT',
        // The API speaks camelCase (imageUrl, seoTitle, metaDescription); this form
        // speaks snake_case. Every field below needs BOTH spellings, and the cover was
        // the one that had only one.
        //
        // The consequence was not a blank box in the editor, it was DATA LOSS. Opening a
        // published post to edit anything at all loaded cover_image as '', and the save
        // at the bottom of this file posts `imageUrl: formData.cover_image || ''` — so
        // the next save wrote an empty string over the cover. The studio uploaded a
        // thumbnail, edited the title, and the thumbnail was gone: the admin list showed
        // "No img" and the public blog card fell back to a placeholder. imageUrl2 and
        // imageUrl3 survived on the same post, because those two lines already had the
        // fallback the cover did not.
        seo_title: post.seo_title || (post as any).seoTitle || '',
        meta_description: post.meta_description || (post as any).metaDescription || '',
        tags: post.tags || [],
        scheduled_for: post.scheduled_for || (post as any).scheduledFor || '',
        cover_image: post.cover_image || (post as any).imageUrl || '',
        image_url_2: post.image_url_2 || (post as any).imageUrl2 || '',
        image_url_3: post.image_url_3 || (post as any).imageUrl3 || '',
        video_url: post.video_url || (post as any).videoUrl || '',
        id: post.id,
        author_id: post.author_id,
        published_at: post.published_at,
        created_at: post.created_at,
        updated_at: post.updated_at
      };
      
      setFormData(mappedData);
      setSelectedTags(post.tags || []);
    }
  }, [post, isEditing]);

  const fetchTags = async () => {
    // Start from the curated list so suggestions always show, then merge in any
    // tags already used across existing posts (best-effort; the old Supabase
    // tag table was removed when the app moved to Neon).
    const merged = new Map<string, string>(); // lowercased -> display
    SUGGESTED_TAGS.forEach(t => merged.set(t.toLowerCase(), t));

    try {
      const res = await fetch('/api/blog/posts?limit=200');
      if (res.ok) {
        const json = await res.json();
        const posts: Array<{ tags?: string[] | null }> = json?.posts ?? [];
        posts.forEach(p => (p.tags ?? []).forEach(t => {
          const key = String(t).trim().toLowerCase();
          if (key && !merged.has(key)) merged.set(key, String(t).trim());
        }));
      }
    } catch {
      // Network/endpoint issue — curated suggestions still work.
    }

    setAvailableTags(Array.from(merged.values()).map((name, i) => ({ id: `tag-${i}`, name })));
  };

  const generateSlug = (title: string): string => {
    return title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '') // Remove special characters except hyphens
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
      .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
      .substring(0, 60); // Limit length
  };

  const handleChange = (field: keyof BlogPost, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const uploadImageFile = async (
    file: File,
    field: ImageField = 'cover_image',
  ): Promise<boolean> => {
    if (!file) return false;

    try {
      setImageUploading(true);
      setError(null);
      
      // Get admin token from localStorage
      const getAdminToken = () => (typeof window !== 'undefined' ? (localStorage.getItem('ADMIN_TOKEN') || '') : '');
      
      // Upload to Backblaze B2 via /api/files/upload
      const uploadData = new FormData();
      uploadData.append('file', file);
      uploadData.append('folderName', 'Blog Covers');
      uploadData.append('context', 'blog-cover-image');
      
      const response = await fetch('/api/files/upload', {
        method: 'POST',
        headers: {
          'x-admin-token': getAdminToken()
        },
        body: uploadData
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.details || 'Upload failed');
      }
      
      const data = await response.json();
      const publicUrl = data.url || data.publicUrl;
      
      if (!publicUrl) {
        throw new Error('No URL returned from upload');
      }
      
      handleChange(field, publicUrl);
      return true;
    } catch (err: any) {
      console.error('[BLOG IMAGE UPLOAD] Error:', err);
      setError((de ? 'Bild-Upload fehlgeschlagen. Bitte erneut versuchen. ' : 'Failed to upload image. Please try again. ') + (err.message || ''));
      return false;
    } finally {
      setImageUploading(false);
    }
  };

  // Upload a short video (≤10 MB) to B2 and store the returned URL in video_url.
  const MAX_VIDEO_MB = 10;
  const uploadVideoFile = async (file: File): Promise<void> => {
    if (!file) return;
    if (!file.type.startsWith('video/')) {
      setError(de ? 'Bitte eine Videodatei auswählen.' : 'Please choose a video file.');
      return;
    }
    if (file.size > MAX_VIDEO_MB * 1024 * 1024) {
      setError(de
        ? `Video ist zu groß (max. ${MAX_VIDEO_MB} MB). Für längere Videos bitte einen YouTube-/Vimeo-Link einfügen.`
        : `Video is too large (max ${MAX_VIDEO_MB} MB). For longer videos, paste a YouTube/Vimeo link instead.`);
      return;
    }
    try {
      setVideoUploading(true);
      setError(null);
      const getAdminToken = () => (typeof window !== 'undefined' ? (localStorage.getItem('ADMIN_TOKEN') || '') : '');
      const uploadData = new FormData();
      uploadData.append('file', file);
      uploadData.append('folderName', 'Blog Videos');
      uploadData.append('context', 'blog-video');
      const response = await fetch('/api/files/upload', {
        method: 'POST',
        headers: { 'x-admin-token': getAdminToken() },
        body: uploadData,
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.details || 'Upload failed');
      }
      const data = await response.json();
      const publicUrl = data.url || data.publicUrl;
      if (!publicUrl) throw new Error('No URL returned from upload');
      handleChange('video_url', publicUrl);
    } catch (err: any) {
      console.error('[BLOG VIDEO UPLOAD] Error:', err);
      setError((de ? 'Video-Upload fehlgeschlagen. ' : 'Failed to upload video. ') + (err.message || ''));
    } finally {
      setVideoUploading(false);
    }
  };

  const handleImageSelect = (
    e: React.ChangeEvent<HTMLInputElement>,
    field: ImageField,
    label: string,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCropTarget({ field, label, file });
    e.target.value = '';
  };

  const reopenCropper = async (field: ImageField, label: string) => {
    const imageUrl = formData[field];
    if (!imageUrl) return;

    try {
      setError(null);
      // Route absolute (B2/S3) URLs through the same-origin proxy — a direct browser
      // fetch of a storage URL is blocked by CORS, which broke re-cropping saved images.
      const fetchUrl = /^https?:\/\//i.test(imageUrl)
        ? `/api/proxy-image?url=${encodeURIComponent(imageUrl)}`
        : imageUrl;
      const response = await fetch(fetchUrl);
      if (!response.ok) throw new Error(de ? 'Bild konnte nicht geladen werden' : 'Image could not be loaded');
      const blob = await response.blob();
      const extension = blob.type.split('/')[1] || 'jpg';
      const file = new File([blob], `${field}-${Date.now()}.${extension}`, {
        type: blob.type || 'image/jpeg',
      });
      setCropTarget({ field, label, file });
    } catch (err: any) {
      setError(err.message || (de ? 'Bild konnte nicht für die Transformation geöffnet werden' : 'Image could not be opened for transformation'));
    }
  };

  const handleCroppedUpload = async (blob: Blob) => {
    if (!cropTarget) return;

    const extension = cropTarget.file.name.includes('.')
      ? cropTarget.file.name.split('.').pop()
      : 'jpg';
    const croppedFile = new File([blob], `${cropTarget.field}-${Date.now()}.${extension}`, {
      type: cropTarget.file.type || blob.type || 'image/jpeg',
    });

    // Only close the cropper once the upload actually succeeds. On failure keep it
    // open (with the error banner) instead of dumping the user back to the editor.
    const ok = await uploadImageFile(croppedFile, cropTarget.field);
    if (ok) setCropTarget(null);
  };

  const handleAddTag = () => {
    const value = newTag?.trim();
    if (!value) return;
    const exists = selectedTags.some(t => t.toLowerCase() === value.toLowerCase());
    if (!exists) {
      const updatedTags = [...selectedTags, value];
      setSelectedTags(updatedTags);
      handleChange('tags', updatedTags);
    }
    setNewTag('');
  };

  const handleRemoveTag = (tag: string) => {
    const updatedTags = selectedTags.filter(t => t !== tag);
    setSelectedTags(updatedTags);
    handleChange('tags', updatedTags);
  };

  const handleTagSelect = (tagName: string) => {
    if (!selectedTags.some(t => t.toLowerCase() === tagName.toLowerCase())) {
      const updatedTags = [...selectedTags, tagName];
      setSelectedTags(updatedTags);
      handleChange('tags', updatedTags);
    }
  };

  // Rank the known tags against the post's text and merge the best matches into
  // the current selection. Only ever adds — never drops tags the user chose.
  const applyRecommendedTags = useCallback(() => {
    const candidates = availableTags.map(t => t.name);
    const recommended = recommendTagsFromContent(candidates, {
      title: formData.title,
      excerpt: formData.excerpt,
      contentHtml: formData.content_html,
    });

    setSelectedTags(prev => {
      const merged = [...prev];
      const seen = new Set(prev.map(t => t.toLowerCase()));
      recommended.forEach(tag => {
        if (!seen.has(tag.toLowerCase())) {
          merged.push(tag);
          seen.add(tag.toLowerCase());
        }
      });
      if (merged.length !== prev.length) handleChange('tags', merged);
      return merged;
    });
  }, [availableTags, formData.title, formData.excerpt, formData.content_html]);

  // Auto-apply recommended tags once for an existing post that has none yet, so
  // the best tags are filled in without the user having to click. Waits until
  // the candidate tag list has loaded. Never overwrites an existing selection.
  const autoTaggedRef = useRef(false);
  useEffect(() => {
    if (autoTaggedRef.current) return;
    if (!availableTags.length) return;
    if (!formData.title && !formData.content_html) return;
    if (selectedTags.length > 0) {
      // Post already has tags — nothing to auto-fill; don't run again.
      autoTaggedRef.current = true;
      return;
    }
    autoTaggedRef.current = true;
    applyRecommendedTags();
  }, [availableTags, selectedTags, formData.title, formData.content_html, applyRecommendedTags]);

  const validateStep = (step: Step): boolean => {
    switch (step) {
      case 'content':
        return !!(formData.title?.trim() && formData.content_html?.trim());
      case 'media':
        return true; // Media is optional
      case 'meta':
        return !!(formData.excerpt?.trim());
      case 'preview':
        return true;
      default:
        return false;
    }
  };

  const canProceedToNext = () => {
    return validateStep(currentStep);
  };

  const getStepIndex = (step: Step) => {
    return steps.findIndex(s => s.id === step);
  };

  const nextStep = () => {
    const currentIndex = getStepIndex(currentStep);
    if (currentIndex < steps.length - 1 && canProceedToNext()) {
      setCurrentStep(steps[currentIndex + 1].id as Step);
    }
  };

  const prevStep = () => {
    const currentIndex = getStepIndex(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1].id as Step);
    }
  };

  const handleSubmit = async (publish = false) => {
    setLoading(true);
    setError(null);
    
    try {
      // Respect an explicit future schedule: if the post is set to SCHEDULED with a
      // future date, keep it scheduled and send scheduledFor — never silently
      // collapse it to DRAFT (loses the schedule) or PUBLISHED (publishes now).
      const isScheduled = formData.status === 'SCHEDULED'
        && !!formData.scheduled_for
        && new Date(formData.scheduled_for).getTime() > Date.now();

      // HARD GUARD: a SCHEDULED post with a past/invalid date must never fall
      // through to publish-now (that's how a mistyped date mass-published the
      // July backlog). Block and let the user fix the date.
      if (formData.status === 'SCHEDULED' && !isScheduled) {
        setError(de
          ? 'Das Veröffentlichungsdatum liegt in der Vergangenheit oder ist ungültig. Bitte ein zukünftiges Datum wählen — sonst würde der Beitrag sofort veröffentlicht.'
          : 'The publish date is in the past or invalid. Choose a future date — otherwise the post would publish immediately.');
        setLoading(false);
        return;
      }

      const wantPublish = (publish || formData.status === 'PUBLISHED') && !isScheduled;

      const postData: any = {
        title: formData.title || '',
        slug: formData.slug || generateSlug(formData.title || ''),
        excerpt: formData.excerpt || '',
        content: formData.content_html || '',
        contentHtml: formData.content_html || '',
        imageUrl: formData.cover_image || '',
        imageUrl2: formData.image_url_2 || '',
        imageUrl3: formData.image_url_3 || '',
        videoUrl: formData.video_url || '',
        published: wantPublish,
        status: isScheduled ? 'SCHEDULED' : (wantPublish ? 'PUBLISHED' : 'DRAFT'),
        // Normalise to ISO here (state may hold the raw local input string).
        scheduledFor: isScheduled ? new Date(formData.scheduled_for!).toISOString() : null,
        metaDescription: formData.meta_description || '',
        seoTitle: formData.seo_title || '',
        tags: formData.tags || []
      };

      if (wantPublish) {
        postData.publishedAt = new Date().toISOString();
      }
      
      // Get admin token from localStorage
      const getAdminToken = () => (typeof window !== 'undefined' ? (localStorage.getItem('ADMIN_TOKEN') || '') : '');
      
      const response = await fetch(isEditing && post?.id ? `/api/blog/posts/${post.id}` : '/api/blog/posts', {
        method: isEditing && post?.id ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': getAdminToken()
        },
        credentials: 'include',
        body: JSON.stringify(postData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('[BLOG SAVE] Error response:', errorData);
        const errorMessage = errorData.details || errorData.error || 'Failed to save post';
        throw new Error(errorMessage);
      }
      
      setSuccessMessage(isEditing ? 'Post updated successfully!' : 'Post created successfully!');
      
      setTimeout(() => {
        navigate('/admin/blog');
      }, 1500);
      
    } catch (err) {
      console.error('[BLOG SAVE] Error:', err);
      const errorMessage = err instanceof Error ? err.message : 'An error occurred while saving the post';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-between mb-8">
      {steps.map((step, index) => {
        const isActive = step.id === currentStep;
        const isCompleted = validateStep(step.id as Step) && getStepIndex(currentStep) > index;
        const Icon = step.icon;
        
        return (
          <div key={step.id} className="flex items-center">
            <div className="flex flex-col items-center">
              <div className={`
                w-12 h-12 rounded-full flex items-center justify-center border-2 transition-colors
                ${isActive 
                  ? 'bg-purple-600 border-purple-600 text-white' 
                  : isCompleted 
                    ? 'bg-green-600 border-green-600 text-white'
                    : 'bg-gray-100 border-gray-300 text-gray-500'
                }
              `}>
                {isCompleted ? <Check size={20} /> : <Icon size={20} />}
              </div>
              <div className="mt-2 text-center">
                <div className={`text-sm font-medium ${isActive ? 'text-purple-600' : 'text-gray-600'}`}>
                  {step.label}
                </div>
                <div className="text-xs text-gray-500 max-w-24">
                  {step.description}
                </div>
              </div>
            </div>
            {index < steps.length - 1 && (
              <div className={`w-16 h-0.5 mx-4 ${isCompleted ? 'bg-green-600' : 'bg-gray-300'}`} />
            )}
          </div>
        );
      })}
    </div>
  );

  const renderContentStep = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Post Title <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => {
            handleChange('title', e.target.value);
            // Auto-generate slug if not manually set
            if (!formData.slug || formData.slug === generateSlug(formData.title || '')) {
              handleChange('slug', generateSlug(e.target.value));
            }
          }}
          className="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          placeholder="Enter your post title..."
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          URL Slug <span className="text-red-500">*</span>
          <span className="text-xs text-gray-500 ml-2">(Used in the post URL)</span>
        </label>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500 px-3 py-3 bg-gray-50 border border-gray-300 rounded-l-lg">
            /blog/
          </span>
          <input
            type="text"
            value={formData.slug || ''}
            onChange={(e) => handleChange('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-'))}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-r-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            placeholder="post-url-slug"
          />
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Only lowercase letters, numbers, and hyphens allowed. Auto-generated from title if left empty.
        </p>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Content <span className="text-red-500">*</span>
        </label>
        <AdvancedRichTextEditor
          value={formData.content_html}
          onChange={(value) => handleChange('content_html', value)}
          placeholder="Start writing your blog post content..."
        />
      </div>
    </div>
  );

  // Generate the post's Social Pack and distribute it to Pulse (AxixOS Social).
  const sendToPulse = async () => {
    if (!post?.id) return;
    setPulseSending(true);
    setPulseMsg(null);
    try {
      const res = await fetch(`/api/blog/posts/${post.id}/distribute-pulse`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        // uses server default PULSE_MODE (draft unless changed); platforms
        // restricts the send to the channels the user ticked.
        body: JSON.stringify({ platforms: pulseChannels }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || (de ? 'Senden fehlgeschlagen' : 'Send failed'));
      const s = data.result?.summary;
      setPulseMsg(
        data.success && s
          ? (de
              ? `✓ An Pulse gesendet: ${s.accepted} übernommen, ${s.rejected} abgelehnt (von ${s.received}).`
              : `✓ Sent to Pulse: ${s.accepted} accepted, ${s.rejected} rejected (of ${s.received}).`)
          : (de
              ? `Pulse-Antwort: ${data.result?.error || data.result?.status || 'ok'}`
              : `Pulse response: ${data.result?.error || data.result?.status || 'ok'}`),
      );
    } catch (err: any) {
      setPulseMsg(err.message);
    } finally {
      setPulseSending(false);
    }
  };

  // A single uploadable image slot (cover + optional extra images). The post
  // page renders cover + imageUrl2 + imageUrl3, so up to three images show.
  const imageSlot = (field: ImageField, label: string) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      {formData[field] ? (
        <div className="space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
          {/* Constrain the preview so tall (portrait) images don't fill the screen and
              push the Free-transform / Remove / Save controls below the fold.
              Inline maxHeight is used deliberately: global `img { height:auto }` rules
              were defeating the Tailwind max-h utility, so an inline style guarantees it. */}
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white text-center">
            <img
              src={formData[field]}
              alt={`${label} ${de ? 'Vorschau' : 'preview'}`}
              style={{ maxHeight: '22rem', width: 'auto', maxWidth: '100%', display: 'inline-block' }}
              className={`rounded-xl ${field === 'cover_image' ? 'shadow-lg' : 'shadow-2xl'}`}
            />
          </div>
          <p className="text-xs text-gray-500">
            {de
              ? 'Diese Vorschau nutzt die gleichen Bildproportionen wie der veröffentlichte Blogartikel. Über "Frei transformieren" kannst du den sichtbaren Ausschnitt verschieben und skalieren.'
              : 'This preview uses the same image proportions as the published blog article. Use "Free transform" to move and scale the visible crop.'}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => reopenCropper(field, label)}
              className="inline-flex items-center rounded-lg border border-purple-200 bg-white px-3 py-2 text-sm font-medium text-purple-700 hover:bg-purple-50"
            >
              {de ? 'Frei transformieren' : 'Free transform'}
            </button>
            <button
              type="button"
              onClick={() => handleChange(field, '')}
              className="inline-flex items-center rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
            >
              <X size={16} className="mr-1" />
              {de ? 'Entfernen' : 'Remove'}
            </button>
          </div>
        </div>
      ) : (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8">
          <div className="text-center">
            <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <label className="cursor-pointer">
              <span className="text-purple-600 hover:text-purple-700 font-medium">{de ? 'Bild hochladen' : 'Upload image'}</span>
              <span className="text-gray-600">{de ? ' oder hierher ziehen' : ' or drag it here'}</span>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleImageSelect(e, field, label)}
                className="sr-only"
                disabled={imageUploading}
              />
            </label>
            <p className="text-sm text-gray-500 mt-2">PNG, JPG, WEBP {de ? 'bis' : 'up to'} 10MB</p>
          </div>
        </div>
      )}
    </div>
  );

  const renderMediaStep = () => (
    <div className="space-y-6">
      {imageSlot('cover_image', de ? 'Titelbild (Cover)' : 'Cover image')}
      {imageSlot('image_url_2', de ? 'Weiteres Bild 2 (optional)' : 'Additional image 2 (optional)')}
      {imageSlot('image_url_3', de ? 'Weiteres Bild 3 (optional)' : 'Additional image 3 (optional)')}
      {imageUploading && (
        <div className="flex items-center justify-center text-purple-600">
          <Loader2 className="animate-spin mr-2" size={20} /> {de ? 'Wird hochgeladen…' : 'Uploading…'}
        </div>
      )}
      <p className="text-xs text-gray-500">
        {de
          ? 'Tipp: Für eine ganze Fotostrecke mit automatischen EXIF/SEO-Metadaten nutzt den Idee-Modus.'
          : 'Tip: For a whole photo series with automatic EXIF/SEO metadata, use Idea Mode.'}
      </p>

      {/* Optional video: upload a short clip (≤10 MB) OR paste a YouTube/Vimeo link */}
      <div className="border-t border-gray-200 pt-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {de ? 'Video (optional)' : 'Video (optional)'}
        </label>
        <p className="text-xs text-gray-500 mb-2">
          {de
            ? 'Kurzes Video hochladen (max. 10 MB) oder einen YouTube-/Vimeo-Link einfügen.'
            : 'Upload a short clip (max 10 MB) or paste a YouTube/Vimeo link.'}
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            type="text"
            value={formData.video_url || ''}
            onChange={(e) => handleChange('video_url', e.target.value)}
            placeholder={de ? 'https://youtube.com/…  oder  https://…/video.mp4' : 'https://youtube.com/…  or  https://…/video.mp4'}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
          />
          <label className={`inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors ${videoUploading ? 'bg-gray-200 text-gray-500' : 'bg-purple-600 text-white hover:bg-purple-700'}`}>
            {videoUploading ? (de ? 'Lädt…' : 'Uploading…') : (de ? 'Video hochladen' : 'Upload video')}
            <input
              type="file"
              accept="video/*"
              className="hidden"
              disabled={videoUploading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) { uploadVideoFile(file); e.target.value = ''; }
              }}
            />
          </label>
          {formData.video_url && (
            <button
              type="button"
              onClick={() => handleChange('video_url', '')}
              className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              {de ? 'Entfernen' : 'Remove'}
            </button>
          )}
        </div>
        {formData.video_url && !videoUploading && (
          <p className="mt-2 text-xs text-green-700 break-all">
            {de ? 'Video gesetzt: ' : 'Video set: '}{formData.video_url}
          </p>
        )}
      </div>

      {isEditing && post?.id && (
        <div className="border-t border-gray-200 pt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">{de ? 'Social-Verteilung (Pulse)' : 'Social distribution (Pulse)'}</label>
          <p className="text-xs text-gray-500 mb-2">{de ? 'Kanäle auswählen, an die gesendet werden soll:' : 'Choose which channels to send to:'}</p>
          <div className="flex flex-wrap gap-2 mb-3">
            {PULSE_CHANNELS.map((c) => {
              const on = pulseChannels.includes(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => togglePulseChannel(c.id)}
                  aria-pressed={on}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                    on
                      ? 'border-pink-500 bg-pink-50 text-pink-700'
                      : 'border-gray-300 bg-white text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  {on ? <Check size={13} /> : null}
                  {c.label}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={sendToPulse}
            disabled={pulseSending || !formData.cover_image || pulseChannels.length === 0}
            className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 disabled:opacity-50 inline-flex items-center"
            title={!formData.cover_image
              ? (de ? 'Titelbild erforderlich' : 'Cover image required')
              : pulseChannels.length === 0
              ? (de ? 'Mindestens einen Kanal auswählen' : 'Select at least one channel')
              : (de ? 'Social-Posts an ausgewählte Kanäle senden' : 'Send social posts to the selected channels')}
          >
            {pulseSending ? <Loader2 className="animate-spin mr-2" size={16} /> : <Send size={16} className="mr-2" />}
            {de
              ? `An Pulse senden (${pulseChannels.length})`
              : `Send to Pulse (${pulseChannels.length})`}
          </button>
          {pulseMsg && <p className="text-sm mt-2 text-gray-600">{pulseMsg}</p>}
        </div>
      )}
    </div>
  );

  const renderMetaStep = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Excerpt <span className="text-red-500">*</span>
        </label>
        <textarea
          value={formData.excerpt}
          onChange={(e) => handleChange('excerpt', e.target.value)}
          rows={3}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          placeholder="Brief summary of your post (recommended: 280 characters)"
        />
        <div className="text-right text-sm text-gray-500 mt-1">
          {formData.excerpt.length}/280 characters
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700">
            Tags
          </label>
          <button
            type="button"
            onClick={applyRecommendedTags}
            title={de ? 'Passende Tags aus Titel, Auszug und Text vorschlagen' : 'Suggest matching tags from title, excerpt and content'}
            className="inline-flex items-center text-sm text-purple-600 hover:text-purple-800"
          >
            <Sparkles size={14} className="mr-1" />
            {de ? 'Tags aus Inhalt vorschlagen' : 'Suggest tags from content'}
          </button>
        </div>
        <div className="space-y-3">
          <div className="flex space-x-2">
            <input
              type="text"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag(); } }}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              placeholder="Add a tag..."
            />
            <button
              type="button"
              onClick={handleAddTag}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center"
            >
              <Plus size={16} className="mr-1" />
              Add
            </button>
          </div>
          
          {selectedTags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedTags.map(tag => (
                <span 
                  key={tag} 
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="ml-2 text-purple-600 hover:text-purple-800"
                  >
                    <X size={14} />
                  </button>
                </span>
              ))}
            </div>
          )}
          
          {availableTags.length > 0 && (
            <div>
              <p className="text-sm text-gray-600 mb-2">Suggested tags (click to add):</p>
              <div className="flex flex-wrap gap-2">
                {availableTags
                  .filter(tag => !selectedTags.some(t => t.toLowerCase() === tag.name.toLowerCase()))
                  .slice(0, 18)
                  .map(tag => (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => handleTagSelect(tag.name)}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-full hover:bg-gray-50"
                  >
                    {tag.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Highlighted publish/schedule panel — the most consequential controls
          on the form (a mis-set schedule date can auto-publish). */}
      <div className="rounded-xl border-2 border-purple-300 bg-purple-50/60 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="h-5 w-5 text-purple-600" />
          <h3 className="text-sm font-semibold text-purple-900 uppercase tracking-wide">
            {de ? 'Veröffentlichung & Planung' : 'Publish & Schedule'}
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Publishing Status
            </label>
            <select
              value={formData.status}
              onChange={(e) => handleChange('status', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="DRAFT">Draft</option>
              <option value="PUBLISHED">Published</option>
              <option value="SCHEDULED">Scheduled</option>
            </select>
          </div>

          {formData.status === 'SCHEDULED' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Publish Date
              </label>
              <input
                type="datetime-local"
                value={formData.scheduled_for ? toLocalInputValue(formData.scheduled_for) : ''}
                onChange={(e) => handleChange('scheduled_for', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
              {formData.scheduled_for && new Date(formData.scheduled_for).getTime() <= Date.now() && (
                <p className="mt-1 text-sm text-red-600 font-medium">
                  ⚠️ {de
                    ? 'Dieses Datum liegt in der Vergangenheit — der Beitrag würde sofort veröffentlicht.'
                    : 'This date is in the past — the post would publish immediately.'}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          SEO Title
        </label>
        <input
          type="text"
          value={formData.seo_title || ''}
          onChange={(e) => handleChange('seo_title', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          placeholder="SEO optimized title (optional)"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Meta Description
        </label>
        <textarea
          value={formData.meta_description || ''}
          onChange={(e) => handleChange('meta_description', e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          placeholder="SEO meta description (optional)"
        />
      </div>
    </div>
  );

  const renderPreviewStep = () => (
    <div className="space-y-6">
      <div className="bg-gray-50 rounded-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Preview</h2>
        
        {formData.cover_image && (
          <img
            src={formData.cover_image}
            alt="Cover"
            style={{ maxHeight: '28rem', width: 'auto', maxWidth: '100%', display: 'block', margin: '0 auto' }}
            className="rounded-xl shadow-lg mb-6"
          />
        )}
        
        <h1 className="text-3xl font-bold text-gray-900 mb-4">{formData.title}</h1>
        
        {formData.excerpt && (
          <p className="text-lg text-gray-600 mb-6">{formData.excerpt}</p>
        )}
        
        {selectedTags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {selectedTags.map(tag => (
              <span 
                key={tag}
                className="px-3 py-1 bg-purple-100 text-purple-800 text-sm rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
        
        <div 
          className="prose max-w-none"
          dangerouslySetInnerHTML={{ __html: formData.content_html }}
        />
      </div>
    </div>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'content':
        return renderContentStep();
      case 'media':
        return renderMediaStep();
      case 'meta':
        return renderMetaStep();
      case 'preview':
        return renderPreviewStep();
      default:
        return renderContentStep();
    }
  };

  // Idea mode: the article body doesn't exist yet — show the photo-first panel
  // instead of the step editor. After "Generate" the post becomes a DRAFT and a
  // reload loads the normal editor with the generated content.
  if (formData.status === 'IDEA' && post?.id) {
    return (
      <div className="max-w-4xl mx-auto">
        <IdeaModePanel
          postId={post.id}
          title={formData.title || post.title}
          pillar={(post as any).pillar}
          initialIdea={(post as any).ideaData}
          onGenerated={() => window.location.reload()}
        />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start mb-6">
          <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 mr-2" />
          <span>{error}</span>
        </div>
      )}
      
      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6">
          {successMessage}
        </div>
      )}

      {renderStepIndicator()}
      
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        {renderCurrentStep()}
        
        <div className="flex items-center justify-between pt-6 mt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={prevStep}
            disabled={getStepIndex(currentStep) === 0}
            className="flex items-center px-4 py-2 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowLeft size={16} className="mr-2" />
            Previous
          </button>
          
          <div className="flex space-x-3">
            {currentStep === 'preview' ? (
              <>
                <button
                  type="button"
                  onClick={() => handleSubmit(false)}
                  disabled={loading}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin mr-2 h-4 w-4" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Draft
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => handleSubmit(true)}
                  disabled={loading}
                  className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin mr-2 h-4 w-4" />
                      Publishing...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Publish Post
                    </>
                  )}
                </button>
              </>
            ) : (
              <>
                {/* Save is available on every step (not just Preview) so changes —
                    e.g. a newly uploaded/cropped image — can be saved here directly. */}
                <button
                  type="button"
                  onClick={() => handleSubmit(false)}
                  disabled={loading}
                  className="flex items-center px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
                  {de ? 'Speichern' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={nextStep}
                  disabled={!canProceedToNext()}
                  className="flex items-center px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                  <ArrowRight size={16} className="ml-2" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {cropTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <ImageCropper
              file={cropTarget.file}
              aspect={14 / 9}
              allowOrientation
              title={`${cropTarget.label} ${de ? 'ausrichten' : 'align'}`}
              helpText={de
                ? 'Verschiebe und skaliere das Bild direkt im finalen Blog-Rahmen. Beim Speichern wird genau dieser Ausschnitt hochgeladen.'
                : 'Move and scale the image directly within the final blog frame. On save, exactly this crop is uploaded.'}
              onCancel={() => setCropTarget(null)}
              onCropped={(blob) => handleCroppedUpload(blob)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvancedBlogPostForm;
