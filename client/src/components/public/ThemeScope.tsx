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

  /* Chrome mounted above Layout — the cookie banner, toasts, anything portalled to
     document.body — sits outside .tn-theme, so it never inherited the studio's font and
     fell through to index.css's `html{font-family:'Poppins'}`. Measured on the live demo:
     three font families on one page, 11 elements on Poppins. Emitted only for the real
     site theme, never for an admin live preview, which would otherwise repaint the
     surrounding CRM. Unlayered, so it beats Tailwind's @layer base regardless of
     specificity. */
  const globalFont = preset ? '' : `
:root,body{font-family:${f.body};}
`;

  const css = `${globalFont}
.tn-theme{--tn-primary:${c.primary};--tn-primary-d:${c.primaryDark};--tn-accent:${c.accent};--tn-bg:${c.bg};--tn-surface:${c.surface};--tn-heading:${c.heading};--tn-muted:${c.muted};--tn-raised:${c.raised || '#ffffff'};--tn-border:${c.border || 'rgba(17,24,39,0.10)'};--tn-on-primary:${c.onPrimary || '#ffffff'};background:${c.bg};color:${c.text};font-family:${f.body};}
.tn-theme h1,.tn-theme h2,.tn-theme h3,.tn-theme h4,.tn-theme h5,.tn-theme h6{font-family:${f.heading};color:${c.heading};}

/* ── Type scale ──────────────────────────────────────────────────────────────
   The components size their own headings with utilities (text-3xl md:text-4xl
   font-bold tracking-tighter), which is why every preset rendered at identical
   sizes and identical weight: the theme carried colours and a font stack and
   nothing else. These element selectors are (0,1,1) — one class plus one element
   — so they beat a bare utility class (0,1,0) without !important, including the
   md: variants, since a media query adds no specificity.

   Weight is deliberately NOT bold. Everything on the page was 700, so nothing was
   emphasised. Hierarchy here comes from size, tracking and colour; 700 is left
   free for the rare thing that genuinely needs it. Negative tracking scales with
   size — tight display type reads as set rather than typed, but the same value on
   an h4 would look cramped. */
.tn-theme h1{font-size:clamp(2.5rem,1.6rem + 3.6vw,4.25rem);line-height:1.04;font-weight:400;letter-spacing:-0.028em;}
.tn-theme h2{font-size:clamp(1.875rem,1.35rem + 2vw,2.875rem);line-height:1.1;font-weight:400;letter-spacing:-0.022em;}
.tn-theme h3{font-size:clamp(1.375rem,1.2rem + 0.75vw,1.75rem);line-height:1.22;font-weight:500;letter-spacing:-0.014em;}
.tn-theme h4{font-size:clamp(1.0625rem,1rem + 0.3vw,1.1875rem);line-height:1.4;font-weight:600;letter-spacing:-0.004em;}
.tn-theme p{font-size:1.0625rem;line-height:1.65;letter-spacing:0;}
/* Body copy ran to 187 characters per line on the live page — measured. Nothing in
   the components caps it, so the cap belongs here. Applies only to prose inside a
   section, never to grid/flex children, so card and nav layouts are untouched. */
.tn-theme section p:not([class*="text-center"]){max-width:68ch;}
.tn-theme section p.mx-auto,.tn-theme section .text-center p{max-width:60ch;margin-left:auto;margin-right:auto;}
/* Optical numerals + kerning: Inter ships both and neither is on by default. */
.tn-theme{font-feature-settings:"cv05" 1,"ss01" 1;text-rendering:optimizeLegibility;}
/* Neutral surfaces + text → theme tokens, so a dark/tinted theme reskins whole sections,
   not just the accents. For a white-bg theme these resolve back to white/near-default, so
   the existing light presets are unchanged (backward compatible). Scoped to public pages. */
/* --tn-raised is the card face; --tn-bg is the ground behind it. While both were
   #ffffff a card had no edge at all, and no shadow can rescue a white shape on a white
   ground — which is why every card on the page read as a flat outlined box. Tinting the
   ground and keeping cards white is the whole trick. */
.tn-theme .bg-white{background-color:var(--tn-raised)!important;}
.tn-theme .bg-gray-50,.tn-theme .bg-gray-100{background-color:var(--tn-surface)!important;}

/* Elevation. The components draw cards as a 1px border and nothing else; Tailwind's own
   shadow utilities are a single flat drop. These are two-layer — a tight contact shadow
   for the edge, and a wide soft one for the lift — which is what separates a card that
   sits on the page from a rectangle drawn on it. Border goes to a hairline in the
   theme's own ink rather than gray-200, so it belongs to the palette. */
.tn-theme .shadow-sm{box-shadow:0 1px 2px rgba(20,17,15,.04),0 6px 12px -8px rgba(20,17,15,.10)!important;}
.tn-theme .shadow,.tn-theme .shadow-md{box-shadow:0 1px 2px rgba(20,17,15,.04),0 10px 20px -12px rgba(20,17,15,.12)!important;}
.tn-theme .shadow-lg{box-shadow:0 2px 4px rgba(20,17,15,.05),0 22px 40px -20px rgba(20,17,15,.18)!important;}
.tn-theme .shadow-xl,.tn-theme .shadow-2xl{box-shadow:0 4px 10px rgba(20,17,15,.06),0 44px 80px -32px rgba(20,17,15,.30)!important;}
.tn-theme .border-gray-100,.tn-theme .border-gray-200,.tn-theme .border-gray-300{border-color:var(--tn-border)!important;}
/* A bordered card on the raised face gets the lift too, so the flat 1px boxes in the
   confidence section pick this up without touching the component. */
.tn-theme .bg-white.border,.tn-theme .bg-white.rounded-lg,.tn-theme .bg-white.rounded-xl{box-shadow:0 1px 2px rgba(20,17,15,.04),0 10px 20px -12px rgba(20,17,15,.12);}
.tn-theme .text-gray-900,.tn-theme .text-gray-800{color:var(--tn-heading)!important;}
/* These three used to collapse into one --tn-muted. The components had three distinct
   contrast steps and the theme flattened them, so a hero's supporting line rendered in
   the same grey as a footnote — the token layer was destroying hierarchy rather than
   supplying it. Three steps restored: body, secondary, tertiary. */
.tn-theme .text-gray-700{color:${c.text}!important;}
.tn-theme .text-gray-600{color:var(--tn-muted)!important;}
.tn-theme .text-gray-500{color:color-mix(in srgb,var(--tn-muted) 76%,var(--tn-bg))!important;}
.tn-theme .bg-purple-500,.tn-theme .bg-purple-600,.tn-theme .bg-purple-700{background-color:var(--tn-primary)!important;}
.tn-theme .hover\\:bg-purple-700:hover,.tn-theme .hover\\:bg-purple-800:hover{background-color:var(--tn-primary-d)!important;}
.tn-theme .text-purple-600,.tn-theme .text-purple-700,.tn-theme .text-purple-800,.tn-theme .text-purple-900{color:var(--tn-primary)!important;}
.tn-theme .hover\\:text-purple-700:hover{color:var(--tn-primary-d)!important;}
.tn-theme .border-purple-200,.tn-theme .border-purple-300,.tn-theme .border-purple-600{border-color:var(--tn-primary)!important;}
.tn-theme .bg-purple-50,.tn-theme .bg-purple-100{background-color:var(--tn-surface)!important;}
/* The gradients were pink-500 -> purple-600: two different hues, at full saturation, on
   the loudest control on the page. Both stops now come from the same hue, one step
   apart, so a CTA reads as one confident colour rather than a two-colour ramp. */
.tn-theme .from-purple-500,.tn-theme .from-purple-600,.tn-theme .from-pink-500,.tn-theme .from-pink-600{--tw-gradient-from:var(--tn-primary)!important;}
.tn-theme .to-purple-600,.tn-theme .to-pink-500,.tn-theme .to-pink-600{--tw-gradient-to:var(--tn-accent)!important;}
.tn-theme .hover\\:from-pink-600:hover,.tn-theme .hover\\:from-purple-600:hover{--tw-gradient-from:var(--tn-primary-d)!important;}
.tn-theme .hover\\:to-purple-700:hover,.tn-theme .hover\\:to-pink-600:hover{--tw-gradient-to:var(--tn-primary)!important;}
/* Label on a primary fill takes the palette's own paper white, not pure #fff, so it
   sits in the same warmth as the rest of the page. */
.tn-theme .bg-gradient-to-r.text-white,.tn-theme .bg-purple-600.text-white{color:var(--tn-on-primary)!important;}
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
