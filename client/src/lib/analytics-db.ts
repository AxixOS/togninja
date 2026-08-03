// Supabase analytics removed - now using Neon database only
// import { createClient } from '@supabase/supabase-js';

// Analytics functionality disabled since moving to Neon
const analyticsUrl = '';
const analyticsKey = '';

export const analyticsDb = {
  from: () => ({
    select: () => ({ data: [], error: null }),
    insert: () => ({ data: null, error: null }),
    update: () => ({ data: null, error: null }),
    delete: () => ({ data: null, error: null }),
    upsert: () => ({ data: null, error: null }),
    eq: () => ({ data: [], error: null }),
    gte: () => ({ data: [], error: null }),
    lte: () => ({ data: [], error: null }),
    order: () => ({ data: [], error: null }),
    single: () => ({ data: null, error: null })
  })
};

// Analytics data types
export interface BusinessMetric {
  id: string;
  metric_name: string;
  metric_value: number;
  metric_type: 'revenue' | 'bookings' | 'leads' | 'conversion_rate' | 'client_satisfaction';
  period_type: 'daily' | 'weekly' | 'monthly' | 'yearly';
  period_start: string;
  period_end: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface ClientAnalytics {
  id: string;
  client_id: string;
  total_bookings: number;
  total_revenue: number;
  average_session_value: number;
  last_booking_date: string;
  client_lifetime_value: number;
  referral_count: number;
  satisfaction_score: number;
  created_at: string;
  updated_at: string;
}

export interface MarketingAnalytics {
  id: string;
  campaign_name: string;
  campaign_type: 'social_media' | 'email' | 'google_ads' | 'referral' | 'organic';
  impressions: number;
  clicks: number;
  conversions: number;
  cost: number;
  revenue: number;
  roi: number;
  period_start: string;
  period_end: string;
  created_at: string;
}

// Analytics service functions
export class AnalyticsService {
  static async trackBusinessMetric(metric: Omit<BusinessMetric, 'id' | 'created_at'>) {
    // Mock implementation - analytics disabled
    console.log('Analytics disabled - metric not tracked:', metric);
    return { id: 'mock-id', ...metric, created_at: new Date().toISOString() };
  }

  static async getBusinessMetrics(
    metricType?: string,
    periodType?: string,
    startDate?: string,
    endDate?: string
  ) {
    // Mock implementation - analytics disabled
    console.log('Analytics disabled - returning empty metrics');
    return [];
  }

  static async updateClientAnalytics(clientId: string, analytics: Partial<ClientAnalytics>) {
    // Mock implementation - analytics disabled
    console.log('Analytics disabled - client analytics not updated:', { clientId, analytics });
    return { id: 'mock-id', client_id: clientId, ...analytics, updated_at: new Date().toISOString() };
  }

  static async getClientAnalytics(clientId?: string) {
    // Mock implementation - analytics disabled
    console.log('Analytics disabled - returning empty client analytics');
    return [];
  }

  static async trackMarketingCampaign(campaign: Omit<MarketingAnalytics, 'id' | 'created_at'>) {
    // Mock implementation - analytics disabled
    console.log('Analytics disabled - campaign not tracked:', campaign);
    return { id: 'mock-id', ...campaign, created_at: new Date().toISOString() };
  }

  static async getMarketingAnalytics(campaignType?: string, startDate?: string, endDate?: string) {
    // Mock implementation - analytics disabled
    console.log('Analytics disabled - returning empty marketing analytics');
    return [];
  }

  // Calculate derived metrics
  static async calculateMonthlyRevenue(year: number, month: number) {
    // Mock implementation - analytics disabled
    console.log('Analytics disabled - monthly revenue calculation skipped');
    return 0;
  }

  static async calculateClientLifetimeValue(clientId: string) {
    // Mock implementation - analytics disabled
    console.log('Analytics disabled - LTV calculation skipped for client:', clientId);
    return 0;
  }
}