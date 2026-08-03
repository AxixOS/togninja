// Phase 6: Landing Page CRM Routing Server Service
// Builds lead-intent signals and routing recommendations from analytics.

import type { LandingPageCrmSignal, LandingPageLeadScoreSummary, LandingPageRoutingRecommendation } from '../types/landingPageCrm.types';

export interface CrmRoutingInputs {
  totalCtaClicks: number;
  totalFormStarts: number;
  totalFormSubmits: number;
  totalWhatsappClicks: number;
  totalVoucherClicks: number;
  totalEmailClicks: number;
  totalPhoneClicks: number;
  totalViews: number;
}

/**
 * Build CRM signals from analytics data.
 */
export function buildCrmSignalsFromAnalytics(inputs: CrmRoutingInputs): LandingPageCrmSignal[] {
  const signals: LandingPageCrmSignal[] = [];
  const now = new Date().toISOString();

  if (inputs.totalCtaClicks >= 3 && inputs.totalVoucherClicks >= 1) {
    signals.push({
      signalType: 'strong_buyer_intent',
      label: 'Strong Buyer Intent',
      description: `${inputs.totalCtaClicks} CTA clicks and ${inputs.totalVoucherClicks} voucher clicks.`,
      strength: 'high',
      eventCount: inputs.totalCtaClicks + inputs.totalVoucherClicks,
      detectedAt: now,
    });
  }

  if (inputs.totalViews >= 5) {
    signals.push({
      signalType: 'warm_lead',
      label: 'Warm Lead Activity',
      description: `${inputs.totalViews} page views indicate interest.`,
      strength: inputs.totalViews >= 20 ? 'high' : 'medium',
      eventCount: inputs.totalViews,
      detectedAt: now,
    });
  }

  if (inputs.totalFormStarts > 0 && inputs.totalFormSubmits === 0) {
    signals.push({
      signalType: 'partial_intent',
      label: 'Partial Lead Intent',
      description: `${inputs.totalFormStarts} form starts without submission.`,
      strength: 'medium',
      eventCount: inputs.totalFormStarts,
      detectedAt: now,
    });
  }

  if (inputs.totalWhatsappClicks >= 1) {
    signals.push({
      signalType: 'immediate_contact',
      label: 'Immediate Contact Intent',
      description: `${inputs.totalWhatsappClicks} WhatsApp clicks.`,
      strength: 'high',
      eventCount: inputs.totalWhatsappClicks,
      detectedAt: now,
    });
  }

  if (inputs.totalPhoneClicks >= 1) {
    signals.push({
      signalType: 'immediate_contact',
      label: 'Phone Contact Intent',
      description: `${inputs.totalPhoneClicks} phone clicks.`,
      strength: 'high',
      eventCount: inputs.totalPhoneClicks,
      detectedAt: now,
    });
  }

  if (inputs.totalVoucherClicks >= 1) {
    signals.push({
      signalType: 'voucher_interest',
      label: 'Voucher Interest',
      description: `${inputs.totalVoucherClicks} voucher clicks.`,
      strength: inputs.totalVoucherClicks >= 3 ? 'high' : 'medium',
      eventCount: inputs.totalVoucherClicks,
      detectedAt: now,
    });
  }

  return signals;
}

/**
 * Score lead intent from signals.
 */
export function scoreLeadIntent(signals: LandingPageCrmSignal[]): number {
  let score = 0;
  for (const signal of signals) {
    switch (signal.strength) {
      case 'high': score += 30; break;
      case 'medium': score += 15; break;
      case 'low': score += 5; break;
    }
  }
  return Math.min(score, 100);
}

/**
 * Build routing recommendations from signals.
 */
export function buildRoutingRecommendations(landingPageId: string, signals: LandingPageCrmSignal[]): LandingPageRoutingRecommendation[] {
  const recommendations: LandingPageRoutingRecommendation[] = [];

  if (signals.some(s => s.signalType === 'immediate_contact')) {
    recommendations.push({
      landingPageId,
      recommendation: 'Respond to direct contact attempts.',
      category: 'hot_lead',
      reasoning: 'Visitors clicked WhatsApp or phone links.',
      suggestedAction: 'Check WhatsApp and missed calls. Respond within 1 hour.',
      priority: 'high',
    });
  }

  if (signals.some(s => s.strength === 'high') && !signals.some(s => s.signalType === 'immediate_contact')) {
    recommendations.push({
      landingPageId,
      recommendation: 'Follow up with high-intent leads.',
      category: 'follow_up',
      reasoning: 'Strong buyer signals from CTA and voucher activity.',
      suggestedAction: 'Send a personalized follow-up.',
      priority: 'high',
    });
  }

  if (signals.some(s => s.signalType === 'partial_intent')) {
    recommendations.push({
      landingPageId,
      recommendation: 'Nurture partial leads.',
      category: 'nurture',
      reasoning: 'Visitors started forms but abandoned.',
      suggestedAction: 'Simplify the form or send a follow-up email.',
      priority: 'medium',
    });
  }

  if (signals.length === 0) {
    recommendations.push({
      landingPageId,
      recommendation: 'Drive more traffic to generate lead signals.',
      category: 're_engage',
      reasoning: 'No significant lead-intent signals detected.',
      suggestedAction: 'Promote this page on social media or via email.',
      priority: 'low',
    });
  }

  return recommendations;
}

/**
 * Build complete lead score summary for a landing page.
 */
export function buildLeadScoreSummary(landingPageId: string, inputs: CrmRoutingInputs): LandingPageLeadScoreSummary {
  const signals = buildCrmSignalsFromAnalytics(inputs);
  const score = scoreLeadIntent(signals);
  const routing = buildRoutingRecommendations(landingPageId, signals);

  return {
    landingPageId,
    totalSignals: signals.length,
    overallIntentScore: score,
    topSignals: signals.sort((a, b) => {
      const order = { high: 0, medium: 1, low: 2 };
      return order[a.strength] - order[b.strength];
    }),
    routingRecommendations: routing,
    generatedAt: new Date().toISOString(),
  };
}
