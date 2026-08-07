import { useState, useEffect } from 'react';
import { RotateCcw } from 'lucide-react';

/**
 * Demo-only "reset & start over" control. Gated on the SERVER's DEMO_MODE (surfaced by
 * GET /api/setup/status as `demoMode`) — NOT the client hostname heuristic, which is false
 * on togninja.onrender.com. POSTs /api/setup/reset-demo (itself hard-guarded on DEMO_MODE)
 * to wipe demo data + onboarding/homepage state, then reopens the wizard for a clean A-Z run.
 * Renders nothing on a real studio instance.
 */
export default function DemoResetButton() {
  const [isDemo, setIsDemo] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/setup/status')
      .then(r => r.json())
      .then(d => { if (!cancelled) setIsDemo(!!d?.demoMode); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  if (!isDemo) return null;

  const handleReset = async () => {
    if (!window.confirm('Reset ALL demo data (clients, invoices, galleries, generated homepage, onboarding progress) and start onboarding from scratch?\n\nThis only works on the demo instance and cannot be undone.')) return;
    setBusy(true);
    try {
      const res = await fetch('/api/setup/reset-demo', { method: 'POST' });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        alert(e?.error || 'Reset failed.');
        setBusy(false);
        return;
      }
      // Fresh onboarding from step 1.
      window.location.href = '/setup';
    } catch {
      alert('Reset failed.');
      setBusy(false);
    }
  };

  return (
    <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 flex items-center justify-between gap-4">
      <div className="flex items-center gap-2 text-sm text-amber-900">
        <span className="font-semibold">Demo instance</span>
        <span className="text-amber-700">— reset everything to test the onboarding flow again from A–Z.</span>
      </div>
      <button
        onClick={handleReset}
        disabled={busy}
        className="inline-flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white text-sm px-3 py-2 rounded-lg disabled:opacity-60"
      >
        <RotateCcw className="w-4 h-4" />
        {busy ? 'Resetting…' : 'Reset & start over'}
      </button>
    </div>
  );
}
