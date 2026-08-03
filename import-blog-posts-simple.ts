import { db } from './server/db.js';
import { blogPosts } from './shared/schema.js';
import { eq } from 'drizzle-orm';

const scheduledPosts = [
  {
    title: 'Entdecke professionelle Familienfotografie in Wien',
    slug: 'entdecke-professionelle-familienfotografie-in-wien',
    scheduledFor: new Date('2025-11-04T09:00:00Z'),
    body: `Wenn eine Familie zu mir ins Studio kommt, spüre ich meistens schon in den ersten Sekunden, wie der Tag verlaufen wird. Es ist dieser warme Mix aus Aufregung, Freude und einem Hauch Nervosität – und genau das liebe ich an meiner Arbeit. Mein Name ist Simon, und in den letzten zwölf Jahren durfte ich über 8.000 Familien, Neugeborene und Unternehmen in Wien fotografieren.

## Warum New Age Fotografie?
Ich glaube an echte Momente. Kein verkrampftes Posieren, keine künstlichen Lächeln. Wenn ihr als Familie bei mir seid, darf alles passieren: Kinder, die herumalbern. Eltern, die lachen. Neugeborene, die einfach schlafen oder die Welt neugierig beobachten.

Was euch bei mir erwartet:
- Ein entspanntes, liebevolles Shooting, das sich natürlich anfühlt
- Ein Studio, das auch für Babys und Kleinkinder sicher und warm vorbereitet ist
- Ein klarer Ablauf, der Stress minimiert und Freude maximiert
- Bilder, die eure Persönlichkeit widerspiegeln – zeitlos, warm, authentisch

## Ein Studio voller Leben
Mein Studio in Wien ist kein steriler Fotoraum. Es ist ein Ort voller Ruhe und Herzlichkeit. Alles ist darauf ausgerichtet, dass ihr euch wohlfühlt.`
  },
  {
    title: 'Unsere Fotografie-Galerie: Momente, die bleiben',
    slug: 'unsere-fotografie-galerie-momente-die-bleiben',
    scheduledFor: new Date('2025-11-08T09:00:00Z'),
    body: `Manchmal sagen Bilder einfach mehr als Worte. In unserer Galerie findet ihr eine Auswahl der emotionalsten, natürlichsten und zeitlosesten Fotos der letzten Jahre. Jede Familie, jedes Baby, jedes Unternehmen bringt seine eigene Geschichte mit – und genau das macht die Arbeit so besonders.

Ich, Simon, lege bei jedem Shooting Wert darauf, die Persönlichkeit und Wärme einer Familie einzufangen. Ob lachende Kinder, ruhige Momente während eines Babyshootings oder starke Businessportraits – jedes Bild ist ein kleines Kunstwerk.

## Unsere Fotografie-Stile
Von klassischen Familienportraits bis hin zu modernen Business-Aufnahmen – wir bieten eine breite Palette an professionellen Fotografie-Services in Wien.`
  },
  {
    title: 'Die besten Outfits für Familienfotos in Wien',
    slug: 'die-besten-outfits-fuer-familienfotos-in-wien',
    scheduledFor: new Date('2025-12-02T09:00:00Z'),
    body: `Wenn ich Familien fotografiere, sage ich immer denselben Satz: *Outfits machen 30 % des gesamten Looks aus.* Und das stimmt. Du kannst unglaublich harmonische, warme und zeitlose Familienfotos bekommen – ohne neue Kleidung zu kaufen, nur durch bewusste Auswahl und Abstimmung.

## Farben, die immer funktionieren
In der Familienfotografie hat sich ein Schema immer wieder bewährt: neutrale, warme und gedeckte Farbtöne.

- Beige, Creme, Off-White
- Sand, Camel, Braun (hell bis mittel)
- Oliv, Salbei, Eukalyptus-Grün
- Zartes Blau, Denim
- Rost, Terracotta

Diese Farben sind zeitlos, wirken auf Bildern ruhig und schmeicheln fast jedem Hautton.

## Jahreszeiten in Wien
### Frühling
Pastelltöne, leichte Stoffe, Denim, Strickcardigans.

### Sommer
Leinen, fließende Kleider, gedeckte Farben.

### Herbst
Terracotta, Rost, Olive, Strick in warmen Naturtönen.

### Winter
Dunklere Neutrals, Wollpullis, gedeckte Farben, Layering.`
  },
  {
    title: 'Tipps für Neugeborenenfotos in Wien',
    slug: 'tipps-fuer-neugeborenenfotos-wien',
    scheduledFor: new Date('2025-12-08T09:00:00Z'),
    body: `Neugeborenenfotografie ist eine der einfühlsamsten und technisch anspruchsvollsten Formen der Porträtfotografie. Als Vater und Fotograf weiß ich, wie wertvoll diese ersten Tage sind – und wie schnell sie verfliegen.

## Der perfekte Zeitpunkt
Die idealen Tage für ein Newborn-Shooting sind Tag 6 bis 14 nach der Geburt. In dieser Phase schlafen Babys tiefer, lassen sich leichter positionieren und haben noch den typischen Neugeborenenlook.

## Raumtemperatur & Sicherheit
In meinem Studio halten wir die Temperatur konstant warm – rund 26°C. Das sorgt dafür, dass dein Baby entspannt bleibt und nie auskühlt.

Sicherheit steht an erster Stelle:
- Keine riskanten Posen
- Keine ungeübten Props
- Immer eine Hand in der Nähe

## Was Eltern vorbereiten können
- Viel Zeit einplanen (2–3 Stunden)
- Baby vor dem Shooting gut füttern
- Ersatzwindeln + Wickeltücher mitnehmen
- Neutrale Kleidung + kein Aufdruck`
  },
  {
    title: 'Businessfotografie Wien: Der ultimative Guide',
    slug: 'businessfotografie-wien-guide',
    scheduledFor: new Date('2025-12-15T09:00:00Z'),
    body: `Gute Businessportraits sind weit mehr als nur ein Bild – sie sind oft die erste Berührung eines Kunden mit deiner Marke. In Wien haben wir eine stark visuelle Kultur: professionelle Profile wirken seriöser, vertrauenswürdiger und steigern messbar die Conversion.

## Der richtige Stil für deine Branche
- Corporate: Klar, neutral, seriös
- Kreative Berufe: Locker, dynamisch, urban
- Coaches, Consultants: Warm, offen, persönlich

## Kleidung & Farben
Wichtig ist Authentizität, nicht Verkleidung. Am besten funktionieren:
- Navy, Grau, Weiß, Naturtöne
- Kein hartes Schwarz (wirkt streng)
- Keine wilden Muster

## Studio vs. Outdoor
### Studio
- Kontrolliertes Licht
- Zeitlos, professionell

### Outdoor (Wien)
- Museumsquartier
- Stephansplatz (morgens!)
- Donaukanal
- Rooftop-Locations`
  },
  {
    title: 'Die Bedeutung von Familienfotos',
    slug: 'die-bedeutung-von-familienfotos',
    scheduledFor: new Date('2025-12-22T09:00:00Z'),
    body: `Es gibt Aufnahmen, die hängen wir an die Wand, weil sie schön sind. Und dann gibt es Fotos, die wir aufbewahren, weil sie bedeutend sind. Familienfotos gehören zur zweiten Kategorie.

## Familienfotos stärken Identität
Studien zeigen, dass Kinder, die regelmäßig Familienfotos sehen, ein stärkeres Zugehörigkeitsgefühl entwickeln.

## Sie halten Lebensphasen fest
Babyzeit, Kindergarten, Schule, Teenagerjahre – jede Phase vergeht schnell. Fotos konservieren diese Momente.

## Sie verbinden Generationen
Großeltern, Eltern, Kinder – Bilder schaffen eine visuelle Familiengeschichte.

## Sie schenken Freude
Viele Kund:innen sagen, dass sie ihre Familienfotos genau an den Tagen ansehen, an denen sie Kraft brauchen.`
  },
  {
    title: 'Wiener Familienfotoshooting: Professionelle Tipps',
    slug: 'wiener-familienfotoshooting-tipps',
    scheduledFor: new Date('2026-01-06T09:00:00Z'),
    body: `Es gibt Familien, die betreten das Studio, und ich spüre sofort: Das wird gut. Nicht wegen der Outfits oder der Vorbereitung – sondern wegen der Stimmung. Ein entspanntes, schönes Fotoshooting beginnt nicht bei der Kamera, sondern im Kopf.

## Vorbereitung – aber ohne Stress
Viele Eltern möchten alles perfekt machen. Und ich sage immer: Perfektion ist nicht nötig – Harmonie schon.

Was wirklich hilft:
- Outfits am Vorabend bereitlegen
- Snacks & Wasser einpacken
- Kinder vorher ausruhen lassen
- Zeit einplanen (kein Termin direkt davor oder danach)

## Kleidung, die auf Fotos immer gut wirkt
Ich empfehle neutrale, warme Naturfarben: Creme, Beige, Oliv, Eukalyptus, Denim, Hellbraun.

## Was wir machen, wenn Kinder nicht wollen
Ganz ehrlich: 70 % aller Kinder sind beim Shooting anfangs skeptisch. Das ist normal – und absolut kein Problem.

Ich arbeite immer nach drei Prinzipien:
1. Langsam starten – kein Druck
2. Erst spielen, dann fotografieren
3. Humor statt Anweisungen`
  }
];

async function importBlogPosts() {
  console.log('🚀 Starting blog post import...\n');
  
  let imported = 0;
  let skipped = 0;
  
  for (const post of scheduledPosts) {
    try {
      // Check if post already exists
      const existing = await db.select().from(blogPosts).where(eq(blogPosts.slug, post.slug)).limit(1);
      
      if (existing.length > 0) {
        console.log(`⏭️  Skipping (already exists): ${post.title}`);
        skipped++;
        continue;
      }
      
      const contentHtml = post.body
        .replace(/^## (.+)$/gm, '<h2>$1</h2>')
        .replace(/^### (.+)$/gm, '<h3>$1</h3>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/^- (.+)$/gm, '<li>$1</li>')
        .split('\n\n')
        .map(p => p.trim() && !p.startsWith('<h') && !p.startsWith('<li>') ? `<p>${p}</p>` : p)
        .join('\n')
        .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');
      
      const excerpt = post.body.substring(0, 280).replace(/[#*\-]/g, '') + '...';
      
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
        seoTitle: post.title,
        metaDescription: excerpt,
        tags: ['photography', 'vienna', 'family'],
        authorId: null
      });
      
      console.log(`✅ Imported: ${post.title}`);
      console.log(`   📅 Scheduled for: ${post.scheduledFor.toISOString()}`);
      console.log(`   🔗 Slug: ${post.slug}\n`);
      imported++;
    } catch (error) {
      console.error(`❌ Failed to import: ${post.title}`);
      console.error(`   Error: ${error.message}\n`);
      skipped++;
    }
  }
  
  console.log('\n📊 Import Summary:');
  console.log(`   ✅ Imported: ${imported}`);
  console.log(`   ⏭️  Skipped: ${skipped}`);
  console.log(`   📝 Total: ${scheduledPosts.length}\n`);
}

importBlogPosts()
  .then(() => {
    console.log('✨ Import complete!');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Import failed:', error);
    process.exit(1);
  });
