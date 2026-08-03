import React, { useState, useEffect } from 'react';
import { Calendar, Download, Upload, Settings, RefreshCw } from 'lucide-react';
import { generateICalFromEvents, parseICalFile } from '../../lib/calendar';

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  description?: string;
  location?: string;
  allDay?: boolean;
}

const CalendarIntegration: React.FC = () => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [exportFormat, setExportFormat] = useState<'ical' | 'csv'>('ical');

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      setLoading(true);
      // In a real app, this would load from your backend/database
      // For now, we'll use sample data
      const sampleEvents: CalendarEvent[] = [
        {
          id: '1',
          title: 'Client Meeting - TogNinja Rebranding',
          start: new Date(2025, 5, 25, 10, 0),
          end: new Date(2025, 5, 25, 11, 30),
          description: 'Discuss rebranding strategy and timeline',
          location: 'Conference Room A'
        },
        {
          id: '2',
          title: 'Website Launch',
          start: new Date(2025, 5, 30, 9, 0),
          end: new Date(2025, 5, 30, 17, 0),
          description: 'Official launch of the new TogNinja website',
          allDay: true
        },
        {
          id: '3',
          title: 'Team Standup',
          start: new Date(2025, 5, 26, 9, 0),
          end: new Date(2025, 5, 26, 9, 30),
          description: 'Daily team synchronization meeting'
        }
      ];
      setEvents(sampleEvents);
    } catch (error) {
      // console.error removed
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      if (exportFormat === 'ical') {
        const icalContent = generateICalFromEvents(events);
        const blob = new Blob([icalContent], { type: 'text/calendar' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'togninja-calendar.ics';
        a.click();
        URL.revokeObjectURL(url);
      } else {
        // CSV export
        const csvContent = [
          'Title,Start Date,End Date,Description,Location,All Day',
          ...events.map(event => [
            `"${event.title}"`,
            event.start.toISOString(),
            event.end.toISOString(),
            `"${event.description || ''}"`,
            `"${event.location || ''}"`,
            event.allDay ? 'Yes' : 'No'
          ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'togninja-calendar.csv';
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      // console.error removed
    }
  };

  const handleImport = async () => {
    if (!importFile) return;

    try {
      setLoading(true);
      if (importFile.name.endsWith('.ics')) {
        const content = await importFile.text();
        const importedEvents = parseICalFile(content);
        setEvents([...events, ...importedEvents]);
      } else if (importFile.name.endsWith('.csv')) {
        // Handle CSV import
        const content = await importFile.text();
        const lines = content.split('\n');
        const headers = lines[0].split(',');
        const importedEvents: CalendarEvent[] = [];

        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',');
          if (values.length >= 6) {
            importedEvents.push({
              id: `imported-${Date.now()}-${i}`,
              title: values[0].replace(/"/g, ''),
              start: new Date(values[1]),
              end: new Date(values[2]),
              description: values[3].replace(/"/g, ''),
              location: values[4].replace(/"/g, ''),
              allDay: values[5] === 'Yes'
            });
          }
        }
        setEvents([...events, ...importedEvents]);
      }
      setImportFile(null);
    } catch (error) {
      // console.error removed
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Calendar Integration</h1>
          <p className="text-gray-600 mt-2">Manage and sync your calendar events</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadEvents}
            disabled={loading}
            className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Import/Export Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Import */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Import Calendar
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Calendar File
              </label>
              <input
                type="file"
                accept=".ics,.csv"
                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Supported formats: .ics (iCal), .csv
              </p>
            </div>
            <button
              onClick={handleImport}
              disabled={!importFile || loading}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Importing...' : 'Import Events'}
            </button>
          </div>
        </div>

        {/* Export */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Download className="w-5 h-5" />
            Export Calendar
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Export Format
              </label>
              <select
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value as 'ical' | 'csv')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ical">iCal (.ics)</option>
                <option value="csv">CSV (.csv)</option>
              </select>
            </div>
            <button
              onClick={handleExport}
              disabled={events.length === 0}
              className="w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Export {events.length} Events
            </button>
          </div>
        </div>
      </div>

      {/* Events List */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Calendar Events ({events.length})
          </h3>
        </div>
        
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : events.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No events found. Import a calendar file to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Event
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Start Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    End Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {events.map((event) => (
                  <tr key={event.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{event.title}</div>
                        {event.description && (
                          <div className="text-sm text-gray-500">{event.description}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {event.allDay ? 'All Day' : formatDate(event.start)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {event.allDay ? 'All Day' : formatDate(event.end)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {event.location || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        event.start > new Date() ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {event.start > new Date() ? 'Upcoming' : 'Past'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Integration Instructions */}
      <div className="mt-8 bg-blue-50 p-6 rounded-lg">
        <h4 className="font-semibold text-blue-900 mb-2">Calendar Integration Instructions</h4>
        <div className="text-sm text-blue-800 space-y-2">
          <p><strong>To sync with Google Calendar:</strong></p>
          <ol className="list-decimal list-inside space-y-1 ml-4">
            <li>Export your calendar as .ics format</li>
            <li>Open Google Calendar</li>
            <li>Click the "+" next to "Other calendars"</li>
            <li>Select "Import" and upload the .ics file</li>
          </ol>
          
          <p className="pt-2"><strong>To sync with Outlook:</strong></p>
          <ol className="list-decimal list-inside space-y-1 ml-4">
            <li>Export your calendar as .ics format</li>
            <li>Open Outlook</li>
            <li>Go to File → Open & Export → Import/Export</li>
            <li>Select "Import an iCalendar (.ics) or vCalendar file"</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default CalendarIntegration;
