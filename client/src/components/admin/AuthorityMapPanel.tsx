import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Sparkles, Save, Check, AlertCircle, Network, ArrowRight, RefreshCw, Pencil, Plus, Trash2, X, LayoutTemplate } from 'lucide-react';
import { useAuthorityMap } from '../../hooks/useAuthorityMap';
import type { AuthorityMap, AuthorityPillar } from '../../../../shared/authorityMap';

/**
 * Authority Map panel â€” generate a per-studio topical-cluster + internal-link structure
 * from the studio's niche, edit it by hand, and save it. Once saved, the SSR blog uplinks
 * and the (guarded) SEO components render from it. Lives in the Website Studio "Analyse" tab.
 */
const LANGS = ['English', 'German', 'French', 'Spanish'];
const clone = (m: AuthorityMap): AuthorityMap => JSON.parse(JSON.stringify(m));

const AuthorityMapPanel: React.FC = () => {
  const { map: current, hasMap: isCustom, loading } = useAuthorityMap();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({ businessName: '', niche: '', services: '', city: '', language: 'English' });
  const [working, setWorking] = useState<AuthorityMap | null>(null); // editable draft (from Generate or Edit)
  const [busy, setBusy] = useState<'generate' | 'save' | null>(null);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [building, setBuilding] = useState(false);
  const [scaffold, setScaffold] = useState<{ results: any[]; created: number; skipped: number; remaining: number } | null>(null);

  const setField = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const generate = async () => {
    if (!form.niche.trim() && !form.services.trim()) { setMsg({ type: 'error', text: 'Tell us your niche or services first.' }); return; }
    setBusy('generate'); setMsg(null);
    try {
      const r = await fetch('/api/authority-map/generate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(form),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Generation failed');
      setWorking(d.map);
      setMsg({ type: 'success', text: `Generated ${d.map.pillars?.length || 0} pillar pages â€” review/edit below, then Save.` });
    } catch (e: any) { setMsg({ type: 'error', text: e?.message || 'Generation failed' }); }
    finally { setBusy(null); }
  };

  const save = async () => {
    if (!working) return;
    setBusy('save'); setMsg(null);
    try {
      const r = await fetch('/api/authority-map', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(working),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Save failed');
      await queryClient.invalidateQueries({ queryKey: ['/api/authority-map'] });
      setWorking(null);
      setMsg({ type: 'success', text: 'Saved â€” your site now uses this authority structure.' });
    } catch (e: any) { setMsg({ type: 'error', text: e?.message || 'Save failed' }); }
    finally { setBusy(null); }
  };

  const buildPages = async () => {
    setBuilding(true); setMsg(null); setScaffold(null);
    try {
      const r = await fetch('/api/authority-map/scaffold', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ city: form.city }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Build failed');
      setScaffold(d);
      setMsg({ type: 'success', text: `Built ${d.created} page(s)${d.skipped ? `, skipped ${d.skipped} existing` : ''}${d.remaining ? `, ${d.remaining} remaining â€” click Build again` : ''}.` });
    } catch (e: any) { setMsg({ type: 'error', text: e?.message || 'Build failed' }); }
    finally { setBuilding(false); }
  };

  // --- editing helpers (operate on `working`) --------------------------------
  const patchPillar = (i: number, patch: Partial<AuthorityPillar>) =>
    setWorking((w) => w && ({ ...w, pillars: w.pillars.map((p, idx) => (idx === i ? { ...p, ...patch } : p)) }));
  const removePillar = (i: number) =>
    setWorking((w) => w && ({ ...w, pillars: w.pillars.filter((_, idx) => idx !== i) }));
  const addPillar = () =>
    setWorking((w) => w && ({ ...w, pillars: [...w.pillars, { id: `pillar-${w.pillars.length + 1}`, match: '', href: '/new-pillar/', label: 'New Pillar', siblings: [], clusters: [] }] }));
  const patchCluster = (pi: number, ci: number, patch: { href?: string; label?: string }) =>
    setWorking((w) => w && ({ ...w, pillars: w.pillars.map((p, idx) => (idx !== pi ? p : { ...p, clusters: (p.clusters || []).map((c, j) => (j === ci ? { ...c, ...patch } : c)) })) }));
  const addCluster = (pi: number) =>
    setWorking((w) => w && ({ ...w, pillars: w.pillars.map((p, idx) => (idx !== pi ? p : { ...p, clusters: [...(p.clusters || []), { href: '/blog/new-article', label: 'New cluster article' }] })) }));
  const removeCluster = (pi: number, ci: number) =>
    setWorking((w) => w && ({ ...w, pillars: w.pillars.map((p, idx) => (idx !== pi ? p : { ...p, clusters: (p.clusters || []).filter((_, j) => j !== ci) })) }));

  const inputCls = 'px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-purple-500 focus:border-transparent';

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
      <div className="flex items-start gap-3 mb-4">
        <div className="rounded-lg bg-purple-100 p-2"><Network size={20} className="text-purple-700" /></div>
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-gray-900">Authority Map</h2>
          <p className="text-gray-600 text-sm">
            Your topical clusters + internal-link structure â€” the pillar pages and the supporting
            articles that link to them. This is what builds topical authority in search.
          </p>
          {!loading && !working && (
            <p className="text-xs mt-1">
              {isCustom
                ? <span className="text-green-700 font-medium">âœ“ Using your studio's map â€” {current.pillars.length} pillar pages.</span>
                : <span className="text-gray-500">Currently using the default starter map ({current.pillars.length} pillars). Generate or edit your own below.</span>}
            </p>
          )}
        </div>
        {!working && (
          <button onClick={() => setWorking(clone(current))} className="inline-flex items-center gap-1.5 text-sm text-purple-700 hover:text-purple-900">
            <Pencil size={15} /> Edit
          </button>
        )}
      </div>

      {msg && (
        <div className={`rounded-lg p-3 mb-4 flex items-center text-sm ${msg.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
          {msg.type === 'success' ? <Check size={16} className="mr-2" /> : <AlertCircle size={16} className="mr-2" />}
          {msg.text}
        </div>
      )}

      {/* Generator form */}
      <div className="grid sm:grid-cols-2 gap-3 mb-3">
        <input value={form.businessName} onChange={(e) => setField('businessName', e.target.value)} placeholder="Business name (optional)" className={`${inputCls} py-2`} />
        <input value={form.city} onChange={(e) => setField('city', e.target.value)} placeholder="City / service area" className={`${inputCls} py-2`} />
        <input value={form.niche} onChange={(e) => setField('niche', e.target.value)} placeholder="Niche (e.g. wedding photography)" className={`${inputCls} py-2`} />
        <select value={form.language} onChange={(e) => setField('language', e.target.value)} className={`${inputCls} py-2`}>
          {LANGS.map((l) => <option key={l} value={l}>{l}</option>)}
        </select>
      </div>
      <textarea value={form.services} onChange={(e) => setField('services', e.target.value)} rows={2}
        placeholder="Services offered (comma-separated), e.g. family shoots, newborn, maternity, business headshots"
        className={`w-full ${inputCls} py-2 mb-3`} />

      <div className="flex flex-wrap gap-3">
        <button onClick={generate} disabled={busy !== null} className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
          {busy === 'generate' ? <RefreshCw size={16} className="animate-spin" /> : <Sparkles size={16} />}
          {busy === 'generate' ? 'Generatingâ€¦' : (isCustom ? 'Regenerate' : 'Generate my authority map')}
        </button>
        {working && (
          <>
            <button onClick={save} disabled={busy !== null} className="inline-flex items-center gap-2 border border-green-300 bg-green-50 text-green-700 hover:bg-green-100 px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
              {busy === 'save' ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />} Save map
            </button>
            <button onClick={() => setWorking(null)} disabled={busy !== null} className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 px-3 py-2 rounded-lg text-sm">
              <X size={16} /> Cancel
            </button>
          </>
        )}
      </div>

      {/* Structure: editable when `working`, else read-only current */}
      <div className="mt-5 border-t border-gray-100 pt-5">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
          {working ? 'Editing â€” Save to apply' : 'Current structure'}
        </p>

        {working ? (
          <div className="space-y-3">
            {working.pillars.map((p, pi) => (
              <div key={pi} className="rounded-lg border border-gray-200 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <input value={p.label} onChange={(e) => patchPillar(pi, { label: e.target.value })} placeholder="Pillar title" className={`${inputCls} flex-1 font-medium`} />
                  <input value={p.href} onChange={(e) => patchPillar(pi, { href: e.target.value })} placeholder="/slug/" className={`${inputCls} w-40 font-mono text-xs`} />
                  <button onClick={() => removePillar(pi)} className="text-red-400 hover:text-red-600 p-1" title="Remove pillar"><Trash2 size={15} /></button>
                </div>
                <input value={p.keyphrase || ''} onChange={(e) => patchPillar(pi, { keyphrase: e.target.value })} placeholder="Primary keyphrase (optional)" className={`${inputCls} w-full mb-2`} />
                <div className="pl-3 border-l-2 border-gray-100 space-y-1.5">
                  {(p.clusters || []).map((c, ci) => (
                    <div key={ci} className="flex items-center gap-2">
                      <ArrowRight size={12} className="text-gray-300 flex-shrink-0" />
                      <input value={c.label} onChange={(e) => patchCluster(pi, ci, { label: e.target.value })} placeholder="Cluster article title" className={`${inputCls} flex-1`} />
                      <input value={c.href} onChange={(e) => patchCluster(pi, ci, { href: e.target.value })} placeholder="/blog/slug" className={`${inputCls} w-40 font-mono text-xs`} />
                      <button onClick={() => removeCluster(pi, ci)} className="text-red-300 hover:text-red-600 p-0.5" title="Remove"><X size={14} /></button>
                    </div>
                  ))}
                  <button onClick={() => addCluster(pi)} className="inline-flex items-center gap-1 text-xs text-purple-600 hover:text-purple-800"><Plus size={13} /> Add cluster article</button>
                </div>
                {p.siblings && p.siblings.length > 0 && (
                  <p className="text-[11px] text-gray-400 mt-2">Cross-links to: {p.siblings.map((s) => s.label).join(' Â· ')}</p>
                )}
              </div>
            ))}
            <button onClick={addPillar} className="inline-flex items-center gap-1.5 text-sm text-purple-600 hover:text-purple-800 border border-dashed border-purple-200 rounded-lg px-3 py-2 w-full justify-center">
              <Plus size={15} /> Add pillar page
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-3">
            {current.pillars.map((p) => (
              <div key={p.id || p.href} className="rounded-lg border border-gray-200 p-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-900 text-sm">{p.label}</span>
                  <code className="text-xs text-gray-400">{p.href}</code>
                </div>
                {p.keyphrase && <p className="text-xs text-purple-600 mt-0.5">{p.keyphrase}</p>}
                {p.clusters && p.clusters.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {p.clusters.map((c) => (
                      <li key={c.href} className="text-xs text-gray-600 flex items-center gap-1">
                        <ArrowRight size={11} className="text-gray-400 flex-shrink-0" /> {c.label}
                      </li>
                    ))}
                  </ul>
                )}
                {p.siblings && p.siblings.length > 0 && (
                  <p className="text-[11px] text-gray-400 mt-2">Links to: {p.siblings.map((s) => s.label).join(' Â· ')}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Phase 2: build a draft landing page per pillar */}
      {isCustom && !working && (
        <div className="mt-5 border-t border-gray-100 pt-5">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="text-sm font-semibold text-gray-900">Pillar pages</p>
              <p className="text-xs text-gray-500">Generate a draft landing page for each pillar â€” review &amp; publish each from the editor.</p>
            </div>
            <button onClick={buildPages} disabled={building}
              className="inline-flex items-center gap-2 border border-purple-300 bg-purple-50 text-purple-700 hover:bg-purple-100 px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
              {building ? <RefreshCw size={16} className="animate-spin" /> : <LayoutTemplate size={16} />}
              {building ? 'Buildingâ€¦' : 'Build pillar pages'}
            </button>
          </div>
          {scaffold && scaffold.results.length > 0 && (
            <ul className="mt-3 space-y-1.5">
              {scaffold.results.map((r) => (
                <li key={r.slug} className="text-xs flex items-center gap-2">
                  <span className={`px-1.5 py-0.5 rounded ${r.status === 'created' ? 'bg-green-100 text-green-700' : r.status === 'skipped' ? 'bg-gray-100 text-gray-500' : 'bg-red-100 text-red-700'}`}>{r.status}</span>
                  <span className="text-gray-700">{r.pillar}</span>
                  {r.status === 'created' && (
                    <>
                      <a href={r.editUrl} className="text-purple-600 underline">edit</a>
                      <a href={r.previewUrl} target="_blank" rel="noreferrer" className="text-purple-600 underline">preview</a>
                    </>
                  )}
                  {r.status === 'error' && <span className="text-red-500">{r.error}</span>}
                </li>
              ))}
            </ul>
          )}
          <p className="text-[11px] text-gray-400 mt-2">Pages are created as drafts at <code>/lp/&lt;slug&gt;</code>. Serving them at their pillar paths is the next step.</p>
        </div>
      )}
    </div>
  );
};

export default AuthorityMapPanel;
