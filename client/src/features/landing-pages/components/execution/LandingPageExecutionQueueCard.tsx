// Phase 7: Execution Queue Summary Card

import { Zap, Clock, ShieldCheck, Play, CheckCircle, XCircle } from 'lucide-react';
import type { LandingPageExecutionQueueSummary } from '../../types/landingPageExecution.types';

interface Props {
  summary: LandingPageExecutionQueueSummary | null;
  isLoading: boolean;
}

export function LandingPageExecutionQueueCard({ summary, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="animate-pulse space-y-2">
          <div className="h-4 bg-gray-200 rounded w-1/3" />
          <div className="h-8 bg-gray-200 rounded w-full" />
        </div>
      </div>
    );
  }

  if (!summary) return null;

  const items = [
    { label: 'Pending', count: summary.pendingCount, icon: Clock, color: 'text-gray-600' },
    { label: 'Awaiting Approval', count: summary.awaitingApprovalCount, icon: ShieldCheck, color: 'text-yellow-600' },
    { label: 'Running', count: summary.runningCount, icon: Play, color: 'text-purple-600' },
    { label: 'Completed', count: summary.completedCount, icon: CheckCircle, color: 'text-green-600' },
    { label: 'Failed', count: summary.failedCount, icon: XCircle, color: 'text-red-600' },
  ];

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-center gap-2 mb-3">
        <Zap className="h-4 w-4 text-indigo-600" />
        <h3 className="text-sm font-semibold text-gray-900">Execution Queue</h3>
        <span className="ml-auto text-xs text-gray-500">{summary.totalCount} total</span>
      </div>
      <div className="grid grid-cols-5 gap-2">
        {items.map((item) => (
          <div key={item.label} className="flex flex-col items-center rounded-md bg-gray-50 px-2 py-2">
            <item.icon className={`h-4 w-4 ${item.color} mb-1`} />
            <span className="text-lg font-bold text-gray-900">{item.count}</span>
            <span className="text-[10px] text-gray-500 text-center leading-tight">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
