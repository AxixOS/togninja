import { db } from './server/db.js';
import { blogPosts } from './shared/schema.js';
import { eq } from 'drizzle-orm';

const newPosts = [
  {
    title: 'Fotoshooting mit Baby in Wien – Was du wissen solltest',
    slug: 'fotoshooting-mit-baby-wien-tipps',
    scheduledFor: new Date('2026-01-24T09:00:00Z'),
    seoTitle: 'Fotoshooting mit Baby in Wien – Die besten Tipps | New Age Fotografie',
    metaDescription: 'Sanfte, liebevolle Babyfotos – so bereitest du dich perfekt vor. Tipps zu Licht, Kleidung, Stimmung & Ablauf, direkt vom Wiener Fotografen Simon.',
    body: `Ein Fotoshooting mit Baby ist immer etwas Besonderes – egal ob das Baby 10 Tage alt ist oder schon 6 Monate. Jede Phase bringt ihren eigenen Zauber. Als Fotograf (und Papa) weiß ich, wie wichtig es ist, diese Momente liebevoll und stressfrei festzuhalten.

Hier meine wichtigsten Tipps für entspannte Babyfotos in Wien.

## 1. Wann ist der beste Zeitpunkt?
Für Neugeborene: Tag 6–14.  
Für Babys: 3, 6 oder 9 Monate.

Jede Phase hat ihre Vorteile:
- 3 Monate: wache Augen
- 6 Monate: Sitzen + Lachen
- 9 Monate: Persönlichkeit pur

## 2. Kleidung für Babyfotos
Am schönsten wirken:
- Strampler in Naturtönen
- weiche Materialien
- neutrale Farbwelten

Bitte vermeiden:
- harte Farben
- Muster
- Aufdrucke

## 3. Essen, Schlaf, Stimmung
Babys brauchen Flexibilität.  
Wir arbeiten im Tempo des Babys – immer.

Pausen, Stillen, Wickeln – alles ist eingeplant.

## 4. Elternfotos unbedingt machen
Viele Eltern fühlen sich nicht „fertig".  
Aber glaube mir: Diese Bilder werden euch so viel bedeuten.

## 5. Technik & Licht
Ich nutze ausschließlich weiches Dauerlicht – sanft, warm, sicher.
Blende f/2.0–2.5 für cremige Hintergründe.

## Soft CTA
Wenn du ein liebevolles Babyshooting in Wien möchtest, begleite ich euch gerne – mit viel Ruhe, Geduld und Erfahrung.

## Interner Link
Mehr unter **[Babyfotografie Wien](/neugeborenenfotos)**.

## Externer Link
https://www.babycenter.de`
  },
  {
    title: 'Die schönsten Winter-Fotolocations in Wien – Meine Top-Empfehlungen',
    slug: 'winter-fotolocations-wien',
    scheduledFor: new Date('2026-02-06T09:00:00Z'),
    seoTitle: 'Die besten Winter-Fotolocations in Wien | New Age Fotografie',
    metaDescription: 'Wiener Fotograf Simon zeigt die schönsten Orte für Winter-Fotos in Wien – romantisch, ruhig und perfekt für Familien, Paare und Business.',
    body: `Der Winter in Wien hat etwas Magisches. Die Luft ist klarer, die Farben ruhiger, die Stadt wird leiser – und genau dann entstehen einige meiner liebsten Fotos. Viele denken, Fotoshootings funktionieren nur im Frühling und Sommer. Aber im Februar? Da liegen oft die schönsten, ruhigsten Momente.

Hier zeige ich euch meine **persönlichen Lieblingslocations** für Winter-Fotos in Wien – aus über 12 Jahren Erfahrung.

## 1. Burggarten – Winterlicht vom Feinsten
Der Burggarten ist im Winter ein Traum:  
sanftes Licht, wenig Menschen, elegante Architektur.

Warum er perfekt ist:
- Licht fällt flach ein → schöne Hauttöne
- heller Stein → natürlicher Reflektor
- viel Raum → ideal für Familien & Paare

Beste Zeit: **10:00–14:00 Uhr**

## 2. Schönbrunn – Aber nicht dort, wo alle fotografieren
Nein, bitte nicht direkt vor dem Schloss!  
Viel schöner sind die Seitengänge.

Meine Geheim-Spots:
- Hain im seitlichen Park  
- die gelben Mauern am Palmenhaus  
- Baumreihen für Tiefe & Linienführung

Warum es funktioniert:
- einheitliche Farben → ruhige Fotos
- viel Platz → entspannt für Kinder

## 3. Augarten – Der Klassiker, der IMMER funktioniert
Minimalistisch, strukturiert, zeitlos.

Der Augarten ist perfekt, wenn ihr mögt:
- weiche Farben
- ruhige Hintergründe
- klare Linien

Ich fotografiere dort sehr gern **Businessportraits** im Winter.

## 4. Donaukanal morgens – Städteromantik
Im Februar ist der Donaukanal in der Früh fast leer.

Perfekt für:
- Businessportraits  
- Paare  
- modernere Looks

Pro Tipp:  
„Golden Hour" exists in winter — sie ist nur kühler, aber wunderschön.

## 5. Wann lohnt sich Indoor statt Outdoor?
Winter = Wind, Kälte, rote Näschen.  
Für Babys und Kleinkinder empfehle ich IMMER das Studio.

### Studio Vorteile:
- warm  
- kontrolliertes Licht  
- ruhige Atmosphäre

→ Perfekt für **Baby-, Familien- und Businessshootings**.

## Technische Hinweise für Foto-Nerds
- 85 mm f/1.8 für Portraits  
- 50 mm f/2.2 für Bewegungen  
- Weißabgleich: 5.600–6.200 K (winterkühle Luft ausgleichen)

## Soft CTA
Wenn ihr im Winter Fotos möchtet – draußen oder im warmen Studio –, helfe ich euch gern bei der Planung. Der Februar ist einer meiner liebsten Monate.

## Interner Link
Mehr zu unseren **[Fotoshootings in Wien](/fotoshootings)**.

## Externer Link
https://www.wien.gv.at/stadtplan`
  }
];

async function importNewBlogPosts() {
  console.log('🚀 Adding 2 new scheduled blog posts...\n');
  
  let imported = 0;
  let skipped = 0;
  
  for (const post of newPosts) {
    try {
      // Check if post already exists
      const existing = await db.select().from(blogPosts).where(eq(blogPosts.slug, post.slug)).limit(1);
      
      if (existing.length > 0) {
        console.log(`⏭️  Skipping (already exists): ${post.title}`);
        skipped++;
        continue;
      }
      
      // Convert markdown-style content to HTML
      const contentHtml = post.body
        .replace(/^## (.+)$/gm, '<h2>$1</h2>')
        .replace(/^### (.+)$/gm, '<h3>$3</h3>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/^- (.+)$/gm, '<li>$1</li>')
        .split('\n\n')
        .map(p => {
          p = p.trim();
          if (!p) return '';
          if (p.startsWith('<h') || p.startsWith('<li>') || p.startsWith('<ul>')) return p;
          return `<p>${p}</p>`;
        })
        .join('\n')
        .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');
      
      const excerpt = post.metaDescription || post.body.substring(0, 280).replace(/[#*\-]/g, '') + '...';
      
      await db.insert(blogPosts).values({
        title: post.title,
        slug: post.slug,
        content: post.body,
        contentHtml: contentHtml,
        excerpt: excerpt,
        imageUrl: null,
        imageUrl2: null,
        imageUrl3: null,
        status: 'SCHEDULED',
        published: false,
        publishedAt: null,
        scheduledFor: post.scheduledFor,
        seoTitle: post.seoTitle,
        metaDescription: post.metaDescription,
        tags: ['photography', 'vienna', 'baby', 'winter'],
        authorId: null
      });
      
      console.log(`✅ Imported: ${post.title}`);
      console.log(`   📅 Scheduled for: ${post.scheduledFor.toISOString()}`);
      console.log(`   🔗 Slug: ${post.slug}\n`);
      imported++;
    } catch (error) {
      console.error(`❌ Failed to import: ${post.title}`);
      console.error(`   Error: ${error instanceof Error ? error.message : String(error)}\n`);
      skipped++;
    }
  }
  
  console.log('\n📊 Import Summary:');
  console.log(`   ✅ Imported: ${imported}`);
  console.log(`   ⏭️  Skipped: ${skipped}`);
  console.log(`   📝 Total: ${newPosts.length}\n`);
}

importNewBlogPosts()
  .then(() => {
    console.log('✨ Import complete!');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Import failed:', error);
    process.exit(1);
  });
