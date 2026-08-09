// The language this studio's public site is written in, as chosen at onboarding.
//
// Fetched once per page load and shared: the router, the header and the page gate all
// need it, and three copies of the same request on every navigation is wasteful. Returns
// `null` until it is known — callers must treat that as "don't act yet" rather than
// defaulting to English, or a German studio's URLs would be rewritten for a moment on
// every load.
import { useEffect, useState } from 'react';

let cached: string | null = null;
let inflight: Promise<string | null> | null = null;
const subscribers = new Set<(lang: string) => void>();

async function loadSiteLanguage(): Promise<string | null> {
  if (cached) return cached;
  if (!inflight) {
    inflight = fetch('/api/studio-config')
      .then((r) => (r.ok ? r.json() : null))
      .then((d: any) => {
        // routeLanguage ONLY — the studio's explicit choice. `lang` carries an env/English
        // fallback, and localising URLs on a fallback would 301 an existing German site's
        // paths to English ones it never asked for. Null here means "leave URLs alone".
        const lang = String(d?.routeLanguage || '').slice(0, 2).toLowerCase();
        if (lang) {
          cached = lang;
          subscribers.forEach((fn) => fn(lang));
        }
        return cached;
      })
      .catch(() => null)
      .finally(() => { inflight = null; });
  }
  return inflight;
}

export function useSiteLanguage(): string | null {
  const [lang, setLang] = useState<string | null>(cached);

  useEffect(() => {
    if (cached) { setLang(cached); return; }
    let alive = true;
    subscribers.add(setLang);
    loadSiteLanguage().then((l) => { if (alive && l) setLang(l); });
    return () => { alive = false; subscribers.delete(setLang); };
  }, []);

  return lang;
}
