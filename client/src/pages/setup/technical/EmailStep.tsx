/**
 * EmailStep — SMTP, optional IMAP, optional Brevo API key
 */

import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  ArrowLeft, ArrowRight, Mail, Loader2, CheckCircle2, XCircle,
  ChevronDown, ChevronUp, Send
} from 'lucide-react';

interface Props {
  onComplete: () => void;
  onBack: () => void;
}

export default function EmailStep({ onComplete, onBack }: Props) {
  // SMTP fields
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState('587');
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPass, setSmtpPass] = useState('');
  const [smtpSecure, setSmtpSecure] = useState(false);
  const [fromEmail, setFromEmail] = useState('');
  const [fromName, setFromName] = useState('');

  // IMAP fields (collapsible)
  const [showImap, setShowImap] = useState(false);
  const [imapHost, setImapHost] = useState('');
  const [imapPort, setImapPort] = useState('993');
  const [imapUser, setImapUser] = useState('');
  const [imapPass, setImapPass] = useState('');
  const [imapTls, setImapTls] = useState(true);

  // Brevo
  const [brevoApiKey, setBrevoApiKey] = useState('');

  // Test email
  const [testEmail, setTestEmail] = useState('');
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Load existing values
  const { data: current, isLoading } = useQuery({
    queryKey: ['tech-setup-current'],
    queryFn: () => fetch('/api/setup/technical/current').then(r => r.json()),
    staleTime: 5000,
  });

  useEffect(() => {
    if (current?.email) {
      const e = current.email;
      setSmtpHost(e.smtpHost || '');
      setSmtpPort(String(e.smtpPort || 587));
      setSmtpUser(e.smtpUser || '');
      setSmtpSecure(e.smtpSecure || false);
      setFromEmail(e.fromEmail || '');
      setFromName(e.fromName || '');
      setImapHost(e.imapHost || '');
      setImapPort(String(e.imapPort || 993));
      setImapUser(e.imapUser || '');
      setImapTls(e.imapTls ?? true);
      if (e.imapHost) setShowImap(true);
    }
  }, [current]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/setup/technical/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          smtpHost, smtpPort, smtpUser, smtpPass, smtpSecure,
          fromEmail, fromName,
          imapHost: showImap ? imapHost : null,
          imapPort: showImap ? imapPort : null,
          imapUser: showImap ? imapUser : null,
          imapPass: showImap ? imapPass : null,
          imapTls: showImap ? imapTls : null,
          brevoApiKey: brevoApiKey || null,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Save failed');
      return res.json();
    },
    onSuccess: () => onComplete(),
  });

  // Test SMTP mutation
  const testMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/setup/technical/test/smtp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          smtpHost, smtpPort, smtpUser, smtpPass, smtpSecure,
          fromEmail: fromEmail || smtpUser,
          toEmail: testEmail || undefined,
        }),
      });
      return res.json();
    },
    onSuccess: (data) => setTestResult(data),
    onError: (err) => setTestResult({ success: false, message: (err as Error).message }),
  });

  const isValid = smtpHost.trim() && smtpUser.trim();
  const hasPassOrExisting = smtpPass || current?.email?.smtpPassSet;

  if (isLoading) {
    return (
      <CardContent className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </CardContent>
    );
  }

  return (
    <>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
            <Mail className="w-5 h-5 text-blue-600 dark:text-blue-300" />
          </div>
          <div>
            <CardTitle>Email / SMTP Configuration</CardTitle>
            <CardDescription>
              Configure outgoing email. Your app needs SMTP to send bookings, invoices, and notifications.
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6 px-6 max-h-[60vh] overflow-y-auto">
        {/* SMTP Section */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            SMTP (Outgoing)
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="smtpHost">SMTP Host <span className="text-red-500">*</span></Label>
              <Input
                id="smtpHost"
                placeholder="smtp.yourdomain.com"
                value={smtpHost}
                onChange={e => setSmtpHost(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="smtpPort">SMTP Port</Label>
              <Input
                id="smtpPort"
                placeholder="587"
                value={smtpPort}
                onChange={e => setSmtpPort(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="smtpUser">Username <span className="text-red-500">*</span></Label>
              <Input
                id="smtpUser"
                placeholder="user@yourdomain.com"
                value={smtpUser}
                onChange={e => setSmtpUser(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="smtpPass">
                Password {current?.email?.smtpPassSet && <span className="text-green-600 text-xs">(saved)</span>}
              </Label>
              <Input
                id="smtpPass"
                type="password"
                placeholder={current?.email?.smtpPassSet ? '••••••••' : 'Enter password'}
                value={smtpPass}
                onChange={e => setSmtpPass(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Switch
              id="smtpSecure"
              checked={smtpSecure}
              onCheckedChange={setSmtpSecure}
            />
            <Label htmlFor="smtpSecure" className="text-sm">
              Use SSL/TLS (port 465). Leave off for STARTTLS (port 587).
            </Label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fromEmail">From Email</Label>
              <Input
                id="fromEmail"
                placeholder="noreply@yourdomain.com"
                value={fromEmail}
                onChange={e => setFromEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fromName">From Name</Label>
              <Input
                id="fromName"
                placeholder="My Studio"
                value={fromName}
                onChange={e => setFromName(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Test SMTP */}
        <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Send className="w-4 h-4" /> Test Connection
          </h4>
          <div className="flex gap-2">
            <Input
              placeholder="your@email.com (optional — verifies connection if empty)"
              value={testEmail}
              onChange={e => setTestEmail(e.target.value)}
              className="flex-1"
            />
            <Button
              variant="outline"
              onClick={() => testMutation.mutate()}
              disabled={!smtpHost || !smtpUser || testMutation.isPending}
            >
              {testMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Test'
              )}
            </Button>
          </div>
          {testResult && (
            <div className={`mt-2 flex items-center gap-2 text-sm ${
              testResult.success ? 'text-green-600' : 'text-red-600'
            }`}>
              {testResult.success ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
              {testResult.message}
            </div>
          )}
        </div>

        {/* IMAP Section (collapsible) */}
        <div className="border rounded-lg">
          <button
            className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            onClick={() => setShowImap(!showImap)}
          >
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              IMAP (Incoming) — Optional
            </span>
            {showImap ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {showImap && (
            <div className="p-4 pt-0 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="imapHost">IMAP Host</Label>
                  <Input
                    id="imapHost"
                    placeholder="imap.yourdomain.com"
                    value={imapHost}
                    onChange={e => setImapHost(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="imapPort">IMAP Port</Label>
                  <Input
                    id="imapPort"
                    placeholder="993"
                    value={imapPort}
                    onChange={e => setImapPort(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="imapUser">Username</Label>
                  <Input
                    id="imapUser"
                    placeholder="Same as SMTP if blank"
                    value={imapUser}
                    onChange={e => setImapUser(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="imapPass">Password</Label>
                  <Input
                    id="imapPass"
                    type="password"
                    placeholder={current?.email?.imapPassSet ? '••••••••' : 'Enter password'}
                    value={imapPass}
                    onChange={e => setImapPass(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Switch id="imapTls" checked={imapTls} onCheckedChange={setImapTls} />
                <Label htmlFor="imapTls" className="text-sm">Use TLS</Label>
              </div>
            </div>
          )}
        </div>

        {/* Brevo Section (collapsible) */}
        <div className="space-y-2">
          <Label htmlFor="brevoApiKey">
            Brevo (Sendinblue) API Key — Optional
            {current?.email?.brevoKeySet && <span className="text-green-600 text-xs ml-2">(saved)</span>}
          </Label>
          <Input
            id="brevoApiKey"
            type="password"
            placeholder={current?.email?.brevoKeySet ? '••••••••' : 'xkeysib-...'}
            value={brevoApiKey}
            onChange={e => setBrevoApiKey(e.target.value)}
          />
          <p className="text-xs text-slate-500">
            If you use Brevo / Sendinblue for transactional email alongside SMTP.
          </p>
        </div>
      </CardContent>

      <CardFooter className="flex justify-between px-6 pt-4">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onComplete}>Skip for now</Button>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={(!isValid || !hasPassOrExisting) || saveMutation.isPending}
          >
            {saveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Save & Continue
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </CardFooter>

      {saveMutation.isError && (
        <div className="px-6 pb-4">
          <p className="text-sm text-red-600">{(saveMutation.error as Error).message}</p>
        </div>
      )}
    </>
  );
}
