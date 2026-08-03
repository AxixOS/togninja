// Phase 6: Landing Page CRM Types

export interface LandingPageCrmSignal {
  signalType: 'strong_buyer_intent' | 'warm_lead' | 'partial_intent' | 'immediate_contact' | 'repeat_visitor' | 'voucher_interest';
  label: string;
  description: string;
  strength: 'low' | 'medium' | 'high';
  eventCount: number;
  detectedAt: string;
}

export interface LandingPageLeadIntentSignal {
  landingPageId: string;
  visitorId: string | null;
  sessionId: string | null;
  intentType: string;
  intentScore: number;
  signals: LandingPageCrmSignal[];
  detectedAt: string;
}

export interface LandingPageRoutingRecommendation {
  landingPageId: string;
  recommendation: string;
  category: 'follow_up' | 'nurture' | 'hot_lead' | 're_engage';
  reasoning: string;
  suggestedAction: string;
  priority: 'low' | 'medium' | 'high';
}

export interface LandingPageLeadScoreSummary {
  landingPageId: string;
  totalSignals: number;
  overallIntentScore: number;
  topSignals: LandingPageCrmSignal[];
  routingRecommendations: LandingPageRoutingRecommendation[];
  generatedAt: string;
}
