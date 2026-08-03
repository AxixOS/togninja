// Performance Table — Phase 5

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface PageMetric {
  landingPageId: string;
  name: string;
  slug: string;
  status: string;
  views: number;
  clicks: number;
  ctr: number;
}

interface PerformanceTableProps {
  pages: PageMetric[];
}

export function PerformanceTable({ pages }: PerformanceTableProps) {
  if (pages.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No landing page data yet.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Page Performance</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="grid grid-cols-4 text-xs font-medium text-muted-foreground border-b pb-2">
            <span>Page</span>
            <span className="text-right">Views</span>
            <span className="text-right">Clicks</span>
            <span className="text-right">CTR</span>
          </div>
          {pages.map((p) => (
            <div key={p.landingPageId} className="grid grid-cols-4 text-sm py-1.5 border-b border-muted/30 last:border-0">
              <span className="font-medium truncate">{p.name}</span>
              <span className="text-right">{p.views}</span>
              <span className="text-right">{p.clicks}</span>
              <span className="text-right">{(p.ctr * 100).toFixed(1)}%</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
