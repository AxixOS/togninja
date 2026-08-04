import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '../../../components/admin/AdminLayout';
import { Globe, Save, AlertCircle, CheckCircle, Calendar } from 'lucide-react';

/**
 * Google API credentials (the OAuth app used for Calendar sync). Reads/writes via
 * GET /api/setup/technical/current + POST /api/setup/technical/extras. Connecting a
 * specific Google account happens separately at /admin/calendar-sync (OAuth), which
 * needs these client credentials to exist first.
 */
interface GoogleState {
  googleClientId: string;
  googleClientSecret: string; googleClientSecretSet: boolean;
  googleCalendarId: string;
}

const GoogleSettingsPage: React.FC = () => {
  const [s, setS] = useState<GoogleState>({ googleClientId: '', googleClientSecret: '', googleClientSecretSet: false, googleCalendarId: '' });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/setup/technical/current');
        if (res.ok) {
          const ex = (await res.json()).extras || {};
          setS(prev => ({
            ...prev,
            googleClientId: ex.googleClientId || '',
            googleClientSecretSet: !!ex.googleClientSecretSet,
            googleCalendarId: ex.googleCalendarId || '',
          }));
        }
      } catch { /* keep defaults */ } finally { setIsLoading(false); }
    })();
  }, []);

  const handleSave = async () => {
    setIsSaving(true); setMessage(null);
    try {
      const body: any = { googleClientId: s.googleClientId, googleCalendarId: s.googleCalendarId };
      if (s.googleClientSecret) body.googleClientSecret = s.googleClientSecret;
      const res = await fetch('/api/setup/technical/extras', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Save failed');
      setMessage({ type: 'success', text: 'Google settings saved.' });
      setS(prev => ({ ...prev, googleClientSecret: '', googleClientSecretSet: prev.googleClientSecretSet || !!prev.googleClientSecret }));
    } catch (e: any) {
      setMessage({ type: 'error', text: e?.message || 'Could not save Google settings.' });
    } finally { setIsSaving(false); }
  };

  const field = 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500';
  if (isLoading) return <AdminLayout><div className="flex items-center justify-center min-h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" /></div></AdminLayout>;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2"><Globe size={22} className="text-purple-600" /> Google API</h1>
            <p className="text-gray-600">Google OAuth credentials used for Calendar sync.</p>
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
            <label className="block text-sm font-medium text-gray-700 mb-2">Google Client ID</label>
            <input type="text" value={s.googleClientId} onChange={e => setS(p => ({ ...p, googleClientId: e.target.value }))} className={field} placeholder="…apps.googleusercontent.com" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Google Client Secret</label>
            <input type="password" value={s.googleClientSecret} onChange={e => setS(p => ({ ...p, googleClientSecret: e.target.value }))} className={field} placeholder={s.googleClientSecretSet ? '•••••••• (saved — leave blank to keep)' : 'GOCSPX-…'} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Google Calendar ID <span className="text-gray-400">(optional)</span></label>
            <input type="text" value={s.googleCalendarId} onChange={e => setS(p => ({ ...p, googleCalendarId: e.target.value }))} className={field} placeholder="primary or you@gmail.com" />
            <p className="text-xs text-gray-500 mt-1">Usually left blank — the connected account's primary calendar is used automatically.</p>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-2xl text-sm text-blue-800 flex items-start gap-2">
          <Calendar size={18} className="mt-0.5 flex-shrink-0" />
          <span>After saving your credentials, connect your calendar on the <Link to="/admin/calendar-sync" className="underline font-medium">Google Calendar</Link> page. Publish your Google OAuth app to <strong>Production</strong> in the Google Cloud Console, otherwise the connection expires weekly.</span>
        </div>
      </div>
    </AdminLayout>
  );
};

export default GoogleSettingsPage;
