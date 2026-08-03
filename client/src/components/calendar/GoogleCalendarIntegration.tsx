import React, { useState, useEffect } from 'react';
import { Calendar, Settings, RotateCcw, Check, AlertCircle, ExternalLink, RefreshCw, Copy, Download, Upload, Loader2 } from 'lucide-react';
import ImportCalendarEvents from './ImportCalendarEvents';

interface GoogleCalendarIntegrationProps {
  isOpen: boolean;
  onClose: () => void;
  onConnectionSuccess?: () => void;
}

interface SyncStatus {
  connected: boolean;
  syncEnabled?: boolean;
  calendarId?: string;
  lastSyncAt?: string;
  email?: string;
  tokenExpired?: boolean;
}

const GoogleCalendarIntegration: React.FC<GoogleCalendarIntegrationProps> = ({
  isOpen,
  onClose,
  onConnectionSuccess
}) => {
  const [activeTab, setActiveTab] = useState<'ical' | 'oauth' | 'import'>('ical');
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({ connected: false });
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [connecting, setConnecting] = useState(false);

  // Fetch sync status when OAuth tab is active, and periodically check
  useEffect(() => {
    if (isOpen && activeTab === 'oauth') {
      fetchSyncStatus();
      // Poll every 60s to detect if token refresh resolved
      const interval = setInterval(() => fetchSyncStatus(), 60000);
      return () => clearInterval(interval);
    }
  }, [isOpen, activeTab]);

  // Listen for OAuth callback from popup
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (event.data.type === 'GOOGLE_CALENDAR_CONNECTED') {
        fetchSyncStatus();
        onConnectionSuccess?.();
        // Auto-trigger a full sync after fresh OAuth connection
        try {
          setSyncing(true);
          const resp = await fetch('/api/calendar/manual-sync', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
          });
          const data = await resp.json();
          if (resp.ok && data.success) {
            alert(`Calendar synced!\nImported: ${data.imported || 0}\nUpdated: ${data.updated || 0}`);
            fetchSyncStatus();
            onConnectionSuccess?.();
          }
        } catch (e) {
          console.error('Auto-sync after connect failed:', e);
        } finally {
          setSyncing(false);
        }
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onConnectionSuccess]);

  const fetchSyncStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/auth/google/status', {
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const contentType = response.headers.get('content-type');
      if (response.ok && contentType && contentType.includes('application/json')) {
        const data = await response.json();
        setSyncStatus(data);
      } else {
        // Try to get error message from response
        let errorText = '';
        try {
          errorText = await response.text();
        } catch (e) {}
        console.error('Non-JSON response from sync status:', errorText);
        setSyncStatus({ connected: false });
        alert('Failed to fetch calendar sync status. Please check your login and try again.');
      }
    } catch (error) {
      console.error('Error fetching sync status:', error);
      alert('Error fetching calendar sync status. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    try {
      setConnecting(true);
      const response = await fetch('/api/auth/google/connect', {
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const { authUrl } = await response.json();
        // Open OAuth popup
        const popup = window.open(
          authUrl,
          'Google Calendar Authorization',
          'width=600,height=700,left=200,top=100'
        );
        if (!popup) {
          alert('Please allow popups for this site to connect Google Calendar');
        }
      } else {
        const error = await response.json();
        alert(`Failed to connect: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error connecting:', error);
      alert('Failed to connect Google Calendar');
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect Google Calendar?')) return;
    try {
      const response = await fetch('/api/auth/google/disconnect', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (response.ok) {
        setSyncStatus({ connected: false });
        alert('Google Calendar disconnected');
      }
    } catch (error) {
      console.error('Error disconnecting:', error);
    }
  };

  const handleManualSync = async () => {
    try {
      setSyncing(true);
      const response = await fetch('/api/calendar/manual-sync', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const data = await response.json();
      if (response.ok && data.success) {
        alert(`Sync complete!\nImported: ${data.imported || 0}\nUpdated: ${data.updated || 0}`);
        fetchSyncStatus();
        onConnectionSuccess?.();
      } else if (data.tokenExpired) {
        // Token expired - auto-reconnect 
        setSyncStatus(prev => ({ ...prev, tokenExpired: true }));
        if (confirm('Google Calendar authorization has expired.\n\nWould you like to reconnect now?')) {
          handleReconnect();
        }
      } else {
        const errorMsg = data.errors?.join(', ') || data.error || 'Unknown error';
        alert(`Sync failed: ${errorMsg}`);
      }
    } catch (error) {
      console.error('Error syncing:', error);
      alert('Failed to sync - network error');
    } finally {
      setSyncing(false);
    }
  };

  // One-click reconnect: disconnect then immediately re-connect
  const handleReconnect = async () => {
    try {
      setConnecting(true);
      // First disconnect
      await fetch('/api/auth/google/disconnect', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      });
      // Then immediately start new OAuth flow
      const response = await fetch('/api/auth/google/connect', {
        credentials: 'include',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      });
      if (response.ok) {
        const { authUrl } = await response.json();
        const popup = window.open(
          authUrl,
          'Google Calendar Authorization',
          'width=600,height=700,left=200,top=100'
        );
        if (!popup) {
          alert('Please allow popups for this site to connect Google Calendar');
        }
      } else {
        alert('Failed to start reconnection. Please try again.');
      }
    } catch (error) {
      console.error('Error reconnecting:', error);
      alert('Failed to reconnect Google Calendar');
    } finally {
      setConnecting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  const downloadIcal = () => {
    window.open(`${window.location.origin}/api/calendar/photography-sessions.ics`, '_blank');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Calendar className="h-6 w-6 text-blue-600 mr-3" />
              <h2 className="text-xl font-semibold text-gray-900">Google Calendar Integration</h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Tab Navigation */}
          <div className="flex border-b border-gray-200 mb-6">
            <button
              onClick={() => setActiveTab('ical')}
              className={`px-4 py-2 text-sm font-medium border-b-2 ${
                activeTab === 'ical'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              iCal Subscription
            </button>
            <button
              onClick={() => setActiveTab('import')}
              className={`px-4 py-2 text-sm font-medium border-b-2 ${
                activeTab === 'import'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Import Existing Events
            </button>
            <button
              onClick={() => setActiveTab('oauth')}
              className={`px-4 py-2 text-sm font-medium border-b-2 ${
                activeTab === 'oauth'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              OAuth Integration
            </button>
          </div>

          {/* iCal Tab */}
          {activeTab === 'ical' && (
            <div className="space-y-6">
              {/* iCal Subscription - Simple Alternative */}
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <h4 className="font-medium text-green-900 mb-3">✨ Simple Google Calendar Integration</h4>
                <div className="space-y-3">
                  <p className="text-sm text-green-800">
                    Subscribe to your photography sessions calendar directly in Google Calendar using iCal feed.
                  </p>
                  
                  <div className="bg-white p-3 rounded border">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Your Photography Calendar iCal URL:
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={`${window.location.origin}/api/calendar/photography-sessions.ics`}
                        readOnly
                        className="flex-1 p-2 border border-gray-300 rounded bg-gray-50 text-sm"
                      />
                      <button
                        onClick={() => copyToClipboard(`${window.location.origin}/api/calendar/photography-sessions.ics`)}
                        className="px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 flex items-center space-x-1"
                      >
                        <Copy size={14} />
                        <span>Copy</span>
                      </button>
                    </div>
                  </div>
                  
                  <div className="text-sm text-green-800">
                    <p><strong>How to add to Google Calendar:</strong></p>
                    <ol className="list-decimal list-inside space-y-1 ml-4 mt-2">
                      <li>Open Google Calendar on your computer</li>
                      <li>On the left side, click "+" next to "Other calendars"</li>
                      <li>Select "From URL"</li>
                      <li>Paste the iCal URL above</li>
                      <li>Click "Add calendar"</li>
                    </ol>
                    <p className="mt-2 text-green-700">
                      <strong>✓ Your photography sessions will automatically appear in Google Calendar</strong><br/>
                      <strong>✓ Updates sync every few hours</strong><br/>
                      <strong>✓ No complex OAuth setup required</strong>
                    </p>
                  </div>
                  
                  <div className="flex space-x-3 pt-3">
                    <button
                      onClick={downloadIcal}
                      className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                    >
                      <Download size={16} />
                      <span>Download .ics File</span>
                    </button>
                    <button
                      onClick={() => window.open('https://calendar.google.com', '_blank')}
                      className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      <ExternalLink size={16} />
                      <span>Open Google Calendar</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Additional Features */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">What's Included in Your Calendar Feed</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Photography session titles and descriptions</li>
                  <li>• Client names and session types</li>
                  <li>• Location details for each session</li>
                  <li>• Session status (confirmed, tentative, cancelled)</li>
                  <li>• Priority levels for important sessions</li>
                  <li>• Automatic updates when you modify sessions</li>
                </ul>
              </div>
            </div>
          )}

          {/* Import Tab */}
          {activeTab === 'import' && (
            <div className="space-y-6">
              <ImportCalendarEvents onImportComplete={(count) => {
                alert(`Successfully imported ${count} events!`);
              }} />
            </div>
          )}

          {/* OAuth Tab */}
          {activeTab === 'oauth' && (
            <div className="space-y-6">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="animate-spin text-blue-500" size={32} />
                  <span className="ml-2 text-gray-600">Loading sync status...</span>
                </div>
              ) : syncStatus.connected ? (
                <>
                  {/* Connected Status */}
                  <div className={`${syncStatus.tokenExpired ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'} p-4 rounded-lg border`}>
                    <div className="flex items-center space-x-3">
                      {syncStatus.tokenExpired ? (
                        <AlertCircle className="text-red-600" size={24} />
                      ) : (
                        <Check className="text-green-600" size={24} />
                      )}
                      <div className="flex-1">
                        <h4 className={`font-medium ${syncStatus.tokenExpired ? 'text-red-900' : 'text-green-900'}`}>
                          {syncStatus.tokenExpired ? 'Google Calendar Authorization Expired' : 'Google Calendar Connected'}
                        </h4>
                        {syncStatus.tokenExpired && (
                          <p className="text-sm text-red-700">
                            Authorization expired. Click Reconnect to re-authorize instantly.
                          </p>
                        )}
                        {syncStatus.email && (
                          <p className={`text-sm ${syncStatus.tokenExpired ? 'text-red-700' : 'text-green-700'}`}>Calendar: {syncStatus.email}</p>
                        )}
                        {syncStatus.lastSyncAt && (
                          <p className={`text-sm ${syncStatus.tokenExpired ? 'text-red-600' : 'text-green-600'}`}>
                            Last synced: {new Date(syncStatus.lastSyncAt).toLocaleString()}
                          </p>
                        )}
                      </div>
                      {syncStatus.tokenExpired && (
                        <button
                          onClick={handleReconnect}
                          disabled={connecting}
                          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium whitespace-nowrap"
                        >
                          {connecting ? (
                            <Loader2 className="animate-spin" size={16} />
                          ) : (
                            <RotateCcw size={16} />
                          )}
                          <span>{connecting ? 'Reconnecting...' : 'Reconnect'}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Sync Actions */}
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={handleManualSync}
                      disabled={syncing}
                      className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                      {syncing ? (
                        <Loader2 className="animate-spin" size={16} />
                      ) : (
                        <RefreshCw size={16} />
                      )}
                      <span>{syncing ? 'Syncing...' : 'Sync Now'}</span>
                    </button>
                    <button
                      onClick={handleDisconnect}
                      className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                    >
                      <AlertCircle size={16} />
                      <span>Disconnect</span>
                    </button>
                  </div>

                  {/* Sync Features */}
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-2">Two-Way Sync Features</h4>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• Events sync automatically between Google Calendar and CRM</li>
                      <li>• Create sessions from Google Calendar events</li>
                      <li>• Automatic conflict detection</li>
                      <li>• Real-time updates</li>
                    </ul>
                  </div>
                </>
              ) : (
                <>
                  {/* Not Connected */}
                  <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                    <div className="flex items-center space-x-3">
                      <AlertCircle className="text-amber-600" size={24} />
                      <div>
                        <h4 className="font-medium text-amber-900">Google Calendar Not Connected</h4>
                        <p className="text-sm text-amber-700">
                          Connect your Google Calendar for two-way synchronization
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Connect Button */}
                  <button
                    onClick={handleConnect}
                    disabled={connecting}
                    className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
                  >
                    {connecting ? (
                      <Loader2 className="animate-spin" size={20} />
                    ) : (
                      <Calendar size={20} />
                    )}
                    <span>{connecting ? 'Connecting...' : 'Connect Google Calendar'}</span>
                  </button>

                  {/* Features Description */}
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-2">OAuth Integration Features</h4>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• Two-way synchronization (Google Calendar ↔ Photography CRM)</li>
                      <li>• Real-time updates</li>
                      <li>• Create sessions directly from Google Calendar</li>
                      <li>• Automatic conflict detection</li>
                      <li>• Multiple calendar support</li>
                    </ul>
                  </div>

                  {/* Privacy Notice */}
                  <div className="text-xs text-gray-500 text-center">
                    By connecting, you authorize access to view and manage your Google Calendar.
                    You can disconnect at any time.
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default GoogleCalendarIntegration;