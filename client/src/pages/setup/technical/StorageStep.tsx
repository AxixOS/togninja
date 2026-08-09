/**
 * StorageStep — Backblaze B2 / AWS S3 / Cloudflare R2 configuration
 */

import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  ArrowLeft, ArrowRight, HardDrive, Loader2, CheckCircle2, XCircle, Info
} from 'lucide-react';

interface Props {
  onComplete: () => void;
  onBack: () => void;
}

const PROVIDERS = [
  { value: 'backblaze', label: 'Backblaze B2', description: 'Cost-effective S3-compatible storage' },
  { value: 's3', label: 'AWS S3', description: 'Amazon Web Services S3' },
  { value: 'r2', label: 'Cloudflare R2', description: 'Zero egress-fee S3-compatible storage' },
  { value: 'custom', label: 'Custom S3', description: 'Any S3-compatible endpoint' },
];

export default function StorageStep({ onComplete, onBack }: Props) {
  const [provider, setProvider] = useState('backblaze');
  const [accessKeyId, setAccessKeyId] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [bucket, setBucket] = useState('');
  const [endpoint, setEndpoint] = useState('');
  const [region, setRegion] = useState('');
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const { data: current, isLoading } = useQuery({
    queryKey: ['tech-setup-current'],
    queryFn: () => fetch('/api/setup/technical/current').then(r => r.json()),
    staleTime: 5000,
  });

  useEffect(() => {
    if (current?.storage) {
      const s = current.storage;
      setProvider(s.provider || 'backblaze');
      setAccessKeyId(s.accessKeyId || '');
      setBucket(s.bucket || '');
      setEndpoint(s.endpoint || '');
      setRegion(s.region || '');
    }
  }, [current]);

  // Auto-fill endpoint hint based on provider
  const endpointPlaceholder = provider === 'backblaze'
    ? 'https://s3.us-west-004.backblazeb2.com'
    : provider === 'r2'
    ? 'https://<account_id>.r2.cloudflarestorage.com'
    : provider === 's3'
    ? '(leave empty for default AWS)'
    : 'https://your-endpoint.com';

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/setup/technical/storage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, accessKeyId, secretKey, bucket, endpoint, region }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Save failed');
      return res.json();
    },
    onSuccess: () => onComplete(),
  });

  const testMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/setup/technical/test/storage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessKeyId, secretKey, bucket, endpoint, region }),
      });
      return res.json();
    },
    // Never render a bare cross: fall back through message -> error -> a generic line,
    // so a failed test always says something the studio can act on.
    onSuccess: (data: any) => setTestResult({
      success: !!data?.success,
      message: data?.message || data?.error || (data?.success ? 'Connected' : 'Connection failed — check the keys, bucket and endpoint.'),
    }),
    onError: (err) => setTestResult({ success: false, message: (err as Error).message || 'Connection failed' }),
  });

  const isValid = accessKeyId.trim() && bucket.trim() && (secretKey || current?.storage?.secretKeySet);

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
          <div className="p-2 bg-emerald-100 dark:bg-emerald-900 rounded-lg">
            <HardDrive className="w-5 h-5 text-emerald-600 dark:text-emerald-300" />
          </div>
          <div>
            <CardTitle>Cloud Storage (Backblaze B2)</CardTitle>
            <CardDescription>
              Configure Backblaze B2 (or another S3-compatible provider). This powers Cloud Storage,
              client galleries, voucher &amp; landing-page images, and all file uploads.
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6 px-6">
        {/* Provider selector */}
        <div className="space-y-2">
          <Label>Storage Provider</Label>
          <div className="grid grid-cols-2 gap-2">
            {PROVIDERS.map(p => (
              <button
                key={p.value}
                onClick={() => setProvider(p.value)}
                className={`text-left p-3 rounded-lg border transition-all ${
                  provider === p.value
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50 ring-1 ring-emerald-500'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                }`}
              >
                <div className="text-sm font-medium">{p.label}</div>
                <div className="text-xs text-slate-500">{p.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Credentials */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="accessKeyId">
              Access Key ID{provider === 'backblaze' && <span className="font-normal text-slate-400"> — Backblaze keyID</span>} <span className="text-red-500">*</span>
            </Label>
            <Input
              id="accessKeyId"
              placeholder={provider === 'backblaze' ? 'Backblaze keyID (App Keys)' : 'Your access key'}
              value={accessKeyId}
              onChange={e => setAccessKeyId(e.target.value)}
              className="font-mono text-sm"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="storageSecretKey">
              Secret Key{provider === 'backblaze' && <span className="font-normal text-slate-400"> — Backblaze applicationKey</span>} <span className="text-red-500">*</span>
              {current?.storage?.secretKeySet && <span className="text-green-600 text-xs ml-2">(saved)</span>}
            </Label>
            <Input
              id="storageSecretKey"
              type="password"
              placeholder={current?.storage?.secretKeySet ? '••••••••' : (provider === 'backblaze' ? 'Backblaze applicationKey' : 'Your secret key')}
              value={secretKey}
              onChange={e => setSecretKey(e.target.value)}
              className="font-mono text-sm"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="bucket">
            Bucket Name <span className="text-red-500">*</span>
          </Label>
          <Input
            id="bucket"
            placeholder="my-studio-files"
            value={bucket}
            onChange={e => setBucket(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="endpoint">
              Endpoint URL {provider !== 's3' && <span className="text-red-500">*</span>}
            </Label>
            <Input
              id="endpoint"
              placeholder={endpointPlaceholder}
              value={endpoint}
              onChange={e => setEndpoint(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="region">Region</Label>
            <Input
              id="region"
              placeholder="us-west-004"
              value={region}
              onChange={e => setRegion(e.target.value)}
            />
          </div>
        </div>

        {/* Test Connection */}
        <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">Test Connection</h4>
            <Button
              variant="outline"
              size="sm"
              onClick={() => testMutation.mutate()}
              disabled={!accessKeyId || !secretKey || !bucket || testMutation.isPending}
            >
              {testMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Verify Bucket'
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

        {/* Info */}
        <div className="flex gap-3 p-4 rounded-lg bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-700 dark:text-blue-300">
            <strong>Backblaze B2 users:</strong> Make sure your bucket is set to "Public" or has appropriate
            CORS rules. The endpoint typically looks like <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">
            https://s3.us-west-004.backblazeb2.com</code>
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
