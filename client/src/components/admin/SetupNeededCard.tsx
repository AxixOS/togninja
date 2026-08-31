import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronDown, ChevronUp, KeyRound } from 'lucide-react';
import { useCapabilities } from '../../hooks/useCapabilities';

/**
 * "Your CRM is ready, but it needs keys before it can run your business."
 *
 * A studio finishes onboarding with a website they can show people, and lands on a dashboard
 * of zeros. The only thing telling them the product is not finished was a single-line amber
 * strip at the top of the frame — the same weight as a cookie notice, sharing a page with
 * four headline figures — with a dismiss cross and a link to /setup, which is the wizard they
 * have just completed. So: read the strip, click through, arrive at a finished wizard, click
 * again, and only then reach the screen where a key can actually be typed.
 *
 * WHY A CARD AND NOT A BIGGER STRIP. What is missing here is not a notification, it is the
 * remaining work. Email, card payments and the rest are the difference between a CRM that
 * looks right and a business that can invoice someone, and a studio cannot be expected to
 * infer that from a count. So it is stated, in the dashboard's own column, at the size of the
 * thing it is about.
 *
 * EVERY WORD COMES FROM server/lib/capabilities.ts. label, blockedMessage and settingsPath are
 * already written there, addressed to whoever can fix them, and that registry is what the rest
 * of the product refuses against. Writing fresh copy here would be a second opinion that
 * drifts from the first — and the drift would show as a studio being told to connect something
 * the product already believes is connected.
 *
 * IT LINKS STRAIGHT TO THE SCREEN THAT TAKES THE KEY. Each capability carries its own
 * settingsPath. Sending everyone to /setup was the detour described above.
 *
 * STILL NOT A BLOCKER. It does not cover the page or disable anything: a studio exploring an
 * unfinished CRM is doing the right thing. It collapses to a summary line and stays collapsed
 * for the session — but it does not go away while the work is outstanding, because it IS the
 * outstanding work.
 */

const COLLAPSE_KEY = 'setupNeededCollapsed';

/** Rows that are work rather than credentials, so the button can say the right verb. */
const TASK_KEYS = new Set(['set_prices', 'import_clients']);

/**
 * What to fix first, in the order a photography business actually needs it.
 *
 * The registry's own order is roughly how the integrations were built, which is not how a
 * studio would rank them. You cannot run this business without reaching clients or being paid;
 * everything below that line makes an already-working business better. Anything unlisted keeps
 * its registry order, after these.
 */
const FIRST: string[] = [
  // OPENAI FIRST. It is the one key that unlocks work rather than plumbing — the Price
  // Wizard, the writing, the image analysis — and it is what makes the next item possible.
  // It was fifth, behind three payment rows, on the reasoning that a business must be able
  // to take money. True, but a studio cannot take money for packages that have no prices.
  'ai_features',
  'set_prices',           // nothing is for sale until these exist. A task, not a key.
  'sending_email',        // invoices, contracts and confirmations reach nobody without it
  'online_payments',      // and nothing can be paid for
  'payment_confirmation', // paid invoices stay marked unpaid until someone notices
  'import_clients',       // every screen opens empty until they arrive. Also a task.
  'file_storage',         // galleries cannot be delivered
  'google_reviews',       // the reviews they have already earned, shown on their own site
];

export default function SetupNeededCard() {
  const { capabilities, tasks, loading } = useCapabilities();
  const [collapsed, setCollapsed] = useState(() => {
    try { return sessionStorage.getItem(COLLAPSE_KEY) === '1'; } catch { return false; }
  });

  if (loading) return null;

  // Only the studio's own. A platform-owned key is not theirs to add, and asking for it would
  // be asking for something they cannot give — capabilities.ts Rule 3.
  /**
   * Credentials AND tasks, in one list.
   *
   * The card asked the capability registry alone, which answers "what needs a key". Two of
   * the biggest things stopping a studio need no key at all — their prices and their clients
   * — so neither could ever appear here however prominent the card became. Setting prices in
   * particular is the one that decides whether the shop this product just built can sell
   * anything.
   */
  const asRows = [
    ...Object.values(capabilities)
      .filter((c: any) => c.owner === 'studio' && !c.available)
      .map((c: any) => ({
        key: c.key,
        label: c.label,
        blockedMessage: c.blockedMessage,
        settingsPath: c.settingsPath,
        status: c.status,
      })),
    ...tasks
      .filter((t) => !t.done)
      .map((t) => ({
        key: t.key,
        label: t.label,
        blockedMessage: t.blockedMessage,
        settingsPath: t.path,
        status: undefined as string | undefined,
      })),
  ];

  const missing = asRows
    .sort((a: any, b: any) => {
      const ai = FIRST.indexOf(a.key);
      const bi = FIRST.indexOf(b.key);
      return (ai < 0 ? FIRST.length : ai) - (bi < 0 ? FIRST.length : bi);
    });

  if (missing.length === 0) return null;

  // The state that looks finished and is not — a bucket with no key, an SMTP host with no
  // password. Worth its own sentence, because a studio reading "not connected" about
  // something they half-connected will not go back to it.
  const halfDone = missing.filter((c: any) => c.status === 'incomplete');

  const toggle = () => {
    setCollapsed((v) => {
      const next = !v;
      try { sessionStorage.setItem(COLLAPSE_KEY, next ? '1' : '0'); } catch { /* fine */ }
      return next;
    });
  };

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={toggle}
        className="w-full flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2.5 text-left text-sm text-amber-900 hover:bg-amber-100"
      >
        <KeyRound className="w-4 h-4 shrink-0 text-amber-700" />
        <span className="font-medium">
          {missing.length} thing{missing.length === 1 ? '' : 's'} still to connect
        </span>
        <span className="text-amber-800 truncate">
          — {missing.slice(0, 2).map((c: any) => c.label.toLowerCase()).join(', ')}
          {missing.length > 2 ? ` and ${missing.length - 2} more` : ''}
        </span>
        <ChevronDown className="w-4 h-4 ml-auto shrink-0" />
      </button>
    );
  }

  return (
    <section
      aria-labelledby="setup-needed-heading"
      className="rounded-xl border border-amber-300 bg-amber-50 overflow-hidden"
    >
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100">
            <KeyRound className="w-5 h-5 text-amber-700" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="setup-needed-heading" className="text-base font-semibold text-amber-950">
              Your studio is set up. It needs a few accounts connected before it can run your
              business.
            </h2>
            <p className="mt-1 text-sm text-amber-900">
              Your website is live and the CRM works. These are the parts that talk to the
              outside world — taking money, and reaching your clients.
              {halfDone.length > 0 && (
                <>
                  {' '}
                  <strong className="font-medium">
                    {halfDone.length === 1 ? 'One of them is' : `${halfDone.length} of them are`}{' '}
                    part-filled
                  </strong>
                  , which will not work until finished.
                </>
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={toggle}
            aria-label="Collapse"
            className="shrink-0 p-1.5 rounded text-amber-700 hover:bg-amber-100"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
        </div>
      </div>

      <ul className="divide-y divide-amber-200 border-t border-amber-200">
        {missing.map((c: any) => (
          <li key={c.key} className="flex items-start gap-3 px-5 py-3 bg-white/60">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-900">
                {c.label}
                {c.status === 'incomplete' && (
                  <span className="ml-2 rounded bg-amber-200 px-1.5 py-0.5 text-[0.7rem] font-medium text-amber-900">
                    part-filled
                  </span>
                )}
              </p>
              {/* The registry's own words, addressed to the person who can fix it. */}
              <p className="mt-0.5 text-sm text-gray-600">{c.blockedMessage}</p>
            </div>
            {c.settingsPath && (
              <Link
                to={c.settingsPath}
                className="shrink-0 inline-flex items-center gap-1 rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-700"
              >
                {TASK_KEYS.has(c.key) ? 'Set up' : 'Connect'}
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
