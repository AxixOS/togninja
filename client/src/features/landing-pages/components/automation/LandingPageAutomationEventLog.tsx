// Phase 6: Automation Event Log

import { Badge } from '@/components/ui/badge';
import { Clock, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { useLandingPageAutomationEvents } from '../../hooks/useLandingPageAutomationEvents';

interface Props {
  landingPageId: string;
}

const statusIcons: Record<string, React.ReactNode> = {
  info: <Info className="h-3 w-3 text-blue-500" />,
  warning: <AlertTriangle className="h-3 w-3 text-amber-500" />,
  success: <CheckCircle className="h-3 w-3 text-green-500" />,
  error: <AlertTriangle className="h-3 w-3 text-red-500" />,
};

const statusColors: Record<string, string> = {
  info: 'bg-blue-50 text-blue-700',
  warning: 'bg-amber-50 text-amber-700',
  success: 'bg-green-50 text-green-700',
  error: 'bg-red-50 text-red-700',
};

export function LandingPageAutomationEventLog({ landingPageId }: Props) {
  const { events, isLoading } = useLandingPageAutomationEvents(landingPageId);

  if (isLoading) {
    return <div className="text-xs text-gray-400 py-4 text-center">Loading activity...</div>;
  }

  if (events.length === 0) {
    return (
      <div className="text-xs text-gray-400 py-4 text-center">
        No automation activity yet.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold text-gray-700">Automation Activity</h3>
      <div className="space-y-1.5 max-h-64 overflow-y-auto">
        {events.map((event: any) => {
          const status = event.event_status || event.eventStatus || 'info';
          const summary = event.summary || '';
          const occurredAt = event.occurred_at || event.occurredAt || '';
          const eventType = (event.event_type || event.eventType || '').replace(/_/g, ' ');

          return (
            <div key={event.id} className="flex items-start gap-2 py-1.5 px-2 rounded bg-gray-50">
              <div className="mt-0.5">{statusIcons[status] || statusIcons.info}</div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-800 leading-snug">{summary}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge className={`text-[9px] px-1 py-0 ${statusColors[status] || ''}`}>{eventType}</Badge>
                  {occurredAt && (
                    <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                      <Clock className="h-2.5 w-2.5" />
                      {new Date(occurredAt).toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
