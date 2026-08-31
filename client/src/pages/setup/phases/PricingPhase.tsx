import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, ArrowRight, Search, ExternalLink, TrendingUp } from 'lucide-react';

/**
 * "What does everyone else charge?" — during setup, not months later.
 *
 * The Price Wizard is one of the genuinely uncommon things this product does: it finds the
 * photographers working in the studio's own town and reads what they charge. It lived at
 * /admin/price-wizard behind a 1,768-line management screen, which meant a studio met it only
 * if they went looking. This shows it while they are still deciding whether the product is
 * worth having.
 *
 * WHAT RUNS HERE AND WHAT DOES NOT, and the line is a billing one rather than a technical one.
 *
 * Discovery — finding the photographers — goes through the AxixOS gateway on this instance's
 * own tenant key, under the purpose search.competitor. No key of the studio's is involved, so
 * it works on a brand-new instance that has entered nothing.
 *
 * Reading PRICES off those pages does not. That is a completion, there is no platform purpose
 * for it, and /api/price-wizard/research refuses without the studio's own OpenAI key —
 * correctly: the product's rule is that the platform pays to SHOW a feature and the studio
 * pays to USE it, and a competitor's price list is squarely use. So this step shows the half
 * that is free to show and says plainly what the other half needs.
 *
 * IT IS A BUTTON, NOT AN AUTOMATIC RUN. The comment on CrawlPurpose puts it exactly: the
 * studio pays for competitor research "because they asked for it". Running it unprompted
 * during setup would make that sentence false.
 */
export default function PricingPhase({ onComplete }: { onComplete: () => void }) {
  const { data: config } = useQuery({
    queryKey: ['/api/studio-config'],
    queryFn: async () => (await fetch('/api/studio-config')).json(),
    staleTime: 5 * 60_000,
  });
  const { data: map } = useQuery({
    queryKey: ['/api/authority-map'],
    queryFn: async () => (await fetch('/api/authority-map')).json(),
    staleTime: 5 * 60_000,
  });

  const services: string[] = ((map?.pillars || []) as any[])
    .map((p) => String(p?.label || '').trim())
    .filter(Boolean)
    .slice(0, 6);

  // Pre-filled from what they already told us, and editable — a studio that travels works a
  // different market from the one they are registered in, and this is the question where that
  // difference matters most.
  const [location, setLocation] = useState<string>('');
  const town = location || config?.city || '';

  const [state, setState] = useState<'idle' | 'running' | 'done' | 'error'>('idle');
  const [competitors, setCompetitors] = useState<any[]>([]);
  const [note, setNote] = useState<string | null>(null);

  // Did a real search run? False when the platform has no search provider, in which case an
  // empty result says nothing whatever about the studio's market.
  const [searchable, setSearchable] = useState(true);

  const run = async () => {
    if (!town.trim()) { setNote('Add the town or area you work in first.'); return; }
    setState('running');
    setNote(null);
    try {
      const started = await fetch('/api/price-wizard/start', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: town.trim(),
          // The studio's own services, so the search asks about what they actually shoot
          // rather than "photographer" in general.
          services: services.length ? services : ['photography'],
        }),
      }).then((r) => r.json());

      if (!started?.sessionId) throw new Error(started?.error || 'Could not start the search.');

      const found = await fetch('/api/price-wizard/discover', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: started.sessionId }),
      }).then((r) => r.json());

      if (found?.error) throw new Error(found.error);
      setCompetitors(Array.isArray(found?.competitors) ? found.competitors : []);
      // Whether a search was actually possible. Without it, "no provider configured" and
      // "this town has no photographers" arrive at this screen as the same empty list.
      setSearchable(found?.searchable !== false);
      setState('done');
    } catch (e: any) {
      // Never a dead end. This step is optional and the studio can reach the full wizard any
      // time from the admin, so a failure says so rather than blocking the way forward.
      setNote(e?.message || 'The search could not run just now — you can try again from Price Wizard later.');
      setState('error');
    }
  };

  return (
    <>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
            <TrendingUp className="w-5 h-5 text-emerald-700" />
          </div>
          <div>
            <CardTitle>What everyone else charges</CardTitle>
            <CardDescription>
              We can find the photographers working in your area, so you are not pricing in the dark.
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {state !== 'done' && (
          <>
            <div className="space-y-2 max-w-md">
              <Label htmlFor="pw-location">The town or area you work in</Label>
              <Input
                id="pw-location"
                value={town}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Brighton"
                disabled={state === 'running'}
              />
              {services.length > 0 && (
                <p className="text-xs text-gray-500">
                  We will look for {services.slice(0, 3).join(', ')}
                  {services.length > 3 ? ` and ${services.length - 3} more` : ''}.
                </p>
              )}
            </div>

            <Button onClick={run} disabled={state === 'running'} className="gap-2">
              {state === 'running' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              {state === 'running' ? 'Looking…' : 'Find photographers near me'}
            </Button>
          </>
        )}

        {state === 'done' && (
          <div className="space-y-4">
            <p className="text-sm text-gray-700">
              {competitors.length
                ? `Found ${competitors.length} photographer${competitors.length === 1 ? '' : 's'} working in ${town}.`
                : searchable
                  ? `We could not find other photographers listed in ${town}. That is worth knowing too.`
                  : `We could not run the search just now, so this is not a finding about ${town} — competitor research is not switched on for this instance yet. Everything else is unaffected, and you can run this later from Price Wizard.`}
            </p>

            {competitors.length > 0 && (
              <ul className="divide-y rounded-lg border border-gray-200">
                {competitors.slice(0, 8).map((c: any) => (
                  <li key={c.id || c.website_url} className="flex items-center justify-between gap-3 px-4 py-2.5">
                    <span className="text-sm text-gray-900 truncate">{c.competitor_name || c.website_url}</span>
                    {c.website_url && (
                      <a
                        href={c.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-gray-500 hover:text-gray-900 inline-flex items-center gap-1 shrink-0"
                      >
                        Visit <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            )}

            {/*
              The honest half. Reading their prices is a completion on the studio's own key, so
              it cannot run here — and saying that plainly is better than a button that fails.
            */}
            {competitors.length > 0 && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-4">
                <p className="text-sm font-medium text-emerald-900">Next: what they charge</p>
                <p className="text-xs text-emerald-800/90 mt-1">
                  Reading prices off their pages runs on your own OpenAI key rather than ours.
                  Add one in Technical Setup and open Price Wizard, and it will read these
                  {' '}{competitors.length} sites and suggest a price list from what it finds.
                </p>
              </div>
            )}
          </div>
        )}

        {note && <p className="text-sm text-red-600">{note}</p>}
      </CardContent>

      <CardFooter className="flex items-center justify-between border-t pt-6">
        <p className="text-sm text-gray-500">Optional — you can do this any time from Price Wizard.</p>
        <Button onClick={onComplete} className="gap-2">
          {state === 'done' ? 'Continue' : 'Skip for now'}
          <ArrowRight className="w-4 h-4" />
        </Button>
      </CardFooter>
    </>
  );
}
