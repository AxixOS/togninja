import React, { useState, useEffect } from 'react';
import AdminLayout from '../../../components/admin/AdminLayout';
import { Camera, Copy, Check, RefreshCw, AlertCircle, CheckCircle, KeyRound, Trash2 } from 'lucide-react';

/**
 * Self-serve ShootCleaner connection. The studio generates an API key here and pastes
 * it + their instance URL into ShootCleaner. Backed by:
 *   GET  /api/admin/integrations/shootcleaner            status + instance URL
 *   POST /api/admin/integrations/shootcleaner/rotate     new key (returned once)
 *   POST /api/admin/integrations/shootcleaner/revoke     disconnect
 */
const ShootCleanerSettingsPage: React.FC = () => {
  const [status, setStatus] = useState<any>(null);
  const [fullKey, setFullKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const load = async () => {
    try { const r = await fetch('/api/admin/integrations/shootcleaner'); if (r.ok) setStatus(await r.json()); }
    catch { /* ignore */ } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const rotate = async () => {
    if (status?.hasKey && !window.confirm('Generate a new key? The current key stops working immediately — ShootCleaner will need the new one.')) return;
    setBusy(true); setMsg(null);
    try {
      const r = await fetch('/api/admin/integrations/shootcleaner/rotate', { method: 'POST' });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Failed');
      setFullKey(d.apiKey);
      await load();
      setMsg({ type: 'success', text: "New key generated — copy it now, it won't be shown again." });
    } catch (e: any) { setMsg({ type: 'error', text: e?.message || 'Failed to generate key.' }); }
    finally { setBusy(false); }
  };
  const revoke = async () => {
    if (!window.confirm('Disconnect ShootCleaner? Its key will stop working.')) return;
    setBusy(true); setMsg(null);
    try {
      const r = await fetch('/api/admin/integrations/shootcleaner/revoke', { method: 'POST' });
      if (!r.ok) throw new Error('Failed');
      setFullKey(null); await load();
      setMsg({ type: 'success', text: 'ShootCleaner disconnected.' });
    } catch (e: any) { setMsg({ type: 'error', text: e?.message || 'Failed to disconnect.' }); }
    finally { setBusy(false); }
  };
  const copy = (text: string, id: string) => { navigator.clipboard?.writeText(text).then(() => { setCopied(id); setTimeout(() => setCopied(null), 1500); }); };

  const Field = ({ id, label, value, mono = true }: { id: string; label: string; value: string; mono?: boolean }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <div className="flex gap-2">
        <input readOnly value={value} className={`flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm ${mono ? 'font-mono' : ''} truncate`} />
        <button onClick={() => copy(value, id)} className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50" title="Copy">
          {copied === id ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
        </button>
      </div>
    </div>
  );

  if (loading) return <AdminLayout><div className="flex items-center justify-center min-h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" /></div></AdminLayout>;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2"><Camera size={22} className="text-purple-600" /> ShootCleaner</h1>
          <p className="text-gray-600">Connect ShootCleaner (culling, enhancement, case studies) to this studio.</p>
        </div>

        {msg && (
          <div className={`rounded-lg p-4 ${msg.type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            <div className="flex items-center">
              {msg.type === 'success' ? <CheckCircle size={20} className="text-green-600 mr-2" /> : <AlertCircle size={20} className="text-red-600 mr-2" />}
              <span className={`text-sm font-medium ${msg.type === 'success' ? 'text-green-800' : 'text-red-800'}`}>{msg.text}</span>
            </div>
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-2xl text-sm text-blue-800 space-y-2">
          <p className="font-medium">To connect, open ShootCleaner → Settings → Connect TogNinja and enter:</p>
          <ol className="list-decimal ml-5 space-y-1">
            <li>Your <strong>instance URL</strong> (below).</li>
            <li>An <strong>API key</strong> — generate one below and paste it in. ShootCleaner validates it instantly and shows this studio's name.</li>
          </ol>
        </div>

        <div className="bg-white rounded-lg shadow p-6 space-y-5 max-w-2xl">
          <Field id="url" label="Instance URL" value={status?.instanceUrl || ''} />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
            {fullKey ? (
              <>
                <div className="flex gap-2">
                  <input readOnly value={fullKey} className="flex-1 px-3 py-2 border border-emerald-300 rounded-lg bg-emerald-50 text-sm font-mono truncate" />
                  <button onClick={() => copy(fullKey, 'key')} className="px-3 py-2 border border-emerald-300 rounded-lg hover:bg-emerald-100" title="Copy">
                    {copied === 'key' ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
                  </button>
                </div>
                <p className="text-xs text-amber-700 mt-1">⚠ Copy this now — it won't be shown again. Paste it into ShootCleaner.</p>
              </>
            ) : (
              <p className="text-sm text-gray-500 py-2">
                {status?.hasKey
                  ? <>A key is active (<span className="font-mono">{status.keyMasked}</span>{status.source === 'env' ? ', from environment' : ''}). For security the full key is only shown once — regenerate to get a new one.</>
                  : 'No key yet — generate one to connect ShootCleaner.'}
              </p>
            )}
          </div>

          <div className="flex gap-3 pt-1">
            <button onClick={rotate} disabled={busy} className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center disabled:opacity-50">
              {busy ? <RefreshCw size={16} className="mr-2 animate-spin" /> : <KeyRound size={16} className="mr-2" />}
              {status?.hasKey ? 'Regenerate key' : 'Generate key'}
            </button>
            {status?.hasKey && status?.source === 'generated' && (
              <button onClick={revoke} disabled={busy} className="border border-red-200 text-red-600 hover:bg-red-50 px-4 py-2 rounded-lg flex items-center disabled:opacity-50">
                <Trash2 size={16} className="mr-2" /> Disconnect
              </button>
            )}
          </div>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 max-w-2xl text-sm text-gray-600">
          The key grants ShootCleaner access to this studio's clients, questionnaires, galleries, digital files, blog publishing and orders — scoped and revocable here at any time. It only reaches <em>this</em> studio's data.
        </div>
      </div>
    </AdminLayout>
  );
};

export default ShootCleanerSettingsPage;
