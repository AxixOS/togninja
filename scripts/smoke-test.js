#!/usr/bin/env node
/*
  Simple smoke test runner.
  Steps:
    1. Ensure client build (if dist/index.html missing).
    2. Spawn full-server.js on a test port with safe env overrides.
    3. Probe key endpoints with retries.
    4. (If DATABASE_URL present) exercise leads list + create.
    5. Exercise root HTML + unknown API fallback.
    6. Print summary and exit non-zero if any REQUIRED test failed.
*/

const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.join(__dirname, '..');
const DIST_INDEX = path.join(PROJECT_ROOT, 'dist', 'index.html');
const PORT = process.env.SMOKE_PORT || '5075';
const BASE_URL = `http://127.0.0.1:${PORT}`;

const results = [];
function record(name, status, info) {
  results.push({ name, status, info });
  const tag = status === 'PASS' ? '✅' : (status === 'SKIP' ? '⏭️' : '❌');
  console.log(`${tag} ${name} - ${status}${info ? ' :: ' + info : ''}`);
}

async function maybeBuild() {
  if (fs.existsSync(DIST_INDEX)) {
    record('Build presence', 'PASS', 'dist/index.html exists');
    return;
  }
  console.log('🔧 dist missing — running build');
  const r = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'build'], { stdio: 'inherit' });
  if (r.status !== 0) throw new Error('Build failed');
  record('Build', 'PASS');
}

function startServer() {
  return new Promise((resolve, reject) => {
    const env = { ...process.env, PORT, NODE_ENV: 'production', EMAIL_TRANSPORT: process.env.EMAIL_TRANSPORT || 'json' };
    const child = spawn(process.execPath, ['full-server.js'], { cwd: PROJECT_ROOT, env, stdio: ['ignore', 'pipe', 'pipe'] });
    let resolved = false;
    child.stdout.on('data', d => {
      const line = d.toString();
      if (!resolved && (line.includes('PRODUCTION server') || line.includes('Website:'))) {
        resolved = true; resolve(child);
      }
    });
    child.stderr.on('data', d => {
      const line = d.toString();
      if (!resolved && line.match(/EADDRINUSE/)) {
        reject(new Error('Port in use'));
      }
    });
    setTimeout(() => { if (!resolved) { reject(new Error('Server start timeout')); } }, 20000);
  });
}

async function retryFetch(pathname, { retries = 15, delay = 1000, expectStatus = 200 } = {}) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(BASE_URL + pathname, { headers: { 'Accept': 'application/json' } });
      if (res.status === expectStatus) return res;
    } catch (_) {}
    await new Promise(r => setTimeout(r, delay));
  }
  throw new Error(`Failed to fetch ${pathname} after ${retries} attempts`);
}

async function run() {
  await maybeBuild();
  let serverProc;
  try {
    serverProc = await startServer();
    record('Server start', 'PASS', `Listening on ${BASE_URL}`);
  } catch (e) {
    record('Server start', 'FAIL', e.message);
    finalize();
    return;
  }

  // Health
  try {
    const r = await retryFetch('/healthz');
    const txt = await r.text();
    record('Health endpoint', 'PASS', txt.slice(0,60));
  } catch (e) {
    record('Health endpoint', 'FAIL', e.message);
  }

  const hasDb = !!process.env.DATABASE_URL;
  if (!hasDb) {
    record('Database presence', 'SKIP', 'DATABASE_URL not set');
  }

  // Leads list
  let initialCount = null;
  if (hasDb) {
    try {
      const r = await retryFetch('/api/leads/list');
      const json = await r.json();
      if (typeof json.count === 'number') {
        initialCount = json.count;
        record('Leads list', 'PASS', `count=${initialCount}`);
      } else {
        record('Leads list', 'FAIL', 'Missing count');
      }
    } catch (e) {
      record('Leads list', 'FAIL', e.message);
    }
  }

  // Create lead
  if (hasDb) {
    try {
      const email = `smoke_${Date.now()}@example.com`;
      const res = await fetch(BASE_URL + '/api/leads/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ first_name: 'Smoke', last_name: 'Test', email, source: 'smoke' })
      });
      const json = await res.json();
      if (res.status === 200 && json.ok) {
        record('Create lead', 'PASS', json.id);
      } else {
        record('Create lead', 'FAIL', JSON.stringify(json));
      }
    } catch (e) {
      record('Create lead', 'FAIL', e.message);
    }
  }

  // Verify count increment
  if (hasDb && initialCount != null) {
    try {
      const r2 = await fetch(BASE_URL + '/api/leads/list');
      const j2 = await r2.json();
      if (typeof j2.count === 'number' && j2.count >= initialCount + 1) {
        record('Lead count increment', 'PASS', `${initialCount} -> ${j2.count}`);
      } else {
        record('Lead count increment', 'FAIL', `Expected >= ${initialCount+1}, got ${j2.count}`);
      }
    } catch (e) {
      record('Lead count increment', 'FAIL', e.message);
    }
  }

  // Root HTML
  try {
    const r = await retryFetch('/', { expectStatus: 200 });
    const html = await r.text();
    if (/<!DOCTYPE html/i.test(html)) record('Root HTML', 'PASS');
    else record('Root HTML', 'FAIL', 'Missing DOCTYPE');
  } catch (e) {
    record('Root HTML', 'FAIL', e.message);
  }

  // Unknown API fallback
  try {
    const r = await fetch(BASE_URL + '/api/unknown-thing');
    const j = await r.json();
    if (j && j.status === 'API_READY') record('Unknown API fallback', 'PASS');
    else record('Unknown API fallback', 'FAIL', JSON.stringify(j));
  } catch (e) {
    record('Unknown API fallback', 'FAIL', e.message);
  }

  // Calendar analytics (optional, requires DB)
  if (hasDb) {
    try {
      const r = await fetch(BASE_URL + '/api/admin/calendar-analytics?period=week');
      if (r.status === 200) {
        const j = await r.json();
        if (j && j.period) record('Calendar analytics', 'PASS', j.period);
        else record('Calendar analytics', 'PASS', 'No period field but 200');
      } else {
        record('Calendar analytics', 'FAIL', 'Status ' + r.status);
      }
    } catch (e) {
      record('Calendar analytics', 'FAIL', e.message);
    }
  } else {
    record('Calendar analytics', 'SKIP', 'No DB');
  }

  finalize(serverProc);
}

function finalize(child) {
  const requiredFailures = results.filter(r => r.status === 'FAIL' && !['Database presence','Calendar analytics'].includes(r.name));
  console.log('\n=== Smoke Test Summary ===');
  for (const r of results) {
    console.log(`${r.status.padEnd(5)}  ${r.name}${r.info ? ' :: ' + r.info : ''}`);
  }
  if (child) child.kill();
  if (requiredFailures.length) {
    console.error(`\n${requiredFailures.length} required checks failed.`);
    process.exit(1);
  } else {
    console.log('\nAll required smoke tests passed.');
  }
}

run().catch(err => {
  record('Runner', 'FAIL', err.message);
  finalize();
});
