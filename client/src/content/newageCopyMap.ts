// newageCopyMap.ts
// Content map for service pages with SEO metadata and markdown copy
// H1 headings in markdown will be converted to H2 by MarkdownCopySlot

export interface ServicePageCopy {
  title: string;
  metaDescription: string;
  h1: string;
  markdown: string;
}

const withSeoExpansion = (base: string, expansion: string) => {
  const trimmedBase = base.trim();
  // Temporarily disable expansion to fix build
  return trimmedBase;
};

// Systematic, low-risk content expansion blocks.
// Inserted only through MarkdownCopySlot (no layout changes).
const seoExpansion = {
  bewerbungsfotosIhr: `## Wien‑Tipp: Location & Anfahrt
Für Bewerbungsfotos und LinkedIn‑Portraits ist **Studio** meist die beste Wahl: kontrolliertes Licht, neutraler Hintergrund und kein Wetter‑Risiko. Wenn du Outdoor‑Bilder willst, eignen sich ruhige, helle Spots in Wien wie **Stadtpark‑Randwege**, **MuseumsQuartier (seitliche Durchgänge)** oder **Belvedere‑Umfeld** (unter der Woche vormittags).

## Outfit‑ & Farbguide (schnell)
- **Einfarbig schlägt Muster:** keine großen Logos, keine engen Streifen.
- **3 sichere Farben:** Navy, Beige, Dunkelgrün.
- **Kragen/Blazer check:** sitzt der Kragen sauber? Falten kurz glätten.
- **Brille?** Bring sie mit – wir machen Varianten mit/ohne.

## FAQ (erweitert)
**Welche Bildformate bekomme ich?**  
Du erhältst High‑Res für Print und optimierte Web‑Varianten (z. B. LinkedIn‑Upload).

**Kann ich mehrere Looks fotografieren?**  
Ja – ideal sind 2–3 Outfits (seriös, modern, casual‑business).

**Wie schnell ist die Lieferung?**  
In der Regel kurzfristig nach Auswahl und Retusche; wenn es eilig ist, sag’s bitte beim Buchen.

**Hilft ihr beim Posing?**  
Ja – wir führen dich Schritt für Schritt (Haltung, Hände, Ausdruck).

**Was, wenn ich kamerascheu bin?**  
Das ist normal. Wir arbeiten ruhig, zeigen Zwischenergebnisse und steigern uns in kleinen Schritten.`,

  businessSie: `## Wien‑Tipp: Bildsprache, die in Wien funktioniert
Für Business‑Portraits zählt in der Praxis: **klar, ruhig, hochwertig**. In Wien wirken helle Hintergründe oft moderner, dunkle Hintergründe eher klassisch/seriös. Wenn Sie zusätzlich Outdoor‑Varianten wünschen, empfehlen sich ruhige Locations mit „Business‑Vibe“ wie **Donaukanal‑Abschnitte ohne Touristen‑Spots**, **Karlsplatz‑Nebenwege** oder **moderne Fassaden** (z. B. in der Nähe großer Bürogebäude) – am besten **vormittags**.

## Vorbereitung (10 Minuten, großer Effekt)
- Kleidung 1–2 Tage vorher anprobieren (Kragen, Ärmel, Sitz am Rücken)
- Matte/neutral gepflegte Haut (kein stark glänzendes Produkt direkt vor dem Shooting)
- Accessoires reduzieren (Uhr/Schmuck: ja – aber dezent)

## FAQ (erweitert)
**Sind die Bilder für Website/PR nutzbar?**  
Ja – wir liefern Dateien, die sich für professionelle Außendarstellung eignen. Details zu Nutzungsumfang gern im Briefing.

**Können wir ein wiederholbares Setup für Mitarbeiter:innen aufsetzen?**  
Ja – ideal für Team‑Erweiterungen und konsistente Bildsprache.

**Gibt es Varianten für LinkedIn (Quadrat) und Website (Querformat)?**  
Ja – wir planen Crops/Varianten direkt mit.

**Wie läuft die Auswahl ab?**  
Entweder noch am selben Tag (wenn es zeitlich passt) oder bequem per Online‑Galerie.

**Wie stark ist die Retusche?**  
Natürlich. Ziel ist ein frischer, professioneller Look – ohne „Plastik“.`,

  neugeboreneIhr: `## Wien‑Tipp: Timing & entspannte Anreise
Für Neugeborenenfotos ist der ideale Zeitraum oft **Tag 5–14** (viel Schlaf, kuscheliges Einrollen). Plan bitte **mehr Pufferzeit** für Anreise, Stillen/Fläschchen und Pausen ein – wir fotografieren ohne Hektik.

## Was euch im Studio hilft
- Warmes, ruhiges Setup (Baby‑Komfort zuerst)
- Pausen jederzeit möglich (Wickeln, Stillen, Beruhigen)
- Neutrale, zeitlose Farben wirken in Prints besonders schön

## FAQ (erweitert)
**Was, wenn unser Baby nicht schlafen will?**  
Kein Problem – wache Bilder sind wunderschön. Wir passen Sets an.

**Wie lange dauert ein Newborn‑Shooting wirklich?**  
Reine Fotozeit ist kurz, aber mit Pausen planen wir entspannt.

**Dürfen Geschwister und Eltern mit aufs Bild?**  
Ja – sehr gern. Wir machen Familien‑Varianten und Einzelsets.

**Ist das Posing sicher?**  
Ja. Wir arbeiten nur mit sicheren, natürlichen Positionen – ohne riskante „Kunst‑Posen“.

**Welche Kleidung ist ideal?**  
Neutrale Oberteile für Eltern (ohne Logos) und einfache Bodies/Decken für das Baby.`,

  eventIhr: `## Wien‑Tipp: Licht, Ablauf & „unauffällig präsent“
Bei Events in Wien ist das Wichtigste: Wir fangen Momente ein, **ohne den Ablauf zu stören**. Für Indoor‑Locations stimmen wir Licht/Blitz so ab, dass es professionell aussieht, aber nicht „stroboskopartig“ wirkt.

## Was ihr vorab klären solltet
- Ablaufplan (Programmpunkte, Keynote‑Zeiten, Gruppenfoto‑Slot)
- Branding‑Motive (Roll‑ups, Bühne, Sponsor‑Wand)
- Wunschliste: 10 „Must‑Have“ Motive (Speaker, Networking, Stimmung)

## FAQ (erweitert)
**Fotografiert ihr auch Gruppen/Teamfotos am Event?**  
Ja – wir planen einen kurzen Slot, damit es schnell geht.

**Wie schnell bekommen wir die Bilder?**  
Je nach Umfang; auf Wunsch können wir eine kleine Auswahl („Highlights“) priorisieren.

**Gibt es Nutzungsrechte für PR/Social?**  
Ja – wir liefern Dateien für Social/PR, Details nach Bedarf.

**Arbeitet ihr unauffällig?**  
Ja – dokumentarisch, mit Blick für echte Momente.

**Könnt ihr auch einheitliche Portraits der Speaker machen?**  
Ja – wenn Raum/Timing passt, setzen wir ein kleines Setup.`,

  hochzeitIhr: `## Wien‑Tipp: Foto‑Timing für Hochzeiten
Für entspannte Paarportraits empfehlen wir in Wien oft **kurze Slots** statt „1 Stunde am Stück“ – z. B. 15 Minuten nach der Trauung und 15 Minuten bei goldenem Abendlicht. Das hält den Tag locker.

## Planung, die Stress spart
- Gruppenfoto‑Liste (Familie/Trauzeugen) vorab fixieren
- 1 „Regie‑Person“ bestimmen, die Leute kurz sammelt
- Bei Standesamt‑Locations: früh da sein, damit wir Blickwinkel checken können

## FAQ (erweitert)
**Wir sind unsicher vor der Kamera – hilft ihr?**  
Ja. Wir führen euch ruhig an, ohne steife Posen.

**Fotografiert ihr auch Familie & Details (Ringe, Deko)?**  
Ja – Reportage + Details gehören dazu.

**Was passiert bei Regen?**  
Wir haben Indoor‑Ideen und nutzen überdachte Spots; Regen kann sogar sehr schön wirken.

**Wie bekommt man natürliche Gruppenfotos?**  
Kurz, klar, freundlich angeleitet – und dann schnell zurück zur Feier.

**Wie erfolgt die Lieferung?**  
Über eine private, passwortgeschützte Online‑Galerie.`,

  immobilienIhr: `## Wien‑Tipp: Was Immobilienbilder in Wien leisten müssen
In Wien entscheidet häufig der **erste Eindruck online**. Gute Immobilienfotos brauchen saubere Linien, echtes Raumgefühl und Licht, das Räume größer wirken lässt – ohne „überdreht“.

## Vorbereitung (kurz, aber wichtig)
- Flächen freiräumen (Arbeitsplatten, Bad‑Ablagen)
- Lichtquellen einschalten (wärmeres, einheitliches Licht)
- Kissen/Decken glätten, Kabel verstecken

## FAQ (erweitert)
**Wie lange dauert ein Termin?**  
Je nach Größe; wir arbeiten effizient, planen aber genug Zeit für saubere Perspektiven ein.

**Fotografiert ihr auch Details?**  
Ja – hochwertige Details steigern Wertigkeit.

**Können die Bilder sofort online genutzt werden?**  
Ja – wir liefern Web‑optimierte Dateien.

**Macht ihr auch Außenaufnahmen?**  
Ja – Fassade, Umgebung und ggf. Innenhof gehören dazu.

**Wie vermeidet ihr schiefe Linien?**  
Mit sauberer Ausrichtung und passenden Brennweiten (kein „Fisheye‑Look“).`,

  portraitIhr: `## Wien‑Tipp: Portraits, die nicht „gestellt“ aussehen
Wiener Portraits wirken besonders gut, wenn wir eine Mischung aus **klaren Studio‑Portraits** und – wenn gewünscht – **ruhigen Outdoor‑Varianten** machen. Outdoor empfehlen wir eher **Nebenwege** statt Hotspots, damit du dich wohlfühlst.

## Styling‑Tipps
- Einfarbige Kleidung, die „du“ ist
- Zwei Looks reichen meist (hell + dunkel)
- Kleine Accessoires sind okay – solange sie nicht vom Gesicht ablenken

## FAQ (erweitert)
**Kann ich Portraits für mehrere Zwecke nutzen?**  
Ja – privat, Social, Portfolio. Sag uns den Zweck, dann planen wir Bildsprache und Crops.

**Wie finde ich meinen Ausdruck?**  
Mit Micro‑Anleitung (Atmung, Blick, Kopfhaltung) – ohne Druck.

**Wie lange dauert das?**  
Meist ca. 60 Minuten, je nach Looks.

**Sind Schwarz‑Weiß‑Varianten möglich?**  
Ja – wenn es zum Stil passt, liefern wir gern Varianten.

**Kann ich eigene Ideen/Referenzen mitbringen?**  
Sehr gern – 3–5 Beispielbilder helfen uns enorm.`,

  produktIhr: `## Wien‑Tipp: Welche Produktbilder wirklich verkaufen
Für E‑Commerce zählen **Klarheit, Konsistenz und Details**. In Wien arbeiten viele Shops mit Freistellern + 1–2 Lifestyle‑Bildern – die Mischung konvertiert oft am besten.

## Vorbereitung für effiziente Produktfotografie
- Produkte sauber/staubfrei, Etiketten gerade
- Varianten vorab sortieren (Farben/Größen)
- Wenn es „Premium“ wirken soll: Props/Moodboard kurz abstimmen

## FAQ (erweitert)
**Freisteller oder Lifestyle – was ist besser?**  
Beides: Freisteller für Shop‑Konsistenz, Lifestyle für Emotion & Anwendung.

**Welche Dateiformate liefert ihr?**  
JPG/PNG für Web, auf Wunsch High‑Res für Print.

**Könnt ihr Amazon‑Standards berücksichtigen?**  
Ja – Hintergrund, Zuschnitt, Auflösung nach Vorgaben.

**Wie viele Produkte schafft man pro Termin?**  
Hängt von Komplexität/Setups ab; wir planen es vorher realistisch.

**Retuschiert ihr Staub/Kratzer?**  
Ja – innerhalb eines natürlichen, sauberen Looks.`,

  babyIhr: `## Wien‑Tipp: Baby‑Shooting ohne Stress
Für Babyfotos (3–12 Monate) lohnt es sich, den Termin rund um **Schlaf‑ und Essenszeiten** zu legen. Gute Laune schlägt jedes „perfekte“ Timing – wir planen flexibel.

## Was ihr mitbringen könnt
- Lieblingsspielzeug (vertraut = entspannter)
- 1–2 Outfits (weich, ohne große Logos)
- Snacks/Fläschchen (je nach Alter)

## FAQ (erweitert)
**Was, wenn unser Baby nicht mitmacht?**  
Völlig normal – wir wechseln Sets, machen Pausen und arbeiten spielerisch.

**Dürfen Eltern/Geschwister mit aufs Bild?**  
Ja – wir machen gern Varianten als Familie.

**Ist das Studio baby‑safe?**  
Ja – wir achten auf sichere Setups und kurze, angenehme Sets.

**Wie entstehen echte Lacher?**  
Mit Spiel, Geräuschen und kurzen Interaktionen – ohne Überforderung.

**Wann bekommen wir die Bilder?**  
Auswahl je nach Terminlage, final nach Retusche über die Cloud.`,

  teamIhr: `## Wien‑Tipp: Konsistenz schlägt „Einzel‑Perfektion“
Bei Teamfotos in Wien ist das Ziel meist: **einheitlicher Look**, der Vertrauen schafft. Dafür setzen wir ein wiederholbares Licht‑ und Hintergrund‑Setup – so passen neue Mitarbeiter:innen später nahtlos dazu.

## Vorbereitung für Teams
- Dresscode kurz definieren (z. B. Smart Casual, einfarbige Oberteile)
- 5 Minuten pro Person reichen oft, wenn Setup steht
- Ein Ansprechpartner koordiniert Reihenfolge/Check‑in

## FAQ (erweitert)
**Können neue Teammitglieder später nachfotografiert werden?**  
Ja – genau dafür ist ein standardisiertes Setup ideal.

**Bekommt jede Person mehrere Varianten?**  
Ja – meist freundlich/offen + seriöser.

**Welche Hintergründe sind möglich?**  
Neutral hell/dunkel/grau – passend zur Marke.

**Gibt es Crops für Website/LinkedIn?**  
Ja – wir liefern passende Varianten.

**Wie organisiert ihr die Auswahl?**  
Entweder pro Person oder zentral über Galerie/Shortlist.`,

  schwangerschaftIhr: `## Wien‑Tipp: Outdoor oder Studio?
Wenn du es elegant und wetter‑sicher willst: **Studio**. Für einen natürlichen Look sind ruhige Spots in Wien perfekt – ideal ist **goldenes Licht** am späten Nachmittag. Wir planen so, dass du dich wohlfühlst (Pausen, Wasser, kurze Sets).

## Saison‑ & Timing‑Tipps
- Viele Kundinnen fühlen sich zwischen **Woche 28–34** am wohlsten.
- Im Winter: Studio‑Look wirkt zeitlos und warm.
- Im Sommer: lieber früher/später am Tag (angenehmer, weicheres Licht).

## FAQ (erweitert)
**Kann mein Partner mitkommen?**  
Ja – wir machen Paar‑Varianten und Solo‑Portraits.

**Was ziehe ich an?**  
2–3 Outfits (eng, fließend, elegant). Neutrale Töne funktionieren immer.

**Darf ich Requisiten mitbringen?**  
Ja – Ultraschallbild, Babyschuhe, kleines Accessoire.

**Wie lange dauert das Shooting?**  
Meist ca. 60 Minuten, mit Pausen.

**Gibt es später auch Newborn‑Fotos?**  
Ja – viele kombinieren Babybauch + Neugeborene für eine schöne Story.`,

  studioIhr: `## Wien‑Tipp: Warum Studio‑Fotos oft schneller „premium“ wirken
Im Studio kontrollieren wir Licht und Hintergrund komplett – das macht Bilder **zeitlos** und sorgt für einen konsistenten Look. Gerade in Wien (wechselhaftes Wetter) ist das oft die stressfreieste Option.

## Für wen Studio‑Fotografie ideal ist
- Familien (Kinder können schnell wechseln/pausieren)
- Business‑Portraits (klarer, professioneller Stil)
- Portraits, die „clean“ und hochwertig wirken sollen

## FAQ (erweitert)
**Kann man im Studio auch verschiedene Hintergründe fotografieren?**  
Ja – je nach Set wechseln wir schnell.

**Ist es im Studio angenehm (Temperatur, Pausen)?**  
Ja – wir planen entspannt und haben Getränke vor Ort.

**Wie wird ausgewählt?**  
Wenn es zeitlich passt am selben Tag, sonst per Online‑Galerie.

**Kann ich Props mitbringen?**  
Sehr gern – solange sie zur Bildidee passen.

**Gibt es auch quadratische Crops für Social?**  
Ja – wir liefern passende Varianten.`
} as const;

export const newageCopyMap: Record<string, ServicePageCopy> = {
  'bewerbungsfotos-wien': {
    title: 'Bewerbungsfotos & LinkedIn Fotos Wien ab €89',
    metaDescription: 'Professionelle Bewerbungsfotos & LinkedIn Portraits in Wien. Weiches Studio-Licht, freundliche Anleitung, schnelle Lieferung. Verschiedene Looks, digitale Dateien – jetzt Termin buchen!',
    h1: 'Bewerbungsfotos & LinkedIn-Portraits in Wien – Professionell & Sympathisch',
    markdown: withSeoExpansion(`## Was ihr erwarten könnt
- **Freundliche Anleitung** statt Unsicherheit vor der Kamera
- **Weiches, professionelles Licht** (Octa‑Softboxen) für natürliche Hauttöne
- **Persönlichkeit im Bild:** Bringt gern persönliche Dinge mit: Spielzeug, Hobbys, Instrumente, Lieblingsbuch – das macht eure Bilder einzigartig.
- **Flexibel mit Menschen & Tieren:** Haustiere sind willkommen – gebt uns kurz vorher Bescheid, dann planen wir eine kleine „Pet-Pause" ein.

## Pakete & Optionen
| Paket | Ideal für | Inklusive |
|---|---|---|
| **Classic** | 1–2 Motive | Shooting (ca. 60 Min.) · Auswahl · professionelle Retusche · digitale Lieferung |
| **Plus** | mehrere Looks / Nutzung für Website + LinkedIn | mehr Motive · Varianten (quer/hoch) · konsistenter Look |
| **Team Add-on** | Mitarbeiter-Set | wiederholbares Setup · einheitliche Bildsprache · effiziente Reihenfolge |

## Look & Wirkung
Für Bewerbungs- und LinkedIn-Fotos geht es um Klarheit: Kompetenz, Nahbarkeit, Professionalität. Wir fotografieren Varianten:
- freundlich & offen (ideal für LinkedIn)
- klassisch-seriös (Bewerbung/HR)
- modern & dynamisch (Startups/Creative)

## Ablauf – so läuft euer Shooting
1. **Kurzbriefing:** wer kommt, welche Kombinationen sind wichtig, welche Stimmung wollt ihr?
2. **Ankommen & Outfit-Check:** wir stimmen Farben ab und geben Mini‑Tipps.
3. **Shooting mit Anleitung:** Gesamtmotiv, Teilgruppen, Einzelportraits – locker geführt.
4. **Auswahl:** Wenn es zeitlich passt, zeigen wir häufig noch am selben Tag eine Auswahl (IPS). Wenn es der letzte Termin ist, kommt die Auswahl bequem online.
5. **Retusche & Lieferung:** Die fertigen Bilder liefern wir immer über eine private, passwortgeschützte Online-Galerie aus der Cloud.

## Mini‑FAQ
**Wie lange dauert das Shooting?**
Meist ca. 60 Minuten – mit genug Zeit für die wichtigsten Motive.

**Dürfen Haustiere mit?**
Ja. Kurz vorher Bescheid geben, dann planen wir entspannt.

**Wann bekommen wir die Bilder?**
Auswahl je nach Terminlage schnell; final nach Retusche bequem über die Cloud.`, seoExpansion.bewerbungsfotosIhr)
  },

  'business-portrait-wien': {
    title: 'Business Portraits Wien | New Age Fotografie',
    metaDescription: 'Professionelle Business Portraits & Corporate Headshots in Wien. Ruhig, professionell, auf den Punkt – für LinkedIn, Website & Geschäftsberichte. Im Studio oder vor Ort – jetzt Termin buchen!',
    h1: 'Business-Portraits & Corporate-Fotografie in Wien – Vertrauen im Bild',
    markdown: withSeoExpansion(`## Was ihr erwarten könnt\n- **Freundliche Anleitung** statt Unsicherheit vor der Kamera\n- **Weiches, professionelles Licht** (Octa-Softboxen) für natürliche Hauttöne\n- **Persönlichkeit im Bild:** Bringen Sie gern 2–3 Outfits mit (Business/Smart Casual) und – wenn relevant – Arbeitsmaterial (Laptop, Headset, Werkzeug, Produktmuster).\n- **Flexibel mit Menschen & Tieren:** Haustiere sind willkommen – gebt uns kurz vorher Bescheid, dann planen wir eine kleine „Pet-Pause" ein.\n\n## Pakete & Optionen\n| Paket | Ideal für | Inklusive |\n|---|---|---|\n| **Classic** | 1–2 Motive | Shooting (ca. 60 Min.) · Auswahl · professionelle Retusche · digitale Lieferung |\n| **Plus** | mehrere Looks / Nutzung für Website + LinkedIn | mehr Motive · Varianten (quer/hoch) · konsistenter Look |\n| **Team Add-on** | Mitarbeiter-Set | wiederholbares Setup · einheitliche Bildsprache · effiziente Reihenfolge |\n\n## Ablauf – so läuft es bei uns\n1. **Kurzbriefing:** Ziel, Einsatz (Website/LinkedIn/Print), gewünschter Stil.\n2. **Ankommen & Outfit-Check:** Farben, Stoffe, Kragen, Details – wir optimieren schnell.\n3. **Shooting mit Anleitung:** klare Posen, kleine Mikro-Bewegungen, natürliche Mimik.\n4. **Auswahl:** Wenn es zeitlich passt, zeigen wir häufig noch am selben Tag eine Auswahl (IPS). Wenn es der letzte Termin ist, kommt die Auswahl bequem online.\n5. **Retusche & Lieferung:** Die fertigen Bilder liefern wir immer über eine private, passwortgeschützte Online-Galerie aus der Cloud.\n\n## Mini-FAQ\n**Wie lange dauert ein Shooting?**\nIn der Regel ca. 60 Minuten – effizient geplant.\n\n**Bietet ihr Make-up an?**\nNein. Bitte vorbereitet kommen. Unser Licht ist sehr schmeichelnd.\n\n**Wann bekomme ich die Bilder?**\nJe nach Paket/Retusche – Auswahl meist schnell, final nach Retusche über die Cloud.`, seoExpansion.businessSie)
  },

  'schul-und-hochschulfotografie-wien': {
    title: 'Schulfotografie Wien | New Age Fotografie',
    metaDescription: 'Schul-, Hochschul- & Universitätsfotografie in Wien: Klassenfotos, Schulportraits, Matura- & Sponsionsfotos. Mobiles Studio vor Ort, DSGVO-konform, private Galerie je Familie. Jetzt anfragen!',
    h1: 'Schul-, Hochschul- & Universitätsfotografie in Wien',
    markdown: `## Ein Fotograf für den ganzen Bildungsweg\n- **Klassenfotos & Schulportraits** – organisiert, zügig und mit freundlicher Anleitung, damit sich jedes Kind wohlfühlt.\n- **Matura- & Abschlussfotos** – Jahrgangsbilder, Portraits mit Talar und kreative Gruppenshootings, rechtzeitig vor der Feier geliefert.\n- **Sponsion & Universität** – Einzel- und Familienportraits zur Feier, Fakultäts- und Institutsteams, im Studio oder direkt am Campus.\n\n## So läuft der Fototag ab\n1. **Anfrage:** Sie nennen Schule bzw. Hochschule, Klassen-/Gruppenanzahl und Wunschtermin.\n2. **Planung:** Wir fixieren Zeitplan, Ablauf und stellen DSGVO-konforme Einverständnisformulare bereit.\n3. **Fototag:** Unser mobiles Studio kommt zu Ihnen – schnell, freundlich und organisiert.\n4. **Galerie:** Jede Familie erhält einen privaten, passwortgeschützten Galerielink.\n5. **Lieferung:** Freie Bestellung ohne Kaufzwang, schnelle Ausarbeitung.\n\n## Häufige Fragen\n**Kommen Sie in unsere Schule?**\nJa – wir bringen ein mobiles Studio mit und fotografieren vor Ort in Wien und Umgebung. Ein Termin im Studio in Wien 5 ist ebenfalls möglich.\n\n**Was kostet ein Shooting?**\nDer Preis richtet sich nach Klassen-/Gruppenanzahl und Umfang. Schicken Sie uns kurz Ihre Eckdaten und Sie erhalten ein individuelles Angebot.`
  },

  'neugeborenenfotos-wien': {
    title: 'Neugeborenenfotos Wien | New Age Fotografie',
    metaDescription: 'Neugeborenenfotos in Wien – sanft, sicher, natürlich. Weiches Studio-Licht für die ersten Lebenstage. Erfahrener Neugeborenenfotograf, warmes Studio. Jetzt Termin buchen!',
    h1: 'Neugeborenenfotos Wien – Zarte Bilder aus den ersten Lebenstagen',
    markdown: withSeoExpansion(`## Was ihr erwarten könnt\n- **Freundliche Anleitung** statt Unsicherheit vor der Kamera\n- **Weiches, professionelles Licht** (Octa-Softboxen) für natürliche Hauttöne\n- **Persönlichkeit im Bild:** Bringt gern persönliche Dinge mit: Spielzeug, Hobbys, Instrumente, Lieblingsbuch – das macht eure Bilder einzigartig.\n- **Flexibel mit Menschen & Tieren:** Haustiere sind willkommen – gebt uns kurz vorher Bescheid, dann planen wir eine kleine „Pet-Pause" ein.\n\n## Pakete & Optionen\n| Paket | Ideal für | Inklusive |\n|---|---|---|\n| **Basic** | ein Hauptmotiv | Shooting (ca. 60 Min.) · Auswahlgalerie · 1 retuschiertes Bild digital |\n| **Premium** | mehrere Lieblingsmotive | mehr retuschierte Bilder · Varianten · optionale Print/Leinwand-Add-ons |\n| **Deluxe** | „Alles drin" | größere Auswahl · mehr Retusche · ideal für Familien/Meilensteine |\n\n## Was ihr mitbringen solltet\n- Wickeltasche wie gewohnt (Windeln, Tücher, Schnuller/Fläschchen)\n- 1–2 neutrale Bodies/Decken, wenn ihr mögt\n- Ein kleines persönliches Item (z. B. Kuscheltier)\n\nWasser, Kaffee & Tee sind da – auf Wunsch auch Bier oder Prosecco. Make-up bieten wir nicht an – bitte kommt, wenn möglich, bereits mit Hair & Make-up. Unser Licht wirkt aber ohnehin sehr schmeichelnd.\n\n## Sicherheit & Umgang mit Neugeborenen\nBei Neugeborenen ist das Wichtigste: **Sicherheit vor allem**. Wir arbeiten ruhig, warm und ohne Hektik. Posen entstehen bei uns nicht „mit Druck", sondern mit Geduld, kleinen Handgriffen und Pausen.\n- Wir planen Zeit für Stillen/Fläschchen, Wickeln und Beruhigen ein.\n- Wir fotografieren sanft und natürlich – kein Zwang, keine riskanten Positionen.\n- Wenn euer Baby schläft: wunderbar. Wenn nicht: auch perfekt – wache Bilder sind oft die ehrlichsten.\n\n## Ablauf – so läuft euer Shooting\n1. **Kurzbriefing:** wer kommt, welche Kombinationen sind wichtig, welche Stimmung wollt ihr?\n2. **Ankommen & Outfit-Check:** wir stimmen Farben ab und geben Mini-Tipps.\n3. **Shooting mit Anleitung:** Gesamtmotiv, Teilgruppen, Einzelportraits – locker geführt.\n4. **Auswahl:** Wenn es zeitlich passt, zeigen wir häufig noch am selben Tag eine Auswahl (IPS). Wenn es der letzte Termin ist, kommt die Auswahl bequem online.\n5. **Retusche & Lieferung:** Die fertigen Bilder liefern wir immer über eine private, passwortgeschützte Online-Galerie aus der Cloud.\n\n## Mini-FAQ\n**Wie lange dauert das Shooting?**\nMeist ca. 60 Minuten – mit genug Zeit für die wichtigsten Motive.\n\n**Dürfen Haustiere mit?**\nJa. Kurz vorher Bescheid geben, dann planen wir entspannt.\n\n**Wann bekommen wir die Bilder?**\nAuswahl je nach Terminlage schnell; final nach Retusche bequem über die Cloud.`, seoExpansion.neugeboreneIhr)
  },

  'eventfotografie-wien': {
    title: 'Eventfotografie in Wien | New Age Fotografie',
    metaDescription: 'Eventfotografie in Wien – präsent sein, ohne zu stören. Dokumentarisch und mit Blick für starke Portraits. Firmenfeiern, Konferenzen, PR-Events.',
    h1: 'Eventfotografie in Wien',
    markdown: withSeoExpansion(`## Was ihr erwarten könnt
- **Freundliche Anleitung** statt Unsicherheit vor der Kamera
- **Weiches, professionelles Licht** (Octa‑Softboxen) für natürliche Hauttöne
- **Persönlichkeit im Bild:** Bringt gern persönliche Dinge mit: Spielzeug, Hobbys, Instrumente, Lieblingsbuch – das macht eure Bilder einzigartig.
- **Flexibel mit Menschen & Tieren:** Haustiere sind willkommen – gebt uns kurz vorher Bescheid, dann planen wir eine kleine „Pet-Pause" ein.

## Pakete & Optionen
| Paket | Ideal für | Inklusive |
|---|---|---|
| **Basic** | ein Hauptmotiv | Shooting (ca. 60 Min.) · Auswahlgalerie · 1 retuschiertes Bild digital |
| **Premium** | mehrere Lieblingsmotive | mehr retuschierte Bilder · Varianten · optionale Print/Leinwand-Add-ons |
| **Deluxe** | „Alles drin" | größere Auswahl · mehr Retusche · ideal für Familien/Meilensteine |

## Eventfotografie – präsent sein, ohne zu stören
Wir arbeiten unaufdringlich, dokumentarisch und trotzdem mit Blick für starke Portraits. Ideal für:
- Firmenfeiern & Awards
- Konferenzen & Vorträge
- Eröffnungen & PR-Events

## Ablauf – so läuft euer Shooting
1. **Kurzbriefing:** wer kommt, welche Kombinationen sind wichtig, welche Stimmung wollt ihr?
2. **Ankommen & Outfit-Check:** wir stimmen Farben ab und geben Mini‑Tipps.
3. **Shooting mit Anleitung:** Gesamtmotiv, Teilgruppen, Einzelportraits – locker geführt.
4. **Auswahl:** Wenn es zeitlich passt, zeigen wir häufig noch am selben Tag eine Auswahl (IPS). Wenn es der letzte Termin ist, kommt die Auswahl bequem online.
5. **Retusche & Lieferung:** Die fertigen Bilder liefern wir immer über eine private, passwortgeschützte Online-Galerie aus der Cloud.

## Mini‑FAQ
**Wie lange dauert das Shooting?**
Meist ca. 60 Minuten – mit genug Zeit für die wichtigsten Motive.

**Dürfen Haustiere mit?**
Ja. Kurz vorher Bescheid geben, dann planen wir entspannt.

**Wann bekommen wir die Bilder?**
Auswahl je nach Terminlage schnell; final nach Retusche bequem über die Cloud.`, seoExpansion.eventIhr)
  },

  'hochzeitsfotografie-wien': {
    title: 'Hochzeitsfotografie in Wien | New Age Fotografie',
    metaDescription: 'Hochzeitsfotografie in Wien – echte Momente, ungestellt aber geführt. Paarportraits, Gruppen, Familienbilder. Professionelle Hochzeitsfotos.',
    h1: 'Hochzeitsfotografie in Wien',
    markdown: withSeoExpansion(`## Was ihr erwarten könnt\n- **Freundliche Anleitung** statt Unsicherheit vor der Kamera\n- **Weiches, professionelles Licht** (Octa-Softboxen) für natürliche Hauttöne\n- **Persönlichkeit im Bild:** Bringt gern persönliche Dinge mit: Spielzeug, Hobbys, Instrumente, Lieblingsbuch – das macht eure Bilder einzigartig.\n- **Flexibel mit Menschen & Tieren:** Haustiere sind willkommen – gebt uns kurz vorher Bescheid, dann planen wir eine kleine Pet-Pause ein.\n\n## Pakete & Optionen\n| Paket | Ideal für | Inklusive |\n|---|---|---|\n| **Basic** | ein Hauptmotiv | Shooting (ca. 60 Min.) · Auswahlgalerie · 1 retuschiertes Bild digital |\n| **Premium** | mehrere Lieblingsmotive | mehr retuschierte Bilder · Varianten · optionale Print/Leinwand-Add-ons |\n| **Deluxe** | Alles drin | größere Auswahl · mehr Retusche · ideal für Familien/Meilensteine |\n\n## Hochzeiten – ungestellt, aber geführt\nWir lieben echte Momente – und wir geben genau dann Anleitung, wenn ihr sie braucht (Paarportraits, Gruppen, Familienbilder).\nWasser, Kaffee & Tee sind da – auf Wunsch auch Bier oder Prosecco. Die fertigen Bilder liefern wir immer über eine private, passwortgeschützte Online-Galerie aus der Cloud.\n\n## Ablauf – so läuft euer Shooting\n1. **Kurzbriefing:** wer kommt, welche Kombinationen sind wichtig, welche Stimmung wollt ihr?\n2. **Ankommen & Outfit-Check:** wir stimmen Farben ab und geben Mini-Tipps.\n3. **Shooting mit Anleitung:** Gesamtmotiv, Teilgruppen, Einzelportraits – locker geführt.\n4. **Auswahl:** Wenn es zeitlich passt, zeigen wir häufig noch am selben Tag eine Auswahl (IPS). Wenn es der letzte Termin ist, kommt die Auswahl bequem online.\n5. **Retusche & Lieferung:** Die fertigen Bilder liefern wir immer über eine private, passwortgeschützte Online-Galerie aus der Cloud.\n\n## Mini-FAQ\n**Wie lange dauert das Shooting?**\nMeist ca. 60 Minuten – mit genug Zeit für die wichtigsten Motive.\n\n**Dürfen Haustiere mit?**\nJa. Kurz vorher Bescheid geben, dann planen wir entspannt.\n\n**Wann bekommen wir die Bilder?**\nAuswahl je nach Terminlage schnell; final nach Retusche bequem über die Cloud.`, seoExpansion.hochzeitIhr)
  },

  'immobilien-fotografie-wien': {
    title: 'Immobilienfotografie in Wien | New Age Fotografie',
    metaDescription: 'Immobilienfotografie in Wien – Licht, Raumgefühl, saubere Perspektiven. Professionelle Immobilienfotos für Makler und Eigentümer. Jetzt anfragen!',
    h1: 'Immobilienfotografie in Wien',
    markdown: withSeoExpansion(`## Was ihr erwarten könnt
- **Freundliche Anleitung** statt Unsicherheit vor der Kamera
- **Weiches, professionelles Licht** (Octa‑Softboxen) für natürliche Hauttöne
- **Persönlichkeit im Bild:** Bringt gern persönliche Dinge mit: Spielzeug, Hobbys, Instrumente, Lieblingsbuch – das macht eure Bilder einzigartig.
- **Flexibel mit Menschen & Tieren:** Haustiere sind willkommen – gebt uns kurz vorher Bescheid, dann planen wir eine kleine „Pet-Pause" ein.

## Pakete & Optionen
| Paket | Ideal für | Inklusive |
|---|---|---|
| **Basic** | ein Hauptmotiv | Shooting (ca. 60 Min.) · Auswahlgalerie · 1 retuschiertes Bild digital |
| **Premium** | mehrere Lieblingsmotive | mehr retuschierte Bilder · Varianten · optionale Print/Leinwand-Add-ons |
| **Deluxe** | „Alles drin" | größere Auswahl · mehr Retusche · ideal für Familien/Meilensteine |

## Immobilienfotografie – was zählt wirklich
Immobilien verkaufen über Vertrauen. Gute Bilder zeigen:
- Licht, Raumgefühl, Linienführung
- saubere Perspektiven ohne „schiefe Wände"
- Details, die Wertigkeit kommunizieren

Wir liefern strukturiert, damit Makler:innen und Eigentümer:innen sofort publizieren können.

## Ablauf – so läuft euer Shooting
1. **Kurzbriefing:** wer kommt, welche Kombinationen sind wichtig, welche Stimmung wollt ihr?
2. **Ankommen & Outfit-Check:** wir stimmen Farben ab und geben Mini‑Tipps.
3. **Shooting mit Anleitung:** Gesamtmotiv, Teilgruppen, Einzelportraits – locker geführt.
4. **Auswahl:** Wenn es zeitlich passt, zeigen wir häufig noch am selben Tag eine Auswahl (IPS). Wenn es der letzte Termin ist, kommt die Auswahl bequem online.
5. **Retusche & Lieferung:** Die fertigen Bilder liefern wir immer über eine private, passwortgeschützte Online-Galerie aus der Cloud.

## Mini‑FAQ
**Wie lange dauert das Shooting?**
Meist ca. 60 Minuten – mit genug Zeit für die wichtigsten Motive.

**Dürfen Haustiere mit?**
Ja. Kurz vorher Bescheid geben, dann planen wir entspannt.

**Wann bekommen wir die Bilder?**
Auswahl je nach Terminlage schnell; final nach Retusche bequem über die Cloud.`, seoExpansion.immobilienIhr)
  },

  'portrait-fotografie-wien': {
    title: 'Portraitfotografie in Wien | New Age Fotografie',
    metaDescription: 'Portraitfotografie in Wien – Persönlichkeit statt Pose. Ehrliche Portraits mit weichem Studio-Licht. Professionelle Portraitfotos. Jetzt Termin buchen!',
    h1: 'Portraitfotografie in Wien',
    markdown: withSeoExpansion(`## Was ihr erwarten könnt
- **Freundliche Anleitung** statt Unsicherheit vor der Kamera
- **Weiches, professionelles Licht** (Octa‑Softboxen) für natürliche Hauttöne
- **Persönlichkeit im Bild:** Bringt gern persönliche Dinge mit: Spielzeug, Hobbys, Instrumente, Lieblingsbuch – das macht eure Bilder einzigartig.
- **Flexibel mit Menschen & Tieren:** Haustiere sind willkommen – gebt uns kurz vorher Bescheid, dann planen wir eine kleine „Pet-Pause" ein.

## Pakete & Optionen
| Paket | Ideal für | Inklusive |
|---|---|---|
| **Basic** | ein Hauptmotiv | Shooting (ca. 60 Min.) · Auswahlgalerie · 1 retuschiertes Bild digital |
| **Premium** | mehrere Lieblingsmotive | mehr retuschierte Bilder · Varianten · optionale Print/Leinwand-Add-ons |
| **Deluxe** | „Alles drin" | größere Auswahl · mehr Retusche · ideal für Familien/Meilensteine |

## Portraitfotografie – Persönlichkeit statt Pose
Ein gutes Portrait ist nicht „perfekt". Es ist ehrlich. Wir arbeiten mit kleinen Anweisungen und Micro‑Bewegungen, damit Ausdruck entsteht – nicht ein gezwungenes Lächeln.

## Ablauf – so läuft euer Shooting
1. **Kurzbriefing:** wer kommt, welche Kombinationen sind wichtig, welche Stimmung wollt ihr?
2. **Ankommen & Outfit-Check:** wir stimmen Farben ab und geben Mini‑Tipps.
3. **Shooting mit Anleitung:** Gesamtmotiv, Teilgruppen, Einzelportraits – locker geführt.
4. **Auswahl:** Wenn es zeitlich passt, zeigen wir häufig noch am selben Tag eine Auswahl (IPS). Wenn es der letzte Termin ist, kommt die Auswahl bequem online.
5. **Retusche & Lieferung:** Die fertigen Bilder liefern wir immer über eine private, passwortgeschützte Online-Galerie aus der Cloud.

## Mini‑FAQ
**Wie lange dauert das Shooting?**
Meist ca. 60 Minuten – mit genug Zeit für die wichtigsten Motive.

**Dürfen Haustiere mit?**
Ja. Kurz vorher Bescheid geben, dann planen wir entspannt.

**Wann bekommen wir die Bilder?**
Auswahl je nach Terminlage schnell; final nach Retusche bequem über die Cloud.`, seoExpansion.portraitIhr)
  },

  'produkt-fotografie-wien': {
    title: 'Produktfotografie in Wien | New Age Fotografie',
    metaDescription: 'Produktfotografie in Wien – professionelle Produktbilder für E-Commerce, Kataloge und Marketing. Saubere Freisteller und Lifestyle-Shots.',
    h1: 'Produktfotografie in Wien',
    markdown: withSeoExpansion(`## Was ihr erwarten könnt
- **Freundliche Anleitung** statt Unsicherheit vor der Kamera
- **Weiches, professionelles Licht** (Octa‑Softboxen) für natürliche Hauttöne
- **Persönlichkeit im Bild:** Bringt gern persönliche Dinge mit: Spielzeug, Hobbys, Instrumente, Lieblingsbuch – das macht eure Bilder einzigartig.
- **Flexibel mit Menschen & Tieren:** Haustiere sind willkommen – gebt uns kurz vorher Bescheid, dann planen wir eine kleine „Pet-Pause" ein.

## Pakete & Optionen
| Paket | Ideal für | Inklusive |
|---|---|---|
| **Basic** | ein Hauptmotiv | Shooting (ca. 60 Min.) · Auswahlgalerie · 1 retuschiertes Bild digital |
| **Premium** | mehrere Lieblingsmotive | mehr retuschierte Bilder · Varianten · optionale Print/Leinwand-Add-ons |
| **Deluxe** | „Alles drin" | größere Auswahl · mehr Retusche · ideal für Familien/Meilensteine |

## Produktfotografie – Qualität, die verkauft
Gute Produktbilder zeigen mehr als nur das Produkt. Sie zeigen Wert, Qualität und Anwendung. Wir liefern:
- Saubere Freisteller für E-Commerce
- Lifestyle-Shots für Social Media
- Detail-Aufnahmen für Kataloge

## Ablauf – so läuft euer Shooting
1. **Kurzbriefing:** wer kommt, welche Kombinationen sind wichtig, welche Stimmung wollt ihr?
2. **Ankommen & Outfit-Check:** wir stimmen Farben ab und geben Mini‑Tipps.
3. **Shooting mit Anleitung:** Gesamtmotiv, Teilgruppen, Einzelportraits – locker geführt.
4. **Auswahl:** Wenn es zeitlich passt, zeigen wir häufig noch am selben Tag eine Auswahl (IPS). Wenn es der letzte Termin ist, kommt die Auswahl bequem online.
5. **Retusche & Lieferung:** Die fertigen Bilder liefern wir immer über eine private, passwortgeschützte Online-Galerie aus der Cloud.

## Mini‑FAQ
**Wie lange dauert das Shooting?**
Meist ca. 60 Minuten – mit genug Zeit für die wichtigsten Motive.

**Dürfen Haustiere mit?**
Ja. Kurz vorher Bescheid geben, dann planen wir entspannt.

**Wann bekommen wir die Bilder?**
Auswahl je nach Terminlage schnell; final nach Retusche bequem über die Cloud.`, seoExpansion.produktIhr)
  },

  'babyfotos-wien': {
    title: 'Babyfotos Wien (3–12 Monate) | New Age Fotografie',
    metaDescription: 'Babyfotos in Wien für Babys von 3–12 Monaten. Sitzen, Krabbeln, Lachen – wir fangen die Magie spielerisch und sicher ein. Professionelles Studio mit Requisiten. Jetzt Termin buchen!',
    h1: 'Babyfotos Wien (3–12 Monate) – Meilensteine spielerisch festhalten',
    markdown: withSeoExpansion(`## Was ihr erwarten könnt
- **Freundliche Anleitung** statt Unsicherheit vor der Kamera
- **Weiches, professionelles Licht** (Octa‑Softboxen) für natürliche Hauttöne
- **Persönlichkeit im Bild:** Bringt gern persönliche Dinge mit: Spielzeug, Hobbys, Instrumente, Lieblingsbuch – das macht eure Bilder einzigartig.
- **Flexibel mit Menschen & Tieren:** Haustiere sind willkommen – gebt uns kurz vorher Bescheid, dann planen wir eine kleine „Pet-Pause" ein.

## Pakete & Optionen
| Paket | Ideal für | Inklusive |
|---|---|---|
| **Basic** | ein Hauptmotiv | Shooting (ca. 60 Min.) · Auswahlgalerie · 1 retuschiertes Bild digital |
| **Premium** | mehrere Lieblingsmotive | mehr retuschierte Bilder · Varianten · optionale Print/Leinwand-Add-ons |
| **Deluxe** | „Alles drin" | größere Auswahl · mehr Retusche · ideal für Familien/Meilensteine |

## Babyfotos 3–12 Monate – worauf wir achten
In diesem Alter passiert Magie: Sitzen, Krabbeln, Lachen, erste Persönlichkeiten. Wir planen das Shooting spielerisch:
- kurze Sets, schnelle Wechsel, viele Pausen
- ein sicheres Setup im Studio
- gern mit Lieblingsspielzeug oder Musik

Bringt gern persönliche Dinge mit: Spielzeug, Hobbys, Instrumente, Lieblingsbuch – das macht eure Bilder einzigartig. Haustiere sind willkommen – gebt uns kurz vorher Bescheid, dann planen wir eine kleine „Pet-Pause" ein.

## Ablauf – so läuft euer Shooting
1. **Kurzbriefing:** wer kommt, welche Kombinationen sind wichtig, welche Stimmung wollt ihr?
2. **Ankommen & Outfit-Check:** wir stimmen Farben ab und geben Mini‑Tipps.
3. **Shooting mit Anleitung:** Gesamtmotiv, Teilgruppen, Einzelportraits – locker geführt.
4. **Auswahl:** Wenn es zeitlich passt, zeigen wir häufig noch am selben Tag eine Auswahl (IPS). Wenn es der letzte Termin ist, kommt die Auswahl bequem online.
5. **Retusche & Lieferung:** Die fertigen Bilder liefern wir immer über eine private, passwortgeschützte Online-Galerie aus der Cloud.

## Mini‑FAQ
**Wie lange dauert das Shooting?**
Meist ca. 60 Minuten – mit genug Zeit für die wichtigsten Motive.

**Dürfen Haustiere mit?**
Ja. Kurz vorher Bescheid geben, dann planen wir entspannt.

**Wann bekommen wir die Bilder?**
Auswahl je nach Terminlage schnell; final nach Retusche bequem über die Cloud.`, seoExpansion.babyIhr)
  },

  'teamfotos-wien': {
    title: 'Team- & Mitarbeiterfotos Wien | New Age Fotografie',
    metaDescription: 'Professionelle Team- & Mitarbeiterfotos in Wien. Einheitlicher Look, wiederholbares Setup für konsistente Bildsprache. Im Studio oder vor Ort – effizient geplant. Jetzt Termin buchen!',
    h1: 'Team- & Mitarbeiterfotos Wien – Einheitliche Bildsprache für Ihr Unternehmen',
    markdown: withSeoExpansion(`## Was ihr erwarten könnt
- **Freundliche Anleitung** statt Unsicherheit vor der Kamera
- **Weiches, professionelles Licht** (Octa‑Softboxen) für natürliche Hauttöne
- **Persönlichkeit im Bild:** Bringt gern persönliche Dinge mit: Spielzeug, Hobbys, Instrumente, Lieblingsbuch – das macht eure Bilder einzigartig.
- **Flexibel mit Menschen & Tieren:** Haustiere sind willkommen – gebt uns kurz vorher Bescheid, dann planen wir eine kleine „Pet-Pause" ein.

## Pakete & Optionen
| Paket | Ideal für | Inklusive |
|---|---|---|
| **Classic** | 1–2 Motive | Shooting (ca. 60 Min.) · Auswahl · professionelle Retusche · digitale Lieferung |
| **Plus** | mehrere Looks / Nutzung für Website + LinkedIn | mehr Motive · Varianten (quer/hoch) · konsistenter Look |
| **Team Add-on** | Mitarbeiter-Set | wiederholbares Setup · einheitliche Bildsprache · effiziente Reihenfolge |

## Einheitlicher Look fürs Team
Wir setzen ein wiederholbares Licht-Setup, damit:
- alle Mitarbeiter:innen im gleichen Stil fotografiert sind
- neue Teammitglieder später nahtlos ergänzt werden können
- Website, Pitchdecks und LinkedIn konsistent wirken

## Ablauf – so läuft euer Shooting
1. **Kurzbriefing:** wer kommt, welche Kombinationen sind wichtig, welche Stimmung wollt ihr?
2. **Ankommen & Outfit-Check:** wir stimmen Farben ab und geben Mini‑Tipps.
3. **Shooting mit Anleitung:** Gesamtmotiv, Teilgruppen, Einzelportraits – locker geführt.
4. **Auswahl:** Wenn es zeitlich passt, zeigen wir häufig noch am selben Tag eine Auswahl (IPS). Wenn es der letzte Termin ist, kommt die Auswahl bequem online.
5. **Retusche & Lieferung:** Die fertigen Bilder liefern wir immer über eine private, passwortgeschützte Online-Galerie aus der Cloud.

## Mini‑FAQ
**Wie lange dauert das Shooting?**
Meist ca. 60 Minuten – mit genug Zeit für die wichtigsten Motive.

**Dürfen Haustiere mit?**
Ja. Kurz vorher Bescheid geben, dann planen wir entspannt.

**Wann bekommen wir die Bilder?**
Auswahl je nach Terminlage schnell; final nach Retusche bequem über die Cloud.`, seoExpansion.teamIhr)
  },

  'schwangerschaftsfotos-wien': {
    title: 'Schwangerschaftsfotos Wien | New Age Fotografie',
    metaDescription: 'Schwangerschaftsfotos in Wien – einfühlsames Babybauch-Shooting im Studio. Weiches Licht, entspannte Atmosphäre. Ideal in Woche 28–34. Verschiedene Styles, Partner willkommen. Jetzt Termin buchen!',
    h1: 'Schwangerschaftsfotos Wien – Babybauch-Shooting voller Emotionen',
    markdown: withSeoExpansion(`## Was ihr erwarten könnt
- **Freundliche Anleitung** statt Unsicherheit vor der Kamera
- **Weiches, professionelles Licht** (Octa‑Softboxen) für natürliche Hauttöne
- **Persönlichkeit im Bild:** Bringt gern persönliche Dinge mit: Spielzeug, Hobbys, Instrumente, Lieblingsbuch – das macht eure Bilder einzigartig.
- **Flexibel mit Menschen & Tieren:** Haustiere sind willkommen – gebt uns kurz vorher Bescheid, dann planen wir eine kleine „Pet-Pause" ein.

## Pakete & Optionen
| Paket | Ideal für | Inklusive |
|---|---|---|
| **Basic** | ein Hauptmotiv | Shooting (ca. 60 Min.) · Auswahlgalerie · 1 retuschiertes Bild digital |
| **Premium** | mehrere Lieblingsmotive | mehr retuschierte Bilder · Varianten · optionale Print/Leinwand-Add-ons |
| **Deluxe** | „Alles drin" | größere Auswahl · mehr Retusche · ideal für Familien/Meilensteine |

## Schwangerschaftsfotos – Timing & Styling
Der beste Zeitraum ist oft zwischen **Woche 28–34** (Bauch schön rund, Energie meist stabil). Bringt gern:
- 2–3 Outfits (eng, fließend, elegant)
- Ultraschallbild, kleines Accessoire, Babyschuhe (wenn ihr mögt)

Make-up bieten wir nicht an – bitte kommt, wenn möglich, bereits mit Hair & Make-up. Unser Licht wirkt aber ohnehin sehr schmeichelnd. Wasser, Kaffee & Tee sind da – auf Wunsch auch Bier oder Prosecco.

## Ablauf – so läuft euer Shooting
1. **Kurzbriefing:** wer kommt, welche Kombinationen sind wichtig, welche Stimmung wollt ihr?
2. **Ankommen & Outfit-Check:** wir stimmen Farben ab und geben Mini‑Tipps.
3. **Shooting mit Anleitung:** Gesamtmotiv, Teilgruppen, Einzelportraits – locker geführt.
4. **Auswahl:** Wenn es zeitlich passt, zeigen wir häufig noch am selben Tag eine Auswahl (IPS). Wenn es der letzte Termin ist, kommt die Auswahl bequem online.
5. **Retusche & Lieferung:** Die fertigen Bilder liefern wir immer über eine private, passwortgeschützte Online-Galerie aus der Cloud.

## Mini‑FAQ
**Wie lange dauert das Shooting?**
Meist ca. 60 Minuten – mit genug Zeit für die wichtigsten Motive.

**Dürfen Haustiere mit?**
Ja. Kurz vorher Bescheid geben, dann planen wir entspannt.

**Wann bekommen wir die Bilder?**
Auswahl je nach Terminlage schnell; final nach Retusche bequem über die Cloud.`, seoExpansion.schwangerschaftIhr)
  },

  'studio-fotografie-wien': {
    title: 'Studio-Fotografie in Wien | New Age Fotografie',
    metaDescription: 'Studio-Fotografie in Wien – volle Kontrolle über Licht und Look. Zeitlose Portraits, Familien, Business. Professionelles Fotostudio. Jetzt Termin buchen!',
    h1: 'Studio-Fotografie in Wien',
    markdown: withSeoExpansion(`## Was ihr erwarten könnt
- **Freundliche Anleitung** statt Unsicherheit vor der Kamera
- **Weiches, professionelles Licht** (Octa‑Softboxen) für natürliche Hauttöne
- **Persönlichkeit im Bild:** Bringt gern persönliche Dinge mit: Spielzeug, Hobbys, Instrumente, Lieblingsbuch – das macht eure Bilder einzigartig.
- **Flexibel mit Menschen & Tieren:** Haustiere sind willkommen – gebt uns kurz vorher Bescheid, dann planen wir eine kleine „Pet-Pause" ein.

## Pakete & Optionen
| Paket | Ideal für | Inklusive |
|---|---|---|
| **Basic** | ein Hauptmotiv | Shooting (ca. 60 Min.) · Auswahlgalerie · 1 retuschiertes Bild digital |
| **Premium** | mehrere Lieblingsmotive | mehr retuschierte Bilder · Varianten · optionale Print/Leinwand-Add-ons |
| **Deluxe** | „Alles drin" | größere Auswahl · mehr Retusche · ideal für Familien/Meilensteine |

## Studio-Fotografie – volle Kontrolle über Licht und Look
Im Studio steuern wir Licht, Schatten und Hintergrund präzise. Das ist perfekt für:
- zeitlose Portraits
- Kinder & Familien
- Business-Looks mit Wiedererkennungswert

Make-up bieten wir nicht an – bitte kommt, wenn möglich, bereits mit Hair & Make-up. Unser Licht wirkt aber ohnehin sehr schmeichelnd. Bringt gern persönliche Dinge mit: Spielzeug, Hobbys, Instrumente, Lieblingsbuch – das macht eure Bilder einzigartig. Haustiere sind willkommen – gebt uns kurz vorher Bescheid, dann planen wir eine kleine „Pet-Pause" ein.

## Ablauf – so läuft euer Shooting
1. **Kurzbriefing:** wer kommt, welche Kombinationen sind wichtig, welche Stimmung wollt ihr?
2. **Ankommen & Outfit-Check:** wir stimmen Farben ab und geben Mini‑Tipps.
3. **Shooting mit Anleitung:** Gesamtmotiv, Teilgruppen, Einzelportraits – locker geführt.
4. **Auswahl:** Wenn es zeitlich passt, zeigen wir häufig noch am selben Tag eine Auswahl (IPS). Wenn es der letzte Termin ist, kommt die Auswahl bequem online.
5. **Retusche & Lieferung:** Die fertigen Bilder liefern wir immer über eine private, passwortgeschützte Online-Galerie aus der Cloud.

## Mini‑FAQ
**Wie lange dauert das Shooting?**
Meist ca. 60 Minuten – mit genug Zeit für die wichtigsten Motive.

**Dürfen Haustiere mit?**
Ja. Kurz vorher Bescheid geben, dann planen wir entspannt.

**Wann bekommen wir die Bilder?**
Auswahl je nach Terminlage schnell; final nach Retusche bequem über die Cloud.`, seoExpansion.studioIhr)
  }
};

// Helper to get copy by slug
export function getServicePageCopy(slug: string): ServicePageCopy | undefined {
  return newageCopyMap[slug];
}
