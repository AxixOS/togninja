import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '../../components/admin/AdminLayout';
import {
  Calendar, Check, AlertTriangle, RefreshCw, ExternalLink, Link2, Loader2, Settings,
} from 'lucide-react';

interface SyncStatus {
  connected: boolean;
  tokenExpired?: boolean;
  syncEnabled?: boolean;
  calendarId?: string;
  lastSyncAt?: string | null;
}

interface GCalHealth {
  configured: boolean;
  status: 'unknown' | 'healthy' | 'unhealthy' | 'not_configured';
  lastCheckedAt?: string | null;
  lastSuccessAt?: string | null;
  lastFailureAt?: string | null;
  lastError?: string | null;
  consecutiveFailures?: number;
}

const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem('token') || ''}` });

const CalendarSyncPage: React.FC = () => {
  const [status, setStatus] = useState<SyncStatus | null>(null);
  // Why the status read failed, when it did. Kept apart from `status` so an unreadable
  // status can be rendered as unknown instead of being guessed at.
  const [statusError, setStatusError] = useState<string | null>(null);
  // Does this instance have a Google OAuth app at all? null = not established yet.
  const [googleConfigured, setGoogleConfigured] = useState<boolean | null>(null);
  const [health, setHealth] = useState<GCalHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [rechecking, setRechecking] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // A non-OK status used to be dropped on the floor, leaving `status` null — and the
  // render below read null as "not NOT-connected" and painted a green Connected dot with
  // a Sync-now button, on a studio whose session had just expired. Unknown is recorded
  // as unknown so the page can say which of the two it is.
  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/google/status', { headers: authHeaders(), credentials: 'include' });
      if (res.ok) { setStatus(await res.json()); setStatusError(null); return; }
      setStatus(null);
      setStatusError(res.status === 401
        ? 'Your admin session has expired. Sign in again to see the calendar connection status.'
        : `Could not read the calendar connection status (HTTP ${res.status}).`);
    } catch {
      setStatus(null);
      setStatusError('Could not reach the server to read the calendar connection status.');
    }
  }, []);

  // Is there a Google OAuth app for this instance AT ALL? Connecting a calendar needs a
  // client id and secret, supplied either by the host as a shared app (env) or by the
  // studio in Settings -> Google API. Without this probe the page offered a Connect
  // button that could only ever fail, which reads as a broken feature rather than an
  // unfinished setup step. A failed probe leaves it null: unknown must not be reported
  // as unconfigured, or a working instance gets told to reconfigure itself.
  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/setup/technical/current', { credentials: 'include' });
      if (!res.ok) return;
      const extras = (await res.json())?.extras || {};
      setGoogleConfigured(!!extras.googleOAuthManaged || (!!extras.googleClientId && !!extras.googleClientSecretSet));
    } catch { /* leave unknown */ }
  }, []);

  const fetchHealth = useCallback(async (probe = false) => {
    try {
      const res = await fetch(`/api/schedulers/gcal-health${probe ? '?probe=1' : ''}`, { credentials: 'include' });
      if (res.ok) setHealth(await res.json());
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([fetchStatus(), fetchHealth(), fetchConfig()]);
      setLoading(false);
    })();
  }, [fetchStatus, fetchHealth, fetchConfig]);

  // Listen for the OAuth popup completing.
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === 'GOOGLE_CALENDAR_CONNECTED') {
        setConnecting(false);
        setMessage({ type: 'success', text: 'Google Calendar reconnected. Verifying availability…' });
        fetchStatus();
        // Give the scheduler a moment to pick up the new tokens, then re-probe.
        setTimeout(() => fetchHealth(true), 1500);
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [fetchStatus, fetchHealth]);

  const handleConnect = async () => {
    setMessage(null);
    setConnecting(true);
    try {
      const res = await fetch('/api/auth/google/connect', { headers: authHeaders(), credentials: 'include' });
      if (!res.ok) {
        // The server names the actual obstacle ("Google is not configured on this
        // instance…"). Throwing a generic sign-in message over the top of it sent studios
        // to check their login when the credentials were what was missing.
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Could not start Google authorization. Please make sure you are signed in.');
      }
      const { authUrl } = await res.json();
      const popup = window.open(authUrl, 'Google Calendar Authorization', 'width=600,height=700,left=200,top=100');
      if (!popup) {
        setConnecting(false);
        setMessage({ type: 'error', text: 'Please allow pop-ups for this site, then click Reconnect again.' });
      }
    } catch (err: any) {
      setConnecting(false);
      setMessage({ type: 'error', text: err?.message || 'Failed to connect Google Calendar' });
    }
  };

  const handleSyncNow = async () => {
    setSyncing(true);
    setMessage(null);
    try {
      // This used to POST /api/calendar/import-google-events, which was defined only in
      // server/routes/calendar.ts — a router nothing ever mounted. Every click 404'd and
      // the catch below reported it as a bare "Sync failed", so the feature looked broken
      // rather than absent. That orphan router is gone; /google/sync is registered in
      // server/routes.ts behind authenticateUser and returns the same
      // {success, imported, updated, deleted, errors} shape read just below.
      const res = await fetch('/api/calendar/google/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        credentials: 'include',
        body: '{}',
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setMessage({ type: 'success', text: `Sync complete — imported ${data.imported || 0}, updated ${data.updated || 0}, deleted ${data.deleted || 0}.` });
        fetchStatus();
        fetchHealth(true);
      } else {
        setMessage({ type: 'error', text: data.error || data.errors?.join(', ') || 'Sync failed' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || 'Sync failed' });
    } finally {
      setSyncing(false);
    }
  };

  const handleRecheck = async () => {
    setRechecking(true);
    await Promise.all([fetchHealth(true), fetchStatus(), fetchConfig()]);
    setRechecking(false);
  };

  const handleDisconnect = async () => {
    if (!confirm('Disconnect Google Calendar? Two-way sync and online booking availability checks will stop until you reconnect.')) return;
    try {
      const res = await fetch('/api/auth/google/disconnect', { method: 'POST', headers: authHeaders(), credentials: 'include' });
      if (res.ok) {
        setStatus({ connected: false });
        setMessage({ type: 'success', text: 'Disconnected.' });
        fetchHealth(true);
      }
    } catch { /* ignore */ }
  };

  // Anything that is not an affirmative "connected: true" counts as not connected —
  // including a status we failed to read. The old `!!status && !status.connected` made
  // an unreadable status render as Connected.
  const neverConnected = !status?.connected;
  const tokenExpired = !!status?.tokenExpired;
  const needsReconnect = neverConnected || tokenExpired;
  // No OAuth app on the instance: Connect cannot work yet, and saying so beats letting
  // the studio click a button that answers with an error. Gated on needsReconnect so an
  // already-linked calendar keeps its Sync-now button — credentials disappearing under a
  // live connection is not the state this copy is written for.
  const needsSetup = googleConfigured === false && needsReconnect;
  const unhealthy = health?.configured && health?.status === 'unhealthy';

  return (
    <AdminLayout>
      <div className="max-w-3xl space-y-6">
        <div className="flex items-center gap-3">
          <Calendar className="h-7 w-7 text-blue-600" />
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Google Calendar Sync</h1>
            <p className="text-gray-600 mt-0.5">Connect Google Calendar so the scheduler can check availability and keep sessions in sync.</p>
          </div>
        </div>

        {message && (
          <div className={`rounded-lg border px-4 py-3 text-sm flex items-start gap-2 ${message.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
            {message.type === 'success' ? <Check className="h-4 w-4 mt-0.5 flex-shrink-0" /> : <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />}
            <span>{message.text}</span>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <>
            {/* Nothing to sync yet — and that is a setup step, not a fault. Amber, not
                red: red is reserved below for bookings actually being turned away. */}
            {needsSetup && (
              <div className="rounded-lg border border-amber-300 bg-amber-50 p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
                  <div className="text-sm">
                    <h3 className="font-semibold text-amber-900">Google is not set up on this instance yet</h3>
                    <p className="mt-1 text-amber-800">
                      Calendar sync needs a Google OAuth app before any calendar can be linked. Add a Google
                      Client ID and Client Secret under Settings → Google API, then come back here and connect
                      the calendar your bookings live in.
                    </p>
                    <p className="mt-2 text-amber-800">
                      Nothing here is broken — the feature is waiting on that one setup step.
                    </p>
                    <Link to="/admin/settings/google" className="mt-3 inline-flex items-center gap-1.5 font-medium text-amber-900 underline underline-offset-2 hover:text-amber-950">
                      Add Google API credentials
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* The status read itself failed. Saying so beats rendering a guess as fact. */}
            {statusError && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" />
                <span>{statusError}</span>
              </div>
            )}

            {/* Booking-impact banner */}
            {unhealthy && (
              <div className="rounded-lg border border-red-300 bg-red-50 p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" />
                  <div className="text-sm">
                    <h3 className="font-semibold text-red-800">Online booking is currently disabled</h3>
                    <p className="mt-1 text-red-700">
                      The scheduler can’t verify Google Calendar availability, so new bookings are being rejected to prevent double-bookings.
                      Reconnect below to restore booking.
                    </p>
                    {health?.lastError && (
                      <p className="mt-2 text-xs text-red-700"><strong>Reason:</strong> {health.lastError}</p>
                    )}
                    {!!health?.consecutiveFailures && health.consecutiveFailures > 1 && (
                      <p className="mt-1 text-xs text-red-600">{health.consecutiveFailures} consecutive failures</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Status card */}
            <div className="rounded-lg border border-gray-200 bg-white p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`inline-flex h-2.5 w-2.5 rounded-full ${needsReconnect ? 'bg-red-500' : 'bg-green-500'}`} />
                  <div>
                    <div className="font-medium text-gray-900">
                      {neverConnected ? 'Not connected' : tokenExpired ? 'Connection expired' : 'Connected'}
                    </div>
                    <div className="text-sm text-gray-500">
                      {status?.calendarId
                        ? status.calendarId
                        : needsSetup
                          ? 'Google API credentials not added yet'
                          : statusError
                            ? 'Status unavailable'
                            : 'No calendar linked yet'}
                      {status?.lastSyncAt ? ` · last synced ${new Date(status.lastSyncAt).toLocaleString()}` : ''}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRecheck}
                  disabled={rechecking}
                  className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  <RefreshCw className={`h-4 w-4 ${rechecking ? 'animate-spin' : ''}`} />
                  Re-check
                </button>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                {needsSetup ? (
                  <Link
                    to="/admin/settings/google"
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 font-medium text-white hover:bg-blue-700"
                  >
                    <Settings className="h-5 w-5" />
                    Set up Google API
                  </Link>
                ) : needsReconnect ? (
                  <button
                    type="button"
                    onClick={handleConnect}
                    disabled={connecting}
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {connecting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Link2 className="h-5 w-5" />}
                    {connecting ? 'Waiting for Google…' : neverConnected ? 'Connect Google Calendar' : 'Reconnect Google Calendar'}
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={handleSyncNow}
                      disabled={syncing}
                      className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                      <RefreshCw className={`h-5 w-5 ${syncing ? 'animate-spin' : ''}`} />
                      {syncing ? 'Syncing…' : 'Sync now'}
                    </button>
                    <a
                      href="https://calendar.google.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-5 py-2.5 font-medium text-gray-700 hover:bg-gray-50"
                    >
                      <ExternalLink className="h-5 w-5" />
                      Open Google Calendar
                    </a>
                  </>
                )}
              </div>

              {needsReconnect && !needsSetup && (
                <p className="mt-3 text-xs text-gray-500">
                  This opens a Google sign-in pop-up. Approve access on the account that owns your booking calendar — a fresh token is issued and online booking resumes automatically.
                </p>
              )}
            </div>

            {!neverConnected && (
              <button
                type="button"
                onClick={handleDisconnect}
                className="text-sm font-medium text-red-600 hover:text-red-700"
              >
                Disconnect Google Calendar
              </button>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  );
};

export default CalendarSyncPage;
