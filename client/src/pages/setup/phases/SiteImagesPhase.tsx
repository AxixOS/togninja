import React, { useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Loader2, ImagePlus, Check, ArrowRight, AlertCircle } from 'lucide-react';

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
  url: string | null;
  filled: boolean;
}

interface SiteImages {
  logoUrl: string | null;
  pillarsReady: boolean;
  slots: Slot[];
  filled: number;
  total: number;
}

function SlotCard({ slot, onUploaded }: { slot: Slot; onUploaded: () => void }) {
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
          disabled={upload.isPending}
        >
          {slot.filled ? 'Replace' : 'Add image'}
        </Button>
      </div>
    </div>
  );
}

export default function SiteImagesPhase({ onComplete }: { onComplete: () => void }) {
  const qc = useQueryClient();
  // Poll while the pillars are still missing.
  //
  // homepage-pipeline fires the Authority-Map and scaffold chain WITHOUT awaiting it and
  // then reports status 'ready', so the crawl step can hand over before the map exists. A
  // single fetch here meant a studio who clicked through promptly saw pillarsReady:false,
  // read "we'll ask once we've finished reading your website", and was never asked — the
  // one part of this step that cannot be done later without knowing the slot names.
  // Stops polling the moment the pillars arrive.
  const { data, isLoading } = useQuery<SiteImages>({
    queryKey: ['setup-site-images'],
    queryFn: () => fetch('/api/setup/site-images').then((r) => r.json()),
    refetchInterval: (q) => (q.state.data?.pillarsReady ? false : 4000),
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ['setup-site-images'] });

  if (isLoading) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardContent className="py-16 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></CardContent>
      </Card>
    );
  }

  const slots = data?.slots || [];
  const site = slots.filter((s) => s.group === 'site');
  const pillars = slots.filter((s) => s.group === 'pillar');

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Your photographs</CardTitle>
        <CardDescription>
          Your own work, in the places visitors look first. Every one is optional — anything
          you skip simply won't show a picture, and you can add them later from Website
          Studio. We never substitute stock or someone else's photography.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-8 max-h-[58vh] overflow-y-auto">
        <section>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-3">
            Your site
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {site.map((s) => <SlotCard key={s.section} slot={s} onUploaded={refresh} />)}
          </div>
        </section>

        <section>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
            Your services
          </h3>
          {data?.pillarsReady ? (
            <>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                These are the services we found on your website. One photograph each — it
                appears on the service card and at the top of that page.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {pillars.map((s) => <SlotCard key={s.section} slot={s} onUploaded={refresh} />)}
              </div>
            </>
          ) : (
            /* Honest about WHY the list is empty, and actively waiting rather than
               inviting the studio to move on — this is the one part of the step that
               cannot be done later, because the slot names come from the crawl. */
            <div className="text-sm text-slate-500 dark:text-slate-400 border border-dashed border-slate-300 dark:border-slate-700 rounded-lg p-4 flex items-start gap-3">
              <Loader2 className="w-4 h-4 mt-0.5 animate-spin flex-shrink-0" />
              <span>
                Still reading your website. Your services will appear here in a moment, and
                we'll ask for one photograph each. If you skipped the website step there
                won't be any — you can add images from Website Studio later.
              </span>
            </div>
          )}
        </section>
      </CardContent>

      <CardFooter className="flex items-center justify-between pt-4">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {data?.filled ?? 0} of {data?.total ?? 0} added
        </p>
        <Button onClick={onComplete}>
          {(data?.filled ?? 0) === 0 ? 'Skip for now' : 'Continue'}
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </CardFooter>
    </Card>
  );
}
