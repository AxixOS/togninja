// Event Timeline — Phase 5

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface TimelinePoint {
  date: string;
  views: number;
  clicks: number;
}

interface EventTimelineProps {
  timeline: TimelinePoint[];
}

export function EventTimeline({ timeline }: EventTimelineProps) {
  if (timeline.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No timeline data available yet.
        </CardContent>
      </Card>
    );
  }

  const maxViews = Math.max(...timeline.map((t) => t.views), 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Daily Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-1 h-32">
          {timeline.map((point, i) => {
            const height = (point.views / maxViews) * 100;
            const clickHeight = maxViews > 0 ? (point.clicks / maxViews) * 100 : 0;
            return (
              <div
                key={i}
                className="flex-1 flex flex-col items-center gap-0.5 min-w-0"
                title={`${point.date}: ${point.views} views, ${point.clicks} clicks`}
              >
                <div className="w-full flex flex-col justify-end h-28">
                  <div
                    className="w-full bg-primary/20 rounded-t relative"
                    style={{ height: `${Math.max(height, 2)}%` }}
                  >
                    <div
                      className="absolute bottom-0 left-0 right-0 bg-primary/60 rounded-t"
                      style={{ height: `${Math.max(clickHeight, 0)}%` }}
                    />
                  </div>
                </div>
                <span className="text-[9px] text-muted-foreground truncate w-full text-center">
                  {new Date(point.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </span>
              </div>
            );
          })}
        </div>
        <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <div className="w-3 h-2 bg-primary/20 rounded" /> Views
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-2 bg-primary/60 rounded" /> Clicks
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
