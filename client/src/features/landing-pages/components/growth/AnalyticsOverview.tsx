// Landing Page Analytics Overview — Phase 5

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLandingPageAnalytics } from '../../hooks/useLandingPageAnalytics';
import { AnalyticsCard } from './AnalyticsCard';
import { ConversionFunnelCard } from './ConversionFunnelCard';
import { TopCtasCard } from './TopCtasCard';
import { EventTimeline } from './EventTimeline';
import { Loader2 } from 'lucide-react';

interface AnalyticsOverviewProps {
  landingPageId: string;
}

export function AnalyticsOverview({ landingPageId }: AnalyticsOverviewProps) {
  const { analytics, isLoading, error } = useLandingPageAnalytics(landingPageId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Unable to load analytics data.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <AnalyticsCard label="Views" value={analytics.totalViews} />
        <AnalyticsCard label="CTA Clicks" value={analytics.totalCtaClicks} />
        <AnalyticsCard
          label="Click-Through Rate"
          value={`${(analytics.clickThroughRate * 100).toFixed(1)}%`}
        />
        <AnalyticsCard
          label="Conversions"
          value={analytics.totalFormSubmits}
        />
      </div>

      <Tabs defaultValue="funnel">
        <TabsList>
          <TabsTrigger value="funnel">Funnel</TabsTrigger>
          <TabsTrigger value="ctas">Top CTAs</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
        </TabsList>

        <TabsContent value="funnel">
          <ConversionFunnelCard funnel={analytics.conversionFunnel} />
        </TabsContent>

        <TabsContent value="ctas">
          <TopCtasCard ctas={analytics.topCtas} />
        </TabsContent>

        <TabsContent value="timeline">
          <EventTimeline timeline={analytics.timeline} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
