/**
 * ExtrasStep — AI keys, Google OAuth, analytics, SMS (all optional)
 */

import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  ArrowLeft, ArrowRight, Sparkles, Loader2, CheckCircle2, XCircle,
  ChevronDown, ChevronUp, Bot, BarChart3, MessageSquare
} from 'lucide-react';

interface Props {
  onComplete: () => void;
  onBack: () => void;
}

export default function ExtrasStep({ onComplete, onBack }: Props) {
  // AI
  const [openaiApiKey, setOpenaiApiKey] = useState('');
  
  // Google
  const [googleClientId, setGoogleClientId] = useState('');
  const [googleClientSecret, setGoogleClientSecret] = useState('');
  const [googleCalendarId, setGoogleCalendarId] = useState('');

  // Analytics
  const [ga4MeasurementId, setGa4MeasurementId] = useState('');
  const [metaPixelId, setMetaPixelId] = useState('');

  // SMS
  const [smsProvider, setSmsProvider] = useState('');
  const [smsAccountSid, setSmsAccountSid] = useState('');
  const [smsAuthToken, setSmsAuthToken] = useState('');
  const [smsFromNumber, setSmsFromNumber] = useState('');

  // Social & Reviews — each studio connects ITS OWN accounts
  const [googlePlacesApiKey, setGooglePlacesApiKey] = useState('');
  const [googlePlacesPlaceId, setGooglePlacesPlaceId] = useState('');
  const [pulseApiKey, setPulseApiKey] = useState('');
  const [pulseMode, setPulseMode] = useState('draft');
  const [pulseInstagram, setPulseInstagram] = useState('');
  const [pulseFacebook, setPulseFacebook] = useState('');

  // Sections
  const [showGoogle, setShowGoogle] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showSms, setShowSms] = useState(false);
  const [showSocial, setShowSocial] = useState(false);

  // Test AI
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const { data: current, isLoading } = useQuery({
    queryKey: ['tech-setup-current'],
    queryFn: () => fetch('/api/setup/technical/current').then(r => r.json()),
    staleTime: 5000,
  });

  useEffect(() => {
    if (current?.extras) {
      const e = current.extras;
      setGoogleClientId(e.googleClientId || '');
      setGoogleCalendarId(e.googleCalendarId || '');
      setGa4MeasurementId(e.ga4MeasurementId || '');
      setMetaPixelId(e.metaPixelId || '');
      setSmsProvider(e.smsProvider || '');
      setSmsAccountSid(e.smsAccountSid || '');
      setSmsFromNumber(e.smsFromNumber || '');
      if (e.googleClientId || e.googleOAuthManaged) setShowGoogle(true);
      if (e.ga4MeasurementId || e.metaPixelId) setShowAnalytics(true);
      if (e.smsProvider) setShowSms(true);
    }
  }, [current]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/setup/technical/extras', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          openaiApiKey: openaiApiKey || undefined,
          googleClientId: showGoogle ? googleClientId : undefined,
          googleClientSecret: showGoogle ? googleClientSecret : undefined,
          googleCalendarId: showGoogle ? googleCalendarId : undefined,
          ga4MeasurementId: showAnalytics ? ga4MeasurementId : undefined,
          metaPixelId: showAnalytics ? metaPixelId : undefined,
          smsProvider: showSms ? smsProvider : undefined,
          smsAccountSid: showSms ? smsAccountSid : undefined,
          smsAuthToken: showSms ? smsAuthToken : undefined,
          smsFromNumber: showSms ? smsFromNumber : undefined,
          googlePlacesApiKey: googlePlacesApiKey || undefined,
          googlePlacesPlaceId: googlePlacesPlaceId || undefined,
          pulseApiKey: pulseApiKey || undefined,
          pulseMode: pulseMode || undefined,
          pulseProfiles: (pulseInstagram || pulseFacebook)
            ? { instagram: pulseInstagram, facebook: pulseFacebook }
            : undefined,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Save failed');
      return res.json();
    },
    onSuccess: () => onComplete(),
  });

  const testAiMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/setup/technical/test/openai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: openaiApiKey }),
      });
      return res.json();
    },
    onSuccess: (data) => setTestResult(data),
    onError: (err) => setTestResult({ success: false, message: (err as Error).message }),
  });

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
          <div className="p-2 bg-amber-100 dark:bg-amber-900 rounded-lg">
            <Sparkles className="w-5 h-5 text-amber-600 dark:text-amber-300" />
          </div>
          <div>
            <CardTitle>AI & Extras</CardTitle>
            <CardDescription>
              All optional. Configure AI assistants, Google integrations, analytics, and SMS.
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6 px-6 max-h-[60vh] overflow-y-auto">
        {/* AI Section */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <Bot className="w-4 h-4" /> AI
          </h3>

          <div className="space-y-2">
            <Label htmlFor="openaiApiKey">
              OpenAI API Key
              {current?.extras?.openaiKeySet && <span className="text-green-600 text-xs ml-2">(saved)</span>}
            </Label>
            <Input
              id="openaiApiKey"
              type="password"
              placeholder={current?.extras?.openaiKeySet ? '••••••••' : 'sk-...'}
              value={openaiApiKey}
              onChange={e => setOpenaiApiKey(e.target.value)}
              className="font-mono text-sm"
            />
          </div>

          {/* Test AI */}
          {openaiApiKey && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => testAiMutation.mutate()}
                disabled={testAiMutation.isPending}
              >
                {testAiMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Test OpenAI'}
              </Button>
              {testResult && (
                <span className={`text-sm flex items-center gap-1 ${testResult.success ? 'text-green-600' : 'text-red-600'}`}>
                  {testResult.success ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                  {testResult.message}
                </span>
              )}
            </div>
          )}

        </div>

        {/* Google Section (collapsible) */}
        <div className="border rounded-lg">
          <button
            className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            onClick={() => setShowGoogle(!showGoogle)}
          >
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Google OAuth & Calendar
            </span>
            {showGoogle ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {showGoogle && (
            <div className="p-4 pt-0 space-y-4">
              {current?.extras?.googleOAuthManaged ? (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                  ✓ <strong>Google sign-in is managed for you — no keys needed.</strong> After you finish setup and log in,
                  open <strong>Calendar → Connect Google Calendar</strong> and sign in once. Your events then sync automatically.
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="googleClientId">Client ID</Label>
                    <Input
                      id="googleClientId"
                      placeholder="...apps.googleusercontent.com"
                      value={googleClientId}
                      onChange={e => setGoogleClientId(e.target.value)}
                      className="font-mono text-xs"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="googleClientSecret">
                      Client Secret
                      {current?.extras?.googleClientSecretSet && <span className="text-green-600 text-xs ml-2">(saved)</span>}
                    </Label>
                    <Input
                      id="googleClientSecret"
                      type="password"
                      placeholder={current?.extras?.googleClientSecretSet ? '••••••••' : 'GOCSPX-...'}
                      value={googleClientSecret}
                      onChange={e => setGoogleClientSecret(e.target.value)}
                    />
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="googleCalendarId">Google Calendar ID <span className="text-slate-400 text-xs">(optional)</span></Label>
                <Input
                  id="googleCalendarId"
                  placeholder="primary or calendar@group.calendar.google.com"
                  value={googleCalendarId}
                  onChange={e => setGoogleCalendarId(e.target.value)}
                />
                <p className="text-xs text-slate-500">Leave blank to use your main calendar — set this only to sync a specific shared calendar.</p>
              </div>
            </div>
          )}
        </div>

        {/* Analytics Section (collapsible) */}
        <div className="border rounded-lg">
          <button
            className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            onClick={() => setShowAnalytics(!showAnalytics)}
          >
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <BarChart3 className="w-4 h-4" /> Analytics
            </span>
            {showAnalytics ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {showAnalytics && (
            <div className="p-4 pt-0 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ga4MeasurementId">GA4 Measurement ID</Label>
                  <Input
                    id="ga4MeasurementId"
                    placeholder="G-XXXXXXXXXX"
                    value={ga4MeasurementId}
                    onChange={e => setGa4MeasurementId(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="metaPixelId">Meta Pixel ID</Label>
                  <Input
                    id="metaPixelId"
                    placeholder="1234567890"
                    value={metaPixelId}
                    onChange={e => setMetaPixelId(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* SMS Section (collapsible) */}
        <div className="border rounded-lg">
          <button
            className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            onClick={() => setShowSms(!showSms)}
          >
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <MessageSquare className="w-4 h-4" /> SMS Notifications
            </span>
            {showSms ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {showSms && (
            <div className="p-4 pt-0 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="smsProvider">Provider</Label>
                <select
                  id="smsProvider"
                  value={smsProvider}
                  onChange={e => setSmsProvider(e.target.value)}
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
                >
                  <option value="">Select a provider...</option>
                  <option value="twilio">Twilio</option>
                  <option value="vonage">Vonage (Nexmo)</option>
                  <option value="messagebird">MessageBird</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="smsAccountSid">Account SID</Label>
                  <Input
                    id="smsAccountSid"
                    placeholder="AC..."
                    value={smsAccountSid}
                    onChange={e => setSmsAccountSid(e.target.value)}
                    className="font-mono text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smsAuthToken">
                    Auth Token
                    {current?.extras?.smsAuthTokenSet && <span className="text-green-600 text-xs ml-2">(saved)</span>}
                  </Label>
                  <Input
                    id="smsAuthToken"
                    type="password"
                    placeholder={current?.extras?.smsAuthTokenSet ? '••••••••' : 'Auth token'}
                    value={smsAuthToken}
                    onChange={e => setSmsAuthToken(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="smsFromNumber">From Number</Label>
                <Input
                  id="smsFromNumber"
                  placeholder="+1234567890"
                  value={smsFromNumber}
                  onChange={e => setSmsFromNumber(e.target.value)}
                />
              </div>
            </div>
          )}
        </div>

        {/* ── Social & Reviews — per-tenant, so each studio connects ITS OWN
            Google Business Profile and social accounts. Previously these were
            host env vars, which made the CRM unsellable as self-serve. ── */}
        <div className="border-t pt-6">
          <button
            type="button"
            onClick={() => setShowSocial(!showSocial)}
            className="flex items-center justify-between w-full text-left"
          >
            <div>
              <h3 className="font-medium text-slate-900 dark:text-slate-100">Reviews &amp; Social posting (optional)</h3>
              <p className="text-xs text-slate-500">
                Show your real Google reviews on your site, and post blog articles to your own social accounts.
              </p>
            </div>
            {showSocial ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showSocial && (
            <div className="mt-4 space-y-5">
              <div className="space-y-2">
                <Label htmlFor="googlePlacesApiKey">Google Places API key</Label>
                <Input
                  id="googlePlacesApiKey"
                  type="password"
                  placeholder="AIza…"
                  value={googlePlacesApiKey}
                  onChange={e => setGooglePlacesApiKey(e.target.value)}
                />
                <p className="text-xs text-slate-500">
                  Lets your website show your <strong>real Google reviews and star rating</strong>, updating
                  automatically. Create one in Google Cloud Console and restrict it to &ldquo;Places API (New)&rdquo;.
                  Leave blank to use your own hand-written reviews instead.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="googlePlacesPlaceId">Your Google Place ID</Label>
                <Input
                  id="googlePlacesPlaceId"
                  placeholder="ChIJ…"
                  value={googlePlacesPlaceId}
                  onChange={e => setGooglePlacesPlaceId(e.target.value)}
                />
                <p className="text-xs text-slate-500">
                  Identifies <em>your</em> business on Google. Find it with Google&apos;s Place ID finder.
                </p>
              </div>

              <div className="space-y-2 pt-2 border-t">
                <Label htmlFor="pulseApiKey">Social posting API key (Pulse)</Label>
                <Input
                  id="pulseApiKey"
                  type="password"
                  placeholder="pls_live_…"
                  value={pulseApiKey}
                  onChange={e => setPulseApiKey(e.target.value)}
                />
                <p className="text-xs text-slate-500">
                  Optional. Lets you push blog posts to Facebook, Instagram, LinkedIn and more.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pulseInstagram">Instagram account ID</Label>
                  <Input
                    id="pulseInstagram"
                    placeholder="1784…"
                    value={pulseInstagram}
                    onChange={e => setPulseInstagram(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pulseFacebook">Facebook Page ID</Label>
                  <Input
                    id="pulseFacebook"
                    placeholder="4719…"
                    value={pulseFacebook}
                    onChange={e => setPulseFacebook(e.target.value)}
                  />
                </div>
              </div>
              <p className="text-xs text-amber-700 dark:text-amber-400">
                Pin these to <strong>your own</strong> accounts. If left blank, posts go to whichever account is
                the default in your social workspace — which is how posts end up on the wrong profile.
              </p>

              <div className="space-y-2">
                <Label htmlFor="pulseMode">When posting, by default</Label>
                <select
                  id="pulseMode"
                  value={pulseMode}
                  onChange={e => setPulseMode(e.target.value)}
                  className="w-full border border-slate-300 dark:border-slate-700 rounded-md px-3 py-2 text-sm bg-transparent"
                >
                  <option value="draft">Save as a draft for me to review (safest)</option>
                  <option value="schedule">Schedule at the post&apos;s publish time</option>
                  <option value="now">Publish immediately</option>
                </select>
                <p className="text-xs text-slate-500">
                  Start with drafts until you&apos;ve confirmed posts land on the right accounts.
                </p>
              </div>
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="flex justify-between px-6 pt-4">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onComplete}>Skip all extras</Button>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
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
