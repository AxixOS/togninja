/**
 * Knowledge Base starter seed
 *
 * The Knowledge Base powers the customer-facing chat assistant (the assistant
 * searches these articles to answer visitor questions). A fresh install has an
 * empty KB, so the assistant has nothing to draw on and the admin page looks
 * like a bare placeholder.
 *
 * This seeds a starter set of professional photography-studio FAQ articles the
 * first time the table is empty. The content is mostly tenant-NEUTRAL industry
 * guidance (accurate for any studio); studio-specific details (name, address,
 * phone, email) are pulled from `studio_configs` so each tenant gets its own
 * contact info rather than New Age's. Everything is editable in the admin UI.
 *
 * Idempotent: only runs when the table is empty, so it never overwrites a
 * studio's own articles and never duplicates on redeploy.
 */

import { db } from './db';
import { knowledgeBase, studioConfigs } from '../shared/schema';
import { sql } from 'drizzle-orm';

export async function seedKnowledgeBase(): Promise<void> {
  try {
    // Only seed an empty table.
    const countRes: any = await db.execute(sql`SELECT COUNT(*)::int AS n FROM knowledge_base`);
    const n = countRes?.rows?.[0]?.n ?? 0;
    if (n > 0) return;

    const [sc] = await db.select().from(studioConfigs).limit(1).catch(() => [null as any]);
    const name = sc?.businessName || sc?.studioName || 'unser Fotostudio';
    const addr = sc?.address ? (sc?.city ? `${sc.address}, ${sc.city}` : sc.address) : null;
    const phone = sc?.phone || null;
    const email = sc?.email || sc?.ownerEmail || null;

    const contactLines = [
      addr ? `📍 ${addr}` : null,
      phone ? `📞 ${phone} (Tel & WhatsApp)` : null,
      email ? `✉️ ${email}` : null,
    ].filter(Boolean).join('\n');

    const articles: Array<{ title: string; content: string; category: string; tags: string[] }> = [
      {
        title: 'Standort & Kontakt',
        category: 'Allgemein',
        tags: ['kontakt', 'adresse', 'anfahrt'],
        content:
          `So erreichst du ${name}:\n\n${contactLines || 'Bitte hinterlege Adresse und Kontaktdaten in den Studio-Einstellungen.'}\n\n` +
          `Am besten vereinbarst du vorab einen Termin – so können wir uns in Ruhe Zeit für dich nehmen.`,
      },
      {
        title: 'Wie buche ich einen Termin?',
        category: 'Buchung',
        tags: ['buchung', 'termin', 'warteliste'],
        content:
          `Termine vergeben wir über unsere Warteliste und auf Anfrage. Trag dich auf der Warteliste ein oder ` +
          `kontaktiere uns direkt${phone ? ` unter ${phone}` : ''}${email ? ` oder ${email}` : ''}. ` +
          `Wir melden uns mit freien Terminen und stimmen alle Details mit dir ab.`,
      },
      {
        title: 'Familienshooting: Was soll ich anziehen?',
        category: 'Vorbereitung',
        tags: ['familie', 'outfit', 'kleidung'],
        content:
          `Für zeitlose Familienportraits wirken neutrale, aufeinander abgestimmte Töne am besten. ` +
          `Vermeide große Logos oder sehr grelle Muster – so bleibt der Fokus auf euch. ` +
          `Stimmt eure Outfits farblich locker aufeinander ab (nicht exakt gleich, sondern harmonierend).`,
      },
      {
        title: 'Neugeborenenfotos: Wann ist der beste Zeitpunkt?',
        category: 'Vorbereitung',
        tags: ['neugeborene', 'baby', 'timing'],
        content:
          `Ideal für natürliche, entspannte Posen sind die ersten 10–14 Tage nach der Geburt – in dieser Zeit ` +
          `schlafen Neugeborene besonders tief. Am besten meldest du dich schon während der Schwangerschaft, ` +
          `damit wir deinen Wunschtermin rund um den errechneten Geburtstermin reservieren können.`,
      },
      {
        title: 'Fotografiert ihr im Studio oder auch draußen?',
        category: 'Sessions',
        tags: ['studio', 'outdoor', 'location'],
        content:
          `Beides! Je nach Wunsch fotografieren wir im Studio oder an einem Outdoor-Standort. ` +
          `Sag uns einfach, welchen Look du dir vorstellst, und wir empfehlen dir die passende Variante.`,
      },
      {
        title: 'Welche Shooting-Arten bietet ihr an?',
        category: 'Sessions',
        tags: ['services', 'shooting-arten'],
        content:
          `Wir fotografieren u. a.:\n` +
          `• Familienfotos\n• Neugeborenen- & Babyfotos (ca. 3–12 Monate)\n• Schwangerschafts-/Babybauch-Shootings\n` +
          `• Business-Portraits & Bewerbungsfotos\n• Teamfotos\n• Hochzeits- & Eventfotografie\n• Produkt- & Immobilienfotografie\n\n` +
          `Du bist unsicher, was zu dir passt? Schreib uns – wir beraten dich gern.`,
      },
      {
        title: 'Gutscheine & Druckguthaben',
        category: 'Gutscheine',
        tags: ['gutschein', 'voucher', 'geschenk'],
        content:
          `Ein Fotoshooting ist ein wunderbares Geschenk. Gutscheine kannst du online erwerben – ` +
          `die Details und aktuellen Angebote findest du auf unserer Gutschein-Seite unter /vouchers. ` +
          `Zu vielen Shootings gibt es zusätzlich ein Druckguthaben.`,
      },
      {
        title: 'Wann und wie erhalte ich meine Fotos?',
        category: 'Nach dem Shooting',
        tags: ['bilder', 'lieferung', 'galerie'],
        content:
          `Nach dem Shooting treffen wir eine sorgfältige Auswahl und bearbeiten deine Bilder professionell. ` +
          `Du erhältst deine Fotos in einer privaten Online-Galerie, aus der du deine Favoriten auswählen kannst. ` +
          `Die genaue Bearbeitungszeit nennen wir dir bei der Terminvereinbarung.`,
      },
      {
        title: 'Was kostet ein Fotoshooting?',
        category: 'Preise',
        tags: ['preise', 'pakete', 'kosten'],
        content:
          `Die Preise hängen von Shooting-Art und Paket ab. Aktuelle Pakete und Angebote findest du auf unserer ` +
          `Gutschein-/Angebotsseite, oder wir stellen dir gern ein passendes Angebot zusammen – ` +
          `kontaktiere uns einfach${email ? ` unter ${email}` : ''}.`,
      },
    ];

    for (const a of articles) {
      await db.insert(knowledgeBase).values({
        title: a.title,
        content: a.content,
        category: a.category,
        tags: a.tags,
        isActive: true,
      });
    }

    console.log(`✅ Seeded ${articles.length} starter Knowledge Base articles`);
  } catch (error: any) {
    console.warn('⚠️ Knowledge Base seed skipped:', error.message);
  }
}
