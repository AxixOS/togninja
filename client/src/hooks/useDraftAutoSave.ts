import { useEffect, useCallback } from 'react';
import { debounce } from 'lodash';

interface DraftAutoSaveConfig {
  key: string;
  data: any;
  enabled?: boolean;
  debounceMs?: number;
}

export const useDraftAutoSave = ({ 
  key, 
  data, 
  enabled = true, 
  debounceMs = 500 
}: DraftAutoSaveConfig) => {
  
  // Debounced save function
  const debouncedSave = useCallback(
    debounce((draftData: any) => {
      if (!enabled) return;
      try {
        localStorage.setItem(key, JSON.stringify(draftData));
        console.log(`Draft auto-saved: ${key}`);
      } catch (error) {
        console.warn('Failed to save draft:', error);
      }
    }, debounceMs),
    [key, enabled, debounceMs]
  );

  // Auto-save on data changes
  useEffect(() => {
    if (data && enabled) {
      debouncedSave(data);
    }
    return () => {
      debouncedSave.cancel();
    };
  }, [data, debouncedSave, enabled]);

  // Restore draft function
  const restoreDraft = useCallback((): any | null => {
    if (!enabled) return null;
    try {
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : null;
    } catch (error) {
      console.warn('Failed to restore draft:', error);
      return null;
    }
  }, [key, enabled]);

  // Clear draft function
  const clearDraft = useCallback(() => {
    localStorage.removeItem(key);
    console.log(`Draft cleared: ${key}`);
  }, [key]);

  return {
    restoreDraft,
    clearDraft
  };
};

// Email composer specific hook
export const useEmailDraftAutoSave = (studioId: string, userId: string, emailData: any) => {
  const draftKey = `email-draft-${studioId}-${userId}`;
  
  return useDraftAutoSave({
    key: draftKey,
    data: emailData,
    enabled: true,
    debounceMs: 1000 // Save email drafts every 1 second
  });
};

// CRM form specific hook
export const useCrmFormDraftAutoSave = (studioId: string, formType: string, formData: any) => {
  const draftKey = `crm-form-${formType}-${studioId}`;
  
  return useDraftAutoSave({
    key: draftKey,
    data: formData,
    enabled: true,
    debounceMs: 2000 // Save CRM forms every 2 seconds
  });
};