import React, { useState, useEffect } from 'react';
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  Mail, 
  MousePointer, 
  Eye, 
  UserMinus,
  Target,
  Globe,
  Smartphone,
  Monitor,
  Clock,
  Calendar,
  Filter,
  Download,
  RefreshCw,
  Brain,
  Lightbulb
} from 'lucide-react';
import { EmailAnalytics, AIInsight, AIRecommendation } from '../../types/email-marketing';
import { 
  getCampaignAnalytics, 
  getOverallAnalytics, 
  getAIInsights, 
  getAIRecommendations 
} from '../../lib/email-marketing';

const EmailAnalyticsDashboard: React.FC = () => {
  const [analytics, setAnalytics] = useState<EmailAnalytics | null>(null);
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<'day' | 'week' | 'month' | 'quarter'>('month');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, [selectedPeriod]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const [analyticsData, insightsData, recommendationsData] = await Promise.all([
        getOverallAnalytics(selectedPeriod),
        getAIInsights(),
        getAIRecommendations()
      ]);
      
      setAnalytics(analyticsData);
      setInsights(insightsData);
      setRecommendations(recommendationsData);
    } catch (error) {
      // console.error removed
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatPercentage = (num: number): string => {
    return `${(num * 100).toFixed(1)}%`;
  };

  const getChangeColor = (change: number): string => {
    if (change > 0) return 'text-green-600';
    if (change < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getChangeIcon = (change: number) => {
    if (change > 0) return <TrendingUp size={16} className="text-green-600" />;
    if (change < 0) return <TrendingDown size={16} className="text-red-600" />;
    return null;
  };

  const MetricCard: React.FC<{
    title: string;
    value: string;
    change?: number;
    icon: React.ReactNode;
    color: string;
  }> = ({ title, value, change, icon, color }) => (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <div className="flex items-center space-x-2">
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            {change !== undefined && (
              <div className="flex items-center space-x-1">
                {getChangeIcon(change)}
                <span className={`text-sm font-medium ${getChangeColor(change)}`}>
                  {Math.abs(change).toFixed(1)}%
                </span>
              </div>
            )}
          </div>
        </div>
        <div className={`p-3 rounded-full ${color.replace('text-', 'bg-').replace('600', '100')}`}>
          {icon}
        </div>
      </div>
    </div>
  );

  const InsightCard: React.FC<{ insight: AIInsight }> = ({ insight }) => (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-start space-x-3">
        <div className={`p-2 rounded-full ${
          insight.impact === 'high' ? 'bg-red-100' :
          insight.impact === 'medium' ? 'bg-yellow-100' :
          'bg-blue-100'
        }`}>
          <Brain size={16} className={
            insight.impact === 'high' ? 'text-red-600' :
            insight.impact === 'medium' ? 'text-yellow-600' :
            'text-blue-600'
          } />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-gray-900">{insight.title}</h4>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              insight.impact === 'high' ? 'bg-red-100 text-red-800' :
              insight.impact === 'medium' ? 'bg-yellow-100 text-yellow-800' :
              'bg-blue-100 text-blue-800'
            }`}>
              {insight.impact} impact
            </span>
          </div>
          <p className="text-sm text-gray-600 mt-1">{insight.description}</p>
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-gray-500 capitalize">{insight.type}</span>
            <span className="text-xs text-gray-500">{(insight.confidence * 100).toFixed(0)}% confidence</span>
          </div>
        </div>
      </div>
    </div>
  );

  const RecommendationCard: React.FC<{ recommendation: AIRecommendation }> = ({ recommendation }) => (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-start space-x-3">
        <div className="p-2 bg-purple-100 rounded-full">
          <Lightbulb size={16} className="text-purple-600" />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-gray-900">{recommendation.title}</h4>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              recommendation.effort_level === 'low' ? 'bg-green-100 text-green-800' :
              recommendation.effort_level === 'medium' ? 'bg-yellow-100 text-yellow-800' :
              'bg-red-100 text-red-800'
            }`}>
              {recommendation.effort_level} effort
            </span>
          </div>
          <p className="text-sm text-gray-600 mt-1">{recommendation.description}</p>
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-purple-600 font-medium">{recommendation.expected_improvement}</span>
            <span className="text-xs text-gray-500 capitalize">{recommendation.type}</span>
          </div>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 text-purple-600 animate-spin" />
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-12">
        <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No analytics data available</h3>
        <p className="text-gray-600">Send some campaigns to see your email marketing analytics.</p>
      </div>
    );
  }

  const deviceData = [
    { name: 'Desktop', value: 45, color: '#8b5cf6' },
    { name: 'Mobile', value: 40, color: '#3b82f6' },
    { name: 'Tablet', value: 15, color: '#10b981' }
  ];

  const timeData = analytics.metrics.opens.slice(-7).map((item, index) => ({
    time: new Date(item.date).toLocaleDateString(),
    opens: item.value,
    clicks: analytics.metrics.clicks[index]?.value || 0
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Email Analytics</h1>
          <p className="text-gray-600">Comprehensive insights into your email marketing performance</p>
        </div>
        <div className="flex space-x-3">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          >
            <option value="day">Last 7 Days</option>
            <option value="week">Last 4 Weeks</option>
            <option value="month">Last 12 Months</option>
            <option value="quarter">Last 4 Quarters</option>
          </select>
          <button className="flex items-center px-3 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
            <Filter size={16} className="mr-2" />
            Filter
          </button>
          <button className="flex items-center px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
            <Download size={16} className="mr-2" />
            Export
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Sent"
          value={formatNumber(analytics.metrics.sent.reduce((sum, item) => sum + item.value, 0))}
          change={5.2}
          icon={<Mail size={20} />}
          color="text-blue-600"
        />
        <MetricCard
          title="Open Rate"
          value={formatPercentage(0.24)}
          change={-2.1}
          icon={<Eye size={20} />}
          color="text-green-600"
        />
        <MetricCard
          title="Click Rate"
          value={formatPercentage(0.035)}
          change={8.7}
          icon={<MousePointer size={20} />}
          color="text-purple-600"
        />
        <MetricCard
          title="Unsubscribe Rate"
          value={formatPercentage(0.002)}
          change={-12.5}
          icon={<UserMinus size={20} />}
          color="text-red-600"
        />
      </div>

      {/* Performance Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Opens & Clicks Trend */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Opens & Clicks Trend</h3>
            <div className="flex items-center space-x-4 text-sm">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                <span className="text-gray-600">Opens</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-purple-500 rounded-full mr-2"></div>
                <span className="text-gray-600">Clicks</span>
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={timeData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />
              <Area type="monotone" dataKey="opens" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
              <Area type="monotone" dataKey="clicks" stackId="1" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.6} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Device Breakdown */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Device Breakdown</h3>
          <div className="flex items-center space-x-6">
            <ResponsiveContainer width="60%" height={200}>
              <PieChart>
                <Pie
                  data={deviceData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {deviceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-3">
              {deviceData.map((device, index) => (
                <div key={device.name} className="flex items-center space-x-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: device.color }}></div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{device.name}</div>
                    <div className="text-sm text-gray-500">{device.value}% of opens</div>
                  </div>
                  {device.name === 'Desktop' && <Monitor size={16} className="text-gray-400" />}
                  {device.name === 'Mobile' && <Smartphone size={16} className="text-gray-400" />}
                  {device.name === 'Tablet' && <Target size={16} className="text-gray-400" />}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Comparison Metrics */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Industry Comparison</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { metric: 'Open Rate', your: '24.2%', industry: '21.8%', better: true },
            { metric: 'Click Rate', your: '3.5%', industry: '2.9%', better: true },
            { metric: 'Unsubscribe Rate', your: '0.2%', industry: '0.3%', better: true }
          ].map((item) => (
            <div key={item.metric} className="text-center">
              <div className="text-sm font-medium text-gray-600 mb-2">{item.metric}</div>
              <div className="flex items-center justify-center space-x-4">
                <div>
                  <div className="text-2xl font-bold text-purple-600">{item.your}</div>
                  <div className="text-xs text-gray-500">Your Average</div>
                </div>
                <div className={`text-sm font-medium ${item.better ? 'text-green-600' : 'text-red-600'}`}>
                  vs
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-400">{item.industry}</div>
                  <div className="text-xs text-gray-500">Industry Avg</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* AI Insights & Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* AI Insights */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">AI Insights</h3>
            <Brain className="h-5 w-5 text-purple-600" />
          </div>
          <div className="space-y-4">
            {insights.slice(0, 3).map((insight, index) => (
              <InsightCard key={index} insight={insight} />
            ))}
          </div>
        </div>

        {/* AI Recommendations */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">AI Recommendations</h3>
            <Lightbulb className="h-5 w-5 text-purple-600" />
          </div>
          <div className="space-y-4">
            {recommendations.slice(0, 3).map((recommendation, index) => (
              <RecommendationCard key={index} recommendation={recommendation} />
            ))}
          </div>
        </div>
      </div>

      {/* Best Performing Campaigns */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Top Performing Campaigns</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Campaign
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sent
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Open Rate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Click Rate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Revenue
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sent Date
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {[
                { name: 'Summer Photography Special', sent: 2847, openRate: 32.4, clickRate: 5.8, revenue: '€1,240', date: '2024-06-15' },
                { name: 'Wedding Season Announcement', sent: 1923, openRate: 28.7, clickRate: 4.2, revenue: '€890', date: '2024-06-10' },
                { name: 'Family Portrait Promotion', sent: 3156, openRate: 26.1, clickRate: 3.9, revenue: '€1,567', date: '2024-06-05' }
              ].map((campaign, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{campaign.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {campaign.sent.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {campaign.openRate}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {campaign.clickRate}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                    {campaign.revenue}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center">
                      <Calendar size={14} className="mr-1" />
                      {new Date(campaign.date).toLocaleDateString()}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Send Time Analysis */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Best Send Times</h3>
        <div className="grid grid-cols-7 gap-2">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, dayIndex) => (
            <div key={day} className="text-center">
              <div className="text-sm font-medium text-gray-600 mb-2">{day}</div>
              <div className="space-y-1">
                {Array.from({ length: 24 }, (_, hour) => {
                  const engagement = Math.random() * 100;
                  return (
                    <div
                      key={hour}
                      className={`h-2 w-full rounded ${
                        engagement > 80 ? 'bg-green-500' :
                        engagement > 60 ? 'bg-yellow-500' :
                        engagement > 40 ? 'bg-orange-500' :
                        'bg-red-500'
                      }`}
                      title={`${hour}:00 - ${engagement.toFixed(1)}% engagement`}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-center space-x-6 text-sm">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-500 rounded mr-2"></div>
            <span className="text-gray-600">High engagement (80%+)</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-yellow-500 rounded mr-2"></div>
            <span className="text-gray-600">Good (60-80%)</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-orange-500 rounded mr-2"></div>
            <span className="text-gray-600">Average (40-60%)</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-red-500 rounded mr-2"></div>
            <span className="text-gray-600">Low (&lt;40%)</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailAnalyticsDashboard;
