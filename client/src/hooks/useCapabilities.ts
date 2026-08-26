import { useEffect, useState } from 'react';

/**
 * What this studio can actually do right now.
 *
 * One fetch behind every padlock in the admin. Before this, three features each worked out
 * for themselves whether a key was present and each rendered a different-looking refusal —
 * a 402 card here, a thrown error there, a sentence with no link at all somewhere else.
 */

export interface CapabilityInfo {
  key: string;
  label: string;
  available: boolean;
  /**
   * Where this actually stands. `available` is true only for 'ready' — except when the
   * instance cannot decrypt its own credentials, where the status is 'unreadable' and the
   * doors are deliberately left open. Optional so an older server that does not send it
   * still works.
   */
  status?: 'ready' | 'not_configured' | 'incomplete' | 'pending' | 'action_required' | 'unreadable';
  statusDetail?: string | null;
  owner: 'studio' | 'platform';
  /** Null when the credential is the platform's — there is nothing for the studio to click. */
  settingsPath: string | null;
  blockedMessage: string;
  worksWithout: string;
}

interface State {
  capabilities: Record<string, CapabilityInfo>;
  loading: boolean;
  /** Re-read after the studio saves a key, so the padlock goes away without a reload. */
  refresh: () => void;
}

export function useCapabilities(): State {
  const [capabilities, setCapabilities] = useState<Record<string, CapabilityInfo>>({});
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch('/api/capabilities', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : { capabilities: [] }))
      .then((d) => {
        if (cancelled) return;
        const map: Record<string, CapabilityInfo> = {};
        for (const c of d.capabilities || []) map[c.key] = c;
        setCapabilities(map);
      })
      .catch(() => {
        // A failed check must never padlock. An empty map means "no gates known", which
        // leaves every screen usable — the opposite failure, locking the product because one
        // request timed out, would be far worse than briefly letting somebody press a button
        // that then reports its own error.
        if (!cancelled) setCapabilities({});
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [tick]);

  return { capabilities, loading, refresh: () => setTick((t) => t + 1) };
}

/**
 * Is one capability available?
 *
 * UNKNOWN COUNTS AS AVAILABLE, deliberately — while loading, and if the check failed. A
 * screen that flashes a padlock for half a second on every navigation is worse than one that
 * occasionally lets a request through to fail honestly on the server, which is where the
 * authoritative refusal lives anyway.
 */
export function useCapability(key: string): { available: boolean; info?: CapabilityInfo; loading: boolean; refresh: () => void } {
  const { capabilities, loading, refresh } = useCapabilities();
  const info = capabilities[key];
  return { available: info ? info.available : true, info, loading, refresh };
}
