// Growth Insights Panel — Phase 5

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, TrendingUp, AlertTriangle, Lightbulb, CheckCircle } from 'lucide-react';
import { useLandingPageGrowthInsights } from '../../hooks/useLandingPageGrowthInsights';

interface GrowthInsightsPanelProps {
  landingPageId: string;
}

const iconMap: Record<string, React.ReactNode> = {
  success: <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />,
  warning: <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />,
  suggestion: <Lightbulb className="h-4 w-4 text-blue-500 shrink-0" />,
  action: <TrendingUp className="h-4 w-4 text-purple-500 shrink-0" />,
};

const badgeClass: Record<string, string> = {
  success: 'bg-green-50 text-green-700 border-green-200',
  warning: 'bg-amber-50 text-amber-700 border-amber-200',
  suggestion: 'bg-blue-50 text-blue-700 border-blue-200',
  action: 'bg-purple-50 text-purple-700 border-purple-200',
};

export function GrowthInsightsPanel({ landingPageId }: GrowthInsightsPanelProps) {
  const { insights, isLoading } = useLandingPageGrowthInsights(landingPageId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!insights) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground text-sm">
          Unable to load growth insights.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-3 pb-2 px-3 text-center">
            <p className="text-xs text-muted-foreground">Views</p>
            <p className="text-xl font-bold">{insights.totalViews}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-3 pb-2 px-3 text-center">
            <p className="text-xs text-muted-foreground">Clicks</p>
            <p className="text-xl font-bold">{insights.totalCtaClicks}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-3 pb-2 px-3 text-center">
            <p className="text-xs text-muted-foreground">CTR</p>
            <p className="text-xl font-bold">{(insights.ctr * 100).toFixed(1)}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-3 pb-2 px-3 text-center">
            <p className="text-xs text-muted-foreground">Best CTA</p>
            <p className="text-sm font-medium truncate">{insights.bestCta || '—'}</p>
          </CardContent>
        </Card>
      </div>

      {insights.insights.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Insights</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {insights.insights.map((insight, i) => (
              <div key={i} className="flex items-start gap-3">
                {iconMap[insight.type] || iconMap.suggestion}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{insight.title}</span>
                    {insight.metric && (
                      <Badge variant="outline" className={badgeClass[insight.type] || ''}>
                        {insight.metric}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {insight.description}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {insights.recommendedNextAction && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="py-3 px-4 text-sm">
            <span className="font-medium">Recommended:</span>{' '}
            <span className="text-muted-foreground">{insights.recommendedNextAction}</span>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
