#!/usr/bin/env node
/**
 * Stamp the build with its commit + timestamp.
 *
 * Runtime env vars are unreliable for this: Heroku only exposes
 * HEROKU_SLUG_COMMIT when the dyno-metadata lab is enabled, so /api/version
 * reported commit:null. At BUILD time, however, Heroku provides SOURCE_VERSION
 * and Render provides RENDER_GIT_COMMIT — so capture it there and write it to
 * a file the server can read at runtime on any platform.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { execSync } from 'node:child_process';

const fromEnv =
  process.env.SOURCE_VERSION ||          // Heroku (build time)
  process.env.RENDER_GIT_COMMIT ||       // Render
  process.env.GIT_COMMIT ||
  process.env.VERCEL_GIT_COMMIT_SHA ||
  '';

let commit = fromEnv.trim();
if (!commit) {
  // Local builds: fall back to the working copy's HEAD.
  try { commit = execSync('git rev-parse HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); }
  catch { commit = ''; }
}

let branch = (process.env.RENDER_GIT_BRANCH || process.env.HEROKU_BRANCH || '').trim();
if (!branch) {
  try { branch = execSync('git rev-parse --abbrev-ref HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); }
  catch { branch = ''; }
}

const info = {
  commit: commit || null,
  branch: branch || null,
  builtAt: new Date().toISOString(),
};

try {
  mkdirSync('dist', { recursive: true });
  writeFileSync('dist/build-info.json', JSON.stringify(info, null, 2));
  console.log(`✓ build stamp: ${info.commit ? info.commit.slice(0, 7) : 'unknown'} (${info.branch || 'unknown branch'})`);
} catch (e) {
  // Never fail a deploy over a version stamp.
  console.warn('⚠️  could not write dist/build-info.json:', e?.message || e);
}
