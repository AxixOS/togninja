import React, { useState, useEffect } from 'react';
import AdminLayout from '../../../components/admin/AdminLayout';
import { BarChart3, Save, AlertCircle, CheckCircle } from 'lucide-react';

/**
 * Analytics IDs (Google Analytics 4 + Meta Pixel). Stored on studio_configs via the
 * shared POST /api/setup/technical/extras endpoint; read back from GET /current.
 */
interface AnalyticsState { ga4MeasurementId: string; metaPixelId: string; }

const AnalyticsSettingsPage: React.FC = () => {
  const [s, setS] = useState<AnalyticsState>({ ga4MeasurementId: '', metaPixelId: '' });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/setup/technical/current');
        if (res.ok) {
          const ex = (await res.json()).extras || {};
          setS({ ga4MeasurementId: ex.ga4MeasurementId || '', metaPixelId: ex.metaPixelId || '' });
        }
      } catch { /* keep defaults */ } finally { setIsLoading(false); }
    })();
  }, []);

  const handleSave = async () => {
    setIsSaving(true); setMessage(null);
    try {
      const res = await fetch('/api/setup/technical/extras', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ga4MeasurementId: s.ga4MeasurementId, metaPixelId: s.metaPixelId }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Save failed');
      setMessage({ type: 'success', text: 'Analytics settings saved.' });
    } catch (e: any) {
      setMessage({ type: 'error', text: e?.message || 'Could not save analytics settings.' });
    } finally { setIsSaving(false); }
  };

  const field = 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500';
  if (isLoading) return <AdminLayout><div className="flex items-center justify-center min-h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" /></div></AdminLayout>;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2"><BarChart3 size={22} className="text-purple-600" /> Analytics</h1>
            <p className="text-gray-600">Track visitors on your public website with Google Analytics and Meta Pixel.</p>
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
            <label className="block text-sm font-medium text-gray-700 mb-2">Google Analytics 4 Measurement ID</label>
            <input type="text" value={s.ga4MeasurementId} onChange={e => setS(p => ({ ...p, ga4MeasurementId: e.target.value }))} className={field} placeholder="G-XXXXXXXXXX" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Meta (Facebook) Pixel ID</label>
            <input type="text" value={s.metaPixelId} onChange={e => setS(p => ({ ...p, metaPixelId: e.target.value }))} className={field} placeholder="1234567890" />
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-2xl text-sm text-blue-800">
          Both are optional. Leave a field blank to disable that tracker. IDs apply to your public website only.
        </div>
      </div>
    </AdminLayout>
  );
};

export default AnalyticsSettingsPage;
