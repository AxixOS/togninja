// Top CTAs Card — Phase 5

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface TopCta {
  label: string;
  clicks: number;
}

interface TopCtasCardProps {
  ctas: TopCta[];
}

export function TopCtasCard({ ctas }: TopCtasCardProps) {
  if (ctas.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No CTA clicks recorded yet.
        </CardContent>
      </Card>
    );
  }

  const maxClicks = Math.max(...ctas.map((c) => c.clicks), 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Top CTAs</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {ctas.map((cta, i) => (
          <div key={i} className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="font-medium truncate max-w-[200px]">
                {cta.label || 'Unlabelled'}
              </span>
              <span className="text-muted-foreground">{cta.clicks} clicks</span>
            </div>
            <div className="h-2 bg-muted rounded overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded"
                style={{ width: `${(cta.clicks / maxClicks) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
