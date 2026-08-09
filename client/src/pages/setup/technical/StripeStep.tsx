/**
 * StripeStep — Stripe publishable key, secret key, webhook secret
 */

import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  ArrowLeft, ArrowRight, CreditCard, Loader2, CheckCircle2, XCircle,
  ExternalLink, Info
} from 'lucide-react';

interface Props {
  onComplete: () => void;
  onBack: () => void;
}

export default function StripeStep({ onComplete, onBack }: Props) {
  const [publishableKey, setPublishableKey] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; accountId?: string; businessName?: string } | null>(null);

  const { data: current, isLoading } = useQuery({
    queryKey: ['tech-setup-current'],
    queryFn: () => fetch('/api/setup/technical/current').then(r => r.json()),
    staleTime: 5000,
  });

  useEffect(() => {
    if (current?.stripe) {
      setPublishableKey(current.stripe.publishableKey || '');
    }
  }, [current]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/setup/technical/stripe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publishableKey, secretKey, webhookSecret }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Save failed');
      return res.json();
    },
    onSuccess: () => onComplete(),
  });

  const testMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/setup/technical/test/stripe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secretKey }),
      });
      return res.json();
    },
    onSuccess: (data: any) => setTestResult({
      success: !!data?.success,
      // message -> error -> generic, so a failed test never renders a bare red cross.
      message: data?.message || data?.error || (data?.success ? 'Verified' : 'Test failed — check the details above.'),
    }),
    onError: (err) => setTestResult({ success: false, message: (err as Error).message }),
  });

  const isValid = publishableKey.startsWith('pk_') && (secretKey.startsWith('sk_') || current?.stripe?.secretKeySet);

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
          <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
            <CreditCard className="w-5 h-5 text-purple-600 dark:text-purple-300" />
          </div>
          <div>
            <CardTitle>Stripe Payments</CardTitle>
            <CardDescription>
              Connect Stripe to accept payments for bookings, invoices, and products.
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6 px-6">
        {/* Help link */}
        <a
          href="https://dashboard.stripe.com/apikeys"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
        >
          <ExternalLink className="w-4 h-4" />
          Open Stripe API Keys Dashboard
        </a>

        {/* Publishable Key */}
        <div className="space-y-2">
          <Label htmlFor="publishableKey">
            Publishable Key <span className="text-red-500">*</span>
          </Label>
          <Input
            id="publishableKey"
            placeholder="pk_live_... or pk_test_..."
            value={publishableKey}
            onChange={e => setPublishableKey(e.target.value)}
            className="font-mono text-sm"
          />
          <p className="text-xs text-slate-500">
            Starts with <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">pk_live_</code> or{' '}
            <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">pk_test_</code>
          </p>
        </div>

        {/* Secret Key */}
        <div className="space-y-2">
          <Label htmlFor="secretKey">
            Secret Key <span className="text-red-500">*</span>
            {current?.stripe?.secretKeySet && <span className="text-green-600 text-xs ml-2">(saved)</span>}
          </Label>
          <Input
            id="secretKey"
            type="password"
            placeholder={current?.stripe?.secretKeySet ? '••••••••' : 'sk_live_... or sk_test_...'}
            value={secretKey}
            onChange={e => setSecretKey(e.target.value)}
            className="font-mono text-sm"
          />
          <p className="text-xs text-slate-500">
            Encrypted before storage. Never exposed in the browser.
          </p>
        </div>

        {/* Webhook Secret */}
        <div className="space-y-2">
          <Label htmlFor="webhookSecret">
            Webhook Secret (optional)
            {current?.stripe?.webhookSecretSet && <span className="text-green-600 text-xs ml-2">(saved)</span>}
          </Label>
          <Input
            id="webhookSecret"
            type="password"
            placeholder={current?.stripe?.webhookSecretSet ? '••••••••' : 'whsec_...'}
            value={webhookSecret}
            onChange={e => setWebhookSecret(e.target.value)}
            className="font-mono text-sm"
          />
          <p className="text-xs text-slate-500">
            Required for receiving Stripe webhook events (subscription updates, payment confirmations).
          </p>
        </div>

        {/* Test Connection */}
        <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">Test Connection</h4>
            <Button
              variant="outline"
              size="sm"
              onClick={() => testMutation.mutate()}
              disabled={!secretKey.startsWith('sk_') || testMutation.isPending}
            >
              {testMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Verify Key'
              )}
            </Button>
          </div>
          {testResult && (
            <div className={`mt-3 flex items-start gap-2 text-sm ${
              testResult.success ? 'text-green-600' : 'text-red-600'
            }`}>
              {testResult.success ? <CheckCircle2 className="w-4 h-4 mt-0.5" /> : <XCircle className="w-4 h-4 mt-0.5" />}
              <div>
                <div>{testResult.message}</div>
                {testResult.success && testResult.accountId && (
                  <div className="text-xs text-slate-500 mt-1">
                    Account: {testResult.accountId}
                    {testResult.businessName && ` — ${testResult.businessName}`}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Info box */}
        <div className="flex gap-3 p-4 rounded-lg bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800">
          <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-700 dark:text-amber-300">
            <strong>Security:</strong> Your secret key is encrypted with AES-256-GCM before being stored
            in the database. It's never logged or exposed in API responses.
          </div>
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
            disabled={!isValid || saveMutation.isPending}
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
