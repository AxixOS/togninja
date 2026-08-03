import React, { useEffect, useState } from 'react';
import { AlertTriangle, KeyRound, X } from 'lucide-react';

/**
 * Surfaces the instance licence state at the top of the admin UI so enforcement
 * is humane and obvious instead of a silent 402 when someone tries to save.
 *
 * Backed by GET /api/license/status. Shows nothing on a healthy (active) or
 * unenforced instance — only when the licence is expiring (grace) or blocked
 * (missing / invalid / expired). Grace is dismissible; hard states are not.
 */

interface LicenseStatus {
  state: 'unenforced' | 'active' | 'grace' | 'expired' | 'invalid' | 'missing';
  enforced: boolean;
  plan: string | null;
  expiresAt: string | null;
  message: string;
  mutationsAllowed: boolean;
}

const LicenseBanner: React.FC = () => {
  const [status, setStatus] = useState<LicenseStatus | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/license/status')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (!cancelled) setStatus(d); })
      .catch(() => { /* stay hidden on error */ });
    return () => { cancelled = true; };
  }, []);

  if (!status || !status.enforced || status.state === 'active') return null;

  const hard = status.state === 'expired' || status.state === 'invalid' || status.state === 'missing';
  if (!hard && dismissed) return null;

  const expiry = status.expiresAt ? new Date(status.expiresAt).toLocaleDateString() : null;

  return (
    <div
      role="alert"
      className={`mb-4 rounded-lg border p-4 shadow-sm ${
        hard ? 'border-red-300 bg-red-50' : 'border-amber-300 bg-amber-50'
      }`}
    >
      <div className="flex items-start gap-3">
        {hard ? (
          <KeyRound className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" />
        ) : (
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
        )}
        <div className="flex-1">
          <h3 className={`text-sm font-semibold ${hard ? 'text-red-800' : 'text-amber-900'}`}>
            {status.state === 'missing' && 'No licence — management is locked'}
            {status.state === 'invalid' && 'Invalid licence — management is locked'}
            {status.state === 'expired' && 'Licence expired — management is locked'}
            {status.state === 'grace' && 'Licence expired — renew soon'}
          </h3>
          <p className={`mt-1 text-sm ${hard ? 'text-red-700' : 'text-amber-800'}`}>
            {status.message}
          </p>
          {hard && (
            <p className="mt-2 text-xs text-red-700">
              Your public website and existing data are unaffected — only creating and editing in
              the admin is paused until a valid licence key is set (<code>LICENSE_KEY</code>).
            </p>
          )}
          {expiry && !hard && (
            <p className="mt-1 text-xs text-amber-700">Expired: {expiry}</p>
          )}
        </div>
        {!hard && (
          <button
            type="button"
            onClick={() => setDismissed(true)}
            aria-label="Dismiss"
            className="text-amber-500 hover:text-amber-700"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
};

export default LicenseBanner;
