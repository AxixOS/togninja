import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Check, RefreshCw, Home, ExternalLink, AlertCircle } from 'lucide-react';
import { THEME_PRESETS } from '../../../../shared/themePresets';

/**
 * Themes tab — pick a token style preset (applied live to the studio's public landing
 * pages) and build a branded homepage from the onboarding data, set as "/". This is what
 * gives a new studio its OWN site instead of the built-in New Age page.
 */
const ThemesPanel: React.FC = () => {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<string>('aurora');
  const [saving, setSaving] = useState(false);
  const [building, setBuilding] = useState(false);
  const [built, setBuilt] = useState<{ slug: string } | null>(null);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetch('/api/studio-config').then((r) => r.json()).then((d) => setSelected(d?.siteTheme?.id || 'aurora')).catch(() => {});
  }, []);

  const pick = async (id: string) => {
    setSelected(id); setSaving(true); setMsg(null);
    try {
      const r = await fetch('/api/admin/site-theme', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ preset: id }) });
      if (!r.ok) throw new Error('save failed');
      queryClient.invalidateQueries({ queryKey: ['site-theme'] });
      setMsg({ type: 'success', text: 'Theme applied to your public pages.' });
    } catch { setMsg({ type: 'error', text: 'Could not save the theme.' }); }
    finally { setSaving(false); }
  };

  const build = async () => {
    setBuilding(true); setMsg(null); setBuilt(null);
    try {
      const r = await fetch('/api/admin/homepage/starter', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ preset: selected }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Build failed');
      setBuilt(d);
      setMsg({ type: 'success', text: 'Your homepage is built and now live at your site root (/).' });
    } catch (e: any) { setMsg({ type: 'error', text: e?.message || 'Build failed' }); }
    finally { setBuilding(false); }
  };

  return (
    <div className="max-w-3xl">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Style &amp; homepage</h2>
        <p className="text-gray-600 text-sm">Pick a style, then build a homepage from your studio details. It becomes your public homepage — branded to you, not a template.</p>
      </div>

      {msg && (
        <div className={`rounded-lg p-3 mb-4 flex items-center text-sm ${msg.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
          {msg.type === 'success' ? <Check size={16} className="mr-2" /> : <AlertCircle size={16} className="mr-2" />}
          {msg.text}
        </div>
      )}

      {/* Preset cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {THEME_PRESETS.map((t) => {
          const on = selected === t.id;
          return (
            <button
              key={t.id}
              onClick={() => pick(t.id)}
              disabled={saving}
              className={`text-left rounded-xl border p-3 transition-all ${on ? 'border-purple-500 ring-2 ring-purple-200' : 'border-gray-200 hover:border-gray-300'}`}
            >
              <div className="flex items-center gap-1.5 mb-2">
                <span className="h-6 w-6 rounded-full border border-black/5" style={{ background: t.colors.primary }} />
                <span className="h-6 w-6 rounded-full border border-black/5" style={{ background: t.colors.accent }} />
                <span className="h-6 w-6 rounded-full border border-black/5" style={{ background: t.colors.surface }} />
                {on && <Check size={16} className="text-purple-600 ml-auto" />}
              </div>
              <div className="font-semibold text-sm text-gray-900" style={{ fontFamily: t.fonts.heading }}>{t.name}</div>
              <div className="text-xs text-gray-500 mt-0.5">{t.description}</div>
            </button>
          );
        })}
      </div>

      {/* Build homepage */}
      <div className="mt-6 border-t border-gray-100 pt-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="text-sm font-semibold text-gray-900 flex items-center gap-1.5"><Home size={15} /> Your homepage</p>
            <p className="text-xs text-gray-500">Builds a homepage from your business name, services and details, in the selected style, and sets it as your public homepage.</p>
          </div>
          <button onClick={build} disabled={building} className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
            {building ? <RefreshCw size={16} className="animate-spin" /> : <Home size={16} />}
            {building ? 'Building…' : 'Build my homepage'}
          </button>
        </div>
        {built && (
          <a href="/" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 mt-3 text-sm text-purple-600 hover:text-purple-800">
            <ExternalLink size={14} /> View your homepage
          </a>
        )}
      </div>
    </div>
  );
};

export default ThemesPanel;
