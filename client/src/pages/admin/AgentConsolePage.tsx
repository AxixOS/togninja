import React, { useState, useEffect } from 'react';
import {
  Shield,
  Zap,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  BarChart3,
  Activity,
  Eye,
  TrendingUp,
  RefreshCw,
  Filter,
  Download,
} from 'lucide-react';

interface AuditStats {
  total: number;
  successful: number;
  failed: number;
  successRate: number;
  avgDuration: number;
  toolUsage: Record<string, number>;
}

interface ShadowStats {
  totalComparisons: number;
  matches: number;
  mismatches: number;
  v1Errors: number;
  v2Errors: number;
  avgV1Duration: number;
  avgV2Duration: number;
}

interface AuditLog {
  id: number;
  sessionId: string;
  tool: string;
  args: any;
  result: any;
  ok: boolean;
  error: string | null;
  duration: number;
  simulated: boolean;
  createdAt: string;
}

interface ShadowDiff {
  id: number;
  sessionId: string;
  v1Text: string;
  v2PlanJson: string;
  v2ResultsJson: string;
  match: boolean;
  v1Error: string | null;
  v2Error: string | null;
  v1Duration: number | null;
  v2Duration: number | null;
  createdAt: string;
}

const AgentConsolePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'audit' | 'shadow'>('overview');
  const [auditStats, setAuditStats] = useState<AuditStats | null>(null);
  const [shadowStats, setShadowStats] = useState<ShadowStats | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [shadowDiffs, setShadowDiffs] = useState<ShadowDiff[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);

  // Fetch data on mount and when tab changes
  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'overview' || activeTab === 'audit') {
        // Real execution stats from the agent_audit table (last 30 days).
        const statsRes = await fetch('/api/agent/v2/audit/stats?days=30');
        if (statsRes.ok) {
          setAuditStats(await statsRes.json());
        }

        // Real audit log — every tool call ToolBus executes is recorded here.
        const logsRes = await fetch('/api/agent/v2/audit/logs?limit=100');
        if (logsRes.ok) {
          setAuditLogs(await logsRes.json());
        }
      }

      if (activeTab === 'shadow') {
        // Fetch shadow stats
        const shadowRes = await fetch('/api/agent/shadow/stats');
        if (shadowRes.ok) {
          const stats = await shadowRes.json();
          setShadowStats(stats);
        }

        // Fetch shadow diffs
        const diffsRes = await fetch('/api/agent/shadow/diffs?limit=50');
        if (diffsRes.ok) {
          const diffs = await diffsRes.json();
          setShadowDiffs(diffs);
        }
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderOverviewTab = () => (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6 border border-green-100">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Success Rate</h3>
            <CheckCircle className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-3xl font-bold text-green-600">
            {auditStats?.successRate.toFixed(1)}%
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {auditStats?.successful} / {auditStats?.total} calls
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border border-blue-100">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Total Calls</h3>
            <Activity className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-3xl font-bold text-blue-600">{auditStats?.total}</p>
          <p className="text-xs text-gray-500 mt-1">Last 30 days</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border border-purple-100">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Avg Duration</h3>
            <Clock className="w-5 h-5 text-purple-500" />
          </div>
          <p className="text-3xl font-bold text-purple-600">
            {auditStats?.avgDuration.toFixed(0)}ms
          </p>
          <p className="text-xs text-gray-500 mt-1">Response time</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border border-red-100">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Failed Calls</h3>
            <XCircle className="w-5 h-5 text-red-500" />
          </div>
          <p className="text-3xl font-bold text-red-600">{auditStats?.failed}</p>
          <p className="text-xs text-gray-500 mt-1">Requires attention</p>
        </div>
      </div>

      {/* Tool Usage Chart */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-violet-600" />
          Tool Usage Distribution
        </h3>
        <div className="space-y-3">
          {auditStats &&
            Object.entries(auditStats.toolUsage)
              .sort(([, a], [, b]) => b - a)
              .map(([tool, count]) => {
                const percentage = ((count / auditStats.total) * 100).toFixed(1);
                return (
                  <div key={tool}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="font-medium text-gray-700">
                        {tool.replace(/_/g, ' ')}
                      </span>
                      <span className="text-gray-600">
                        {count} ({percentage}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-violet-600 h-2 rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
        </div>
      </div>
    </div>
  );

  const renderAuditTab = () => (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Eye className="w-5 h-5 text-violet-600" />
          Audit Log
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          Complete history of all tool executions
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Timestamp
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Tool
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Duration
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Mode
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {auditLogs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                  No audit logs yet. Start using Agent V2 to see activity here.
                </td>
              </tr>
            ) : (
              auditLogs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {log.tool.replace(/_/g, ' ')}
                  </td>
                  <td className="px-6 py-4">
                    {log.ok ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                        <CheckCircle className="w-3 h-3" />
                        Success
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                        <XCircle className="w-3 h-3" />
                        Failed
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {log.duration}ms
                  </td>
                  <td className="px-6 py-4">
                    {log.simulated ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                        Simulated
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                        Production
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderShadowTab = () => (
    <div className="space-y-6">
      {/* Shadow Stats */}
      {shadowStats && (
        <div className="grid md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow p-6 border border-violet-100">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Match Rate</h3>
              <TrendingUp className="w-5 h-5 text-violet-500" />
            </div>
            <p className="text-3xl font-bold text-violet-600">
              {((shadowStats.matches / shadowStats.totalComparisons) * 100).toFixed(1)}%
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {shadowStats.matches} / {shadowStats.totalComparisons} comparisons
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6 border border-amber-100">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Mismatches</h3>
              <AlertTriangle className="w-5 h-5 text-amber-500" />
            </div>
            <p className="text-3xl font-bold text-amber-600">
              {shadowStats.mismatches}
            </p>
            <p className="text-xs text-gray-500 mt-1">Requires review</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6 border border-blue-100">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">V1 Avg Time</h3>
              <Clock className="w-5 h-5 text-blue-500" />
            </div>
            <p className="text-3xl font-bold text-blue-600">
              {shadowStats.avgV1Duration.toFixed(0)}ms
            </p>
            <p className="text-xs text-gray-500 mt-1">Production</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6 border border-purple-100">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">V2 Avg Time</h3>
              <Clock className="w-5 h-5 text-purple-500" />
            </div>
            <p className="text-3xl font-bold text-purple-600">
              {shadowStats.avgV2Duration.toFixed(0)}ms
            </p>
            <p className="text-xs text-gray-500 mt-1">Shadow mode</p>
          </div>
        </div>
      )}

      {/* Shadow Diffs Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Shield className="w-5 h-5 text-violet-600" />
            V1 vs V2 Comparisons
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Detailed comparison logs from shadow mode testing
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Timestamp
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Match
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  V1 Duration
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  V2 Duration
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Errors
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {shadowDiffs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    <p>No shadow mode data yet.</p>
                    <p className="text-sm mt-2">
                      Enable with: <code className="bg-gray-100 px-2 py-1 rounded">AGENT_V2_SHADOW=true</code>
                    </p>
                  </td>
                </tr>
              ) : (
                shadowDiffs.map((diff) => (
                  <tr
                    key={diff.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => setSelectedSession(diff.sessionId)}
                  >
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(diff.createdAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      {diff.match ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          <CheckCircle className="w-3 h-3" />
                          Match
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                          <AlertTriangle className="w-3 h-3" />
                          Mismatch
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {diff.v1Duration}ms
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {diff.v2Duration}ms
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {diff.v1Error || diff.v2Error ? (
                        <span className="text-red-600">Has errors</span>
                      ) : (
                        <span className="text-gray-400">None</span>
                      )}
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

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <div className="bg-gradient-to-r from-violet-600 to-purple-600 p-3 rounded-xl">
                  <Shield className="w-8 h-8 text-white" />
                </div>
                Agent Console
              </h1>
              <p className="text-gray-600 mt-2">
                Monitor and analyze Agent V2 performance, audit logs, and shadow mode testing
              </p>
            </div>
            <button
              onClick={fetchData}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-2 border-b-2 font-medium transition-colors ${
                activeTab === 'overview'
                  ? 'border-violet-600 text-violet-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('audit')}
              className={`px-4 py-2 border-b-2 font-medium transition-colors ${
                activeTab === 'audit'
                  ? 'border-violet-600 text-violet-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Audit Log
            </button>
            <button
              onClick={() => setActiveTab('shadow')}
              className={`px-4 py-2 border-b-2 font-medium transition-colors ${
                activeTab === 'shadow'
                  ? 'border-violet-600 text-violet-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Shadow Mode
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && renderOverviewTab()}
        {activeTab === 'audit' && renderAuditTab()}
        {activeTab === 'shadow' && renderShadowTab()}
      </div>
    </div>
  );
};

export default AgentConsolePage;
