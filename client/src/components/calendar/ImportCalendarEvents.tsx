import React, { useState, useRef } from 'react';
import { Upload, Download, Calendar, AlertCircle, Check, ExternalLink } from 'lucide-react';

interface ImportCalendarEventsProps {
  onImportComplete: (count: number) => void;
}

const ImportCalendarEvents: React.FC<ImportCalendarEventsProps> = ({ onImportComplete }) => {
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ success: boolean; count?: number; error?: string } | null>(null);
  const [icsUrl, setIcsUrl] = useState('');
  // Admin cleanup state
  const [clusters, setClusters] = useState<any[] | null>(null);
  const [clustersSample, setClustersSample] = useState<any[] | null>(null);
  const [clusterThreshold, setClusterThreshold] = useState<number>(20);
  const [clusterLimit, setClusterLimit] = useState<number>(20);
  const [targetIso, setTargetIso] = useState<string>('');
  const [cleanupOnlyNullIcalUid, setCleanupOnlyNullIcalUid] = useState<boolean>(true);
  const [cleanupDryRunResult, setCleanupDryRunResult] = useState<any | null>(null);
  const [reimportAfterCleanup, setReimportAfterCleanup] = useState<boolean>(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleGoogleCalendarImport = async () => {
    setIsImporting(true);
    setImportResult(null);

    try {
      // First, try to export from Google Calendar
      const response = await fetch('/api/calendar/import/google', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          action: 'import_existing',
          // In a real implementation, this would use OAuth tokens
          // For now, we'll provide instructions for manual import
        }),
      });

      if (!response.ok) {
        throw new Error('Import failed');
      }

      const result = await response.json();
      setImportResult({ success: true, count: result.imported });
      onImportComplete(result.imported);
    } catch (error) {
      setImportResult({ success: false, error: 'Import failed. Please try manual import.' });
    } finally {
      setIsImporting(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!file.name.endsWith('.ics')) {
      setImportResult({ success: false, error: 'Please select a valid .ics calendar file' });
      return;
    }

    setIsImporting(true);
    setImportResult(null);

    try {
      const fileContent = await file.text();
      
      const response = await fetch('/api/calendar/import/ics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          icsContent: fileContent,
          fileName: file.name
        }),
      });

      if (!response.ok) {
        throw new Error('Import failed');
      }

      const result = await response.json();
      setImportResult({ success: true, count: result.imported });
      onImportComplete(result.imported);
    } catch (error) {
      setImportResult({ success: false, error: 'Failed to import calendar file. Please check the file format.' });
    } finally {
      setIsImporting(false);
    }
  };

  const handleIcsUrlImport = async () => {
    if (!icsUrl.trim()) {
      setImportResult({ success: false, error: 'Please enter a valid .ics URL' });
      return;
    }

    setIsImporting(true);
    setImportResult(null);

    try {
      const response = await fetch('/api/calendar/import/ics-url?includePast=true', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          icsUrl: icsUrl.trim()
        }),
      });

      if (!response.ok) {
        throw new Error('Import failed');
      }

      const result = await response.json();
      setImportResult({ success: true, count: result.imported });
      onImportComplete(result.imported);
    } catch (error) {
      setImportResult({ success: false, error: 'Failed to import from URL. Please check the URL is accessible.' });
    } finally {
      setIsImporting(false);
    }
  };

  // Admin: fetch stacked clusters
  const fetchStackedClusters = async () => {
    try {
      setIsImporting(true);
      setClusters(null);
      setClustersSample(null);
      const params = new URLSearchParams({ threshold: String(clusterThreshold), limit: String(clusterLimit) });
      const res = await fetch(`/api/admin/calendar/stacked-clusters?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch clusters');
      const data = await res.json();
      setClusters(data.clusters || []);
      setClustersSample(data.sample || []);
      if ((data.clusters || []).length > 0) {
        setTargetIso(data.clusters[0].start_time_iso);
      }
    } catch (e) {
      setImportResult({ success: false, error: 'Failed to load stacked clusters.' });
    } finally {
      setIsImporting(false);
    }
  };

  // Admin: dry-run cleanup
  const runCleanupDryRun = async () => {
    if (!targetIso) {
      setImportResult({ success: false, error: 'Select a target ISO timestamp from clusters first.' });
      return;
    }
    try {
      setIsImporting(true);
      setCleanupDryRunResult(null);
      const res = await fetch('/api/admin/calendar/cleanup-stacked', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetStartTimeIso: targetIso, onlyNullIcalUid: cleanupOnlyNullIcalUid, dryRun: true }),
      });
      if (!res.ok) throw new Error('Dry-run failed');
      const data = await res.json();
      setCleanupDryRunResult(data);
    } catch (e) {
      setImportResult({ success: false, error: 'Cleanup dry-run failed.' });
    } finally {
      setIsImporting(false);
    }
  };

  // Admin: execute cleanup
  const runCleanup = async () => {
    if (!targetIso) {
      setImportResult({ success: false, error: 'Select a target ISO timestamp from clusters first.' });
      return;
    }
    try {
      setIsImporting(true);
      const res = await fetch('/api/admin/calendar/cleanup-stacked', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetStartTimeIso: targetIso, onlyNullIcalUid: cleanupOnlyNullIcalUid, dryRun: false }),
      });
      if (!res.ok) throw new Error('Cleanup failed');
      const data = await res.json();
      // Optionally re-import immediately using provided ICS URL
      if (reimportAfterCleanup && icsUrl.trim()) {
        try {
          const re = await fetch('/api/calendar/import/ics-url', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ icsUrl: icsUrl.trim() }),
          });
          if (re.ok) {
            const rr = await re.json();
            setImportResult({ success: true, count: rr.imported });
            onImportComplete(rr.imported || 0);
          } else {
            setImportResult({ success: false, error: 'Cleanup done, but re-import failed.' });
          }
        } catch (e) {
          setImportResult({ success: false, error: 'Cleanup done, but re-import failed.' });
        }
      } else {
        setImportResult({ success: true, count: 0 });
      }
      // refresh clusters view
      fetchStackedClusters();
    } catch (e) {
      setImportResult({ success: false, error: 'Cleanup failed.' });
    } finally {
      setIsImporting(false);
    }
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 p-4 rounded-lg">
        <h4 className="font-medium text-blue-900 mb-2">Import Existing Calendar Events</h4>
        <p className="text-sm text-blue-800 mb-3">
          Import your existing Google Calendar bookings into the photography CRM system.
        </p>
        
        {/* Import from URL */}
        <div className="bg-white p-4 rounded border">
          <h5 className="font-medium text-gray-900 mb-2">Import from .ics URL</h5>
          <p className="text-sm text-gray-600 mb-3">Paste your Google Calendar .ics URL:</p>
          <div className="flex space-x-2">
            <input
              type="url"
              placeholder="https://calendar.google.com/calendar/ical/..."
              value={icsUrl}
              onChange={(e) => setIcsUrl(e.target.value)}
              className="flex-1 p-2 border border-gray-300 rounded text-sm"
            />
            <button
              onClick={handleIcsUrlImport}
              disabled={isImporting || !icsUrl.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 text-sm"
            >
              {isImporting ? 'Importing...' : 'Import'}
            </button>
          </div>
        </div>

        {/* File Upload */}
        <div className="bg-white p-4 rounded border">
          <h5 className="font-medium text-gray-900 mb-2">Upload .ics File</h5>
          <p className="text-sm text-gray-600 mb-3">Or upload a downloaded .ics calendar file:</p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".ics"
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            onClick={handleFileSelect}
            disabled={isImporting}
            className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
          >
            <Upload size={16} />
            <span>Choose .ics File</span>
          </button>
        </div>

        {/* Instructions */}
        <div className="bg-gray-50 p-3 rounded">
          <h5 className="font-medium text-gray-900 mb-2">How to get your .ics URL from Google Calendar:</h5>
          <ol className="text-sm text-gray-700 space-y-1 list-decimal list-inside">
            <li>Open Google Calendar</li>
            <li>Click the gear icon → Settings</li>
            <li>Select your calendar from the left sidebar</li>
            <li>Scroll to "Integrate calendar"</li>
            <li>Copy the "Secret address in iCal format" URL</li>
            <li>Paste it above and click Import</li>
          </ol>
        </div>
      </div>

      {importResult && (
        <div className={`p-4 rounded-lg ${importResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
          <div className="flex items-center space-x-2">
            {importResult.success ? (
              <Check className="h-5 w-5 text-green-600" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-600" />
            )}
            <span className={`font-medium ${importResult.success ? 'text-green-900' : 'text-red-900'}`}>
              {importResult.success 
                ? `Successfully imported ${importResult.count} events!` 
                : 'Import failed'
              }
            </span>
          </div>
          {importResult.error && (
            <p className="text-sm text-red-800 mt-2">{importResult.error}</p>
          )}
        </div>
      )}

      {/* Admin cleanup tools */}
      <div className="bg-purple-50 p-4 rounded-lg">
        <h4 className="font-medium text-purple-900 mb-2">Admin: Cleanup legacy stacked entries</h4>
        <p className="text-sm text-purple-800 mb-3">Detect clusters of sessions sharing the exact same UTC start time and remove the broken ones (typically rows without iCal UID).</p>

        <div className="bg-white p-4 rounded border space-y-3">
          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-700">Threshold</label>
            <input type="number" className="w-24 p-1 border rounded text-sm" value={clusterThreshold} onChange={(e)=>setClusterThreshold(parseInt(e.target.value||'0',10))} />
            <label className="text-sm text-gray-700">Limit</label>
            <input type="number" className="w-24 p-1 border rounded text-sm" value={clusterLimit} onChange={(e)=>setClusterLimit(parseInt(e.target.value||'0',10))} />
            <button onClick={fetchStackedClusters} disabled={isImporting} className="ml-auto px-3 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 text-sm">Scan</button>
          </div>

          {clusters && clusters.length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-600">
                    <th className="py-1 pr-3">Start Time (UTC ISO)</th>
                    <th className="py-1 pr-3">Count</th>
                    <th className="py-1 pr-3">with iCal UID</th>
                    <th className="py-1 pr-3">without iCal UID</th>
                    <th className="py-1">Select</th>
                  </tr>
                </thead>
                <tbody>
                  {clusters.map((c:any)=> (
                    <tr key={c.start_time_iso} className="border-t">
                      <td className="py-1 pr-3 font-mono">{c.start_time_iso}</td>
                      <td className="py-1 pr-3">{c.count}</td>
                      <td className="py-1 pr-3">{c.with_ical_uid}</td>
                      <td className="py-1 pr-3">{c.without_ical_uid}</td>
                      <td className="py-1">
                        <button onClick={()=>setTargetIso(c.start_time_iso)} className={`px-2 py-1 rounded text-xs ${targetIso===c.start_time_iso?'bg-purple-700 text-white':'bg-gray-100 hover:bg-gray-200'}`}>Target</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {clustersSample && clustersSample.length > 0 && (
            <div className="text-xs text-gray-700">
              <div className="font-medium mb-1">Sample of latest rows in top cluster:</div>
              <ul className="list-disc list-inside">
                {clustersSample.map((s:any)=> (
                  <li key={s.id} className="truncate">{s.id} — {s.title || '(untitled)'} — {s.ical_uid || '(no iCal UID)'} — {s.created_at}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-700">Target ISO</label>
            <input value={targetIso} onChange={(e)=>setTargetIso(e.target.value)} placeholder="2025-09-08T16:36:48Z" className="flex-1 p-2 border rounded text-sm font-mono" />
          </div>

          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-700 flex items-center gap-1">
              <input type="checkbox" checked={cleanupOnlyNullIcalUid} onChange={(e)=>setCleanupOnlyNullIcalUid(e.target.checked)} />
              Delete only rows without iCal UID
            </label>
            <label className="text-sm text-gray-700 flex items-center gap-1 ml-auto">
              <input type="checkbox" checked={reimportAfterCleanup} onChange={(e)=>setReimportAfterCleanup(e.target.checked)} />
              Re-import from .ics URL after cleanup
            </label>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={runCleanupDryRun} disabled={isImporting || !targetIso} className="px-3 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:opacity-50 text-sm">Dry-run</button>
            <button onClick={runCleanup} disabled={isImporting || !targetIso} className="px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 text-sm">Delete now</button>
          </div>

          {cleanupDryRunResult && (
            <div className="text-sm text-gray-800 bg-yellow-50 border border-yellow-200 p-2 rounded">
              <div className="font-medium">Dry-run summary</div>
              <div>Target: <span className="font-mono">{cleanupDryRunResult.targetStartTimeIso}</span></div>
              <div>Total at target: {cleanupDryRunResult.summary?.total ?? 0}</div>
              <div>With iCal UID: {cleanupDryRunResult.summary?.with_ical_uid ?? 0}</div>
              <div>Without iCal UID: {cleanupDryRunResult.summary?.without_ical_uid ?? 0}</div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-amber-50 p-4 rounded-lg">
        <h4 className="font-medium text-amber-900 mb-2">Alternative: Manual Entry</h4>
        <p className="text-sm text-amber-800">
          You can also manually create photography sessions in the CRM for your existing bookings. 
          This gives you full control over client details, pricing, and session information.
        </p>
      </div>
    </div>
  );
};

export default ImportCalendarEvents;