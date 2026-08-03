// Conversion Funnel Card — Phase 5

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface FunnelData {
  views: number;
  ctaClicks: number;
  formStarts: number;
  formSubmits: number;
  ctaRate: number;
  startRate: number;
  submitRate: number;
}

interface ConversionFunnelCardProps {
  funnel: FunnelData;
}

function FunnelStep({
  label,
  count,
  rate,
  widthPercent,
}: {
  label: string;
  count: number;
  rate?: number;
  widthPercent: number;
}) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">
          {count}{rate !== undefined ? ` (${(rate * 100).toFixed(1)}%)` : ''}
        </span>
      </div>
      <div className="h-6 bg-muted rounded overflow-hidden">
        <div
          className="h-full bg-primary/70 rounded transition-all"
          style={{ width: `${Math.max(widthPercent, 2)}%` }}
        />
      </div>
    </div>
  );
}

export function ConversionFunnelCard({ funnel }: ConversionFunnelCardProps) {
  const max = Math.max(funnel.views, 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Conversion Funnel</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <FunnelStep
          label="Page Views"
          count={funnel.views}
          widthPercent={100}
        />
        <FunnelStep
          label="CTA Clicks"
          count={funnel.ctaClicks}
          rate={funnel.ctaRate}
          widthPercent={(funnel.ctaClicks / max) * 100}
        />
        <FunnelStep
          label="Form Starts"
          count={funnel.formStarts}
          rate={funnel.startRate}
          widthPercent={(funnel.formStarts / max) * 100}
        />
        <FunnelStep
          label="Form Submits"
          count={funnel.formSubmits}
          rate={funnel.submitRate}
          widthPercent={(funnel.formSubmits / max) * 100}
        />
      </CardContent>
    </Card>
  );
}
