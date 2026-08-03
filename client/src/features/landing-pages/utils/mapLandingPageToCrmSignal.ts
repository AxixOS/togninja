// Phase 6: Map Landing Page to CRM Signal

import type { LandingPageCrmSignal, LandingPageLeadIntentSignal, LandingPageLeadScoreSummary, LandingPageRoutingRecommendation } from '../types/landingPageCrm.types';

export interface CrmSignalInput {
  landingPageId: string;
  totalCtaClicks: number;
  totalFormStarts: number;
  totalFormSubmits: number;
  totalWhatsappClicks: number;
  totalVoucherClicks: number;
  totalEmailClicks: number;
  totalPhoneClicks: number;
  totalViews: number;
  repeatVisitorCount: number;
}

export function buildCrmSignals(input: CrmSignalInput): LandingPageCrmSignal[] {
  const signals: LandingPageCrmSignal[] = [];
  const now = new Date().toISOString();

  // Repeated CTA clicks + voucher = strong buyer intent
  if (input.totalCtaClicks >= 3 && input.totalVoucherClicks >= 1) {
    signals.push({
      signalType: 'strong_buyer_intent',
      label: 'Strong Buyer Intent',
      description: `${input.totalCtaClicks} CTA clicks and ${input.totalVoucherClicks} voucher clicks indicate strong purchase intent.`,
      strength: 'high',
      eventCount: input.totalCtaClicks + input.totalVoucherClicks,
      detectedAt: now,
    });
  }

  // Repeated page views = warm lead
  if (input.repeatVisitorCount >= 2 || input.totalViews >= 5) {
    signals.push({
      signalType: 'warm_lead',
      label: 'Warm Lead Activity',
      description: `${input.repeatVisitorCount > 0 ? `${input.repeatVisitorCount} repeat visitors` : `${input.totalViews} page views`} suggest interested prospects.`,
      strength: input.repeatVisitorCount >= 3 ? 'high' : 'medium',
      eventCount: input.repeatVisitorCount || input.totalViews,
      detectedAt: now,
    });
  }

  // Form start without submit = partial intent
  if (input.totalFormStarts > 0 && input.totalFormSubmits === 0) {
    signals.push({
      signalType: 'partial_intent',
      label: 'Partial Lead Intent',
      description: `${input.totalFormStarts} form starts without submission. Visitors are interested but didn't complete.`,
      strength: 'medium',
      eventCount: input.totalFormStarts,
      detectedAt: now,
    });
  }

  // WhatsApp click = immediate contact intent
  if (input.totalWhatsappClicks >= 1) {
    signals.push({
      signalType: 'immediate_contact',
      label: 'Immediate Contact Intent',
      description: `${input.totalWhatsappClicks} WhatsApp click${input.totalWhatsappClicks > 1 ? 's' : ''} — visitor wants direct contact.`,
      strength: 'high',
      eventCount: input.totalWhatsappClicks,
      detectedAt: now,
    });
  }

  // Phone click = immediate contact
  if (input.totalPhoneClicks >= 1) {
    signals.push({
      signalType: 'immediate_contact',
      label: 'Phone Contact Intent',
      description: `${input.totalPhoneClicks} phone click${input.totalPhoneClicks > 1 ? 's' : ''} — visitor wants to call.`,
      strength: 'high',
      eventCount: input.totalPhoneClicks,
      detectedAt: now,
    });
  }

  // Voucher interest
  if (input.totalVoucherClicks >= 1) {
    signals.push({
      signalType: 'voucher_interest',
      label: 'Voucher Interest',
      description: `${input.totalVoucherClicks} voucher click${input.totalVoucherClicks > 1 ? 's' : ''} — visitors are interested in purchasing vouchers.`,
      strength: input.totalVoucherClicks >= 3 ? 'high' : 'medium',
      eventCount: input.totalVoucherClicks,
      detectedAt: now,
    });
  }

  return signals;
}

export function scoreLandingPageLeadIntent(signals: LandingPageCrmSignal[]): number {
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

export function buildRoutingRecommendations(landingPageId: string, signals: LandingPageCrmSignal[]): LandingPageRoutingRecommendation[] {
  const recommendations: LandingPageRoutingRecommendation[] = [];

  const hasHighIntent = signals.some(s => s.strength === 'high');
  const hasImmediateContact = signals.some(s => s.signalType === 'immediate_contact');
  const hasPartialIntent = signals.some(s => s.signalType === 'partial_intent');

  if (hasImmediateContact) {
    recommendations.push({
      landingPageId,
      recommendation: 'Prioritize responding to direct contact attempts.',
      category: 'hot_lead',
      reasoning: 'Visitors clicked WhatsApp or phone links — they want immediate contact.',
      suggestedAction: 'Check WhatsApp and missed calls. Respond within 1 hour.',
      priority: 'high',
    });
  }

  if (hasHighIntent && !hasImmediateContact) {
    recommendations.push({
      landingPageId,
      recommendation: 'Follow up with high-intent leads.',
      category: 'follow_up',
      reasoning: 'Strong buyer signals detected from CTA and voucher activity.',
      suggestedAction: 'Review recent CTA clicks and send a personalized follow-up.',
      priority: 'high',
    });
  }

  if (hasPartialIntent) {
    recommendations.push({
      landingPageId,
      recommendation: 'Nurture leads who started but didn\'t complete forms.',
      category: 'nurture',
      reasoning: 'Visitors started filling in forms but abandoned. They need a nudge.',
      suggestedAction: 'Consider a follow-up email or simplify the form.',
      priority: 'medium',
    });
  }

  if (signals.length === 0) {
    recommendations.push({
      landingPageId,
      recommendation: 'Drive more traffic to generate lead signals.',
      category: 're_engage',
      reasoning: 'No significant lead-intent signals detected yet.',
      suggestedAction: 'Promote this page on social media or via email.',
      priority: 'low',
    });
  }

  return recommendations;
}

export function buildLeadScoreSummary(landingPageId: string, input: CrmSignalInput): LandingPageLeadScoreSummary {
  const signals = buildCrmSignals(input);
  const score = scoreLandingPageLeadIntent(signals);
  const routingRecommendations = buildRoutingRecommendations(landingPageId, signals);

  return {
    landingPageId,
    totalSignals: signals.length,
    overallIntentScore: score,
    topSignals: signals.sort((a, b) => {
      const strengthOrder = { high: 0, medium: 1, low: 2 };
      return strengthOrder[a.strength] - strengthOrder[b.strength];
    }),
    routingRecommendations,
    generatedAt: new Date().toISOString(),
  };
}
