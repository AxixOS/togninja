import React, { useState, useEffect } from 'react';
import AdminLayout from '../../../components/admin/AdminLayout';
import { Calculator, Save, AlertCircle, CheckCircle, ExternalLink } from 'lucide-react';

/**
 * Homepage price calculator (PricingEmbed.com). The studio pastes their own embed URL
 * and the homepage renders their calculator instead of the built-in default.
 * Stored on studio_configs via POST /api/setup/technical/extras; read from /current.
 */
const CalculatorSettingsPage: React.FC = () => {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/setup/technical/current');
        if (res.ok) setUrl((await res.json()).extras?.pricingEmbedUrl || '');
      } catch { /* keep default */ } finally { setIsLoading(false); }
    })();
  }, []);

  const handleSave = async () => {
    setIsSaving(true); setMessage(null);
    try {
      // Accept either a bare embed URL or a full <iframe ... src="..."> snippet.
      let value = url.trim();
      const m = value.match(/src=["']([^"']+)["']/i);
      if (m) value = m[1];
      const res = await fetch('/api/setup/technical/extras', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pricingEmbedUrl: value }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Save failed');
      setUrl(value);
      setMessage({ type: 'success', text: 'Calculator saved. Refresh your homepage to see it.' });
    } catch (e: any) {
      setMessage({ type: 'error', text: e?.message || 'Could not save the calculator.' });
    } finally { setIsSaving(false); }
  };

  const field = 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500';
  if (isLoading) return <AdminLayout><div className="flex items-center justify-center min-h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" /></div></AdminLayout>;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2"><Calculator size={22} className="text-purple-600" /> Price Calculator</h1>
            <p className="text-gray-600">The interactive price calculator shown on your homepage, powered by PricingEmbed.</p>
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
          <p className="font-medium">How to get your calculator:</p>
          <ol className="list-decimal ml-5 space-y-1">
            <li>Create a free account at <a href="https://pricingembed.com" target="_blank" rel="noreferrer" className="underline inline-flex items-center gap-1">PricingEmbed.com <ExternalLink size={12} /></a> and build your photography price calculator.</li>
            <li>Copy the <strong>embed URL</strong> (or the full <span className="font-mono">&lt;iframe&gt;</span> code) from PricingEmbed.</li>
            <li>Paste it below and Save — your homepage calculator updates automatically.</li>
          </ol>
        </div>

        <div className="bg-white rounded-lg shadow p-6 space-y-4 max-w-2xl">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">PricingEmbed embed URL (or &lt;iframe&gt; code)</label>
            <input type="text" value={url} onChange={e => setUrl(e.target.value)} className={field} placeholder="https://pricingembed.com/embed/embed_ai_…" />
            <p className="text-xs text-gray-500 mt-1">Paste the URL or the full iframe snippet — we'll extract the src. Leave blank to use the default calculator.</p>
          </div>
          {url && /^https?:\/\//i.test(url) && (
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-3 py-2 text-xs text-gray-500">Preview</div>
              <iframe src={url} title="Calculator preview" className="w-full h-[420px] bg-white" />
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default CalculatorSettingsPage;
