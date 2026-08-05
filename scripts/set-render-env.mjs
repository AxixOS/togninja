#!/usr/bin/env node
/**
 * Set one or more environment variables on an existing Render service, without touching the
 * others. Handy for baking in shared creds (Google OAuth, etc.) after an instance is running.
 *
 * ── USAGE ─────────────────────────────────────────────────────────────────────
 *   RENDER_API_KEY=<key>  node scripts/set-render-env.mjs KEY=VALUE [KEY=VALUE ...]
 *
 *   e.g. connect Gmail + Calendar (shared OAuth app) on the demo:
 *   RENDER_API_KEY=rnd_xxx node scripts/set-render-env.mjs \
 *     GOOGLE_CLIENT_ID=...apps.googleusercontent.com \
 *     GOOGLE_CLIENT_SECRET=GOCSPX-... \
 *     APP_URL=https://togninja.onrender.com
 *
 *   OPTIONAL
 *     SERVICE_NAME   Render service name (default: togninja) — resolved to its id
 *     SERVICE_ID     target this service id directly (skips the name lookup)
 *     DRY_RUN=1      print what it would set (values masked), change nothing
 * ──────────────────────────────────────────────────────────────────────────────
 */
const API = 'https://api.render.com/v1';
const need = (k) => { const v = process.env[k]; if (!v) { console.error(`❌ Missing required env: ${k}`); process.exit(1); } return v; };
const RENDER_API_KEY = need('RENDER_API_KEY');
const SERVICE_NAME = process.env.SERVICE_NAME || 'togninja';

// Parse KEY=VALUE positional args.
const pairs = process.argv.slice(2).map((a) => {
  const i = a.indexOf('=');
  if (i < 1) { console.error(`❌ Bad argument "${a}" — expected KEY=VALUE`); process.exit(1); }
  return { key: a.slice(0, i), value: a.slice(i + 1) };
});
if (!pairs.length) { console.error('❌ No KEY=VALUE pairs given. See usage at the top of this file.'); process.exit(1); }

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

const mask = (v) => (v.length <= 8 ? '••••' : v.slice(0, 4) + '…' + v.slice(-4));

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
  if (process.env.DRY_RUN === '1') {
    console.log(`(DRY_RUN) Would set on ${SERVICE_NAME} (${serviceId}):`);
    for (const p of pairs) console.log(`   ${p.key} = ${mask(p.value)}`);
    return;
  }
  for (const p of pairs) {
    await api(`/services/${serviceId}/env-vars/${encodeURIComponent(p.key)}`, 'PUT', { value: p.value });
    console.log(`✅ set ${p.key} = ${mask(p.value)}`);
  }
  console.log(`\nDone. Render redeploys on env changes; if it doesn't, hit Manual Deploy.`);
}

main().catch((e) => { console.error('❌', e?.message || e); process.exit(1); });
