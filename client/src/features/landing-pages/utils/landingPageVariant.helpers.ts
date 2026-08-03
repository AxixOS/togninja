// Landing Page Variant — Helpers
// Pure functions for variant key generation, cloning, traffic splitting, and performance

import type {
  LandingPageVariantRecord,
  CreateLandingPageVariantInput,
  LandingPageVariantPerformance,
} from '../types/landingPageVariant.types';
import type { LandingPageEventRecord } from '../types/landingPageAnalytics.types';
import { calculateCtr, calculateConversionRate, aggregateEventCounts } from './landingPageAnalytics.helpers';
import { ENGAGEMENT_EVENT_TYPES, CONVERSION_EVENT_TYPES } from './landingPageAnalytics.constants';

// ── Variant Key ──────────────────────────────────────────────

export function generateLandingPageVariantKey(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
}

// ── Clone Page Content into a Variant ────────────────────────

export function cloneLandingPageIntoVariant(
  pageContent: Record<string, unknown>,
  input: CreateLandingPageVariantInput,
): {
  variant_key: string;
  name: string;
  content_json: Record<string, unknown>;
} {
  const key = input.variantKey || generateLandingPageVariantKey(input.name);
  return {
    variant_key: key,
    name: input.name,
    content_json: { ...pageContent },
  };
}

// ── Normalise Content (ensure required fields exist) ─────────

export function normalizeVariantContent(
  content: Record<string, unknown> | null,
): Record<string, unknown> {
  if (!content) return { sections: [] };
  return {
    sections: [],
    ...content,
  };
}

// ── Map Variant to Public View Model ─────────────────────────

export function mapVariantToPublicViewModel(
  variant: LandingPageVariantRecord,
): {
  variantKey: string;
  name: string;
  content: Record<string, unknown>;
  seoTitle: string | null;
  metaDescription: string | null;
} {
  return {
    variantKey: variant.variant_key,
    name: variant.name,
    content: normalizeVariantContent(variant.content_json as Record<string, unknown> | null),
    seoTitle: variant.seo_title,
    metaDescription: variant.meta_description,
  };
}

// ── Weighted Traffic Chooser ─────────────────────────────────

export function chooseVariantForTraffic(
  variants: Pick<LandingPageVariantRecord, 'variant_key' | 'traffic_weight' | 'status'>[],
): string | null {
  const active = variants.filter((v) => v.status === 'published');
  if (active.length === 0) return null;
  if (active.length === 1) return active[0].variant_key;

  const totalWeight = active.reduce((sum, v) => sum + v.traffic_weight, 0);
  if (totalWeight === 0) return active[0].variant_key;

  const roll = Math.random() * totalWeight;
  let cumulative = 0;
  for (const v of active) {
    cumulative += v.traffic_weight;
    if (roll < cumulative) return v.variant_key;
  }
  return active[active.length - 1].variant_key;
}

// ── Derive Variant Performance Summary ───────────────────────

export function deriveVariantPerformanceSummary(
  variant: LandingPageVariantRecord,
  events: LandingPageEventRecord[],
  allVariantPerformances?: { variantKey: string; conversions: number }[],
): LandingPageVariantPerformance {
  const variantEvents = events.filter((e) => e.variant_key === variant.variant_key);
  const counts = aggregateEventCounts(variantEvents);

  const views = (counts['page_view'] || 0) + (counts['preview_view'] || 0);
  const clicks = ENGAGEMENT_EVENT_TYPES.reduce((sum, t) => sum + (counts[t] || 0), 0);
  const conversions = CONVERSION_EVENT_TYPES.reduce((sum, t) => sum + (counts[t] || 0), 0);

  let isBestPerformer = false;
  if (allVariantPerformances && allVariantPerformances.length > 1) {
    const maxConversions = Math.max(...allVariantPerformances.map((p) => p.conversions));
    isBestPerformer = conversions === maxConversions && conversions > 0;
  }

  return {
    variantKey: variant.variant_key,
    name: variant.name,
    views,
    ctaClicks: clicks,
    conversions,
    ctr: calculateCtr(views, clicks),
    conversionRate: calculateConversionRate(views, conversions),
    isBestPerformer,
  };
}
