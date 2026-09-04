/**
 * Setup Wizard - Phase 3: Scanning
 * 
 * AI-powered content analysis:
 * - Scans existing portfolio images
 * - Checks blog posts for SEO issues
 * - Analyzes product listings
 * - Reviews client data completeness
 * - Builds knowledge graph for AI assistance
 */

import { useState, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import SetupNarrator from '@/components/setup/SetupNarrator';
import { 
  Loader2, 
  ArrowRight, 
  Scan, 
  CheckCircle2, 
  AlertTriangle,
  FileImage,
  FileText,
  Users,
  Package,
  Sparkles,
  Globe
} from 'lucide-react';

interface ScanningPhaseProps {
  onComplete: () => void;
  /** True when nothing follows this step, so the button can say so. */
  isLast?: boolean;
}

interface ScanResult {
  scanId: string;
  status: 'idle' | 'running' | 'complete' | 'error';
  progress: number;
  results?: {
    pagesScanned: number;
    issuesFound: number;
    suggestionsGenerated: number;
    fixFirstItems: Array<{
      id: string;
      type: string;
      severity: 'high' | 'medium' | 'low';
      title: string;
      description: string;
    }>;
  };
  error?: string;
}

export default function ScanningPhase({ onComplete, isLast = false }: ScanningPhaseProps) {
  const [scanState, setScanState] = useState<ScanResult>({
    scanId: '',
    status: 'idle',
    progress: 0
  });
  
  // Start scan mutation
  const startScanMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/setup/scanning/start', {
        method: 'POST'
      });
      if (!res.ok) throw new Error('Failed to start scan');
      return res.json();
    },
    onSuccess: (data) => {
      setScanState({
        scanId: data.scanId,
        status: 'running',
        progress: 0
      });
    }
  });
  
  // Poll for scan status
  const { data: statusData, isLoading: statusLoading } = useQuery({
    queryKey: ['scan-status', scanState.scanId],
    queryFn: async () => {
      const res = await fetch(`/api/setup/scanning/status/${scanState.scanId}`);
      if (!res.ok) throw new Error('Failed to get scan status');
      return res.json();
    },
    enabled: scanState.status === 'running' && !!scanState.scanId,
    refetchInterval: 2000 // Poll every 2 seconds
  });
  
  // Update scan state when status changes
  useEffect(() => {
    if (statusData) {
      if (statusData.status === 'complete') {
        setScanState(prev => ({
          ...prev,
          status: 'complete',
          progress: 100,
          results: statusData.results
        }));
      } else {
        setScanState(prev => ({
          ...prev,
          progress: Math.min(prev.progress + 10, 90)
        }));
      }
    }
  }, [statusData]);
  
  // --- AI homepage generation (from the studio's existing website) ---
  // Runs independently of the content scan: kicks off once on mount if a website
  // URL was captured in Basics, then polls the pipeline and previews the draft.
  const [hpKicked, setHpKicked] = useState(false);
  const [hpPolling, setHpPolling] = useState(true);
  /** Why a regenerate did not start. The server refuses with a reason; the studio should read it. */
  const [hpNotice, setHpNotice] = useState<string | null>(null);
  const { data: hp } = useQuery<any>({
    queryKey: ['homepage-gen-status'],
    queryFn: async () => {
      const res = await fetch('/api/setup/homepage/status');
      if (!res.ok) throw new Error('status failed');
      return res.json();
    },
    refetchInterval: hpPolling ? 2500 : false,
  });

  useEffect(() => {
    if (!hp) return;
    if (!hpKicked && hp.status === 'idle' && hp.hasWebsite) {
      setHpKicked(true);
      fetch('/api/setup/homepage/generate', { method: 'POST' }).catch(() => {});
    }
    if (hp.status === 'ready' || hp.status === 'error' || hp.status === 'skipped' || hp.status === 'quota_exceeded') {
      setHpPolling(false);
    }
    if (hp.status === 'idle' && hp.hasWebsite === false) {
      setHpPolling(false);
    }
  }, [hp, hpKicked]);

  const hpStageLabel = (stage?: string) => {
    switch (stage) {
      case 'crawling': return 'Reading your existing website…';
      case 'distilling': return 'Understanding your content…';
      case 'writing': return 'Writing your new homepage…';
      case 'ready': return 'Your new homepage is ready';
      // Without this, a skipped run sat under "Preparing…" forever while polling had already
      // stopped — a progress line describing work that was never going to happen.
      case 'skipped': return 'Homepage writing is unavailable right now';
      case 'quota_exceeded': return 'No site generations left on this plan';
      default: return 'Preparing…';
    }
  };
  const hpInProgress = hp && (hp.status === 'running' || (hp.status === 'idle' && hp.hasWebsite));

  // Re-run generation from scratch (fresh crawl + AI). Uses the backend's force path,
  // which clears the prior draft. Lets you regenerate if you're not happy with the draft.
  // A refusal has to be visible. This was `.catch(() => {})` with the response discarded, so
  // when the server started bounding this endpoint — a cooldown, and a lifetime run limit that
  // ?force=1 cannot step over — the button became a no-op that looked like a broken button.
  // Nothing is worse to use than a control that responds to being pressed by doing nothing.
  const handleRegenerate = async () => {
    setHpNotice(null);
    setHpPolling(true);
    try {
      const res = await fetch('/api/setup/homepage/generate?force=1', { method: 'POST' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({} as any));
        setHpPolling(false);
        setHpNotice(body?.message || 'That could not be started just now. Please try again shortly.');
      }
    } catch {
      setHpPolling(false);
      setHpNotice('We could not reach the server. Check your connection and try again.');
    }
  };

  // Complete phase mutation
  const completeMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/setup/scanning/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pagesScanned: scanState.results?.pagesScanned || 0,
          issuesFound: scanState.results?.issuesFound || 0
        })
      });
      if (!res.ok) throw new Error('Failed to complete scanning');
      return res.json();
    },
    onSuccess: () => {
      onComplete();
    }
  });
  
  const handleStartScan = () => {
    startScanMutation.mutate();
  };
  
  // The counts here used to be hardcoded (24, 8, 12, 45) — invented figures for a studio
  // that had just installed the product and owned none of it. They were never rendered,
  // which is the only reason nobody saw them; removed so they cannot start being shown
  // by a later edit. The real figures come back in scanState.results.
  const scanningSteps = [
    { id: 'portfolio', label: 'Portfolio Images', icon: FileImage },
    { id: 'blog', label: 'Blog Posts', icon: FileText },
    { id: 'products', label: 'Products & Services', icon: Package },
    { id: 'clients', label: 'Client Records', icon: Users }
  ];
  
  return (
    <>
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-cyan-100 rounded-xl flex items-center justify-center">
            <Scan className="w-6 h-6 text-cyan-600" />
          </div>
          <div>
            <CardTitle className="text-2xl">Review your CRM data</CardTitle>
            <CardDescription>
              We check the data already in your CRM for quick wins. (Your website was analysed earlier — that is what produced the homepage draft above.)
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* AI homepage generation from the studio's existing website */}
        {/*
          The stage word and the spinner stay, but they are no longer the whole story.

          This box used to show "Building your new homepage" and a spinner for a minute or
          more while a real crawl ran, real subjects were pulled out of the studio's own page
          titles, and a real homepage was written. A studio watching that assumes it has hung
          — and the one whose screenshot prompted this stopped here.
        */}
        {hpInProgress && (
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-6 space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm shrink-0">
                <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
                  <Globe className="w-4 h-4 text-indigo-600" />
                  Building your new homepage
                </h3>
                <p className="text-sm text-gray-600">{hpStageLabel(hp?.stage)}</p>
              </div>
            </div>

            <SetupNarrator findings={hp?.findings || []} busy />
          </div>
        )}

        {/* The feed is worth keeping on screen after it finishes — it is the receipt for
            what was read and where the page came from. */}
        {hp?.status === 'ready' && Array.isArray(hp?.findings) && hp.findings.length > 0 && (
          <SetupNarrator findings={hp.findings} busy={false} />
        )}
        {hp?.status === 'ready' && hp?.previewUrl && (
          <div className="border border-indigo-200 rounded-2xl overflow-hidden">
            <div className="bg-indigo-50 px-5 py-3 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-indigo-600" />
              <div>
                <p className="font-semibold text-gray-900 text-sm">Your new homepage draft is ready</p>
                <p className="text-xs text-gray-600">You'll review, edit and publish it from your dashboard after setup.</p>
              </div>
            </div>
            <iframe
              src={hp.previewUrl}
              title="New homepage preview"
              className="w-full h-[420px] bg-white"
            />
            <div className="bg-white px-5 py-3 border-t border-indigo-100 flex items-center justify-between">
              <p className="text-xs text-gray-500">Not quite right? Regenerate a fresh draft from your website.</p>
              <button
                type="button"
                onClick={handleRegenerate}
                className="text-sm font-medium text-indigo-700 hover:text-indigo-900 underline"
              >
                Regenerate
              </button>
            </div>
          </div>
        )}

        {hp?.status === 'error' && (
          <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
            We couldn't auto-generate a homepage from your website this time — you can create one anytime from your dashboard. This won't hold up your setup.
            {hp?.error && <span className="block mt-1 text-xs text-amber-700">Reason: {hp.error}</span>}
            <button
              type="button"
              onClick={handleRegenerate}
              className="mt-2 block text-sm font-medium text-amber-900 hover:underline"
            >
              Try again
            </button>
          </div>
        )}

        {/*
          The state that rendered nothing at all.

          The pipeline sets status 'skipped' when the platform cannot generate, and polling
          stops on it — but only 'error' had a panel. So the generation card simply disappeared
          mid-run: "Writing your new homepage…" vanished and the studio was told nothing, with
          no way to tell a missing credential from a crash from a finished job.

          Deliberately not styled as an error and deliberately has no Try again. This is the
          platform's own configuration, not a fault in their website and not something a retry
          can change — offering one would just fail again and read as their problem.
        */}
        {hpNotice && (
          <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-900">
            {hpNotice}
          </div>
        )}

        {hp?.status === 'skipped' && (
          <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 text-sm text-slate-700">
            Automatic homepage writing isn't switched on for this instance yet — that's on us,
            not your website. Nothing about your setup is affected, and you can write a homepage
            any time from your dashboard.
          </div>
        )}

        {/*
          The allowance is spent. NOT an error and NOT "not configured" — the platform works
          and the studio has had what was included.

          The second sentence is load-bearing. AxixOS caps attempts at 3x the allowance and
          counts failures against it, so a studio can arrive here having produced zero finished
          sites. Copy that said "you have used your 10 generations" would be a flat lie in that
          case, and the studio would reasonably believe they had ten sites somewhere.
        */}
        {hp?.status === 'quota_exceeded' && (
          <div className="rounded-xl bg-indigo-50 border border-indigo-200 px-4 py-3 text-sm text-indigo-900">
            You've used the automatic site generations included with this plan. Attempts that
            didn't finish count towards the total too, so this can arrive sooner than expected.
            <span className="block mt-1">
              Nothing about your setup is affected — your site is still yours to edit, and you
              can write or change any page from your dashboard. Get in touch if you need more.
            </span>
          </div>
        )}

        {scanState.status === 'idle' && (
          <>
            <div className="bg-gradient-to-br from-cyan-50 to-blue-50 rounded-2xl p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm">
                  <Sparkles className="w-6 h-6 text-cyan-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">
                    What we'll scan
                  </h3>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-cyan-600" />
                      Portfolio images for missing metadata
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-cyan-600" />
                      Blog posts for SEO optimization
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-cyan-600" />
                      Products for pricing and descriptions
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-cyan-600" />
                      Client data for completeness
                    </li>
                  </ul>
                </div>
              </div>
            </div>
            
            <div className="text-center py-8">
              <Button 
                size="lg" 
                onClick={handleStartScan}
                disabled={startScanMutation.isPending}
                className="gap-2"
              >
                {startScanMutation.isPending ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Starting scan...
                  </>
                ) : (
                  <>
                    <Scan className="w-5 h-5" />
                    Start AI Scan
                  </>
                )}
              </Button>
            </div>
          </>
        )}
        
        {scanState.status === 'running' && (
          <div className="py-8">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-cyan-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                <Scan className="w-10 h-10 text-cyan-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Scanning your content...</h3>
              <p className="text-gray-500">This usually takes about 30 seconds</p>
            </div>
            
            <div className="max-w-md mx-auto">
              <Progress value={scanState.progress} className="h-3 mb-4" />
              <p className="text-center text-sm text-gray-500">
                {scanState.progress}% complete
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-3 mt-8">
              {scanningSteps.map((step, index) => {
                const Icon = step.icon;
                const isActive = scanState.progress > (index * 25);
                const isComplete = scanState.progress > ((index + 1) * 25);
                
                return (
                  <div 
                    key={step.id}
                    className={`
                      flex items-center gap-3 p-3 rounded-lg transition-all
                      ${isActive ? 'bg-cyan-50' : 'bg-gray-50'}
                    `}
                  >
                    <div className={`
                      w-8 h-8 rounded-lg flex items-center justify-center
                      ${isComplete ? 'bg-cyan-200' : isActive ? 'bg-cyan-100 animate-pulse' : 'bg-gray-200'}
                    `}>
                      {isComplete ? (
                        <CheckCircle2 className="w-4 h-4 text-cyan-700" />
                      ) : isActive ? (
                        <Loader2 className="w-4 h-4 text-cyan-600 animate-spin" />
                      ) : (
                        <Icon className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                    <div>
                      <p className={`text-sm font-medium ${isActive ? 'text-gray-900' : 'text-gray-500'}`}>
                        {step.label}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        
        {scanState.status === 'complete' && scanState.results && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-10 h-10 text-green-600" />
              </div>
              {/* NOTHING FOUND IS THE NORMAL RESULT FOR A NEW STUDIO, AND IS NOT A FAILURE.

                  This sentence was unconditional, so an instance with no clients yet — which
                  is every instance on its first day — was told "We found some opportunities to
                  improve your setup" directly above three zeros. Reported as "I scanned, but
                  zero opportunities on this website": the copy promised findings, the numbers
                  denied them, and the studio was left deciding which one was broken.

                  This scan reads the CRM, not the website. A studio who has not imported
                  clients has nothing for it to read, and saying so plainly is both true and
                  more use than a claim they can see is wrong. */}
              <h3 className="text-xl font-semibold mb-2">
                {(scanState.results.pagesScanned || 0) === 0 ? 'Nothing to check yet' : 'Scan Complete!'}
              </h3>
              <p className="text-gray-500">
                {(scanState.results.pagesScanned || 0) === 0
                  ? 'This checks your client records for duplicates and gaps, and there are none here yet — nothing has gone wrong. It will have something to look at once you import or add clients.'
                  : (scanState.results.issuesFound || 0) === 0
                    ? 'We checked your client records and found nothing that needs fixing.'
                    : 'We found some opportunities to improve your setup'}
              </p>
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-blue-50 rounded-xl p-4 text-center">
                <p className="text-3xl font-bold text-blue-600">
                  {scanState.results.pagesScanned}
                </p>
                <p className="text-sm text-blue-700">CRM Records Checked</p>
              </div>
              <div className="bg-amber-50 rounded-xl p-4 text-center">
                <p className="text-3xl font-bold text-amber-600">
                  {scanState.results.issuesFound}
                </p>
                <p className="text-sm text-amber-700">Issues Found</p>
              </div>
              <div className="bg-green-50 rounded-xl p-4 text-center">
                <p className="text-3xl font-bold text-green-600">
                  {scanState.results.suggestionsGenerated}
                </p>
                <p className="text-sm text-green-700">AI Suggestions</p>
              </div>
            </div>
            
            {scanState.results.fixFirstItems.length > 0 && (
              <div className="bg-gray-50 rounded-xl p-4">
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  Quick Wins Found
                </h4>
                <ul className="space-y-2">
                  {scanState.results.fixFirstItems.slice(0, 3).map(item => (
                    <li key={item.id} className="flex items-center gap-3">
                      <Badge 
                        variant={item.severity === 'high' ? 'destructive' : 'secondary'}
                        className="text-xs"
                      >
                        {item.severity}
                      </Badge>
                      <span className="text-sm">{item.title}</span>
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-gray-500 mt-3">
                  We'll help you fix these in the next step
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
      
      <CardFooter className="flex justify-between pt-6 border-t">
        <div>
          {scanState.status === 'running' && (
            <p className="text-sm text-gray-500">
              Please wait while we analyze your content...
            </p>
          )}
        </div>
        <div className="flex gap-3">
          {scanState.status === 'idle' && (
            <Button
              variant="ghost"
              onClick={() => completeMutation.mutate()}
              disabled={completeMutation.isPending}
            >
              Skip scan
            </Button>
          )}
          {scanState.status === 'complete' && (
            <Button 
              onClick={() => completeMutation.mutate()}
              disabled={completeMutation.isPending}
              className="gap-2"
            >
              {completeMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  {isLast ? 'Finish setup' : 'Continue to Fix First'}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          )}
        </div>
      </CardFooter>
    </>
  );
}
