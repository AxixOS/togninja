// Analytics Card — Phase 5

import { Card, CardContent } from '@/components/ui/card';

interface AnalyticsCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
}

export function AnalyticsCard({ label, value, subtitle }: AnalyticsCardProps) {
  return (
    <Card>
      <CardContent className="pt-4 pb-3 px-4">
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
          {label}
        </p>
        <p className="text-2xl font-bold mt-1">{value}</p>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );
}
