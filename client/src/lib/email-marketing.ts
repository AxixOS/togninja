// Supabase is disabled in this app. Use internal API endpoints.
import {
  EmailCampaign,
  EmailSequence,
  Subscriber,
  Segment,
  EmailTemplate,
  AutomationRule,
  EmailAnalytics,
  EmailEvent,
  AIInsight,
  AIRecommendation
} from '../types/email-marketing';

// Campaign Management
export async function createCampaign(campaign: Partial<EmailCampaign>): Promise<EmailCampaign> {
  const adminToken = localStorage.getItem('ADMIN_TOKEN') || '';
  const res = await fetch('/api/admin/email/campaigns', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-admin-token': adminToken },
    body: JSON.stringify(campaign)
  });
  if (!res.ok) throw new Error('Failed to create campaign');
  return res.json();
}

export async function updateCampaign(id: string, updates: Partial<EmailCampaign>): Promise<EmailCampaign> {
  const adminToken = localStorage.getItem('ADMIN_TOKEN') || '';
  const res = await fetch(`/api/admin/email/campaigns/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'x-admin-token': adminToken },
    body: JSON.stringify(updates)
  });
  if (!res.ok) throw new Error('Failed to update campaign');
  return res.json();
}

export async function getCampaigns(): Promise<EmailCampaign[]> {
  const adminToken = localStorage.getItem('ADMIN_TOKEN') || '';
  const res = await fetch('/api/admin/email/campaigns', { headers: { 'x-admin-token': adminToken } });
  if (!res.ok) throw new Error('Failed to load campaigns');
  return res.json();
}

export async function sendCampaign(id: string, options?: { test_send?: boolean; test_emails?: string[] }): Promise<{ success: boolean; sent?: number; message?: string; error?: string }> {
  const response = await fetch('/api/email/campaigns/send', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ campaign_id: id, ...options })
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error || 'Failed to send campaign');
  }
  return data;
}

export async function duplicateCampaign(id: string, name?: string): Promise<EmailCampaign> {
  const adminToken = localStorage.getItem('ADMIN_TOKEN') || '';
  const res = await fetch('/api/admin/email/campaigns', { headers: { 'x-admin-token': adminToken } });
  if (!res.ok) throw new Error('Failed to load campaigns');
  const list: EmailCampaign[] = await res.json();
  const original = list.find(c => String(c.id) === String(id));
  if (!original) throw new Error('Original campaign not found');

  const duplicate = {
    ...original,
    id: undefined,
    name: name || `${original.name} (Copy)`,
    status: 'draft' as const,
    scheduled_at: null,
    sent_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  return createCampaign(duplicate);
}

// Email Sequences (Drip Campaigns)
export async function createSequence(sequence: Partial<EmailSequence>): Promise<EmailSequence> {
  throw new Error('Sequences are not implemented');
}

export async function getSequences(): Promise<EmailSequence[]> { return []; }

export async function updateSequence(id: string, updates: Partial<EmailSequence>): Promise<EmailSequence> { throw new Error('Sequences are not implemented'); }

export async function enrollSubscriberInSequence(_subscriberId: string, _sequenceId: string): Promise<void> { throw new Error('Sequences are not implemented'); }

// Subscriber Management
export async function createSubscriber(_subscriber: Partial<Subscriber>): Promise<Subscriber> { throw new Error('Subscribers API not implemented'); }

export async function getSubscribers(): Promise<Subscriber[]> { return []; }

export async function updateSubscriber(_id: string, _updates: Partial<Subscriber>): Promise<Subscriber> { throw new Error('Subscribers API not implemented'); }

export async function addTagsToSubscriber(_subscriberId: string, _tags: string[]): Promise<void> { throw new Error('Subscribers API not implemented'); }

export async function removeTagsFromSubscriber(_subscriberId: string, _tags: string[]): Promise<void> { throw new Error('Subscribers API not implemented'); }

// Segment Management
export async function createSegment(_segment: Partial<Segment>): Promise<Segment> { throw new Error('Segments API not implemented'); }

export async function getSegments(): Promise<Segment[]> {
  const res = await fetch('/api/email/segments');
  if (!res.ok) throw new Error('Failed to load segments');
  return res.json();
}

export async function updateSegment(_id: string, _updates: Partial<Segment>): Promise<Segment> { throw new Error('Segments API not implemented'); }

export async function getSegmentSubscribers(_segmentId: string): Promise<Subscriber[]> { return []; }

// Template Management
export async function createTemplate(_template: Partial<EmailTemplate>): Promise<EmailTemplate> { throw new Error('Templates API not implemented'); }

export async function getTemplates(category?: string): Promise<EmailTemplate[]> {
  const url = category ? `/api/email/templates?category=${encodeURIComponent(category)}` : '/api/email/templates';
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to load templates');
  return res.json();
}

export async function updateTemplate(_id: string, _updates: Partial<EmailTemplate>): Promise<EmailTemplate> { throw new Error('Templates API not implemented'); }

// Automation Rules
export async function createAutomationRule(_rule: Partial<AutomationRule>): Promise<AutomationRule> { throw new Error('Automation rules not implemented'); }

export async function getAutomationRules(): Promise<AutomationRule[]> { return []; }

export async function updateAutomationRule(_id: string, _updates: Partial<AutomationRule>): Promise<AutomationRule> { throw new Error('Automation rules not implemented'); }

// Analytics
export async function getCampaignAnalytics(campaignId: string, period: string = 'month'): Promise<EmailAnalytics> {
  const response = await fetch(`/api/email/analytics/campaign/${campaignId}?period=${period}`);
  if (!response.ok) {
    throw new Error('Failed to fetch campaign analytics');
  }
  return response.json();
}

export async function getSequenceAnalytics(sequenceId: string): Promise<EmailAnalytics> {
  const response = await fetch(`/api/email/analytics/sequence/${sequenceId}`);
  if (!response.ok) {
    throw new Error('Failed to fetch sequence analytics');
  }
  return response.json();
}

export async function getOverallAnalytics(period: string = 'month'): Promise<EmailAnalytics> {
  const response = await fetch(`/api/email/analytics/overall?period=${period}`);
  if (!response.ok) {
    throw new Error('Failed to fetch overall analytics');
  }
  return response.json();
}

// AI-Powered Features
export async function getAIInsights(type?: string): Promise<AIInsight[]> {
  const response = await fetch(`/api/email/ai/insights${type ? `?type=${type}` : ''}`);
  if (!response.ok) {
    throw new Error('Failed to fetch AI insights');
  }
  return response.json();
}

export async function getAIRecommendations(campaignId?: string): Promise<AIRecommendation[]> {
  const response = await fetch(`/api/email/ai/recommendations${campaignId ? `?campaign_id=${campaignId}` : ''}`);
  if (!response.ok) {
    throw new Error('Failed to fetch AI recommendations');
  }
  return response.json();
}

export async function generateSubjectLine(content: string, audience: string): Promise<string[]> {
  const response = await fetch('/api/email/ai/subject-lines', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content, audience })
  });

  if (!response.ok) {
    throw new Error('Failed to generate subject lines');
  }

  const data = await response.json();
  return data.suggestions;
}

export async function optimizeSendTime(subscriberId: string): Promise<string> {
  const response = await fetch(`/api/email/ai/send-time/${subscriberId}`);
  if (!response.ok) {
    throw new Error('Failed to optimize send time');
  }

  const data = await response.json();
  return data.optimal_time;
}

export async function predictEngagement(campaignId: string): Promise<{
  predicted_open_rate: number;
  predicted_click_rate: number;
  confidence: number;
}> {
  const response = await fetch(`/api/email/ai/predict-engagement/${campaignId}`);
  if (!response.ok) {
    throw new Error('Failed to predict engagement');
  }
  return response.json();
}

// Event Tracking
export async function trackEmailEvent(_event: Partial<EmailEvent>): Promise<void> { /* no-op */ }

export async function getEmailEvents(filters?: {
  campaign_id?: string;
  subscriber_id?: string;
  type?: string;
  start_date?: string;
  end_date?: string;
}): Promise<EmailEvent[]> {
  return [];
}

// Advanced Features
export async function createABTest(campaignId: string, testConfig: any): Promise<void> {
  const response = await fetch('/api/email/ab-test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ campaign_id: campaignId, config: testConfig })
  });

  if (!response.ok) {
    throw new Error('Failed to create A/B test');
  }
}

export async function getDeliverabilityReport(): Promise<{
  reputation_score: number;
  bounce_rate: number;
  complaint_rate: number;
  spam_score: number;
  domain_health: Record<string, any>;
  recommendations: string[];
}> {
  const response = await fetch('/api/email/deliverability');
  if (!response.ok) {
    throw new Error('Failed to fetch deliverability report');
  }
  return response.json();
}

export async function validateEmailList(emails: string[]): Promise<{
  valid: string[];
  invalid: string[];
  risky: string[];
  unknown: string[];
}> {
  const response = await fetch('/api/email/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ emails })
  });

  if (!response.ok) {
    throw new Error('Failed to validate email list');
  }
  return response.json();
}

export async function sendTransactionalEmail(data: {
  to: string;
  template_id: string;
  variables: Record<string, any>;
  priority?: 'high' | 'normal' | 'low';
}): Promise<void> {
  const response = await fetch('/api/email/transactional', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    throw new Error('Failed to send transactional email');
  }
}

// Bulk Operations
export async function bulkImportSubscribers(subscribers: Partial<Subscriber>[]): Promise<{
  imported: number;
  skipped: number;
  errors: Array<{ row: number; error: string }>;
}> {
  const response = await fetch('/api/email/subscribers/bulk-import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subscribers })
  });

  if (!response.ok) {
    throw new Error('Failed to import subscribers');
  }
  return response.json();
}

export async function bulkUpdateSubscribers(updates: {
  subscriber_ids: string[];
  changes: Partial<Subscriber>;
}): Promise<void> {
  const response = await fetch('/api/email/subscribers/bulk-update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates)
  });

  if (!response.ok) {
    throw new Error('Failed to update subscribers');
  }
}
