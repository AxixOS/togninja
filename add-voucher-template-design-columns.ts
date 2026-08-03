/**
 * Migration: Add PDF design customization columns to voucher_templates table.
 * These allow admins to customize banner color, fonts, logo, footer, and terms per template.
 */
import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;

async function migrate() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

  const columns = [
    { name: 'banner_color', sql: `ALTER TABLE voucher_templates ADD COLUMN IF NOT EXISTS banner_color TEXT DEFAULT '#b3202e'` },
    { name: 'banner_text_color', sql: `ALTER TABLE voucher_templates ADD COLUMN IF NOT EXISTS banner_text_color TEXT DEFAULT '#ffffff'` },
    { name: 'font_family', sql: `ALTER TABLE voucher_templates ADD COLUMN IF NOT EXISTS font_family TEXT DEFAULT 'Helvetica'` },
    { name: 'message_font_size', sql: `ALTER TABLE voucher_templates ADD COLUMN IF NOT EXISTS message_font_size INTEGER DEFAULT 22` },
    { name: 'logo_url', sql: `ALTER TABLE voucher_templates ADD COLUMN IF NOT EXISTS logo_url TEXT` },
    { name: 'footer_text', sql: `ALTER TABLE voucher_templates ADD COLUMN IF NOT EXISTS footer_text TEXT` },
    { name: 'footer_email', sql: `ALTER TABLE voucher_templates ADD COLUMN IF NOT EXISTS footer_email TEXT` },
    { name: 'footer_phone', sql: `ALTER TABLE voucher_templates ADD COLUMN IF NOT EXISTS footer_phone TEXT` },
    { name: 'terms_text', sql: `ALTER TABLE voucher_templates ADD COLUMN IF NOT EXISTS terms_text TEXT` },
    { name: 'layout_style', sql: `ALTER TABLE voucher_templates ADD COLUMN IF NOT EXISTS layout_style TEXT DEFAULT 'classic'` },
  ];

  for (const col of columns) {
    try {
      await pool.query(col.sql);
      console.log(`✅ Added column: ${col.name}`);
    } catch (err: any) {
      if (err.code === '42701') {
        console.log(`⏭️  Column already exists: ${col.name}`);
      } else {
        console.error(`❌ Failed to add ${col.name}:`, err.message);
      }
    }
  }

  // Verify
  const result = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'voucher_templates' ORDER BY ordinal_position`);
  console.log('\n📋 voucher_templates columns:', result.rows.map((r: any) => r.column_name).join(', '));

  await pool.end();
  console.log('\n✅ Migration complete.');
}

migrate().catch(console.error);
