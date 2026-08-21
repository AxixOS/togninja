import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import AdminLayout from '../../components/admin/AdminLayout';
import { 
  Plus, 
  BarChart3, 
  Zap, 
  Mail, 
  Users, 
  TrendingUp,
  Settings,
  Brain,
  Sparkles,
  Target,
  Eye,
  Download,
  // Rendered at line ~554 and missing from this list, so the Campaigns tab threw a
  // ReferenceError and blanked from the first campaign row onward. esbuild transpiles
  // without resolving identifiers, so the build was clean and only the screen was broken.
  Trash2,
  Image as ImageIcon
} from 'lucide-react';
import AdvancedCampaignBuilder from '../../components/admin/AdvancedCampaignBuilder';
import EmailSequenceBuilder from '../../components/admin/EmailSequenceBuilder';
import EmailAnalyticsDashboard from '../../components/admin/EmailAnalyticsDashboard';
import CampaignAnalyticsDetail from '../../components/admin/CampaignAnalyticsDetail';
import { EmailCampaign } from '../../types/email-marketing';
import { getCampaigns } from '../../lib/email-marketing';

type TabType = 'overview' | 'campaigns' | 'sequences' | 'analytics' | 'templates' | 'subscribers' | 'gallery-leads';

// €50 voucher delivery reconciliation: shows newsletter signups with no recorded
// voucher send and lets an admin resend to one or all of them.
type Undelivered = { email: string; firstName?: string; createdAt?: string; legacy?: boolean };
const NewsletterReconcile: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{ total: number; undeliveredCount: number; undelivered: Undelivered[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/email/newsletter/undelivered');
      setData(r.ok ? await r.json() : null);
    } catch { setData(null); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const resend = async (body: { email?: string; all?: boolean }, confirmMsg?: string) => {
    if (confirmMsg && !window.confirm(confirmMsg)) return;
    setBusy(true); setMsg('');
    try {
      const r = await fetch('/api/email/newsletter/resend', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      const j = await r.json();
      if (r.ok) {
        setMsg(`Sent ${j.sent}${j.failed ? `, ${j.failed} failed` : ''}${j.capped ? ` (capped at ${j.cap} — run again for the rest)` : ''}.`);
        await load();
      } else setMsg(j.error || 'Resend failed');
    } catch { setMsg('Resend failed'); } finally { setBusy(false); }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">€50 voucher delivery</h3>
          <p className="text-sm text-gray-600">Newsletter signups with no record of receiving their voucher email.</p>
        </div>
        <button onClick={load} className="text-sm text-purple-600 hover:text-purple-700">Refresh</button>
      </div>
      {loading ? (
        <p className="text-gray-500 text-sm">Checking…</p>
      ) : !data ? (
        <p className="text-gray-500 text-sm">Couldn't load delivery status.</p>
      ) : data.undeliveredCount === 0 ? (
        <p className="text-green-600 text-sm">✓ All {data.total} newsletter subscribers have a recorded voucher send.</p>
      ) : (
        <>
          <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3">
            <span className="text-sm text-amber-800"><strong>{data.undeliveredCount}</strong> of {data.total} have no recorded voucher send.</span>
            <button
              disabled={busy}
              onClick={() => resend({ all: true }, `Send the €50 voucher to ${data.undeliveredCount} subscriber(s) with no recorded send?`)}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 disabled:opacity-50"
            >
              {busy ? 'Sending…' : 'Send voucher to all'}
            </button>
          </div>
          <div className="max-h-56 overflow-auto divide-y divide-gray-100 border border-gray-100 rounded-lg">
            {data.undelivered.slice(0, 200).map((u) => (
              <div key={u.email} className="flex items-center justify-between px-3 py-2 text-sm">
                <span className="text-gray-800">
                  {u.email}
                  {u.legacy && (
                    <span className="ml-2 inline-block rounded bg-blue-50 px-1.5 py-0.5 text-[11px] font-medium text-blue-700" title="Signed up before the mailing-list write existed — found in CRM leads. Sending adds them to the list.">
                      pre-fix signup
                    </span>
                  )}
                </span>
                <button disabled={busy} onClick={() => resend({ email: u.email })} className="text-purple-600 hover:text-purple-700 disabled:opacity-50">Send</button>
              </div>
            ))}
          </div>
        </>
      )}
      {msg && <p className="text-sm text-gray-700 mt-3">{msg}</p>}
    </div>
  );
};

const AdvancedEmailMarketingHub: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [showCampaignBuilder, setShowCampaignBuilder] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<EmailCampaign | null>(null);
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [galleryLeads, setGalleryLeads] = useState<any[]>([]);
  const [selectedGallery, setSelectedGallery] = useState<string | null>(null);
  // Real overview metrics (replaces the old hardcoded 24 / 8.7K / 32.4% / €12.3K).
  const [overview, setOverview] = useState<{
    totalCampaigns: number; activeCampaigns: number; sentCampaigns: number;
    activeSubscribers: number; totalSubscribers: number; totalSent: number;
    totalOpened: number; totalClicked: number;
    averageOpenRate: number; averageClickRate: number;
  } | null>(null);

  useEffect(() => {
    fetch('/api/email/analytics/overall')
      .then((r) => (r.ok ? r.json() : null))
      .then(setOverview)
      .catch(() => setOverview(null));
  }, []);

  useEffect(() => {
    // Check if we should show gallery leads tab
    const galleryParam = searchParams.get('gallery');
    if (galleryParam) {
      setActiveTab('gallery-leads');
      setSelectedGallery(galleryParam);
      loadGalleryLeads(galleryParam);
    }
  }, [searchParams]);

  const loadGalleryLeads = async (galleryId?: string) => {
    try {
      setLoading(true);
      const url = galleryId 
        ? `/api/galleries/${galleryId}/analytics`
        : `/api/galleries/all-email-captures`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setGalleryLeads(data.emailCaptures || []);
      }
    } catch (error) {
      console.error('Error loading gallery leads:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCampaigns = async () => {
    try {
      setLoading(true);
      const list = await getCampaigns();
      setCampaigns(list);
    } catch (e) {
      // no-op
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadCampaigns(); }, []);

  const handleDeleteCampaign = async (campaignId: string, campaignName: string) => {
    if (!confirm(`Delete campaign "${campaignName}"? This cannot be undone.`)) return;
    try {
      const response = await fetch(`/api/admin/email/campaigns/${campaignId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (response.ok) {
        loadCampaigns();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to delete campaign');
      }
    } catch (error) {
      console.error('Error deleting campaign:', error);
      alert('Failed to delete campaign');
    }
  };

  const handleCreateCampaign = () => {
    setEditingCampaign(null);
    setShowCampaignBuilder(true);
  };

  const handleSaveCampaign = (campaign: EmailCampaign) => {
    setShowCampaignBuilder(false);
    // Refresh list after save/send
    loadCampaigns();
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'campaigns', label: 'Campaigns', icon: Mail },
    { id: 'sequences', label: 'Sequences', icon: Zap },
    { id: 'analytics', label: 'Analytics', icon: TrendingUp },
    { id: 'templates', label: 'Templates', icon: Sparkles },
    { id: 'subscribers', label: 'Subscribers', icon: Users },
    { id: 'gallery-leads', label: 'Gallery Leads', icon: ImageIcon }
  ];

  const OverviewTab = () => (
    <div className="space-y-6">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg p-8 text-white">
        <div className="max-w-4xl">
          <h1 className="text-3xl font-bold mb-4">
            Advanced Email Marketing Suite
          </h1>
          <p className="text-xl mb-6 text-purple-100">
            Create, automate, and optimize email campaigns with AI-powered insights that exceed Mailchimp's capabilities.
          </p>
          <div className="flex space-x-4">
            <button
              onClick={handleCreateCampaign}
              className="flex items-center px-6 py-3 bg-white text-purple-600 rounded-lg hover:bg-gray-100 font-medium"
            >
              <Plus size={20} className="mr-2" />
              Create Campaign
            </button>
            <button
              onClick={() => setActiveTab('sequences')}
              className="flex items-center px-6 py-3 border border-white/20 text-white rounded-lg hover:bg-white/10 font-medium"
            >
              <Zap size={20} className="mr-2" />
              Build Sequence
            </button>
          </div>
        </div>
      </div>

      {/* Feature Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center mb-4">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Brain size={24} className="text-purple-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 ml-4">AI-Powered Optimization</h3>
          </div>
          <p className="text-gray-600 mb-4">
            Advanced AI analyzes your campaigns and provides actionable insights to improve performance.
          </p>
          <ul className="text-sm text-gray-500 space-y-1">
            <li>• Smart subject line generation</li>
            <li>• Send time optimization</li>
            <li>• Engagement predictions</li>
            <li>• Content recommendations</li>
          </ul>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center mb-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Target size={24} className="text-blue-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 ml-4">Advanced Segmentation</h3>
          </div>
          <p className="text-gray-600 mb-4">
            Create sophisticated audience segments with behavioral triggers and custom conditions.
          </p>
          <ul className="text-sm text-gray-500 space-y-1">
            <li>• Dynamic segment creation</li>
            <li>• Behavioral targeting</li>
            <li>• Custom field filtering</li>
            <li>• Real-time updates</li>
          </ul>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center mb-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <Zap size={24} className="text-green-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 ml-4">Automation Workflows</h3>
          </div>
          <p className="text-gray-600 mb-4">
            Build complex email sequences with conditional logic and multi-path journeys.
          </p>
          <ul className="text-sm text-gray-500 space-y-1">
            <li>• Multi-step sequences</li>
            <li>• Conditional branching</li>
            <li>• Trigger-based automation</li>
            <li>• Performance tracking</li>
          </ul>
        </div>
      </div>

      {/* Quick Stats — real figures from /api/email/analytics/overall */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-gray-900">{overview ? overview.totalCampaigns.toLocaleString() : '—'}</div>
              <div className="text-sm text-gray-500">Campaigns</div>
            </div>
            <Mail className="h-8 w-8 text-blue-600" />
          </div>
          <div className="mt-4 text-sm text-gray-500">
            {overview ? `${overview.sentCampaigns} sent · ${overview.activeCampaigns} active` : 'Loading…'}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-gray-900">{overview ? overview.activeSubscribers.toLocaleString() : '—'}</div>
              <div className="text-sm text-gray-500">Active Subscribers</div>
            </div>
            <Users className="h-8 w-8 text-purple-600" />
          </div>
          <div className="mt-4 text-sm text-gray-500">
            {overview ? `${overview.totalSubscribers.toLocaleString()} total` : 'Loading…'}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-gray-900">{overview ? `${overview.averageOpenRate}%` : '—'}</div>
              <div className="text-sm text-gray-500">Avg. Open Rate</div>
            </div>
            <Eye className="h-8 w-8 text-green-600" />
          </div>
          <div className="mt-4 text-sm text-gray-500">
            {overview ? `${overview.totalOpened?.toLocaleString?.() ?? 0} opens` : 'Loading…'}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-gray-900">{overview ? `${overview.averageClickRate}%` : '—'}</div>
              <div className="text-sm text-gray-500">Avg. Click Rate</div>
            </div>
            <TrendingUp className="h-8 w-8 text-yellow-600" />
          </div>
          <div className="mt-4 text-sm text-gray-500">
            {overview ? `${overview.totalSent.toLocaleString()} emails sent` : 'Loading…'}
          </div>
        </div>
      </div>

      {/* Recent Campaigns */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium text-gray-900">Recent Campaigns</h3>
          <button
            onClick={() => setActiveTab('campaigns')}
            className="text-purple-600 hover:text-purple-700 text-sm font-medium"
          >
            View all campaigns →
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Campaign
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Recipients
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Open Rate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Click Rate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {campaigns.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-sm text-gray-500">
                    No campaigns yet. Create your first campaign to see live stats here.
                  </td>
                </tr>
              ) : (
                [...campaigns]
                  .sort((a: any, b: any) => new Date(b.updated_at || b.created_at || 0).getTime() - new Date(a.updated_at || a.created_at || 0).getTime())
                  .slice(0, 5)
                  .map((c: any) => {
                    const num = (v: any) => Number(v) || 0;
                    const recipients = num(c.recipient_count ?? c.recipientCount ?? c.sent_count ?? c.sentCount);
                    const delivered = num(c.delivered_count ?? c.deliveredCount) || num(c.sent_count ?? c.sentCount);
                    const opened = num(c.opened_count ?? c.openedCount);
                    const clicked = num(c.clicked_count ?? c.clickedCount);
                    const openRate = delivered ? Math.round((opened / delivered) * 1000) / 10 : 0;
                    const clickRate = delivered ? Math.round((clicked / delivered) * 1000) / 10 : 0;
                    return (
                      <tr key={c.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{c.name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            c.status === 'sent' ? 'bg-green-100 text-green-800' :
                            c.status === 'sending' ? 'bg-blue-100 text-blue-800' :
                            c.status === 'scheduled' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {c.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {recipients > 0 ? recipients.toLocaleString() : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {delivered > 0 ? `${openRate}%` : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {delivered > 0 ? `${clickRate}%` : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => { setSelectedCampaignId(c.id); setActiveTab('campaigns'); }}
                              className="text-blue-600 hover:text-blue-800"
                              title="View in Campaigns"
                            >
                              <Eye size={16} />
                            </button>
                            <button
                              onClick={() => setActiveTab('campaigns')}
                              className="text-gray-600 hover:text-gray-800"
                              title="View in Campaigns"
                            >
                              <Settings size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const CampaignsTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Email Campaigns</h2>
          <p className="text-gray-600">Create and manage your email marketing campaigns</p>
        </div>
        <button
          onClick={handleCreateCampaign}
          className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
        >
          <Plus size={16} className="mr-2" />
          Create Campaign
        </button>
      </div>
      <div className="bg-white border border-gray-200 rounded-lg p-0">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading campaigns…</div>
        ) : campaigns.length === 0 ? (
          <div className="p-8 text-center">
            <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No campaigns yet</h3>
            <p className="text-gray-600 mb-6">Create your first campaign to get started.</p>
            <button
              onClick={handleCreateCampaign}
              className="flex items-center mx-auto px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              <Plus size={16} className="mr-2" />
              Create Your First Campaign
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Updated</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {campaigns.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{c.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        c.status === 'sent' ? 'bg-green-100 text-green-800' :
                        c.status === 'sending' ? 'bg-blue-100 text-blue-800' :
                        c.status === 'scheduled' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>{c.status}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{c.subject}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(c.updated_at).toLocaleString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button 
                          onClick={() => setSelectedCampaignId(c.id)}
                          className="text-blue-600 hover:text-blue-800"
                          title="View Analytics"
                        >
                          <BarChart3 size={16} />
                        </button>
                        <button 
                          onClick={() => {
                            setEditingCampaign(c);
                            setShowCampaignBuilder(true);
                          }}
                          className="text-gray-600 hover:text-gray-800"
                          title="Edit Campaign"
                        >
                          <Settings size={16} />
                        </button>
                        <button 
                          onClick={() => handleDeleteCampaign(c.id, c.name)}
                          className="text-gray-400 hover:text-red-600"
                          title="Delete Campaign"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );

  const TemplatesTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Email Templates</h2>
          <p className="text-gray-600">Professional templates for all your email marketing needs</p>
        </div>
        <button className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
          <Plus size={16} className="mr-2" />
          Create Template
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {[
          { name: 'Welcome Series', category: 'welcome', preview: '/api/placeholder/300/200' },
          { name: 'Newsletter', category: 'newsletter', preview: '/api/placeholder/300/200' },
          { name: 'Promotional', category: 'promotional', preview: '/api/placeholder/300/200' },
          { name: 'Event Invitation', category: 'event', preview: '/api/placeholder/300/200' },
          { name: 'Follow-up', category: 'follow_up', preview: '/api/placeholder/300/200' },
          { name: 'Abandoned Cart', category: 'cart', preview: '/api/placeholder/300/200' }
        ].map((template, index) => (
          <div key={index} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer">
            <div className="aspect-video bg-gray-100 rounded mb-3 flex items-center justify-center">
              <Sparkles size={24} className="text-gray-400" />
            </div>
            <h4 className="font-medium text-gray-900">{template.name}</h4>
            <p className="text-sm text-gray-500 capitalize">{template.category}</p>
            <div className="mt-3 flex space-x-2">
              <button className="flex-1 text-xs py-2 px-3 bg-purple-600 text-white rounded hover:bg-purple-700">
                Use Template
              </button>
              <button className="text-xs py-2 px-3 border border-gray-300 rounded hover:bg-gray-50">
                Preview
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const SubscribersTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Subscribers</h2>
          <p className="text-gray-600">Manage your email subscribers and segments</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => window.open('/api/email/subscribers.csv?tag=newsletter', '_blank')}
            className="flex items-center px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            <Download size={16} className="mr-2" />
            Export newsletter list
          </button>
          <button
            onClick={() => window.open('/api/email/subscribers.csv', '_blank')}
            className="flex items-center px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            <Download size={16} className="mr-2" />
            Export all (CSV)
          </button>
          <button className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
            <Plus size={16} className="mr-2" />
            Add Subscriber
          </button>
        </div>
      </div>

      <NewsletterReconcile />

      <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
        <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Export your subscribers</h3>
        <p className="text-gray-600 max-w-xl mx-auto">
          <strong>Export newsletter list</strong> downloads everyone who signed up via the €50
          voucher form (tagged <code>newsletter</code>). <strong>Export all</strong> downloads every
          subscriber with their tags, source and signup date — open it in Excel to filter or import
          into another tool.
        </p>
      </div>
    </div>
  );

  const GalleryLeadsTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gallery Leads</h2>
          <p className="text-gray-600">Email addresses captured from gallery visitors</p>
        </div>
        <div className="flex space-x-3">
          <button 
            onClick={() => {
              setSelectedGallery(null);
              loadGalleryLeads();
            }}
            className={`px-4 py-2 border rounded-lg ${!selectedGallery ? 'bg-purple-50 border-purple-600 text-purple-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
          >
            All Galleries
          </button>
          <button className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
            Export to CSV
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-gray-900">{galleryLeads.length}</div>
              <div className="text-sm text-gray-500">Total Leads</div>
            </div>
            <Mail className="h-8 w-8 text-green-600" />
          </div>
        </div>
        
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-gray-900">{new Set(galleryLeads.map(l => l.email)).size}</div>
              <div className="text-sm text-gray-500">Unique Emails</div>
            </div>
            <Users className="h-8 w-8 text-blue-600" />
          </div>
        </div>
        
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-gray-900">{galleryLeads.filter(l => l.phone).length}</div>
              <div className="text-sm text-gray-500">With Phone</div>
            </div>
            <Target className="h-8 w-8 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Leads Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Phone
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Source
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Captured
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    Loading...
                  </td>
                </tr>
              ) : galleryLeads.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    No gallery leads captured yet
                  </td>
                </tr>
              ) : (
                galleryLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {lead.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {lead.name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {lead.phone || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 capitalize">
                        {lead.source}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(lead.captured_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button className="text-purple-600 hover:text-purple-900 mr-3">
                        Add to Campaign
                      </button>
                      <button className="text-gray-600 hover:text-gray-900">
                        View Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  if (showCampaignBuilder) {
    return (
      <AdminLayout>
        <AdvancedCampaignBuilder
          campaign={editingCampaign || undefined}
          onSave={handleSaveCampaign}
          onCancel={() => setShowCampaignBuilder(false)}
        />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
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
        {activeTab === 'overview' && <OverviewTab />}
        {activeTab === 'campaigns' && <CampaignsTab />}
        {activeTab === 'sequences' && <EmailSequenceBuilder />}
        {activeTab === 'analytics' && <EmailAnalyticsDashboard />}
        {activeTab === 'templates' && <TemplatesTab />}
        {activeTab === 'subscribers' && <SubscribersTab />}
        {activeTab === 'gallery-leads' && <GalleryLeadsTab />}
      </div>

      {/* Campaign Analytics Modal */}
      {selectedCampaignId && (
        <CampaignAnalyticsDetail 
          campaignId={selectedCampaignId} 
          onClose={() => setSelectedCampaignId(null)} 
        />
      )}
    </AdminLayout>
  );
};

export default AdvancedEmailMarketingHub;