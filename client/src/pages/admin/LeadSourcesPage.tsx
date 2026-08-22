import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { Plus, Edit2, Trash2, Save, X, GripVertical } from 'lucide-react';
import { useStudioCurrency } from '../../hooks/useStudioCurrency';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, CartesianGrid, ComposedChart, Line } from 'recharts';

interface LeadSource {
  id: string;
  name: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
}

interface SourceAnalytics {
  source: string;
  leads: number;
  clients: number;
  revenue: number;
  conversion: number | null;
  revenuePerLead: number | null;
}

type DateRange = 'all' | 'this_year' | 'last_year' | 'last_12m';

const rangeQuery = (r: DateRange): string => {
  const now = new Date();
  const y = now.getFullYear();
  if (r === 'this_year') return `?from=${y}-01-01`;
  if (r === 'last_year') return `?from=${y - 1}-01-01&to=${y - 1}-12-31T23:59:59`;
  if (r === 'last_12m') { const d = new Date(now); d.setFullYear(d.getFullYear() - 1); return `?from=${d.toISOString().slice(0, 10)}`; }
  return '';
};
const RANGE_LABELS: Record<DateRange, string> = { all: 'All time', this_year: 'This year', last_year: 'Last year', last_12m: 'Last 12 months' };

const CHART_COLORS = ['#7c3aed', '#2563eb', '#059669', '#d97706', '#db2777', '#0891b2', '#65a30d', '#dc2626', '#4f46e5', '#0d9488'];

const LeadSourcesPage: React.FC = () => {
  const [sources, setSources] = useState<LeadSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [newSourceName, setNewSourceName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<SourceAnalytics[]>([]);
  const [totals, setTotals] = useState<{ leads: number; clients: number; revenue: number }>({ leads: 0, clients: 0, revenue: 0 });
  const [metric, setMetric] = useState<'revenue' | 'clients' | 'leads'>('revenue');
  const [range, setRange] = useState<DateRange>('all');

  const { format: formatPrice, currency } = useStudioCurrency();

  useEffect(() => { fetchSources(); }, []);

  useEffect(() => {
    fetch(`/api/crm/lead-sources/analytics${rangeQuery(range)}`, { credentials: 'include' })
      .then(r => (r.ok ? r.json() : { analytics: [], totals: { leads: 0, clients: 0, revenue: 0 } }))
      .then(d => { setAnalytics(d.analytics || []); setTotals(d.totals || { leads: 0, clients: 0, revenue: 0 }); })
      .catch(() => {});
  }, [range]);

  const fetchSources = async () => {
    try {
      const response = await fetch('/api/crm/lead-sources');
      if (!response.ok) throw new Error('Failed to fetch lead sources');
      const data = await response.json();
      setSources(data);
    } catch (err) {
      setError('Failed to load lead sources');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newSourceName.trim()) return;
    
    try {
      const response = await fetch('/api/crm/lead-sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newSourceName.trim(),
          isActive: true,
          sortOrder: sources.length
        })
      });

      if (!response.ok) throw new Error('Failed to create lead source');
      
      setNewSourceName('');
      fetchSources();
    } catch (err) {
      setError('Failed to create lead source');
      console.error(err);
    }
  };

  const handleUpdate = async (id: string) => {
    if (!editName.trim()) return;

    try {
      const response = await fetch(`/api/crm/lead-sources/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName.trim() })
      });

      if (!response.ok) throw new Error('Failed to update lead source');
      
      setEditingId(null);
      setEditName('');
      fetchSources();
    } catch (err) {
      setError('Failed to update lead source');
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this lead source?')) return;

    try {
      const response = await fetch(`/api/crm/lead-sources/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete lead source');
      
      fetchSources();
    } catch (err) {
      setError('Failed to delete lead source');
      console.error(err);
    }
  };

  const toggleActive = async (source: LeadSource) => {
    try {
      const response = await fetch(`/api/crm/lead-sources/${source.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !source.isActive })
      });

      if (!response.ok) throw new Error('Failed to update lead source');
      
      fetchSources();
    } catch (err) {
      setError('Failed to update lead source');
      console.error(err);
    }
  };

  const startEdit = (source: LeadSource) => {
    setEditingId(source.id);
    setEditName(source.name);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Lead Sources</h1>
          <p className="text-gray-600">Manage where your leads come from</p>
        </div>

        {/* Performance dashboard */}
        {(analytics.length > 0 || range !== 'all') && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Lead Source Performance</h2>
              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={range}
                  onChange={(e) => setRange(e.target.value as DateRange)}
                  className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  {(['all', 'this_year', 'last_year', 'last_12m'] as DateRange[]).map((r) => (
                    <option key={r} value={r}>{RANGE_LABELS[r]}</option>
                  ))}
                </select>
                <div className="flex gap-1 text-sm bg-gray-100 rounded-lg p-0.5">
                  {(['revenue', 'clients', 'leads'] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => setMetric(m)}
                      className={`px-3 py-1 rounded-md capitalize ${metric === m ? 'bg-white shadow text-purple-700 font-medium' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {analytics.length === 0 && (
              <div className="py-6 text-center text-sm text-gray-400">No leads or revenue recorded in this period.</div>
            )}

            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="bg-blue-50 rounded-lg p-3 text-center"><div className="text-2xl font-bold text-blue-700">{totals.leads}</div><div className="text-xs text-gray-500">Total Leads</div></div>
              <div className="bg-green-50 rounded-lg p-3 text-center"><div className="text-2xl font-bold text-green-700">{totals.clients}</div><div className="text-xs text-gray-500">Converted Clients</div></div>
              <div className="bg-purple-50 rounded-lg p-3 text-center"><div className="text-2xl font-bold text-purple-700">{formatPrice(totals.revenue)}</div><div className="text-xs text-gray-500">Total Revenue</div></div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-gray-600 mb-2 capitalize">{metric} by source</h3>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={analytics.slice(0, 10)} margin={{ top: 5, right: 10, left: 0, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="source" angle={-30} textAnchor="end" interval={0} height={60} tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => (metric === 'revenue' ? formatPrice(v) : String(v))} />
                    <Tooltip formatter={(v: any) => (metric === 'revenue' ? formatPrice(Number(v)) : v)} />
                    <Bar dataKey={metric} radius={[4, 4, 0, 0]}>
                      {analytics.slice(0, 10).map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-600 mb-2 capitalize">{metric} share</h3>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={analytics.filter((a) => (a as any)[metric] > 0)} dataKey={metric} nameKey="source" cx="50%" cy="50%" outerRadius={95}>
                      {analytics.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: any) => (metric === 'revenue' ? formatPrice(Number(v)) : v)} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Combined: leads vs revenue (dual axis) to spot over/under-conversion */}
            <div className="mt-6">
              <h3 className="text-sm font-medium text-gray-600 mb-2">Leads vs revenue — spot over/under-converting channels</h3>
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={analytics.slice(0, 10)} margin={{ top: 5, right: 10, left: 0, bottom: 50 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="source" angle={-30} textAnchor="end" interval={0} height={60} tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} tickFormatter={(v) => formatPrice(v)} />
                  <Tooltip formatter={(v: any, name: any) => (name === 'Revenue' ? formatPrice(Number(v)) : v)} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar yAxisId="left" dataKey="leads" name="Leads" fill="#93c5fd" radius={[4, 4, 0, 0]} />
                  <Line yAxisId="right" dataKey="revenue" name="Revenue" stroke="#7c3aed" strokeWidth={2} dot={{ r: 3 }} />
                </ComposedChart>
              </ResponsiveContainer>
              <p className="text-[11px] text-gray-400 mt-1">Tall bar with a low line = a channel bringing leads that don't convert to revenue. Short bar with a high line = a high-value channel worth doubling down on.</p>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm min-w-[520px]">
                <thead>
                  <tr className="text-[11px] text-gray-500 uppercase text-left border-b">
                    <th className="py-2 pr-4 font-medium">Source</th>
                    <th className="py-2 px-2 font-medium text-right">Leads</th>
                    <th className="py-2 px-2 font-medium text-right">Clients</th>
                    <th className="py-2 px-2 font-medium text-right">Conv.</th>
                    <th className="py-2 px-2 font-medium text-right" title="Revenue per lead — how efficiently this channel turns leads into money">{currency}/lead</th>
                    <th className="py-2 px-2 font-medium text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {analytics.map((a, i) => (
                    <tr key={a.source}>
                      <td className="py-2 pr-4"><span className="inline-flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />{a.source}</span></td>
                      <td className="py-2 px-2 text-right text-gray-600">{a.leads}</td>
                      <td className="py-2 px-2 text-right text-gray-600">{a.clients}</td>
                      <td className="py-2 px-2 text-right text-gray-600">{a.conversion == null ? '—' : `${a.conversion}%`}</td>
                      <td className="py-2 px-2 text-right text-gray-600">{a.revenuePerLead == null ? '—' : formatPrice(a.revenuePerLead)}</td>
                      <td className="py-2 px-2 text-right font-medium text-gray-900">{formatPrice(a.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Add New Source */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Add New Lead Source</h2>
          <div className="flex gap-3">
            <input
              type="text"
              value={newSourceName}
              onChange={(e) => setNewSourceName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              placeholder="Enter lead source name..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={handleCreate}
              disabled={!newSourceName.trim()}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Plus className="h-5 w-5" />
              Add Source
            </button>
          </div>
        </div>

        {/* Sources List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Existing Lead Sources</h2>
            
            {sources.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No lead sources yet. Add your first one above!</p>
            ) : (
              <div className="space-y-2">
                {sources.map((source) => (
                  <div
                    key={source.id}
                    className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <GripVertical className="h-5 w-5 text-gray-400 cursor-move" />
                    
                    {editingId === source.id ? (
                      <>
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleUpdate(source.id);
                            if (e.key === 'Escape') cancelEdit();
                          }}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          autoFocus
                        />
                        <button
                          onClick={() => handleUpdate(source.id)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                          title="Save"
                        >
                          <Save className="h-5 w-5" />
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                          title="Cancel"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="flex-1 text-gray-900">{source.name}</span>
                        
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={source.isActive}
                            onChange={() => toggleActive(source)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-600">Active</span>
                        </label>

                        <button
                          onClick={() => startEdit(source)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                          title="Edit"
                        >
                          <Edit2 className="h-5 w-5" />
                        </button>
                        
                        <button
                          onClick={() => handleDelete(source.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                          title="Delete"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default LeadSourcesPage;

