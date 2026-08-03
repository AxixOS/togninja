import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Plus,
  Settings,
  Trash2,
  Check,
  X,
  Eye,
  EyeOff,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Mail,
  Globe,
  Shield,
  Clock,
  Zap,
  Key,
  Server,
  Lock,
  Wifi,
  User,
  AtSign,
  Edit2,
  Save,
  TestTube
} from 'lucide-react';
import { EmailAccount, createEmailAccount, updateEmailAccount, deleteEmailAccount, testEmailConnection } from '../../api/inbox';

interface EmailAccountConfigProps {
  isOpen: boolean;
  onClose: () => void;
  onAccountCreated?: (account: EmailAccount) => void;
  onAccountUpdated?: (account: EmailAccount) => void;
  onAccountDeleted?: (accountId: string) => void;
  existingAccount?: EmailAccount;
}

interface EmailProvider {
  id: string;
  name: string;
  type: 'gmail' | 'outlook' | 'yahoo' | 'imap' | 'pop3' | 'exchange';
  icon: string;
  incomingServer: string;
  incomingPort: number;
  incomingSecurity: 'ssl' | 'tls' | 'starttls';
  outgoingServer: string;
  outgoingPort: number;
  outgoingSecurity: 'ssl' | 'tls' | 'starttls';
  oauthSupported: boolean;
  popular: boolean;
}

const EMAIL_PROVIDERS: EmailProvider[] = [
  {
    id: 'gmail',
    name: 'Gmail',
    type: 'gmail',
    icon: '📧',
    incomingServer: 'imap.gmail.com',
    incomingPort: 993,
    incomingSecurity: 'ssl',
    outgoingServer: 'smtp.gmail.com',
    outgoingPort: 587,
    outgoingSecurity: 'starttls',
    oauthSupported: true,
    popular: true
  },
  {
    id: 'outlook',
    name: 'Outlook.com',
    type: 'outlook',
    icon: '📮',
    incomingServer: 'outlook.office365.com',
    incomingPort: 993,
    incomingSecurity: 'ssl',
    outgoingServer: 'smtp-mail.outlook.com',
    outgoingPort: 587,
    outgoingSecurity: 'starttls',
    oauthSupported: true,
    popular: true
  },
  {
    id: 'yahoo',
    name: 'Yahoo Mail',
    type: 'yahoo',
    icon: '📬',
    incomingServer: 'imap.mail.yahoo.com',
    incomingPort: 993,
    incomingSecurity: 'ssl',
    outgoingServer: 'smtp.mail.yahoo.com',
    outgoingPort: 587,
    outgoingSecurity: 'starttls',
    oauthSupported: false,
    popular: true
  }
];

const EmailAccountConfig: React.FC<EmailAccountConfigProps> = ({
  isOpen,
  onClose,
  onAccountCreated,
  onAccountUpdated,
  onAccountDeleted,
  existingAccount
}) => {
  const [step, setStep] = useState<'provider' | 'credentials' | 'settings' | 'test'>('provider');
  const [selectedProvider, setSelectedProvider] = useState<EmailProvider | null>(null);
  const [customProvider, setCustomProvider] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email_address: '',
    provider: 'gmail' as EmailAccount['provider'],
    incoming_server: '',
    incoming_port: 993,
    incoming_security: 'ssl' as 'ssl' | 'tls' | 'starttls',
    outgoing_server: '',
    outgoing_port: 587,
    outgoing_security: 'starttls' as 'ssl' | 'tls' | 'starttls',
    username: '',
    password: '',
    use_oauth: false,
    sync_enabled: true,
    sync_frequency_minutes: 15,
    sync_folders: ['INBOX', 'Sent', 'Drafts'],
    signature_html: '',
    signature_text: '',
    auto_signature: true,
    is_default: false
  });
  const [showPassword, setShowPassword] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    details?: any;
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (existingAccount) {
      setFormData({
        name: existingAccount.name,
        email_address: existingAccount.email_address,
        provider: existingAccount.provider,
        incoming_server: existingAccount.incoming_server || '',
        incoming_port: existingAccount.incoming_port || 993,
        incoming_security: existingAccount.incoming_security || 'ssl',
        outgoing_server: existingAccount.outgoing_server || '',
        outgoing_port: existingAccount.outgoing_port || 587,
        outgoing_security: existingAccount.outgoing_security || 'starttls',
        username: existingAccount.username || '',
        password: '', // Don't prefill passwords
        use_oauth: !!existingAccount.oauth_token_encrypted,
        sync_enabled: existingAccount.sync_enabled,
        sync_frequency_minutes: existingAccount.sync_frequency_minutes,
        sync_folders: existingAccount.sync_folders,
        signature_html: existingAccount.signature_html || '',
        signature_text: existingAccount.signature_text || '',
        auto_signature: existingAccount.auto_signature,
        is_default: existingAccount.is_default
      });
      setStep('credentials');
    }
  }, [existingAccount]);

  const handleProviderSelect = (provider: EmailProvider) => {
    setSelectedProvider(provider);
    setFormData(prev => ({
      ...prev,
      provider: provider.type,
      incoming_server: provider.incomingServer,
      incoming_port: provider.incomingPort,
      incoming_security: provider.incomingSecurity,
      outgoing_server: provider.outgoingServer,
      outgoing_port: provider.outgoingPort,
      outgoing_security: provider.outgoingSecurity,
      use_oauth: provider.oauthSupported
    }));
    setStep('credentials');
  };

  const handleCustomProvider = () => {
    setCustomProvider(true);
    setSelectedProvider(null);
    setFormData(prev => ({
      ...prev,
      provider: 'imap',
      use_oauth: false
    }));
    setStep('credentials');
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Account name is required';
    }

    if (!formData.email_address.trim()) {
      newErrors.email_address = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email_address)) {
      newErrors.email_address = 'Invalid email address';
    }

    if (!formData.use_oauth) {
      if (!formData.username.trim()) {
        newErrors.username = 'Username is required';
      }
      if (!formData.password.trim()) {
        newErrors.password = 'Password is required';
      }
    }

    if (!formData.incoming_server.trim()) {
      newErrors.incoming_server = 'Incoming server is required';
    }

    if (!formData.outgoing_server.trim()) {
      newErrors.outgoing_server = 'Outgoing server is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleTestConnection = async () => {
    if (!validateForm()) return;

    setTesting(true);
    setTestResult(null);

    try {
      const result = await testEmailConnection({
        provider: formData.provider,
        email_address: formData.email_address,
        incoming_server: formData.incoming_server,
        incoming_port: formData.incoming_port,
        incoming_security: formData.incoming_security,
        outgoing_server: formData.outgoing_server,
        outgoing_port: formData.outgoing_port,
        outgoing_security: formData.outgoing_security,
        username: formData.username || formData.email_address,
        password: formData.password,
        use_oauth: formData.use_oauth
      });

      setTestResult({
        success: result.success,
        message: result.message,
        details: result.details
      });

      if (result.success) {
        setStep('settings');
      }
    } catch (error) {
      setTestResult({
        success: false,
        message: 'Connection test failed',
        details: error
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setSaving(true);
    try {
      const accountData = {
        name: formData.name,
        email_address: formData.email_address,
        provider: formData.provider,
        incoming_server: formData.incoming_server,
        incoming_port: formData.incoming_port,
        incoming_security: formData.incoming_security,
        outgoing_server: formData.outgoing_server,
        outgoing_port: formData.outgoing_port,
        outgoing_security: formData.outgoing_security,
        username: formData.username || formData.email_address,
        password_encrypted: formData.password, // Will be encrypted by API
        sync_enabled: formData.sync_enabled,
        sync_frequency_minutes: formData.sync_frequency_minutes,
        sync_folders: formData.sync_folders,
        signature_html: formData.signature_html,
        signature_text: formData.signature_text,
        auto_signature: formData.auto_signature,
        is_default: formData.is_default,
        status: 'active' as const
      };

      let savedAccount: EmailAccount;
      if (existingAccount) {
        savedAccount = await updateEmailAccount(existingAccount.id, accountData);
        onAccountUpdated?.(savedAccount);
      } else {
        savedAccount = await createEmailAccount(accountData);
        onAccountCreated?.(savedAccount);
      }

      onClose();
    } catch (error) {
      // console.error removed
      setErrors({ general: 'Failed to save account. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!existingAccount) return;

    if (confirm('Are you sure you want to delete this email account? This action cannot be undone.')) {
      try {
        await deleteEmailAccount(existingAccount.id);
        onAccountDeleted?.(existingAccount.id);
        onClose();
      } catch (error) {
        // console.error removed
        setErrors({ general: 'Failed to delete account. Please try again.' });
      }
    }
  };

  if (!isOpen) return null;

  const renderProviderSelection = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Choose Your Email Provider</h3>
        <p className="text-gray-600">Select your email provider to get started quickly</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {EMAIL_PROVIDERS.map((provider) => (
          <button
            key={provider.id}
            onClick={() => handleProviderSelect(provider)}
            className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 text-left transition-colors"
          >
            <div className="flex items-center space-x-3">
              <span className="text-2xl">{provider.icon}</span>
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <h4 className="font-semibold text-gray-900">{provider.name}</h4>
                  {provider.popular && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                      Popular
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600">
                  {provider.oauthSupported ? 'OAuth supported' : 'Username/Password'}
                </p>
              </div>
            </div>
          </button>
        ))}

        <button
          onClick={handleCustomProvider}
          className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 text-left transition-colors"
        >
          <div className="flex items-center space-x-3">
            <Plus className="text-gray-500" size={24} />
            <div>
              <h4 className="font-semibold text-gray-900">Custom Provider</h4>
              <p className="text-sm text-gray-600">Configure IMAP/SMTP manually</p>
            </div>
          </div>
        </button>
      </div>
    </div>
  );

  const renderCredentialsForm = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Account Credentials</h3>
        <p className="text-gray-600">Enter your email account details</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Account Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="My Work Email"
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.name ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Email Address <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            value={formData.email_address}
            onChange={(e) => setFormData(prev => ({ ...prev, email_address: e.target.value }))}
            placeholder="you@example.com"
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.email_address ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.email_address && <p className="text-red-500 text-sm mt-1">{errors.email_address}</p>}
        </div>
      </div>

      {!formData.use_oauth && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Username <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.username}
              onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
              placeholder="Usually your email address"
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.username ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.username && <p className="text-red-500 text-sm mt-1">{errors.username}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                placeholder="Your email password"
                className={`w-full px-3 py-2 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.password ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
          </div>
        </div>
      )}

      {/* Server Settings */}
      <div className="border-t pt-6">
        <h4 className="font-medium text-gray-900 mb-4">Server Settings</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Incoming Server */}
          <div className="space-y-4">
            <h5 className="font-medium text-gray-800 flex items-center">
              <Mail size={16} className="mr-2" />
              Incoming Server (IMAP)
            </h5>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Server</label>
              <input
                type="text"
                value={formData.incoming_server}
                onChange={(e) => setFormData(prev => ({ ...prev, incoming_server: e.target.value }))}
                placeholder="imap.example.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Port</label>
                <input
                  type="number"
                  value={formData.incoming_port}
                  onChange={(e) => setFormData(prev => ({ ...prev, incoming_port: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Security</label>
                <select
                  value={formData.incoming_security}
                  onChange={(e) => setFormData(prev => ({ ...prev, incoming_security: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ssl">SSL/TLS</option>
                  <option value="starttls">STARTTLS</option>
                  <option value="none">None</option>
                </select>
              </div>
            </div>
          </div>

          {/* Outgoing Server */}
          <div className="space-y-4">
            <h5 className="font-medium text-gray-800 flex items-center">
              <Server size={16} className="mr-2" />
              Outgoing Server (SMTP)
            </h5>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Server</label>
              <input
                type="text"
                value={formData.outgoing_server}
                onChange={(e) => setFormData(prev => ({ ...prev, outgoing_server: e.target.value }))}
                placeholder="smtp.example.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Port</label>
                <input
                  type="number"
                  value={formData.outgoing_port}
                  onChange={(e) => setFormData(prev => ({ ...prev, outgoing_port: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Security</label>
                <select
                  value={formData.outgoing_security}
                  onChange={(e) => setFormData(prev => ({ ...prev, outgoing_security: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ssl">SSL/TLS</option>
                  <option value="starttls">STARTTLS</option>
                  <option value="none">None</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Test Connection */}
      <div className="flex items-center justify-between pt-4 border-t">
        <div className="flex items-center space-x-4">
          {testResult && (
            <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg ${
              testResult.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {testResult.success ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
              <span className="text-sm">{testResult.message}</span>
            </div>
          )}
        </div>
        
        <button
          onClick={handleTestConnection}
          disabled={testing}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {testing ? <RefreshCw size={16} className="animate-spin" /> : <TestTube size={16} />}
          <span>{testing ? 'Testing...' : 'Test Connection'}</span>
        </button>
      </div>
    </div>
  );

  const renderSettingsForm = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Account Settings</h3>
        <p className="text-gray-600">Configure sync and signature settings</p>
      </div>

      {/* Sync Settings */}
      <div className="space-y-4">
        <h4 className="font-medium text-gray-900 flex items-center">
          <RefreshCw size={16} className="mr-2" />
          Sync Settings
        </h4>
        
        <div className="flex items-center justify-between">
          <div>
            <label className="font-medium text-gray-900">Enable Sync</label>
            <p className="text-sm text-gray-600">Automatically sync emails in the background</p>
          </div>
          <button
            onClick={() => setFormData(prev => ({ ...prev, sync_enabled: !prev.sync_enabled }))}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              formData.sync_enabled ? 'bg-blue-600' : 'bg-gray-200'
            }`}
          >
            <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
              formData.sync_enabled ? 'translate-x-6' : 'translate-x-1'
            }`} />
          </button>
        </div>

        {formData.sync_enabled && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Sync Frequency</label>
            <select
              value={formData.sync_frequency_minutes}
              onChange={(e) => setFormData(prev => ({ ...prev, sync_frequency_minutes: parseInt(e.target.value) }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={5}>Every 5 minutes</option>
              <option value={15}>Every 15 minutes</option>
              <option value={30}>Every 30 minutes</option>
              <option value={60}>Every hour</option>
              <option value={240}>Every 4 hours</option>
              <option value={1440}>Once daily</option>
            </select>
          </div>
        )}
      </div>

      {/* Signature Settings */}
      <div className="space-y-4">
        <h4 className="font-medium text-gray-900 flex items-center">
          <Edit2 size={16} className="mr-2" />
          Email Signature
        </h4>
        
        <div className="flex items-center justify-between">
          <div>
            <label className="font-medium text-gray-900">Auto-add Signature</label>
            <p className="text-sm text-gray-600">Automatically add signature to new emails</p>
          </div>
          <button
            onClick={() => setFormData(prev => ({ ...prev, auto_signature: !prev.auto_signature }))}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              formData.auto_signature ? 'bg-blue-600' : 'bg-gray-200'
            }`}
          >
            <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
              formData.auto_signature ? 'translate-x-6' : 'translate-x-1'
            }`} />
          </button>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">HTML Signature</label>
          <textarea
            value={formData.signature_html}
            onChange={(e) => setFormData(prev => ({ ...prev, signature_html: e.target.value }))}
            placeholder="<p>Best regards,<br>Your Name</p>"
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Plain Text Signature</label>
          <textarea
            value={formData.signature_text}
            onChange={(e) => setFormData(prev => ({ ...prev, signature_text: e.target.value }))}
            placeholder="Best regards,\nYour Name"
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Default Account */}
      <div className="flex items-center justify-between">
        <div>
          <label className="font-medium text-gray-900">Default Account</label>
          <p className="text-sm text-gray-600">Use this account as default for sending emails</p>
        </div>
        <button
          onClick={() => setFormData(prev => ({ ...prev, is_default: !prev.is_default }))}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            formData.is_default ? 'bg-blue-600' : 'bg-gray-200'
          }`}
        >
          <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
            formData.is_default ? 'translate-x-6' : 'translate-x-1'
          }`} />
        </button>
      </div>
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-5/6 flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Settings className="text-blue-600" size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {existingAccount ? 'Edit Email Account' : 'Add Email Account'}
                </h2>
                <p className="text-sm text-gray-600">
                  {step === 'provider' && 'Choose your email provider'}
                  {step === 'credentials' && 'Enter your account credentials'}
                  {step === 'settings' && 'Configure account settings'}
                  {step === 'test' && 'Test connection and finalize'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-white rounded-lg"
            >
              <X size={20} />
            </button>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center mt-4 space-x-4">
            {['provider', 'credentials', 'settings'].map((stepName, index) => (
              <div key={stepName} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step === stepName ? 'bg-blue-600 text-white' :
                  ['provider', 'credentials', 'settings'].indexOf(step) > index ? 'bg-green-600 text-white' :
                  'bg-gray-200 text-gray-600'
                }`}>
                  {['provider', 'credentials', 'settings'].indexOf(step) > index ? (
                    <Check size={16} />
                  ) : (
                    index + 1
                  )}
                </div>
                {index < 2 && (
                  <div className={`w-12 h-0.5 ${
                    ['provider', 'credentials', 'settings'].indexOf(step) > index ? 'bg-green-600' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {errors.general && (
            <div className="mb-6 p-4 bg-red-100 border border-red-300 rounded-lg">
              <div className="flex items-center space-x-2">
                <AlertCircle className="text-red-600" size={16} />
                <span className="text-red-800">{errors.general}</span>
              </div>
            </div>
          )}

          {step === 'provider' && !existingAccount && renderProviderSelection()}
          {step === 'credentials' && renderCredentialsForm()}
          {step === 'settings' && renderSettingsForm()}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {existingAccount && (
                <button
                  onClick={handleDelete}
                  className="flex items-center space-x-2 px-4 py-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg"
                >
                  <Trash2 size={16} />
                  <span>Delete Account</span>
                </button>
              )}
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>

              {step === 'credentials' && (
                <button
                  onClick={() => setStep('settings')}
                  disabled={!validateForm()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              )}

              {step === 'settings' && (
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
                  <span>{saving ? 'Saving...' : existingAccount ? 'Update Account' : 'Create Account'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default EmailAccountConfig;
