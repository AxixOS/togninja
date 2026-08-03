import { supabase } from './supabase';
import { ColumnMapping, ImportPreset, ImportStatus } from '../types/client';

// Base URL for the client import API - using local backend
const getApiUrl = () => {
  return '/api/import';
};

// Check if local import API is accessible
export async function checkEdgeFunctionStatus(): Promise<{ available: boolean; error?: string }> {
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      return { available: false, error: `Authentication error: ${sessionError.message}` };
    }
    
    if (!session?.access_token) {
      return { available: false, error: 'Authentication required. Please log in and try again.' };
    }

    const apiUrl = getApiUrl();
    
    // Try to ping the local API with a simple request
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    try {
      const response = await fetch(`${apiUrl}/health`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const result = await response.json();
        if (result.status === 'available') {
          return { available: true };
        }
      }
      
      return { available: true }; // Assume available if we get any response
      
    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      if (fetchError.name === 'AbortError') {
        return { available: false, error: 'Connection timeout. Please check your connection.' };
      }
      
      return { available: false, error: `Connection failed: ${fetchError.message}` };
    }
    
  } catch (error) {
    return { available: false, error: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}

// Upload CSV file
export async function uploadCSV(file: File): Promise<{ importId: string; headers: string[]; sampleRows: any[] }> {
  try {
    // Check if Supabase is properly configured
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (!supabaseUrl) {
      throw new Error('Supabase configuration is missing. Please check your environment variables.');
    }

    // First check if Edge Function is available
    const functionStatus = await checkEdgeFunctionStatus();
    if (!functionStatus.available) {
      throw new Error(functionStatus.error || 'Edge Function is not available');
    }

    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      throw new Error(`Authentication error: ${sessionError.message}`);
    }
    
    if (!session?.access_token) {
      throw new Error('You must be logged in to upload files. Please log in and try again.');
    }

    // Validate file
    if (!file) {
      throw new Error('No file provided');
    }

    if (!file.name.toLowerCase().endsWith('.csv')) {
      throw new Error('Please upload a CSV file');
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      throw new Error('File size must be less than 10MB');
    }
    
    const formData = new FormData();
    formData.append('file', file);
    
    const apiUrl = getApiUrl();
    // console.log removed
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
    
    try {
      const response = await fetch(`${apiUrl}/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        },
        body: formData,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch (parseError) {
          // If we can't parse the error response, use the status text
          // console.warn removed
        }
        
        // Provide specific error messages for common HTTP status codes
        switch (response.status) {
          case 401:
            throw new Error('Authentication failed. Please log out and log back in.');
          case 403:
            throw new Error('You do not have permission to upload files. Admin access is required.');
          case 404:
            throw new Error('The CSV import Edge Function is not deployed to your Supabase project. Please deploy the "clients-import" Edge Function using the Supabase CLI: supabase functions deploy clients-import');
          case 500:
            throw new Error('Server error occurred. Please try again in a few minutes.');
          case 502:
          case 503:
          case 504:
            throw new Error('Service temporarily unavailable. The Supabase project may be starting up. Please wait a moment and try again.');
          default:
            throw new Error(errorMessage);
        }
      }
      
      const result = await response.json();
      
      if (!result.importId || !result.headers) {
        throw new Error('Invalid response from server. Please try again.');
      }
      
      return result;
      
    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      if (fetchError.name === 'AbortError') {
        throw new Error('Upload timed out. Please check your connection and try again.');
      }
      
      if (fetchError.message.includes('Failed to fetch')) {
        throw new Error('Cannot connect to the server. Please check:\n1. Your internet connection\n2. That your Supabase project is active (not paused)\n3. That the Edge Function is deployed\n4. Try refreshing the page and logging in again');
      }
      
      throw fetchError;
    }
    
  } catch (error) {
    // console.error removed
    
    // Re-throw with more context if it's a generic error
    if (error instanceof Error) {
      throw error;
    } else {
      throw new Error('An unexpected error occurred while uploading the file. Please try again.');
    }
  }
}

// Map columns and start import
export async function mapColumns(importId: string, columnMapping: ColumnMapping): Promise<void> {
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      throw new Error(`Authentication error: ${sessionError.message}`);
    }
    
    if (!session?.access_token) {
      throw new Error('Authentication required. Please log in and try again.');
    }
    
    const apiUrl = getApiUrl();
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    
    try {
      const response = await fetch(`${apiUrl}/map`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          importId,
          columnMapping
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch (parseError) {
          // console.warn removed
        }
        
        throw new Error(errorMessage);
      }
      
      await response.json();
      
    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      if (fetchError.name === 'AbortError') {
        throw new Error('Request timed out. Please try again.');
      }
      
      if (fetchError.message.includes('Failed to fetch')) {
        throw new Error('Cannot connect to the server. Please check your connection and try again.');
      }
      
      throw fetchError;
    }
    
  } catch (error) {
    // console.error removed
    throw error;
  }
}

// Get import status
export async function getImportStatus(importId: string): Promise<ImportStatus> {
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      throw new Error(`Authentication error: ${sessionError.message}`);
    }
    
    if (!session?.access_token) {
      throw new Error('Authentication required');
    }
    
    const apiUrl = getApiUrl();
    
    const response = await fetch(`${apiUrl}/status/${importId}`, {
      headers: {
        'Authorization': `Bearer ${session.access_token}`
      }
    });
    
    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorData.message || errorMessage;
      } catch (parseError) {
        // console.warn removed
      }
      
      throw new Error(errorMessage);
    }
    
    return await response.json();
  } catch (error) {
    // console.error removed
    throw error;
  }
}

// Get error file
export async function getErrorFile(errorFileUrl: string): Promise<Blob> {
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      throw new Error(`Authentication error: ${sessionError.message}`);
    }
    
    if (!session?.access_token) {
      throw new Error('Authentication required');
    }
    
    const response = await fetch(errorFileUrl, {
      headers: {
        'Authorization': `Bearer ${session.access_token}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to download error file');
    }
    
    return await response.blob();
  } catch (error) {
    // console.error removed
    throw error;
  }
}

// Save import preset
export async function saveImportPreset(name: string, mapping: ColumnMapping): Promise<ImportPreset> {
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      throw new Error(`Authentication error: ${sessionError.message}`);
    }
    
    if (!session?.access_token) {
      throw new Error('Authentication required');
    }
    
    const { data, error } = await supabase
      .from('import_presets')
      .insert({
        name,
        mapping,
        created_by: session.user.id
      })
      .select()
      .single();
    
    if (error) {
      throw error;
    }
    
    return data;
  } catch (error) {
    // console.error removed
    throw error;
  }
}

// Get import presets
export async function getImportPresets(): Promise<ImportPreset[]> {
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      throw new Error(`Authentication error: ${sessionError.message}`);
    }
    
    if (!session?.access_token) {
      throw new Error('Authentication required');
    }
    
    const { data, error } = await supabase
      .from('import_presets')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      throw error;
    }
    
    return data || [];
  } catch (error) {
    // console.error removed
    throw error;
  }
}

// Get import logs
export async function getImportLogs(): Promise<any[]> {
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      throw new Error(`Authentication error: ${sessionError.message}`);
    }
    
    if (!session?.access_token) {
      throw new Error('Authentication required');
    }
    
    const { data, error } = await supabase
      .from('import_logs')
      .select('*, imported_by(email)')
      .order('created_at', { ascending: false });
    
    if (error) {
      throw error;
    }
    
    return data || [];
  } catch (error) {
    // console.error removed
    throw error;
  }
}