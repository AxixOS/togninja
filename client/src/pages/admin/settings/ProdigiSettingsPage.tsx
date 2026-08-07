import React, { useState, useEffect } from 'react';
import AdminLayout from '../../../components/admin/AdminLayout';
import { Printer, Save, AlertCircle, CheckCircle, FlaskConical } from 'lucide-react';

/**
 * Prodigi print-fulfilment settings. Each studio brings its OWN Prodigi API key
 * (from the Prodigi dashboard) and chooses sandbox vs production. Reads/saves via
 * GET/POST /api/setup/technical/current | /prodigi | /test/prodigi — the same
 * per-tenant integration plumbing every other credential uses. The key is stored
 * encrypted and never returned to the client (only an "is set" flag).
 */
interface ProdigiState {
  apiKey: string;        // blank unless changing
  apiKeySet: boolean;    // whether a key is already stored
  environment: string;   // sandbox | production
}

const ProdigiSettingsPage: React.FC = () => {
  const [s, setS] = useState<ProdigiState>({ apiKey: '', apiKeySet: false, environment: 'sandbox' });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/setup/technical/current');
        if (res.ok) {
          const data = await res.json();
          const p = data.prodigi || {};
          setS(prev => ({ ...prev, apiKeySet: !!p.apiKeySet, environment: p.environment || 'sandbox' }));
        }
      } catch { /* keep defaults */ } finally { setIsLoading(false); }
    })();
  }, []);

  const handleSave = async () => {
    setIsSaving(true); setMessage(null);
    try {
      const body: any = { environment: s.environment };
      if (s.apiKey) body.apiKey = s.apiKey; // only send if changing
      const res = await fetch('/api/setup/technical/prodigi', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Save failed');
      setMessage({ type: 'success', text: 'Prodigi settings saved. Print ordering will use this key.' });
      if (s.apiKey) setS(prev => ({ ...prev, apiKey: '', apiKeySet: true }));
    } catch (e: any) {
      setMessage({ type: 'error', text: e?.message || 'Could not save Prodigi settings.' });
    } finally { setIsSaving(false); }
  };

  const handleTest = async () => {
    setIsTesting(true); setMessage(null);
    try {
      const body: any = { environment: s.environment };
      if (s.apiKey) body.apiKey = s.apiKey; // test the typed key if present, else the saved one
      const res = await fetch('/api/setup/technical/test/prodigi', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success !== false) {
        setMessage({ type: 'success', text: data.message || 'Prodigi key verified.' });
      } else {
        throw new Error(data.error || 'Prodigi test failed.');
      }
    } catch (e: any) {
      setMessage({ type: 'error', text: `${e?.message || 'Prodigi test failed.'} (Tip: enter the key to test; a saved key is not re-sent.)` });
    } finally { setIsTesting(false); }
  };

  const field = 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500';

  if (isLoading) {
    return <AdminLayout><div className="flex items-center justify-center min-h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" /></div></AdminLayout>;
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2"><Printer size={22} className="text-purple-600" /> Print Fulfilment (Prodigi)</h1>
            <p className="text-gray-600">Connect your own Prodigi account to sell + fulfil prints. Orders are placed on your Prodigi account.</p>
          </div>
          <div className="flex items-center space-x-3">
            <button onClick={handleTest} disabled={isTesting} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center disabled:opacity-50">
              <FlaskConical size={16} className="mr-2" /> {isTesting ? 'Testing…' : 'Test Connection'}
            </button>
            <button onClick={handleSave} disabled={isSaving} className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center disabled:opacity-50">
              <Save size={16} className="mr-2" /> {isSaving ? 'Saving…' : 'Save Settings'}
            </button>
          </div>
        </div>

        {message && (
          <div className={`rounded-lg p-4 ${message.type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            <div className="flex items-center">
              {message.type === 'success' ? <CheckCircle size={20} className="text-green-600 mr-2" /> : <AlertCircle size={20} className="text-red-600 mr-2" />}
              <span className={`text-sm font-medium ${message.type === 'success' ? 'text-green-800' : 'text-red-800'}`}>{message.text}</span>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow p-6 space-y-4 max-w-2xl">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Environment</label>
            <select value={s.environment} onChange={e => setS(p => ({ ...p, environment: e.target.value }))} className={field}>
              <option value="sandbox">Sandbox (testing — no real prints)</option>
              <option value="production">Production (live orders)</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">Use Sandbox with a Prodigi sandbox key while testing; switch to Production to place real orders.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Prodigi API Key</label>
            <input type="password" value={s.apiKey} onChange={e => setS(p => ({ ...p, apiKey: e.target.value }))} className={field} placeholder={s.apiKeySet ? '•••••••• (saved — leave blank to keep)' : 'Paste your Prodigi API key'} />
            <p className="text-xs text-gray-500 mt-1">Find this in your Prodigi dashboard under <em>Settings → API</em>. The key is stored encrypted.</p>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-2xl text-sm text-blue-800 space-y-1">
          <p><strong>How it works:</strong> once connected, add the Prodigi products you want to sell (by SKU) in your print catalogue, then place orders from an invoice — your client pays, and the order is sent to Prodigi automatically.</p>
          <p>Get product SKUs from the <a href="https://www.prodigi.com/print-products/" target="_blank" rel="noopener noreferrer" className="underline">Prodigi product catalogue</a> and API details from the <a href="https://www.prodigi.com/print-api/docs/reference/" target="_blank" rel="noopener noreferrer" className="underline">Prodigi API docs</a>.</p>
        </div>
      </div>
    </AdminLayout>
  );
};

export default ProdigiSettingsPage;
