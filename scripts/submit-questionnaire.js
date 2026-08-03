#!/usr/bin/env node
// Clean submit script supporting env, flags and positional args
require('dotenv').config();

function arg(name, def = undefined) {
  const i = process.argv.indexOf(`--${name}`);
  if (i !== -1 && process.argv[i + 1]) return process.argv[i + 1];
  return def;
}

async function main() {
  // Accept env Q_BASE/Q_SLUG or flags/positionals
  let base = process.env.Q_BASE || arg('base');
  let slug = process.env.Q_SLUG || arg('slug');
  let name = process.env.Q_NAME || arg('name');
  let email = process.env.Q_EMAIL || arg('email');
  let shoot = arg('shoot');
  let datewin = arg('date');

  // Positional fallback if flags missing
  const pos = process.argv.slice(2).filter((t) => !String(t).startsWith('--'));
  if (!base && pos[0]) base = pos[0];
  if (!slug && pos[1]) slug = pos[1];
  if (!name && pos[2]) name = pos.slice(2, 3).join(' ');
  if (!email && pos[3]) email = pos[3];
  if (!shoot && pos[4]) shoot = pos[4];
  if (!datewin && pos[5]) datewin = pos.slice(5).join(' ');

  base = (base || process.env.APP_BASE_URL || process.env.APP_URL || '').replace(/\/$/, '');
  if (!base || !slug) {
    console.error('Usage: node scripts/submit-questionnaire.js --base <BASE_URL> --slug <SLUG> [--name "Name"] [--email you@example.com] [--shoot Family] [--date "Next week"]');
    console.error('Or positional: node scripts/submit-questionnaire.js <base> <slug> <name> <email> <shoot> <date...>');
    console.error('Env: Q_BASE, Q_SLUG, Q_NAME, Q_EMAIL');
    process.exit(2);
  }

  name = name || 'E2E Tester';
  email = email || 'e2e.tester@example.com';
  shoot = shoot || 'Family';
  datewin = datewin || 'Next week afternoon';

  const body = {
    client_name: name,
    client_email: email,
    shoot_type: shoot,
    date_window: datewin,
    people: '2 Adults, 1 Newborn',
    phone: '+43 660 0000000'
  };

  const url = `${base}/api/questionnaires/${slug}/submit`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  });
  const text = await res.text();
  try { console.log(JSON.stringify(JSON.parse(text), null, 2)); }
  catch { console.log(text); }
  if (!res.ok) process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); });
