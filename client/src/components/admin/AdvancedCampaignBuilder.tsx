import React, { useState, useEffect } from 'react';
import { 
  Save, 
  Send, 
  Eye, 
  Settings, 
  Users, 
  Target, 
  Zap, 
  Brain, 
  Clock, 
  BarChart3,
  Split,
  Palette,
  Code,
  TestTube,
  Sparkles,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { EmailCampaign, EmailTemplate, Segment, ABTestConfig } from '../../types/email-marketing';
import { 
  createCampaign, 
  updateCampaign, 
  getTemplates, 
  getSegments,
  generateSubjectLine,
  predictEngagement 
} from '../../lib/email-marketing';
import { sendCampaign } from '../../lib/email-marketing';
import { SITE } from '../../config/site';

interface AdvancedCampaignBuilderProps {
  campaign?: EmailCampaign;
  onSave: (campaign: EmailCampaign) => void;
  onCancel: () => void;
}

const AdvancedCampaignBuilder: React.FC<AdvancedCampaignBuilderProps> = ({
  campaign,
  onSave,
  onCancel
}) => {
  const [activeTab, setActiveTab] = useState<'content' | 'audience' | 'settings' | 'test' | 'review'>('content');
  const [campaignData, setCampaignData] = useState<Partial<EmailCampaign>>({
    name: '',
    type: 'broadcast',
    subject: '',
    preview_text: '',
    content: '',
    sender_name: SITE.name,
    sender_email: SITE.email,
    reply_to: SITE.email,
    status: 'draft',
    segments: [],
    tags_include: [],
    tags_exclude: [],
    ab_test: {
      enabled: false,
      test_type: 'subject',
      variants: [],
      winner_criteria: 'open_rate',
      test_duration_hours: 24,
      traffic_split: 50
    },
    send_time_optimization: false,
    frequency_capping: {
      enabled: false,
      max_emails_per_day: 1,
      max_emails_per_week: 3,
      max_emails_per_month: 12,
      respect_user_preferences: true
    },
    deliverability_settings: {
      use_dedicated_ip: false,
      ip_warming: false,
      domain_authentication: {
        spf: true,
        dkim: true,
        dmarc: true
      },
      reputation_monitoring: true,
      bounce_handling: 'automatic',
      complaint_handling: 'automatic'
    },
    compliance_settings: {
      gdpr_compliant: true,
      can_spam_compliant: true,
      auto_unsubscribe_link: true,
      subscription_preferences: true,
      data_retention_days: 365,
      consent_tracking: true
    },
    ...campaign
  });

  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [engagementPrediction, setEngagementPrediction] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [templatesData, segmentsData] = await Promise.all([
        getTemplates(),
        getSegments()
      ]);
      setTemplates(templatesData);
      setSegments(segmentsData);
    } catch (error) {
      // console.error removed
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateSubjectLines = async () => {
    if (!campaignData.content) return;
    
    try {
      const suggestions = await generateSubjectLine(campaignData.content, 'photography clients');
      setAiSuggestions(suggestions);
    } catch (error) {
      // console.error removed
    }
  };

  const handlePredictEngagement = async () => {
    if (!campaignData.id) return;
    
    try {
      const prediction = await predictEngagement(campaignData.id);
      setEngagementPrediction(prediction);
    } catch (error) {
      // console.error removed
    }
  };

  const handleSave = async (shouldSend = false) => {
    try {
      setSaving(true);
      
      const campaignToSave = {
        ...campaignData,
        status: shouldSend ? 'sending' : campaignData.status,
        updated_at: new Date().toISOString()
      };

      let savedCampaign: EmailCampaign;
      
      if (campaign?.id) {
        savedCampaign = await updateCampaign(campaign.id, campaignToSave);
      } else {
        savedCampaign = await createCampaign({
          ...campaignToSave,
          created_at: new Date().toISOString()
        });
      }

      // If Send Campaign was clicked, trigger backend send after save
      if (shouldSend && savedCampaign?.id) {
        setSending(true);
        try {
          const result: any = await sendCampaign(savedCampaign.id);
          if (result?.success === false) {
            alert(`⚠️ ${result?.message || 'Campaign was not sent.'}`);
          } else {
            alert(`✅ ${result?.message || 'Campaign is sending.'}`);
          }
          onSave(savedCampaign);
        } finally {
          setSending(false);
        }
      } else {
        onSave(savedCampaign);
      }
    } catch (error) {
      // console.error removed
    } finally {
      setSaving(false);
    }
  };

  const handleSendTest = async () => {
    try {
      // Ensure minimal required fields
      if (!campaignData.subject || !campaignData.content) {
        alert('Please add a subject and content first.');
        return;
      }
      setSending(true);
      // Save or update first to get an id
      let saved: EmailCampaign | null = null;
      if (campaign?.id) {
        saved = await updateCampaign(campaign.id, { ...campaignData, updated_at: new Date().toISOString() } as any);
      } else {
        saved = await createCampaign({ ...campaignData, status: 'draft', created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
      }
      const testEmail = window.prompt('Send test email to:', SITE.email) || undefined;
      const result = await sendCampaign(saved.id, { test_send: true, test_emails: testEmail ? [testEmail] : undefined });
      if (result?.success) {
        alert(`✅ ${result.message || `Test email sent to ${testEmail}.`}`);
      } else {
        alert(`⚠️ ${result?.message || 'Test email was not sent.'}\n\n${result?.error || ''}\n\nCheck that SMTP is configured (Settings → Email / host env vars).`);
      }
      onSave(saved);
    } catch (e: any) {
      alert(`Failed to send test email: ${e?.message || 'unknown error'}`);
    } finally {
      setSending(false);
    }
  };

  const updateCampaignData = (updates: Partial<EmailCampaign>) => {
    setCampaignData(prev => ({ ...prev, ...updates }));
  };

  const renderContentTab = () => (
    <div className="space-y-6">
      {/* Campaign Name & Type */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Campaign Name *
          </label>
          <input
            type="text"
            value={campaignData.name}
            onChange={(e) => updateCampaignData({ name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            placeholder="Enter campaign name"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Campaign Type
          </label>
          <select
            value={campaignData.type}
            onChange={(e) => updateCampaignData({ type: e.target.value as any })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          >
            <option value="broadcast">Broadcast</option>
            <option value="drip">Drip Campaign</option>
            <option value="trigger">Trigger-based</option>
            <option value="rss">RSS Campaign</option>
            <option value="transactional">Transactional</option>
          </select>
        </div>
      </div>

      {/* Subject Line with AI */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700">
            Subject Line *
          </label>
          <button
            onClick={handleGenerateSubjectLines}
            className="flex items-center text-sm text-purple-600 hover:text-purple-700"
          >
            <Brain size={16} className="mr-1" />
            AI Suggestions
          </button>
        </div>
        <input
          type="text"
          value={campaignData.subject}
          onChange={(e) => updateCampaignData({ subject: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          placeholder="Enter subject line"
        />
        
        {aiSuggestions.length > 0 && (
          <div className="mt-2 p-3 bg-purple-50 rounded-lg">
            <p className="text-sm font-medium text-purple-800 mb-2">AI Suggestions:</p>
            <div className="space-y-1">
              {aiSuggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => updateCampaignData({ subject: suggestion })}
                  className="block w-full text-left text-sm text-purple-700 hover:text-purple-900 hover:bg-purple-100 px-2 py-1 rounded"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Preview Text */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Preview Text
        </label>
        <input
          type="text"
          value={campaignData.preview_text}
          onChange={(e) => updateCampaignData({ preview_text: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          placeholder="Text shown in email preview"
        />
      </div>

      {/* Template Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Email Template
        </label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {templates.slice(0, 6).map((template) => (
            <div
              key={template.id}
              className="border border-gray-200 rounded-lg p-4 cursor-pointer hover:border-purple-500 hover:shadow-md transition-all"
              onClick={() => updateCampaignData({ 
                content: template.html_content,
                design_template: template.id
              })}
            >
              <div className={`aspect-video rounded mb-2 flex items-center justify-center text-white bg-gradient-to-br ${
                /welcome/i.test(template.category || '') ? 'from-emerald-400 to-teal-500'
                : /booking|confirm/i.test(template.category || '') ? 'from-blue-400 to-indigo-500'
                : /news|promo|offer/i.test(template.category || '') ? 'from-amber-400 to-orange-500'
                : 'from-purple-400 to-pink-500'
              }`}>
                <div className="text-center px-2">
                  <Palette size={22} className="mx-auto mb-1 opacity-90" />
                  <span className="text-xs font-semibold line-clamp-1">{template.name}</span>
                </div>
              </div>
              <h4 className="font-medium text-sm">{template.name}</h4>
              <p className="text-xs text-gray-500 capitalize">{template.category}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Email Content Editor */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700">
            Email Content
          </label>
          <div className="flex space-x-2">
            <button className="flex items-center text-sm text-gray-600 hover:text-gray-800">
              <Code size={16} className="mr-1" />
              HTML
            </button>
            <button className="flex items-center text-sm text-gray-600 hover:text-gray-800">
              <Eye size={16} className="mr-1" />
              Preview
            </button>
          </div>
        </div>
        <textarea
          value={campaignData.content}
          onChange={(e) => updateCampaignData({ content: e.target.value })}
          rows={12}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 font-mono text-sm"
          placeholder="Enter your email HTML content..."
        />
      </div>
    </div>
  );

  const renderAudienceTab = () => (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center mb-2">
          <Target size={20} className="text-blue-600 mr-2" />
          <h3 className="font-medium text-blue-900">Audience Targeting</h3>
        </div>
        <p className="text-sm text-blue-700">
          Define who should receive this campaign. You can combine segments, tags, and custom filters.
        </p>
      </div>

      {/* Segments */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Segments
        </label>
        <div className="space-y-2">
          {segments.map((segment) => (
            <label key={segment.id} className="flex items-center">
              <input
                type="checkbox"
                checked={campaignData.segments?.includes(segment.id) || false}
                onChange={(e) => {
                  const currentSegments = campaignData.segments || [];
                  const newSegments = e.target.checked
                    ? [...currentSegments, segment.id]
                    : currentSegments.filter(id => id !== segment.id);
                  updateCampaignData({ segments: newSegments });
                }}
                className="mr-3 rounded border-gray-300 focus:ring-purple-500"
              />
              <div>
                <span className="font-medium">{segment.name}</span>
                <span className="text-sm text-gray-500 ml-2">
                  ({segment.subscriber_count} subscribers)
                </span>
                <p className="text-xs text-gray-500">{segment.description}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Include Tags */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Include Tags
        </label>
        <input
          type="text"
          placeholder="Add tags to include (comma-separated)"
          value={campaignData.tags_include?.join(', ') || ''}
          onChange={(e) => updateCampaignData({ 
            tags_include: e.target.value.split(',').map(tag => tag.trim()).filter(Boolean)
          })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
        />
      </div>

      {/* Exclude Tags */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Exclude Tags
        </label>
        <input
          type="text"
          placeholder="Add tags to exclude (comma-separated)"
          value={campaignData.tags_exclude?.join(', ') || ''}
          onChange={(e) => updateCampaignData({ 
            tags_exclude: e.target.value.split(',').map(tag => tag.trim()).filter(Boolean)
          })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
        />
      </div>

      {/* Estimated Audience */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium text-gray-900">Estimated Audience</h4>
            <p className="text-sm text-gray-600">Based on your targeting criteria</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-purple-600">2,847</div>
            <div className="text-sm text-gray-500">subscribers</div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSettingsTab = () => (
    <div className="space-y-6">
      {/* Sender Information */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Sender Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sender Name
            </label>
            <input
              type="text"
              value={campaignData.sender_name}
              onChange={(e) => updateCampaignData({ sender_name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sender Email
            </label>
            <input
              type="email"
              value={campaignData.sender_email}
              onChange={(e) => updateCampaignData({ sender_email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
          </div>
        </div>
      </div>

      {/* Send Time Optimization */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Send Time Optimization</h3>
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={campaignData.send_time_optimization}
            onChange={(e) => updateCampaignData({ send_time_optimization: e.target.checked })}
            className="mr-3 rounded border-gray-300 focus:ring-purple-500"
          />
          <div>
            <span className="font-medium">Use AI-powered send time optimization</span>
            <p className="text-sm text-gray-500">
              Automatically send emails at the optimal time for each subscriber
            </p>
          </div>
        </label>
      </div>

      {/* Frequency Capping */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Frequency Capping</h3>
        <label className="flex items-center mb-4">
          <input
            type="checkbox"
            checked={campaignData.frequency_capping?.enabled}
            onChange={(e) => updateCampaignData({ 
              frequency_capping: { 
                ...campaignData.frequency_capping!, 
                enabled: e.target.checked 
              }
            })}
            className="mr-3 rounded border-gray-300 focus:ring-purple-500"
          />
          <span className="font-medium">Enable frequency capping</span>
        </label>

        {campaignData.frequency_capping?.enabled && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 ml-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Max per day
              </label>
              <input
                type="number"
                value={campaignData.frequency_capping.max_emails_per_day}
                onChange={(e) => updateCampaignData({
                  frequency_capping: {
                    ...campaignData.frequency_capping!,
                    max_emails_per_day: parseInt(e.target.value)
                  }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Max per week
              </label>
              <input
                type="number"
                value={campaignData.frequency_capping.max_emails_per_week}
                onChange={(e) => updateCampaignData({
                  frequency_capping: {
                    ...campaignData.frequency_capping!,
                    max_emails_per_week: parseInt(e.target.value)
                  }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Max per month
              </label>
              <input
                type="number"
                value={campaignData.frequency_capping.max_emails_per_month}
                onChange={(e) => updateCampaignData({
                  frequency_capping: {
                    ...campaignData.frequency_capping!,
                    max_emails_per_month: parseInt(e.target.value)
                  }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderTestTab = () => (
    <div className="space-y-6">
      {/* A/B Testing */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">A/B Testing</h3>
        <label className="flex items-center mb-4">
          <input
            type="checkbox"
            checked={campaignData.ab_test?.enabled}
            onChange={(e) => updateCampaignData({
              ab_test: { ...campaignData.ab_test!, enabled: e.target.checked }
            })}
            className="mr-3 rounded border-gray-300 focus:ring-purple-500"
          />
          <span className="font-medium">Enable A/B testing</span>
        </label>

        {campaignData.ab_test?.enabled && (
          <div className="space-y-4 ml-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Test Type
                </label>
                <select
                  value={campaignData.ab_test.test_type}
                  onChange={(e) => updateCampaignData({
                    ab_test: { 
                      ...campaignData.ab_test!, 
                      test_type: e.target.value as any 
                    }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="subject">Subject Line</option>
                  <option value="content">Email Content</option>
                  <option value="send_time">Send Time</option>
                  <option value="sender">Sender Name</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Winner Criteria
                </label>
                <select
                  value={campaignData.ab_test.winner_criteria}
                  onChange={(e) => updateCampaignData({
                    ab_test: { 
                      ...campaignData.ab_test!, 
                      winner_criteria: e.target.value as any 
                    }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="open_rate">Open Rate</option>
                  <option value="click_rate">Click Rate</option>
                  <option value="conversion_rate">Conversion Rate</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Engagement Prediction */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Performance Prediction</h3>
        <button
          onClick={handlePredictEngagement}
          className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
        >
          <Brain size={16} className="mr-2" />
          Predict Engagement
        </button>

        {engagementPrediction && (
          <div className="mt-4 p-4 bg-purple-50 rounded-lg">
            <h4 className="font-medium text-purple-900 mb-2">AI Predictions</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-2xl font-bold text-purple-600">
                  {(engagementPrediction.predicted_open_rate * 100).toFixed(1)}%
                </div>
                <div className="text-sm text-purple-700">Predicted Open Rate</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600">
                  {(engagementPrediction.predicted_click_rate * 100).toFixed(1)}%
                </div>
                <div className="text-sm text-purple-700">Predicted Click Rate</div>
              </div>
            </div>
            <div className="mt-2 text-sm text-purple-600">
              Confidence: {(engagementPrediction.confidence * 100).toFixed(0)}%
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderReviewTab = () => (
    <div className="space-y-6">
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center mb-2">
          <CheckCircle size={20} className="text-green-600 mr-2" />
          <h3 className="font-medium text-green-900">Ready to Send!</h3>
        </div>
        <p className="text-sm text-green-700">
          Your campaign has been configured and is ready to be sent.
        </p>
      </div>

      {/* Campaign Summary */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Campaign Summary</h3>
        
        <div className="space-y-4">
          <div className="flex justify-between">
            <span className="text-gray-600">Campaign Name:</span>
            <span className="font-medium">{campaignData.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Subject Line:</span>
            <span className="font-medium">{campaignData.subject}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Campaign Type:</span>
            <span className="font-medium capitalize">{campaignData.type}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Estimated Recipients:</span>
            <span className="font-medium">2,847 subscribers</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Sender:</span>
            <span className="font-medium">{campaignData.sender_name} &lt;{campaignData.sender_email}&gt;</span>
          </div>
        </div>
      </div>

      {/* Pre-send Checklist */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Pre-send Checklist</h3>
        
        <div className="space-y-3">
          {[
            { item: 'Subject line is compelling and under 50 characters', checked: true },
            { item: 'Email content includes unsubscribe link', checked: true },
            { item: 'Images have alt text for accessibility', checked: false },
            { item: 'Links are working and properly tracked', checked: true },
            { item: 'Sender information is correct', checked: true },
            { item: 'Audience targeting is configured', checked: true }
          ].map((check, index) => (
            <div key={index} className="flex items-center">
              {check.checked ? (
                <CheckCircle size={16} className="text-green-500 mr-3" />
              ) : (
                <AlertCircle size={16} className="text-yellow-500 mr-3" />
              )}
              <span className={check.checked ? 'text-gray-900' : 'text-yellow-700'}>
                {check.item}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const tabs = [
    { id: 'content', label: 'Content', icon: Palette },
    { id: 'audience', label: 'Audience', icon: Users },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'test', label: 'Test & Optimize', icon: TestTube },
    { id: 'review', label: 'Review & Send', icon: Send }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 text-purple-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {campaign ? 'Edit Campaign' : 'Create New Campaign'}
          </h1>
          <p className="text-gray-600">
            Build and send professional email campaigns with advanced features
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSendTest}
            disabled={saving || sending}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
          >
            {sending ? (
              <Loader2 size={16} className="mr-2 animate-spin" />
            ) : (
              <TestTube size={16} className="mr-2" />
            )}
            Send Test
          </button>
          <button
            onClick={() => handleSave(false)}
            disabled={saving}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center"
          >
            {saving ? (
              <Loader2 size={16} className="mr-2 animate-spin" />
            ) : (
              <Save size={16} className="mr-2" />
            )}
            Save Draft
          </button>
          <button
            onClick={() => handleSave(true)}
            disabled={saving || sending}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center"
          >
            {saving || sending ? (
              <Loader2 size={16} className="mr-2 animate-spin" />
            ) : (
              <Send size={16} className="mr-2" />
            )}
            Send Campaign
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-8">
        <nav className="flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon size={16} className="mr-2" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        {activeTab === 'content' && renderContentTab()}
        {activeTab === 'audience' && renderAudienceTab()}
        {activeTab === 'settings' && renderSettingsTab()}
        {activeTab === 'test' && renderTestTab()}
        {activeTab === 'review' && renderReviewTab()}
      </div>
    </div>
  );
};

export default AdvancedCampaignBuilder;
