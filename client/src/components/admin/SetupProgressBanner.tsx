import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowRight, X, Settings2 } from 'lucide-react';
import { useCapabilities } from '../../hooks/useCapabilities';

/**
 * What this studio has not connected yet, said once, everywhere.
 *
 * A new instance arrives with no payments, no email, no calendar and no storage, and the
 * whole CRM opens anyway. Nothing anywhere says "you are not finished" — so a studio walks
 * into Invoices and meets "No clients yet", into Inbox and gets a browser alert, into
 * Calendar and sees eight zeros, and has to work out for themselves that none of it is
 * broken, it is simply unconfigured. Three different refusals in three different styles,
 * none of which mentions setup.
 *
 * The registry that knows all of this has existed the whole time (server/lib/capabilities.ts)
 * and nothing rendered it. This is one line of it.
 *
 * DELIBERATELY NOT A BLOCKER. It does not cover the page, does not disable the sidebar and
 * can be dismissed for the session. A studio poking around an unfinished CRM is doing
 * exactly the right thing — the mistake was never telling them which parts are waiting on
 * them.
 */

const DISMISS_KEY = 'setupBannerDismissed';

export default function SetupProgressBanner() {
  const { capabilities, loading } = useCapabilities();
  const { pathname } = useLocation();
  const [hidden, setHidden] = useState(() => {
    try { return sessionStorage.getItem(DISMISS_KEY) === '1'; } catch { return false; }
  });

  // NOT ON THE DASHBOARD. SetupNeededCard says the same thing there, at the size the thing
  // deserves and with a link straight to the screen that takes each key. Two amber notices
  // about the same subject, one above the other, makes both easier to stop reading — and the
  // strip is the one that cannot be acted on.
  const onDashboard = pathname === '/admin' || pathname.startsWith('/admin/dashboard');

  if (loading || hidden || onDashboard) return null;

  const all = Object.values(capabilities);
  // Only the studio's own. A platform-owned key is not theirs to add, and listing it here
  // would be asking them for something they cannot give — the exact bug capabilities.ts
  // Rule 3 exists to prevent.
  const mine = all.filter((c) => c.owner === 'studio');
  const missing = mine.filter((c) => !c.available);

  // Half-configured is worth calling out separately, because it is the state that looks
  // finished and is not — a bucket with no key, an SMTP host with no password. A studio
  // reading "4 things left to connect" assumes they have not started those four; if one of
  // them is half-done they will not look at it again.
  const halfDone = missing.filter((c) => c.status === 'incomplete');

  if (missing.length === 0) return null;

  const dismiss = () => {
    setHidden(true);
    try { sessionStorage.setItem(DISMISS_KEY, '1'); } catch { /* fine */ }
  };

  return (
    <div className="border-b border-amber-200 bg-amber-50">
      <div className="px-6 py-2.5 flex items-center gap-3 text-sm">
        <Settings2 className="w-4 h-4 text-amber-700 shrink-0" />

        <p className="text-amber-900 min-w-0">
          <span className="font-medium">
            {missing.length} thing{missing.length === 1 ? '' : 's'} left to connect
          </span>
          {' — '}
          {/* Named, not counted. "4 steps remaining" tells a studio nothing about whether
              any of it matters to them today. */}
          <span className="text-amber-800">
            {missing.slice(0, 3).map((c) => c.label.toLowerCase()).join(', ')}
            {missing.length > 3 ? ` and ${missing.length - 3} more` : ''}
          </span>
          .{' '}
          {halfDone.length > 0 && (
            <span className="text-amber-800">
              {halfDone.length === 1 ? 'One of those is' : `${halfDone.length} of those are`}{' '}
              part-filled, which will not work until finished.{' '}
            </span>
          )}
          <span className="text-amber-800">Everything else works in the meantime.</span>
        </p>

        <Link
          to="/setup"
          className="ml-auto shrink-0 inline-flex items-center gap-1 font-medium text-amber-900 hover:text-amber-950 underline underline-offset-2"
        >
          Finish setup
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>

        <button
          type="button"
          onClick={dismiss}
          aria-label="Hide until next time"
          className="shrink-0 p-1 rounded text-amber-700 hover:bg-amber-100"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
