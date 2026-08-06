/**
 * Token-based theme presets for the public site (landing pages + generated homepage).
 * Each preset is a set of design tokens (colours, fonts, radius). Applied at render as CSS
 * variables plus a small scoped override of the components' built-in purple/pink accents,
 * so choosing a preset visibly re-skins the page without refactoring every section.
 * Shared by client (ThemeStyle) and server (starter-homepage, studio-config).
 */

export interface ThemeColors {
  primary: string;       // main brand colour (buttons, links, headings accents)
  primaryDark: string;   // hover / darker shade
  accent: string;        // secondary accent (gradients, highlights)
  bg: string;            // page background
  surface: string;       // soft section background (was purple-50)
  text: string;          // body text
  heading: string;       // heading text
  muted: string;         // secondary text
}

export interface ThemeFonts {
  heading: string;       // CSS font stack (system fonts only — no webfont loading)
  body: string;
}

export interface ThemePreset {
  id: string;
  name: string;
  description: string;
  colors: ThemeColors;
  fonts: ThemeFonts;
  radius: string;        // e.g. '0.75rem'
}

const SANS = 'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
const SERIF = 'Georgia, "Times New Roman", "Iowan Old Style", serif';

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'aurora',
    name: 'Aurora',
    description: 'Vibrant violet & pink — friendly and modern.',
    colors: { primary: '#7c3aed', primaryDark: '#6d28d9', accent: '#ec4899', bg: '#ffffff', surface: '#faf5ff', text: '#1f2937', heading: '#111827', muted: '#6b7280' },
    fonts: { heading: SANS, body: SANS },
    radius: '0.75rem',
  },
  {
    id: 'executive',
    name: 'Executive',
    description: 'Navy & gold with serif headings — premium and trustworthy.',
    colors: { primary: '#1e3a5f', primaryDark: '#152b47', accent: '#b8860b', bg: '#ffffff', surface: '#f5f7fa', text: '#243b53', heading: '#102a43', muted: '#627d98' },
    fonts: { heading: SERIF, body: SANS },
    radius: '0.375rem',
  },
  {
    id: 'noir',
    name: 'Noir',
    description: 'Charcoal & emerald — bold, high-contrast and clean.',
    colors: { primary: '#111827', primaryDark: '#000000', accent: '#10b981', bg: '#ffffff', surface: '#f3f4f6', text: '#1f2937', heading: '#0b0f19', muted: '#6b7280' },
    fonts: { heading: SANS, body: SANS },
    radius: '0.25rem',
  },
  {
    id: 'coastal',
    name: 'Coastal',
    description: 'Teal & amber — fresh, calm and approachable.',
    colors: { primary: '#0d9488', primaryDark: '#0f766e', accent: '#f59e0b', bg: '#ffffff', surface: '#f0fdfa', text: '#134e4a', heading: '#134e4a', muted: '#5b7c78' },
    fonts: { heading: SANS, body: SANS },
    radius: '1rem',
  },
  {
    id: 'rosewood',
    name: 'Rosewood',
    description: 'Warm rose & terracotta with serif headings — soft and editorial.',
    colors: { primary: '#9d4e4e', primaryDark: '#7f3d3d', accent: '#c98a5e', bg: '#fffdfb', surface: '#fdf6f3', text: '#4a3b38', heading: '#3d2b28', muted: '#8a736e' },
    fonts: { heading: SERIF, body: SANS },
    radius: '0.625rem',
  },
  {
    id: 'mono',
    name: 'Modern Mono',
    description: 'Near-black on white with a single restrained grey accent — pure and minimal.',
    colors: { primary: '#171717', primaryDark: '#000000', accent: '#737373', bg: '#ffffff', surface: '#fafafa', text: '#262626', heading: '#0a0a0a', muted: '#737373' },
    fonts: { heading: SANS, body: SANS },
    radius: '0.125rem',
  },
  {
    id: 'terracotta',
    name: 'Terracotta',
    description: 'Burnt sienna & mustard on warm cream with serif headings — retro and inviting.',
    colors: { primary: '#b45309', primaryDark: '#92400e', accent: '#ca8a04', bg: '#fffdf7', surface: '#fdf4e7', text: '#44403c', heading: '#292524', muted: '#78716c' },
    fonts: { heading: SERIF, body: SANS },
    radius: '0.5rem',
  },
  {
    id: 'onyx',
    name: 'Onyx (Dark)',
    description: 'Deep slate with violet & pink accents — a bold dark-mode look.',
    colors: { primary: '#a78bfa', primaryDark: '#8b5cf6', accent: '#f472b6', bg: '#0f172a', surface: '#1e293b', text: '#e2e8f0', heading: '#f8fafc', muted: '#94a3b8' },
    fonts: { heading: SANS, body: SANS },
    radius: '0.5rem',
  },
];

export const DEFAULT_THEME_ID = 'aurora';

export function getThemePreset(id?: string | null): ThemePreset {
  return THEME_PRESETS.find((t) => t.id === id) || THEME_PRESETS[0];
}
