import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '../../../components/admin/AdminLayout';
import { Link2, Save, AlertCircle, CheckCircle, Server } from 'lucide-react';

/**
 * Site URLs (website / admin / public). Reads GET /api/setup/technical/current
 * (domain block) and saves to POST /api/setup/technical/domain. These are the URLs
 * used in emails, links and CORS — NOT DNS. To point a real domain at this service,
 * see the Custom Domain page.
 */
interface DomainState { frontendUrl: string; appUrl: string; publicSiteBaseUrl: string; }

const norm = (v: string) => {
  const s = (v || '').trim();
  if (!s) return '';
  return (/^https?:\/\//i.test(s) ? s : `https://${s}`).replace(/\/+$/, '');
};

const DomainSettingsPage: React.FC = () => {
  const [s, setS] = useState<DomainState>({ frontendUrl: '', appUrl: '', publicSiteBaseUrl: '' });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/setup/technical/current');
        if (res.ok) {
          const d = (await res.json()).domain || {};
          setS({ frontendUrl: d.frontendUrl || '', appUrl: d.appUrl || '', publicSiteBaseUrl: d.publicSiteBaseUrl || '' });
        }
      } catch { /* keep defaults */ } finally { setIsLoading(false); }
    })();
  }, []);

  const handleSave = async () => {
    setIsSaving(true); setMessage(null);
    try {
      const frontendUrl = norm(s.frontendUrl);
      const appUrl = norm(s.appUrl) || frontendUrl;
      const publicSiteBaseUrl = norm(s.publicSiteBaseUrl) || frontendUrl;
      if (!frontendUrl) throw new Error('Website address is required');
      const res = await fetch('/api/setup/technical/domain', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appUrl, frontendUrl, publicSiteBaseUrl }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Save failed');
      setMessage({ type: 'success', text: 'Domain settings saved.' });
      setS({ frontendUrl, appUrl, publicSiteBaseUrl });
    } catch (e: any) {
      setMessage({ type: 'error', text: e?.message || 'Could not save domain settings.' });
    } finally { setIsSaving(false); }
  };

  const field = 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500';
  if (isLoading) return <AdminLayout><div className="flex items-center justify-center min-h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" /></div></AdminLayout>;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2"><Link2 size={22} className="text-purple-600" /> Domain &amp; URLs</h1>
            <p className="text-gray-600">The addresses used in your emails, links and login — change any time.</p>
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
            <label className="block text-sm font-medium text-gray-700 mb-2">Website address <span className="text-red-500">*</span></label>
            <input type="text" value={s.frontendUrl} onChange={e => setS(p => ({ ...p, frontendUrl: e.target.value }))} className={field} placeholder="www.yourstudio.com" />
            <p className="text-xs text-gray-500 mt-1">The address customers use. We add https:// for you. Used for admin login and email links too unless overridden below.</p>
          </div>
          <details className="pt-1">
            <summary className="text-sm text-gray-600 cursor-pointer">Advanced — different admin / public addresses</summary>
            <div className="mt-3 space-y-3 border-l-2 border-gray-200 pl-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Admin login address</label>
                <input type="text" value={s.appUrl} onChange={e => setS(p => ({ ...p, appUrl: e.target.value }))} className={field} placeholder="Leave blank to use website address" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Public website address</label>
                <input type="text" value={s.publicSiteBaseUrl} onChange={e => setS(p => ({ ...p, publicSiteBaseUrl: e.target.value }))} className={field} placeholder="Leave blank to use website address" />
              </div>
            </div>
          </details>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-2xl text-sm text-blue-800 flex items-start gap-2">
          <Server size={18} className="mt-0.5 flex-shrink-0" />
          <span>These are display URLs only — they don't change DNS. To connect your own domain to this service, see <Link to="/admin/settings/custom-domain" className="underline font-medium">Custom Domain</Link>.</span>
        </div>
      </div>
    </AdminLayout>
  );
};

export default DomainSettingsPage;
