import React, { useEffect, useState } from 'react';
import { formatAppDateTime } from '../../lib/dateFormat';

type LeadRow = {
  id: string;
  form_type: string;
  full_name: string | null;
  email: string;
  phone: string | null;
  preferred_date: string | null;
  source_path: string | null;
  created_at: string;
  status: string;
};

export default function NewLeadsSimplePage() {
  const [rows, setRows] = useState<LeadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load(status: 'new' | 'any' = 'new') {
    try {
      setLoading(true);
      const r = await fetch(`/api/leads/list?status=${status}`);
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || 'Failed to load leads');
      setRows(data.rows || []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  async function setStatus(id: string, status: string) {
    const r = await fetch(`/api/leads/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    if (r.ok) load('new');
  }

  useEffect(() => { load('new'); }, []);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">New Leads</h1>
        <button onClick={() => load('any')} className="px-3 py-1 text-sm rounded bg-gray-200 hover:bg-gray-300">Show All</button>
      </div>
      {loading && (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          <span className="ml-3 text-gray-600">Loading leads...</span>
        </div>
      )}
      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>}
      {!loading && rows.length === 0 && <div className="text-center py-12 text-gray-500">No leads yet.</div>}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">When</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Form</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-4 py-2 text-sm text-gray-600">{formatAppDateTime(r.created_at)}</td>
                <td className="px-4 py-2 text-sm">{r.form_type}</td>
                <td className="px-4 py-2 text-sm">{r.full_name || '—'}</td>
                <td className="px-4 py-2 text-sm">{r.email}</td>
                <td className="px-4 py-2 text-sm">{r.phone || '—'}</td>
                <td className="px-4 py-2 text-sm">{r.source_path || '—'}</td>
                <td className="px-4 py-2 text-sm space-x-2">
                  <button onClick={() => setStatus(r.id, 'contacted')} className="px-2 py-1 text-xs rounded bg-blue-600 text-white">Mark Contacted</button>
                  <button onClick={() => setStatus(r.id, 'converted')} className="px-2 py-1 text-xs rounded bg-green-600 text-white">Converted</button>
                  <button onClick={() => setStatus(r.id, 'archived')} className="px-2 py-1 text-xs rounded bg-gray-500 text-white">Archive</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
