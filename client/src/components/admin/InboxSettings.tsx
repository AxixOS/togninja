import React, { useState, useEffect } from 'react';
import { X, Settings, Server, Mail, Eye, EyeOff, TestTube, Save, RefreshCw, Lock, TestTube2, CheckCircle, AlertCircle, Plane, FileSignature, Calendar } from 'lucide-react';
import { getEmailSettings, saveEmailSettings } from '../../api/email';
import { SITE } from '../../config/site';

interface EmailSettings {
  provider: 'gmail' | 'outlook' | 'smtp';
  smtpHost: string;
  smtpPort: string;
  username: string;
  password: string;
  useTLS: boolean;
  syncEnabled: boolean;
  syncInterval: number;
  // Email Signature
  emailSignature: string;
  signatureEnabled: boolean;
  // Out of Office Auto Responder
  outOfOfficeEnabled: boolean;
  outOfOfficeMessage: string;
  outOfOfficeStartDate: string;
  outOfOfficeEndDate: string;
}

interface InboxSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (settings: EmailSettings) => void;
  currentSettings?: EmailSettings;
}

const InboxSettings: React.FC<InboxSettingsProps> = ({
  isOpen,
  onClose,
  onSave,
  currentSettings
}) => {
  const [settings, setSettings] = useState<EmailSettings>(
    currentSettings || {
      provider: 'smtp',
      smtpHost: '',
      smtpPort: '587',
      // Credentials should come from server/DB — never hardcode in client
      username: '',
      password: '',
      useTLS: true,
      syncEnabled: true,
      syncInterval: 5,
      // Email Signature defaults
      emailSignature: '',
      signatureEnabled: false,
      // Out of Office defaults
      outOfOfficeEnabled: false,
      outOfOfficeMessage: 'Vielen Dank für Ihre Nachricht. Ich bin derzeit nicht im Büro und werde mich nach meiner Rückkehr bei Ihnen melden.',
      outOfOfficeStartDate: '',
      outOfOfficeEndDate: ''
    }
  );
  const [activeTab, setActiveTab] = useState<'connection' | 'signature' | 'outofoffice'>('connection');
  const [testing, setTesting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);

  // Gmail via OAuth (one-click) — no password/IMAP setup.
  const [gmailStatus, setGmailStatus] = useState<{ connected: boolean; email: string | null }>({ connected: false, email: null });
  const [gmailBusy, setGmailBusy] = useState(false);
  const fetchGmailStatus = async () => {
    try { const r = await fetch('/api/auth/google/gmail/status', { credentials: 'include' }); if (r.ok) setGmailStatus(await r.json()); } catch { /* ignore */ }
  };
  useEffect(() => { fetchGmailStatus(); }, []);

  const handleConnectGmail = async () => {
    setGmailBusy(true);
    try {
      const r = await fetch('/api/auth/google/gmail/connect', { credentials: 'include' });
      const d = await r.json();
      if (!r.ok || !d.authUrl) throw new Error(d.error || 'Could not start Google sign-in');
      const popup = window.open(d.authUrl, 'Connect Gmail', 'width=600,height=700,left=200,top=100');
      if (!popup) { alert('Please allow popups to connect Gmail.'); setGmailBusy(false); return; }
      const onMsg = (e: MessageEvent) => { if (e.data?.type === 'GMAIL_CONNECTED') { window.removeEventListener('message', onMsg); setGmailBusy(false); fetchGmailStatus(); } };
      window.addEventListener('message', onMsg);
      const poll = setInterval(() => { if (popup.closed) { clearInterval(poll); setGmailBusy(false); fetchGmailStatus(); } }, 1000);
    } catch (e: any) { alert(e?.message || 'Failed to connect Gmail'); setGmailBusy(false); }
  };
  const handleDisconnectGmail = async () => {
    if (!window.confirm('Disconnect Gmail? Sending and inbox sync via Google will stop.')) return;
    try { await fetch('/api/auth/google/gmail/disconnect', { method: 'POST', credentials: 'include' }); await fetchGmailStatus(); } catch { /* ignore */ }
  };

  const handleRemoveAccount = async () => {
    if (!window.confirm('Remove this email account? Sending and inbox sync will stop until you add an account again.')) return;
    setRemoving(true);
    try {
      const res = await fetch('/api/email/disconnect', { method: 'POST', credentials: 'include' });
      if (!res.ok) throw new Error('Failed');
      // Clear the form fields so the modal reflects the disconnected state.
      setSettings(prev => ({ ...prev, smtpHost: '', username: '', password: '', fromEmail: '', fromName: '' }));
      setTestResult({ success: true, message: 'Email account removed.' });
    } catch {
      setTestResult({ success: false, message: 'Could not remove the email account. Please try again.' });
    } finally {
      setRemoving(false);
    }
  };

  const handleProviderChange = (provider: 'gmail' | 'outlook' | 'smtp') => {
    const providerDefaults = {
      gmail: { smtpHost: 'smtp.gmail.com', smtpPort: '587' },
      outlook: { smtpHost: 'smtp-mail.outlook.com', smtpPort: '587' },
      smtp: { smtpHost: '', smtpPort: '587' }
    };

    setSettings(prev => ({
      ...prev,
      provider,
      ...providerDefaults[provider]
    }));
  };

  const handleInputChange = (field: keyof EmailSettings, value: any) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const testConnection = async () => {
    setTesting(true);
    setTestResult(null);

    try {
      // Test with real email configuration
      const response = await fetch('/api/email/test-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          provider: settings.provider,
          smtpHost: settings.smtpHost,
          smtpPort: settings.smtpPort,
          username: settings.username,
          password: settings.password,
          useTLS: settings.useTLS
        })
      });

      const result = await response.json();
      
      if (response.ok && result.success) {
        setTestResult({
          success: true,
          message: 'Connection successful! Email settings are working correctly.'
        });
      } else {
        setTestResult({
          success: false,
          message: result.message || 'Connection failed. Please check your credentials and settings.'
        });
      }
    } catch (error) {
      setTestResult({
        success: false,
        message: 'Failed to test connection. Please try again.'
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Save the SMTP credentials to the CANONICAL config store
      // (/api/setup/technical/email → studio_integrations via config-reader).
      // This is what the actual email sender (smtp-helper) reads. The legacy
      // /api/email/settings/save wrote to an email_settings table nothing
      // sends from — a "successful" save there still left sending broken.
      const port = String(settings.smtpPort || '465');
      const canonicalRes = await fetch('/api/setup/technical/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          smtpHost: settings.smtpHost,
          smtpPort: port,
          smtpUser: settings.username,
          smtpPass: settings.password || undefined,
          smtpSecure: port === '465' ? true : undefined,
          fromEmail: settings.username,
          fromName: SITE.name,
        }),
      });
      if (!canonicalRes.ok) {
        const err = await canonicalRes.json().catch(() => ({}));
        throw new Error(err.error || `Save failed (HTTP ${canonicalRes.status})`);
      }

      // Signature / out-of-office live in the legacy store — best-effort only;
      // its failure must not fail the credential save.
      try {
        await saveEmailSettings({
          smtpHost: settings.smtpHost,
          smtpPort: settings.smtpPort,
          smtpUser: settings.username,
          smtpPass: settings.password,
          fromEmail: settings.username,
          fromName: SITE.name,
          emailSignature: settings.emailSignature,
          signatureEnabled: settings.signatureEnabled,
          outOfOfficeEnabled: settings.outOfOfficeEnabled,
          outOfOfficeMessage: settings.outOfOfficeMessage,
          outOfOfficeStartDate: settings.outOfOfficeStartDate,
          outOfOfficeEndDate: settings.outOfOfficeEndDate
        });
      } catch (legacyErr) {
        console.warn('Legacy email-settings save failed (signature/out-of-office only):', legacyErr);
      }

      setTestResult({
        success: true,
        message: 'Email settings saved — the composer and automations now use these credentials.'
      });

      onSave(settings);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error: any) {
      setTestResult({
        success: false,
        message: `Failed to save email settings: ${error?.message || 'please try again.'}`
      });
    } finally {
      setSaving(false);
    }
  };

  const importEmails = async () => {
    setImporting(true);
    setTestResult(null);
    try {
      // Convert SMTP host to IMAP host for email fetching
      let imapHost = settings.smtpHost;
      if (settings.smtpHost.includes('smtp.')) {
        imapHost = settings.smtpHost.replace('smtp.', 'imap.');
      }
      
      const response = await fetch('/api/email/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          ...settings,
          imapHost: imapHost
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        setTestResult({ 
          success: true, 
          message: `Successfully imported ${result.count} emails` 
        });
      } else {
        setTestResult({ 
          success: false, 
          message: result.message || 'Failed to import emails' 
        });
      }
    } catch (error) {
      setTestResult({ 
        success: false, 
        message: 'Failed to import emails: Connection error' 
      });
    } finally {
      setImporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Settings className="h-6 w-6 text-gray-600" />
              <h2 className="text-xl font-semibold text-gray-900">Inbox Settings</h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>
          
          {/* Tabs */}
          <div className="flex space-x-1 mt-4 border-b border-gray-200">
            <button
              onClick={() => setActiveTab('connection')}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                activeTab === 'connection'
                  ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Server className="inline h-4 w-4 mr-2" />
              Connection
            </button>
            <button
              onClick={() => setActiveTab('signature')}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                activeTab === 'signature'
                  ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <FileSignature className="inline h-4 w-4 mr-2" />
              Signature
            </button>
            <button
              onClick={() => setActiveTab('outofoffice')}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                activeTab === 'outofoffice'
                  ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Plane className="inline h-4 w-4 mr-2" />
              Out of Office
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Connection Tab */}
          {activeTab === 'connection' && (
            <>
          {/* Email Provider */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Email Provider
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: 'gmail', label: 'Gmail', icon: '📧' },
                { value: 'outlook', label: 'Outlook', icon: '📮' },
                { value: 'smtp', label: 'Custom SMTP', icon: '⚙️' }
              ].map(provider => (
                <button
                  key={provider.value}
                  onClick={() => handleProviderChange(provider.value as any)}
                  className={`p-3 border rounded-lg text-center transition-colors ${
                    settings.provider === provider.value
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <div className="text-2xl mb-1">{provider.icon}</div>
                  <div className="text-sm font-medium">{provider.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* One-click Gmail (OAuth) — shown when Gmail is the provider */}
          {settings.provider === 'gmail' && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
              {gmailStatus.connected ? (
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm text-emerald-800"><CheckCircle className="inline h-4 w-4 mr-1" /> Connected as <strong>{gmailStatus.email}</strong> — no password needed.</div>
                  <button onClick={handleDisconnectGmail} className="text-sm font-medium text-red-600 hover:text-red-800">Disconnect</button>
                </div>
              ) : (
                <div>
                  <p className="text-sm font-semibold text-emerald-900 mb-1">One-click Gmail (recommended)</p>
                  <p className="text-xs text-emerald-800 mb-3">Sign in with Google to send &amp; sync — no app password, no IMAP setup. The SMTP fields below are only needed if you skip this.</p>
                  <button onClick={handleConnectGmail} disabled={gmailBusy} className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
                    {gmailBusy ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />} Connect Gmail
                  </button>
                </div>
              )}
            </div>
          )}

          {/* SMTP Configuration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Server className="inline h-4 w-4 mr-1" />
                SMTP Host
              </label>
              <input
                type="text"
                value={settings.smtpHost}
                onChange={(e) => handleInputChange('smtpHost', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="smtp.gmail.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Port
              </label>
              <input
                type="text"
                value={settings.smtpPort}
                onChange={(e) => handleInputChange('smtpPort', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="587"
              />
            </div>
          </div>

          {/* Authentication */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <Lock className="h-5 w-5 mr-2" />
              Authentication
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Mail className="inline h-4 w-4 mr-1" />
                  Email Address
                </label>
                <input
                  type="email"
                  value={settings.username}
                  onChange={(e) => handleInputChange('username', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="your.email@domain.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password/App Password
                </label>
                <input
                  type="password"
                  value={settings.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="••••••••"
                />
              </div>
            </div>
          </div>

          {/* Security & Sync Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Security & Sync</h3>
            
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">Use TLS Encryption</label>
                <p className="text-xs text-gray-500">Recommended for secure connections</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.useTLS}
                  onChange={(e) => handleInputChange('useTLS', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">Enable Email Sync</label>
                <p className="text-xs text-gray-500">Automatically sync emails from your inbox</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.syncEnabled}
                  onChange={(e) => handleInputChange('syncEnabled', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {settings.syncEnabled && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sync Interval (minutes)
                </label>
                <select
                  value={settings.syncInterval}
                  onChange={(e) => handleInputChange('syncInterval', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value={1}>Every 1 minute</option>
                  <option value={5}>Every 5 minutes</option>
                  <option value={15}>Every 15 minutes</option>
                  <option value={30}>Every 30 minutes</option>
                  <option value={60}>Every hour</option>
                </select>
              </div>
            )}
          </div>

          {/* Setup Guide */}
          <div className="border-t border-gray-200 pt-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <h4 className="font-medium text-blue-900 mb-2">Quick Setup Guide</h4>
              <div className="text-sm text-blue-800 space-y-1">
                <p><strong>Business Email (EasyName):</strong> IMAP: imap.easyname.com:993</p>
                <p><strong>For Gmail:</strong> Use your email + App Password (not regular password)</p>
                <p><strong>For Outlook:</strong> Use your Microsoft account email + password</p>
              </div>
            </div>
          </div>

          {/* Test Connection & Import */}
          <div className="border-t border-gray-200 pt-4 space-y-3">
            <div className="flex space-x-3">
              <button
                onClick={testConnection}
                disabled={testing || !settings.username || !settings.smtpHost}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <TestTube2 className={`h-4 w-4 ${testing ? 'animate-spin' : ''}`} />
                <span>{testing ? 'Testing...' : 'Test Connection'}</span>
              </button>
              
              <button
                onClick={importEmails}
                disabled={importing || !settings.username || !settings.smtpHost}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Mail className={`h-4 w-4 ${importing ? 'animate-spin' : ''}`} />
                <span>{importing ? 'Importing...' : 'Import Emails'}</span>
              </button>
            </div>

            {testResult && (
              <div className={`mt-3 p-3 rounded-lg flex items-start space-x-2 ${
                testResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
              }`}>
                {testResult.success ? (
                  <CheckCircle className="h-5 w-5 mt-0.5" />
                ) : (
                  <AlertCircle className="h-5 w-5 mt-0.5" />
                )}
                <span className="text-sm">{testResult.message}</span>
              </div>
            )}
          </div>

          {/* Gmail Setup Instructions */}
          {settings.provider === 'gmail' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">Gmail Setup Instructions</h4>
              <div className="text-sm text-blue-800 space-y-1">
                <p>1. Enable 2-factor authentication on your Google account</p>
                <p>2. Generate an App Password for this application</p>
                <p>3. Use your email address and the App Password above</p>
                <p>4. Keep TLS encryption enabled</p>
              </div>
            </div>
          )}
            </>
          )}

          {/* Signature Tab */}
          {activeTab === 'signature' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 flex items-center">
                    <FileSignature className="h-5 w-5 mr-2 text-gray-600" />
                    Email Signature
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Create a signature that will be automatically added to your outgoing emails
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.signatureEnabled}
                    onChange={(e) => handleInputChange('signatureEnabled', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Signature Content
                </label>
                <textarea
                  value={settings.emailSignature}
                  onChange={(e) => handleInputChange('emailSignature', e.target.value)}
                  disabled={!settings.signatureEnabled}
                  rows={8}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${!settings.signatureEnabled ? 'bg-gray-100 text-gray-400' : ''}`}
                  placeholder={`Mit freundlichen Grüßen,

Andrea Scheucher
${SITE.name}
Tel: +43 XXX XXXXXXX
Web: ${SITE.url.replace(/^https?:\/\//, '')}`}
                />
                <p className="text-xs text-gray-500 mt-2">
                  Tip: Use line breaks to format your signature. HTML is not supported.
                </p>
              </div>

              {settings.signatureEnabled && settings.emailSignature && (
                <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Preview</h4>
                  <div className="bg-white border border-gray-200 rounded p-3 text-sm text-gray-600 whitespace-pre-wrap">
                    {settings.emailSignature}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Out of Office Tab */}
          {activeTab === 'outofoffice' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 flex items-center">
                    <Plane className="h-5 w-5 mr-2 text-gray-600" />
                    Out of Office Auto Responder
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Automatically reply to incoming emails when you're away
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.outOfOfficeEnabled}
                    onChange={(e) => handleInputChange('outOfOfficeEnabled', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {settings.outOfOfficeEnabled && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-start space-x-2">
                  <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div className="text-sm text-yellow-800">
                    <strong>Auto responder is active.</strong> Automatic replies will be sent to incoming emails.
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Calendar className="inline h-4 w-4 mr-1" />
                    Start Date (optional)
                  </label>
                  <input
                    type="date"
                    value={settings.outOfOfficeStartDate}
                    onChange={(e) => handleInputChange('outOfOfficeStartDate', e.target.value)}
                    disabled={!settings.outOfOfficeEnabled}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${!settings.outOfOfficeEnabled ? 'bg-gray-100 text-gray-400' : ''}`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Calendar className="inline h-4 w-4 mr-1" />
                    End Date (optional)
                  </label>
                  <input
                    type="date"
                    value={settings.outOfOfficeEndDate}
                    onChange={(e) => handleInputChange('outOfOfficeEndDate', e.target.value)}
                    disabled={!settings.outOfOfficeEnabled}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${!settings.outOfOfficeEnabled ? 'bg-gray-100 text-gray-400' : ''}`}
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500 -mt-2">
                Leave dates empty to keep the auto responder active indefinitely (until manually disabled).
              </p>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Auto Reply Message
                </label>
                <textarea
                  value={settings.outOfOfficeMessage}
                  onChange={(e) => handleInputChange('outOfOfficeMessage', e.target.value)}
                  disabled={!settings.outOfOfficeEnabled}
                  rows={6}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${!settings.outOfOfficeEnabled ? 'bg-gray-100 text-gray-400' : ''}`}
                  placeholder="Vielen Dank für Ihre Nachricht. Ich bin derzeit nicht im Büro und werde mich nach meiner Rückkehr bei Ihnen melden."
                />
              </div>

              {settings.outOfOfficeEnabled && settings.outOfOfficeMessage && (
                <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Message Preview</h4>
                  <div className="bg-white border border-gray-200 rounded p-3">
                    <div className="text-xs text-gray-500 mb-2">
                      <strong>Subject:</strong> Re: [Original Subject] - Automatische Antwort
                    </div>
                    <div className="text-sm text-gray-600 whitespace-pre-wrap">
                      {settings.outOfOfficeMessage}
                    </div>
                    {settings.outOfOfficeStartDate || settings.outOfOfficeEndDate ? (
                      <div className="mt-3 pt-3 border-t border-gray-200 text-xs text-gray-500">
                        Active: {settings.outOfOfficeStartDate || 'Now'} → {settings.outOfOfficeEndDate || 'Until disabled'}
                      </div>
                    ) : null}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex items-center justify-between">
          <button
            onClick={handleRemoveAccount}
            disabled={removing}
            className="px-4 py-2 text-sm font-medium text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50"
            title="Disconnect this email account — stops sending and inbox sync"
          >
            {removing ? 'Removing…' : 'Remove email account'}
          </button>
          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !settings.username || !settings.smtpHost}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InboxSettings;
