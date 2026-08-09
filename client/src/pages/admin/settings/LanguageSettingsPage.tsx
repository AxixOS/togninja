import React, { useState, useEffect } from 'react';
import AdminLayout from '../../../components/admin/AdminLayout';
import { Languages, Save, AlertCircle, CheckCircle, Sparkles, Loader2 } from 'lucide-react';
import { enTranslations } from '../../../context/LanguageContext';

/**
 * Language settings. Choose which languages the studio offers and the default, and
 * AI-generate the French/Spanish translations (English + German are built in).
 *   GET/POST /api/i18n/settings         default + enabled languages
 *   POST     /api/admin/i18n/generate   translate the English strings into a language
 */
const ALL = [
  { code: 'en', name: 'English', flag: '🇬🇧', builtin: true },
  { code: 'de', name: 'Deutsch (German)', flag: '🇩🇪', builtin: true },
  { code: 'fr', name: 'Français (French)', flag: '🇫🇷', builtin: false },
  { code: 'es', name: 'Español (Spanish)', flag: '🇪🇸', builtin: false },
];

const LanguageSettingsPage: React.FC = () => {
  const [enabled, setEnabled] = useState<string[]>(['en', 'de']);
  const [def, setDef] = useState('de');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [genLang, setGenLang] = useState<string | null>(null);
  const [genStatus, setGenStatus] = useState<Record<string, string>>({});

  // The language the PUBLIC SITE is written in — a different thing from the interface
  // languages below, and stored separately (studio_configs.site_language, not
  // i18n_settings). It was chosen in the onboarding wizard and, until now, could not be
  // changed anywhere afterwards.
  const [siteLanguage, setSiteLanguage] = useState('');
  const [savingSite, setSavingSite] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/i18n/settings');
        if (res.ok) {
          const d = await res.json();
          if (Array.isArray(d.enabledLanguages) && d.enabledLanguages.length) setEnabled(d.enabledLanguages);
          if (d.defaultLanguage) setDef(d.defaultLanguage);
        }
      } catch { /* keep defaults */ }
      try {
        const b = await fetch('/api/studio/branding');
        if (b.ok) setSiteLanguage((await b.json())?.siteLanguage || '');
      } catch { /* leave unset — the control shows "not chosen" */ }
      setLoading(false);
    })();
  }, []);

  const saveSiteLanguage = async (code: string) => {
    setSavingSite(true); setMsg(null);
    try {
      const res = await fetch('/api/studio/branding', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteLanguage: code }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Save failed');
      setSiteLanguage(code);
      setMsg({ type: 'success', text: 'Website language saved. Your public page addresses and which pages are switched on now follow it.' });
    } catch (e: any) {
      setMsg({ type: 'error', text: e?.message || 'Could not save the website language.' });
    } finally { setSavingSite(false); }
  };

  const toggle = (code: string) => {
    if (code === 'en') return; // English is the fallback — always on
    setEnabled(prev => prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]);
  };

  const save = async () => {
    setSaving(true); setMsg(null);
    try {
      const ordered = ALL.map(l => l.code).filter(c => enabled.includes(c));
      const nextDef = ordered.includes(def) ? def : ordered[0];
      const res = await fetch('/api/i18n/settings', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ defaultLanguage: nextDef, enabledLanguages: ordered }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Save failed');
      const d = await res.json();
      setEnabled(d.enabledLanguages); setDef(d.defaultLanguage);
      setMsg({ type: 'success', text: 'Language settings saved.' });
    } catch (e: any) {
      setMsg({ type: 'error', text: e?.message || 'Could not save language settings.' });
    } finally { setSaving(false); }
  };

  const generate = async (lang: string) => {
    setGenLang(lang);
    setGenStatus(p => ({ ...p, [lang]: 'Translating with AI… this can take a minute.' }));
    try {
      const res = await fetch('/api/admin/i18n/generate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: lang, source: enTranslations }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || 'Generation failed');
      setGenStatus(p => ({ ...p, [lang]: `Done — translated ${d.translated} of ${d.total} strings. Switch language in the header to see it.` }));
    } catch (e: any) {
      setGenStatus(p => ({ ...p, [lang]: `Failed: ${e?.message || 'error'}` }));
    } finally { setGenLang(null); }
  };

  if (loading) return <AdminLayout><div className="flex items-center justify-center min-h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" /></div></AdminLayout>;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2"><Languages size={22} className="text-purple-600" /> Languages</h1>
            <p className="text-gray-600">Choose the languages your site offers and the default for new visitors.</p>
          </div>
          <button onClick={save} disabled={saving} className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center disabled:opacity-50">
            <Save size={16} className="mr-2" /> {saving ? 'Saving…' : 'Save Settings'}
          </button>
        </div>

        {msg && (
          <div className={`rounded-lg p-4 ${msg.type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            <div className="flex items-center">
              {msg.type === 'success' ? <CheckCircle size={20} className="text-green-600 mr-2" /> : <AlertCircle size={20} className="text-red-600 mr-2" />}
              <span className={`text-sm font-medium ${msg.type === 'success' ? 'text-green-800' : 'text-red-800'}`}>{msg.text}</span>
            </div>
          </div>
        )}

        {/* The website's OWN language. Chosen in the wizard; this is where it changes
            afterwards. Saved on its own because it has consequences the interface
            language list does not. */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 max-w-2xl space-y-3">
          <div>
            <h2 className="text-lg font-medium text-gray-900">Website language</h2>
            <p className="text-sm text-gray-600 mt-1">
              The language your public website is written in. It decides which set of pages is
              switched on, the language new copy is generated in, and the wording of your page
              addresses.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {ALL.map(l => (
              <button
                key={l.code}
                onClick={() => saveSiteLanguage(l.code)}
                disabled={savingSite}
                className={`px-4 py-2 rounded-lg border text-sm transition-colors disabled:opacity-50 ${
                  siteLanguage === l.code
                    ? 'border-purple-600 bg-purple-50 text-purple-800 font-medium'
                    : 'border-gray-300 hover:border-gray-400 text-gray-700'
                }`}
              >
                <span className="mr-2">{l.flag}</span>{l.name}
              </button>
            ))}
          </div>

          {siteLanguage ? (
            <p className="text-xs text-amber-700">
              Changing this changes your public page addresses (for example /contact becomes
              /kontakt). The old addresses redirect to the new ones, so existing links keep working.
            </p>
          ) : (
            <p className="text-xs text-gray-500">
              Not set — your site keeps its current page addresses. Choosing a language here will
              change them to match.
            </p>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-6 space-y-4 max-w-2xl">
          {ALL.map(l => {
            const on = enabled.includes(l.code);
            const needsGen = !l.builtin && on;
            return (
              <div key={l.code} className="flex items-start justify-between border-b last:border-0 pb-4 last:pb-0">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={on} disabled={l.code === 'en'} onChange={() => toggle(l.code)} className="rounded border-gray-300" />
                  <span className="text-sm text-gray-900">{l.flag} {l.name}{l.builtin && <span className="text-gray-400"> · built-in</span>}</span>
                </label>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 text-xs text-gray-500">
                    <input type="radio" name="defaultLang" checked={def === l.code} disabled={!on} onChange={() => setDef(l.code)} /> Default
                  </label>
                  {needsGen && (
                    <button onClick={() => generate(l.code)} disabled={genLang === l.code}
                      className="text-xs px-2.5 py-1.5 rounded-md border border-purple-200 text-purple-700 hover:bg-purple-50 flex items-center gap-1 disabled:opacity-50">
                      {genLang === l.code ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />} Generate with AI
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {Object.entries(genStatus).map(([lang, text]) => (
          <div key={lang} className="max-w-2xl text-sm rounded-lg p-3 bg-blue-50 border border-blue-200 text-blue-800">
            <strong>{(ALL.find(l => l.code === lang)?.name) || lang}:</strong> {text}
          </div>
        ))}

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-2xl text-sm text-blue-800">
          English and German are built in. French and Spanish are translated by AI (uses your OpenAI key from <strong>AI &amp; API Keys</strong>) and cached — click <em>Generate with AI</em> once per language. Any untranslated text falls back to English automatically, and you can re-run generation any time.
        </div>
      </div>
    </AdminLayout>
  );
};

export default LanguageSettingsPage;
