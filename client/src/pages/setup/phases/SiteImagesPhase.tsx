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
  /**
   * The sponsors' logos, hidden as the browser learns their size.
   *
   * The server-side assignment now measures shape before using an image, so a bank logo no
   * longer lands on the homepage by itself. This list did not get the same treatment, so the
   * studio was still offered "34 photographs" that were largely Mattel, Vapiano, Canon and
   * Trayport — every brand their site has ever mentioned, presented as their own work to
   * choose a hero from.
   *
   * Measuring these server-side would mean downloading thirty-four images per request on a
   * list endpoint. The browser is already fetching every one of them for the preview, so the
   * dimensions arrive at no cost at all — naturalWidth/naturalHeight on the load event the
   * thumbnail was going to fire anyway. Same thresholds as assignCrawledImages.ts.
   */
  const [notPhotographs, setNotPhotographs] = useState<Set<string>>(new Set());
  const judge = (url: string, el: HTMLImageElement) => {
    const w = el.naturalWidth || 0;
    const h = el.naturalHeight || 0;
    if (!w || !h) return;
    const banner = Math.max(w / h, h / w) > 3;
    if (w < 500 || h < 350 || banner) {
      setNotPhotographs((prev) => (prev.has(url) ? prev : new Set(prev).add(url)));
    }
  };

  const shown = images.filter((i) => !notPhotographs.has(i.url));

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
        {open ? 'Hide your photographs' : `Use one of your ${shown.length} photograph${shown.length === 1 ? '' : 's'}`}
      </button>

      {open && (
        <div className="mt-2">
          <div className="grid grid-cols-3 gap-1.5 max-h-44 overflow-y-auto">
            {shown.map((img) => (
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
                <img
                  src={img.url}
                  alt={img.label}
                  loading="lazy"
                  onLoad={(e) => judge(img.url, e.currentTarget)}
                  className="w-full h-full object-cover"
                />
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
  crawlRunning = false,
}: {
  slot: Slot;
  onUploaded: () => void;
  ownImages: CrawledImage[];
  storageReady?: boolean;
  /** The read is still going, so this studio's own photographs are not all here yet. */
  crawlRunning?: boolean;
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
          disabled={upload.isPending || !storageReady || crawlRunning}
        >
          {slot.filled ? 'Replace' : 'Add image'}
        </Button>
        {/*
          NOTHING TO CLICK WHILE THE READ IS STILL GOING.

          These slots were live from the moment the step opened, next to a panel saying
          "Meanwhile, we are reading your website". So the offer was: go and find a file on
          your computer now, while we fetch the photographs already on your site. A studio who
          took it did the work twice — uploaded a hero by hand, then watched their own
          pictures appear underneath a minute later.

          Disabled, with the reason said out loud, is the honest version. It is a short wait
          and it ends with a better choice than the one being taken away.
        */}
        {crawlRunning && (
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Waiting until we have finished reading your website — your own photographs will
            appear here to choose from.
          </p>
        )}
        {/* The picker goes through the same upload path, so it is subject to the same
            answer — offering it while uploads cannot succeed shows a studio their own
            photographs and then refuses to give them one. */}
        {storageReady && !crawlRunning && (
          <OwnPhotographs slot={slot} images={ownImages} onUsed={onUploaded} />
        )}
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
    /**
     * ASK AGAIN WHILE THE READ IS STILL GOING.
     *
     * This was fetched exactly once, on the same mount that STARTS the crawl, with a five
     * minute staleTime and nothing anywhere invalidating the key. So the answer was
     * guaranteed to be the empty list for that whole visit, however long the studio waited
     * and however many photographs the crawler had by then found. Their pictures were
     * arriving in the database the entire time; the screen had simply stopped asking.
     *
     * Observed as "it found them but very delayed" — the delay was not the crawl, it was
     * this. Thirty-four photographs, sitting there, invisible until something else happened
     * to invalidate the query.
     *
     * Polls only while the run is unfinished, and stops the moment it is. Read from the
     * cache rather than a prop because the status query is declared below this one; a
     * terminal state ends the polling for both.
     */
    refetchInterval: () => {
      const run = qc.getQueryData<any>(['homepage-gen-status']);
      if (!run || GEN_TERMINAL.includes(run.status)) return false;
      return 3000;
    },
  });
  const ownImages = own?.images || [];

  const { data, isLoading } = useQuery<SiteImages>({
    queryKey: ['setup-site-images'],
    queryFn: () => fetch('/api/setup/site-images').then((r) => r.json()),
    /**
     * Stop when the pillars arrive OR when the run that would produce them has ended.
     *
     * This waited only on pillarsReady, so a run that finished without building any service
     * pages left it polling every four seconds for as long as the tab stayed open — under a
     * spinner reading "Still reading your website. Your services will appear here in a
     * moment." Observed live after five minutes: status 'ready', authority_map null, one
     * landing page. The reading had finished; the services were never coming.
     *
     * The status poll above this one already learned this lesson and carries the comment
     * about copy that "went on saying 'Still reading your website' ... for ever, over a run
     * that was finished". This is the same mistake in the panel next to it.
     */
    refetchInterval: (q) => {
      if (q.state.data?.pillarsReady) return false;
      const run = qc.getQueryData<any>(['homepage-gen-status']);
      if (run && GEN_TERMINAL.includes(run.status)) return false;
      return 4000;
    },
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ['setup-site-images'] });

  // The whole point of moving this step forward: the website read starts HERE and runs
  // while the studio picks photographs, so two useful things happen at once instead of one
  // of them being watched. The endpoint refuses to double-fire a running job, so the scan
  // step calling it again later is harmless, and skipping this step changes nothing.
  // Moved below the status query — it now has to know what the run is doing before firing.
  // See the effect after `readFindings`.

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

  /**
   * START THE READ, BUT ONLY IF ONE HAS NOT ALREADY HAPPENED.
   *
   * This was an unconditional POST on mount. The server's only idempotency guard is
   * `status === 'running'`, so a mount arriving at a FINISHED run sailed past it and started
   * a brand new pipeline: a fresh crawl_jobs row, and crawledImages() reads only the newest
   * job — so the studio's thirty-four photographs vanished from the picker until the new
   * crawl caught up. It also resets the draft id, so a hero uploaded in that window attaches
   * to nothing.
   *
   * That is not hypothetical and it is not new: the sidebar invites going back to a completed
   * step ("nothing is lost"), and doing so re-ran the whole thing and emptied the picker the
   * studio had come back to use. It also spends one of five lifetime runs each time.
   *
   * ScanningPhase has always done this correctly — `hp.status === 'idle' && hp.hasWebsite`.
   * This is the same test. `kicked` stops a second fire in the window before the status query
   * refreshes.
   */
  const [kicked, setKicked] = useState(false);
  useEffect(() => {
    if (!startScan || kicked || !gen) return;
    if (gen.status !== 'idle' || gen.hasWebsite === false) return;
    setKicked(true);
    fetch('/api/setup/homepage/generate', { method: 'POST' }).catch(() => {
      /* The scan step will try again. Never block the upload on this. */
    });
  }, [startScan, kicked, gen]);

  // The last word on the picker. A run that has just finished has photographs the poll above
  // stopped asking for one tick earlier, so the terminal transition asks once more.
  useEffect(() => {
    if (gen && GEN_TERMINAL.includes(gen.status)) {
      qc.invalidateQueries({ queryKey: ['setup-crawled-images'] });
    }
  }, [gen?.status, qc]);
  /** The run ended without producing service slots. Not "still reading". */
  const readStopped = GEN_TERMINAL.includes(gen?.status) && gen?.status !== 'ready';
  /**
   * The run is over, however it ended — 'ready' included.
   *
   * readStopped deliberately excludes 'ready', because a successful run is not a failure to
   * report. But the services panel was using it to decide whether to keep WAITING, and a
   * successful homepage does not mean the service pages arrived: the authority map and the
   * pillars are a separate chain, with their own budget, that can produce nothing while the
   * homepage is written perfectly well. That is exactly what happened — status 'ready',
   * authority_map null, no pillar pages — and the panel waited for them for ever.
   *
   * Whether to keep waiting and whether something went wrong are different questions. This
   * answers the first.
   */
  const readFinished = GEN_TERMINAL.includes(gen?.status);
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
            {site.map((s) => <SlotCard key={s.section} slot={s} onUploaded={refresh} ownImages={ownImages} storageReady={storageReady} crawlRunning={readRunning} />)}
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
                          <SlotCard key={s.section} slot={s} onUploaded={refresh} ownImages={ownImages} storageReady={storageReady} crawlRunning={readRunning} />
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
            readFinished ? (
              <div className="text-sm text-slate-500 dark:text-slate-400 border border-dashed border-slate-300 dark:border-slate-700 rounded-lg p-4">
                {quotaSpent
                  ? `We found your services, but the site writing included with this instance has
                     been used up, so the pages behind them were not built and there are no
                     per-service slots yet. Nothing is lost — you can add images to any page from
                     Website Studio once setup is done.`
                  : readStopped
                    ? `We couldn't read your services from your website this time, so there are no
                       per-service slots to fill here. Nothing is lost — you can add images to any
                       page from Website Studio once setup is done.`
                    /* Read fine, homepage written, service pages not built. Its own sentence,
                       because the two above would both be untrue here: the crawl worked and the
                       allowance was not the problem. Saying "we couldn't read your website" to a
                       studio whose services are listed at the top of this very screen is the
                       kind of wrong that makes someone distrust the rest of the page. */
                    : `Your homepage is written, but we could not build the pages behind your
                       services this time, so there are no per-service slots here yet. Nothing is
                       lost — the pages can be created from Website Studio once setup is done.`}
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
