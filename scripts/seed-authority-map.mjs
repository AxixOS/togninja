#!/usr/bin/env node
/**
 * Load a studio's Authority Map into studio_configs.authority_map.
 *
 * Why this exists: the Vienna studio's pillar/cluster/internal-link graph used to be
 * hardcoded in the components that render it, which meant every other studio saw those
 * services whenever their own map was missing, loading, or failed to load. The components
 * now render from the map or render nothing. That is correct for every buyer — and it
 * means the Vienna deployment has to hold its own map as data, like any other tenant.
 *
 * Usage:
 *   node scripts/seed-authority-map.mjs --newage            # load the Vienna map
 *   node scripts/seed-authority-map.mjs --file map.json     # load any map
 *   node scripts/seed-authority-map.mjs --show              # print what is stored
 *
 * Refuses to overwrite an existing map unless --force is given: a studio that generated
 * its own map from its own crawl must never be silently reverted to somebody else's.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

function databaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const envPath = path.join(ROOT, '.env');
  if (!fs.existsSync(envPath)) throw new Error('No DATABASE_URL and no .env file');
  const line = fs.readFileSync(envPath, 'utf8').split(/\r?\n/).find((l) => l.startsWith('DATABASE_URL='));
  if (!line) throw new Error('No DATABASE_URL in .env');
  let v = line.slice('DATABASE_URL='.length).trim();
  if (v.startsWith('"') || v.startsWith("'")) v = v.slice(1, -1);
  return v;
}

const args = process.argv.slice(2);
const has = (f) => args.includes(f);
const valueOf = (f) => {
  const i = args.indexOf(f);
  return i >= 0 ? args[i + 1] : null;
};

async function loadMap() {
  if (has('--newage')) {
    // Read the TS source rather than importing it: this script runs under plain node
    // during deploys, where there is no TS loader.
    const src = fs.readFileSync(path.join(ROOT, 'shared', 'authorityMap.ts'), 'utf8');
    const start = src.indexOf('export const NEW_AGE_AUTHORITY_MAP');
    if (start < 0) throw new Error('NEW_AGE_AUTHORITY_MAP not found in shared/authorityMap.ts');
    const open = src.indexOf('{', start);
    let depth = 0, end = -1;
    for (let i = open; i < src.length; i++) {
      if (src[i] === '{') depth++;
      else if (src[i] === '}') { depth--; if (depth === 0) { end = i + 1; break; } }
    }
    if (end < 0) throw new Error('Could not find the end of NEW_AGE_AUTHORITY_MAP');
    const body = src
      .slice(open, end)
      .replace(/\/\/[^\n]*/g, '')            // line comments
      .replace(/,(\s*[}\]])/g, '$1');        // trailing commas
    // eslint-disable-next-line no-new-func
    return new Function(`return (${body});`)();
  }
  const file = valueOf('--file');
  if (!file) throw new Error('Pass --newage or --file <path/to/map.json>');
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

const pool = new pg.Pool({ connectionString: databaseUrl(), max: 2, ssl: { rejectUnauthorized: false } });

try {
  const { rows } = await pool.query(
    `SELECT id, business_name, studio_name, authority_map FROM studio_configs LIMIT 1`,
  );
  if (!rows.length) {
    console.error('No studio_configs row — run onboarding first.');
    process.exit(1);
  }
  const studio = rows[0];
  const name = studio.business_name || studio.studio_name || '(unnamed)';
  const existing = studio.authority_map;
  const existingPillars = Array.isArray(existing?.pillars) ? existing.pillars.length : 0;

  if (has('--show')) {
    console.log(`studio: ${name}`);
    console.log(existingPillars ? JSON.stringify(existing, null, 2) : '(no authority map stored)');
    process.exit(0);
  }

  const map = await loadMap();
  if (!Array.isArray(map?.pillars) || !map.pillars.length) {
    console.error('Refusing to store a map with no pillars — that is what EMPTY means, and it is the default already.');
    process.exit(1);
  }

  if (existingPillars && !has('--force')) {
    console.error(`${name} already has an authority map with ${existingPillars} pillars.`);
    console.error('Refusing to overwrite. Pass --force if you really mean to replace it.');
    process.exit(1);
  }

  await pool.query(`UPDATE studio_configs SET authority_map = $1 WHERE id = $2`, [JSON.stringify(map), studio.id]);
  const clusters = map.pillars.reduce((n, p) => n + (p.clusters?.length || 0), 0);
  console.log(`Seeded ${name}: ${map.pillars.length} pillars, ${clusters} clusters, ${map.conversionLinks?.length || 0} conversion links.`);
} finally {
  await pool.end();
}
