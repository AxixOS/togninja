// Phase 6: Landing Page Campaign Health Types

export type LandingPageCampaignHealthState =
  | 'healthy'
  | 'rising'
  | 'stable'
  | 'needs_attention'
  | 'stalled'
  | 'dormant';

export interface LandingPageMetricTrend {
  metric: string;
  currentValue: number;
  previousValue: number;
  changePercent: number;
  direction: 'up' | 'down' | 'flat';
  windowDays: number;
}

export interface LandingPageCampaignHealthSummary {
  landingPageId: string;
  state: LandingPageCampaignHealthState;
  stateLabel: string;
  reasons: string[];
  warnings: string[];
  opportunities: string[];
  recommendedNextMove: string | null;
  trends: LandingPageMetricTrend[];
  lastEvaluatedAt: string;
}
