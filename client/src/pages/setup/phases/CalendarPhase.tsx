import { useState } from 'react';
import { CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Copy, Check, ArrowRight, ExternalLink } from 'lucide-react';

/**
 * Onboarding step: connect an existing calendar. Full 2-way Google sync needs a
 * logged-in session (OAuth), so onboarding offers the read-only iCal subscription
 * (works immediately, no login) and points to the dashboard for 2-way sync later.
 */
export default function CalendarPhase({ onComplete }: { onComplete: () => void }) {
  const icalUrl = (typeof window !== 'undefined' ? window.location.origin : '') + '/api/calendar/photography-sessions.ics';
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard?.writeText(icalUrl).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }); };

  return (
    <>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-100 rounded-lg"><Calendar className="w-5 h-5 text-emerald-600" /></div>
          <div>
            <CardTitle>Connect your calendar</CardTitle>
            <CardDescription>See your photography sessions in the calendar you already use.</CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5 px-6">
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm font-medium text-emerald-900 mb-2">Subscribe now (works immediately — no login)</p>
          <p className="text-xs text-emerald-800 mb-3">Add this feed to Google, Apple or Outlook Calendar and your sessions appear automatically (updates every few hours).</p>
          <div className="flex gap-2">
            <input readOnly value={icalUrl} className="flex-1 text-sm px-3 py-2 rounded-md border border-emerald-200 bg-white font-mono truncate" />
            <Button type="button" variant="outline" onClick={copy}>
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
          <ol className="list-decimal ml-5 mt-3 text-xs text-emerald-800 space-y-1">
            <li>Google Calendar → “Other calendars” → <strong>From URL</strong> → paste the link.</li>
            <li>Apple/Outlook → Add calendar → <strong>Subscribe from URL</strong>.</li>
          </ol>
        </div>

        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800 space-y-1.5">
          <p className="font-medium flex items-center gap-2"><ExternalLink size={16} /> Two-way sync needs a one-time connection</p>
          <p>To see your <strong>real Google Calendar events inside the CRM</strong> (and push bookings back to Google), you must <strong>authorise once</strong> after you log in — entering keys alone won't sync anything.</p>
          <p>After setup: open <strong>Calendar</strong> → click <strong>Connect Google Calendar</strong> → sign in with Google. That's it.</p>
        </div>
      </CardContent>

      <CardFooter className="flex justify-end px-6 pt-4">
        <Button onClick={onComplete}>Continue <ArrowRight className="w-4 h-4 ml-2" /></Button>
      </CardFooter>
    </>
  );
}
