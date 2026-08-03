/**
 * Setup Wizard - Phase 5: Drafts
 * 
 * Review and publish AI-generated content:
 * - Welcome email template
 * - First blog post draft
 * - Social media post templates
 * - About page content
 * - Service descriptions
 */

import { useState, lazy, Suspense } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { 
  Loader2, 
  ArrowRight, 
  FileEdit,
  CheckCircle2,
  Eye,
  Send,
  SkipForward,
  Sparkles,
  Mail,
  FileText,
  User,
  X,
  Upload,
  ChevronDown,
  ChevronUp,
  Users
} from 'lucide-react';

// Lazy-load the CSV importer to keep the bundle lean
const SmartCSVImporter = lazy(() => import('@/components/clients/SmartCSVImporter'));

interface DraftsPhaseProps {
  onComplete: () => void;
}

interface Draft {
  id: string;
  type: 'email_template' | 'blog_post' | 'about_page' | 'social_post';
  title: string;
  description: string;
  previewText: string;
  content?: string;
  status: 'draft' | 'published' | 'skipped';
  generatedAt: string;
}

export default function DraftsPhase({ onComplete }: DraftsPhaseProps) {
  const queryClient = useQueryClient();
  const [selectedDraft, setSelectedDraft] = useState<Draft | null>(null);
  const [showCsvImport, setShowCsvImport] = useState(false);
  const [editedContent, setEditedContent] = useState('');
  
  // Fetch drafts
  const { data, isLoading, refetch } = useQuery<{
    drafts: Draft[];
    totalCount: number;
    publishedCount: number;
  }>({
    queryKey: ['setup-drafts'],
    queryFn: async () => {
      const res = await fetch('/api/setup/drafts');
      if (!res.ok) throw new Error('Failed to fetch drafts');
      return res.json();
    }
  });
  
  // Publish draft mutation
  const publishMutation = useMutation({
    mutationFn: async ({ draftId, content }: { draftId: string; content?: string }) => {
      const res = await fetch(`/api/setup/drafts/${draftId}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      });
      if (!res.ok) throw new Error('Failed to publish draft');
      return res.json();
    },
    onSuccess: () => {
      setSelectedDraft(null);
      setEditedContent('');
      refetch();
    }
  });
  
  // Skip draft mutation
  const skipMutation = useMutation({
    mutationFn: async (draftId: string) => {
      const res = await fetch(`/api/setup/drafts/${draftId}/skip`, {
        method: 'POST'
      });
      if (!res.ok) throw new Error('Failed to skip draft');
      return res.json();
    },
    onSuccess: () => {
      refetch();
    }
  });
  
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'email_template': return Mail;
      case 'blog_post': return FileText;
      case 'about_page': return User;
      default: return FileEdit;
    }
  };
  
  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'email_template': return 'Email Template';
      case 'blog_post': return 'Blog Post';
      case 'about_page': return 'About Page';
      case 'social_post': return 'Social Post';
      default: return 'Content';
    }
  };
  
  const pendingDrafts = data?.drafts.filter(d => d.status === 'draft') || [];
  const completedDrafts = data?.drafts.filter(d => d.status !== 'draft') || [];
  
  if (isLoading) {
    return (
      <div className="p-12 text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-violet-600" />
        <p className="mt-4 text-gray-600">Loading your AI-generated drafts...</p>
      </div>
    );
  }
  
  // Draft Preview/Edit Modal
  if (selectedDraft) {
    return (
      <>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-violet-100 rounded-xl flex items-center justify-center">
                {(() => {
                  const Icon = getTypeIcon(selectedDraft.type);
                  return <Icon className="w-6 h-6 text-violet-600" />;
                })()}
              </div>
              <div>
                <CardTitle className="text-2xl">{selectedDraft.title}</CardTitle>
                <CardDescription>
                  Review and customize before publishing
                </CardDescription>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setSelectedDraft(null);
                setEditedContent('');
              }}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="bg-violet-50 rounded-xl p-4 flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-violet-600 mt-0.5" />
            <div>
              <p className="text-sm text-violet-900">
                This content was generated by AI based on your business profile.
                Feel free to edit it to match your voice.
              </p>
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Content</label>
            <Textarea
              value={editedContent || selectedDraft.previewText}
              onChange={(e) => setEditedContent(e.target.value)}
              rows={12}
              className="font-mono text-sm"
            />
          </div>
        </CardContent>
        
        <CardFooter className="flex justify-between pt-6 border-t">
          <Button
            variant="ghost"
            onClick={() => {
              skipMutation.mutate(selectedDraft.id);
              setSelectedDraft(null);
            }}
          >
            <SkipForward className="w-4 h-4 mr-2" />
            Skip this draft
          </Button>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setSelectedDraft(null);
                setEditedContent('');
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => publishMutation.mutate({
                draftId: selectedDraft.id,
                content: editedContent || undefined
              })}
              disabled={publishMutation.isPending}
              className="gap-2"
            >
              {publishMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Publishing...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Publish
                </>
              )}
            </Button>
          </div>
        </CardFooter>
      </>
    );
  }
  
  return (
    <>
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-violet-100 rounded-xl flex items-center justify-center">
            <FileEdit className="w-6 h-6 text-violet-600" />
          </div>
          <div>
            <CardTitle className="text-2xl">Review AI-Generated Drafts</CardTitle>
            <CardDescription>
              We've created some starter content for you to review
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Info Banner */}
        <div className="bg-gradient-to-r from-violet-50 to-purple-50 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
              <Sparkles className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900 mb-1">
                AI-Powered Content Generation
              </h3>
              <p className="text-sm text-gray-600">
                Based on your business profile, we've drafted some content to help you get started.
                You can review, edit, and publish each piece or skip for later.
              </p>
            </div>
          </div>
        </div>

        {/* CSV Client Import Panel */}
        <div className="border rounded-xl overflow-hidden">
          <button
            type="button"
            className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            onClick={() => setShowCsvImport(!showCsvImport)}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white text-sm">
                  Import Existing Clients from CSV
                </h3>
                <p className="text-xs text-gray-500">
                  Have an existing client list? Import it now to get started quickly.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">Optional</Badge>
              {showCsvImport ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </button>
          {showCsvImport && (
            <div className="border-t p-4">
              <Suspense fallback={
                <div className="text-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-emerald-500" />
                  <p className="text-sm text-gray-500 mt-2">Loading CSV Importer...</p>
                </div>
              }>
                <SmartCSVImporter />
              </Suspense>
            </div>
          )}
        </div>
        
        {/* Draft List */}
        {pendingDrafts.length > 0 ? (
          <div className="space-y-3">
            {pendingDrafts.map(draft => {
              const Icon = getTypeIcon(draft.type);
              
              return (
                <div
                  key={draft.id}
                  className="flex items-start justify-between p-4 rounded-xl border bg-white hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-violet-100 rounded-lg flex items-center justify-center">
                      <Icon className="w-5 h-5 text-violet-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-gray-900">
                          {draft.title}
                        </h3>
                        <Badge variant="secondary" className="text-xs">
                          {getTypeLabel(draft.type)}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-500 mb-2">
                        {draft.description}
                      </p>
                      <p className="text-sm text-gray-400 italic truncate max-w-md">
                        "{draft.previewText.substring(0, 80)}..."
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedDraft(draft);
                        setEditedContent('');
                      }}
                      className="gap-1"
                    >
                      <Eye className="w-4 h-4" />
                      Review
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => skipMutation.mutate(draft.id)}
                    >
                      <SkipForward className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2">All drafts reviewed!</h3>
            <p className="text-gray-500">
              You've reviewed all the AI-generated content. You're ready to go!
            </p>
          </div>
        )}
        
        {/* Completed Summary */}
        {completedDrafts.length > 0 && pendingDrafts.length > 0 && (
          <div className="border-t pt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-3">
              Reviewed ({completedDrafts.length})
            </h4>
            <div className="flex flex-wrap gap-2">
              {completedDrafts.map(draft => (
                <Badge 
                  key={draft.id}
                  variant={draft.status === 'published' ? 'default' : 'secondary'}
                  className="gap-1"
                >
                  {draft.status === 'published' ? (
                    <CheckCircle2 className="w-3 h-3" />
                  ) : (
                    <SkipForward className="w-3 h-3" />
                  )}
                  {draft.title}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
      
      <CardFooter className="flex justify-between pt-6 border-t">
        <div>
          {pendingDrafts.length > 0 && (
            <p className="text-sm text-gray-500">
              {pendingDrafts.length} draft{pendingDrafts.length > 1 ? 's' : ''} remaining
            </p>
          )}
        </div>
        <div className="flex gap-3">
          {pendingDrafts.length > 0 && (
            <Button
              variant="ghost"
              onClick={onComplete}
            >
              Skip all & finish
            </Button>
          )}
          <Button 
            onClick={onComplete}
            className="gap-2"
          >
            {pendingDrafts.length === 0 ? (
              <>
                Complete Setup
                <CheckCircle2 className="w-4 h-4" />
              </>
            ) : (
              <>
                Finish & Launch
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </Button>
        </div>
      </CardFooter>
    </>
  );
}
