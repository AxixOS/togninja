/**
 * Setup Wizard - Phase 4: Fix First
 * 
 * Quick wins identified by AI scan:
 * - Missing SEO meta descriptions
 * - Images without alt text
 * - Broken internal links
 * - Incomplete profiles
 * - Missing pricing information
 */

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Loader2, 
  ArrowRight, 
  Wrench,
  CheckCircle2,
  AlertTriangle,
  Wand2,
  SkipForward,
  Clock,
  Zap
} from 'lucide-react';

interface FixFirstPhaseProps {
  onComplete: () => void;
}

interface FixItem {
  id: string;
  type: string;
  severity: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  impact: string;
  timeEstimate: string;
  autoFixAvailable: boolean;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
}

export default function FixFirstPhase({ onComplete }: FixFirstPhaseProps) {
  const queryClient = useQueryClient();
  const [fixingId, setFixingId] = useState<string | null>(null);
  
  // Fetch fix-first items
  const { data, isLoading, refetch } = useQuery<{
    items: FixItem[];
    totalCount: number;
    completedCount: number;
    canSkip: boolean;
  }>({
    queryKey: ['fix-first-items'],
    queryFn: async () => {
      const res = await fetch('/api/setup/fix-first/items');
      if (!res.ok) throw new Error('Failed to fetch fix items');
      return res.json();
    }
  });
  
  // Apply fix mutation
  const applyFixMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const res = await fetch(`/api/setup/fix-first/apply/${itemId}`, {
        method: 'POST'
      });
      if (!res.ok) throw new Error('Failed to apply fix');
      return res.json();
    },
    onSuccess: () => {
      setFixingId(null);
      refetch();
    },
    onError: () => {
      setFixingId(null);
    }
  });
  
  // Skip fix mutation
  const skipFixMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const res = await fetch(`/api/setup/fix-first/skip/${itemId}`, {
        method: 'POST'
      });
      if (!res.ok) throw new Error('Failed to skip fix');
      return res.json();
    },
    onSuccess: () => {
      refetch();
    }
  });
  
  // Complete phase mutation
  const completeMutation = useMutation({
    mutationFn: async () => {
      const completed = data?.items.filter(i => i.status === 'completed').length || 0;
      const skipped = data?.items.filter(i => i.status === 'skipped').length || 0;
      
      const res = await fetch('/api/setup/fix-first/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemsCompleted: completed,
          itemsSkipped: skipped
        })
      });
      if (!res.ok) throw new Error('Failed to complete fix-first');
      return res.json();
    },
    onSuccess: () => {
      onComplete();
    }
  });
  
  const handleApplyFix = (itemId: string) => {
    setFixingId(itemId);
    applyFixMutation.mutate(itemId);
  };
  
  const handleSkipFix = (itemId: string) => {
    skipFixMutation.mutate(itemId);
  };
  
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-red-100 text-red-700 border-red-200';
      case 'medium': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'low': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };
  
  const pendingItems = data?.items.filter(i => i.status === 'pending') || [];
  const completedItems = data?.items.filter(i => i.status === 'completed' || i.status === 'skipped') || [];
  const progressPct = data ? (completedItems.length / data.items.length) * 100 : 0;
  
  if (isLoading) {
    return (
      <div className="p-12 text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-orange-600" />
        <p className="mt-4 text-gray-600">Loading quick wins...</p>
      </div>
    );
  }
  
  return (
    <>
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
            <Wrench className="w-6 h-6 text-orange-600" />
          </div>
          <div>
            <CardTitle className="text-2xl">Fix First: Quick Wins</CardTitle>
            <CardDescription>
              Let's tackle the most impactful improvements first
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Progress Header */}
        <div className="bg-orange-50 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium text-orange-900">Progress</span>
            <span className="text-sm text-orange-700">
              {completedItems.length} of {data?.items.length || 0} items
            </span>
          </div>
          <Progress value={progressPct} className="h-2" />
        </div>
        
        {/* Pending Items */}
        {pendingItems.length > 0 ? (
          <div className="space-y-3">
            {pendingItems.map((item, index) => (
              <div
                key={item.id}
                className={`
                  rounded-xl border p-4 transition-all
                  ${index === 0 ? 'border-orange-200 bg-orange-50/50 shadow-sm' : 'bg-white'}
                `}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge 
                        variant="outline" 
                        className={getSeverityColor(item.severity)}
                      >
                        {item.severity} priority
                      </Badge>
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <Clock className="w-3 h-3" />
                        {item.timeEstimate}
                      </span>
                    </div>
                    <h3 className="font-medium text-gray-900 mb-1">
                      {item.title}
                    </h3>
                    <p className="text-sm text-gray-500 mb-2">
                      {item.description}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <Zap className="w-3 h-3 text-amber-500" />
                      <span>Impact: {item.impact}</span>
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    {item.autoFixAvailable ? (
                      <Button
                        size="sm"
                        onClick={() => handleApplyFix(item.id)}
                        disabled={fixingId === item.id}
                        className="gap-1"
                      >
                        {fixingId === item.id ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Fixing...
                          </>
                        ) : (
                          <>
                            <Wand2 className="w-4 h-4" />
                            Auto-Fix
                          </>
                        )}
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleApplyFix(item.id)}
                        disabled={fixingId === item.id}
                      >
                        Mark Done
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleSkipFix(item.id)}
                      className="text-gray-500"
                    >
                      <SkipForward className="w-4 h-4 mr-1" />
                      Skip
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2">All done!</h3>
            <p className="text-gray-500">
              You've addressed all the quick wins. Great job!
            </p>
          </div>
        )}
        
        {/* Completed Items Summary */}
        {completedItems.length > 0 && pendingItems.length > 0 && (
          <div className="border-t pt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-3">
              Completed ({completedItems.length})
            </h4>
            <div className="space-y-2">
              {completedItems.map(item => (
                <div 
                  key={item.id}
                  className="flex items-center gap-3 text-sm text-gray-500"
                >
                  {item.status === 'completed' ? (
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                  ) : (
                    <SkipForward className="w-4 h-4 text-gray-400" />
                  )}
                  <span className={item.status === 'skipped' ? 'line-through' : ''}>
                    {item.title}
                  </span>
                  <Badge variant="secondary" className="text-xs">
                    {item.status}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
      
      <CardFooter className="flex justify-between pt-6 border-t">
        <div>
          {pendingItems.length > 0 && (
            <p className="text-sm text-gray-500">
              {pendingItems.length} item{pendingItems.length > 1 ? 's' : ''} remaining
            </p>
          )}
        </div>
        <div className="flex gap-3">
          {pendingItems.length > 0 && (
            <Button
              variant="ghost"
              onClick={() => completeMutation.mutate()}
              disabled={completeMutation.isPending}
            >
              Skip remaining
            </Button>
          )}
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
                {pendingItems.length === 0 ? 'Continue' : 'Finish & Continue'}
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </Button>
        </div>
      </CardFooter>
    </>
  );
}
