import fs from 'fs';
const F = 'client/src/pages/admin/StudioCustomization.tsx';
const raw = fs.readFileSync(F, 'utf8');
const eol = raw.includes('\r\n') ? '\r\n' : '\n';
let lines = raw.split(/\r?\n/);

const note = (extra) => [
  '            {/* The Templates tab is gone.',
  '',
  '                It offered 25 templates and saved the choice to',
  '                studio_configs.activeTemplate, which nothing reads — the public site is',
  '                styled entirely by siteTheme, set in Website Studio → Themes. A warning',
  '                banner was not enough: the tab was still the first thing on the page and',
  '                still showed a green "Active" badge agreeing with whatever was picked.',
  '',
  '                The rest of this page is real and stays — logo, studio name, contact',
  '                details, brand colours, tax settings all persist through',
  '                PUT /api/studio/branding. Only the template picker was inert. */}',
  ...extra,
];

// Content block first (lines 342..373), so the earlier button indices stay valid.
if (!lines[341].includes("activeTab === 'template' &&")) {
  console.log('ABORT content: ' + JSON.stringify(lines[341])); process.exit(1);
}
if (lines[372].trim() !== ')}') {
  console.log('ABORT content end: ' + JSON.stringify(lines[372])); process.exit(1);
}
lines.splice(341, 373 - 341, ...note([]));

// Then the tab button (lines 293..304).
if (!lines[292].trim().startsWith('<button')) {
  console.log('ABORT button: ' + JSON.stringify(lines[292])); process.exit(1);
}
if (lines[303].trim() !== '</button>') {
  console.log('ABORT button end: ' + JSON.stringify(lines[303])); process.exit(1);
}
const btn = lines.slice(292, 304).join('\n');
if (!btn.includes("setActiveTab('template')")) {
  console.log('ABORT: not the template tab button'); process.exit(1);
}
lines.splice(292, 304 - 292);

let s = lines.join(eol);
s = s.replace("const [activeTab, setActiveTab] = useState('template');",
  "  // Branding is the first tab now that Templates has gone.\n  const [activeTab, setActiveTab] = useState('branding');".replace(/^  /, ''));

fs.writeFileSync(F, s);
console.log('ok — the inert Templates tab is removed, the working tabs stay');
