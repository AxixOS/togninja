import React, { useState, useEffect } from 'react';
import {
  Mail,
  Eye,
  MousePointer,
  UserMinus,
  AlertTriangle,
  TrendingUp,
  Globe,
  Smartphone,
  Monitor,
  MapPin,
  Link as LinkIcon,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  Target
} from 'lucide-react';

interface CampaignAnalyticsDetailProps {
  campaignId: string;
  onClose: () => void;
}

interface CampaignAnalytics {
  campaign_id: string;
  campaign_name: string;
  campaign_subject: string;
  sent_at: string;
  metrics: {
    sent: number;
    delivered: number;
    opened: number;
    unique_opens: number;
    clicked: number;
    unique_clicks: number;
    bounced: number;
    unsubscribed: number;
    complained: number;
  };
  rates: {
    open_rate: string;
    click_rate: string;
    click_to_open_rate: string;
    bounce_rate: string;
    unsubscribe_rate: string;
    complaint_rate: string;
  };
  engagement: {
    device_breakdown: {
      desktop: number;
      mobile: number;
      tablet: number;
      unknown: number;
    };
    top_locations: Array<{ country: string; opens: number }>;
    link_performance: Array<{ url: string; label: string | null; clicks: number; unique_clicks: number }>;
  };
  segments: {
    opened_count: number;
    clicked_count: number;
    opened_not_clicked_count: number;
    bounced_count: number;
    unsubscribed_count: number;
  };
}

const CampaignAnalyticsDetail: React.FC<CampaignAnalyticsDetailProps> = ({ campaignId, onClose }) => {
  const [analytics, setAnalytics] = useState<CampaignAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [generatingData, setGeneratingData] = useState(false);

  useEffect(() => {
    loadAnalytics();
  }, [campaignId]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/email/analytics/campaign/${campaignId}`);
      if (!response.ok) throw new Error('Failed to load analytics');
      const data = await response.json();
      setAnalytics(data);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateTestData = async () => {
    try {
      setGeneratingData(true);
      const response = await fetch(`/api/email/test/generate-analytics/${campaignId}`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to generate test data');
      await loadAnalytics();
      alert('Test analytics data generated successfully!');
    } catch (error) {
      console.error('Error generating test data:', error);
      alert('Failed to generate test data');
    } finally {
      setGeneratingData(false);
    }
  };

  const createSegmentCampaign = async (engagementType: string, engagementLabel: string) => {
    const confirmed = confirm(
      `Create a new campaign targeting the ${analytics?.segments[engagementType as keyof typeof analytics.segments]} subscribers who ${engagementLabel}?`
    );
    
    if (!confirmed) return;
    
    try {
      const response = await fetch(`/api/email/analytics/campaign/${campaignId}/create-segment-campaign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          engagement_type: engagementType,
          campaign_name: `${analytics?.campaign_name} - ${engagementLabel}`,
        }),
      });
      
      if (!response.ok) throw new Error('Failed to create segment');
      
      const data = await response.json();
      alert(`Segment created successfully with ${data.subscriber_count} subscribers!`);
    } catch (error) {
      console.error('Error creating segment:', error);
      alert('Failed to create segment');
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-md">
          <h3 className="text-xl font-bold mb-4">No Analytics Data</h3>
          <p className="text-gray-600 mb-6">
            This campaign doesn't have analytics data yet. Would you like to generate test data?
          </p>
          <div className="flex space-x-3">
            <button
              onClick={generateTestData}
              disabled={generatingData}
              className="flex-1 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50"
            >
              {generatingData ? 'Generating...' : 'Generate Test Data'}
            </button>
            <button
              onClick={onClose}
              className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  const totalSent = analytics.metrics.sent || 1;
  const openRate = parseFloat(analytics.rates.open_rate);
  const clickRate = parseFloat(analytics.rates.click_rate);
  const clickToOpenRate = parseFloat(analytics.rates.click_to_open_rate);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto p-4">
      <div className="bg-white rounded-lg max-w-6xl w-full my-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-6 rounded-t-lg">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">{analytics.campaign_name}</h2>
              <p className="text-purple-100 mt-1">{analytics.campaign_subject}</p>
              <div className="flex items-center mt-2 text-sm text-purple-100">
                <Clock size={14} className="mr-1" />
                Sent {analytics.sent_at ? new Date(analytics.sent_at).toLocaleDateString() : 'Draft'}
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 rounded-lg p-2"
            >
              <XCircle size={24} />
            </button>
          </div>
        </div>

        <div className="p-6 max-h-[80vh] overflow-y-auto">
          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            {/* Emails Sent */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6 cursor-pointer hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between">
                <Mail className="text-blue-600" size={32} />
                <div className="text-right">
                  <div className="text-3xl font-bold text-blue-900">{analytics.metrics.sent.toLocaleString()}</div>
                  <div className="text-sm text-blue-600 font-medium">Emails Sent</div>
                </div>
              </div>
            </div>

            {/* Opens */}
            <div 
              className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6 cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => createSegmentCampaign('opened', 'opened')}
            >
              <div className="flex items-center justify-between">
                <Eye className="text-green-600" size={32} />
                <div className="text-right">
                  <div className="text-3xl font-bold text-green-900">{analytics.metrics.unique_opens.toLocaleString()}</div>
                  <div className="text-sm text-green-600 font-medium">{openRate.toFixed(1)}% Opens</div>
                  <div className="text-xs text-green-500 mt-1">Click to segment</div>
                </div>
              </div>
            </div>

            {/* Clicks */}
            <div 
              className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-6 cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => createSegmentCampaign('clicked', 'clicked')}
            >
              <div className="flex items-center justify-between">
                <MousePointer className="text-purple-600" size={32} />
                <div className="text-right">
                  <div className="text-3xl font-bold text-purple-900">{analytics.metrics.unique_clicks.toLocaleString()}</div>
                  <div className="text-sm text-purple-600 font-medium">{clickRate.toFixed(1)}% Clicks</div>
                  <div className="text-xs text-purple-500 mt-1">Click to segment</div>
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <CheckCircle className="text-green-500" size={20} />
                <TrendingUp className="text-green-500" size={16} />
              </div>
              <div className="mt-2">
                <div className="text-2xl font-bold text-gray-900">{analytics.metrics.delivered.toLocaleString()}</div>
                <div className="text-sm text-gray-600">Delivered</div>
                <div className="text-xs text-green-600 mt-1">
                  {((analytics.metrics.delivered / totalSent) * 100).toFixed(1)}%
                </div>
              </div>
            </div>

            <div 
              className="bg-white border border-gray-200 rounded-lg p-4 cursor-pointer hover:bg-orange-50 transition-colors"
              onClick={() => createSegmentCampaign('opened_not_clicked', 'opened but didn\'t click')}
            >
              <div className="flex items-center justify-between">
                <Target className="text-orange-500" size={20} />
                <Users className="text-orange-500" size={16} />
              </div>
              <div className="mt-2">
                <div className="text-2xl font-bold text-gray-900">{analytics.segments.opened_not_clicked_count.toLocaleString()}</div>
                <div className="text-sm text-gray-600">Opened Not Clicked</div>
                <div className="text-xs text-orange-600 mt-1">Retarget opportunity</div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <AlertTriangle className="text-yellow-500" size={20} />
                <XCircle className="text-yellow-500" size={16} />
              </div>
              <div className="mt-2">
                <div className="text-2xl font-bold text-gray-900">{analytics.metrics.bounced.toLocaleString()}</div>
                <div className="text-sm text-gray-600">Bounced</div>
                <div className="text-xs text-yellow-600 mt-1">
                  {parseFloat(analytics.rates.bounce_rate).toFixed(2)}%
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <UserMinus className="text-red-500" size={20} />
                <TrendingUp className="text-red-500" size={16} />
              </div>
              <div className="mt-2">
                <div className="text-2xl font-bold text-gray-900">{analytics.metrics.unsubscribed.toLocaleString()}</div>
                <div className="text-sm text-gray-600">Unsubscribed</div>
                <div className="text-xs text-red-600 mt-1">
                  {parseFloat(analytics.rates.unsubscribe_rate).toFixed(2)}%
                </div>
              </div>
            </div>
          </div>

          {/* Device Breakdown */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Smartphone className="mr-2" size={20} />
              Device Breakdown
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <Monitor size={32} className="mx-auto text-purple-600 mb-2" />
                <div className="text-2xl font-bold">{analytics.engagement.device_breakdown.desktop}</div>
                <div className="text-sm text-gray-600">Desktop</div>
                <div className="text-xs text-gray-500 mt-1">
                  {((analytics.engagement.device_breakdown.desktop / (analytics.metrics.unique_opens || 1)) * 100).toFixed(1)}%
                </div>
              </div>
              <div className="text-center">
                <Smartphone size={32} className="mx-auto text-blue-600 mb-2" />
                <div className="text-2xl font-bold">{analytics.engagement.device_breakdown.mobile}</div>
                <div className="text-sm text-gray-600">Mobile</div>
                <div className="text-xs text-gray-500 mt-1">
                  {((analytics.engagement.device_breakdown.mobile / (analytics.metrics.unique_opens || 1)) * 100).toFixed(1)}%
                </div>
              </div>
              <div className="text-center">
                <Target size={32} className="mx-auto text-green-600 mb-2" />
                <div className="text-2xl font-bold">{analytics.engagement.device_breakdown.tablet}</div>
                <div className="text-sm text-gray-600">Tablet</div>
                <div className="text-xs text-gray-500 mt-1">
                  {((analytics.engagement.device_breakdown.tablet / (analytics.metrics.unique_opens || 1)) * 100).toFixed(1)}%
                </div>
              </div>
            </div>
          </div>

          {/* Top Locations */}
          {analytics.engagement.top_locations.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <MapPin className="mr-2" size={20} />
                Top Locations
              </h3>
              <div className="space-y-2">
                {analytics.engagement.top_locations.slice(0, 5).map((location, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Globe size={16} className="mr-2 text-gray-400" />
                      <span className="font-medium">{location.country}</span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-gray-600 mr-2">{location.opens} opens</span>
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-purple-600 h-2 rounded-full"
                          style={{ width: `${(location.opens / analytics.metrics.unique_opens) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Link Performance */}
          {analytics.engagement.link_performance.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <LinkIcon className="mr-2" size={20} />
                Link Performance
              </h3>
              <div className="space-y-3">
                {analytics.engagement.link_performance.map((link, index) => (
                  <div key={index} className="border-l-4 border-purple-500 pl-4 py-2">
                    <div className="font-medium text-gray-900 truncate">{link.label || link.url}</div>
                    <div className="text-sm text-gray-600 truncate mt-1">{link.url}</div>
                    <div className="flex items-center mt-2 text-sm">
                      <span className="text-purple-600 font-medium mr-4">
                        {link.unique_clicks} unique clicks
                      </span>
                      <span className="text-gray-500">
                        {link.clicks} total clicks
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Segmentation Options */}
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Users className="mr-2" size={20} />
              Create Targeted Campaigns
            </h3>
            <p className="text-gray-600 mb-4">
              Click on any metric above to create a new segment and campaign targeting those specific subscribers.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => createSegmentCampaign('opened', 'opened')}
                className="flex items-center justify-between bg-white border border-gray-300 rounded-lg p-3 hover:bg-green-50 hover:border-green-500 transition-colors"
              >
                <span className="font-medium">Who Opened</span>
                <span className="text-green-600 font-bold">{analytics.segments.opened_count}</span>
              </button>
              <button
                onClick={() => createSegmentCampaign('clicked', 'clicked')}
                className="flex items-center justify-between bg-white border border-gray-300 rounded-lg p-3 hover:bg-purple-50 hover:border-purple-500 transition-colors"
              >
                <span className="font-medium">Who Clicked</span>
                <span className="text-purple-600 font-bold">{analytics.segments.clicked_count}</span>
              </button>
              <button
                onClick={() => createSegmentCampaign('opened_not_clicked', 'opened but didn\'t click')}
                className="flex items-center justify-between bg-white border border-gray-300 rounded-lg p-3 hover:bg-orange-50 hover:border-orange-500 transition-colors"
              >
                <span className="font-medium">Opened Not Clicked</span>
                <span className="text-orange-600 font-bold">{analytics.segments.opened_not_clicked_count}</span>
              </button>
              <button
                onClick={() => alert('This segment is for analytics purposes only')}
                className="flex items-center justify-between bg-white border border-gray-300 rounded-lg p-3 hover:bg-gray-50 transition-colors"
              >
                <span className="font-medium">Unsubscribed</span>
                <span className="text-red-600 font-bold">{analytics.segments.unsubscribed_count}</span>
              </button>
            </div>
          </div>

          {/* Test Data Button */}
          {analytics.metrics.sent === 0 && (
            <div className="mt-6">
              <button
                onClick={generateTestData}
                disabled={generatingData}
                className="w-full bg-purple-600 text-white px-4 py-3 rounded-lg hover:bg-purple-700 disabled:opacity-50 font-medium"
              >
                {generatingData ? 'Generating Test Data...' : 'Generate Test Analytics Data'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CampaignAnalyticsDetail;
