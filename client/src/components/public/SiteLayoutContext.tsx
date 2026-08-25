import React, { createContext, useContext } from 'react';
import { DEFAULT_LAYOUT_ID } from '../../../../shared/siteLayouts';

/**
 * Which arrangement the public page is being rendered in.
 *
 * A context rather than a prop because there are thirteen section components between the
 * page and the places that need to know, and threading a layout id through all of them is
 * how one of them ends up not getting it — the section that silently keeps the old bones
 * while everything around it changed.
 *
 * The default is the classic arrangement, on purpose. A section rendered outside a provider
 * — an admin preview, a test, a section reused somewhere unexpected — gets exactly what
 * every live site has today rather than a half-applied new look.
 */

export type LayoutId = string;

const SiteLayoutContext = createContext<LayoutId>(DEFAULT_LAYOUT_ID);

export const SiteLayoutProvider: React.FC<{ layout?: LayoutId | null; children: React.ReactNode }> = ({
  layout,
  children,
}) => (
  <SiteLayoutContext.Provider value={layout || DEFAULT_LAYOUT_ID}>
    {children}
  </SiteLayoutContext.Provider>
);

export function useSiteLayout(): LayoutId {
  return useContext(SiteLayoutContext);
}

/** True when the page is being composed editorially. The common check, named once. */
export function useIsEditorial(): boolean {
  return useContext(SiteLayoutContext) === 'editorial';
}
