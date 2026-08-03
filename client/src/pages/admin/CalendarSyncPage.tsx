import React, { useEffect, useState, useCallback } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import {
  Calendar, Check, AlertTriangle, RefreshCw, ExternalLink, Link2, Loader2,
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
  const [health, setHealth] = useState<GCalHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [rechecking, setRechecking] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/google/status', { headers: authHeaders(), credentials: 'include' });
      if (res.ok) setStatus(await res.json());
    } catch { /* ignore */ }
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
      await Promise.all([fetchStatus(), fetchHealth()]);
      setLoading(false);
    })();
  }, [fetchStatus, fetchHealth]);

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
      if (!res.ok) throw new Error('Could not start Google authorization. Please make sure you are signed in.');
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
      const res = await fetch('/api/calendar/import-google-events', {
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
    await Promise.all([fetchHealth(true), fetchStatus()]);
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

  const neverConnected = !!status && !status.connected;
  const tokenExpired = !!status?.tokenExpired;
  const needsReconnect = neverConnected || tokenExpired;
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
                      {status?.calendarId ? status.calendarId : 'No calendar linked yet'}
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
                {needsReconnect ? (
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

              {needsReconnect && (
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
