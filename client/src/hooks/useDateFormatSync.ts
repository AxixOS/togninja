/**
 * useDateFormatSync - Syncs the server-stored date format preference into localStorage.
 * 
 * Call this once near the root of the admin app (e.g. in AdminLayout or App).
 * It fetches /api/studio-config and stores the dateFormat preference locally
 * so that the formatting utility (dateFormat.ts) can use it synchronously.
 */

import { useEffect } from 'react';
import { setDateFormatPreset, DateFormatPreset, DATE_FORMAT_OPTIONS } from '../lib/dateFormat';

export function useDateFormatSync() {
  useEffect(() => {
    let cancelled = false;

    async function sync() {
      try {
        const res = await fetch('/api/studio-config');
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;

        if (data.dateFormat && DATE_FORMAT_OPTIONS.some(o => o.value === data.dateFormat)) {
          setDateFormatPreset(data.dateFormat as DateFormatPreset);
        }
      } catch {
        // Silently ignore — will use current localStorage or auto-detect
      }
    }

    sync();
    return () => { cancelled = true; };
  }, []);
}
