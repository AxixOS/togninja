import React from 'react';

/**
 * App-level error boundary.
 *
 * Without this, ANY render crash or — since routes are code-split — any failed
 * lazy chunk load produces a blank white screen. The most common cause is a
 * STALE APP SHELL after a new deploy: the browser holds an old index.html whose
 * `import()` points at a chunk hash that no longer exists on the server, so the
 * dynamic import 404s (a "ChunkLoadError"). We detect that and reload ONCE to
 * fetch the fresh index.html + chunks; anything else shows a recoverable message
 * instead of a white screen.
 */
interface Props {
  children: React.ReactNode;
}
interface State {
  hasError: boolean;
  error?: Error;
}

const RELOAD_FLAG = 'chunkReloaded';

function isChunkLoadError(error: unknown): boolean {
  const msg = String((error as any)?.message || error || '');
  const name = String((error as any)?.name || '');
  return (
    name === 'ChunkLoadError' ||
    /ChunkLoadError|Loading chunk [\d]+ failed|Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed/i.test(msg)
  );
}

class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Stale-deploy chunk failure → reload once to pull fresh assets.
    if (isChunkLoadError(error)) {
      try {
        if (!sessionStorage.getItem(RELOAD_FLAG)) {
          sessionStorage.setItem(RELOAD_FLAG, '1');
          window.location.reload();
          return;
        }
      } catch {
        window.location.reload();
        return;
      }
    }
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary]', error, info?.componentStack);
  }

  private handleReload = () => {
    try { sessionStorage.removeItem(RELOAD_FLAG); } catch { /* ignore */ }
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="max-w-md w-full text-center bg-white rounded-2xl shadow-sm border p-8">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-purple-100">
            <svg className="h-6 w-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Something went wrong</h1>
          <p className="text-gray-600 mb-6">
            This page didn’t load correctly — usually a temporary hiccup after an update. Reloading normally fixes it.
          </p>
          <button
            onClick={this.handleReload}
            className="inline-flex items-center rounded-full bg-purple-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-purple-700"
          >
            Reload page
          </button>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
