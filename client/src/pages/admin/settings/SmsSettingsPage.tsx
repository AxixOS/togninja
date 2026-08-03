import React, { useState, useEffect } from 'react';
import AdminLayout from '../../../components/admin/AdminLayout';
import { MessageSquare, Save, AlertCircle, CheckCircle } from 'lucide-react';

/**
 * SMS settings (Twilio / Vonage / MessageBird).
 * Reads GET /api/setup/technical/current (extras block) and saves the SMS
 * fields to POST /api/setup/technical/extras (the wizard's ExtrasStep endpoint,
 * which writes only the fields provided). No test endpoint exists server-side.
 */
interface SmsState {
  smsProvider: string;
  smsAccountSid: string;
  smsAuthToken: string;      // blank unless changing
  smsAuthTokenSet: boolean;
  smsFromNumber: string;
}

const SmsSettingsPage: React.FC = () => {
  const [s, setS] = useState<SmsState>({ smsProvider: '', smsAccountSid: '', smsAuthToken: '', smsAuthTokenSet: false, smsFromNumber: '' });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/setup/technical/current');
        if (res.ok) {
          const data = await res.json();
          const ex = data.extras || {};
          setS(prev => ({
            ...prev,
            smsProvider: ex.smsProvider || '',
            smsAccountSid: ex.smsAccountSid || '',
            smsAuthTokenSet: !!ex.smsAuthTokenSet,
            smsFromNumber: ex.smsFromNumber || '',
          }));
        }
      } catch { /* keep defaults */ } finally { setIsLoading(false); }
    })();
  }, []);

  const handleSave = async () => {
    setIsSaving(true); setMessage(null);
    try {
      const body: any = {
        smsProvider: s.smsProvider,
        smsAccountSid: s.smsAccountSid,
        smsFromNumber: s.smsFromNumber,
      };
      if (s.smsAuthToken) body.smsAuthToken = s.smsAuthToken; // only if changing
      const res = await fetch('/api/setup/technical/extras', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Save failed');
      setMessage({ type: 'success', text: 'SMS settings saved.' });
      if (s.smsAuthToken) setS(prev => ({ ...prev, smsAuthToken: '', smsAuthTokenSet: true }));
    } catch (e: any) {
      setMessage({ type: 'error', text: e?.message || 'Could not save SMS settings.' });
    } finally { setIsSaving(false); }
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
            <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2"><MessageSquare size={22} className="text-purple-600" /> SMS</h1>
            <p className="text-gray-600">Text-message provider for booking reminders and notifications.</p>
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

        <div className="bg-white rounded-lg shadow p-6 space-y-4 max-w-2xl">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Provider</label>
            <select value={s.smsProvider} onChange={e => setS(p => ({ ...p, smsProvider: e.target.value }))} className={field}>
              <option value="">— Not configured —</option>
              <option value="twilio">Twilio</option>
              <option value="vonage">Vonage</option>
              <option value="messagebird">MessageBird</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Account SID / API Key</label>
            <input type="text" value={s.smsAccountSid} onChange={e => setS(p => ({ ...p, smsAccountSid: e.target.value }))} className={field} placeholder="AC…" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Auth Token / API Secret</label>
            <input type="password" value={s.smsAuthToken} onChange={e => setS(p => ({ ...p, smsAuthToken: e.target.value }))} className={field} placeholder={s.smsAuthTokenSet ? '•••••••• (saved — leave blank to keep)' : 'Enter auth token'} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">From Number</label>
            <input type="text" value={s.smsFromNumber} onChange={e => setS(p => ({ ...p, smsFromNumber: e.target.value }))} className={field} placeholder="+43…" />
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-2xl text-sm text-blue-800">
          SMS is optional. WhatsApp requires an approved Business sender; SMS is the recommended first channel. Leave the provider empty to disable SMS.
        </div>
      </div>
    </AdminLayout>
  );
};

export default SmsSettingsPage;
