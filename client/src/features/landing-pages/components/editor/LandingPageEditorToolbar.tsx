import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Save, Copy, ArrowLeft, CheckCircle2, AlertCircle, Loader2, Globe, Lock, Link2, Eye, Sparkles } from 'lucide-react';
import { useState, useCallback } from 'react';

interface Props {
  title: string;
  isDirty: boolean;
  isSaving: boolean;
  lastSavedAt: string | null;
  saveError: string | null;
  readinessIsReady: boolean;
  readinessErrorCount: number;
  pageStatus: 'draft' | 'published' | 'archived';
  publishedUrl: string | null;
  /** The page's current slug — the live URL always tracks this, so Copy URL uses
   *  it in preference to the (publish-time, can-be-stale) publishedUrl. */
  slug?: string | null;
  isPublishing: boolean;
  isUnpublishing: boolean;
  onSave: () => void;
  onDuplicate: () => void;
  onBack: () => void;
  onPublish: () => void;
  onUnpublish: () => void;
  onPreviewLink: () => void;
  onSuggestFields: () => void;
  isSuggesting: boolean;
}

export default function LandingPageEditorToolbar({
  title,
  isDirty,
  isSaving,
  lastSavedAt,
  saveError,
  readinessIsReady,
  readinessErrorCount,
  pageStatus,
  publishedUrl,
  slug,
  isPublishing,
  isUnpublishing,
  onSave,
  onDuplicate,
  onBack,
  onPublish,
  onUnpublish,
  onPreviewLink,
  onSuggestFields,
  isSuggesting,
}: Props) {
  const [copied, setCopied] = useState(false);

  // The live URL always tracks the current slug (/lp/<slug>). publishedUrl is
  // frozen at publish time, so it goes stale the moment the slug is edited —
  // prefer the current slug so Copy URL matches the Slug field.
  const livePath = slug ? `/lp/${slug}` : publishedUrl;
  const handleCopyUrl = useCallback(() => {
    if (!livePath) return;
    const fullUrl = `${window.location.origin}${livePath}`;
    navigator.clipboard.writeText(fullUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [livePath]);

  const isPublished = pageStatus === 'published';

  return (
    <div className="flex items-center justify-between px-4 py-2 border-b bg-white sticky top-0 z-20">
      {/* Left side: back + title + status */}
      <div className="flex items-center gap-3 min-w-0">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 shrink-0"
          onClick={onBack}
          title="Back to list"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>

        <h1 className="text-sm font-semibold text-gray-800 truncate max-w-[300px]">
          {title || 'Untitled Page'}
        </h1>

        {isPublished ? (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-green-300 text-green-600">
            <Globe className="h-3 w-3 mr-1" />
            Published
          </Badge>
        ) : (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-gray-300 text-gray-500">
            <Lock className="h-3 w-3 mr-1" />
            Draft
          </Badge>
        )}

        {isDirty && (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-300 text-amber-600">
            Unsaved
          </Badge>
        )}
      </div>

      {/* Center: save status */}
      <div className="flex items-center gap-2 text-xs text-gray-500">
        {isSaving && (
          <>
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>Saving…</span>
          </>
        )}
        {!isSaving && saveError && (
          <span className="text-red-500">Save failed</span>
        )}
        {!isSaving && !saveError && lastSavedAt && (
          <span>Saved {new Date(lastSavedAt).toLocaleTimeString()}</span>
        )}
      </div>

      {/* Right side: actions */}
      <div className="flex items-center gap-2">
        {/* Readiness indicator */}
        {readinessIsReady ? (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-green-300 text-green-600">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Ready
          </Badge>
        ) : (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-red-300 text-red-600">
            <AlertCircle className="h-3 w-3 mr-1" />
            {readinessErrorCount} issue{readinessErrorCount !== 1 ? 's' : ''}
          </Badge>
        )}

        {/* Copy live URL (published only) */}
        {isPublished && livePath && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8"
            onClick={handleCopyUrl}
            title="Copy live URL"
          >
            <Link2 className="h-3.5 w-3.5 mr-1.5" />
            {copied ? 'Copied!' : 'Copy URL'}
          </Button>
        )}

        {/* Preview link (draft only) */}
        {!isPublished && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8"
            onClick={onPreviewLink}
            title="Create shareable preview link"
          >
            <Eye className="h-3.5 w-3.5 mr-1.5" />
            Preview Link
          </Button>
        )}

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 border-purple-300 text-purple-700 hover:bg-purple-50"
          onClick={onSuggestFields}
          disabled={isSuggesting}
          title="Let AI fill the empty recommended & optional fields (won't overwrite what you've written)"
        >
          {isSuggesting ? (
            <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
          ) : (
            <Sparkles className="h-3.5 w-3.5 mr-1.5" />
          )}
          Suggest fields
        </Button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8"
          onClick={onDuplicate}
        >
          <Copy className="h-3.5 w-3.5 mr-1.5" />
          Duplicate
        </Button>

        {/* Always clickable (except while saving) so the user can save at any
            time for certainty; a subtle dot marks genuinely-unsaved changes. */}
        <Button
          type="button"
          size="sm"
          className="h-8 bg-purple-600 hover:bg-purple-700"
          disabled={isSaving}
          onClick={onSave}
          title={isDirty ? 'Save your changes' : 'Everything is saved — click to save again'}
        >
          {isSaving ? (
            <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
          ) : (
            <Save className="h-3.5 w-3.5 mr-1.5" />
          )}
          {isSaving ? 'Saving…' : isDirty ? 'Save' : 'Saved'}
          {isDirty && !isSaving && <span className="ml-1.5 h-1.5 w-1.5 rounded-full bg-white/90 inline-block" aria-hidden="true" />}
        </Button>

        {/* Publish / Unpublish */}
        {isPublished ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 border-red-300 text-red-600 hover:bg-red-50"
            disabled={isUnpublishing}
            onClick={onUnpublish}
          >
            {isUnpublishing ? (
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            ) : (
              <Lock className="h-3.5 w-3.5 mr-1.5" />
            )}
            Unpublish
          </Button>
        ) : (
          <Button
            type="button"
            size="sm"
            className="h-8 bg-green-600 hover:bg-green-700"
            disabled={!readinessIsReady || isDirty || isPublishing}
            onClick={onPublish}
            title={!readinessIsReady ? 'Fix readiness issues first' : isDirty ? 'Save changes first' : 'Publish page'}
          >
            {isPublishing ? (
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            ) : (
              <Globe className="h-3.5 w-3.5 mr-1.5" />
            )}
            Publish
          </Button>
        )}
      </div>
    </div>
  );
}
