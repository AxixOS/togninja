#!/usr/bin/env node
// Creates a questionnaire directly in the DB and prints the link

require('dotenv').config();

async function main() {
  const neonModule = require('@neondatabase/serverless');
  const neon = neonModule.neon;
  const sql = neon(process.env.DATABASE_URL);

  const title = process.env.Q_TITLE || 'Pre-Shoot Questionnaire';
  const description = process.env.Q_DESC || 'Hilf uns, dein Shooting perfekt zu planen.';
  const notify = process.env.Q_NOTIFY || process.env.NOTIFY_EMAIL || null;
  const fields = [
    { key: 'shoot_type', label: 'What type of photoshoot?', type: 'select', required: true, options: ['Family','Newborn','Maternity','Corporate'] },
    { key: 'date_window', label: 'Preferred dates / times', type: 'text', required: true },
    { key: 'people', label: 'Wer kommt mit? (Anzahl/Alter)', type: 'textarea' },
    { key: 'phone', label: 'Telefonnummer', type: 'text' }
  ];

  const slug = (global.crypto?.randomUUID?.() || require('crypto').randomUUID()).replace(/-/g,'').slice(0,10);

  const rows = await sql`
    INSERT INTO questionnaires (slug, title, description, fields, notify_email)
    VALUES (${slug}, ${title}, ${description}, ${JSON.stringify(fields)}, ${notify})
    RETURNING id, slug, title, description, fields, notify_email, created_at
  `;

  const base = String(process.env.Q_BASE || process.env.APP_BASE_URL || process.env.APP_URL || '').replace(/\/$/,'');
  const link = `${base}/q/${rows[0].slug}`;
  console.log(JSON.stringify({ ok: true, questionnaire: rows[0], link }, null, 2));
}

main().catch((e) => { console.error(e); process.exit(1); });
