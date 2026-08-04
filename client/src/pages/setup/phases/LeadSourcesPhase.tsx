import { useState } from 'react';
import { CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tags, Plus, X, ArrowRight, Loader2 } from 'lucide-react';

const SUGGESTED = ['Google', 'Instagram', 'Facebook', 'Referral', 'Website', 'Walk-in', 'Newsletter', 'Wedding Fair', 'Pinterest', 'TikTok'];

/**
 * Onboarding step: the studio defines the channels their leads come from. Saved via the
 * open POST /api/setup/lead-sources (auth-gated CRM endpoint isn't reachable pre-login).
 */
export default function LeadSourcesPhase({ onComplete }: { onComplete: () => void }) {
  const [sources, setSources] = useState<string[]>(['Google', 'Instagram', 'Referral', 'Website']);
  const [input, setInput] = useState('');
  const [saving, setSaving] = useState(false);

  const add = (name: string) => {
    const n = name.trim();
    if (n && !sources.some(s => s.toLowerCase() === n.toLowerCase())) setSources([...sources, n]);
    setInput('');
  };
  const remove = (n: string) => setSources(sources.filter(s => s !== n));

  const save = async () => {
    setSaving(true);
    try {
      await fetch('/api/setup/lead-sources', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ names: sources }),
      });
    } catch { /* non-blocking */ } finally { setSaving(false); onComplete(); }
  };

  const remaining = SUGGESTED.filter(s => !sources.some(x => x.toLowerCase() === s.toLowerCase()));

  return (
    <>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg"><Tags className="w-5 h-5 text-blue-600" /></div>
          <div>
            <CardTitle>Where do your leads come from?</CardTitle>
            <CardDescription>Add the channels you get enquiries from — you'll see revenue by source in Lead Sources.</CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5 px-6">
        <div className="flex flex-wrap gap-2">
          {sources.map(s => (
            <span key={s} className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-800 text-sm px-3 py-1.5 rounded-full border border-blue-200">
              {s}
              <button type="button" onClick={() => remove(s)} className="text-blue-400 hover:text-blue-700"><X className="w-3.5 h-3.5" /></button>
            </span>
          ))}
          {sources.length === 0 && <p className="text-sm text-gray-400">No sources yet — add some below.</p>}
        </div>

        <div className="flex gap-2">
          <Input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(input); } }}
            placeholder="Add a channel (e.g. Google, Referral)…"
          />
          <Button type="button" variant="outline" onClick={() => add(input)} disabled={!input.trim()}>
            <Plus className="w-4 h-4 mr-1" /> Add
          </Button>
        </div>

        {remaining.length > 0 && (
          <div>
            <p className="text-xs text-gray-500 mb-2">Quick add:</p>
            <div className="flex flex-wrap gap-2">
              {remaining.map(s => (
                <button key={s} type="button" onClick={() => add(s)} className="text-sm px-2.5 py-1 rounded-full border border-gray-200 text-gray-600 hover:border-blue-300 hover:text-blue-700">
                  + {s}
                </button>
              ))}
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex justify-between px-6 pt-4">
        <Button variant="ghost" onClick={onComplete}>Skip for now</Button>
        <Button onClick={save} disabled={saving}>
          {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Save &amp; Continue <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </CardFooter>
    </>
  );
}
