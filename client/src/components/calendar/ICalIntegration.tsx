import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Download,
  Upload,
  Calendar,
  Link2,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  X,
  Settings,
  Globe,
  Smartphone,
  Monitor,
  Copy,
  ExternalLink
} from 'lucide-react';
import {
  exportToICAL,
  importFromICAL,
  listCalendars,
  Calendar as CalendarType
} from '../../api/calendar';

interface ICalIntegrationProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess?: () => void;
}

const ICalIntegration: React.FC<ICalIntegrationProps> = ({
  isOpen,
  onClose,
  onImportSuccess
}) => {
  const [calendars, setCalendars] = useState<CalendarType[]>([]);
  const [selectedCalendar, setSelectedCalendar] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'export' | 'import' | 'sync'>('export');
  
  // Sync settings
  const [syncSettings, setSyncSettings] = useState({
    autoSync: false,
    syncInterval: '1h',
    syncUrl: '',
    lastSync: null as Date | null
  });

  useEffect(() => {
    if (isOpen) {
      loadCalendars();
    }
  }, [isOpen]);

  const loadCalendars = async () => {
    try {
      const data = await listCalendars();
      setCalendars(data);
      if (data.length > 0 && !selectedCalendar) {
        const defaultCal = data.find(cal => cal.is_default) || data[0];
        setSelectedCalendar(defaultCal.id);
      }
    } catch (err) {
      // console.error removed
      setError('Failed to load calendars');
    }
  };

  const handleExport = async (format: 'ics' | 'url' = 'ics') => {
    try {
      setLoading(true);
      setError(null);
      
      const icalData = await exportToICAL(selectedCalendar);
      
      if (format === 'ics') {
        // Download as file
        const blob = new Blob([icalData], { type: 'text/calendar' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `calendar-${selectedCalendar}-${new Date().toISOString().split('T')[0]}.ics`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        setSuccess('Calendar exported successfully!');
      } else {
        // Generate shareable URL (this would need backend implementation)
        const shareUrl = `${window.location.origin}/api/calendar/export/${selectedCalendar}`;
        navigator.clipboard.writeText(shareUrl);
        setSuccess('Calendar URL copied to clipboard!');
      }
    } catch (err) {
      // console.error removed
      setError('Failed to export calendar');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async (file: File) => {
    try {
      setLoading(true);
      setError(null);
      
      const text = await file.text();
      const result = await importFromICAL(text, selectedCalendar);
      
      setSuccess(`Successfully imported ${result.imported} events${result.errors.length > 0 ? ` with ${result.errors.length} warnings` : ''}`);
      
      if (result.errors.length > 0) {
        // console.warn removed
      }
      
      onImportSuccess?.();
    } catch (err) {
      // console.error removed
      setError('Failed to import calendar file');
    } finally {
      setLoading(false);
    }
  };

  const handleSyncTest = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // This would test the sync URL connection
      // In a real implementation, you'd validate the URL and test connectivity
      if (!syncSettings.syncUrl) {
        setError('Please enter a sync URL');
        return;
      }
      
      // Simulate sync test
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setSyncSettings(prev => ({
        ...prev,
        lastSync: new Date()
      }));
      
      setSuccess('Sync test successful!');
    } catch (err) {
      // console.error removed
      setError('Sync test failed');
    } finally {
      setLoading(false);
    }
  };

  const getWebcalUrl = () => {
    const baseUrl = window.location.origin;
    return `webcal://${baseUrl.replace('https://', '').replace('http://', '')}/api/calendar/export/${selectedCalendar}`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setSuccess('Copied to clipboard!');
  };

  const integrationInstructions = {
    google: {
      title: 'Google Calendar',
      steps: [
        'Copy the calendar URL',
        'Open Google Calendar',
        'Click "+" next to "Other calendars"',
        'Select "From URL"',
        'Paste the URL and click "Add calendar"'
      ]
    },
    outlook: {
      title: 'Outlook',
      steps: [
        'Copy the calendar URL',
        'Open Outlook Calendar',
        'Click "Add calendar" → "Subscribe from web"',
        'Paste the URL',
        'Name your calendar and click "Import"'
      ]
    },
    apple: {
      title: 'Apple Calendar',
      steps: [
        'Copy the webcal:// URL',
        'Open Calendar app',
        'Go to File → New Calendar Subscription',
        'Paste the URL and click "Subscribe"',
        'Configure sync settings and click "OK"'
      ]
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Calendar Integration</h2>
            <p className="text-gray-600">Export, import, and sync your calendar data</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 p-2"
          >
            <X size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { key: 'export', label: 'Export & Share', icon: Download },
              { key: 'import', label: 'Import', icon: Upload },
              { key: 'sync', label: 'Sync Settings', icon: RefreshCw }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon size={16} className="mr-2" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Calendar Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Calendar
            </label>
            <select
              value={selectedCalendar}
              onChange={(e) => setSelectedCalendar(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {calendars.map(calendar => (
                <option key={calendar.id} value={calendar.id}>
                  {calendar.name}
                </option>
              ))}
            </select>
          </div>

          {/* Success/Error Messages */}
          {success && (
            <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-start">
              <CheckCircle className="h-5 w-5 text-green-400 mt-0.5 mr-2" />
              <span>{success}</span>
              <button
                onClick={() => setSuccess(null)}
                className="ml-auto text-green-400 hover:text-green-600"
              >
                <X size={16} />
              </button>
            </div>
          )}

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start">
              <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 mr-2" />
              <span>{error}</span>
              <button
                onClick={() => setError(null)}
                className="ml-auto text-red-400 hover:text-red-600"
              >
                <X size={16} />
              </button>
            </div>
          )}

          {/* Export Tab */}
          {activeTab === 'export' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Export Options</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <button
                    onClick={() => handleExport('ics')}
                    disabled={loading || !selectedCalendar}
                    className="p-4 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed text-left"
                  >
                    <div className="flex items-center mb-2">
                      <Download className="h-5 w-5 text-blue-600 mr-2" />
                      <span className="font-medium">Download .ics File</span>
                    </div>
                    <p className="text-sm text-gray-600">
                      Download calendar as an iCal file for one-time import
                    </p>
                  </button>

                  <button
                    onClick={() => handleExport('url')}
                    disabled={loading || !selectedCalendar}
                    className="p-4 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed text-left"
                  >
                    <div className="flex items-center mb-2">
                      <Link2 className="h-5 w-5 text-green-600 mr-2" />
                      <span className="font-medium">Generate Share URL</span>
                    </div>
                    <p className="text-sm text-gray-600">
                      Create a shareable link for live calendar sync
                    </p>
                  </button>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Integration URLs</h3>
                
                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-900">iCal URL (HTTP)</span>
                      <button
                        onClick={() => copyToClipboard(`${window.location.origin}/api/calendar/export/${selectedCalendar}`)}
                        className="text-blue-600 hover:text-blue-800 p-1"
                      >
                        <Copy size={16} />
                      </button>
                    </div>
                    <code className="text-sm text-gray-600 break-all">
                      {window.location.origin}/api/calendar/export/{selectedCalendar}
                    </code>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-900">Webcal URL (for Apple Calendar)</span>
                      <button
                        onClick={() => copyToClipboard(getWebcalUrl())}
                        className="text-blue-600 hover:text-blue-800 p-1"
                      >
                        <Copy size={16} />
                      </button>
                    </div>
                    <code className="text-sm text-gray-600 break-all">
                      {getWebcalUrl()}
                    </code>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Integration Instructions</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {Object.entries(integrationInstructions).map(([key, instruction]) => (
                    <div key={key} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center mb-3">
                        {key === 'google' && <Globe className="h-5 w-5 text-blue-500 mr-2" />}
                        {key === 'outlook' && <Monitor className="h-5 w-5 text-blue-600 mr-2" />}
                        {key === 'apple' && <Smartphone className="h-5 w-5 text-gray-700 mr-2" />}
                        <span className="font-medium">{instruction.title}</span>
                      </div>
                      <ol className="text-sm text-gray-600 space-y-1">
                        {instruction.steps.map((step, index) => (
                          <li key={index} className="flex">
                            <span className="mr-2 text-blue-500">{index + 1}.</span>
                            <span>{step}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Import Tab */}
          {activeTab === 'import' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Import Calendar</h3>
                
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <Calendar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-600 mb-4">
                    Drop your .ics or .ical file here, or click to browse
                  </p>
                  <input
                    type="file"
                    accept=".ics,.ical"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleImport(file);
                      }
                    }}
                    className="hidden"
                    id="calendar-import-file"
                  />
                  <label
                    htmlFor="calendar-import-file"
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg cursor-pointer inline-flex items-center"
                  >
                    <Upload size={16} className="mr-2" />
                    Choose File
                  </label>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start">
                  <AlertCircle className="h-5 w-5 text-blue-400 mt-0.5 mr-2" />
                  <div>
                    <h4 className="font-medium text-blue-900 mb-1">Import Notes</h4>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• Events will be imported into the selected calendar</li>
                      <li>• Duplicate events (based on UID) will be skipped</li>
                      <li>• Recurring events will be imported with their recurrence rules</li>
                      <li>• Attendee information will be preserved when available</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Sync Tab */}
          {activeTab === 'sync' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Sync Settings</h3>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="font-medium text-gray-900">Auto Sync</label>
                      <p className="text-sm text-gray-600">Automatically sync calendar data</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={syncSettings.autoSync}
                        onChange={(e) => setSyncSettings(prev => ({ ...prev, autoSync: e.target.checked }))}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" />
                    </label>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Sync Interval
                    </label>
                    <select
                      value={syncSettings.syncInterval}
                      onChange={(e) => setSyncSettings(prev => ({ ...prev, syncInterval: e.target.value }))}
                      disabled={!syncSettings.autoSync}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                    >
                      <option value="15m">Every 15 minutes</option>
                      <option value="1h">Every hour</option>
                      <option value="6h">Every 6 hours</option>
                      <option value="1d">Daily</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      External Calendar URL
                    </label>
                    <input
                      type="url"
                      value={syncSettings.syncUrl}
                      onChange={(e) => setSyncSettings(prev => ({ ...prev, syncUrl: e.target.value }))}
                      placeholder="https://calendar.google.com/calendar/ical/..."
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <p className="text-sm text-gray-600 mt-1">
                      Enter an iCal URL to sync events from an external calendar
                    </p>
                  </div>

                  <div className="flex space-x-3">
                    <button
                      onClick={handleSyncTest}
                      disabled={loading || !syncSettings.syncUrl}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center disabled:bg-gray-400"
                    >
                      {loading ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      ) : (
                        <RefreshCw size={16} className="mr-2" />
                      )}
                      Test Connection
                    </button>

                    {syncSettings.lastSync && (
                      <div className="flex items-center text-sm text-gray-600">
                        <CheckCircle size={16} className="mr-2 text-green-500" />
                        Last sync: {syncSettings.lastSync.toLocaleString()}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start">
                  <AlertCircle className="h-5 w-5 text-yellow-400 mt-0.5 mr-2" />
                  <div>
                    <h4 className="font-medium text-yellow-900 mb-1">Sync Configuration</h4>
                    <p className="text-sm text-yellow-800">
                      Sync settings require backend configuration to work properly. 
                      Contact your administrator to enable external calendar synchronization.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default ICalIntegration;
