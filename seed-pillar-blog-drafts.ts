/**
 * Seed 15 pillar-cluster blog post drafts (DE) with internal linking.
 * Each post links UP to its pillar service page, SIDEWAYS to a sibling,
 * and DOWN to a conversion CTA (/warteliste/ or /kontakt).
 *
 * Usage: npx tsx seed-pillar-blog-drafts.ts
 */
import dotenv from "dotenv";
dotenv.config();

import { db } from "./server/db";
import { blogPosts } from "./shared/schema";
import { eq } from "drizzle-orm";

type Draft = {
  slug: string;
  title: string;
  seoTitle: string;
  metaDescription: string;
  excerpt: string;
  tags: string[];
  pillarPath: string;
  pillarLabel: string;
  siblingSlug: string;
  siblingLabel: string;
  intro: string;
  sections: { h2: string; body: string }[];
};

const FAMILIE_SIBLINGS = [
  "was-kostet-familienfotos-wien",
  "kleidung-familienfotos-tipps",
  "familienfotos-studio-oder-outdoor",
  "beste-zeit-fuer-familienfotos",
  "familienfotos-mit-kindern-tipps",
];
const BABY_SIBLINGS = [
  "newborn-fotos-wien-tipps",
  "babyfotos-erste-wochen",
  "sicherheit-newborn-shooting",
  "babyfotografie-preise-wien",
  "wann-newborn-shooting",
];
const BUSINESS_SIBLINGS = [
  "business-portrait-tipps",
  "linkedin-fotos-wien",
  "was-macht-ein-gutes-businessfoto",
  "mitarbeiterfotos-wien",
  "personal-branding-fotografie",
];

function pickSibling(list: string[], self: string): string {
  const others = list.filter((s) => s !== self);
  return others[0];
}

function labelFromSlug(slug: string): string {
  return slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function buildContent(d: Draft): string {
  const sectionsMd = d.sections
    .map((s) => `## ${s.h2}\n\n${s.body}`)
    .join("\n\n");
  return `# ${d.title}

${d.intro}

${sectionsMd}

## So geht's weiter

Mehr zum Thema findest du auf unserer Pillar-Seite [${d.pillarLabel}](${d.pillarPath}). Wenn du tiefer einsteigen möchtest, lies auch [${d.siblingLabel}](/blog/${d.siblingSlug}).

Bereit für dein Shooting? [Jetzt Termin auf der Warteliste sichern](/warteliste/) oder [uns direkt kontaktieren](/kontakt). Preise findest du auf [Fotoshooting Preise Wien](/fotoshooting-preise-wien/) und [Preise](/preise/).
`;
}

const drafts: Draft[] = [
  // ----- FAMILIE -----
  {
    slug: "was-kostet-familienfotos-wien",
    title: "Was kostet ein Familienfoto-Shooting in Wien?",
    seoTitle: "Familienfotos Wien Kosten – Preise & Was drin ist | New Age Fotografie",
    metaDescription:
      "Was kostet ein Familienfoto-Shooting in Wien? Transparente Preise, was enthalten ist und wie du das passende Paket wählst – von New Age Fotografie.",
    excerpt:
      "Transparente Preise für Familienfotos in Wien: was enthalten ist, was extra kostet und wie du das richtige Paket findest.",
    tags: ["Familienfotos", "Wien", "Preise", "Kosten"],
    pillarPath: "/familienfotos-wien/",
    pillarLabel: "Familienfotos Wien",
    siblingSlug: pickSibling(FAMILIE_SIBLINGS, "was-kostet-familienfotos-wien"),
    siblingLabel: labelFromSlug(pickSibling(FAMILIE_SIBLINGS, "was-kostet-familienfotos-wien")),
    intro:
      "Du suchst einen **Familienfotograf in Wien** und fragst dich, was ein Shooting wirklich kostet? Dieser Ratgeber zeigt dir transparent, wie sich Preise zusammensetzen, was du bekommst – und wo günstige Angebote Fallen haben.",
    sections: [
      {
        h2: "Die Preisspanne für Familienfotos in Wien",
        body: "In Wien reichen professionelle Familien-Shootings von ca. **€95 Einstiegspaket** bis über €500 für umfangreiche Komplettpakete inkl. Wandbild. Entscheidend ist nicht der Preis allein, sondern was tatsächlich enthalten ist: Shooting-Dauer, Anzahl bearbeiteter Bilder, Nutzungsrechte und Lieferformat.",
      },
      {
        h2: "Was im New Age Fotografie Basispaket enthalten ist",
        body: "Unser Familien-Einstiegspaket startet ab **€95** und enthält ein Shooting im Studio Wien 1050, eine professionell bearbeitete Auswahl, digitale Bilder in Druckqualität und ruhige Betreuung – auch wenn Kinder dabei sind.",
      },
      {
        h2: "Warum billig oft teuer wird",
        body: "Günstige Angebote unter €50 verkaufen oft nur das Shooting selbst – Bilder kosten dann einzeln extra. Achte auf den **Gesamtpreis**, bevor du buchst.",
      },
    ],
  },
  {
    slug: "kleidung-familienfotos-tipps",
    title: "Was anziehen beim Familienfoto-Shooting? Kleidung-Tipps aus der Praxis",
    seoTitle: "Familienfotos Kleidung – Was anziehen? Tipps vom Fotografen Wien",
    metaDescription:
      "Welche Kleidung funktioniert beim Familien-Shooting? Farben, Muster, Stil-Tipps und was du lieber zuhause lässt – direkt vom Familienfotograf in Wien.",
    excerpt:
      "Welche Kleidung funktioniert beim Familien-Shooting? Praxis-Tipps zu Farben, Mustern und Stil vom Wiener Fotografen.",
    tags: ["Familienfotos", "Kleidung", "Tipps", "Wien"],
    pillarPath: "/familienfotos-wien/",
    pillarLabel: "Familienfotos Wien",
    siblingSlug: pickSibling(FAMILIE_SIBLINGS, "kleidung-familienfotos-tipps"),
    siblingLabel: labelFromSlug(pickSibling(FAMILIE_SIBLINGS, "kleidung-familienfotos-tipps")),
    intro:
      "Die Frage, die jeder Familie stellt: **Was ziehen wir an?** Hier die ehrlichen Tipps aus über 10 Jahren Studio-Erfahrung in Wien.",
    sections: [
      {
        h2: "Die goldene Regel: Harmonie statt Uniform",
        body: "Alle in weißen T-Shirts sieht steril aus. Stattdessen: **eine Farbpalette** mit 2–3 harmonierenden Tönen (z. B. Cremeweiß, Beige, sanftes Grün). Jede Person zieht aus der Palette – das wirkt zusammenhängend, aber nicht uniform.",
      },
      {
        h2: "Was du vermeiden solltest",
        body: "- Grelle Logos oder Print-Shirts\n- Neon-Farben (reflektieren auf Gesichter)\n- Kleine, wilde Muster (flimmern)\n- Abgetragene Lieblingsshirts mit Flecken",
      },
      {
        h2: "Tipp für Familien mit Kindern",
        body: "Kinder bewegen sich. Wähle Kleidung, in der sie sich wohl fühlen – keine steifen Hemden, die nach 5 Minuten drücken. Komfort = echte Mimik.",
      },
    ],
  },
  {
    slug: "familienfotos-studio-oder-outdoor",
    title: "Familienfotos Studio oder Outdoor? Vergleich mit Vor- und Nachteilen",
    seoTitle: "Studio vs Outdoor Familienfotos Wien – Was passt besser?",
    metaDescription:
      "Studio oder Outdoor für Familienfotos in Wien? Ehrlicher Vergleich: Licht, Wetter, Kinder, Ergebnis – damit du die richtige Wahl triffst.",
    excerpt:
      "Studio vs. Outdoor: welche Variante passt zu deiner Familie? Licht, Kinder, Wetter – ein ehrlicher Vergleich.",
    tags: ["Familienfotos", "Studio", "Outdoor", "Wien"],
    pillarPath: "/familienfotos-wien/",
    pillarLabel: "Familienfotos Wien",
    siblingSlug: pickSibling(FAMILIE_SIBLINGS, "familienfotos-studio-oder-outdoor"),
    siblingLabel: labelFromSlug(pickSibling(FAMILIE_SIBLINGS, "familienfotos-studio-oder-outdoor")),
    intro:
      "Viele Familien kommen mit der Frage zu uns: **„Sollen wir ins Studio oder lieber raus in die Natur?"** Die Antwort hängt von euch ab – hier die echten Kriterien.",
    sections: [
      {
        h2: "Vorteile Studio Wien 1050",
        body: "Wetter egal, kontrolliertes Licht, keine Ablenkung für Kinder, ruhige Atmosphäre. Gerade bei Babys und kleinen Kindern ein klarer Gewinn.",
      },
      {
        h2: "Vorteile Outdoor",
        body: "Mehr Bewegungsfreiheit, Jahreszeiten-Stimmung, Emotionen im Spiel. Aber: Wetter- und Lichtabhängig, schwerer planbar.",
      },
      {
        h2: "Unsere Empfehlung",
        body: "Für **Newborn, Baby, klassische Familienbilder** → Studio. Für spielerische, natürliche Stimmungen → Outdoor. Viele Familien buchen beides über die Zeit.",
      },
    ],
  },
  {
    slug: "beste-zeit-fuer-familienfotos",
    title: "Wann ist die beste Zeit für Familienfotos?",
    seoTitle: "Beste Zeit Familienfotos Wien – Jahreszeit, Uhrzeit & Alter der Kinder",
    metaDescription:
      "Wann solltest du Familienfotos machen lassen? Jahreszeit, Tageszeit, Alter der Kinder – Timing-Tipps von Wiens Familienfotograf.",
    excerpt:
      "Frühjahr, Herbst, Vormittag, Nachmittag? Und was ist mit den Kindern? Timing-Tipps für Familienfotos in Wien.",
    tags: ["Familienfotos", "Timing", "Wien"],
    pillarPath: "/familienfotos-wien/",
    pillarLabel: "Familienfotos Wien",
    siblingSlug: pickSibling(FAMILIE_SIBLINGS, "beste-zeit-fuer-familienfotos"),
    siblingLabel: labelFromSlug(pickSibling(FAMILIE_SIBLINGS, "beste-zeit-fuer-familienfotos")),
    intro:
      "Ein Familien-Shooting ist kein Zufall: Timing entscheidet mit über das Ergebnis. Hier die wichtigsten Zeit-Fenster, die in unserer Studio-Praxis funktionieren.",
    sections: [
      {
        h2: "Studio: Vormittags für Kinder",
        body: "Kinder sind vormittags am ausgeglichensten. Termine **zwischen 9–11 Uhr** liefern in der Regel die besten Bilder.",
      },
      {
        h2: "Outdoor: Goldene Stunde",
        body: "Ca. 1 Stunde vor Sonnenuntergang. Weiches Licht, warme Töne – aber eben weniger planbar mit Kleinkindern.",
      },
      {
        h2: "Jahreszeit",
        body: "Studio: ganzjährig. Outdoor: April–Oktober. Herbst ist visuell stark, aber wetterabhängig.",
      },
    ],
  },
  {
    slug: "familienfotos-mit-kindern-tipps",
    title: "Familienfotos mit Kindern: 7 Tipps, die wirklich helfen",
    seoTitle: "Familienfotos mit Kindern – 7 Tipps vom Fotografen Wien",
    metaDescription:
      "So klappt das Familien-Shooting mit Kindern: 7 ehrliche Tipps aus dem Studio in Wien – vom Ablauf bis zur Belohnung.",
    excerpt:
      "Kinder beim Fotoshooting? Hier 7 getestete Tipps, die stressfreie Bilder möglich machen.",
    tags: ["Familienfotos", "Kinder", "Tipps", "Wien"],
    pillarPath: "/familienfotos-wien/",
    pillarLabel: "Familienfotos Wien",
    siblingSlug: pickSibling(FAMILIE_SIBLINGS, "familienfotos-mit-kindern-tipps"),
    siblingLabel: labelFromSlug(pickSibling(FAMILIE_SIBLINGS, "familienfotos-mit-kindern-tipps")),
    intro:
      "Kinder beim Shooting? Viele Eltern sind nervös. Muss nicht sein – hier sind die Tipps, die bei uns im Studio Wien wirklich funktionieren.",
    sections: [
      {
        h2: "1. Kein Druck im Vorfeld",
        body: "Sag deinem Kind **nicht** „du musst lachen!". Das erzeugt Stress. Erkläre es als Ausflug, nicht als Pflicht.",
      },
      {
        h2: "2. Snack & Lieblingsobjekt",
        body: "Ein kleiner Snack und das Lieblingsspielzeug helfen in der Anwärmphase enorm.",
      },
      {
        h2: "3. Timing nach dem Mittagsschlaf vermeiden",
        body: "Frisch geschlafene Kinder sind oft benommen. Besser: gut ausgeschlafen, aber wach.",
      },
      {
        h2: "4. Vertrauen an den Fotografen abgeben",
        body: "Wir führen Kinder mit kleinen Spielen. Je mehr Eltern im Hintergrund loslassen, desto natürlicher die Bilder.",
      },
      {
        h2: "5. Flexibel bleiben",
        body: "Wenn ein Kind grade nicht will, drehen wir um, fotografieren die Eltern allein – und holen das Kind in 10 Minuten wieder ab.",
      },
      {
        h2: "6. Kleidung = Komfort",
        body: "Siehe auch: [Kleidung Tipps für Familienfotos](/blog/kleidung-familienfotos-tipps).",
      },
      {
        h2: "7. Belohnung nach dem Shooting",
        body: "Ein Eis danach ist manchmal das, was Kinder am längsten vom Shooting erinnern – und das ist OK.",
      },
    ],
  },

  // ----- BABY / NEWBORN -----
  {
    slug: "newborn-fotos-wien-tipps",
    title: "Newborn Fotos Wien: Was du vorher wissen solltest",
    seoTitle: "Newborn Fotos Wien – Tipps, Ablauf & was zu beachten ist",
    metaDescription:
      "Newborn Fotos in Wien richtig planen: Zeitpunkt, Sicherheit, Ablauf und Tipps vom Spezialisten. Dein Leitfaden für ein ruhiges Shooting.",
    excerpt:
      "Alles, was Eltern vor einem Newborn-Shooting in Wien wissen sollten – Zeitpunkt, Sicherheit und Ablauf.",
    tags: ["Newborn", "Babyfotos", "Wien", "Tipps"],
    pillarPath: "/babyfotos-wien/",
    pillarLabel: "Babyfotos Wien",
    siblingSlug: pickSibling(BABY_SIBLINGS, "newborn-fotos-wien-tipps"),
    siblingLabel: labelFromSlug(pickSibling(BABY_SIBLINGS, "newborn-fotos-wien-tipps")),
    intro:
      "Ein Newborn-Shooting ist etwas Besonderes. Und es ist **anders** als ein normales Baby-Shooting. Hier die wichtigsten Dinge, die Eltern wissen sollten.",
    sections: [
      {
        h2: "Idealer Zeitpunkt: 5–14 Tage nach Geburt",
        body: "In diesem Fenster schlafen Babys tief und lassen sich gut in Posen legen. Danach wird es zunehmend schwieriger, die klassischen „zusammengerollten" Bilder zu machen.",
      },
      {
        h2: "Wärme, Ruhe, Zeit",
        body: "Unser Studio ist auf ca. **24–26°C** aufgeheizt. Babys mögen es warm. Und wir nehmen uns **2–3 Stunden** Zeit – ohne Hektik.",
      },
      {
        h2: "Sicherheit zuerst",
        body: "Lies unbedingt [Sicherheit beim Newborn-Shooting](/blog/sicherheit-newborn-shooting). Wir arbeiten ausschließlich mit sicheren Posen und Composite-Techniken.",
      },
    ],
  },
  {
    slug: "babyfotos-erste-wochen",
    title: "Babyfotos in den ersten Wochen: Was funktioniert, was nicht",
    seoTitle: "Babyfotos erste Wochen – Was Eltern beachten sollten | Wien",
    metaDescription:
      "Babyfotos in den ersten Wochen nach Geburt: was geht, was nicht, und warum der Zeitpunkt entscheidend ist. Ratgeber aus dem Wiener Fotostudio.",
    excerpt:
      "Die ersten Wochen sind magisch – aber empfindlich. So klappen Fotos ohne Stress für Baby und Eltern.",
    tags: ["Babyfotos", "Newborn", "Erste Wochen", "Wien"],
    pillarPath: "/babyfotos-wien/",
    pillarLabel: "Babyfotos Wien",
    siblingSlug: pickSibling(BABY_SIBLINGS, "babyfotos-erste-wochen"),
    siblingLabel: labelFromSlug(pickSibling(BABY_SIBLINGS, "babyfotos-erste-wochen")),
    intro:
      "Die ersten Wochen mit Baby sind ein Ausnahmezustand. Viele Eltern fragen: **Wann darf ich Fotos machen lassen – und wie?** Hier der Praxis-Guide.",
    sections: [
      {
        h2: "Tag 5 bis 14: Newborn-Fenster",
        body: "Ideal für klassische Newborn-Bilder. Baby schläft tief, noch sehr biegsam.",
      },
      {
        h2: "Woche 3–6: Wacher, neugieriger",
        body: "Weniger „Newborn-Look", aber mehr Mimik. Eine schöne Ergänzung – aber andere Bildsprache.",
      },
      {
        h2: "Was du vorbereiten kannst",
        body: "- Gefüttertes Baby mitbringen\n- Decken aus Zuhause für Geruch & Trost\n- Zeit einplanen (keine Folgetermine an dem Tag)",
      },
    ],
  },
  {
    slug: "sicherheit-newborn-shooting",
    title: "Sicherheit beim Newborn-Shooting: Was seriöse Fotografen beachten",
    seoTitle: "Newborn Shooting Sicherheit – Worauf Eltern achten müssen",
    metaDescription:
      "Sicherheit beim Newborn-Shooting in Wien: Composite-Technik, Spotter, Hygiene und was seriöse Fotografen nie tun. Wichtiger Ratgeber für Eltern.",
    excerpt:
      "Nicht jede „süße" Pose ist sicher. Was seriöse Newborn-Fotografen tun – und was du vermeiden solltest.",
    tags: ["Newborn", "Sicherheit", "Babyfotos", "Wien"],
    pillarPath: "/babyfotos-wien/",
    pillarLabel: "Babyfotos Wien",
    siblingSlug: pickSibling(BABY_SIBLINGS, "sicherheit-newborn-shooting"),
    siblingLabel: labelFromSlug(pickSibling(BABY_SIBLINGS, "sicherheit-newborn-shooting")),
    intro:
      "Die ehrliche Wahrheit: Viele Instagram-Newborn-Posen sind **nicht sicher ausgeführt** – sondern per Composite aus mehreren Bildern zusammengesetzt. Hier, was Eltern wissen müssen.",
    sections: [
      {
        h2: "Composite-Technik",
        body: "Bei Posen wie der „Froschpose" wird das Baby **nie** unbegleitet so gehalten. Der Fotograf macht mehrere Bilder mit Stützung durch einen Elternteil und setzt diese digital zusammen. Alles andere ist unseriös.",
      },
      {
        h2: "Spotter / zweite Person",
        body: "Bei allen erhöhten oder liegenden Posen ist immer eine Hand am Baby. Entweder Elternteil oder Assistent.",
      },
      {
        h2: "Hygiene & Wärme",
        body: "Hände desinfiziert, Studio warm, Requisiten gewaschen. Klingt selbstverständlich – ist aber nicht überall Standard.",
      },
    ],
  },
  {
    slug: "babyfotografie-preise-wien",
    title: "Babyfotografie Preise Wien: Was kostet ein Newborn- oder Baby-Shooting?",
    seoTitle: "Babyfotografie Preise Wien – Kosten Newborn & Baby Shooting",
    metaDescription:
      "Babyfotografie Preise in Wien transparent erklärt: Newborn-Shooting, Baby-Shooting, Pakete, was enthalten ist. Von New Age Fotografie.",
    excerpt:
      "Transparente Preise für Newborn- und Baby-Shootings in Wien – inklusive Vergleich was im Preis steckt.",
    tags: ["Babyfotos", "Preise", "Newborn", "Wien"],
    pillarPath: "/babyfotos-wien/",
    pillarLabel: "Babyfotos Wien",
    siblingSlug: pickSibling(BABY_SIBLINGS, "babyfotografie-preise-wien"),
    siblingLabel: labelFromSlug(pickSibling(BABY_SIBLINGS, "babyfotografie-preise-wien")),
    intro:
      "Was kostet ein Baby- oder Newborn-Shooting in Wien? Hier die ehrliche Übersicht – ohne Lockangebote, ohne versteckte Kosten.",
    sections: [
      {
        h2: "Einstieg ab €95",
        body: "Unser Baby-Basispaket startet bei **€95**. Newborn-Pakete liegen etwas höher wegen des Zeitaufwands (2–3 Stunden pro Shooting).",
      },
      {
        h2: "Was ist enthalten",
        body: "Shooting, Betreuung, ruhige Studio-Atmosphäre, Bildauswahl, professionelle Bearbeitung, digitale Lieferung in Druckqualität.",
      },
      {
        h2: "Pakete vergleichen",
        body: "Mehr Details: [Fotoshooting Preise Wien](/fotoshooting-preise-wien/) und [Preise Übersicht](/preise/).",
      },
    ],
  },
  {
    slug: "wann-newborn-shooting",
    title: "Wann Newborn-Shooting machen? Der richtige Zeitpunkt",
    seoTitle: "Wann Newborn Shooting machen – Der ideale Zeitpunkt | Wien",
    metaDescription:
      "Wann ist der beste Zeitpunkt für ein Newborn-Shooting in Wien? Das 5–14-Tage-Fenster erklärt – inklusive was geht, wenn du es verpasst hast.",
    excerpt:
      "Warum das 5–14-Tage-Fenster so wichtig ist – und was tun, wenn du es verpasst hast.",
    tags: ["Newborn", "Timing", "Babyfotos", "Wien"],
    pillarPath: "/babyfotos-wien/",
    pillarLabel: "Babyfotos Wien",
    siblingSlug: pickSibling(BABY_SIBLINGS, "wann-newborn-shooting"),
    siblingLabel: labelFromSlug(pickSibling(BABY_SIBLINGS, "wann-newborn-shooting")),
    intro:
      "„Wann sollten wir das Newborn-Shooting machen?" – die häufigste Frage werdender Eltern. Hier die klare Antwort.",
    sections: [
      {
        h2: "Das 5–14-Tage-Fenster",
        body: "In den ersten zwei Wochen schlafen Babys tief und sind sehr biegsam. Das macht die klassischen Newborn-Posen überhaupt erst möglich.",
      },
      {
        h2: "Danach?",
        body: "Ab Woche 3 werden Babys wacher. Schöne Bilder sind weiterhin möglich – aber mit anderer Bildsprache (siehe [Babyfotos erste Wochen](/blog/babyfotos-erste-wochen)).",
      },
      {
        h2: "Jetzt schon planen",
        body: "Wir empfehlen: schon **in der Schwangerschaft** den Termin vorreservieren. Wir halten flexibel bis zur tatsächlichen Geburt.",
      },
    ],
  },

  // ----- BUSINESS -----
  {
    slug: "business-portrait-tipps",
    title: "Business Portrait Tipps: So wirkst du souverän & professionell",
    seoTitle: "Business Portrait Tipps – So wirkst du professionell | Wien",
    metaDescription:
      "Business Portrait Tipps aus dem Studio Wien: Kleidung, Mimik, Pose, Hintergrund. So bekommst du ein Bild, das Vertrauen schafft.",
    excerpt:
      "Was ein gutes Business-Portrait ausmacht – Kleidung, Körperhaltung, Mimik. Praxis-Tipps aus dem Wiener Studio.",
    tags: ["Business", "Portrait", "Tipps", "Wien"],
    pillarPath: "/business-portrait-wien/",
    pillarLabel: "Business Portrait Wien",
    siblingSlug: pickSibling(BUSINESS_SIBLINGS, "business-portrait-tipps"),
    siblingLabel: labelFromSlug(pickSibling(BUSINESS_SIBLINGS, "business-portrait-tipps")),
    intro:
      "Ein gutes Business-Portrait verkauft. Nicht dich als Person – aber das **Vertrauen**, das Kunden in dich haben sollen. Hier die Tipps, die wir im Studio Wien umsetzen.",
    sections: [
      {
        h2: "Kleidung",
        body: "Einfarbig, gut sitzend, gebügelt. Keine auffälligen Logos, keine knalligen Farben. Die Betrachtung soll auf deinem **Gesicht** landen, nicht auf dem Hemd.",
      },
      {
        h2: "Mimik",
        body: "Kein „Model-Grinsen". Ein leichtes, echtes Lächeln wirkt kompetent. Wir trainieren das im Shooting durch Gespräche – nicht durch Befehle.",
      },
      {
        h2: "Hintergrund",
        body: "Neutraler Studio-Hintergrund (Weiß, Grau, Anthrazit) oder cleaner Office-Look. Weniger ist mehr.",
      },
    ],
  },
  {
    slug: "linkedin-fotos-wien",
    title: "LinkedIn Foto Wien: Worauf es wirklich ankommt",
    seoTitle: "LinkedIn Foto Wien – Professionelles Profilbild vom Fotografen",
    metaDescription:
      "LinkedIn Foto in Wien machen lassen: Was ein gutes Profilbild ausmacht, welche Fehler die meisten machen und wie du sofort mehr Vertrauen wirkst.",
    excerpt:
      "Dein LinkedIn-Bild entscheidet über den ersten Eindruck. Hier, was funktioniert – und was du unbedingt vermeiden solltest.",
    tags: ["LinkedIn", "Business", "Portrait", "Wien"],
    pillarPath: "/business-portrait-wien/",
    pillarLabel: "Business Portrait Wien",
    siblingSlug: pickSibling(BUSINESS_SIBLINGS, "linkedin-fotos-wien"),
    siblingLabel: labelFromSlug(pickSibling(BUSINESS_SIBLINGS, "linkedin-fotos-wien")),
    intro:
      "Dein **LinkedIn-Profilbild** entscheidet in Sekunden, ob Kunden oder Arbeitgeber dich ernst nehmen. Ein gutes Foto ist hier kein Luxus – es ist Business-Infrastruktur.",
    sections: [
      {
        h2: "Was ein gutes LinkedIn-Foto auszeichnet",
        body: "- Klarer Blick in die Kamera\n- Schultern leicht zur Kamera\n- Natürliches Lächeln\n- Neutraler Hintergrund\n- Aktuelles Alter (kein Foto von vor 10 Jahren)",
      },
      {
        h2: "Typische Fehler",
        body: "Urlaubsbilder mit abgeschnittenem Partner. Selfies im Auto. Handybilder mit Blitz. Das alles **kostet dich Vertrauen** – auch wenn du es nicht merkst.",
      },
      {
        h2: "So läuft es bei uns",
        body: "15–30 Minuten Shooting in Wien 1050. Du bekommst mehrere Varianten – oft reicht **1 LinkedIn-Foto für 3 Jahre**. Rentabel.",
      },
    ],
  },
  {
    slug: "was-macht-ein-gutes-businessfoto",
    title: "Was macht ein gutes Businessfoto aus? 5 Kriterien",
    seoTitle: "Gutes Businessfoto – 5 Kriterien, die den Unterschied machen",
    metaDescription:
      "Was ein gutes Businessfoto wirklich ausmacht: 5 Kriterien vom Wiener Fotostudio. Für LinkedIn, Website, Bewerbung und mehr.",
    excerpt:
      "Nicht jedes Businessfoto wirkt. Diese 5 Kriterien trennen gute von mittelmäßigen Porträts.",
    tags: ["Business", "Portrait", "Kriterien", "Wien"],
    pillarPath: "/business-portrait-wien/",
    pillarLabel: "Business Portrait Wien",
    siblingSlug: pickSibling(BUSINESS_SIBLINGS, "was-macht-ein-gutes-businessfoto"),
    siblingLabel: labelFromSlug(pickSibling(BUSINESS_SIBLINGS, "was-macht-ein-gutes-businessfoto")),
    intro:
      "Alle Business-Fotos sind gleich? Nein. Diese **5 Kriterien** trennen Profi-Ergebnisse von Handy-Selfies.",
    sections: [
      {
        h2: "1. Augen-Schärfe",
        body: "Die Schärfe muss exakt auf den Augen liegen. Alles andere wirkt unscharf, egal wie gut der Rest ist.",
      },
      {
        h2: "2. Lichtführung",
        body: "Weiches Licht von leicht oben schmeichelt den Gesichtszügen. Hartes Licht lässt dich älter und müder wirken.",
      },
      {
        h2: "3. Körperhaltung",
        body: "Schultern leicht zur Kamera gedreht = offen, kompetent. Schultern frontal = Passfoto-Eindruck.",
      },
      {
        h2: "4. Mimik",
        body: "Echtes, ruhiges Lächeln. Keine Zähne unter Zwang.",
      },
      {
        h2: "5. Bearbeitung",
        body: "Natürliche Retusche. Keine Plastik-Haut, keine Hollywood-Zähne.",
      },
    ],
  },
  {
    slug: "mitarbeiterfotos-wien",
    title: "Mitarbeiterfotos in Wien: Einheitlicher Team-Look für die Website",
    seoTitle: "Mitarbeiterfotos Wien – Einheitliche Teamfotos fürs Unternehmen",
    metaDescription:
      "Mitarbeiterfotos in Wien: Einheitliche Team-Porträts für Website und LinkedIn. Studio in Wien 1050, flexibel für Unternehmen jeder Größe.",
    excerpt:
      "So bekommt dein Team einen professionellen, einheitlichen Look – egal ob 5 oder 50 Personen.",
    tags: ["Business", "Mitarbeiter", "Team", "Wien"],
    pillarPath: "/business-portrait-wien/",
    pillarLabel: "Business Portrait Wien",
    siblingSlug: pickSibling(BUSINESS_SIBLINGS, "mitarbeiterfotos-wien"),
    siblingLabel: labelFromSlug(pickSibling(BUSINESS_SIBLINGS, "mitarbeiterfotos-wien")),
    intro:
      "Wenn **alle Mitarbeiter** ein einheitliches Foto auf der Website haben, wirkt das Unternehmen sofort professioneller. So planen wir das in Wien.",
    sections: [
      {
        h2: "Einheitlicher Look",
        body: "Gleicher Hintergrund, gleiche Lichtsetzung, gleiche Bearbeitung. Jeder Mitarbeiter kommt einzeln durchs Studio – Ablauf pro Person **10–15 Minuten**.",
      },
      {
        h2: "Flexibel für Teamgrößen",
        body: "Ob 5 Personen an einem Nachmittag oder 50 Personen verteilt auf 2 Tage – wir strukturieren das so, dass der Betriebsablauf nicht leidet.",
      },
      {
        h2: "Wiederholungs-Shootings",
        body: "Wir dokumentieren Setup und Bearbeitung. Neue Mitarbeiter bekommen **denselben Look**, auch Monate später.",
      },
    ],
  },
  {
    slug: "personal-branding-fotografie",
    title: "Personal Branding Fotografie: Wenn Business-Fotos Marke werden",
    seoTitle: "Personal Branding Fotografie Wien – Business-Bilder mit Persönlichkeit",
    metaDescription:
      "Personal Branding Fotografie in Wien: mehr als ein Headshot. Bilder, die deine Marke, deinen Stil und deine Arbeit sichtbar machen.",
    excerpt:
      "Für Selbstständige und Solo-Unternehmer: Bilder, die deine Marke sichtbar machen – nicht nur dein Gesicht.",
    tags: ["Business", "Personal Branding", "Marke", "Wien"],
    pillarPath: "/business-portrait-wien/",
    pillarLabel: "Business Portrait Wien",
    siblingSlug: pickSibling(BUSINESS_SIBLINGS, "personal-branding-fotografie"),
    siblingLabel: labelFromSlug(pickSibling(BUSINESS_SIBLINGS, "personal-branding-fotografie")),
    intro:
      "Ein klassisches Business-Portrait reicht oft nicht – besonders für **Selbstständige, Coaches, Creator**. Personal Branding Fotografie geht weiter.",
    sections: [
      {
        h2: "Mehr als ein Headshot",
        body: "Personal Branding = Porträt + Arbeitssituationen + Detail-Bilder (Hände, Laptop, Notizen, Raum). Ergibt ein **Bildpaket** für Website, Social Media, Presse.",
      },
      {
        h2: "Vorbereitung: Story first",
        body: "Wir klären zuerst: Was ist deine Marke? Welche Themen willst du bespielen? Danach richten wir das Shooting aus – nicht umgekehrt.",
      },
      {
        h2: "Liefer-Paket",
        body: "Typisch: 30–60 bearbeitete Bilder in verschiedenen Formaten, quer/hoch/quadratisch für Social Media. Reicht oft für **ein ganzes Jahr Content**.",
      },
    ],
  },
];

async function run() {
  console.log(`Seeding ${drafts.length} blog drafts…`);
  let created = 0;
  let skipped = 0;
  for (const d of drafts) {
    try {
      const existing = await db
        .select({ id: blogPosts.id })
        .from(blogPosts)
        .where(eq(blogPosts.slug, d.slug))
        .limit(1);
      if (existing.length > 0) {
        console.log(`  ↷ skip (exists): ${d.slug}`);
        skipped++;
        continue;
      }
      const content = buildContent(d);
      await db.insert(blogPosts).values({
        title: d.title,
        slug: d.slug,
        content,
        excerpt: d.excerpt,
        tags: d.tags,
        status: "DRAFT",
        published: false,
        seoTitle: d.seoTitle,
        metaDescription: d.metaDescription,
      });
      console.log(`  ✓ created: ${d.slug}`);
      created++;
    } catch (err) {
      console.error(`  ✗ failed: ${d.slug}`, err);
    }
  }
  console.log(`\nDone. Created: ${created}, Skipped: ${skipped}, Total: ${drafts.length}`);
  process.exit(0);
}

run().catch((err) => {
  console.error("Fatal seeding error:", err);
  process.exit(1);
});
