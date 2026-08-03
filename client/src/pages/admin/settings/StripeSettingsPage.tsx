import React, { useState, useEffect } from 'react';
import AdminLayout from '../../../components/admin/AdminLayout';
import { CreditCard, Save, AlertCircle, CheckCircle, FlaskConical } from 'lucide-react';

/**
 * Stripe payment settings.
 * Reads GET /api/setup/technical/current (stripe block) and saves to
 * POST /api/setup/technical/stripe (the wizard's Stripe step endpoint).
 * Test via POST /api/setup/technical/test/stripe.
 */
interface StripeState {
  publishableKey: string;
  secretKey: string;      // blank unless changing
  secretKeySet: boolean;
  webhookSecret: string;  // blank unless changing
  webhookSecretSet: boolean;
}

const StripeSettingsPage: React.FC = () => {
  const [s, setS] = useState<StripeState>({ publishableKey: '', secretKey: '', secretKeySet: false, webhookSecret: '', webhookSecretSet: false });
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
          const st = data.stripe || {};
          setS(prev => ({
            ...prev,
            publishableKey: st.publishableKey || '',
            secretKeySet: !!st.secretKeySet,
            webhookSecretSet: !!st.webhookSecretSet,
          }));
        }
      } catch { /* keep defaults */ } finally { setIsLoading(false); }
    })();
  }, []);

  const handleSave = async () => {
    setIsSaving(true); setMessage(null);
    try {
      if (!s.publishableKey.startsWith('pk_')) throw new Error('Publishable key should start with "pk_".');
      const body: any = { publishableKey: s.publishableKey };
      if (s.secretKey) body.secretKey = s.secretKey;
      else if (!s.secretKeySet) throw new Error('Secret key is required.');
      if (s.webhookSecret) body.webhookSecret = s.webhookSecret;
      const res = await fetch('/api/setup/technical/stripe', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Save failed');
      setMessage({ type: 'success', text: 'Stripe settings saved.' });
      setS(prev => ({ ...prev, secretKey: '', secretKeySet: prev.secretKeySet || !!prev.secretKey, webhookSecret: '', webhookSecretSet: prev.webhookSecretSet || !!prev.webhookSecret }));
    } catch (e: any) {
      setMessage({ type: 'error', text: e?.message || 'Could not save Stripe settings.' });
    } finally { setIsSaving(false); }
  };

  const handleTest = async () => {
    setIsTesting(true); setMessage(null);
    try {
      if (!s.secretKey) throw new Error('Enter the secret key to test (a saved key is not re-sent).');
      const res = await fetch('/api/setup/technical/test/stripe', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ secretKey: s.secretKey }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success !== false) {
        setMessage({ type: 'success', text: `Connected to Stripe account: ${data.businessName || data.accountId || 'OK'}.` });
      } else {
        throw new Error(data.error || 'Stripe test failed.');
      }
    } catch (e: any) {
      setMessage({ type: 'error', text: e?.message || 'Stripe test failed.' });
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
            <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2"><CreditCard size={22} className="text-purple-600" /> Payments (Stripe)</h1>
            <p className="text-gray-600">Keys used for voucher sales and online payments.</p>
          </div>
          <div className="flex items-center space-x-3">
            <button onClick={handleTest} disabled={isTesting} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center disabled:opacity-50">
              <FlaskConical size={16} className="mr-2" /> {isTesting ? 'Testing…' : 'Test Key'}
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
            <label className="block text-sm font-medium text-gray-700 mb-2">Publishable Key</label>
            <input type="text" value={s.publishableKey} onChange={e => setS(p => ({ ...p, publishableKey: e.target.value }))} className={field} placeholder="pk_live_…" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Secret Key</label>
            <input type="password" value={s.secretKey} onChange={e => setS(p => ({ ...p, secretKey: e.target.value }))} className={field} placeholder={s.secretKeySet ? '•••••••• (saved — leave blank to keep)' : 'sk_live_…'} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Webhook Signing Secret <span className="text-gray-400">(optional)</span></label>
            <input type="password" value={s.webhookSecret} onChange={e => setS(p => ({ ...p, webhookSecret: e.target.value }))} className={field} placeholder={s.webhookSecretSet ? '•••••••• (saved — leave blank to keep)' : 'whsec_…'} />
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-2xl text-sm text-blue-800">
          Use your <strong>live</strong> keys for real payments. Test the secret key before saving. The webhook secret is needed for reliable payment confirmations.
        </div>
      </div>
    </AdminLayout>
  );
};

export default StripeSettingsPage;
