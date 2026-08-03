import React, { useState, useRef, useEffect } from 'react';
import { Upload, X, Check, ArrowRight, AlertCircle, Loader2, RefreshCw, Download } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { ColumnMapping, ImportPreset, ImportStatus } from '../../types/client';

const ImportCSVWizard: React.FC = () => {
  // Step management
  const [currentStep, setCurrentStep] = useState(1);               // ← fixed bracket here
  const [file, setFile] = useState<File | null>(null);
  const [importId, setImportId] = useState<string | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [sampleRows, setSampleRows] = useState<any[]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({
    firstName: '',
    lastName: '',
    clientId: '',
    email: '',
  });
  const [presets, setPresets] = useState<ImportPreset[]>([]);
  const [selectedPreset, setSelectedPreset] = useState<string>('');
  const [newPresetName, setNewPresetName] = useState<string>('');
  const [savePreset, setSavePreset] = useState<boolean>(false);
  const [importStatus, setImportStatus] = useState<ImportStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionError, setConnectionError] = useState<boolean>(false);
  const [edgeFunctionError, setEdgeFunctionError] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const statusCheckInterval = useRef<number | null>(null);

  // Load presets on component mount
  useEffect(() => {
    fetchPresets();
    return () => {
      // Clear interval on unmount
      if (statusCheckInterval.current) {
        clearInterval(statusCheckInterval.current);
      }
    };
  }, []);

  const fetchPresets = async () => {
    try {
      // For now, use empty presets - can be implemented later
      setPresets([]);
    } catch (err) {
      // console.error removed
      // Don't show error for presets, just log it
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();

    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      if (!droppedFile.name.toLowerCase().endsWith('.csv')) {
        setError('Please upload a CSV file');
        return;
      }
      setFile(droppedFile);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file to upload');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setConnectionError(false);
      setEdgeFunctionError(false);

      // Get auth session
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        throw new Error('Authentication required. Please log in and try again.');
      }

      // Create FormData for file upload
      const formData = new FormData();
      formData.append('file', file);

      // Upload using Supabase Edge Function - upload endpoint
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/clients-import/upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      setImportId(data.importId);
      setHeaders(data.headers);
      setSampleRows(data.sampleRows);
      setCurrentStep(2);
    } catch (err) {
      // console.error removed

      // Check if this is a connection error
      if (
        err instanceof Error &&
        (err.message.includes('Failed to fetch') ||
          err.message.includes('Cannot connect to the server') ||
          err.message.includes('Service temporarily unavailable'))
      ) {
        setConnectionError(true);
      }

      setError(err instanceof Error ? err.message : 'An error occurred while uploading the file');
    } finally {
      setLoading(false);
    }
  };

  const handlePresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const presetId = e.target.value;
    setSelectedPreset(presetId);

    if (presetId) {
      const preset = presets.find((p) => p.id === presetId);
      if (preset) {
        setColumnMapping(preset.mapping);
      }
    }
  };

  const handleColumnMappingChange = (field: keyof ColumnMapping, value: string) => {
    setColumnMapping((prev) => ({ ...prev, [field]: value }));
  };

  const handleStartImport = async () => {
    if (!importId) {
      setError('Import ID is missing. Please try uploading the file again.');
      return;
    }

    // Validate required fields
    if (!columnMapping.firstName || !columnMapping.lastName || !columnMapping.clientId || !columnMapping.email) {
      setError('First Name, Last Name, Client ID, and Email mappings are required');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Save preset if requested (skip for now)
      if (savePreset && newPresetName.trim()) {
        // Preset saving can be implemented later
        // console.log removed
      }

      // Get auth session for the import request
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        throw new Error('Authentication required. Please log in and try again.');
      }

      // Start the import using Supabase Edge Function - map endpoint
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const mapResponse = await fetch(`${supabaseUrl}/functions/v1/clients-import/map`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          importId,
          columnMapping,
        }),
      });

      if (!mapResponse.ok) {
        const errorData = await mapResponse.json();
        throw new Error(errorData.error || 'Failed to start import');
      }

      const mapData = await mapResponse.json();
      if (mapData.error) {
        throw new Error(mapData.error);
      }

      // Move to status page
      setCurrentStep(3);

      // Start polling for status
      statusCheckInterval.current = window.setInterval(async () => {
        try {
          const statusResponse = await fetch(
            `${supabaseUrl}/functions/v1/clients-import/status/${importId}`,
            {
              method: 'GET',
              headers: {
                Authorization: `Bearer ${session.access_token}`,
                'Content-Type': 'application/json',
              },
            }
          );

          if (statusResponse.ok) {
            const statusData = await statusResponse.json();

            if (!statusData.error) {
              setImportStatus(statusData);

              // If import is complete, stop polling
              if (statusData.status === 'completed' || statusData.status === 'error') {
                if (statusCheckInterval.current) {
                  clearInterval(statusCheckInterval.current);
                  statusCheckInterval.current = null;
                }
              }
            }
          }
        } catch (statusError) {
          // console.error removed
          // Don't stop polling on error, just log it
        }
      }, 2000) as unknown as number;
    } catch (err) {
      // console.error removed
      setError(err instanceof Error ? err.message : 'An error occurred while starting the import');
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    // Reset error state and try again
    setError(null);
    setConnectionError(false);
    setEdgeFunctionError(false);

    if (currentStep === 1) {
      handleUpload();
    } else if (currentStep === 2) {
      handleStartImport();
    }
  };

  const handleReset = () => {
    // Reset the wizard
    setCurrentStep(1);
    setFile(null);
    setImportId(null);
    setHeaders([]);
    setSampleRows([]);
    setColumnMapping({
      firstName: '',
      lastName: '',
      clientId: '',
      email: '',
    });
    setSelectedPreset('');
    setNewPresetName('');
    setSavePreset(false);
    setImportStatus(null);
    setError(null);
    setConnectionError(false);
    setEdgeFunctionError(false);

    // Clear any running interval
    if (statusCheckInterval.current) {
      clearInterval(statusCheckInterval.current);
      statusCheckInterval.current = null;
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  /* ---------- Rendering helpers (unchanged) ---------- */
  // renderStepIndicator, renderStep1, renderStep2, renderStep3
  // (These remain exactly as in your original file.)

  /* --------------------------------------------------- */

  return (
    <div className="space-y-6">
      {error && !connectionError && !edgeFunctionError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start">
          <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 mr-2" />
          <div className="flex-1">
            <p className="font-medium">Error</p>
            <p className="whitespace-pre-line">{error}</p>
            {error.includes('Failed to fetch') && (
              <button onClick={handleRetry} className="mt-2 text-sm text-red-700 hover:text-red-800 underline">
                Retry
              </button>
            )}
          </div>
        </div>
      )}

      {renderStepIndicator()}

      {currentStep === 1 && renderStep1()}
      {currentStep === 2 && renderStep2()}
      {currentStep === 3 && renderStep3()}
    </div>
  );
};

export default ImportCSVWizard;
