import React, { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import SetupNarrator from '@/components/setup/SetupNarrator';
import { Loader2, ImagePlus, Check, ArrowRight, AlertCircle } from 'lucide-react';

/**
 * The homepage-generation states that mean the run has STOPPED.
 *
 * Mirrors HomepageGenStatus in server/lib/homepage-pipeline.ts, minus 'idle' and 'running'.
 * Two components poll that run — this one and ScanningPhase — and both have to agree on when
 * to stop asking, or one of them polls a finished job for as long as the studio leaves the tab
 * open while telling them work is still happening.
 *
 * scripts/ui-verify-onboarding.mjs reads the states out of the pipeline and checks this list
 * against them, so a state added there fails the check rather than silently never arriving.
 */
const GEN_TERMINAL = ['ready', 'error', 'skipped', 'quota_exceeded'];

/**
 * Collect the photographs the site is built around.
 *
 * Placed AFTER the crawl, deliberately. Half of these slots cannot be named until the
 * Authority Map exists — you cannot ask a photographer for "an image for your Wedding
 * Photography page" before the crawl has told you they shoot weddings. The site-wide
 * slots could be asked earlier, but file storage is not configured until the Storage step,
 * so there is nowhere to put an upload before then either.
 *
 * Every slot is optional. A studio that skips this gets a site whose image blocks are
 * absent rather than broken — the components already hide themselves on an empty URL.
 * What it must never do is ship placeholder photography, which is how another studio's
 * pictures ended up on every buyer's homepage in the first place.
 */

interface Slot {
  section: string;
  label: string;
  hint: string;
  group: 'site' | 'pillar';
  /** Which page this slot belongs to, so the service slots can be grouped by page. */
  page?: string;
  url: string | null;
  filled: boolean;
}

interface SiteImages {
  logoUrl: string | null;
  pillarsReady: boolean;
  slots: Slot[];
  filled: number;
  total: number;
  /** False when no upload on this instance can succeed. Optional: an older server omits it. */
  storageReady?: boolean;
}

interface CrawledImage {
  url: string;
  label: string;
  fromPage: string;
}

/**
 * The studio's own photographs, offered for a slot.
 *
 * The crawler has recorded every image on their existing site since it shipped and nothing
 * read them back, so this step asked a photographer to hunt down and re-upload nine images
 * they had already published. The obvious shortcut is stock, and this product must not take
 * it — placeholder photography is how the origin studio's pictures ended up on every
 * buyer's homepage. Their own work is a better answer than any stock library anyway.
 */
function OwnPhotographs({
  slot,
  images,
  onUsed,
}: {
  slot: Slot;
  images: CrawledImage[];
  onUsed: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!images.length) return null;

  const use = async (img: CrawledImage) => {
    setBusy(img.url);
    setError(null);
    try {
      const res = await fetch('/api/setup/use-crawled-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section: slot.section, url: img.url, alt: img.label || slot.label }),
      });
      if (!res.ok) {
        throw new Error((await res.json().catch(() => ({}))).error || 'Could not use that image');
      }
      setOpen(false);
      onUsed();
    } catch (e: any) {
      setError(e?.message || 'Could not use that image');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full text-xs text-violet-700 dark:text-violet-300 hover:underline"
      >
        {open ? 'Hide your photographs' : `Use one of your ${images.length} photographs`}
      </button>

      {open && (
        <div className="mt-2">
          <div className="grid grid-cols-3 gap-1.5 max-h-44 overflow-y-auto">
            {images.map((img) => (
              <button
                key={img.url}
                type="button"
                onClick={() => use(img)}
                disabled={!!busy}
                title={img.label || img.url}
                className="relative aspect-square rounded overflow-hidden border border-slate-200 dark:border-slate-700 hover:border-violet-500 disabled:opacity-50"
              >
                {/* Loaded straight from their own site for the preview. Only the one they
                    choose gets downloaded and stored in their bucket. */}
                <img src={img.url} alt={img.label} loading="lazy" className="w-full h-full object-cover" />
                {busy === img.url && (
                  <span className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                  </span>
                )}
              </button>
            ))}
          </div>
          <p className="text-[0.7rem] text-slate-500 mt-1.5">
            Found on your website. We copy it into your own storage, so it keeps working
            after your old site goes.
          </p>
          {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
        </div>
      )}
    </div>
  );
}

function SlotCard({
  slot,
  onUploaded,
  ownImages,
  storageReady = true,
}: {
  slot: Slot;
  onUploaded: () => void;
  ownImages: CrawledImage[];
  storageReady?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const upload = useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData();
      fd.append('section', slot.section);
      fd.append('file', file);
      fd.append('alt', slot.label);
      const res = await fetch('/api/setup/upload-image', { method: 'POST', body: fd });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Upload failed');
      return res.json();
    },
    onSuccess: () => { setError(null); onUploaded(); },
    onError: (e: any) => setError(e.message || 'Upload failed'),
  });

  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col">
      <div className="aspect-[4/3] bg-slate-100 dark:bg-slate-800 relative flex items-center justify-center">
        {slot.url ? (
          <img src={slot.url} alt="" className="w-full h-full object-cover" />
        ) : (
          <ImagePlus className="w-8 h-8 text-slate-300 dark:text-slate-600" />
        )}
        {upload.isPending && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-white" />
          </div>
        )}
        {slot.filled && !upload.isPending && (
          <span className="absolute top-2 right-2 bg-green-600 text-white rounded-full p-1">
            <Check className="w-3 h-3" />
          </span>
        )}
      </div>
      <div className="p-3 flex-1 flex flex-col">
        <p className="font-medium text-sm text-slate-800 dark:text-slate-100">{slot.label}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex-1">{slot.hint}</p>
        {error && (
          <p className="text-xs text-red-600 mt-2 flex items-start gap-1">
            <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />{error}
          </p>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) upload.mutate(f);
            e.target.value = '';
          }}
        />
        <Button
          variant="outline"
          size="sm"
          className="mt-3 w-full"
          onClick={() => inputRef.current?.click()}
          disabled={upload.isPending || !storageReady}
        >
          {slot.filled ? 'Replace' : 'Add image'}
        </Button>
        {/* The picker goes through the same upload path, so it is subject to the same
            answer — offering it while uploads cannot succeed shows a studio their own
            photographs and then refuses to give them one. */}
        {storageReady && <OwnPhotographs slot={slot} images={ownImages} onUsed={onUploaded} />}
      </div>
    </div>
  );
}

/**
 * `only` splits this step in two without splitting the component.
 *
 * The site-wide slots — hero and two content images — are named up front and need nothing
 * from the crawl. The service slots cannot even be LISTED until the Authority Map exists,
 * because you cannot ask a photographer for "an image for your Drone Photography page"
 * before the crawl has told you they fly drones.
 *
 * So the site slots move to the front of onboarding, where they run while the crawl works,
 * and the service slots stay behind it. A second component would have been the obvious way
 * to do that and the wrong one: both halves share the slot card, the upload path, the
 * crawled-photograph picker and the refresh, and this codebase has spent the week paying
 * for copies of things that drifted.
 */
export type ImageSlotGroup = 'site' | 'pillar' | 'all';

export default function SiteImagesPhase({
  onComplete,
  only = 'all',
  startScan = false,
}: {
  onComplete: () => void;
  only?: ImageSlotGroup;
  /** Kick the website read off as this step opens, so it runs behind the uploading. */
  startScan?: boolean;
}) {
  const qc = useQueryClient();
  // Poll while the pillars are still missing.
  //
  // homepage-pipeline fires the Authority-Map and scaffold chain WITHOUT awaiting it and
  // then reports status 'ready', so the crawl step can hand over before the map exists. A
  // single fetch here meant a studio who clicked through promptly saw pillarsReady:false,
  // read "we'll ask once we've finished reading your website", and was never asked — the
  // one part of this step that cannot be done later without knowing the slot names.
  // Stops polling the moment the pillars arrive.
  // Their own photographs, from the crawl. Fetched once for the step rather than per slot —
  // there are up to nine slots and the answer is the same for all of them.
  const { data: own } = useQuery<{ images: CrawledImage[] }>({
    queryKey: ['setup-crawled-images'],
    queryFn: () => fetch('/api/setup/crawled-images').then((r) => r.json()),
    staleTime: 5 * 60 * 1000,
  });
  const ownImages = own?.images || [];

  const { data, isLoading } = useQuery<SiteImages>({
    queryKey: ['setup-site-images'],
    queryFn: () => fetch('/api/setup/site-images').then((r) => r.json()),
    refetchInterval: (q) => (q.state.data?.pillarsReady ? false : 4000),
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ['setup-site-images'] });

  // The whole point of moving this step forward: the website read starts HERE and runs
  // while the studio picks photographs, so two useful things happen at once instead of one
  // of them being watched. The endpoint refuses to double-fire a running job, so the scan
  // step calling it again later is harmless, and skipping this step changes nothing.
  useEffect(() => {
    if (!startScan) return;
    fetch('/api/setup/homepage/generate', { method: 'POST' }).catch(() => {
      /* The scan step will try again. Never block the upload on this. */
    });
  }, [startScan]);

  // What the read is finding, while they choose photographs. The same feed the scan step
  // shows — not a second progress display with its own idea of what is happening.
  const { data: gen } = useQuery<any>({
    queryKey: ['homepage-gen-status'],
    queryFn: () => fetch('/api/setup/homepage/status').then((r) => r.json()),
    // Stops when the run stops. This was a flat `startScan ? 2500 : false`, so the poll kept
    // firing every 2.5 seconds for as long as the step was mounted — long after the run had
    // ended in error, skipped or quota_exceeded — and the copy below went on saying "Still
    // reading your website" under an animated spinner, for ever, over a run that was finished.
    refetchInterval: (q) => (startScan && !GEN_TERMINAL.includes(q.state.data?.status) ? 2500 : false),
    enabled: startScan,
  });
  const readRunning = gen?.status === 'running';
  const readFindings = Array.isArray(gen?.findings) ? gen.findings : [];
  /** The run ended without producing service slots. Not "still reading". */
  const readStopped = GEN_TERMINAL.includes(gen?.status) && gen?.status !== 'ready';
  /**
   * The allowance ran out, which is NOT a failure to read the site.
   *
   * These were one state, and the copy for it blamed reading — "We couldn't read your services
   * from your website this time" — four lines below a panel saying "You shoot Giới Thiệu,
   * Wedding, Lưu Trữ Ảnh Cưới and 2 more". The crawl had worked perfectly; the WRITING was
   * refused. A studio reading both at once learns that the product does not know what it just
   * did, and the remedy they are pointed at is the wrong one: a read failure means check the
   * address, an exhausted allowance means it will not work however many times they retry.
   */
  const quotaSpent = gen?.status === 'quota_exceeded';

  if (isLoading) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardContent className="py-16 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></CardContent>
      </Card>
    );
  }

  const slots = data?.slots || [];
  const site = only === 'pillar' ? [] : slots.filter((s) => s.group === 'site');
  const pillars = only === 'site' ? [] : slots.filter((s) => s.group === 'pillar');

  // Counted over what this instance actually shows, so "0 of 3 added" does not become
  // "0 of 9" on a step that is only asking for three.
  // Defaults to true so a server that has not been redeployed yet behaves exactly as
  // before rather than locking every studio out of uploading.
  const storageReady = data?.storageReady !== false;
  const shown = [...site, ...pillars];
  const shownFilled = shown.filter((s) => s.filled).length;

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Your photographs</CardTitle>
        <CardDescription>
          Your own work, in the places visitors look first. Every one is optional — anything
          you skip simply won't show a picture, and you can add them later from Website
          Studio. We never substitute stock or someone else's photography.
          {startScan && (
            <>
              {' '}
              We are reading your existing website while you do this, so it is ready when
              you are.
            </>
          )}
        </CardDescription>
      </CardHeader>

      {/* Deliberately ABOVE the slots and deliberately small. The work is genuinely
          happening and worth seeing, but the studio's job on this screen is the
          photographs — this is the thing running behind them, not the subject. */}
      {startScan && (readRunning || readFindings.length > 0) && (
        <div className="px-6 pb-2">
          <p className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-2">
            {readRunning ? 'Meanwhile, we are reading your website' : 'We finished reading your website'}
          </p>
          <SetupNarrator findings={readFindings} busy={readRunning} />

          {/*
            The list is a record of what HAPPENED, and it stops at whatever the run was doing
            when it failed. Its last entry is "Writing your homepage in your own words", so a
            failed run leaves that sentence sitting there as the final word — with the heading
            above it saying the reading finished, and nothing anywhere saying the writing did
            not. Observed live: a tenant with no platform AI key showed exactly this, read as a
            hang, and was reported as the page crashing.

            The panel in ScanningPhase covers the same states, but that is step FIVE. This is
            step three, and the studio is looking at this screen while it happens.
          */}
          {readStopped && (
            <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">
              {quotaSpent
                ? `We read your website but have used up the site writing included with this
                   instance, so the homepage was not written. Nothing on this screen is affected
                   and your setup is not held up — your photographs and everything else save
                   normally.`
                : `We could not finish writing your homepage this time. Nothing on this screen is
                   affected, your setup is not held up, and you can create one from Website Studio
                   once setup is done.`}
            </p>
          )}
        </div>
      )}

      {/* Said once, at the top, instead of discovered once per slot after a file picker. */}
      {!storageReady && (
        <div className="px-6 pb-2">
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <p className="font-medium">We cannot store photographs yet</p>
            <p className="mt-1">
              Your file storage details have not been set, so there is nowhere to put an
              upload. Everything else works &mdash; the CRM, invoicing and your calendar are
              unaffected, and you can add photographs any time from Website Studio once
              storage is connected.
            </p>
            {/*
              This was a "Connect file storage" anchor pointing at the admin technical-setup
              route, and it could not work from here. That route is behind authenticateUser,
              and the admin
              account is created at step FOUR — so at this point in the wizard there is no
              session to authenticate. Clicking it navigated away, bounced off the guard, and
              landed back on setup, which reads exactly like the page refreshing itself. It was
              reported as the page crashing.

              Storage is a real step in the full setup, so the honest instruction is the one
              that reaches it: the toggle at the top of this screen, which is already on screen.
            */}
            <p className="mt-2 font-medium">
              Storage is one of the steps in <span className="underline underline-offset-2">Set everything up now</span>,
              at the top of this page — or connect it after setup from Technical Setup.
            </p>
          </div>
        </div>
      )}

      <CardContent className="space-y-8 max-h-[58vh] overflow-y-auto">
        {only !== 'pillar' && (
        <section>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-3">
            Your site
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {site.map((s) => <SlotCard key={s.section} slot={s} onUploaded={refresh} ownImages={ownImages} storageReady={storageReady} />)}
          </div>
        </section>
        )}

        {only !== 'site' && (
        <section>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
            Your services
          </h3>
          {data?.pillarsReady ? (
            <>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                These are the services we found on your website. We have already chosen a
                photograph for each from your own site — change any you would rather pick
                yourself.
              </p>
              {/*
                One block per page rather than one flat grid. Nine cards named "Main image",
                "First content block", "Second content block" three times over is unreadable
                without knowing which page each belongs to, and the page is the thing the
                studio is actually thinking about.
              */}
              <div className="space-y-6">
                {Array.from(new Set(pillars.map((s) => s.page || ''))).map((pageName) => {
                  const forPage = pillars.filter((s) => (s.page || '') === pageName);
                  return (
                    <div key={pageName || 'other'}>
                      {pageName && (
                        <h4 className="text-sm font-medium text-slate-800 dark:text-slate-200 mb-2">{pageName}</h4>
                      )}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        {forPage.map((s) => (
                          <SlotCard key={s.section} slot={s} onUploaded={refresh} ownImages={ownImages} storageReady={storageReady} />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            /* Honest about WHY the list is empty, and actively waiting rather than
               inviting the studio to move on — this is the one part of the step that
               cannot be done later, because the slot names come from the crawl.

               "Actively waiting" has to stop when the waiting does. The spinner and the words
               "Still reading" were shown whenever the list was empty, with no reference to
               whether the run was still going — so a run that ended in a refusal left a studio
               watching an animation describing work that had already stopped. */
            readStopped ? (
              <div className="text-sm text-slate-500 dark:text-slate-400 border border-dashed border-slate-300 dark:border-slate-700 rounded-lg p-4">
                {quotaSpent
                  ? `We found your services, but the site writing included with this instance has
                     been used up, so the pages behind them were not built and there are no
                     per-service slots yet. Nothing is lost — you can add images to any page from
                     Website Studio once setup is done.`
                  : `We couldn't read your services from your website this time, so there are no
                     per-service slots to fill here. Nothing is lost — you can add images to any
                     page from Website Studio once setup is done.`}
              </div>
            ) : (
            <div className="text-sm text-slate-500 dark:text-slate-400 border border-dashed border-slate-300 dark:border-slate-700 rounded-lg p-4 flex items-start gap-3">
              <Loader2 className="w-4 h-4 mt-0.5 animate-spin flex-shrink-0" />
              <span>
                Still reading your website. Your services will appear here in a moment, and
                we'll ask for one photograph each. If you skipped the website step there
                won't be any — you can add images from Website Studio later.
              </span>
            </div>
            )
          )}
        </section>
        )}
      </CardContent>

      <CardFooter className="flex items-center justify-between pt-4">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {shownFilled} of {shown.length} added
        </p>
        <Button onClick={onComplete}>
          {shownFilled === 0 ? 'Skip for now' : 'Continue'}
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </CardFooter>
    </Card>
  );
}
