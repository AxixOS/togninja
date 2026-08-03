import React, { useState, useEffect } from 'react';
import AdminLayout from '../../../components/admin/AdminLayout';
import { HardDrive, Save, AlertCircle, CheckCircle, FlaskConical } from 'lucide-react';

/**
 * Storage (Backblaze B2 / S3-compatible) settings.
 * Reads GET /api/setup/technical/current (storage block) and saves to
 * POST /api/setup/technical/storage — the same endpoints the setup wizard's
 * Storage step uses, so onboarding config is editable here after the fact.
 */
interface StorageState {
  provider: string;
  accessKeyId: string;
  secretKey: string;      // blank unless changing
  secretKeySet: boolean;  // whether a secret is already stored
  bucket: string;
  endpoint: string;
  region: string;
}

const StorageSettingsPage: React.FC = () => {
  const [s, setS] = useState<StorageState>({
    provider: 'backblaze', accessKeyId: '', secretKey: '', secretKeySet: false,
    bucket: '', endpoint: '', region: '',
  });
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
          const st = data.storage || {};
          setS(prev => ({
            ...prev,
            provider: st.provider || 'backblaze',
            accessKeyId: st.accessKeyId || '',
            secretKeySet: !!st.secretKeySet,
            bucket: st.bucket || '',
            endpoint: st.endpoint || '',
            region: st.region || '',
          }));
        }
      } catch { /* keep defaults */ } finally { setIsLoading(false); }
    })();
  }, []);

  const payload = () => {
    const p: any = {
      provider: s.provider,
      accessKeyId: s.accessKeyId,
      bucket: s.bucket,
      endpoint: s.endpoint,
      region: s.region,
    };
    if (s.secretKey) p.secretKey = s.secretKey; // only send if changing
    return p;
  };

  const handleSave = async () => {
    setIsSaving(true); setMessage(null);
    try {
      const res = await fetch('/api/setup/technical/storage', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload()),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Save failed');
      setMessage({ type: 'success', text: 'Storage settings saved. Uploads will use these credentials.' });
      if (s.secretKey) setS(prev => ({ ...prev, secretKey: '', secretKeySet: true }));
    } catch (e: any) {
      setMessage({ type: 'error', text: e?.message || 'Could not save storage settings.' });
    } finally { setIsSaving(false); }
  };

  const handleTest = async () => {
    setIsTesting(true); setMessage(null);
    try {
      const res = await fetch('/api/setup/technical/test/storage', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessKeyId: s.accessKeyId, secretKey: s.secretKey, bucket: s.bucket, endpoint: s.endpoint, region: s.region }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success !== false) {
        setMessage({ type: 'success', text: 'Connection OK — the bucket is reachable with these credentials.' });
      } else {
        throw new Error(data.error || 'Storage test failed.');
      }
    } catch (e: any) {
      setMessage({ type: 'error', text: `${e?.message || 'Storage test failed.'} (Tip: enter the secret key to test; a saved secret is not re-sent.)` });
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
            <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2"><HardDrive size={22} className="text-purple-600" /> Cloud Storage</h1>
            <p className="text-gray-600">Backblaze B2 / S3-compatible credentials used for all uploads (galleries, vouchers, files).</p>
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
            <label className="block text-sm font-medium text-gray-700 mb-2">Provider</label>
            <select value={s.provider} onChange={e => setS(p => ({ ...p, provider: e.target.value }))} className={field}>
              <option value="backblaze">Backblaze B2</option>
              <option value="s3">Amazon S3</option>
              <option value="r2">Cloudflare R2</option>
              <option value="custom">Custom (S3-compatible)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Access Key ID <span className="text-gray-400">(Backblaze: keyID)</span></label>
            <input type="text" value={s.accessKeyId} onChange={e => setS(p => ({ ...p, accessKeyId: e.target.value }))} className={field} placeholder="0031a…" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Secret Key <span className="text-gray-400">(Backblaze: applicationKey)</span></label>
            <input type="password" value={s.secretKey} onChange={e => setS(p => ({ ...p, secretKey: e.target.value }))} className={field} placeholder={s.secretKeySet ? '•••••••• (saved — leave blank to keep)' : 'Enter secret key'} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Bucket</label>
            <input type="text" value={s.bucket} onChange={e => setS(p => ({ ...p, bucket: e.target.value }))} className={field} placeholder="my-studio-bucket" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">S3 Endpoint</label>
            <input type="text" value={s.endpoint} onChange={e => setS(p => ({ ...p, endpoint: e.target.value }))} className={field} placeholder="https://s3.eu-central-003.backblazeb2.com" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Region</label>
            <input type="text" value={s.region} onChange={e => setS(p => ({ ...p, region: e.target.value }))} className={field} placeholder="eu-central-003" />
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-2xl text-sm text-blue-800">
          Uploads across galleries, vouchers, landing-page images and files use these credentials. Use <strong>Test Connection</strong> (with the secret filled in) before saving.
        </div>
      </div>
    </AdminLayout>
  );
};

export default StorageSettingsPage;
