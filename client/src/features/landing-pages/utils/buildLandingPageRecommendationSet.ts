// Phase 6: Build Landing Page Recommendation Set

import type { LandingPageRecommendation, LandingPageRecommendationSet, LandingPageRecommendationPriority } from '../types/landingPageRecommendation.types';
import type { MetricWindow } from './landingPageAutomation.helpers';

export interface RecommendationContext {
  landingPageId: string;
  currentMetrics: MetricWindow;
  previousMetrics: MetricWindow | null;
  publishedDaysAgo: number;
  variantCount: number;
  hasActivePromo: boolean;
  isSeasonal: boolean;
  pageTitle: string;
}

let recIdCounter = 0;
function nextRecId(): string {
  return `rec_${++recIdCounter}_${Date.now()}`;
}

export function buildRecommendationSet(context: RecommendationContext): LandingPageRecommendationSet {
  const recommendations: LandingPageRecommendation[] = [];

  // Low CTR → strengthen CTA
  if (context.currentMetrics.views >= 20 && context.currentMetrics.ctr < 3) {
    recommendations.push({
      id: nextRecId(),
      priority: 'high',
      category: 'cta',
      actionType: 'strengthen_cta',
      title: 'Strengthen Your CTA',
      description: 'Your click-through rate is below 3%. Try a more compelling call-to-action with urgency or a specific benefit.',
      actionLabel: 'Edit CTA',
      reasoning: `Current CTR is ${context.currentMetrics.ctr.toFixed(1)}% with ${context.currentMetrics.views} views.`,
    });
  }

  // No variants → suggest testing
  if (context.variantCount === 0 && context.currentMetrics.views >= 30) {
    recommendations.push({
      id: nextRecId(),
      priority: 'medium',
      category: 'variant_testing',
      actionType: 'test_variant',
      title: 'Try A/B Testing',
      description: 'Create a variant with a different headline or CTA to find what converts better.',
      actionLabel: 'Create Variant',
      reasoning: `Page has ${context.currentMetrics.views} views but no variants to compare.`,
    });
  }

  // Active but no recent promo → refresh promo
  if (context.publishedDaysAgo > 14 && !context.hasActivePromo && context.currentMetrics.views > 0) {
    recommendations.push({
      id: nextRecId(),
      priority: 'medium',
      category: 'promotion',
      actionType: 'refresh_promo',
      title: 'Refresh Your Promo Pack',
      description: 'Your campaign has been live for a while. Generate fresh social and email promo content.',
      actionLabel: 'Generate Promo Pack',
      reasoning: `Published ${context.publishedDaysAgo} days ago with no recent promotion.`,
    });
  }

  // Low traffic → reshare
  if (context.currentMetrics.views < 5 && context.publishedDaysAgo > 7) {
    recommendations.push({
      id: nextRecId(),
      priority: 'medium',
      category: 'promotion',
      actionType: 'reshare_social',
      title: 'Re-share on Social Media',
      description: 'This page is getting very little traffic. Share it on Facebook or Instagram to drive new views.',
      actionLabel: 'Create Social Post',
      reasoning: `Only ${context.currentMetrics.views} views in the measurement window.`,
    });
  }

  // CTA clicks but no conversions → optimize offer
  if (context.currentMetrics.ctaClicks >= 5 && context.currentMetrics.formSubmits === 0) {
    recommendations.push({
      id: nextRecId(),
      priority: 'high',
      category: 'offer',
      actionType: 'add_urgency',
      title: 'Add Urgency or Sweeten the Offer',
      description: 'People are clicking your CTA but not converting. Try adding a deadline, discount, or bonus.',
      actionLabel: 'Edit Offer',
      reasoning: `${context.currentMetrics.ctaClicks} CTA clicks but 0 form submissions.`,
    });
  }

  // Seasonal → relaunch suggestion
  if (context.isSeasonal && context.publishedDaysAgo > 60) {
    recommendations.push({
      id: nextRecId(),
      priority: 'low',
      category: 'seasonality',
      actionType: 'relaunch_seasonal',
      title: 'Relaunch Seasonal Campaign',
      description: 'This was a seasonal campaign. Consider relaunching it for the next relevant season.',
      actionLabel: 'Schedule Relaunch',
      reasoning: `Seasonal page published ${context.publishedDaysAgo} days ago.`,
    });
  }

  // Dormant page → archive or relaunch
  if (context.currentMetrics.views === 0 && context.publishedDaysAgo > 30) {
    recommendations.push({
      id: nextRecId(),
      priority: 'low',
      category: 'content',
      actionType: 'archive_page',
      title: 'Archive or Relaunch',
      description: 'This page has had no views in the measurement window. Consider archiving it or relaunching with fresh content.',
      actionLabel: 'Review Page',
      reasoning: `Zero views, published ${context.publishedDaysAgo} days ago.`,
    });
  }

  // Good conversions → nurture leads
  if (context.currentMetrics.formSubmits >= 3) {
    recommendations.push({
      id: nextRecId(),
      priority: 'medium',
      category: 'crm_followup',
      actionType: 'nurture_leads',
      title: 'Follow Up on Leads',
      description: 'You have active conversions. Make sure you are following up with these leads promptly.',
      actionLabel: 'View CRM Signals',
      reasoning: `${context.currentMetrics.formSubmits} form submissions in the measurement window.`,
    });
  }

  // Sort by priority
  const priorityOrder: Record<LandingPageRecommendationPriority, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return {
    landingPageId: context.landingPageId,
    generatedAt: new Date().toISOString(),
    recommendations,
    topRecommendation: recommendations[0] ?? null,
  };
}
