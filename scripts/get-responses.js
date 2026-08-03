#!/usr/bin/env node
require('dotenv').config();

function arg(name, def = undefined) {
  const i = process.argv.indexOf(`--${name}`);
  if (i !== -1 && process.argv[i + 1]) return process.argv[i + 1];
  return def;
}

async function main() {
  const base = arg('base', process.env.TEST_BASE_URL || process.env.APP_URL || '').replace(/\/$/, '');
  const slug = arg('slug') || process.env.Q_SLUG;
  if (!base || !slug) {
    console.error('Usage: node scripts/get-responses.js --base <BASE_URL> --slug <SLUG>');
    process.exit(2);
  }
  const url = `${base}/api/questionnaires/${slug}/responses`;
  const res = await fetch(url);
  const text = await res.text();
  try { console.log(JSON.stringify(JSON.parse(text), null, 2)); }
  catch { console.log(text); }
  if (!res.ok) process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); });
