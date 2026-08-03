// Phase 7: Main Execution Panel — orchestrates all execution sub-panels

import { useState } from 'react';
import { useLandingPageExecutions } from '../../hooks/useLandingPageExecutions';
import { useLandingPageExecutionSummary } from '../../hooks/useLandingPageExecutionSummary';
import { useLandingPageExecutionActions } from '../../hooks/useLandingPageExecutionActions';
import { useLandingPageExecutionSettings } from '../../hooks/useLandingPageExecutionSettings';
import { LandingPageExecutionQueueCard } from './LandingPageExecutionQueueCard';
import { LandingPageApprovalQueuePanel } from './LandingPageApprovalQueuePanel';
import { LandingPageExecutionList } from './LandingPageExecutionList';
import { LandingPageExecutionDispatcher } from './LandingPageExecutionDispatcher';
import { LandingPageExecutionSettingsPanel } from './LandingPageExecutionSettingsPanel';
import { LandingPageExecutionFilterTabs } from './LandingPageExecutionFilterTabs';
import { LandingPageExecutionPolicyPanel } from './LandingPageExecutionPolicyPanel';

interface Props {
  landingPageId: string;
}

export function LandingPageExecutionPanel({ landingPageId }: Props) {
  const [statusFilter, setStatusFilter] = useState('all');

  const { executions, isLoading: execLoading, refetch } = useLandingPageExecutions(
    landingPageId,
    statusFilter !== 'all' ? { status: statusFilter } : undefined,
  );
  const { summary, isLoading: summaryLoading } = useLandingPageExecutionSummary(landingPageId);
  const { settings, isLoading: settingsLoading, updateSettings, isUpdating } = useLandingPageExecutionSettings(landingPageId);
  const {
    createExecution, isCreating,
    approveExecution, rejectExecution, retryExecution, cancelExecution, runExecution,
  } = useLandingPageExecutionActions(landingPageId);

  const handleDispatch = (executionType: string, payload?: Record<string, unknown>) => {
    createExecution({ execution_type: executionType, requested_payload: payload });
  };

  const filterCounts = summary ? {
    awaiting_approval: summary.awaitingApprovalCount,
    queued: summary.pendingCount,
    running: summary.runningCount,
    completed: summary.completedCount,
    failed: summary.failedCount,
  } : {};

  return (
    <div className="space-y-4">
      {/* Queue Summary */}
      <LandingPageExecutionQueueCard summary={summary} isLoading={summaryLoading} />

      {/* Approval Queue */}
      <LandingPageApprovalQueuePanel
        executions={executions}
        isLoading={execLoading}
        onApprove={(id) => approveExecution(id)}
        onReject={(id) => rejectExecution(id)}
      />

      {/* Dispatcher */}
      <LandingPageExecutionDispatcher onDispatch={handleDispatch} isDispatching={isCreating} />

      {/* Filter + Execution List */}
      <div className="space-y-2">
        <LandingPageExecutionFilterTabs
          activeFilter={statusFilter}
          onFilterChange={setStatusFilter}
          counts={filterCounts}
        />

        <LandingPageExecutionList
          executions={executions}
          isLoading={execLoading}
          onApprove={(id) => approveExecution(id)}
          onReject={(id) => rejectExecution(id)}
          onRetry={(id) => retryExecution(id)}
          onCancel={(id) => cancelExecution(id)}
          onRun={(id) => runExecution(id)}
          onCreateFirst={() => {}}
        />
      </div>

      {/* Settings */}
      <LandingPageExecutionSettingsPanel
        settings={settings}
        isLoading={settingsLoading}
        onUpdate={updateSettings}
        isUpdating={isUpdating}
      />

      {/* Policy Overview */}
      <LandingPageExecutionPolicyPanel />
    </div>
  );
}
