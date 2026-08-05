import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AdminLayout from '../../components/admin/AdminLayout';
import { Package, Plus, KeyRound, Copy, Check, Save, Trash2, ExternalLink, RefreshCw } from 'lucide-react';

/**
 * Bundle deliveries — sell + hand over the TogNinja + ShootCleaner package. Each row is a
 * customer: paste their provisioned instance URL, generate/paste the ShootCleaner key + the
 * installer link, then "Mark delivered" and copy their delivery link.
 */
interface Delivery {
  id: string; token: string; customerName: string | null; customerEmail: string | null;
  status: string; instanceUrl: string | null; setupUrl: string | null;
  shootcleanerApiKey: string | null; shootcleanerDownloadUrl: string | null;
  notes: string | null; createdAt: string; deliveredAt: string | null;
}

const badge = (s: string) => ({
  pending: 'bg-gray-100 text-gray-600', paid: 'bg-amber-100 text-amber-700',
  provisioned: 'bg-blue-100 text-blue-700', delivered: 'bg-green-100 text-green-700',
}[s] || 'bg-gray-100 text-gray-600');

const BundleDeliveriesPage: React.FC = () => {
  const qc = useQueryClient();
  const [copied, setCopied] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, Partial<Delivery>>>({});
  const [newC, setNewC] = useState({ customerName: '', customerEmail: '' });

  const { data, isLoading } = useQuery<{ data: Delivery[] }>({
    queryKey: ['/api/bundle/deliveries'],
    queryFn: async () => { const r = await fetch('/api/bundle/deliveries', { credentials: 'include' }); if (!r.ok) throw new Error('failed'); return r.json(); },
  });
  const invalidate = () => qc.invalidateQueries({ queryKey: ['/api/bundle/deliveries'] });

  const create = useMutation({
    mutationFn: async () => { const r = await fetch('/api/bundle/deliveries', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(newC) }); if (!r.ok) throw new Error('failed'); return r.json(); },
    onSuccess: () => { setNewC({ customerName: '', customerEmail: '' }); invalidate(); },
  });
  const save = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: any }) => { const r = await fetch(`/api/bundle/deliveries/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(patch) }); if (!r.ok) throw new Error('failed'); return r.json(); },
    onSuccess: (_d, v) => { setDraft((p) => { const n = { ...p }; delete n[v.id]; return n; }); invalidate(); },
  });
  const genKey = useMutation({
    mutationFn: async (id: string) => { const r = await fetch(`/api/bundle/deliveries/${id}/generate-key`, { method: 'POST', credentials: 'include' }); if (!r.ok) throw new Error('failed'); return r.json(); },
    onSuccess: () => invalidate(),
  });
  const del = useMutation({
    mutationFn: async (id: string) => { await fetch(`/api/bundle/deliveries/${id}`, { method: 'DELETE', credentials: 'include' }); },
    onSuccess: () => invalidate(),
  });

  const copy = (text: string, id: string) => { navigator.clipboard?.writeText(text).then(() => { setCopied(id); setTimeout(() => setCopied(null), 1400); }); };
  const field = (d: Delivery, k: keyof Delivery) => (draft[d.id]?.[k] ?? (d[k] as any) ?? '');
  const setField = (id: string, k: string, v: string) => setDraft((p) => ({ ...p, [id]: { ...p[id], [k]: v } }));
  const deliverLink = (t: string) => `${window.location.origin}/deliver/${t}`;
  const input = 'px-2 py-1.5 border border-gray-300 rounded text-sm w-full focus:ring-1 focus:ring-purple-500 focus:border-transparent';

  return (
    <AdminLayout>
      <div className="space-y-5">
        <div className="flex items-center gap-2">
          <Package size={22} className="text-purple-600" />
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Bundle Deliveries</h1>
            <p className="text-gray-600 text-sm">Hand over the TogNinja + ShootCleaner package: instance link, ShootCleaner download, and the baked-in connection.</p>
          </div>
        </div>

        {/* New delivery */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap items-end gap-3">
          <div><label className="block text-xs text-gray-500 mb-1">Customer name</label><input className={input} style={{ minWidth: 180 }} value={newC.customerName} onChange={(e) => setNewC({ ...newC, customerName: e.target.value })} placeholder="Studio X" /></div>
          <div><label className="block text-xs text-gray-500 mb-1">Customer email</label><input className={input} style={{ minWidth: 220 }} value={newC.customerEmail} onChange={(e) => setNewC({ ...newC, customerEmail: e.target.value })} placeholder="owner@studio-x.com" /></div>
          <button onClick={() => create.mutate()} disabled={create.isPending} className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
            <Plus size={16} /> New delivery
          </button>
          <span className="text-xs text-gray-400">Paid Stripe checkouts also appear here automatically once the customer lands on the thank-you page.</span>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" /></div>
        ) : (
          <div className="space-y-3">
            {(data?.data || []).map((d) => (
              <div key={d.id} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-gray-900">{d.customerName || d.customerEmail || 'Unnamed customer'}</span>
                    {d.customerEmail && d.customerName && <span className="text-sm text-gray-500">{d.customerEmail}</span>}
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${badge(d.status)}`}>{d.status}</span>
                  </div>
                  <button onClick={() => { if (window.confirm('Delete this delivery?')) del.mutate(d.id); }} className="text-gray-300 hover:text-red-600"><Trash2 size={16} /></button>
                </div>

                <div className="grid md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">TogNinja instance URL</label>
                    <input className={`${input} font-mono text-xs`} value={field(d, 'instanceUrl')} onChange={(e) => setField(d.id, 'instanceUrl', e.target.value)} placeholder="https://studio-x.onrender.com" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">ShootCleaner download URL</label>
                    <input className={`${input} text-xs`} value={field(d, 'shootcleanerDownloadUrl')} onChange={(e) => setField(d.id, 'shootcleanerDownloadUrl', e.target.value)} placeholder="https://…/ShootCleaner-Setup.exe" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs text-gray-500 mb-1">ShootCleaner API key</label>
                    <div className="flex gap-2">
                      <input className={`${input} font-mono text-xs`} value={field(d, 'shootcleanerApiKey')} onChange={(e) => setField(d.id, 'shootcleanerApiKey', e.target.value)} placeholder="sc_…" />
                      <button onClick={() => genKey.mutate(d.id)} disabled={genKey.isPending} className="inline-flex items-center gap-1 border border-purple-300 bg-purple-50 text-purple-700 hover:bg-purple-100 px-3 py-1.5 rounded text-xs whitespace-nowrap disabled:opacity-50"><KeyRound size={14} /> Generate</button>
                      {d.shootcleanerApiKey && <button onClick={() => copy(d.shootcleanerApiKey!, `k-${d.id}`)} className="px-2 border border-gray-300 rounded hover:bg-gray-50">{copied === `k-${d.id}` ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}</button>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-3 flex-wrap gap-2">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-500">Delivery link:</span>
                    <code className="text-xs text-purple-700 truncate max-w-xs">{deliverLink(d.token)}</code>
                    <button onClick={() => copy(deliverLink(d.token), `l-${d.id}`)} className="text-gray-400 hover:text-gray-700">{copied === `l-${d.id}` ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}</button>
                    <a href={deliverLink(d.token)} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-gray-700"><ExternalLink size={14} /></a>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => save.mutate({ id: d.id, patch: draft[d.id] || {} })} disabled={save.isPending || !draft[d.id]} className="inline-flex items-center gap-1.5 bg-gray-800 hover:bg-gray-900 text-white px-3 py-1.5 rounded text-sm disabled:opacity-40">
                      {save.isPending ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />} Save
                    </button>
                    <button onClick={() => save.mutate({ id: d.id, patch: { ...(draft[d.id] || {}), status: 'delivered' } })} disabled={save.isPending || d.status === 'delivered'} className="inline-flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded text-sm disabled:opacity-40">
                      <Check size={14} /> Mark delivered
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {(data?.data || []).length === 0 && <p className="text-center text-gray-400 py-10">No deliveries yet — create one above, or share the bundle checkout.</p>}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default BundleDeliveriesPage;
