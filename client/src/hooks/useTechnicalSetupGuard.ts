/**
 * Hook: useTechnicalSetupGuard
 *
 * Checks if technical setup is complete. If not, redirects to /setup/technical.
 * Uses a lightweight fetch cached in sessionStorage to avoid repeating on every
 * client-side navigation.
 *
 * Usage: call at top of protected layouts:
 *   const { isReady } = useTechnicalSetupGuard();
 *   if (!isReady) return null; // will redirect automatically
 */

import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const CACHE_KEY = 'techSetupComplete';
const CACHE_TTL = 5 * 60_000; // 5 minutes

interface CachedState {
  complete: boolean;
  ts: number;
}

export function useTechnicalSetupGuard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Don't guard setup routes themselves or public-facing pages
    if (
      location.pathname.startsWith('/setup') ||
      location.pathname === '/' ||
      location.pathname.startsWith('/blog') ||
      location.pathname.startsWith('/fotoshootings') ||
      location.pathname.startsWith('/portfolio') ||
      location.pathname.startsWith('/gutschein') ||
      location.pathname.startsWith('/kontakt') ||
      location.pathname.startsWith('/warteliste') ||
      location.pathname.startsWith('/voucher') ||
      location.pathname.startsWith('/checkout') ||
      location.pathname.startsWith('/order') ||
      location.pathname.startsWith('/account') ||
      location.pathname.startsWith('/gallery/') ||
      location.pathname.startsWith('/questionnaire/')
    ) {
      setIsReady(true);
      return;
    }

    // Check sessionStorage cache first
    try {
      const raw = sessionStorage.getItem(CACHE_KEY);
      if (raw) {
        const cached: CachedState = JSON.parse(raw);
        if (cached.complete && Date.now() - cached.ts < CACHE_TTL) {
          setIsReady(true);
          return;
        }
      }
    } catch { /* ignore parse errors */ }

    // Fetch from server
    let cancelled = false;
    fetch('/api/setup/technical/status')
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const complete = !!data.technicalSetupComplete;
        sessionStorage.setItem(
          CACHE_KEY,
          JSON.stringify({ complete, ts: Date.now() })
        );
        if (!complete) {
          navigate('/setup', { replace: true });
        } else {
          setIsReady(true);
        }
      })
      .catch(() => {
        // On fetch error (offline, server down), let user through
        if (!cancelled) setIsReady(true);
      });

    return () => { cancelled = true; };
  }, [location.pathname, navigate]);

  return { isReady };
}
