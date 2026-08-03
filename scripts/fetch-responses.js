#!/usr/bin/env node
// Fetches questionnaire responses for a slug via API

require('dotenv').config();

async function main() {
  const base = (process.env.Q_BASE || process.env.APP_BASE_URL || process.env.APP_URL || '').replace(/\/$/, '');
  const slug = process.env.Q_SLUG;
  if (!base || !slug) {
    console.error('Missing APP_URL/APP_BASE_URL or Q_SLUG');
    process.exit(1);
  }
  const url = `${base}/api/questionnaires/${slug}/responses`;
  const res = await fetch(url);
  const text = await res.text();
  try {
    console.log(JSON.stringify(JSON.parse(text), null, 2));
  } catch {
    console.log(text);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
