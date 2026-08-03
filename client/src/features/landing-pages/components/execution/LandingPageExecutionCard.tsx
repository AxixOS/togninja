// Phase 7: Execution Row Card

import { Clock, CheckCircle, XCircle, Play, ShieldCheck, RefreshCw, Ban, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { LandingPageExecutionRecord } from '../../types/landingPageExecution.types';
import { getExecutionTypeLabel, getExecutionStatusLabel, getExecutionStatusColor, formatExecutionDuration,
  canApprove, canReject, canRetry, canCancel } from '../../utils/landingPageExecution.helpers';

interface Props {
  execution: LandingPageExecutionRecord;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  onRetry?: (id: string) => void;
  onCancel?: (id: string) => void;
  onRun?: (id: string) => void;
}

const STATUS_ICONS: Record<string, typeof Clock> = {
  pending: Clock,
  awaiting_approval: ShieldCheck,
  approved: CheckCircle,
  queued: Zap,
  running: Play,
  completed: CheckCircle,
  failed: XCircle,
  rejected: XCircle,
  cancelled: Ban,
};

export function LandingPageExecutionCard({ execution, onApprove, onReject, onRetry, onCancel, onRun }: Props) {
  const StatusIcon = STATUS_ICONS[execution.executionStatus] || Clock;
  const statusColor = getExecutionStatusColor(execution.executionStatus);

  const colorClasses: Record<string, string> = {
    gray: 'text-gray-600 bg-gray-100',
    yellow: 'text-yellow-700 bg-yellow-100',
    blue: 'text-blue-700 bg-blue-100',
    indigo: 'text-indigo-700 bg-indigo-100',
    purple: 'text-purple-700 bg-purple-100',
    green: 'text-green-700 bg-green-100',
    red: 'text-red-700 bg-red-100',
    orange: 'text-orange-700 bg-orange-100',
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${colorClasses[statusColor] || colorClasses.gray}`}>
            <StatusIcon className="h-3 w-3" />
            {getExecutionStatusLabel(execution.executionStatus)}
          </span>
          <span className="text-sm font-medium text-gray-900 truncate">
            {getExecutionTypeLabel(execution.executionType)}
          </span>
        </div>
        <span className="text-xs text-gray-400 whitespace-nowrap ml-2">
          {execution.createdAt ? new Date(execution.createdAt).toLocaleDateString() : '—'}
        </span>
      </div>

      {execution.errorMessage && (
        <p className="text-xs text-red-600 mt-1 truncate">{execution.errorMessage}</p>
      )}

      {execution.executedAt && (
        <p className="text-xs text-gray-400 mt-1">
          Duration: {formatExecutionDuration(execution.executedAt, execution.completedAt || execution.failedAt)}
        </p>
      )}

      {execution.retryCount > 0 && (
        <p className="text-xs text-gray-400 mt-0.5">Retries: {execution.retryCount}</p>
      )}

      <div className="flex gap-1.5 mt-2">
        {canApprove(execution) && onApprove && (
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => onApprove(execution.id)}>
            <CheckCircle className="h-3 w-3 mr-1" /> Approve
          </Button>
        )}
        {canReject(execution) && onReject && (
          <Button variant="outline" size="sm" className="h-7 text-xs text-red-600" onClick={() => onReject(execution.id)}>
            <XCircle className="h-3 w-3 mr-1" /> Reject
          </Button>
        )}
        {execution.executionStatus === 'queued' && onRun && (
          <Button variant="outline" size="sm" className="h-7 text-xs text-purple-600" onClick={() => onRun(execution.id)}>
            <Play className="h-3 w-3 mr-1" /> Run
          </Button>
        )}
        {canRetry(execution, 3) && onRetry && (
          <Button variant="outline" size="sm" className="h-7 text-xs text-orange-600" onClick={() => onRetry(execution.id)}>
            <RefreshCw className="h-3 w-3 mr-1" /> Retry
          </Button>
        )}
        {canCancel(execution) && onCancel && (
          <Button variant="outline" size="sm" className="h-7 text-xs text-gray-500" onClick={() => onCancel(execution.id)}>
            <Ban className="h-3 w-3 mr-1" /> Cancel
          </Button>
        )}
      </div>
    </div>
  );
}
