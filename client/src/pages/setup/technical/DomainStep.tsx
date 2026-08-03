/**
 * DomainStep — "What's your website address?"
 *
 * A studio owner should not have to understand "API backend", "CORS" or
 * "Express". They answer ONE plain question and we fill all three URLs; the
 * technical overrides stay available under Advanced for the rare split setup.
 */

import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, ArrowRight, Globe, Loader2, Info, ChevronDown, ChevronRight, Check } from 'lucide-react';

interface Props {
  onComplete: () => void;
  onBack: () => void;
}

/** Accepts "yourstudio.com" and turns it into "https://yourstudio.com". */
function normalizeUrl(value: string): string {
  const s = value.trim();
  if (!s) return '';
  const withProtocol = /^https?:\/\//i.test(s) ? s : `https://${s}`;
  return withProtocol.replace(/\/+$/, '');
}

export default function DomainStep({ onComplete, onBack }: Props) {
  const [siteUrl, setSiteUrl] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  // Advanced overrides — empty means "same as the website address".
  const [adminUrlOverride, setAdminUrlOverride] = useState('');
  const [publicUrlOverride, setPublicUrlOverride] = useState('');

  const { data: current, isLoading } = useQuery({
    queryKey: ['tech-setup-current'],
    queryFn: () => fetch('/api/setup/technical/current').then(r => r.json()),
    staleTime: 5000,
  });

  useEffect(() => {
    if (!current?.domain) return;
    const { appUrl = '', frontendUrl = '', publicSiteBaseUrl = '' } = current.domain;
    // The "website address" is the customer-facing one.
    setSiteUrl(frontendUrl || publicSiteBaseUrl || appUrl || '');
    // Only treat them as overrides when they genuinely differ.
    if (appUrl && frontendUrl && appUrl !== frontendUrl) {
      setAdminUrlOverride(appUrl);
      setShowAdvanced(true);
    }
    if (publicSiteBaseUrl && frontendUrl && publicSiteBaseUrl !== frontendUrl) {
      setPublicUrlOverride(publicSiteBaseUrl);
      setShowAdvanced(true);
    }
  }, [current]);

  const site = normalizeUrl(siteUrl);
  const appUrl = normalizeUrl(adminUrlOverride) || site;
  const publicSiteBaseUrl = normalizeUrl(publicUrlOverride) || site;

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/setup/technical/domain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appUrl, frontendUrl: site, publicSiteBaseUrl }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Save failed');
      return res.json();
    },
    onSuccess: () => onComplete(),
  });

  const isValid = site.length > 0;

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
            <Globe className="w-5 h-5 text-blue-600 dark:text-blue-300" />
          </div>
          <div>
            <CardTitle>Your website address</CardTitle>
            <CardDescription>The address customers type to find you online</CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6 px-6">
        <div className="space-y-2">
          <Label htmlFor="siteUrl">
            Website address <span className="text-red-500">*</span>
          </Label>
          <Input
            id="siteUrl"
            placeholder="www.yourstudio.com"
            value={siteUrl}
            onChange={e => setSiteUrl(e.target.value)}
          />
          <p className="text-xs text-slate-500">
            For example <strong>www.yourstudio.com</strong>. You don&apos;t need to type
            &ldquo;https://&rdquo; — we add it for you.
          </p>
        </div>

        {/* Show exactly what we'll use, so nothing feels hidden */}
        {isValid && (
          <div className="flex gap-3 p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
            <Check className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-emerald-800 dark:text-emerald-300">
              We&apos;ll use <strong className="break-all">{site}</strong> for your public website,
              your admin login and the links in your emails. That&apos;s all most studios need.
            </div>
          </div>
        )}

        {/* Advanced — only for split hosting setups */}
        <div className="pt-1">
          <button
            type="button"
            onClick={() => setShowAdvanced(v => !v)}
            className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900 dark:text-slate-300"
          >
            {showAdvanced ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            Advanced — my admin or public site uses a different address
          </button>

          {showAdvanced && (
            <div className="mt-4 space-y-5 border-l-2 border-slate-200 dark:border-slate-700 pl-4">
              <p className="text-xs text-slate-500">
                Most studios can leave these blank. Only fill them in if someone set your site up
                across more than one address.
              </p>

              <div className="space-y-2">
                <Label htmlFor="adminUrl">Admin login address (optional)</Label>
                <Input
                  id="adminUrl"
                  placeholder={site || 'https://admin.yourstudio.com'}
                  value={adminUrlOverride}
                  onChange={e => setAdminUrlOverride(e.target.value)}
                />
                <p className="text-xs text-slate-500">
                  Where you sign in to manage bookings and photos. Leave blank to use your website address.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="publicUrl">Public website address (optional)</Label>
                <Input
                  id="publicUrl"
                  placeholder={site || 'https://www.yourstudio.com'}
                  value={publicUrlOverride}
                  onChange={e => setPublicUrlOverride(e.target.value)}
                />
                <p className="text-xs text-slate-500">
                  The site your customers see, if it&apos;s separate from your admin. Leave blank to use your website address.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3 p-4 rounded-lg bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-700 dark:text-blue-300">
            <strong>Not sure?</strong> Use the address you&apos;d give a customer on a business card.
            You can change this later in Settings.
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
            Save &amp; Continue
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </CardFooter>

      {saveMutation.isError && (
        <div className="px-6 pb-4">
          <p className="text-sm text-red-600">
            {(saveMutation.error as Error).message}
          </p>
        </div>
      )}
    </>
  );
}
