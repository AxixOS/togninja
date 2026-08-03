import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '../../components/admin/AdminLayout';
import { useLanguage } from '../../context/LanguageContext';
import { 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  Eye, 
  CheckCircle,
  Clock,
  AlertCircle,
  Loader2,
  Wand2,
  Archive,
  Share2,
  Copy,
  Send,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  X
} from 'lucide-react';

interface PreparedSocialPack {
  generatedAt: string;
  articleUrl: string;
  hashtags: string[];
  facebook: string;
  instagramCaption: string;
  instagramFirstComment: string;
  threads: string;
  linkedin: string;
  googlebusiness: string;
  pinterestTitle: string;
  pinterestDescription: string;
  pinterestLink: string;
}

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  content_html: string;
  cover_image?: string;
  status: 'IDEA' | 'DRAFT' | 'PUBLISHED' | 'SCHEDULED' | 'ARCHIVED';
  published: boolean; // kept for compatibility
  author_id: string;
  published_at?: string;
  scheduled_for?: string;
  created_at: string;
  updated_at: string;
  view_count?: number;
  seo_title?: string;
  meta_description?: string;
  tags?: string[];
  social_pack?: PreparedSocialPack | null;
}

// Workflow order for status sorting (ascending shows live content first).
const STATUS_RANK: Record<string, number> = { PUBLISHED: 0, SCHEDULED: 1, DRAFT: 2, IDEA: 3, ARCHIVED: 4 };

// The date shown in the DATE column: publish date, else the scheduled date, else created.
const effectiveDate = (p: any): number => {
  const d = p.status === 'SCHEDULED' && p.scheduled_for
    ? p.scheduled_for
    : (p.published_at || p.scheduled_for || p.created_at);
  return d ? new Date(d).getTime() : 0;
};

type SortKey = 'date' | 'status';

const AdminBlogPostsPage: React.FC = () => {
  const { t } = useLanguage();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  // Persist the chosen sort so it stays as the user left it across reloads and
  // navigation, until they change it (was resetting to date-desc on every mount).
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>(() => {
    try {
      const saved = localStorage.getItem('adminBlogSort');
      if (saved) {
        const parsed = JSON.parse(saved);
        if ((parsed.key === 'date' || parsed.key === 'status') && (parsed.direction === 'asc' || parsed.direction === 'desc')) {
          return parsed;
        }
      }
    } catch { /* ignore malformed value */ }
    return { key: 'date', direction: 'desc' };
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<string | null>(null);
  const [totalPosts, setTotalPosts] = useState(0);
  const [socialPackModal, setSocialPackModal] = useState<{
    postId: string;
    title: string;
    loading: boolean;
    error: string | null;
    socialPack: PreparedSocialPack | null;
  } | null>(null);
  // "Send to Pulse" (AxixOS Social) preview + confirm modal state.
  const [pulseModal, setPulseModal] = useState<{
    postId: string;
    postTitle: string;
    loading: boolean;
    sending: boolean;
    error: string | null;
    configured: boolean;
    mode: 'draft' | 'schedule' | 'now';
    rows: Array<{ platform: string; post_content: string; title?: string; media_urls?: string[] }> | null;
    result: { summary?: { received: number; accepted: number; duplicates: number; rejected: number }; results?: any[]; error?: string } | null;
  } | null>(null);
  // "Reschedule to 2/week cadence" preview + confirm modal state.
  const [reschedule, setReschedule] = useState<{
    loading: boolean;
    applying: boolean;
    error: string | null;
    result: {
      count: number;
      firstSlot: string | null;
      lastSlot: string | null;
      plan: Array<{ id: string; title: string; from: string | null; to: string | null }>;
    } | null;
  } | null>(null);

  const fetchPosts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch ALL posts from the API (no pagination - admin sees everything)
      const response = await fetch('/api/blog/posts?limit=500', {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch blog posts');
      }
      
      const data = await response.json();
      
      // Map the API response to admin format and compute real status
      const mappedPosts = (data.posts || []).map((post: any) => {
        let computedStatus: string = 'DRAFT';
        const pubDate = post.publishedAt ? new Date(post.publishedAt) : null;
        const schedDate = post.scheduledFor ? new Date(post.scheduledFor) : null;
        if (post.status === 'IDEA' || post.status === 'ARCHIVED') {
          computedStatus = post.status; // idea-mode / archived take precedence over published flag
        } else if (post.published) {
          computedStatus = (pubDate && pubDate > new Date()) ? 'SCHEDULED' : 'PUBLISHED';
        } else if (post.status === 'SCHEDULED' && schedDate) {
          computedStatus = 'SCHEDULED'; // scheduled-but-not-yet-published (publishedAt null, scheduledFor set)
        }
        
        return {
          id: post.id,
          title: post.title,
          slug: post.slug,
          excerpt: post.excerpt,
          content_html: post.contentHtml || post.content,
          cover_image: post.imageUrl,
          status: computedStatus,
          published: post.published,
          author_id: post.authorId,
          published_at: post.publishedAt,
          scheduled_for: post.scheduledFor || (pubDate && pubDate > new Date() ? post.publishedAt : null),
          created_at: post.createdAt,
          updated_at: post.updatedAt,
          seo_title: post.seoTitle,
          meta_description: post.metaDescription,
          tags: post.tags || [],
          social_pack: post.ideaData?.socialPack || null,
        };
      });
      
      // Sort by publishedAt date descending (newest/future dates first, then older published)
      mappedPosts.sort((a: any, b: any) => {
        const dateA = a.published_at ? new Date(a.published_at).getTime() : 0;
        const dateB = b.published_at ? new Date(b.published_at).getTime() : 0;
        return dateB - dateA;
      });
      
      // Filter by status
      let filteredPosts = mappedPosts;
      if (statusFilter !== 'all') {
        filteredPosts = mappedPosts.filter((post: any) => {
          if (statusFilter === 'published') return post.status === 'PUBLISHED';
          if (statusFilter === 'scheduled') return post.status === 'SCHEDULED';
          if (statusFilter === 'draft') return post.status === 'DRAFT';
          if (statusFilter === 'idea') return post.status === 'IDEA';
          if (statusFilter === 'archived') return post.status === 'ARCHIVED';
          return true;
        });
      }
      
      // Filter by search term
      if (searchTerm) {
        filteredPosts = filteredPosts.filter((post: any) => 
          post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (post.content_html && post.content_html.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (post.excerpt && post.excerpt.toLowerCase().includes(searchTerm.toLowerCase()))
        );
      }
      
      setPosts(filteredPosts);
      setTotalPosts(data.count || filteredPosts.length);
    } catch (err) {
      setError('Failed to load blog posts. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchTerm]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const handleSearch = () => {
    fetchPosts();
  };

  const handleDeletePost = async (postId: string) => {
    try {
      setLoading(true);
      
      const response = await fetch(`/api/blog/posts/${postId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete post');
      }
      
      // Refresh posts after deletion
      fetchPosts();
      setDeleteConfirmation(null);
    } catch (err) {
      // console.error removed
      setError('Failed to delete post. Please try again.');
      setLoading(false);
    }
  };

  const openSocialPack = async (post: BlogPost) => {
    setSocialPackModal({
      postId: post.id,
      title: post.title,
      loading: true,
      error: null,
      socialPack: post.social_pack || null,
    });

    try {
      const response = await fetch(`/api/blog/posts/${post.id}/social-pack`, {
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to load social pack');
      }

      const data = await response.json();
      setSocialPackModal({
        postId: post.id,
        title: post.title,
        loading: false,
        error: null,
        socialPack: data.socialPack || null,
      });

      setPosts((current) => current.map((item) => (
        item.id === post.id ? { ...item, social_pack: data.socialPack || null } : item
      )));
    } catch (err) {
      setSocialPackModal({
        postId: post.id,
        title: post.title,
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to load social pack',
        socialPack: null,
      });
    }
  };

  const handleCopyText = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      setError('Failed to copy social pack text.');
    }
  };

  const socialSections = socialPackModal?.socialPack ? [
    { key: 'facebook', label: 'Facebook', value: socialPackModal.socialPack.facebook },
    { key: 'instagramCaption', label: 'Instagram Caption', value: socialPackModal.socialPack.instagramCaption },
    { key: 'instagramFirstComment', label: 'Instagram First Comment', value: socialPackModal.socialPack.instagramFirstComment },
    { key: 'threads', label: 'Threads', value: socialPackModal.socialPack.threads },
    { key: 'linkedin', label: 'LinkedIn', value: socialPackModal.socialPack.linkedin },
    { key: 'googlebusiness', label: 'Google Business', value: socialPackModal.socialPack.googlebusiness },
    {
      key: 'pinterest',
      label: 'Pinterest',
      value: `${socialPackModal.socialPack.pinterestTitle}\n\n${socialPackModal.socialPack.pinterestDescription}\n\n${socialPackModal.socialPack.pinterestLink}`,
    },
  ] : [];
  const handlePublishToggle = async (post: BlogPost) => {
    try {
      setLoading(true);

      const newPublished = !post.published;
      
      const response = await fetch(`/api/blog/posts/${post.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          published: newPublished,
          publishedAt: newPublished ? new Date().toISOString() : null,
          status: newPublished ? 'PUBLISHED' : 'DRAFT'
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update post status');
      }
      
      // Refresh posts to get updated data
      fetchPosts();
    } catch (err) {
      // console.error removed
      setError('Failed to update post status. Please try again.');
      fetchPosts(); // Refresh to get correct state
    }
  };
  const getStatusBadge = (post: BlogPost) => {
    switch (post.status) {
      case 'PUBLISHED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle size={12} className="mr-1" /> {t('status.published')}
          </span>
        );
      case 'SCHEDULED':
        const scheduledDate = post.scheduled_for ? new Date(post.scheduled_for).toLocaleDateString('de-AT', {
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        }) : '';
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
            <Clock size={12} className="mr-1" /> Scheduled: {scheduledDate}
          </span>
        );
      case 'IDEA': {
        const ideaDate = post.scheduled_for ? new Date(post.scheduled_for).toLocaleDateString('de-AT', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
            <Wand2 size={12} className="mr-1" /> Idee{ideaDate ? `: ${ideaDate}` : ''}
          </span>
        );
      }
      case 'ARCHIVED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
            <Archive size={12} className="mr-1" /> Archiviert
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            <Clock size={12} className="mr-1" /> {t('status.draft')}
          </span>
        );
    }
  };

  // Send to Pulse: preview the exact per-platform rows (dry run), then confirm to distribute.
  const openPulsePreview = async (post: BlogPost) => {
    setPulseModal({
      postId: post.id, postTitle: post.title, loading: true, sending: false,
      error: null, configured: false, mode: 'draft', rows: null, result: null,
    });
    try {
      const res = await fetch(`/api/blog/posts/${post.id}/distribute-pulse`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dryRun: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Could not build the Pulse preview.');
      setPulseModal((m) => (m ? { ...m, loading: false, configured: !!data.configured, rows: data.rows || [] } : m));
    } catch (e: any) {
      setPulseModal((m) => (m ? { ...m, loading: false, error: e?.message || 'Preview failed' } : m));
    }
  };

  const sendToPulse = async () => {
    setPulseModal((m) => (m ? { ...m, sending: true, error: null } : m));
    try {
      const current = pulseModal;
      if (!current) return;
      const res = await fetch(`/api/blog/posts/${current.postId}/distribute-pulse`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: current.mode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Send failed.');
      setPulseModal((m) => (m ? { ...m, sending: false, result: data.result || data } : m));
    } catch (e: any) {
      setPulseModal((m) => (m ? { ...m, sending: false, error: e?.message || 'Send failed' } : m));
    }
  };

  // Cadence rescheduling: Tuesday & Friday at 10:00 (UTC), keeping current order.
  const CADENCE_BODY = { days: [2, 5], hour: 10 };

  const openReschedulePreview = async () => {
    setReschedule({ loading: true, applying: false, error: null, result: null });
    try {
      const res = await fetch('/api/blog/posts/reschedule-cadence', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...CADENCE_BODY, dryRun: true }),
      });
      if (!res.ok) throw new Error('Could not build the reschedule preview.');
      const data = await res.json();
      setReschedule({ loading: false, applying: false, error: null, result: data });
    } catch (e: any) {
      setReschedule({ loading: false, applying: false, error: e?.message || 'Preview failed', result: null });
    }
  };

  const applyReschedule = async () => {
    setReschedule((prev) => (prev ? { ...prev, applying: true, error: null } : prev));
    try {
      const res = await fetch('/api/blog/posts/reschedule-cadence', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(CADENCE_BODY),
      });
      if (!res.ok) throw new Error('Reschedule failed.');
      setReschedule(null);
      await fetchPosts();
    } catch (e: any) {
      setReschedule((prev) => (prev ? { ...prev, applying: false, error: e?.message || 'Reschedule failed' } : prev));
    }
  };

  // Clicking a sortable column toggles direction; switching column uses a sensible default
  // (dates newest-first, statuses live-content-first).
  const toggleSort = (key: SortKey) => {
    setSortConfig((prev) => {
      const next = prev.key === key
        ? { key, direction: (prev.direction === 'asc' ? 'desc' : 'asc') as 'asc' | 'desc' }
        : { key, direction: (key === 'date' ? 'desc' : 'asc') as 'asc' | 'desc' };
      try { localStorage.setItem('adminBlogSort', JSON.stringify(next)); } catch { /* storage unavailable */ }
      return next;
    });
  };

  const sortIcon = (key: SortKey) => {
    if (sortConfig.key !== key) return <ArrowUpDown size={12} className="opacity-30" />;
    return sortConfig.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />;
  };

  // Sorted view of the loaded posts (does not change filters or counts).
  const displayedPosts = useMemo(() => {
    const arr = [...posts];
    arr.sort((a: any, b: any) => {
      let cmp: number;
      if (sortConfig.key === 'date') {
        cmp = effectiveDate(a) - effectiveDate(b);
      } else {
        cmp = (STATUS_RANK[a.status] ?? 99) - (STATUS_RANK[b.status] ?? 99);
        if (cmp === 0) cmp = effectiveDate(a) - effectiveDate(b); // tie-break by date
      }
      return sortConfig.direction === 'asc' ? cmp : -cmp;
    });
    return arr;
  }, [posts, sortConfig]);

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">{t('admin.blog')}</h1>
            <p className="text-gray-600">{t('blog.manage_content')}</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={openReschedulePreview}
              title="Re-space all future scheduled posts to 2 per week (Tue & Fri)"
              className="border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg flex items-center"
            >
              <Clock size={18} className="mr-2" />
              Reschedule cadence
            </button>
            <Link
              to="/admin/blog/new"
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center"
            >
              <Plus size={20} className="mr-2" />
              {t('blog.create')}
            </Link>
          </div>
        </div>

        {/* Reschedule-cadence preview / confirm modal */}
        {reschedule && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col">
              <div className="flex items-center justify-between px-5 py-4 border-b">
                <h3 className="text-lg font-semibold text-gray-900">Reschedule to 2 posts / week</h3>
                <button onClick={() => setReschedule(null)} className="text-gray-400 hover:text-gray-600">
                  <X size={20} />
                </button>
              </div>
              <div className="px-5 py-4 overflow-y-auto">
                {reschedule.loading && (
                  <div className="flex items-center text-gray-600">
                    <Loader2 className="animate-spin mr-2" size={18} /> Building preview…
                  </div>
                )}
                {reschedule.error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg mb-3">
                    {reschedule.error}
                  </div>
                )}
                {reschedule.result && (
                  reschedule.result.count === 0 ? (
                    <p className="text-gray-600">No future scheduled posts to reschedule.</p>
                  ) : (
                    <>
                      <p className="text-gray-700 mb-3">
                        <strong>{reschedule.result.count}</strong> scheduled post{reschedule.result.count === 1 ? '' : 's'} will be
                        re-spaced to <strong>Tuesdays &amp; Fridays at 10:00 (Vienna time)</strong>, keeping their current order.
                        {reschedule.result.firstSlot && reschedule.result.lastSlot && (
                          <> First goes out <strong>{new Date(reschedule.result.firstSlot).toLocaleDateString()}</strong>,
                          last <strong>{new Date(reschedule.result.lastSlot).toLocaleDateString()}</strong>.</>
                        )}
                      </p>
                      <div className="border rounded-lg divide-y max-h-64 overflow-y-auto text-sm">
                        {reschedule.result.plan.map((p) => (
                          <div key={p.id} className="flex items-center justify-between gap-3 px-3 py-2">
                            <span className="truncate text-gray-800" title={p.title}>{p.title}</span>
                            <span className="whitespace-nowrap text-gray-500">
                              {p.from ? new Date(p.from).toLocaleDateString() : '—'}
                              {' → '}
                              <span className="text-gray-900 font-medium">
                                {p.to ? new Date(p.to).toLocaleDateString() : '—'}
                              </span>
                            </span>
                          </div>
                        ))}
                      </div>
                    </>
                  )
                )}
              </div>
              <div className="px-5 py-4 border-t flex justify-end gap-3">
                <button
                  onClick={() => setReschedule(null)}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={applyReschedule}
                  disabled={reschedule.loading || reschedule.applying || !reschedule.result || reschedule.result.count === 0}
                  className="px-4 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 flex items-center"
                >
                  {reschedule.applying && <Loader2 className="animate-spin mr-2" size={16} />}
                  Apply reschedule
                </button>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start">
            <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 mr-2" />
            <span>{error}</span>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />              <input
                type="text"
                placeholder={t('blog.search_posts')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>
              <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="all">{t('filter.all_statuses')}</option>
              <option value="idea">Idee</option>
              <option value="published">{t('status.published')}</option>
              <option value="draft">{t('status.draft')}</option>
              <option value="scheduled">{t('status.scheduled')}</option>
              <option value="archived">Archiviert</option>
            </select>

            <button 
              onClick={handleSearch}
              className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <Filter size={20} className="mr-2" />
              {t('action.filter')}
            </button>
          </div>
        </div>

        {/* Posts Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">          {loading ? (
            <div className="p-6 text-center">
              <Loader2 className="animate-spin h-8 w-8 text-purple-600 mx-auto mb-4" />
              <p className="text-gray-600">{t('message.loading')}</p>
            </div>
          ) : posts.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('blog.post')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <button
                        type="button"
                        onClick={() => toggleSort('status')}
                        className="inline-flex items-center gap-1 uppercase tracking-wider hover:text-gray-700"
                        title="Sort by status"
                      >
                        {t('form.status')}
                        {sortIcon('status')}
                      </button>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <button
                        type="button"
                        onClick={() => toggleSort('date')}
                        className="inline-flex items-center gap-1 uppercase tracking-wider hover:text-gray-700"
                        title="Sort by date"
                      >
                        {t('form.date')}
                        {sortIcon('date')}
                      </button>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('table.actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {displayedPosts.map((post) => (
                    <tr key={post.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">                        <div className="flex items-center">
                          {post.cover_image ? (
                            <img
                              src={post.cover_image}
                              alt={post.title}
                              className="h-10 w-10 rounded-md object-cover mr-3"
                            />
                          ) : (                            <div className="h-10 w-10 rounded-md bg-gray-200 mr-3 flex items-center justify-center">
                              <span className="text-gray-500 text-xs">{t('blog.no_image')}</span>
                            </div>
                          )}
                          <div>
                            <div className="text-sm font-medium text-gray-900">{post.title}</div>
                            <div className="text-sm text-gray-500 truncate max-w-xs">
                              {post.excerpt || t('blog.no_excerpt')}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(post)}
                      </td>                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {post.status === 'PUBLISHED' && post.published_at
                          ? new Date(post.published_at).toLocaleDateString()
                          : post.status === 'SCHEDULED' && post.scheduled_for
                          ? `${t('status.scheduled')}: ${new Date(post.scheduled_for).toLocaleDateString()}`
                          : new Date(post.created_at).toLocaleDateString() + ` (${t('status.draft')})`}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-3">
                          <button
                            onClick={() => openSocialPack(post)}
                            className="text-purple-600 hover:text-purple-900"
                            title="Social Pack"
                          >
                            <span className="inline-flex items-center rounded-md border border-purple-200 px-2 py-1 text-xs font-medium text-purple-700 hover:bg-purple-50">
                              <Share2 size={14} className="mr-1" />
                              Social Pack
                            </span>
                          </button>

                          <button
                            onClick={() => openPulsePreview(post)}
                            className="text-pink-600 hover:text-pink-900"
                            title="Send this post's Social Pack to Pulse (AxixOS Social)"
                          >
                            <span className="inline-flex items-center rounded-md border border-pink-200 px-2 py-1 text-xs font-medium text-pink-700 hover:bg-pink-50">
                              <Send size={14} className="mr-1" />
                              Send to Pulse
                            </span>
                          </button>

                          <Link
                            to={`/admin/blog/edit/${post.id}`}
                            className="text-indigo-600 hover:text-indigo-900"
                            title={t('action.edit')}
                          >
                            <Edit size={16} />
                          </Link>
                          
                          <a
                            href={`/blog/${post.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-900"
                            title={t('action.view')}
                          >
                            <Eye size={16} />
                          </a>
                            <button
                            onClick={() => handlePublishToggle(post)}
                            className={`${
                              post.status === 'PUBLISHED'
                                ? 'text-orange-600 hover:text-orange-900'
                                : 'text-green-600 hover:text-green-900'
                            }`}
                            title={post.status === 'PUBLISHED' ? t('blog.unpublish') : t('blog.publish')}
                          >
                            {post.status === 'PUBLISHED' ? (
                              <Clock size={16} />
                            ) : (
                              <CheckCircle size={16} />
                            )}
                          </button>
                            <button
                            onClick={() => setDeleteConfirmation(post.id)}
                            className="text-red-600 hover:text-red-900"
                            title={t('action.delete')}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-6 text-center">
              <p className="text-gray-500">{t('blog.no_posts_found')}</p>
              <Link
                to="/admin/blog/new" 
                className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700"
              >
                <Plus size={16} className="mr-2" />
                {t('blog.create_first_post')}
              </Link>
            </div>
          )}
        </div>

        {/* Post count summary */}
        {!loading && posts.length > 0 && (
          <div className="text-sm text-gray-600 bg-white rounded-lg shadow px-4 py-3 flex items-center justify-between">
            <span>
              {t('pagination.showing')} <strong>{posts.length}</strong> {t('pagination.of')}{' '}
              <strong>{totalPosts}</strong> {t('pagination.results')}
              {statusFilter !== 'all' && (
                <span className="ml-2 text-purple-600">
                  (Filter: {statusFilter === 'published' ? t('status.published') : statusFilter === 'scheduled' ? t('status.scheduled') : t('status.draft')})
                </span>
              )}
            </span>
            <span className="text-gray-400">
              {posts.filter(p => p.status === 'PUBLISHED').length} {t('status.published')} · {posts.filter(p => p.status === 'SCHEDULED').length} {t('status.scheduled')} · {posts.filter(p => p.status === 'DRAFT').length} {t('status.draft')}
            </span>
          </div>
        )}
      </div>

      {/* Send to Pulse: preview per-platform rows, pick mode, confirm */}
      {pulseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Send to Pulse</h3>
                <p className="text-xs text-gray-500 truncate max-w-sm" title={pulseModal.postTitle}>{pulseModal.postTitle}</p>
              </div>
              <button onClick={() => setPulseModal(null)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <div className="px-5 py-4 overflow-y-auto">
              {pulseModal.loading && (
                <div className="flex items-center text-gray-600"><Loader2 className="animate-spin mr-2" size={18} /> Building preview…</div>
              )}
              {pulseModal.error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg mb-3">{pulseModal.error}</div>
              )}

              {pulseModal.result ? (
                <div className="text-gray-700">
                  {pulseModal.result.summary ? (
                    <div className="bg-green-50 border border-green-200 text-green-800 rounded-lg px-4 py-3">
                      <p className="font-medium mb-1">Sent to Pulse ✓</p>
                      <p className="text-sm">
                        {pulseModal.result.summary.accepted} accepted · {pulseModal.result.summary.duplicates} duplicate ·
                        {' '}{pulseModal.result.summary.rejected} rejected (of {pulseModal.result.summary.received})
                      </p>
                    </div>
                  ) : (
                    <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg px-4 py-3 text-sm">
                      {pulseModal.result.error || 'Sent, but Pulse returned no summary.'}
                    </div>
                  )}
                  {Array.isArray(pulseModal.result.results) && pulseModal.result.results.some((r: any) => r.status === 'rejected') && (
                    <ul className="mt-3 text-sm text-red-700 list-disc pl-5">
                      {pulseModal.result.results.filter((r: any) => r.status === 'rejected').map((r: any, i: number) => (
                        <li key={i}>{r.platform}: {r.reason}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : pulseModal.rows && (
                pulseModal.rows.length === 0 ? (
                  <p className="text-gray-600">Nothing to send — no matching platforms have copy (and Instagram/Pinterest need an image).</p>
                ) : (
                  <>
                    {!pulseModal.configured && (
                      <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-3 py-2 rounded-lg mb-3 text-sm">
                        <strong>PULSE_API_KEY not set.</strong> This is a preview only — set the key to enable sending.
                      </div>
                    )}
                    <p className="text-gray-700 text-sm mb-3">
                      <strong>{pulseModal.rows.length}</strong> post{pulseModal.rows.length === 1 ? '' : 's'} will be sent to Pulse — one per platform:
                    </p>
                    <div className="border rounded-lg divide-y max-h-64 overflow-y-auto">
                      {pulseModal.rows.map((r, i) => (
                        <div key={i} className="px-3 py-2">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="inline-block text-xs font-semibold uppercase tracking-wide text-pink-700 bg-pink-50 border border-pink-200 rounded px-2 py-0.5">{r.platform}</span>
                            {r.media_urls && r.media_urls.length > 0 && (
                              <span className="text-xs text-gray-400">{r.media_urls.length} image{r.media_urls.length === 1 ? '' : 's'}</span>
                            )}
                          </div>
                          {r.title && <div className="text-sm font-medium text-gray-800">{r.title}</div>}
                          <div className="text-sm text-gray-600 line-clamp-3 whitespace-pre-line">{r.post_content}</div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 flex items-center gap-2">
                      <label className="text-sm text-gray-600">Mode</label>
                      <select
                        value={pulseModal.mode}
                        onChange={(e) => setPulseModal((m) => (m ? { ...m, mode: e.target.value as any } : m))}
                        className="border border-gray-300 rounded-md text-sm px-2 py-1"
                      >
                        <option value="draft">Draft (review in Pulse)</option>
                        <option value="schedule">Schedule (at publish time)</option>
                        <option value="now">Publish now</option>
                      </select>
                    </div>
                  </>
                )
              )}
            </div>

            <div className="px-5 py-4 border-t flex justify-end gap-3">
              <button onClick={() => setPulseModal(null)} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">
                {pulseModal.result ? 'Close' : 'Cancel'}
              </button>
              {!pulseModal.result && (
                <button
                  onClick={sendToPulse}
                  disabled={pulseModal.loading || pulseModal.sending || !pulseModal.configured || !pulseModal.rows || pulseModal.rows.length === 0}
                  className="px-4 py-2 rounded-lg bg-pink-600 text-white hover:bg-pink-700 disabled:opacity-50 flex items-center"
                >
                  {pulseModal.sending && <Loader2 className="animate-spin mr-2" size={16} />}
                  <Send size={16} className="mr-2" />
                  Send to Pulse
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}      {deleteConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">{t('modal.confirm_deletion')}</h3>
            <p className="text-gray-500 mb-6">
              {t('modal.delete_post_warning')}
            </p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setDeleteConfirmation(null)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                {t('action.cancel')}
              </button>
              <button
                onClick={() => deleteConfirmation && handleDeletePost(deleteConfirmation)}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                {t('action.delete')}
              </button>
            </div>
          </div>
        </div>
      )}

      {socialPackModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-gray-200 px-6 py-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Social Pack</h3>
                <p className="text-sm text-gray-500">{socialPackModal.title}</p>
              </div>
              <button
                onClick={() => setSocialPackModal(null)}
                className="rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                title="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="max-h-[75vh] overflow-y-auto px-6 py-5">
              {socialPackModal.loading ? (
                <div className="flex items-center justify-center py-16 text-purple-600">
                  <Loader2 className="mr-2 h-6 w-6 animate-spin" /> Social Pack wird geladen...
                </div>
              ) : socialPackModal.error ? (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {socialPackModal.error}
                </div>
              ) : socialPackModal.socialPack ? (
                <div className="space-y-5">
                  <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
                    <div><strong>Article URL:</strong> {socialPackModal.socialPack.articleUrl}</div>
                    <div><strong>Hashtags:</strong> {socialPackModal.socialPack.hashtags.map((tag) => `#${tag}`).join(' ')}</div>
                  </div>

                  {socialSections.map((section) => (
                    <div key={section.key} className="rounded-xl border border-gray-200 bg-white">
                      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                        <h4 className="text-sm font-semibold text-gray-900">{section.label}</h4>
                        <button
                          onClick={() => handleCopyText(section.value)}
                          className="inline-flex items-center rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                        >
                          <Copy size={13} className="mr-1" /> Copy
                        </button>
                      </div>
                      <pre className="whitespace-pre-wrap break-words px-4 py-4 text-sm leading-6 text-gray-700">{section.value}</pre>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
                  No social pack available for this article yet.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminBlogPostsPage;