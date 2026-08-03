import React, { useEffect, useState } from 'react';
import { Merge, X, Users, Crown, FileText, Camera, Image as ImageIcon, RotateCcw, History, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface Member {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  city: string | null;
  company: string | null;
  createdAt: string | null;
  invoiceCount: number;
  sessionCount: number;
  galleryCount: number;
  completeness: number;
}
interface Group {
  confidence: number;
  reasons: string[];
  suggestedSurvivorId: string;
  members: Member[];
}
interface Review {
  survivorId: string;
  included: Record<string, boolean>;
  status: 'idle' | 'merging' | 'done' | 'error';
  msg?: string;
}
interface AuditItem {
  id: string;
  survivorId: string;
  mergedClientId: string;
  mergedName: string;
  mergedEmail: string | null;
  confidence: number | null;
  matchReason: string | null;
  actor: string | null;
  undone: boolean;
  createdAt: string;
}

const tier = (c: number) =>
  c >= 85 ? { label: 'High confidence', cls: 'bg-green-100 text-green-800 border-green-300' }
  : c >= 70 ? { label: 'Likely', cls: 'bg-amber-100 text-amber-800 border-amber-300' }
  : { label: 'Review carefully', cls: 'bg-gray-100 text-gray-700 border-gray-300' };

const fmtDate = (s: string | null) => {
  if (!s) return '—';
  try { return new Date(s).toLocaleDateString(); } catch { return '—'; }
};

const MergeWizard: React.FC<{ open: boolean; onClose: () => void; onMerged: () => void }> = ({ open, onClose, onMerged }) => {
  const [tab, setTab] = useState<'duplicates' | 'history'>('duplicates');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [totalClients, setTotalClients] = useState(0);

  const [history, setHistory] = useState<AuditItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [undoing, setUndoing] = useState<string | null>(null);

  const loadCandidates = async () => {
    setLoading(true); setError(null);
    try {
      const resp = await fetch('/api/crm/clients/merge-candidates', { credentials: 'include' });
      if (!resp.ok) throw new Error(`Failed to load candidates (HTTP ${resp.status})`);
      const data = await resp.json();
      const gs: Group[] = data.groups || [];
      setGroups(gs);
      setTotalClients(data.totalClients || 0);
      setReviews(gs.map((g) => ({
        survivorId: g.suggestedSurvivorId,
        included: Object.fromEntries(g.members.map((m) => [m.id, true])),
        status: 'idle' as const,
      })));
    } catch (e: any) {
      setError(e.message || 'Failed to load duplicate candidates');
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const resp = await fetch('/api/crm/clients/merge-audit?limit=50', { credentials: 'include' });
      if (resp.ok) { const d = await resp.json(); setHistory(d.items || []); }
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    loadCandidates();
    loadHistory();
    setTab('duplicates');
  }, [open]);

  if (!open) return null;

  const setReview = (i: number, patch: Partial<Review>) =>
    setReviews((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  const chooseSurvivor = (i: number, id: string) =>
    setReviews((prev) => prev.map((r, idx) => (idx === i ? { ...r, survivorId: id, included: { ...r.included, [id]: true } } : r)));

  const toggleInclude = (i: number, id: string) =>
    setReviews((prev) => prev.map((r, idx) => {
      if (idx !== i) return r;
      const included = { ...r.included, [id]: !r.included[id] };
      // If the survivor was just excluded, promote the first still-included member.
      let survivorId = r.survivorId;
      if (id === survivorId && !included[id]) {
        const fallback = groups[i].members.find((m) => included[m.id]);
        survivorId = fallback ? fallback.id : survivorId;
      }
      return { ...r, included, survivorId };
    }));

  const mergeGroup = async (i: number) => {
    const g = groups[i]; const r = reviews[i];
    const dupIds = g.members.filter((m) => r.included[m.id] && m.id !== r.survivorId).map((m) => m.id);
    if (dupIds.length === 0) { setReview(i, { status: 'error', msg: 'Select at least two records to merge.' }); return; }
    setReview(i, { status: 'merging', msg: undefined });
    try {
      const resp = await fetch('/api/crm/clients/merge-execute', {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ primaryId: r.survivorId, duplicateIds: dupIds, confidence: g.confidence, matchReason: g.reasons.join(', ') }),
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      setReview(i, { status: 'done', msg: `Merged ${data.merged} record${data.merged === 1 ? '' : 's'} in.` });
      onMerged();
      loadHistory();
    } catch (e: any) {
      setReview(i, { status: 'error', msg: e.message || 'Merge failed' });
    }
  };

  const undoMerge = async (id: string) => {
    if (!window.confirm('Undo this merge? The deleted record is restored and its history moved back.')) return;
    setUndoing(id);
    try {
      const resp = await fetch(`/api/crm/clients/merge-undo/${id}`, { method: 'POST', credentials: 'include' });
      if (!resp.ok) { const d = await resp.json().catch(() => ({})); throw new Error(d.error || `HTTP ${resp.status}`); }
      onMerged();
      await loadHistory();
    } catch (e: any) {
      alert(e.message || 'Failed to undo merge');
    } finally {
      setUndoing(null);
    }
  };

  const pending = reviews.filter((r) => r.status !== 'done').length;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 overflow-auto p-4 sm:p-6">
      <div className="bg-white w-full max-w-5xl rounded-xl shadow-2xl relative my-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div className="flex items-center gap-2">
            <Merge className="text-orange-600" size={22} />
            <h2 className="text-lg font-semibold text-gray-900">Merge Wizard</h2>
          </div>
          <button className="text-gray-400 hover:text-gray-700" onClick={onClose} aria-label="Close"><X size={20} /></button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-6 pt-3">
          <button
            onClick={() => setTab('duplicates')}
            className={`px-3 py-2 text-sm font-medium rounded-t-lg border-b-2 ${tab === 'duplicates' ? 'border-orange-600 text-orange-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            <Users size={15} className="inline mr-1.5 -mt-0.5" />Potential duplicates{groups.length ? ` (${groups.length})` : ''}
          </button>
          <button
            onClick={() => setTab('history')}
            className={`px-3 py-2 text-sm font-medium rounded-t-lg border-b-2 ${tab === 'history' ? 'border-orange-600 text-orange-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            <History size={15} className="inline mr-1.5 -mt-0.5" />History
          </button>
        </div>

        <div className="border-t px-6 py-4 max-h-[70vh] overflow-auto">
          {tab === 'duplicates' && (
            <>
              <p className="text-sm text-gray-500 mb-4">
                Scanned <b>{totalClients.toLocaleString()}</b> clients. Every merge is reviewed by you and can be undone from the History tab.
              </p>

              {loading && <div className="py-10 text-center text-gray-500">Scanning for duplicates…</div>}
              {error && <div className="py-4 px-4 rounded-lg bg-red-50 text-red-700 border border-red-200 text-sm">{error}</div>}
              {!loading && !error && groups.length === 0 && (
                <div className="py-10 text-center text-gray-500">
                  <CheckCircle2 className="mx-auto mb-2 text-green-500" size={28} />
                  No likely duplicates found. Your client list looks clean.
                </div>
              )}

              <div className="space-y-4">
                {groups.map((g, i) => {
                  const r = reviews[i]; if (!r) return null;
                  const th = tier(g.confidence);
                  const includedCount = g.members.filter((m) => r.included[m.id]).length;
                  return (
                    <div key={g.suggestedSurvivorId + i} className={`border rounded-xl overflow-hidden ${r.status === 'done' ? 'opacity-60' : ''}`}>
                      <div className="flex items-center justify-between gap-3 bg-gray-50 border-b px-4 py-2.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${th.cls}`}>{g.confidence}% · {th.label}</span>
                          {g.reasons.map((reason) => (
                            <span key={reason} className="text-xs text-gray-600 bg-white border border-gray-200 rounded-full px-2 py-0.5">{reason}</span>
                          ))}
                        </div>
                        {r.status === 'done' ? (
                          <span className="text-xs font-medium text-green-700 flex items-center gap-1"><CheckCircle2 size={14} />{r.msg}</span>
                        ) : (
                          <button
                            onClick={() => mergeGroup(i)}
                            disabled={r.status === 'merging' || includedCount < 2}
                            className="text-sm bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg flex items-center gap-1.5"
                          >
                            <Merge size={15} />{r.status === 'merging' ? 'Merging…' : `Merge ${includedCount} → 1`}
                          </button>
                        )}
                      </div>

                      {r.status === 'error' && (
                        <div className="px-4 py-2 bg-red-50 text-red-700 text-xs flex items-center gap-1.5"><AlertTriangle size={13} />{r.msg}</div>
                      )}

                      <div className="divide-y">
                        {g.members.map((m) => {
                          const isSurvivor = r.survivorId === m.id;
                          const isIn = !!r.included[m.id];
                          return (
                            <div key={m.id} className={`flex items-center gap-3 px-4 py-2.5 ${!isIn ? 'bg-gray-50/70 opacity-60' : isSurvivor ? 'bg-orange-50/40' : ''}`}>
                              <input
                                type="checkbox" checked={isIn} onChange={() => toggleInclude(i, m.id)}
                                disabled={r.status !== 'idle'} title="Include in this merge"
                                className="h-4 w-4 rounded border-gray-300 text-orange-600"
                              />
                              <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer select-none w-16 shrink-0">
                                <input
                                  type="radio" name={`survivor-${i}`} checked={isSurvivor} disabled={!isIn || r.status !== 'idle'}
                                  onChange={() => chooseSurvivor(i, m.id)} className="text-orange-600"
                                />
                                {isSurvivor ? <span className="flex items-center gap-0.5 text-orange-700 font-medium"><Crown size={12} />Keep</span> : 'Keep'}
                              </label>
                              <div className="min-w-0 flex-1">
                                <div className="text-sm font-medium text-gray-900 truncate">
                                  {m.firstName} {m.lastName}
                                  {m.company ? <span className="text-gray-400 font-normal"> · {m.company}</span> : null}
                                </div>
                                <div className="text-xs text-gray-500 truncate">
                                  {m.email || <span className="italic text-gray-400">no email</span>}
                                  {m.phone ? ` · ${m.phone}` : ''}{m.city ? ` · ${m.city}` : ''}
                                </div>
                              </div>
                              <div className="hidden sm:flex items-center gap-3 text-xs text-gray-500 shrink-0">
                                <span title="Invoices" className="flex items-center gap-0.5"><FileText size={12} />{m.invoiceCount}</span>
                                <span title="Sessions" className="flex items-center gap-0.5"><Camera size={12} />{m.sessionCount}</span>
                                <span title="Galleries" className="flex items-center gap-0.5"><ImageIcon size={12} />{m.galleryCount}</span>
                                <span title="Created" className="w-20 text-right tabular-nums">{fmtDate(m.createdAt)}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {!loading && groups.length > 0 && (
                <p className="text-xs text-gray-400 mt-4">
                  {pending} group{pending === 1 ? '' : 's'} awaiting your decision. The record marked <b>Keep</b> survives and inherits all invoices, sessions, galleries, messages and files; the others are removed.
                </p>
              )}
            </>
          )}

          {tab === 'history' && (
            <>
              {historyLoading && <div className="py-10 text-center text-gray-500">Loading history…</div>}
              {!historyLoading && history.length === 0 && (
                <div className="py-10 text-center text-gray-500">No merges recorded yet.</div>
              )}
              <div className="space-y-2">
                {history.map((h) => (
                  <div key={h.id} className={`flex items-center justify-between gap-3 border rounded-lg px-4 py-2.5 ${h.undone ? 'opacity-60' : ''}`}>
                    <div className="min-w-0">
                      <div className="text-sm text-gray-900 truncate">
                        Merged <b>{h.mergedName || 'record'}</b>{h.mergedEmail ? <span className="text-gray-400"> · {h.mergedEmail}</span> : null}
                      </div>
                      <div className="text-xs text-gray-500">
                        {fmtDate(h.createdAt)}{h.matchReason ? ` · ${h.matchReason}` : ''}{h.actor ? ` · by ${h.actor}` : ''}
                        {h.undone ? ' · undone' : ''}
                      </div>
                    </div>
                    {h.undone ? (
                      <span className="text-xs text-gray-400 shrink-0">Undone</span>
                    ) : (
                      <button
                        onClick={() => undoMerge(h.id)} disabled={undoing === h.id}
                        className="text-sm text-gray-700 hover:text-orange-700 border border-gray-300 hover:border-orange-300 rounded-lg px-2.5 py-1.5 flex items-center gap-1.5 disabled:opacity-50 shrink-0"
                      >
                        <RotateCcw size={14} />{undoing === h.id ? 'Undoing…' : 'Undo'}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default MergeWizard;
