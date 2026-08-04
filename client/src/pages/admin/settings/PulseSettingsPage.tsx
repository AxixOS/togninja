import React, { useState, useEffect } from 'react';
import AdminLayout from '../../../components/admin/AdminLayout';
import { Share2, Save, AlertCircle, CheckCircle, ExternalLink } from 'lucide-react';

/**
 * Pulse (AxixOS Social) connection. Pulse schedules + publishes a blog post's Social
 * Pack to the studio's social channels ("Send to Pulse" in Blog). The studio signs up
 * at axixos-social.de, gets an API key, and pastes it here.
 * Saved via POST /api/setup/technical/extras (pulseApiKey/pulseMode); read from /current.
 */
const PulseSettingsPage: React.FC = () => {
  const [apiKey, setApiKey] = useState('');
  const [keySet, setKeySet] = useState(false);
  const [mode, setMode] = useState('draft');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/setup/technical/current');
        if (res.ok) {
          const ex = (await res.json()).extras || {};
          setKeySet(!!ex.pulseKeySet);
          setMode(ex.pulseMode || 'draft');
        }
      } catch { /* keep defaults */ } finally { setIsLoading(false); }
    })();
  }, []);

  const handleSave = async () => {
    setIsSaving(true); setMessage(null);
    try {
      const body: any = { pulseMode: mode };
      if (apiKey) body.pulseApiKey = apiKey;
      const res = await fetch('/api/setup/technical/extras', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Save failed');
      setMessage({ type: 'success', text: 'Pulse settings saved.' });
      setApiKey(''); setKeySet(keySet || !!apiKey);
    } catch (e: any) {
      setMessage({ type: 'error', text: e?.message || 'Could not save Pulse settings.' });
    } finally { setIsSaving(false); }
  };

  const field = 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500';
  if (isLoading) return <AdminLayout><div className="flex items-center justify-center min-h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" /></div></AdminLayout>;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2"><Share2 size={22} className="text-purple-600" /> Pulse — Social Posting</h1>
            <p className="text-gray-600">Auto-schedule your blog posts to social media with Pulse (AxixOS Social).</p>
          </div>
          <button onClick={handleSave} disabled={isSaving} className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center disabled:opacity-50">
            <Save size={16} className="mr-2" /> {isSaving ? 'Saving…' : 'Save Settings'}
          </button>
        </div>

        {message && (
          <div className={`rounded-lg p-4 ${message.type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            <div className="flex items-center">
              {message.type === 'success' ? <CheckCircle size={20} className="text-green-600 mr-2" /> : <AlertCircle size={20} className="text-red-600 mr-2" />}
              <span className={`text-sm font-medium ${message.type === 'success' ? 'text-green-800' : 'text-red-800'}`}>{message.text}</span>
            </div>
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-2xl text-sm text-blue-800 space-y-2">
          <p className="font-medium">Get started with Pulse:</p>
          <ol className="list-decimal ml-5 space-y-1">
            <li>Create your free account at <a href="https://axixos-social.de" target="_blank" rel="noreferrer" className="underline inline-flex items-center gap-1">AxixOS Social (Pulse) <ExternalLink size={12} /></a> and connect your social channels.</li>
            <li>Copy your <strong>API key</strong> from Pulse.</li>
            <li>Paste it below and Save. Then use <strong>“Send to Pulse”</strong> on any post in <strong>Blog</strong> to schedule it to your channels.</li>
          </ol>
        </div>

        <div className="bg-white rounded-lg shadow p-6 space-y-4 max-w-2xl">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Pulse API Key</label>
            <input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} className={field} placeholder={keySet ? '•••••••• (saved — leave blank to keep)' : 'Paste your Pulse API key'} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Posting mode</label>
            <select value={mode} onChange={e => setMode(e.target.value)} className={field}>
              <option value="draft">Draft — Pulse holds posts for your review before publishing</option>
              <option value="auto">Auto — Pulse schedules + publishes automatically</option>
            </select>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default PulseSettingsPage;
