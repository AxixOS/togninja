// The canonical path for THIS studio, given the canonical (German) one.
//
// Pages name their canonical in the canonical scheme — '/kontakt', '/agb',
// '/gutschein/family' — because that is what the router matches on. A studio that
// chose its own language is served those routes at localised URLs ('/contact',
// '/terms', '/gift-vouchers/family'), so a canonical emitted raw declares that the
// real version of the page lives at a URL this studio does not serve.
//
// Null until the language is known, and null for a studio that never chose one: such
// an instance has no localised URLs, so its canonicals must stay exactly as they were.
// Same "null means do nothing" contract the router relies on — see useSiteLanguage.
// localizePath is idempotent, so passing an already-localised path is safe.
import { useSiteLanguage } from './useSiteLanguage';
import { localizePath } from '../../../shared/routeSlugs';

export function useCanonicalPath(canonicalPath: string): string {
  const lang = useSiteLanguage();
  return lang ? localizePath(canonicalPath, lang) : canonicalPath;
}
