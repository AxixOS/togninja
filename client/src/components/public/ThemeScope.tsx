import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getThemePreset, type ThemePreset } from '../../../../shared/themePresets';

/**
 * Applies the studio's token theme to public landing pages. Injects the theme's colours/
 * fonts as CSS and overrides the components' built-in purple/pink accents, so choosing a
 * preset visibly re-skins the page without refactoring every section. Reads the preset from
 * /api/studio-config (siteTheme) unless one is passed in (e.g. an admin live preview).
 */
export const ThemeScope: React.FC<{ children: React.ReactNode; preset?: ThemePreset }> = ({ children, preset }) => {
  const { data } = useQuery({
    queryKey: ['site-theme'],
    queryFn: async () => {
      const r = await fetch('/api/studio-config');
      const d = await r.json();
      return d?.siteTheme || null;
    },
    staleTime: 5 * 60 * 1000,
    enabled: !preset,
  });

  const theme = preset || getThemePreset(data?.id);
  const c = theme.colors;
  const f = theme.fonts;

  const css = `
.tn-theme{--tn-primary:${c.primary};--tn-primary-d:${c.primaryDark};--tn-accent:${c.accent};--tn-bg:${c.bg};--tn-surface:${c.surface};--tn-heading:${c.heading};--tn-muted:${c.muted};background:${c.bg};color:${c.text};font-family:${f.body};}
.tn-theme h1,.tn-theme h2,.tn-theme h3,.tn-theme h4{font-family:${f.heading};color:${c.heading};}
/* Neutral surfaces + text → theme tokens, so a dark/tinted theme reskins whole sections,
   not just the accents. For a white-bg theme these resolve back to white/near-default, so
   the existing light presets are unchanged (backward compatible). Scoped to public pages. */
.tn-theme .bg-white{background-color:var(--tn-bg)!important;}
.tn-theme .bg-gray-50,.tn-theme .bg-gray-100{background-color:var(--tn-surface)!important;}
.tn-theme .text-gray-900,.tn-theme .text-gray-800{color:var(--tn-heading)!important;}
.tn-theme .text-gray-700,.tn-theme .text-gray-600,.tn-theme .text-gray-500{color:var(--tn-muted)!important;}
.tn-theme .bg-purple-500,.tn-theme .bg-purple-600,.tn-theme .bg-purple-700{background-color:var(--tn-primary)!important;}
.tn-theme .hover\\:bg-purple-700:hover,.tn-theme .hover\\:bg-purple-800:hover{background-color:var(--tn-primary-d)!important;}
.tn-theme .text-purple-600,.tn-theme .text-purple-700,.tn-theme .text-purple-800,.tn-theme .text-purple-900{color:var(--tn-primary)!important;}
.tn-theme .hover\\:text-purple-700:hover{color:var(--tn-primary-d)!important;}
.tn-theme .border-purple-200,.tn-theme .border-purple-300,.tn-theme .border-purple-600{border-color:var(--tn-primary)!important;}
.tn-theme .bg-purple-50,.tn-theme .bg-purple-100{background-color:var(--tn-surface)!important;}
.tn-theme .from-purple-500,.tn-theme .from-purple-600,.tn-theme .from-pink-500,.tn-theme .from-pink-600{--tw-gradient-from:var(--tn-primary)!important;}
.tn-theme .to-purple-600,.tn-theme .to-pink-500,.tn-theme .to-pink-600{--tw-gradient-to:var(--tn-accent)!important;}
.tn-theme .ring-purple-500{--tw-ring-color:var(--tn-primary)!important;}
`;

  return (
    <div className="tn-theme">
      <style dangerouslySetInnerHTML={{ __html: css }} />
      {children}
    </div>
  );
};

export default ThemeScope;
