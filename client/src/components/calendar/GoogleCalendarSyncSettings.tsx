/**
 * Google Calendar 2-Way Sync Settings Component
 * Similar to Sprout Studio's settings UI
 */

import React, { useState, useEffect } from 'react';
import { Calendar, Check, AlertCircle, RefreshCw, X, ExternalLink } from 'lucide-react';

interface SyncStatus {
  connected: boolean;
  syncEnabled?: boolean;
  calendarId?: string;
  lastSyncAt?: string;
}

interface SyncResults {
  success: boolean;
  imported?: number;
  updated?: number;
  deleted?: number;
  errors?: string[];
}

const GoogleCalendarSyncSettings: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({ connected: false });
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncResults, setLastSyncResults] = useState<SyncResults | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchSyncStatus();
    }
  }, [isOpen]);

  // Listen for OAuth callback
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'GOOGLE_CALENDAR_CONNECTED') {
        fetchSyncStatus();
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const fetchSyncStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/auth/google/status', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSyncStatus(data);
      }
    } catch (error) {
      console.error('Error fetching sync status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    try {
      const response = await fetch('/api/auth/google/connect', {
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

        // Check if popup was blocked
        if (!popup) {
          alert('Please allow popups for this site to connect Google Calendar');
        }
      }
    } catch (error) {
      console.error('Error connecting:', error);
      alert('Failed to connect Google Calendar');
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect Google Calendar? Sync will stop.')) {
      return;
    }

    try {
      const response = await fetch('/api/auth/google/disconnect', {
        method: 'POST',
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
      alert('Failed to disconnect');
    }
  };

  const handleToggleSync = async () => {
    try {
      const newEnabled = !syncStatus.syncEnabled;

      const response = await fetch('/api/auth/google/toggle-sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ enabled: newEnabled }),
      });

      if (response.ok) {
        setSyncStatus({ ...syncStatus, syncEnabled: newEnabled });
      }
    } catch (error) {
      console.error('Error toggling sync:', error);
      alert('Failed to toggle sync');
    }
  };

  const handleManualSync = async () => {
    try {
      setSyncing(true);
      const response = await fetch('/api/calendar/import-google-events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({}),
      });

      const results = await response.json();
      
      if (response.ok && results.success) {
        setLastSyncResults(results);
        fetchSyncStatus(); // Refresh status
        alert(`Sync complete!\nImported: ${results.imported}\nUpdated: ${results.updated}\nDeleted: ${results.deleted}`);
      } else {
        const errorMsg = results.error || results.errors?.join(', ') || 'Unknown error';
        alert(`Sync failed: ${errorMsg}`);
      }
    } catch (error: any) {
      console.error('Error syncing:', error);
      alert(`Failed to sync: ${error.message || 'Network error'}`);
    } finally {
      setSyncing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Calendar className="h-6 w-6 text-blue-600 mr-3" />
              <h2 className="text-xl font-semibold text-gray-900">Two-way Calendar Sync</h2>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : !syncStatus.connected ? (
            /* Not Connected State */
            <div className="space-y-6">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h4 className="font-medium text-blue-900 mb-2">✨ Connect Your Google Calendar</h4>
                <p className="text-sm text-blue-800 mb-4">
                  Enable two-way sync to keep your photography sessions in sync with Google Calendar.
                  Any changes you make in either place will be automatically updated!
                </p>
                <button
                  onClick={handleConnect}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition flex items-center"
                >
                  <Calendar className="h-5 w-5 mr-2" />
                  Connect Google Calendar
                </button>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">Features you'll get:</h4>
                <ul className="space-y-2">
                  <li className="flex items-start">
                    <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-700">
                      <strong>Create in CRM →</strong> Automatically appears in Google Calendar
                    </span>
                  </li>
                  <li className="flex items-start">
                    <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-700">
                      <strong>Update in CRM →</strong> Changes sync to Google Calendar
                    </span>
                  </li>
                  <li className="flex items-start">
                    <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-700">
                      <strong>Create in Google →</strong> Imports to CRM automatically (every 5 min)
                    </span>
                  </li>
                  <li className="flex items-start">
                    <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-700">
                      <strong>Update in Google →</strong> Syncs changes back to CRM
                    </span>
                  </li>
                  <li className="flex items-start">
                    <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-700">
                      <strong>Automatic sync</strong> every 5 minutes in the background
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          ) : (
            /* Connected State */
            <div className="space-y-6">
              {/* Success Message */}
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <div className="flex items-start">
                  <Check className="h-5 w-5 text-green-600 mr-3 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-green-900 mb-1">
                      Google Calendar sync {syncStatus.syncEnabled ? 'enabled' : 'disabled'}
                    </h4>
                    <p className="text-sm text-green-800">
                      {syncStatus.syncEnabled
                        ? "You've connected your Google Calendar and turned on two-way sync. Any dates you add, edit, or delete from either Google or Photography CRM will be kept in-sync!"
                        : "Connected but sync is paused. Enable sync below to start syncing."}
                    </p>
                  </div>
                </div>
              </div>

              {/* Calendar Configuration */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Configure your Google Calendars</h4>
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Calendar className="h-5 w-5 text-blue-600 mr-3" />
                      <div>
                        <div className="font-medium text-gray-900">{syncStatus.calendarId}</div>
                        <div className="text-sm text-gray-500">
                          {syncStatus.lastSyncAt
                            ? `Last synced: ${new Date(syncStatus.lastSyncAt).toLocaleString()}`
                            : 'Never synced'}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600">Show ✓</span>
                      <span className="text-sm text-gray-600">Check ✓</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sync Controls */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Configure Syncing</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <span className="text-sm text-gray-700">Enable automatic sync</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={syncStatus.syncEnabled}
                        onChange={handleToggleSync}
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center space-x-3">
                    <button
                      onClick={handleManualSync}
                      disabled={syncing}
                      className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                    >
                      <RefreshCw className={`h-5 w-5 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                      {syncing ? 'Syncing...' : 'Sync Now'}
                    </button>

                    <a
                      href="https://calendar.google.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                    >
                      <ExternalLink className="h-5 w-5 mr-2" />
                      Open Google Calendar
                    </a>
                  </div>
                </div>
              </div>

              {/* Session Type Mapping */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">What to sync</h4>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input type="checkbox" defaultChecked className="mr-2" />
                    <span className="text-sm text-gray-700">Unattached dates</span>
                  </label>
                  <label className="flex items-center">
                    <input type="checkbox" defaultChecked className="mr-2" />
                    <span className="text-sm text-gray-700">Lead dates (pending bookings)</span>
                  </label>
                  <label className="flex items-center">
                    <input type="checkbox" defaultChecked className="mr-2" />
                    <span className="text-sm text-gray-700">Shoot dates (confirmed sessions)</span>
                  </label>
                </div>
              </div>

              {/* Last Sync Results */}
              {lastSyncResults && (
                <div className={`p-4 rounded-lg border ${lastSyncResults.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                  <h4 className="font-medium mb-2">Last Sync Results</h4>
                  {lastSyncResults.success ? (
                    <ul className="text-sm space-y-1">
                      <li>✓ Imported: {lastSyncResults.imported}</li>
                      <li>✓ Updated: {lastSyncResults.updated}</li>
                      <li>✓ Deleted: {lastSyncResults.deleted}</li>
                    </ul>
                  ) : (
                    <p className="text-sm text-red-800">{lastSyncResults.errors?.join(', ')}</p>
                  )}
                </div>
              )}

              {/* Disconnect */}
              <div className="pt-4 border-t border-gray-200">
                <button
                  onClick={handleDisconnect}
                  className="text-red-600 hover:text-red-700 text-sm font-medium"
                >
                  Disconnect Google Calendar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GoogleCalendarSyncSettings;
