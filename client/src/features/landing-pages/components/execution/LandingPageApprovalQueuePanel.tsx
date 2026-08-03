// Phase 7: Approval Queue Panel

import { ShieldCheck } from 'lucide-react';
import type { LandingPageExecutionRecord } from '../../types/landingPageExecution.types';
import { LandingPageExecutionCard } from './LandingPageExecutionCard';

interface Props {
  executions: LandingPageExecutionRecord[];
  isLoading: boolean;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
}

export function LandingPageApprovalQueuePanel({ executions, isLoading, onApprove, onReject }: Props) {
  const awaitingApproval = executions.filter((e) => e.executionStatus === 'awaiting_approval');

  if (isLoading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="animate-pulse space-y-2">
          <div className="h-4 bg-gray-200 rounded w-1/3" />
          <div className="h-16 bg-gray-200 rounded w-full" />
        </div>
      </div>
    );
  }

  if (awaitingApproval.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="flex items-center gap-2 mb-2">
          <ShieldCheck className="h-4 w-4 text-green-600" />
          <h3 className="text-sm font-semibold text-gray-900">Approval Queue</h3>
        </div>
        <p className="text-xs text-gray-500">No actions awaiting your approval.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
      <div className="flex items-center gap-2 mb-3">
        <ShieldCheck className="h-4 w-4 text-yellow-600" />
        <h3 className="text-sm font-semibold text-gray-900">Approval Queue</h3>
        <span className="ml-auto inline-flex items-center rounded-full bg-yellow-200 px-2 py-0.5 text-xs font-medium text-yellow-800">
          {awaitingApproval.length}
        </span>
      </div>
      <div className="space-y-2">
        {awaitingApproval.map((execution) => (
          <LandingPageExecutionCard
            key={execution.id}
            execution={execution}
            onApprove={onApprove}
            onReject={onReject}
          />
        ))}
      </div>
    </div>
  );
}
