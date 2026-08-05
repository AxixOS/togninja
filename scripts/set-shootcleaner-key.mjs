#!/usr/bin/env node
/**
 * Bake SHOOTCLEANER_API_KEY into an existing Render service's environment (used to give an
 * already-running instance — e.g. the demo — its ShootCleaner integration key without the
 * dashboard). New instances get this automatically via provision-instance.mjs; this is for
 * instances that predate that.
 *
 * ── USAGE ─────────────────────────────────────────────────────────────────────
 *   RENDER_API_KEY=<render key>  node scripts/set-shootcleaner-key.mjs
 *
 *   OPTIONAL
 *     SERVICE_NAME          Render service name (default: togninja) — resolved to its id
 *     SERVICE_ID            skip name lookup and target this service id directly
 *     SHOOTCLEANER_API_KEY  the key to set (default: a freshly generated sc_… key)
 *     DRY_RUN=1             print what it would do, change nothing
 * ──────────────────────────────────────────────────────────────────────────────
 * Only touches the single SHOOTCLEANER_API_KEY variable — never the others.
 */
import crypto from 'node:crypto';

const API = 'https://api.render.com/v1';
const need = (k) => { const v = process.env[k]; if (!v) { console.error(`❌ Missing required env: ${k}`); process.exit(1); } return v; };

const RENDER_API_KEY = need('RENDER_API_KEY');
const SERVICE_NAME = process.env.SERVICE_NAME || 'togninja';
const KEY = process.env.SHOOTCLEANER_API_KEY || `sc_${crypto.randomBytes(24).toString('hex')}`;

async function api(path, method = 'GET', body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { Authorization: `Bearer ${RENDER_API_KEY}`, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json; try { json = JSON.parse(text); } catch { json = text; }
  if (!res.ok) { console.error(`❌ Render API ${method} ${path} → ${res.status}`); console.error(typeof json === 'string' ? json : JSON.stringify(json, null, 2)); process.exit(1); }
  return json;
}

async function resolveServiceId() {
  if (process.env.SERVICE_ID) return process.env.SERVICE_ID;
  const list = await api(`/services?name=${encodeURIComponent(SERVICE_NAME)}&limit=20`);
  const arr = (Array.isArray(list) ? list : []).map((s) => s.service || s);
  const match = arr.find((s) => s.name === SERVICE_NAME) || arr[0];
  if (!match) { console.error(`❌ No Render service named "${SERVICE_NAME}". Set SERVICE_ID explicitly.`); process.exit(1); }
  return match.id;
}

async function main() {
  const serviceId = await resolveServiceId();
  const svc = (await api(`/services/${serviceId}`)).service || (await api(`/services/${serviceId}`));
  const url = svc?.serviceDetails?.url || `https://${SERVICE_NAME}.onrender.com`;

  if (process.env.DRY_RUN === '1') {
    console.log(`(DRY_RUN) Would set SHOOTCLEANER_API_KEY on ${SERVICE_NAME} (${serviceId})`);
    console.log('   TogNinja studio URL :', url);
    console.log('   API key             :', KEY);
    return;
  }

  // Single-variable update — leaves every other env var untouched.
  await api(`/services/${serviceId}/env-vars/SHOOTCLEANER_API_KEY`, 'PUT', { value: KEY });

  console.log(`\n✅ SHOOTCLEANER_API_KEY set on "${SERVICE_NAME}".`);
  console.log('\n🎞 Give these two to ShootCleaner (Connect TogNinja):');
  console.log('   TogNinja studio URL :', url);
  console.log('   API key             :', KEY);
  console.log('\nRender redeploys on an env change; if it doesn\'t, hit Manual Deploy.');
}

main().catch((e) => { console.error('❌', e?.message || e); process.exit(1); });
