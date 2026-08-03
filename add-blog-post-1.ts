import dotenv from "dotenv";
dotenv.config();

import { db } from "./server/db";
import { blogPosts } from "./shared/schema";

async function addBlogPost() {
  try {
    const post = await db.insert(blogPosts).values({
      title: "Wie professionelle Fotografie in Wien wirklich funktioniert (Ablauf + Tipps)",
      slug: "professionelle-fotografie-wien-ablauf",
      content: `# Wie professionelle Fotografie in Wien wirklich funktioniert  
*(vom ersten Kontakt bis zur fertigen Bildauswahl)*

Wenn Menschen bei uns ein Shooting buchen, merken wir oft schon im ersten Satz: Sie wollen schöne Fotos – aber sie wollen vor allem **Sicherheit**. Wie läuft das ab? Muss ich posen? Was ist, wenn die Kinder nicht mitmachen? Und warum sehen manche Studiofotos so „steif" aus?

Genau darum geht's hier: **Professionelle Fotografie Wien** – ehrlich erklärt. Ohne Technik-Gelaber. So, wie wir es seit 2012 in Wien machen.

---

## Professionelle Fotografie Wien: Was du wirklich bekommst

Ein professionelles Shooting ist kein Zaubertrick. Es ist ein sauberer Ablauf, viel Erfahrung im Umgang mit Menschen – und ein ruhiger Raum, in dem man sich gut fühlen kann. Das ist der Unterschied.

Was „professionell" in der Praxis bedeutet:

- **ruhige Führung** statt Stress
- **Licht, das schmeichelt** (ohne künstlich zu wirken)
- **klare Auswahl** statt 500 Dateien ohne Richtung
- **saubere Nachbearbeitung** (natürlich, nicht „plastik")
- **Verlässlichkeit**: Termine, Lieferung, Kommunikation

Und ja: Wir fotografieren Menschen, keine Models. Genau darum funktionieren unsere Bilder.

---

## 1) Der erste Kontakt: Klarheit statt Verkaufsdruck

Bei uns startet es simpel: ein kurzer Austausch per WhatsApp, Telefon oder Mail. Wir fragen nicht, um zu verkaufen – wir fragen, um das Shooting passend zu planen.

Typische Fragen, die wir klären:

- Wer kommt mit? (Kinder, Großeltern, Hund – alles möglich)
- Wofür sind die Bilder gedacht? (Wandbild, Bewerbungsfoto, Geschenk, LinkedIn…)
- Welche Stimmung passt zu euch? (modern, klassisch, verspielt, clean)
- Gibt es zeitliche Deadlines? (Geburtstag, Taufe, Weihnachten)

Wenn das klar ist, wird alles leichter – auch für dich.

---

## 2) Vorbereitung: Weniger ist mehr

Die größte Überraschung für viele: Du musst **nicht** perfekt vorbereitet sein. Ein paar Dinge helfen, ja. Aber der Rest ist unsere Aufgabe.

### Quick-Checkliste für ein entspanntes Shooting

- Kleidung: **einfach + harmonisch**, ohne wilde Logos
- Kinder: **nicht „vorwarnen"** mit Druck („du musst lachen!")
- Snacks: klein & sauber (kein Schoko-Drama am Mund 😄)
- Zeit: 10 Minuten früher ankommen = Gold wert
- Erwartung: Ziel ist **echte Stimmung**, nicht Perfektion

---

## 3) Das Shooting: Keine Posing-Show, sondern echte Momente

Viele glauben, ein Studio-Shooting bedeutet steife Posen. Muss es nicht. Wir arbeiten mit kleinen Impulsen, Bewegung, echten Interaktionen. Gerade Familien werden dadurch sofort natürlicher.

Was wir im Shooting aktiv machen:

- wir führen ruhig durch die ersten Minuten
- wir bauen kleine „Mini-Aufgaben" ein (besonders bei Kindern)
- wir achten auf Nähe, Hände, Blickrichtungen (das macht 80% der Wirkung)
- wir fotografieren schnell genug, dass niemand friert oder die Geduld verliert

Und wenn ein Kind mal nicht will? Ganz normal. Dann drehen wir kurz, bauen um, holen es wieder ab. Erfahrung ist da wichtiger als jedes Objektiv.

---

## 4) Bildauswahl: Du entscheidest – ohne Druck

Nach dem Shooting kommt der Teil, der oft unterschätzt wird: **die Auswahl**. Genau hier trennt sich „ich habe Fotos" von „ich habe Bilder, die ich liebe".

Wir zeigen dir die Bilder strukturiert. Du wählst, was wirklich zu dir passt. Ohne „Jetzt musst du aber…".

### So läuft die Auswahl bei uns ab

| Schritt | Was passiert | Warum das wichtig ist |
|---|---|---|
| Vorsortierung | Wir sortieren technisch fehlerhafte Bilder aus | Du siehst nur echte Kandidaten |
| Präsentation | Du siehst die Serie in Ruhe | Klarheit statt Überforderung |
| Favoritenwahl | Du wählst deine Lieblingsbilder | Deine Emotion zählt, nicht unsere |
| Finalisierung | Feine Retusche + Export | Natürlich, hochwertig, nutzbar |

---

## 5) Lieferung & Nutzung: Transparent, DSGVO-konform

Du bekommst genau das, was du auswählst. Und du weißt, was du damit darfst.

- private Nutzung ist selbstverständlich
- keine Veröffentlichung ohne deine Freigabe
- Online-Galerien sind geschützt
- Daten werden nicht „einfach irgendwo" gespeichert

Wenn du dich über Datenschutz in Österreich informieren willst, ist die Seite der Datenschutzbehörde ein guter Startpunkt:  
https://www.dsb.gv.at/

---

## Typische Fehler, die wir (für dich) vermeiden

Hier sind die Klassiker, die wir in Wien oft hören – und die wir bewusst anders machen:

- „Wir hatten keine Führung, wir waren unsicher."
- „Die Kinder waren nach 5 Minuten fertig."
- „Es waren viel zu viele Bilder, ich war überfordert."
- „Retusche war zu stark, ich hab mich nicht mehr erkannt."
- „Am Ende war es plötzlich teurer als gedacht."

Professionell heißt für uns: **Plan + Ruhe + Ergebnis**, das du wirklich nutzt.

---

## Gutschein statt Zeug: Die einfache Geschenk-Idee

Wenn du jemandem wirklich eine Freude machen willst: Ein Shooting-Gutschein ist oft die bessere Wahl als irgendein Gegenstand, der nach drei Wochen im Kasten liegt.

Hier geht's direkt zu unseren Gutscheinen:  
[Fotografie Gutschein in Wien kaufen](https://www.newagefotografie.com/gutscheine)

---

## Häufige Fragen (5) – kurz & ehrlich beantwortet

### 1) Wie lange dauert ein Shooting?
Meist 45–60 Minuten. Bei Business oft kürzer. Bei Familien lieber entspannt statt gehetzt.

### 2) Muss ich posen können?
Nein. Wir führen dich. Du musst nur da sein.

### 3) Können Großeltern oder Haustiere mitkommen?
Ja. Sag's uns vorher kurz, damit wir es gut planen.

### 4) Wie schnell bekomme ich meine Bilder?
Das hängt vom Paket ab – aber wir arbeiten zügig und kommunizieren klar, was wann fertig ist.

### 5) Was, wenn ich mit einem Bild nicht happy bin?
Sag's früh. Je früher wir's wissen, desto leichter können wir reagieren. Wir sind Menschen – und wir lösen Dinge lieber gemeinsam als im Nachhinein.

---

## Fazit

**Professionelle Fotografie Wien** ist nicht „teurer, weil Studio". Sie ist besser, weil sie dir Sicherheit gibt: im Ablauf, im Ergebnis und im Gefühl, dass du dich auf uns verlassen kannst.

Wenn du willst, dass jemand diesen Moment wirklich erlebt (und nicht nur „ein Produkt" bekommt):  
→ **Gutschein kaufen**  
https://www.newagefotografie.com/gutscheine`,
      excerpt: "Professionelle Fotografie Wien: So läuft ein Fotoshooting bei New Age Fotografie ab – von der Vorbereitung bis zur Bildauswahl. Mit Tipps, FAQs und Gutschein-Idee.",
      author: "New Age Fotografie",
      category: "Fotografie Guides",
      tags: ["Professionelle Fotografie Wien", "Fotoshooting Ablauf", "Fotografie Tipps", "Studio Wien"],
      published: true,
      publishedAt: new Date("2026-01-17"),
      seoTitle: "Professionelle Fotografie Wien: Ablauf, Tipps & was wirklich zählt | New Age Fotografie",
      metaDescription: "Professionelle Fotografie Wien: So läuft ein Fotoshooting bei New Age Fotografie ab – von der Vorbereitung bis zur Bildauswahl. Mit Tipps, FAQs und Gutschein-Idee.",
      keyphrase: "Professionelle Fotografie Wien"
    }).returning();

    console.log("✅ Blog post added successfully!");
    console.log("Title:", post[0].title);
    console.log("Slug:", post[0].slug);
    console.log("Published:", post[0].published);
    console.log("Published At:", post[0].publishedAt);
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Error adding blog post:", error);
    process.exit(1);
  }
}

addBlogPost();
