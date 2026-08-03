// Phase 7: Execution List

import type { LandingPageExecutionRecord } from '../../types/landingPageExecution.types';
import { LandingPageExecutionCard } from './LandingPageExecutionCard';
import { LandingPageExecutionEmptyState } from './LandingPageExecutionEmptyState';

interface Props {
  executions: LandingPageExecutionRecord[];
  isLoading: boolean;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  onRetry?: (id: string) => void;
  onCancel?: (id: string) => void;
  onRun?: (id: string) => void;
  onCreateFirst?: () => void;
}

export function LandingPageExecutionList({
  executions, isLoading, onApprove, onReject, onRetry, onCancel, onRun, onCreateFirst,
}: Props) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-lg border border-gray-200 bg-white p-4 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-2/3 mb-2" />
            <div className="h-3 bg-gray-200 rounded w-1/3" />
          </div>
        ))}
      </div>
    );
  }

  if (executions.length === 0) {
    return <LandingPageExecutionEmptyState onCreateFirst={onCreateFirst} />;
  }

  return (
    <div className="space-y-2">
      {executions.map((execution) => (
        <LandingPageExecutionCard
          key={execution.id}
          execution={execution}
          onApprove={onApprove}
          onReject={onReject}
          onRetry={onRetry}
          onCancel={onCancel}
          onRun={onRun}
        />
      ))}
    </div>
  );
}
