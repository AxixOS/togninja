import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { Mail, Save, AlertCircle, CheckCircle, Settings, FlaskConical } from 'lucide-react';

/**
 * Email & SMTP settings.
 * Wired to the setup-wizard endpoints (the working ones):
 *   GET  /api/setup/technical/current   (email block)
 *   POST /api/setup/technical/email     (save)
 *   POST /api/setup/technical/test/smtp (send a test message)
 * (The previous version posted to /api/admin/email-settings + /api/admin/test-email,
 *  which do not exist server-side, so nothing saved.)
 */
interface EmailState {
  fromEmail: string;
  fromName: string;
  smtpHost: string;
  smtpPort: string;
  smtpUser: string;
  smtpPass: string;      // blank unless changing
  smtpPassSet: boolean;
  smtpSecure: boolean;
  imapHost: string;
  imapPort: string;
  imapUser: string;
  imapPass: string;      // blank unless changing
  imapPassSet: boolean;
  imapTls: boolean;
  brevoApiKey: string;   // blank unless changing
  brevoKeySet: boolean;
}

const EmailSettingsPage: React.FC = () => {
  const [s, setS] = useState<EmailState>({
    fromEmail: '', fromName: '', smtpHost: '', smtpPort: '465', smtpUser: '', smtpPass: '', smtpPassSet: false, smtpSecure: true,
    imapHost: '', imapPort: '993', imapUser: '', imapPass: '', imapPassSet: false, imapTls: true,
    brevoApiKey: '', brevoKeySet: false,
  });
  const [testEmail, setTestEmail] = useState('');
  const [showImap, setShowImap] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [provider, setProvider] = useState('');

  // One-click host/port presets. Gmail/Outlook studios just pick the provider and
  // enter their address + (Gmail) app password — no need to know host names/ports.
  const PRESETS: Record<string, Partial<EmailState>> = {
    gmail: { smtpHost: 'smtp.gmail.com', smtpPort: '465', smtpSecure: true, imapHost: 'imap.gmail.com', imapPort: '993', imapTls: true },
    outlook: { smtpHost: 'smtp.office365.com', smtpPort: '587', smtpSecure: false, imapHost: 'outlook.office365.com', imapPort: '993', imapTls: true },
  };
  const applyPreset = (key: string) => {
    setProvider(key);
    const p = PRESETS[key];
    if (!p) return;
    setS(prev => ({ ...prev, ...p }));
    setShowImap(true);
  };

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/setup/technical/current');
        if (res.ok) {
          const data = await res.json();
          const e = data.email || {};
          setS(prev => ({
            ...prev,
            fromEmail: e.fromEmail || '',
            fromName: e.fromName || '',
            smtpHost: e.smtpHost || '',
            smtpPort: (e.smtpPort ?? '465').toString(),
            smtpUser: e.smtpUser || '',
            smtpPassSet: !!e.smtpPassSet,
            smtpSecure: e.smtpSecure ?? true,
            imapHost: e.imapHost || '',
            imapPort: (e.imapPort ?? '993').toString(),
            imapUser: e.imapUser || '',
            imapPassSet: !!e.imapPassSet,
            imapTls: e.imapTls ?? true,
            brevoKeySet: !!e.brevoKeySet,
          }));
          if (e.imapHost) setShowImap(true);
          if (!testEmail && e.fromEmail) setTestEmail(e.fromEmail);
        }
      } catch { /* keep defaults */ } finally { setIsLoading(false); }
    })();
  }, []);

  const handleSave = async () => {
    setIsSaving(true); setMessage(null);
    try {
      if (!s.smtpHost || !s.smtpUser) throw new Error('SMTP host and username are required.');
      const body: any = {
        smtpHost: s.smtpHost, smtpPort: s.smtpPort, smtpUser: s.smtpUser, smtpSecure: s.smtpSecure,
        fromEmail: s.fromEmail, fromName: s.fromName,
      };
      if (s.smtpPass) body.smtpPass = s.smtpPass;
      if (showImap) {
        body.imapHost = s.imapHost; body.imapPort = s.imapPort; body.imapUser = s.imapUser; body.imapTls = s.imapTls;
        if (s.imapPass) body.imapPass = s.imapPass;
      }
      if (s.brevoApiKey) body.brevoApiKey = s.brevoApiKey;

      const res = await fetch('/api/setup/technical/email', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Save failed');
      setMessage({ type: 'success', text: 'Email settings saved.' });
      setS(prev => ({
        ...prev,
        smtpPass: '', smtpPassSet: prev.smtpPassSet || !!prev.smtpPass,
        imapPass: '', imapPassSet: prev.imapPassSet || !!prev.imapPass,
        brevoApiKey: '', brevoKeySet: prev.brevoKeySet || !!prev.brevoApiKey,
      }));
    } catch (e: any) {
      setMessage({ type: 'error', text: e?.message || 'Could not save email settings.' });
    } finally { setIsSaving(false); }
  };

  const handleTest = async () => {
    setIsTesting(true); setMessage(null);
    try {
      if (!testEmail) throw new Error('Enter a "send test to" address.');
      const res = await fetch('/api/setup/technical/test/smtp', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          smtpHost: s.smtpHost, smtpPort: s.smtpPort, smtpUser: s.smtpUser, smtpPass: s.smtpPass,
          smtpSecure: s.smtpSecure, fromEmail: s.fromEmail, toEmail: testEmail,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success !== false) {
        setMessage({ type: 'success', text: `Test email sent to ${testEmail}. Check the inbox.` });
      } else {
        throw new Error(data.error || 'SMTP test failed.');
      }
    } catch (e: any) {
      setMessage({ type: 'error', text: `${e?.message || 'SMTP test failed.'} (Tip: enter the password to test; a saved one is not re-sent.)` });
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
            <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2"><Mail size={22} className="text-purple-600" /> Email & SMTP</h1>
            <p className="text-gray-600">Outgoing mail server used for all system emails (leads, invoices, campaigns).</p>
          </div>
          <div className="flex items-center space-x-3">
            <button onClick={handleTest} disabled={isTesting} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center disabled:opacity-50">
              <FlaskConical size={16} className="mr-2" /> {isTesting ? 'Testing…' : 'Send Test'}
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Sender + SMTP */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center mb-4"><Settings size={20} className="text-purple-600 mr-2" /><h2 className="text-lg font-semibold text-gray-900">SMTP (outgoing)</h2></div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email provider</label>
                <select value={provider} onChange={e => applyPreset(e.target.value)} className={field}>
                  <option value="">Custom / other</option>
                  <option value="gmail">Gmail</option>
                  <option value="outlook">Outlook / Microsoft 365</option>
                </select>
                {provider === 'gmail' && (
                  <p className="text-xs text-amber-700 mt-1">
                    Gmail needs an <strong>App Password</strong> (Google Account → Security → 2-Step Verification → App passwords), not your normal password. Use your Gmail address as the username.
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">From email address</label>
                <input type="email" value={s.fromEmail} onChange={e => setS(p => ({ ...p, fromEmail: e.target.value }))} className={field} placeholder="hello@yourstudio.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">From name</label>
                <input type="text" value={s.fromName} onChange={e => setS(p => ({ ...p, fromName: e.target.value }))} className={field} placeholder="Your Studio" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">SMTP host</label>
                <input type="text" value={s.smtpHost} onChange={e => setS(p => ({ ...p, smtpHost: e.target.value }))} className={field} placeholder="smtp.easyname.com" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Port</label>
                  <input type="number" value={s.smtpPort} onChange={e => setS(p => ({ ...p, smtpPort: e.target.value }))} className={field} placeholder="465" />
                </div>
                <div className="flex items-end pb-2">
                  <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                    <input type="checkbox" checked={s.smtpSecure} onChange={e => setS(p => ({ ...p, smtpSecure: e.target.checked }))} className="rounded border-gray-300" />
                    SSL (port 465)
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">SMTP username</label>
                <input type="text" value={s.smtpUser} onChange={e => setS(p => ({ ...p, smtpUser: e.target.value }))} className={field} placeholder="hello@yourstudio.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">SMTP password</label>
                <input type="password" value={s.smtpPass} onChange={e => setS(p => ({ ...p, smtpPass: e.target.value }))} className={field} placeholder={s.smtpPassSet ? '•••••••• (saved — leave blank to keep)' : 'Enter password'} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Send test to</label>
                <input type="email" value={testEmail} onChange={e => setTestEmail(e.target.value)} className={field} placeholder="you@example.com" />
              </div>
            </div>
          </div>

          {/* IMAP + Brevo */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center"><Mail size={20} className="text-purple-600 mr-2" /><h2 className="text-lg font-semibold text-gray-900">Inbox (IMAP)</h2></div>
              <label className="inline-flex items-center gap-2 text-sm text-gray-600">
                <input type="checkbox" checked={showImap} onChange={e => setShowImap(e.target.checked)} className="rounded border-gray-300" /> Enable
              </label>
            </div>
            {showImap ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">IMAP host</label>
                  <input type="text" value={s.imapHost} onChange={e => setS(p => ({ ...p, imapHost: e.target.value }))} className={field} placeholder="imap.easyname.com" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Port</label>
                    <input type="number" value={s.imapPort} onChange={e => setS(p => ({ ...p, imapPort: e.target.value }))} className={field} placeholder="993" />
                  </div>
                  <div className="flex items-end pb-2">
                    <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                      <input type="checkbox" checked={s.imapTls} onChange={e => setS(p => ({ ...p, imapTls: e.target.checked }))} className="rounded border-gray-300" /> TLS
                    </label>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">IMAP username</label>
                  <input type="text" value={s.imapUser} onChange={e => setS(p => ({ ...p, imapUser: e.target.value }))} className={field} placeholder="hello@yourstudio.com" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">IMAP password</label>
                  <input type="password" value={s.imapPass} onChange={e => setS(p => ({ ...p, imapPass: e.target.value }))} className={field} placeholder={s.imapPassSet ? '•••••••• (saved — leave blank to keep)' : 'Enter password'} />
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500">Enable to let the CRM read your inbox (the Inbox feature). Leave off if you only send email.</p>
            )}

            <div className="mt-6 pt-4 border-t border-gray-100">
              <label className="block text-sm font-medium text-gray-700 mb-2">Brevo API key <span className="text-gray-400">(optional, for bulk campaigns)</span></label>
              <input type="password" value={s.brevoApiKey} onChange={e => setS(p => ({ ...p, brevoApiKey: e.target.value }))} className={field} placeholder={s.brevoKeySet ? '•••••••• (saved — leave blank to keep)' : 'xkeysib-…'} />
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
          For easyname and most providers, use <strong>port 465 with SSL</strong>. Enter the password and use <strong>Send Test</strong> to confirm delivery before relying on it.
        </div>
      </div>
    </AdminLayout>
  );
};

export default EmailSettingsPage;
