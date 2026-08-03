#!/usr/bin/env node
/**
 * Seed a small, schema-accurate demo dataset (clients, leads, galleries, blog posts).
 *
 * - Uses the CURRENT schema columns (the old version referenced renamed tables/columns
 *   and text ids, which broke against the uuid schema).
 * - uuid ids are auto-generated (defaultRandom) — we never set them.
 * - Idempotent: removes prior demo rows by their unique keys before inserting.
 * - Resilient: each entity is seeded independently so one failure can't abort the rest.
 *
 * Run via tsx (it imports the app's portable db):  npm run demo:setup
 * (Sessions & invoices are intentionally omitted — complex required FKs, low demo value.)
 */
const { db } = require('../server/db');
const { crmClients, crmLeads, galleries, blogPosts } = require('../shared/schema');
const { inArray } = require('drizzle-orm');

const CLIENT_EMAILS = ['maria.schmidt@example.com', 'anna.mueller@example.com', 'stefan.hoffmann@example.com'];
const DEMO_CLIENTS = [
  { firstName: 'Maria', lastName: 'Schmidt', email: 'maria.schmidt@example.com', phone: '+43 664 123 4567', address: 'Mariahilfer Str. 45', city: 'Wien', leadSource: 'Instagram', notes: 'Family portraits, returning client', status: 'active' },
  { firstName: 'Anna', lastName: 'Müller', email: 'anna.mueller@example.com', phone: '+43 676 555 1234', address: 'Leopoldsgasse 8', city: 'Wien', leadSource: 'Referral', notes: 'Newborn session completed', status: 'active' },
  { firstName: 'Stefan', lastName: 'Hoffmann', email: 'stefan.hoffmann@example.com', phone: '+43 650 777 8899', address: 'Kärntner Ring 5', city: 'Wien', leadSource: 'Facebook', notes: 'Corporate headshots for consulting business', status: 'active' },
];

const LEAD_EMAILS = ['thomas.fischer@example.com', 'sarah.koller@example.com'];
const DEMO_LEADS = [
  { name: 'Thomas Fischer', email: 'thomas.fischer@example.com', phone: '+43 699 111 2233', source: 'Google Ads', status: 'new', message: 'Interested in corporate headshots for a team of 8', value: '800.00' },
  { name: 'Sarah & Michael Koller', email: 'sarah.koller@example.com', phone: '+43 676 998 7744', source: 'Instagram', status: 'contacted', message: 'Engagement photos before our wedding next year', value: '450.00' },
];

const GALLERY_SLUGS = ['schmidt-family-winter', 'baby-anna-newborn'];
const DEMO_GALLERIES = [
  { title: 'Schmidt Family — Winter', slug: 'schmidt-family-winter', description: 'Winter family portraits in Schönbrunn Gardens', coverImage: null },
  { title: 'Baby Anna — First Days', slug: 'baby-anna-newborn', description: 'Newborn portraits of baby Anna', coverImage: null },
];

const BLOG_SLUGS = ['demo-beste-locations-familienfotografie-wien', 'demo-tipps-neugeborenenfotos'];
const NOW = new Date();
const DEMO_BLOG_POSTS = [
  {
    title: 'Die besten Locations für Familienfotografie in Wien',
    slug: 'demo-beste-locations-familienfotografie-wien',
    excerpt: 'Entdecken Sie die schönsten Plätze in Wien für Ihre nächste Familienfotosession.',
    content: 'Wien bietet unzählige wunderschöne Locations für unvergessliche Familienfotos…',
    contentHtml: '<p>Wien bietet unzählige wunderschöne Locations für unvergessliche Familienfotos…</p>',
    status: 'PUBLISHED', published: true, publishedAt: NOW,
    tags: ['Familienfotografie', 'Wien', 'Locations'],
    seoTitle: 'Beste Locations für Familienfotografie in Wien',
    metaDescription: 'Die schönsten Foto-Locations in Wien für Familienfotos.',
  },
  {
    title: 'Tipps für entspannte Neugeborenenfotos',
    slug: 'demo-tipps-neugeborenenfotos',
    excerpt: 'Wie Sie sich optimal auf ein Neugeborenen-Fotoshooting vorbereiten.',
    content: 'Neugeborenenfotos sind etwas ganz Besonderes. Hier sind meine besten Tipps…',
    contentHtml: '<p>Neugeborenenfotos sind etwas ganz Besonderes. Hier sind meine besten Tipps…</p>',
    status: 'PUBLISHED', published: true, publishedAt: NOW,
    tags: ['Neugeborenenfotos', 'Tipps', 'Vorbereitung'],
    seoTitle: 'Tipps für entspannte Neugeborenenfotos',
    metaDescription: 'Vorbereitung auf ein Neugeborenen-Fotoshooting in Wien.',
  },
];

async function seed(label, table, uniqueCol, keys, rows) {
  try {
    await db.delete(table).where(inArray(table[uniqueCol], keys));
    await db.insert(table).values(rows);
    console.log(`  ✅ ${label}: ${rows.length}`);
  } catch (e) {
    console.warn(`  ⚠️ ${label} skipped: ${e && e.message ? e.message : e}`);
  }
}

async function setupDemoData() {
  console.log('🎬 Seeding demo content…');
  await seed('clients', crmClients, 'email', CLIENT_EMAILS, DEMO_CLIENTS);
  await seed('leads', crmLeads, 'email', LEAD_EMAILS, DEMO_LEADS);
  await seed('galleries', galleries, 'slug', GALLERY_SLUGS, DEMO_GALLERIES);
  await seed('blog posts', blogPosts, 'slug', BLOG_SLUGS, DEMO_BLOG_POSTS);
  console.log('✅ Demo content seeding complete.');
}

if (require.main === module) {
  setupDemoData().then(() => process.exit(0)).catch((e) => { console.error('demo seed error:', e); process.exit(1); });
}

module.exports = { setupDemoData };
