// Seed the Content Plan v2 long-tail headings as IDEA stubs (blank body) so they
// appear in the blog editor ready for photos. Idempotent: skips existing slugs.
//   npx tsx -r dotenv/config setup-v2-ideas.ts
import { db, pool } from './server/db.js';
import { blogPosts } from './shared/schema.js';
import { inArray } from 'drizzle-orm';

const IDEAS: { slug: string; title: string; tags: string[] }[] = [
  // Familienfotos
  { slug: 'familienfotos-jaehrliche-tradition-wien', title: 'Warum jährliche Familienfotos eine schöne Tradition sind', tags: ['familienfotos', 'tradition', 'studio', 'wien'] },
  { slug: 'haeufigste-fehler-familienfotos', title: 'Die häufigsten Fehler bei Familienfotos – und wie ihr sie vermeidet', tags: ['familienfotos', 'fehler', 'tipps', 'wien'] },
  { slug: 'familienfotos-mit-hund-wien', title: "Familienfotos mit Hund: so klappt's mit dem Vierbeiner", tags: ['familienfotos', 'hund', 'haustier', 'wien'] },
  { slug: 'familienfotos-mit-teenagern-wien', title: 'Familienfotos mit Teenagern: ohne Augenrollen', tags: ['familienfotos', 'teenager', 'studio', 'wien'] },
  { slug: 'erstes-familienshooting-wien', title: 'Euer erstes Familienshooting: was euch erwartet', tags: ['familienfotos', 'ablauf', 'erstes shooting', 'wien'] },
  { slug: 'warum-familienfotos-wichtig-wien', title: 'Warum Familienfotos wirklich wichtig sind', tags: ['familienfotos', 'erinnerungen', 'wien'] },
  // Baby / Neugeboren / Schwangerschaft
  { slug: 'neugeborenenfotos-was-anziehen-eltern', title: 'Neugeborenenfotos: was Eltern anziehen sollten', tags: ['neugeborenenfotos', 'kleidung', 'studio', 'wien'] },
  { slug: 'babyfotos-6-monate-sitter-wien', title: 'Die 6-Monats-Sitter-Session: Babys erstes Sitzen', tags: ['babyfotos', 'sitter session', 'studio', 'wien'] },
  { slug: 'neugeborenenfotos-mit-geschwistern-wien', title: 'Geschwister beim Neugeborenenshooting einbeziehen', tags: ['neugeborenenfotos', 'geschwister', 'studio', 'wien'] },
  { slug: 'schwangerschaftsfotos-mit-partner-wien', title: 'Schwangerschaftsfotos mit Partner & Kindern', tags: ['schwangerschaftsfotos', 'babybauch', 'paar', 'wien'] },
  // Business
  { slug: 'bewerbungsfoto-profi-vs-selfie-wien', title: 'Bewerbungsfoto vom Profi vs. Selfie/Automat', tags: ['bewerbungsfotos', 'vergleich', 'wien'] },
  { slug: 'fehler-beim-bewerbungsfoto-wien', title: 'Die 5 häufigsten Fehler beim Bewerbungsfoto', tags: ['bewerbungsfotos', 'fehler', 'tipps', 'wien'] },
  { slug: 'personal-branding-fotos-wien', title: 'Personal-Branding-Fotos für Selbstständige in Wien', tags: ['personal branding', 'businessfotos', 'portrait', 'wien'] },
  { slug: 'einheitliche-team-headshots-wien', title: 'Einheitliche Team-Headshots fürs ganze Unternehmen', tags: ['teamfotos', 'headshots', 'businessfotos', 'wien'] },
  // Hochzeit
  { slug: 'hochzeit-first-look-wien', title: 'First Look: der private Moment vor der Trauung', tags: ['hochzeitsfotos', 'first look', 'wien'] },
  { slug: 'hochzeit-getting-ready-wien', title: 'Getting-Ready-Fotos: der entspannte Start in den Tag', tags: ['hochzeitsfotos', 'getting ready', 'wien'] },
  { slug: 'fragen-an-hochzeitsfotograf-wien', title: '10 Fragen, die ihr eurem Hochzeitsfotografen stellen solltet', tags: ['hochzeitsfotos', 'tipps', 'wien'] },
  { slug: 'kleine-hochzeit-elopement-wien', title: 'Kleine Hochzeit / Elopement in Wien fotografieren', tags: ['hochzeitsfotos', 'elopement', 'wien'] },
  { slug: 'hochzeit-gruppenfotos-tipps-wien', title: 'Gruppenfotos auf der Hochzeit ohne Chaos', tags: ['hochzeitsfotos', 'gruppenfotos', 'tipps', 'wien'] },
  // Studio / Commercial / Gutscheine
  { slug: 'fotoshooting-geschenkideen-wien', title: 'Fotoshooting verschenken: die besten Geschenk-Ideen', tags: ['gutschein', 'geschenk', 'studio', 'wien'] },
  { slug: 'wandbilder-wohnung-gestalten-wien', title: 'Wandbilder richtig in der Wohnung in Szene setzen', tags: ['wandbilder', 'druck', 'wien'] },
  { slug: 'fotobuch-oder-wandbild-wien', title: 'Fotobuch oder Wandbild – was lohnt sich?', tags: ['fotobuch', 'wandbilder', 'vergleich', 'wien'] },
  { slug: 'produktfotos-online-shop-wien', title: 'Produktfotos für den Online-Shop in Wien', tags: ['produktfotografie', 'onlineshop', 'studio', 'wien'] },
  { slug: 'geschichte-hinter-dem-bild-wien', title: 'Die Geschichte hinter dem Bild', tags: ['studio', 'story', 'wien'] },
  // Seasonal
  { slug: 'oster-familienfotos-wien', title: 'Oster-Familienfotos in Wien', tags: ['familienfotos', 'ostern', 'studio', 'wien'] },
  { slug: 'herbst-paarfotos-wien', title: 'Herbst-Paarfotos in Wien', tags: ['paarfotos', 'herbst', 'wien'] },
  { slug: 'jahresend-familienfotos-wien', title: 'Jahresend-Familienfotos: das Jahr festhalten', tags: ['familienfotos', 'jahresrückblick', 'studio', 'wien'] },
];

async function main() {
  const slugs = IDEAS.map(i => i.slug);
  const existing = new Set((await db.select({ slug: blogPosts.slug }).from(blogPosts).where(inArray(blogPosts.slug, slugs))).map(r => r.slug));
  let seeded = 0;
  for (const i of IDEAS) {
    if (existing.has(i.slug)) { console.log(`skip (exists): ${i.slug}`); continue; }
    await db.insert(blogPosts).values({
      title: i.title, slug: i.slug, content: '', contentHtml: '', tags: i.tags,
      status: 'IDEA', published: false,
      ideaData: { images: [], context: {}, consent: { given: false } },
      updatedAt: new Date(),
    });
    seeded++;
  }
  console.log(`✅ Seeded ${seeded} v2 IDEA stubs (${IDEAS.length - seeded} already existed).`);
  await pool.end();
  process.exit(0);
}
main().catch((e) => { console.error('❌', e); process.exit(1); });
