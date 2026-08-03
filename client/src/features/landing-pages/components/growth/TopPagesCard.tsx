// Top Pages Card — Phase 5

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface PageStat {
  name: string;
  views: number;
  clicks: number;
  ctr: number;
}

interface TopPagesCardProps {
  pages: PageStat[];
}

export function TopPagesCard({ pages }: TopPagesCardProps) {
  if (pages.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No page data available.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Top Pages</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {pages.slice(0, 5).map((p, i) => (
            <div key={i} className="flex items-center justify-between text-sm">
              <span className="font-medium truncate max-w-[180px]">{p.name}</span>
              <div className="flex gap-4 text-muted-foreground">
                <span>{p.views} views</span>
                <span>{(p.ctr * 100).toFixed(1)}% CTR</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
