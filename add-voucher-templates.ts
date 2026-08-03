/**
 * Migration: Create voucher_templates table and seed with existing 7 design templates.
 * 
 * Usage: npx tsx add-voucher-templates.ts
 */
import { neon } from '@neondatabase/serverless';
import 'dotenv/config';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

const sql = neon(DATABASE_URL);

async function migrate() {
  console.log('Creating voucher_templates table...');
  
  await sql`
    CREATE TABLE IF NOT EXISTS voucher_templates (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      image_url TEXT NOT NULL,
      occasion TEXT NOT NULL,
      is_active BOOLEAN DEFAULT true,
      display_order INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `;
  console.log('✓ Table created');

  // Check if templates already exist
  const existing = await sql`SELECT COUNT(*) as count FROM voucher_templates`;
  if (Number(existing[0].count) > 0) {
    console.log(`✓ Table already has ${existing[0].count} templates, skipping seed`);
    return;
  }

  // Seed with the 7 existing hardcoded templates from VoucherPersonalization.tsx
  const templates = [
    { name: 'Birthday Celebration', category: 'birthday', image_url: 'https://i.postimg.cc/cCLh7639/827ee647-a4cc-4f99-ac43-a7165efa0314.webp', occasion: 'Happy Birthday', display_order: 0 },
    { name: 'Anniversary', category: 'anniversary', image_url: 'https://images.unsplash.com/photo-1469371670807-013ccf25f16a?w=400&h=300&fit=crop', occasion: 'Happy Anniversary', display_order: 1 },
    { name: "Mother's Day", category: 'mothers-day', image_url: 'https://i.postimg.cc/br5xQgpr/stock-photo-top-view-greeting-card-happy-mothers-day-lettering-pink-carnations.webp', occasion: "Happy Mother's Day", display_order: 2 },
    { name: "Valentine's Day", category: 'love', image_url: 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=400&h=300&fit=crop', occasion: 'I Love You', display_order: 3 },
    { name: 'Christmas', category: 'christmas', image_url: 'https://images.unsplash.com/photo-1512389098783-66b81f86e199?w=400&h=300&fit=crop', occasion: 'Merry Christmas', display_order: 4 },
    { name: 'Thank You', category: 'gratitude', image_url: 'https://i.postimg.cc/Mp5y5zWg/writing-thank-you.webp', occasion: 'Thank You', display_order: 5 },
    { name: 'Congratulations', category: 'celebration', image_url: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=400&h=300&fit=crop', occasion: 'Congratulations', display_order: 6 },
  ];

  for (const t of templates) {
    await sql`
      INSERT INTO voucher_templates (name, category, image_url, occasion, display_order)
      VALUES (${t.name}, ${t.category}, ${t.image_url}, ${t.occasion}, ${t.display_order})
    `;
    console.log(`  ✓ Seeded: ${t.name}`);
  }

  console.log('✓ All 7 templates seeded');
}

migrate()
  .then(() => { console.log('Done!'); process.exit(0); })
  .catch((err) => { console.error('Migration failed:', err); process.exit(1); });
