import { useState, useEffect } from 'react';
import { RotateCcw, AlertTriangle } from 'lucide-react';

/**
 * Demo-only "reset & start over" control. Gated on the SERVER's DEMO_MODE (surfaced by
 * GET /api/setup/status as `demoMode`) — NOT the client hostname heuristic, which is false
 * on togninja.onrender.com. POSTs /api/setup/reset-demo (itself hard-guarded on DEMO_MODE)
 * to wipe demo data + onboarding/homepage state, then reopens the wizard for a clean A-Z run.
 * Renders nothing on a real studio instance.
 *
 * WHY THE CONFIRMATION IS INLINE. This used window.confirm() as its guard and alert() to
 * report failure. Chrome offers "Prevent this page from creating additional dialogs" after a
 * page shows a few, and the checkbox persists for the rest of that page's life — after which
 * confirm() returns FALSE without asking. The handler then took its early return and did
 * nothing at all: no reset, no message, no busy state. Reported as "the reset button isn't
 * clicking", which is exactly what it looks like from the outside.
 *
 * The same switch silences alert(), so the failure path was mute for the same reason. Both are
 * now rendered in the component, where nothing can suppress them: a destructive action must
 * not depend on a dialog the browser is allowed to withhold.
 */
export default function DemoResetButton() {
  const [isDemo, setIsDemo] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/setup/status')
      .then((r) => r.json())
      .then((d) => { if (!cancelled) setIsDemo(!!d?.demoMode); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  if (!isDemo) return null;

  const handleReset = async () => {
    setBusy(true);
    setError(null);
    try {
      // Same-origin, so the session cookie rides along — the endpoint requires it.
      const res = await fetch('/api/setup/reset-demo', { method: 'POST', credentials: 'same-origin' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({} as any));
        // 401 is worth naming: the session expires while this page sits open on a dashboard
        // nobody reloads, and "Reset failed" sends you looking for a server fault instead of
        // signing back in.
        setError(
          res.status === 401
            ? 'Your session has expired — sign in again and retry.'
            : body?.error || `Reset failed (${res.status}).`,
        );
        setBusy(false);
        setConfirming(false);
        return;
      }
      // Fresh onboarding from step 1.
      window.location.href = '/setup';
    } catch {
      setError('Could not reach the server.');
      setBusy(false);
      setConfirming(false);
    }
  };

  return (
    <div className="rounded-xl bg-amber-50 border border-amber-200 p-3">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm text-amber-900">
          <span className="font-semibold">Demo instance</span>
          <span className="text-amber-700">— reset everything to test the onboarding flow again from A–Z.</span>
        </div>

        {confirming ? (
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setConfirming(false)}
              disabled={busy}
              className="text-sm px-3 py-2 rounded-lg text-amber-900 hover:bg-amber-100 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              onClick={handleReset}
              disabled={busy}
              className="inline-flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white text-sm px-3 py-2 rounded-lg disabled:opacity-60"
            >
              <AlertTriangle className="w-4 h-4" />
              {busy ? 'Resetting…' : 'Yes, wipe everything'}
            </button>
          </div>
        ) : (
          <button
            onClick={() => { setError(null); setConfirming(true); }}
            className="inline-flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white text-sm px-3 py-2 rounded-lg shrink-0"
          >
            <RotateCcw className="w-4 h-4" />
            Reset &amp; start over
          </button>
        )}
      </div>

      {confirming && !busy && (
        <p className="mt-3 text-sm text-amber-900 border-t border-amber-200 pt-3">
          This deletes every client, invoice, gallery, voucher product, landing page and blog
          post, clears the generated homepage and uploaded images, and blanks the studio's
          details. The admin login goes too — you will create it again in the wizard. It cannot
          be undone.
        </p>
      )}

      {error && (
        <p className="mt-3 text-sm text-red-700 border-t border-amber-200 pt-3">{error}</p>
      )}
    </div>
  );
}
