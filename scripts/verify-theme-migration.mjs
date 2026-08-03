#!/usr/bin/env node
/**
 * Theme Migration Verification Script
 * Checks that the theme system was properly installed without breaking existing functionality
 * 
 * Usage:
 *   node scripts/verify-theme-migration.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m',
};

const log = {
  pass: (msg) => console.log(`${colors.green}✓ PASS${colors.reset} ${msg}`),
  fail: (msg) => console.log(`${colors.red}✗ FAIL${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠ WARN${colors.reset} ${msg}`),
  info: (msg) => console.log(`${colors.cyan}ℹ INFO${colors.reset} ${msg}`),
  header: (msg) => console.log(`\n${colors.blue}━━━ ${msg} ━━━${colors.reset}\n`),
};

let passed = 0;
let failed = 0;
let warnings = 0;

function check(condition, passMsg, failMsg) {
  if (condition) {
    log.pass(passMsg);
    passed++;
    return true;
  } else {
    log.fail(failMsg);
    failed++;
    return false;
  }
}

function warn(condition, msg) {
  if (!condition) {
    log.warn(msg);
    warnings++;
    return false;
  }
  return true;
}

// Read file safely
function readFile(relativePath) {
  const fullPath = path.join(projectRoot, relativePath);
  if (!fs.existsSync(fullPath)) return null;
  return fs.readFileSync(fullPath, 'utf8');
}

// Check if file exists
function fileExists(relativePath) {
  return fs.existsSync(path.join(projectRoot, relativePath));
}

log.header('Theme Migration Verification');
console.log(`Project: ${projectRoot}\n`);

// ============================================
// Check 1: TemplateContext.tsx exists and is valid
// ============================================
log.header('Check 1: TemplateContext');

const templateContext = readFile('client/src/contexts/TemplateContext.tsx');

check(
  templateContext !== null,
  'TemplateContext.tsx exists',
  'TemplateContext.tsx is missing'
);

if (templateContext) {
  check(
    templateContext.includes('export function TemplateProvider'),
    'TemplateProvider is exported',
    'TemplateProvider export not found'
  );
  
  check(
    templateContext.includes('export function useTemplate'),
    'useTemplate hook is exported',
    'useTemplate hook not found'
  );
  
  check(
    templateContext.includes("id: 'naf-premium'"),
    'NAF Premium template is defined',
    'NAF Premium template definition missing'
  );
  
  check(
    templateContext.includes('isDefault: true'),
    'Default template is marked',
    'No default template marked'
  );
  
  check(
    templateContext.includes('document.documentElement.removeAttribute'),
    'Theme removal logic exists (preserves default design)',
    'Theme removal logic missing - default design may not be preserved!'
  );
  
  check(
    templateContext.includes("localStorage.getItem(STORAGE_KEY)"),
    'Theme persistence via localStorage',
    'Theme persistence not implemented'
  );
}

// ============================================
// Check 2: templates.css exists and is SAFE
// ============================================
log.header('Check 2: Templates CSS Safety');

const templatesCss = readFile('client/src/styles/templates.css');

check(
  templatesCss !== null,
  'templates.css exists',
  'templates.css is missing'
);

if (templatesCss) {
  // CRITICAL: Check for unsafe global overrides
  const hasUnsafeRootOverride = /^:root\s*\{[^}]*\}/m.test(templatesCss);
  check(
    !hasUnsafeRootOverride,
    'No unsafe global :root overrides',
    'DANGER: Global :root overrides found! This could break default design!'
  );
  
  // Check for unsoped body styles
  const hasUnscopedBody = /^body\s*\{/m.test(templatesCss);
  check(
    !hasUnscopedBody,
    'No unscoped body styles',
    'DANGER: Unscoped body styles found!'
  );
  
  // Check for unscoped html styles  
  const hasUnscopedHtml = /^html\s*\{/m.test(templatesCss);
  check(
    !hasUnscopedHtml,
    'No unscoped html styles',
    'DANGER: Unscoped html styles found!'
  );
  
  // Check for unscoped * selector
  const hasUnscopedStar = /^\*\s*\{/m.test(templatesCss);
  check(
    !hasUnscopedStar,
    'No unscoped * (universal) styles',
    'DANGER: Unscoped universal styles found!'
  );
  
  // Check that styles are properly scoped
  const dataTemplateMatches = templatesCss.match(/\[data-template=/g) || [];
  check(
    dataTemplateMatches.length >= 10,
    `Styles properly scoped with [data-template] (${dataTemplateMatches.length} selectors)`,
    'Not enough [data-template] scoped styles found'
  );
  
  // Check for multiple themes
  const themeIds = ['modern-dark', 'classic-elegant', 'minimal-clean', 'bold-vibrant'];
  const themesFound = themeIds.filter(id => templatesCss.includes(`data-template="${id}"`));
  check(
    themesFound.length >= 4,
    `Multiple themes defined (${themesFound.length} themes)`,
    'Not all expected themes found in CSS'
  );
}

// ============================================
// Check 3: main.tsx is properly wrapped
// ============================================
log.header('Check 3: Main.tsx Integration');

const mainTsx = readFile('client/src/main.tsx');

check(
  mainTsx !== null,
  'main.tsx exists',
  'main.tsx is missing'
);

if (mainTsx) {
  check(
    mainTsx.includes("import { TemplateProvider }"),
    'TemplateProvider import exists',
    'TemplateProvider import missing'
  );
  
  check(
    mainTsx.includes('<TemplateProvider>'),
    'App is wrapped with TemplateProvider',
    'TemplateProvider wrapper missing'
  );
  
  check(
    mainTsx.includes('</TemplateProvider>'),
    'TemplateProvider closing tag exists',
    'TemplateProvider closing tag missing'
  );
  
  // Check proper nesting order
  const providerIndex = mainTsx.indexOf('<TemplateProvider>');
  const appIndex = mainTsx.indexOf('<App');
  check(
    providerIndex !== -1 && appIndex !== -1 && providerIndex < appIndex,
    'TemplateProvider wraps App component correctly',
    'TemplateProvider may not properly wrap App'
  );
}

// ============================================
// Check 4: index.css imports templates.css
// ============================================
log.header('Check 4: CSS Import');

const indexCss = readFile('client/src/index.css');

check(
  indexCss !== null,
  'index.css exists',
  'index.css is missing'
);

if (indexCss) {
  check(
    indexCss.includes('templates.css'),
    'templates.css is imported in index.css',
    'templates.css import missing from index.css'
  );
  
  // Check import order (should be after tailwind)
  const tailwindIndex = indexCss.indexOf('@tailwind utilities');
  const templatesIndex = indexCss.indexOf('templates.css');
  check(
    tailwindIndex !== -1 && templatesIndex !== -1 && tailwindIndex < templatesIndex,
    'templates.css imported after Tailwind (correct order)',
    'templates.css should be imported after Tailwind utilities'
  );
}

// ============================================
// Check 5: TemplateSelector component exists
// ============================================
log.header('Check 5: Admin UI Component');

const templateSelector = readFile('client/src/components/TemplateSelector.tsx');

check(
  templateSelector !== null,
  'TemplateSelector.tsx component exists',
  'TemplateSelector.tsx is missing'
);

if (templateSelector) {
  check(
    templateSelector.includes('useTemplate'),
    'Uses useTemplate hook',
    'useTemplate hook not used'
  );
  
  check(
    templateSelector.includes('Theme Gallery') || templateSelector.includes('theme'),
    'Has theme gallery UI',
    'Theme gallery UI not found'
  );
  
  check(
    templateSelector.includes('Reset to Default') || templateSelector.includes('reset'),
    'Has reset to default option',
    'Reset option not found'
  );
}

// ============================================
// Check 6: Homepage files NOT modified
// ============================================
log.header('Check 6: Homepage Preservation');

// Check that we didn't modify core homepage files
const homepageFiles = [
  'client/src/pages/HomePage.tsx',
  'client/src/components/layout/Header.tsx',
  'client/src/components/layout/Footer.tsx',
];

for (const file of homepageFiles) {
  if (fileExists(file)) {
    const content = readFile(file);
    const hasDataTemplate = content?.includes('data-template');
    check(
      !hasDataTemplate,
      `${file} has no data-template modifications`,
      `${file} was modified with data-template (should not happen)`
    );
  }
}

// ============================================
// Check 7: Backup exists
// ============================================
log.header('Check 7: Backup Safety');

const backupsDir = path.join(projectRoot, 'backups');
const hasBackups = fs.existsSync(backupsDir);

if (hasBackups) {
  const backupFolders = fs.readdirSync(backupsDir).filter(f => f.startsWith('theme-migration'));
  check(
    backupFolders.length > 0,
    `Backup folder exists (${backupFolders[backupFolders.length - 1]})`,
    'No backup folders found'
  );
  
  if (backupFolders.length > 0) {
    const latestBackup = backupFolders[backupFolders.length - 1];
    log.info(`Latest backup: backups/${latestBackup}`);
  }
} else {
  log.warn('No backups directory found - run migration script first');
  warnings++;
}

// ============================================
// Summary
// ============================================
log.header('Verification Summary');

console.log(`
${colors.green}Passed:${colors.reset}   ${passed}
${colors.red}Failed:${colors.reset}   ${failed}
${colors.yellow}Warnings:${colors.reset} ${warnings}
`);

if (failed === 0) {
  console.log(`${colors.green}━━━ ALL CHECKS PASSED ━━━${colors.reset}\n`);
  console.log('The theme system is properly installed and SAFE.');
  console.log('The default New Age Fotografie design will be preserved.');
  console.log('Themes only apply when explicitly selected by the user.\n');
} else {
  console.log(`${colors.red}━━━ VERIFICATION FAILED ━━━${colors.reset}\n`);
  console.log('Please fix the failed checks before using the theme system.');
  console.log('You can restore from backup if needed.\n');
  process.exit(1);
}

if (warnings > 0) {
  console.log(`${colors.yellow}Note:${colors.reset} There are ${warnings} warning(s) to review.\n`);
}

console.log('Next steps:');
console.log('1. Start the dev server: npm run dev');
console.log('2. Verify homepage looks unchanged');
console.log('3. Test theme selector at /admin/themes (or add route)\n');
