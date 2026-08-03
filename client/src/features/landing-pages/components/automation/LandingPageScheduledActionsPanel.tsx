// Phase 6: Scheduled Actions Panel

import { Badge } from '@/components/ui/badge';
import { Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import { useLandingPageScheduledActions } from '../../hooks/useLandingPageScheduledActions';

interface Props {
  landingPageId: string;
}

const statusConfig: Record<string, { icon: React.ReactNode; badgeClass: string }> = {
  pending: { icon: <Clock className="h-3 w-3 text-blue-500" />, badgeClass: 'bg-blue-50 text-blue-700' },
  executed: { icon: <CheckCircle className="h-3 w-3 text-green-500" />, badgeClass: 'bg-green-50 text-green-700' },
  failed: { icon: <AlertTriangle className="h-3 w-3 text-red-500" />, badgeClass: 'bg-red-50 text-red-700' },
  cancelled: { icon: <Clock className="h-3 w-3 text-gray-400" />, badgeClass: 'bg-gray-50 text-gray-600' },
};

export function LandingPageScheduledActionsPanel({ landingPageId }: Props) {
  const { actions, isLoading } = useLandingPageScheduledActions(landingPageId);

  if (isLoading) {
    return <div className="text-xs text-gray-400 py-4 text-center">Loading scheduled actions...</div>;
  }

  if (actions.length === 0) {
    return (
      <div className="text-xs text-gray-400 py-4 text-center">
        No scheduled actions yet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold text-gray-700">Scheduled Actions</h3>
      <div className="space-y-1.5">
        {actions.map((action: any) => {
          const status = action.status || 'pending';
          const config = statusConfig[status] || statusConfig.pending;
          const actionType = (action.action_type || action.actionType || '').replace(/_/g, ' ');
          const scheduledFor = action.scheduled_for || action.scheduledFor;

          return (
            <div key={action.id} className="flex items-center gap-2 py-1.5 px-2 rounded bg-gray-50">
              {config.icon}
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-800 capitalize truncate">{actionType}</p>
                <p className="text-[10px] text-gray-400">
                  {scheduledFor ? new Date(scheduledFor).toLocaleDateString() : 'No date'}
                </p>
              </div>
              <Badge className={`text-[9px] px-1 py-0 ${config.badgeClass}`}>{status}</Badge>
            </div>
          );
        })}
      </div>
    </div>
  );
}
