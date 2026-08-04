import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Sparkles, Save, Check, AlertCircle, Network, ArrowRight, RefreshCw } from 'lucide-react';
import { useAuthorityMap } from '../../hooks/useAuthorityMap';
import type { AuthorityMap } from '../../../../shared/authorityMap';

/**
 * Authority Map panel — generate a per-studio topical-cluster + internal-link structure
 * from the studio's niche, review it, and save it. Once saved, the SSR blog uplinks and
 * (guarded) SEO components render from it. Lives in the Website Studio "Analyse" tab.
 */
const LANGS = ['English', 'German', 'French', 'Spanish'];

const AuthorityMapPanel: React.FC = () => {
  const { map: current, isCustom, loading } = useAuthorityMap();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({ businessName: '', niche: '', services: '', city: '', language: 'English' });
  const [draft, setDraft] = useState<AuthorityMap | null>(null);
  const [busy, setBusy] = useState<'generate' | 'save' | null>(null);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const generate = async () => {
    if (!form.niche.trim() && !form.services.trim()) {
      setMsg({ type: 'error', text: 'Tell us your niche or services first.' });
      return;
    }
    setBusy('generate'); setMsg(null);
    try {
      const r = await fetch('/api/authority-map/generate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify(form),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Generation failed');
      setDraft(d.map);
      setMsg({ type: 'success', text: `Generated ${d.map.pillars?.length || 0} pillar pages — review below, then Save.` });
    } catch (e: any) { setMsg({ type: 'error', text: e?.message || 'Generation failed' }); }
    finally { setBusy(null); }
  };

  const save = async () => {
    if (!draft) return;
    setBusy('save'); setMsg(null);
    try {
      const r = await fetch('/api/authority-map', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify(draft),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Save failed');
      await queryClient.invalidateQueries({ queryKey: ['/api/authority-map'] });
      setDraft(null);
      setMsg({ type: 'success', text: 'Saved — your site now uses this authority structure.' });
    } catch (e: any) { setMsg({ type: 'error', text: e?.message || 'Save failed' }); }
    finally { setBusy(null); }
  };

  const shown = draft || current;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
      <div className="flex items-start gap-3 mb-4">
        <div className="rounded-lg bg-purple-100 p-2"><Network size={20} className="text-purple-700" /></div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Authority Map</h2>
          <p className="text-gray-600 text-sm">
            Your topical clusters + internal-link structure — the pillar pages and the supporting
            articles that link to them. This is what builds topical authority in search.
          </p>
          {!loading && (
            <p className="text-xs mt-1">
              {isCustom
                ? <span className="text-green-700 font-medium">✓ Using your studio's map — {current.pillars.length} pillar pages.</span>
                : <span className="text-gray-500">Currently using the default starter map ({current.pillars.length} pillars). Generate your own below.</span>}
            </p>
          )}
        </div>
      </div>

      {msg && (
        <div className={`rounded-lg p-3 mb-4 flex items-center text-sm ${msg.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
          {msg.type === 'success' ? <Check size={16} className="mr-2" /> : <AlertCircle size={16} className="mr-2" />}
          {msg.text}
        </div>
      )}

      {/* Generator form */}
      <div className="grid sm:grid-cols-2 gap-3 mb-3">
        <input value={form.businessName} onChange={(e) => set('businessName', e.target.value)} placeholder="Business name (optional)"
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent" />
        <input value={form.city} onChange={(e) => set('city', e.target.value)} placeholder="City / service area"
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent" />
        <input value={form.niche} onChange={(e) => set('niche', e.target.value)} placeholder="Niche (e.g. wedding photography)"
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent" />
        <select value={form.language} onChange={(e) => set('language', e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent">
          {LANGS.map((l) => <option key={l} value={l}>{l}</option>)}
        </select>
      </div>
      <textarea value={form.services} onChange={(e) => set('services', e.target.value)} rows={2}
        placeholder="Services offered (comma-separated), e.g. family shoots, newborn, maternity, business headshots"
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mb-3 focus:ring-2 focus:ring-purple-500 focus:border-transparent" />

      <div className="flex gap-3">
        <button onClick={generate} disabled={busy !== null}
          className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
          {busy === 'generate' ? <RefreshCw size={16} className="animate-spin" /> : <Sparkles size={16} />}
          {busy === 'generate' ? 'Generating…' : (isCustom ? 'Regenerate' : 'Generate my authority map')}
        </button>
        {draft && (
          <button onClick={save} disabled={busy !== null}
            className="inline-flex items-center gap-2 border border-green-300 bg-green-50 text-green-700 hover:bg-green-100 px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
            {busy === 'save' ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
            Save this map
          </button>
        )}
      </div>

      {/* Review / current structure */}
      <div className="mt-5 border-t border-gray-100 pt-5">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
          {draft ? 'Draft — review before saving' : 'Current structure'}
        </p>
        <div className="grid md:grid-cols-2 gap-3">
          {shown.pillars.map((p) => (
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
                <p className="text-[11px] text-gray-400 mt-2">Links to: {p.siblings.map((s) => s.label).join(' · ')}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AuthorityMapPanel;
