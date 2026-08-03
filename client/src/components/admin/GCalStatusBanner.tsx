import React, { useEffect, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';

/**
 * Surfaces a warning at the top of the admin UI when Google Calendar is
 * configured for the scheduler but the most recent fetch failed (e.g. OAuth
 * tokens expired). Without this banner the failure is only visible in server
 * logs and the next customer to hit /book/* is the one who discovers it.
 *
 * Backed by GET /api/schedulers/gcal-health.
 */

type Status = 'unknown' | 'healthy' | 'unhealthy' | 'not_configured';

interface GCalHealth {
  configured: boolean;
  status: Status;
  lastCheckedAt: string | null;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  lastError: string | null;
  consecutiveFailures: number;
}

const POLL_INTERVAL_MS = 60_000; // refresh once a minute while the dashboard is open

const GCalStatusBanner: React.FC = () => {
  const [health, setHealth] = useState<GCalHealth | null>(null);
  const [dismissed, setDismissed] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;

    const fetchHealth = async () => {
      try {
        const res = await fetch('/api/schedulers/gcal-health', {
          credentials: 'include',
        });
        if (!res.ok) return;
        const data: GCalHealth = await res.json();
        if (!cancelled) setHealth(data);
      } catch {
        /* ignore – banner just stays hidden */
      }
    };

    fetchHealth();
    const id = window.setInterval(fetchHealth, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  // Only show the banner when GCal is configured AND unhealthy.
  if (!health || dismissed) return null;
  if (!health.configured) return null;
  if (health.status !== 'unhealthy') return null;

  const lastFailure = health.lastFailureAt
    ? new Date(health.lastFailureAt).toLocaleString()
    : 'just now';

  // Distinguish an EXPIRED-TOKEN outage (the recurring weekly one) from a
  // transient error. invalid_grant / "expired" / "revoked" means Google dropped
  // the refresh token — almost always because the OAuth app is still in
  // "Testing" mode, where Google expires tokens every 7 days.
  const tokenExpired = /invalid_grant|has been expired|has been revoked|token.*expired|unauthorized/i.test(
    health.lastError || ''
  );

  return (
    <div
      role="alert"
      className="mb-4 rounded-md border border-red-300 bg-red-50 p-4 shadow-sm"
      data-testid="gcal-status-banner"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" />
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-red-800">
            {tokenExpired
              ? 'Google Calendar disconnected — reconnect needed'
              : 'Google Calendar sync is down — online booking disabled'}
          </h3>
          <p className="mt-1 text-sm text-red-700">
            Your scheduler cannot verify Google Calendar availability, so
            <code className="mx-1 rounded bg-red-100 px-1 py-0.5">/book/*</code>
            is currently rejecting new bookings to prevent double bookings.
          </p>
          {health.lastError && (
            <p className="mt-2 text-xs text-red-700">
              <strong>Reason:</strong> {health.lastError}
            </p>
          )}
          <p className="mt-1 text-xs text-red-600">
            Last failure: {lastFailure}
            {health.consecutiveFailures > 1
              ? ` · ${health.consecutiveFailures} consecutive failures`
              : ''}
          </p>

          {tokenExpired && (
            <div className="mt-3 rounded-md border border-amber-300 bg-amber-50 p-3">
              <p className="text-xs font-semibold text-amber-900">
                Having to reconnect every week? Make it permanent.
              </p>
              <p className="mt-1 text-xs text-amber-800">
                Google drops the connection after <strong>7 days</strong> while your OAuth
                app is in <strong>“Testing”</strong> mode. Publishing the app stops this — the
                sync then stays connected until you disconnect it. One-time fix:
              </p>
              <ol className="mt-1 ml-4 list-decimal text-xs text-amber-800 space-y-0.5">
                <li>Google Cloud Console → <strong>APIs &amp; Services → OAuth consent screen</strong></li>
                <li>Publishing status <em>Testing</em> → click <strong>“Publish app”</strong> (In production)</li>
                <li>Come back here and <strong>reconnect once</strong> — done.</li>
              </ol>
              <a
                href="https://console.cloud.google.com/apis/credentials/consent"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-block text-xs font-medium text-amber-900 underline hover:text-amber-950"
              >
                Open the OAuth consent screen →
              </a>
            </div>
          )}
          <div className="mt-3 flex gap-2">
            <a
              href="/admin/calendar-sync"
              className="inline-flex items-center rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
            >
              Reconnect Google Calendar
            </a>
            <button
              type="button"
              onClick={async () => {
                try {
                  const res = await fetch(
                    '/api/schedulers/gcal-health?probe=1',
                    { credentials: 'include' }
                  );
                  if (res.ok) setHealth(await res.json());
                } catch {
                  /* ignore */
                }
              }}
              className="inline-flex items-center rounded-md border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100"
            >
              Re-check now
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss"
          className="text-red-500 hover:text-red-700"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default GCalStatusBanner;
