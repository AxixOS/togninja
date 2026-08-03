// Landing Page Analytics — Helpers
// Pure functions for aggregating, summarising, and formatting analytics data

import type {
  LandingPageEventRecord,
  LandingPageAnalyticsSummary,
  LandingPageConversionFunnel,
  LandingPageTopCtaMetric,
  LandingPagePerformanceMetrics,
} from '../types/landingPageAnalytics.types';
import {
  CONVERSION_EVENT_TYPES,
  ENGAGEMENT_EVENT_TYPES,
  TOP_CTAS_LIMIT,
  RECENT_EVENTS_LIMIT,
} from './landingPageAnalytics.constants';

// ── Core Aggregation ─────────────────────────────────────────

export function aggregateEventCounts(
  events: LandingPageEventRecord[],
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const e of events) {
    counts[e.event_type] = (counts[e.event_type] || 0) + 1;
  }
  return counts;
}

// ── Rate Calculations ────────────────────────────────────────

export function calculateCtr(views: number, clicks: number): number {
  if (views === 0) return 0;
  return Math.round((clicks / views) * 10000) / 100; // 2 decimal places
}

export function calculateConversionRate(views: number, conversions: number): number {
  if (views === 0) return 0;
  return Math.round((conversions / views) * 10000) / 100;
}

// ── Funnel Builder ───────────────────────────────────────────

export function buildFunnelMetrics(
  events: LandingPageEventRecord[],
): LandingPageConversionFunnel {
  const counts = aggregateEventCounts(events);
  const views = (counts['page_view'] || 0) + (counts['preview_view'] || 0);
  const ctaClicks = ENGAGEMENT_EVENT_TYPES.reduce((sum, t) => sum + (counts[t] || 0), 0);
  const formStarts = counts['form_start'] || 0;
  const formSubmits = CONVERSION_EVENT_TYPES.reduce((sum, t) => sum + (counts[t] || 0), 0);

  return {
    views,
    ctaClicks,
    formStarts,
    formSubmits,
    ctaRate: calculateCtr(views, ctaClicks),
    startRate: calculateCtr(ctaClicks, formStarts),
    submitRate: calculateCtr(formStarts, formSubmits),
  };
}

// ── Top CTAs ─────────────────────────────────────────────────

export function summarizeTopCtas(
  events: LandingPageEventRecord[],
  limit = TOP_CTAS_LIMIT,
): LandingPageTopCtaMetric[] {
  const ctaEvents = events.filter(
    (e) => e.event_type === 'cta_click' || e.event_type === 'secondary_cta_click',
  );
  const groups: Record<string, { label: string; count: number; lastClicked: string }> = {};

  for (const e of ctaEvents) {
    const key = e.event_label || 'Unknown CTA';
    if (!groups[key]) {
      groups[key] = { label: key, count: 0, lastClicked: e.occurred_at };
    }
    groups[key].count += 1;
    if (e.occurred_at > groups[key].lastClicked) {
      groups[key].lastClicked = e.occurred_at;
    }
  }

  const totalViews = events.filter((e) => e.event_type === 'page_view').length || 1;

  return Object.values(groups)
    .map((g) => ({
      label: g.label,
      clicks: g.count,
      ctr: calculateCtr(totalViews, g.count),
      lastClicked: g.lastClicked,
    }))
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, limit);
}

// ── Top Pages (for overview across many pages) ───────────────

export function summarizeTopPages(
  events: LandingPageEventRecord[],
  limit = 5,
): { landingPageId: string; views: number; clicks: number; ctr: number }[] {
  const byPage: Record<string, { views: number; clicks: number }> = {};

  for (const e of events) {
    const id = e.landing_page_id;
    if (!byPage[id]) byPage[id] = { views: 0, clicks: 0 };
    if (e.event_type === 'page_view') byPage[id].views += 1;
    if (ENGAGEMENT_EVENT_TYPES.includes(e.event_type as any)) byPage[id].clicks += 1;
  }

  return Object.entries(byPage)
    .map(([landingPageId, d]) => ({
      landingPageId,
      views: d.views,
      clicks: d.clicks,
      ctr: calculateCtr(d.views, d.clicks),
    }))
    .sort((a, b) => b.views - a.views)
    .slice(0, limit);
}

// ── Timeline Bucketing ───────────────────────────────────────

export function normalizeTimeBuckets(
  events: LandingPageEventRecord[],
  bucketCount = 14,
): { date: string; views: number; clicks: number; conversions: number }[] {
  if (events.length === 0) return [];

  const sorted = [...events].sort(
    (a, b) => new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime(),
  );

  const start = new Date(sorted[0].occurred_at).getTime();
  const end = new Date(sorted[sorted.length - 1].occurred_at).getTime();
  const range = Math.max(end - start, 1);
  const bucketSize = range / bucketCount;

  const buckets: { date: string; views: number; clicks: number; conversions: number }[] = Array.from({ length: bucketCount }, (_, i) => ({
    date: new Date(start + bucketSize * i).toISOString().split('T')[0],
    views: 0,
    clicks: 0,
    conversions: 0,
  }));

  for (const e of sorted) {
    const t = new Date(e.occurred_at).getTime();
    const idx = Math.min(Math.floor((t - start) / bucketSize), bucketCount - 1);
    if (e.event_type === 'page_view') buckets[idx].views += 1;
    if (ENGAGEMENT_EVENT_TYPES.includes(e.event_type as any)) buckets[idx].clicks += 1;
    if (CONVERSION_EVENT_TYPES.includes(e.event_type as any)) buckets[idx].conversions += 1;
  }

  return buckets;
}

// ── Recent Activity ──────────────────────────────────────────

export function buildRecentActivityTimeline(
  events: LandingPageEventRecord[],
  limit = RECENT_EVENTS_LIMIT,
): LandingPageEventRecord[] {
  return [...events]
    .sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime())
    .slice(0, limit);
}

// ── Full Summary Builder ─────────────────────────────────────

export function buildAnalyticsSummary(
  events: LandingPageEventRecord[],
): LandingPageAnalyticsSummary {
  const counts = aggregateEventCounts(events);
  const totalViews = (counts['page_view'] || 0) + (counts['preview_view'] || 0);
  const totalCtaClicks = ENGAGEMENT_EVENT_TYPES.reduce(
    (sum, t) => sum + (counts[t] || 0),
    0,
  );
  const totalFormStarts = counts['form_start'] || 0;
  const totalFormSubmits = CONVERSION_EVENT_TYPES.reduce(
    (sum, t) => sum + (counts[t] || 0),
    0,
  );

  return {
    totalViews,
    totalCtaClicks,
    totalFormStarts,
    totalFormSubmits,
    clickThroughRate: calculateCtr(totalViews, totalCtaClicks),
    conversionRate: calculateConversionRate(totalViews, totalFormSubmits),
    conversionFunnel: buildFunnelMetrics(events),
    topCtas: summarizeTopCtas(events),
    timeline: normalizeTimeBuckets(events).map(b => ({ date: b.date, views: b.views, clicks: b.clicks })),
    recentEvents: buildRecentActivityTimeline(events) as any,
  };
}

// ── Performance Metrics (single page, range) ─────────────────

export function buildPerformanceMetrics(
  events: LandingPageEventRecord[],
  previousPeriodEvents?: LandingPageEventRecord[],
): LandingPagePerformanceMetrics {
  const summary = buildAnalyticsSummary(events);

  let viewsTrend: number | undefined;
  let clicksTrend: number | undefined;
  let conversionTrend: number | undefined;

  if (previousPeriodEvents && previousPeriodEvents.length > 0) {
    const prevSummary = buildAnalyticsSummary(previousPeriodEvents);
    viewsTrend = prevSummary.totalViews
      ? Math.round(((summary.totalViews - prevSummary.totalViews) / prevSummary.totalViews) * 100)
      : undefined;
    clicksTrend = prevSummary.totalCtaClicks
      ? Math.round(
          ((summary.totalCtaClicks - prevSummary.totalCtaClicks) / prevSummary.totalCtaClicks) *
            100,
        )
      : undefined;
    conversionTrend = prevSummary.totalFormSubmits
      ? Math.round(
          ((summary.totalFormSubmits - prevSummary.totalFormSubmits) /
            prevSummary.totalFormSubmits) *
            100,
        )
      : undefined;
  }

  return {
    pageId: '',
    pageTitle: '',
    slug: '',
    status: '',
    views: summary.totalViews,
    ctaClicks: summary.totalCtaClicks,
    ctr: summary.clickThroughRate,
    conversions: summary.totalFormSubmits,
    conversionRate: summary.conversionRate,
    bestVariant: null,
  } as LandingPagePerformanceMetrics;
}
