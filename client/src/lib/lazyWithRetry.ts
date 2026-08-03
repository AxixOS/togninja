import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

/**
 * Resilient replacement for React.lazy for code-split routes.
 *
 * A plain lazy(() => import(...)) has two failure modes after a deploy, both of
 * which strand the user on the Suspense spinner forever:
 *   1. The old app shell requests a chunk hash that no longer exists → the import
 *      REJECTS. The app-level ErrorBoundary handles this by reloading once.
 *   2. The chunk request HANGS (stale proxy/service-worker, flaky network) → the
 *      import never settles, so nothing ever throws and the ErrorBoundary never
 *      fires — the spinner just spins. This wrapper is what fixes case 2.
 *
 * Strategy: race the import against a timeout so a hang becomes a rejection, then
 * reload ONCE to pull a fresh index.html + chunks. The retry flag is cleared on
 * every successful load, so each new deploy within a session can self-heal again
 * rather than being locked out after the first recovery.
 */

const RETRY_FLAG = 'lazyChunkReloaded';
const IMPORT_TIMEOUT_MS = 15000;

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const id = setTimeout(
      () => reject(new Error('ChunkLoadError: dynamic import timed out')),
      ms,
    );
    p.then(
      (v) => { clearTimeout(id); resolve(v); },
      (e) => { clearTimeout(id); reject(e); },
    );
  });
}

export function lazyWithRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
): LazyExoticComponent<T> {
  return lazy(async () => {
    try {
      const mod = await withTimeout(factory(), IMPORT_TIMEOUT_MS);
      try { sessionStorage.removeItem(RETRY_FLAG); } catch { /* ignore */ }
      return mod;
    } catch (err) {
      let alreadyRetried = false;
      try { alreadyRetried = !!sessionStorage.getItem(RETRY_FLAG); } catch { /* ignore */ }

      if (!alreadyRetried) {
        try { sessionStorage.setItem(RETRY_FLAG, '1'); } catch { /* ignore */ }
        window.location.reload();
        // Hold the promise open so nothing renders before the reload takes over.
        return await new Promise<{ default: T }>(() => {});
      }
      // Second failure this session — let the ErrorBoundary show its message.
      throw err;
    }
  });
}
