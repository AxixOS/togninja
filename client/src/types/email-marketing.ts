// Advanced Email Marketing System - Core Types and Interfaces
export interface EmailSequence {
  id: string;
  name: string;
  description: string;
  trigger_type: 'manual' | 'signup' | 'purchase' | 'behavior' | 'date' | 'custom';
  trigger_conditions: Record<string, any>;
  status: 'active' | 'paused' | 'draft';
  emails: SequenceEmail[];
  subscribers_count: number;
  completion_rate: number;
  conversion_rate: number;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface SequenceEmail {
  id: string;
  sequence_id: string;
  order: number;
  name: string;
  subject: string;
  content: string;
  delay_days: number;
  delay_hours: number;
  send_conditions?: Record<string, any>;
  a_b_test?: ABTestConfig;
  personalization: PersonalizationConfig;
  status: 'active' | 'paused';
  open_rate: number;
  click_rate: number;
  conversion_rate: number;
}

export interface ABTestConfig {
  enabled: boolean;
  test_type: 'subject' | 'content' | 'send_time' | 'sender';
  variants: ABTestVariant[];
  winner_criteria: 'open_rate' | 'click_rate' | 'conversion_rate';
  test_duration_hours: number;
  traffic_split: number; // percentage for test
}

export interface ABTestVariant {
  id: string;
  name: string;
  subject?: string;
  content?: string;
  send_time?: string;
  sender_name?: string;
  sender_email?: string;
  performance: {
    sent: number;
    opens: number;
    clicks: number;
    conversions: number;
  };
}

export interface PersonalizationConfig {
  dynamic_content: DynamicContent[];
  conditional_blocks: ConditionalBlock[];
  product_recommendations: boolean;
  behavioral_triggers: BehavioralTrigger[];
}

export interface DynamicContent {
  id: string;
  placeholder: string;
  field_mapping: string;
  default_value: string;
  format_type?: 'text' | 'currency' | 'date' | 'number';
}

export interface ConditionalBlock {
  id: string;
  condition: string;
  true_content: string;
  false_content: string;
}

export interface BehavioralTrigger {
  id: string;
  event: string;
  conditions: Record<string, any>;
  action: 'send_email' | 'add_tag' | 'move_sequence' | 'webhook';
  action_config: Record<string, any>;
}

export interface EmailCampaign {
  id: string;
  name: string;
  type: 'broadcast' | 'drip' | 'trigger' | 'rss' | 'transactional';
  subject: string;
  preview_text: string;
  content: string;
  design_template: string;
  sender_name: string;
  sender_email: string;
  reply_to: string;
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'paused' | 'cancelled';
  scheduled_at?: string;
  sent_at?: string;
  
  // Audience targeting
  segments: string[];
  tags_include: string[];
  tags_exclude: string[];
  custom_filters: Filter[];
  
  // A/B Testing
  ab_test: ABTestConfig;
  
  // Analytics
  recipients: {
    total: number;
    delivered: number;
    bounced: number;
    unsubscribed: number;
  };
  engagement: {
    opens: number;
    unique_opens: number;
    clicks: number;
    unique_clicks: number;
    forwards: number;
    social_shares: number;
  };
  conversions: {
    goal_completions: number;
    revenue: number;
    roi: number;
  };
  
  // Advanced features
  send_time_optimization: boolean;
  frequency_capping: FrequencyCapping;
  deliverability_settings: DeliverabilitySettings;
  compliance_settings: ComplianceSettings;
  
  created_at: string;
  updated_at: string;
}

export interface Filter {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than' | 'between' | 'in' | 'not_in';
  value: any;
  logic: 'and' | 'or';
}

export interface FrequencyCapping {
  enabled: boolean;
  max_emails_per_day: number;
  max_emails_per_week: number;
  max_emails_per_month: number;
  respect_user_preferences: boolean;
}

export interface DeliverabilitySettings {
  use_dedicated_ip: boolean;
  ip_warming: boolean;
  domain_authentication: {
    spf: boolean;
    dkim: boolean;
    dmarc: boolean;
  };
  reputation_monitoring: boolean;
  bounce_handling: 'automatic' | 'manual';
  complaint_handling: 'automatic' | 'manual';
}

export interface ComplianceSettings {
  gdpr_compliant: boolean;
  can_spam_compliant: boolean;
  auto_unsubscribe_link: boolean;
  subscription_preferences: boolean;
  data_retention_days: number;
  consent_tracking: boolean;
}

export interface EmailTemplate {
  id: string;
  name: string;
  category: 'welcome' | 'newsletter' | 'promotional' | 'transactional' | 'follow_up' | 'abandoned_cart' | 'custom';
  thumbnail: string;
  html_content: string;
  css_content: string;
  json_design: Record<string, any>; // For drag-drop editor
  variables: TemplateVariable[];
  responsive: boolean;
  dark_mode_support: boolean;
  created_at: string;
  updated_at: string;
}

export interface TemplateVariable {
  name: string;
  type: 'text' | 'image' | 'color' | 'link' | 'number';
  default_value: any;
  required: boolean;
  description: string;
}

export interface Subscriber {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  status: 'subscribed' | 'unsubscribed' | 'bounced' | 'complained' | 'cleaned';
  source: string;
  tags: string[];
  custom_fields: Record<string, any>;
  preferences: SubscriberPreferences;
  engagement_score: number;
  lifetime_value: number;
  last_activity: string;
  subscription_date: string;
  unsubscribe_date?: string;
  bounce_count: number;
  complaint_count: number;
}

export interface SubscriberPreferences {
  frequency: 'daily' | 'weekly' | 'monthly' | 'never';
  content_types: string[];
  send_time_preference: string;
  timezone: string;
  language: string;
}

export interface Segment {
  id: string;
  name: string;
  description: string;
  type: 'static' | 'dynamic';
  conditions: Filter[];
  subscriber_count: number;
  growth_rate: number;
  engagement_rate: number;
  created_at: string;
  updated_at: string;
}

export interface AutomationRule {
  id: string;
  name: string;
  description: string;
  trigger: {
    type: 'email_opened' | 'link_clicked' | 'form_submitted' | 'purchase_made' | 'date_reached' | 'tag_added' | 'custom_event';
    conditions: Record<string, any>;
  };
  actions: AutomationAction[];
  status: 'active' | 'paused';
  execution_count: number;
  success_rate: number;
  created_at: string;
}

export interface AutomationAction {
  type: 'send_email' | 'add_tag' | 'remove_tag' | 'move_to_segment' | 'update_field' | 'webhook' | 'wait';
  config: Record<string, any>;
  delay_minutes?: number;
}

export interface EmailAnalytics {
  campaign_id: string;
  period: 'day' | 'week' | 'month' | 'quarter' | 'year';
  metrics: {
    sent: TimeSeries[];
    delivered: TimeSeries[];
    opens: TimeSeries[];
    clicks: TimeSeries[];
    unsubscribes: TimeSeries[];
    bounces: TimeSeries[];
    complaints: TimeSeries[];
    conversions: TimeSeries[];
    revenue: TimeSeries[];
  };
  comparisons: {
    industry_average: Record<string, number>;
    previous_period: Record<string, number>;
    best_performing: Record<string, number>;
  };
  insights: AIInsight[];
  recommendations: AIRecommendation[];
}

export interface TimeSeries {
  date: string;
  value: number;
}

export interface AIInsight {
  type: 'performance' | 'audience' | 'content' | 'timing' | 'deliverability';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  confidence: number;
  data_points: any[];
}

export interface AIRecommendation {
  type: 'subject_line' | 'send_time' | 'content' | 'audience' | 'frequency';
  title: string;
  description: string;
  expected_improvement: string;
  effort_level: 'low' | 'medium' | 'high';
  implementation_steps: string[];
}

export interface EmailIntegration {
  id: string;
  name: string;
  type: 'webhook' | 'api' | 'zapier' | 'custom';
  endpoint: string;
  authentication: Record<string, any>;
  triggers: string[];
  data_mapping: Record<string, string>;
  status: 'active' | 'inactive' | 'error';
  last_execution: string;
  error_count: number;
}

export interface EmailEvent {
  id: string;
  type: 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'complained' | 'unsubscribed';
  campaign_id?: string;
  sequence_id?: string;
  subscriber_id: string;
  email_address: string;
  timestamp: string;
  user_agent?: string;
  ip_address?: string;
  location?: {
    country: string;
    region: string;
    city: string;
  };
  device_info?: {
    type: 'desktop' | 'mobile' | 'tablet';
    os: string;
    browser: string;
  };
  additional_data?: Record<string, any>;
}
