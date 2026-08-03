export type Pillar = 'family' | 'business' | 'wedding' | 'studio';
export type Intent = 'informational' | 'commercial' | 'transactional';
export type Angle = 'E' | 'S' | 'C' | 'N' | 'K' | 'Q';

type TopicSeed = [
  slug: string,
  title: string,
  pillar: Pillar,
  cluster: string,
  intent: Intent,
  angle: Angle,
];

export interface AuthorityCalendarEntry {
  slug: string;
  title: string;
  pillar: Pillar;
  cluster: string;
  intent: Intent;
  angle: Angle;
  publishAt: string;
}

const START_DATE = new Date(Date.UTC(2026, 5, 9));
const SECOND_SLOT_OFFSET_DAYS = 3;

function addUtcDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

function formatUtcDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

const TOPIC_SEEDS: TopicSeed[] = [
  // Q3 2026: weddings + summer families + studio positioning
  ['hochzeitsfotograf-wien-ablauf-kosten', 'Hochzeitsfotograf Wien: Ablauf, Kosten & wie ihr den richtigen findet', 'wedding', 'Wedding planning', 'commercial', 'K'],
  ['familienfotos-im-sommer-wien-studio', 'Familienfotos im Sommer: warum das Studio auch bei 30 °C die beste Wahl ist', 'family', 'Seasonal family', 'informational', 'C'],
  ['fotoshooting-gutschein-wien-verschenken', 'Fotoshooting verschenken in Wien: der Gutschein-Guide', 'studio', 'Voucher gifting', 'transactional', 'E'],
  ['babyfotos-wien-bester-zeitpunkt-ablauf', 'Babyfotos in Wien: der beste Zeitpunkt und wie ein Shooting abläuft', 'family', 'Baby milestone', 'informational', 'Q'],
  ['was-kostet-hochzeitsfotograf-wien', 'Was kostet ein Hochzeitsfotograf in Wien? Preise & Pakete erklärt', 'wedding', 'Wedding planning', 'commercial', 'K'],
  ['bewerbungsfoto-wien-was-macht-gutes-foto', 'Bewerbungsfoto Wien: was ein gutes Foto 2026 ausmacht', 'business', 'Bewerbungsfotos', 'commercial', 'Q'],
  ['familienfotos-jaehrliche-tradition-wien', 'Warum jährliche Familienfotos eine schöne Tradition sind', 'family', 'Family memories', 'informational', 'N'],
  ['studio-fotoshooting-wien-ablauf', 'Studio-Fotoshooting in Wien: was euch in unserem Tageslichtstudio erwartet', 'studio', 'Studio experience', 'informational', 'Q'],
  ['linkedin-foto-wien-professionell', 'LinkedIn-Foto in Wien: so wirkt ihr professionell', 'business', 'LinkedIn portraits', 'commercial', 'K'],
  ['geschwisterfotos-wien-studio-tipps', 'Geschwisterfotos im Studio: Tipps für entspannte Bilder mit mehreren Kindern', 'family', 'Kids and siblings', 'informational', 'Q'],
  ['hochzeit-first-look-wien', 'First Look: der private Moment vor der Trauung', 'wedding', 'Wedding moments', 'informational', 'E'],
  ['erstes-familienshooting-wien', 'Euer erstes Familienshooting: was euch erwartet', 'family', 'Family preparation', 'informational', 'Q'],
  ['bewerbungsfoto-profi-vs-selfie-wien', 'Bewerbungsfoto vom Profi vs. Selfie/Automat', 'business', 'Bewerbungsfotos', 'commercial', 'K'],
  ['familienfotos-mit-hund-wien', "Familienfotos mit Hund: so klappt's mit dem Vierbeiner", 'family', 'Family with pets', 'informational', 'E'],
  ['hochzeit-getting-ready-wien', 'Getting-Ready-Fotos: der entspannte Start in den Tag', 'wedding', 'Wedding moments', 'informational', 'S'],
  ['wandbild-oder-digitale-galerie-wien', 'Wandbild oder digitale Galerie? So holt ihr das Beste aus euren Fotos', 'studio', 'Aftercare products', 'commercial', 'K'],
  ['familienfotos-mit-kleinkind-ohne-druck-wien', 'Familienfotos mit Kleinkind: ohne Druck zu echten Momenten', 'family', 'Toddler sessions', 'informational', 'S'],
  ['businessfoto-fuer-website-und-linkedin-wien', 'Ein Businessfoto für Website und LinkedIn: was wirklich funktionieren muss', 'business', 'LinkedIn portraits', 'commercial', 'Q'],
  ['verlobungsfotos-vor-der-hochzeit-wien', 'Verlobungsfotos in Wien: warum sie vor der Hochzeit Gold wert sind', 'wedding', 'Couple sessions', 'informational', 'E'],
  ['neugeborenenfotos-was-anziehen-eltern', 'Neugeborenenfotos: was Eltern anziehen sollten', 'family', 'Newborn preparation', 'informational', 'Q'],
  ['fotoshooting-im-studio-erste-15-minuten-wien', 'Die ersten 15 Minuten im Studio: so startet ein Fotoshooting entspannt', 'studio', 'Studio experience', 'informational', 'S'],
  ['familienfotos-bei-regen-studio-wien', 'Familienfotos bei Regen: warum das Studio euch den Tag rettet', 'family', 'Seasonal family', 'informational', 'C'],
  ['businessfotos-farben-und-kleidung-wien', 'Businessfotos: Farben und Kleidung, die professionell wirken', 'business', 'Business portraits', 'commercial', 'Q'],
  ['fragen-an-hochzeitsfotograf-wien', '10 Fragen, die ihr eurem Hochzeitsfotografen stellen solltet', 'wedding', 'Wedding planning', 'commercial', 'Q'],
  ['babyfotos-6-monate-sitter-wien', 'Die 6-Monats-Sitter-Session: Babys erstes Sitzen', 'family', 'Baby milestone', 'informational', 'E'],
  ['produktfotos-fuer-amazon-und-shopify-wien', 'Produktfotos für Amazon und Shopify: worauf kleine Marken achten sollten', 'studio', 'Commercial product', 'commercial', 'Q'],

  // Q4 2026: autumn business lift + family proof + vouchers
  ['bewerbungsfotos-wien-jobstart-vorbereitung', 'Bewerbungsfotos zum Jobstart: Termin, Outfit & Vorbereitung', 'business', 'Bewerbungsfotos', 'transactional', 'Q'],
  ['herbst-familienfotos-wien-outfits', 'Herbst-Familienfotos: warme Looks & Outfits fürs Studio', 'family', 'Seasonal family', 'informational', 'Q'],
  ['teamfotos-wien-unternehmen', 'Teamfotos für Unternehmen in Wien: einheitlich, modern, on-location', 'business', 'Team headshots', 'commercial', 'K'],
  ['familienfotos-mit-teenagern-wien', 'Familienfotos mit Teenagern: ohne Augenrollen', 'family', 'Older kids', 'informational', 'S'],
  ['headshots-selbststaendige-wien', 'Headshots für Selbstständige in Wien: ein Foto, das Vertrauen schafft', 'business', 'Personal brand', 'commercial', 'E'],
  ['mehrgenerationen-fotoshooting-wien', 'Familienfotos mit Baby & Großeltern: das Mehrgenerationen-Shooting', 'family', 'Multi-generation', 'informational', 'N'],
  ['einheitliche-team-headshots-wien', 'Einheitliche Team-Headshots fürs ganze Unternehmen', 'business', 'Team headshots', 'commercial', 'Q'],
  ['familienfotos-farbkonzept-studio-wien', 'Familienfotos im Studio: so hilft ein Farbkonzept bei ruhigen Bildern', 'family', 'Family preparation', 'informational', 'Q'],
  ['weihnachtsgutschein-fotoshooting-wien', 'Weihnachtsgutschein für ein Fotoshooting: das Geschenk, das bleibt', 'studio', 'Voucher gifting', 'transactional', 'E'],
  ['weihnachtskarten-familienfotos-wien', 'Weihnachtskarten-Fotos in Wien: Familienbilder rechtzeitig zum Fest', 'family', 'Seasonal family', 'transactional', 'Q'],
  ['corporate-fotografie-wien-jahresende', 'Corporate-Fotografie zum Jahresende: Website & Team-Update', 'business', 'Corporate branding', 'commercial', 'K'],
  ['kinderfotos-schuechterne-kinder-wien', 'Kinderfotos mit schüchternen Kindern: so entstehen trotzdem starke Portraits', 'family', 'Kids and siblings', 'informational', 'S'],
  ['fotoshooting-geschenkideen-wien', 'Fotoshooting verschenken: die besten Geschenk-Ideen', 'studio', 'Voucher gifting', 'transactional', 'E'],
  ['familienfotos-geschenk-fuer-grosseltern-wien', 'Familienfotos als Geschenk für Großeltern: was wirklich berührt', 'family', 'Family memories', 'transactional', 'N'],
  ['personal-branding-fotos-wien', 'Personal-Branding-Fotos für Selbstständige in Wien', 'business', 'Personal brand', 'commercial', 'S'],
  ['warum-familienfotos-wichtig-wien', 'Warum Familienfotos wirklich wichtig sind', 'family', 'Family memories', 'informational', 'N'],
  ['gutschein-fotoshooting-fuer-paare-wien', 'Ein Fotoshooting-Gutschein für Paare: persönlich statt beliebig', 'studio', 'Voucher gifting', 'transactional', 'E'],
  ['babyfotos-erster-geburtstag-wien', 'Babyfotos zum ersten Geburtstag: was bleibt, wenn der Kuchen weg ist', 'family', 'Baby milestone', 'informational', 'N'],
  ['fehler-beim-bewerbungsfoto-wien', 'Die 5 häufigsten Fehler beim Bewerbungsfoto', 'business', 'Bewerbungsfotos', 'informational', 'C'],
  ['neugeborenenfotos-mit-geschwistern-wien', 'Geschwister beim Neugeborenenshooting einbeziehen', 'family', 'Newborn preparation', 'informational', 'S'],
  ['bildauswahl-nach-dem-fotoshooting-wien', 'Bildauswahl nach dem Fotoshooting: so findet ihr eure Favoriten', 'studio', 'Aftercare products', 'informational', 'Q'],
  ['neugeborenenfotos-vorbereitung-studio-wien', 'Neugeborenenfotos im Studio vorbereiten: was ihr vorher wissen solltet', 'family', 'Newborn preparation', 'informational', 'Q'],
  ['mitarbeiterfotos-fuer-neue-teammitglieder-wien', 'Mitarbeiterfotos für neue Teammitglieder: schnell konsistent statt improvisiert', 'business', 'Team headshots', 'commercial', 'Q'],
  ['familienfotos-zeitlos-statt-trendy-wien', 'Familienfotos: warum zeitlos fast immer besser ist als trendy', 'family', 'Family style', 'informational', 'C'],
  ['hochzeit-gruppenfotos-tipps-wien', 'Gruppenfotos auf der Hochzeit ohne Chaos', 'wedding', 'Wedding moments', 'informational', 'Q'],
  ['jahresend-familienfotos-wien', 'Jahresend-Familienfotos: das Jahr festhalten', 'family', 'Family memories', 'informational', 'N'],

  // Q1 2027: vouchers, newborns, career refresh, winter weddings
  ['last-minute-gutschein-fotoshooting-wien', 'Last-Minute-Gutschein: Fotoshooting verschenken noch vor Weihnachten', 'studio', 'Voucher gifting', 'transactional', 'E'],
  ['babys-erstes-jahr-fotos-wien', 'Babys erstes Jahr: Neugeborenen-, Baby- & Meilenstein-Fotos', 'family', 'Baby milestone', 'informational', 'Q'],
  ['standesamt-hochzeit-wien-fotograf', 'Standesamtliche Hochzeit in Wien fotografieren lassen: kompakt & schön', 'wedding', 'Civil wedding', 'commercial', 'K'],
  ['neugeborenenfotos-winter-wien', 'Neugeborenenfotos im Winter: warm, sicher und entspannt im Studio', 'family', 'Seasonal newborn', 'informational', 'E'],
  ['bewerbungsfotos-neues-jahr-wien', 'Neues Jahr, neuer Job: Bewerbungsfotos, die auffallen', 'business', 'Bewerbungsfotos', 'transactional', 'E'],
  ['schwangerschaftsfotos-idealer-zeitpunkt-wien', 'Schwangerschaftsfotos in Wien: der ideale Zeitpunkt im Studio', 'family', 'Maternity timing', 'informational', 'Q'],
  ['winterhochzeit-fotografie-wien', 'Winterhochzeit in Wien: was fotografisch besonders gut funktioniert', 'wedding', 'Wedding planning', 'informational', 'S'],
  ['babyfotos-eltern-unsicher-vor-kamera-wien', 'Babyfotos, obwohl ihr euch vor der Kamera unsicher fühlt', 'family', 'Baby preparation', 'informational', 'E'],
  ['bewerbungsfoto-fuer-quereinsteiger-wien', 'Bewerbungsfoto für Quereinsteiger: seriös, offen, glaubwürdig', 'business', 'Bewerbungsfotos', 'commercial', 'K'],
  ['familienfotos-geschwister-altersabstand-wien', 'Familienfotos mit großem Altersabstand zwischen Geschwistern: was hilft', 'family', 'Kids and siblings', 'informational', 'Q'],
  ['paarfotos-wien-valentinstag', 'Pärchenfotos in Wien zum Valentinstag: locker & echt', 'wedding', 'Couple sessions', 'informational', 'E'],
  ['familienfotos-mit-papa-der-nicht-will-wien', 'Familienfotos mit Papa, der eigentlich keine Lust hat', 'family', 'Family preparation', 'informational', 'S'],
  ['linkedin-banner-und-profilfoto-wien', 'LinkedIn-Banner und Profilfoto: der Auftritt muss zusammenpassen', 'business', 'LinkedIn portraits', 'commercial', 'Q'],
  ['kinderfotografie-wien-natuerlich', 'Kinderfotografie in Wien: natürliche Portraits ohne Stress', 'family', 'Kids and siblings', 'commercial', 'E'],
  ['hochzeitsfotograf-vertrag-fragen-wien', 'Hochzeitsfotograf-Vertrag: welche Fragen ihr vorab klären solltet', 'wedding', 'Wedding planning', 'commercial', 'Q'],
  ['familienfotos-casual-oder-schick-wien', 'Familienfotos: casual oder schick? So trefft ihr die bessere Entscheidung', 'family', 'Family style', 'commercial', 'K'],
  ['ceo-portraits-wien-vertrauen', 'CEO-Portraits in Wien: wie ein einzelnes Bild Vertrauen aufbaut', 'business', 'Executive portraits', 'commercial', 'E'],
  ['neugeborenenfotos-winter-vs-sommer-wien', 'Neugeborenenfotos im Winter vs. Sommer: was ist im Studio anders?', 'family', 'Seasonal newborn', 'informational', 'K'],
  ['kleine-hochzeit-elopement-wien', 'Kleine Hochzeit / Elopement in Wien fotografieren', 'wedding', 'Civil wedding', 'commercial', 'K'],
  ['schwangerschaftsfotos-mit-partner-wien', 'Schwangerschaftsfotos mit Partner & Kindern', 'family', 'Maternity family', 'informational', 'E'],
  ['unternehmensfotos-website-relaunch-wien', 'Unternehmensfotos für den Website-Relaunch: ein Update, das sichtbar wirkt', 'business', 'Corporate branding', 'commercial', 'K'],
  ['babyfotos-meilensteine-im-ersten-jahr-wien', 'Babyfotos: die wichtigsten Meilensteine im ersten Jahr', 'family', 'Baby milestone', 'informational', 'Q'],
  ['hochzeit-regenplan-fotos-wien', 'Hochzeitsfotos bei Regen in Wien: warum der Plan B nicht nach Plan B aussehen muss', 'wedding', 'Wedding planning', 'informational', 'C'],
  ['schwangerschaftsfotos-kurz-vor-geburt-wien', 'Schwangerschaftsfotos kurz vor der Geburt: wann es noch gut klappt', 'family', 'Maternity timing', 'informational', 'Q'],
  ['businessfotos-fuer-coaches-und-berater-wien', 'Businessfotos für Coaches und Berater: vertrauensvoll statt glatt', 'business', 'Personal brand', 'commercial', 'S'],
  ['oster-familienfotos-wien', 'Oster-Familienfotos in Wien', 'family', 'Seasonal family', 'transactional', 'E'],

  // Q2 2027: spring families + wedding demand + studio authority
  ['fruehling-familienfotos-wien', 'Frühlings-Familienfotos: helle, frische Studio-Looks', 'family', 'Seasonal family', 'informational', 'E'],
  ['hochzeitsfotograf-wien-2027-buchen', 'Hochzeitssaison 2027: warum ihr euren Fotografen jetzt bucht', 'wedding', 'Wedding planning', 'transactional', 'K'],
  ['teamfotos-wien-authentisch', 'Teamfotos neu gedacht: authentisch statt steif', 'business', 'Team headshots', 'commercial', 'C'],
  ['erstkommunion-fotos-wien', 'Erstkommunion & Firmung in Wien fotografieren: festliche Studio-Portraits', 'family', 'Family traditions', 'commercial', 'Q'],
  ['maternity-shooting-outfits-wien', 'Maternity-Shooting: Outfits & Ideen für werdende Eltern', 'family', 'Maternity family', 'informational', 'Q'],
  ['produktfotografie-wien-kleine-marken', 'Produktfotografie für kleine Wiener Marken: clean & verkaufsstark', 'studio', 'Commercial product', 'commercial', 'K'],
  ['muttertag-fotoshooting-wien', 'Muttertag in Wien: Fotoshooting als Geschenk für Mama', 'family', 'Family gifting', 'transactional', 'E'],
  ['hochzeitsreportage-wien-ablauf', 'Eure Hochzeitsreportage in Wien: Ablauf eines ganzen Tages', 'wedding', 'Wedding documentary', 'informational', 'S'],
  ['familienfotos-wien-haeufige-fragen', 'Familienfotos: die häufigsten Fragen vor dem Studio-Shooting', 'family', 'Family FAQ', 'informational', 'Q'],
  ['wandbilder-wohnung-gestalten-wien', 'Wandbilder richtig in der Wohnung in Szene setzen', 'studio', 'Aftercare products', 'informational', 'Q'],
  ['haeufigste-fehler-familienfotos', 'Die häufigsten Fehler bei Familienfotos – und wie ihr sie vermeidet', 'family', 'Family FAQ', 'informational', 'C'],
  ['businessportraits-fuer-aerzte-und-anwaelte-wien', 'Businessportraits für Ärzte und Anwälte: seriös ohne Distanz', 'business', 'Professional portraits', 'commercial', 'K'],
  ['hochzeit-golden-hour-oder-dokumentarisch-wien', 'Golden Hour oder dokumentarisch? Welche Hochzeitsbilder ihr wirklich wollt', 'wedding', 'Wedding style', 'commercial', 'K'],
  ['babybauchfotos-was-anziehen-im-studio-wien', 'Babybauchfotos im Studio: was ihr anziehen solltet', 'family', 'Maternity family', 'informational', 'Q'],
  ['fotobuch-oder-wandbild-wien', 'Fotobuch oder Wandbild – was lohnt sich?', 'studio', 'Aftercare products', 'commercial', 'K'],
  ['familienfotos-lichtfarben-studio-wien', 'Warme oder helle Lichtstimmung? So verändert Licht Familienfotos im Studio', 'family', 'Family style', 'informational', 'Q'],
  ['businessfotos-fuer-speaker-wien', 'Businessfotos für Speaker: sichtbar, klar, wiedererkennbar', 'business', 'Personal brand', 'commercial', 'S'],
  ['standesamt-und-feier-an-einem-tag-wien', 'Standesamt und Feier an einem Tag: wie die Bildstrecke stimmig bleibt', 'wedding', 'Civil wedding', 'informational', 'Q'],
  ['neugeborenenfotos-sicherheit-ablauf-wien', 'Neugeborenenfotos: Sicherheit und Ablauf im Studio', 'family', 'Newborn preparation', 'informational', 'Q'],
  ['geschichte-hinter-dem-bild-wien', 'Die Geschichte hinter dem Bild: warum echte Momente stärker verkaufen als perfekte Posen', 'studio', 'Studio storytelling', 'informational', 'S'],
  ['familienfotos-mit-papa-der-nicht-will-wien-zweiter-blick', 'Familienfotos mit skeptischen Erwachsenen: wie aus Zurückhaltung Nähe wird', 'family', 'Family preparation', 'informational', 'S'],
  ['business-portrait-foto-website-linkedin-wien', 'Business-Portrait: ein Bild für Website, Presse und LinkedIn zugleich', 'business', 'Business portraits', 'commercial', 'Q'],
  ['hochzeit-fotoliste-ohne-stress-wien', 'Die Hochzeits-Fotoliste ohne Stress: was wirklich draufgehört', 'wedding', 'Wedding planning', 'informational', 'Q'],
  ['familienfotos-geschenk-fuer-grosseltern-wien-zweiter-blick', 'Familienfotos als generationsübergreifendes Geschenk: was daran hängen bleibt', 'family', 'Family gifting', 'transactional', 'N'],
  ['teamfotos-fuer-hybride-unternehmen-wien', 'Teamfotos für hybride Unternehmen: konsistent trotz flexibler Teams', 'business', 'Team headshots', 'commercial', 'Q'],
  ['studio-licht-vorteile-fuer-portraits-wien', 'Warum Studiolicht Portraits oft natürlicher wirken lässt als gedacht', 'studio', 'Studio experience', 'informational', 'C'],
  ['familienfotos-mit-hund-wien-zweiter-blick', 'Familienfotos mit Hund im Studio: Vorbereitung, Timing, Ruhe', 'family', 'Family with pets', 'informational', 'Q'],
  ['bewerbungsfoto-knigge-wien', 'Bewerbungsfoto-Knigge: Mimik, Haltung & Kleidung', 'business', 'Bewerbungsfotos', 'informational', 'Q'],
  ['herbst-paarfotos-wien', 'Herbst-Paarfotos in Wien: Nähe, Farbe, Atmosphäre', 'wedding', 'Couple sessions', 'informational', 'E'],
  ['familienfotos-jaehrliche-tradition-wien-zweiter-blick', 'Jährliche Familienfotos: wie daraus eure persönliche Bildchronik wird', 'family', 'Family memories', 'informational', 'N'],
  ['businessfotos-fuer-speaker-und-podcasts-wien', 'Businessfotos für Speaker und Podcasts: sichtbar auf jeder Bühne', 'business', 'Personal brand', 'commercial', 'S'],
  ['produktfotos-online-shop-wien', 'Produktfotos für den Online-Shop in Wien', 'studio', 'Commercial product', 'commercial', 'Q'],
  ['familienfotos-mit-teenagern-wien-zweiter-blick', 'Familienfotos mit Teenagern: was Nähe möglich macht, ohne zu inszenieren', 'family', 'Older kids', 'informational', 'S'],
  ['hochzeit-fotografenvertrag-fragen-wien', 'Welche Vertragsfragen ihr bei eurem Hochzeitsfotografen klären solltet', 'wedding', 'Wedding planning', 'commercial', 'Q'],
  ['ceo-portraits-und-teamlinie-wien', 'CEO-Portraits und Teamlinie: so bleibt die Bildsprache aus einem Guss', 'business', 'Executive portraits', 'commercial', 'K'],
  ['familienfotos-im-herzen-der-stadt-wien-studio', 'Warum ein zentrales Studio für Familienfotos in Wien mehr Ruhe bringt', 'family', 'Studio family positioning', 'commercial', 'C'],
  ['gutschein-fotoshooting-fuer-paare-wien-zweiter-blick', 'Ein Fotoshooting-Gutschein für Paare: Erinnerung statt Standardgeschenk', 'studio', 'Voucher gifting', 'transactional', 'E'],
  ['verlobungsfotos-ohne-kitsch-wien', 'Verlobungsfotos in Wien ohne Kitsch: klar, modern, echt', 'wedding', 'Couple sessions', 'commercial', 'C'],
  ['familienfotos-ohne-perfekte-kinder-wien', 'Familienfotos ohne perfekte Kinder: warum genau das die stärkeren Bilder ergibt', 'family', 'Family philosophy', 'informational', 'C'],
  ['personal-branding-fotos-serie-wien', 'Personal-Branding-Fotos als Serie: mehr aus einem Shooting herausholen', 'business', 'Personal brand', 'commercial', 'Q'],
  ['bildauswahl-und-wandbildplanung-wien', 'Von der Bildauswahl zur Wandbildplanung: so schließt sich der Kreis', 'studio', 'Aftercare products', 'commercial', 'Q'],
  ['hochzeitsreportage-kleine-details-wien', 'Die kleinen Details der Hochzeitsreportage, die später die größten Erinnerungen werden', 'wedding', 'Wedding documentary', 'informational', 'N'],
  ['familienfotos-ein-jahr-spaeter-wien', 'Ein Jahr später: warum Familienfotos mit der Zeit gewinnen', 'family', 'Family memories', 'informational', 'N'],
];

const ACTIVE_TOPIC_SEEDS = TOPIC_SEEDS.slice(0, 104);
export const AUTHORITY_BACKLOG = TOPIC_SEEDS.slice(104).map(([slug, title, pillar, cluster, intent, angle]) => ({
  slug,
  title,
  pillar,
  cluster,
  intent,
  angle,
}));

if (ACTIVE_TOPIC_SEEDS.length !== 104) {
  throw new Error(`Expected 104 active authority topics, got ${ACTIVE_TOPIC_SEEDS.length}`);
}

export const AUTHORITY_CALENDAR: AuthorityCalendarEntry[] = ACTIVE_TOPIC_SEEDS.map((topic, index) => {
  const [slug, title, pillar, cluster, intent, angle] = topic;
  const weekOffset = Math.floor(index / 2) * 7;
  const dayOffset = index % 2 === 0 ? 0 : SECOND_SLOT_OFFSET_DAYS;
  return {
    slug,
    title,
    pillar,
    cluster,
    intent,
    angle,
    publishAt: formatUtcDate(addUtcDays(START_DATE, weekOffset + dayOffset)),
  };
});

export const AUTHORITY_CALENDAR_COUNTS = AUTHORITY_CALENDAR.reduce<Record<Pillar, number>>(
  (acc, entry) => {
    acc[entry.pillar] += 1;
    return acc;
  },
  { family: 0, business: 0, wedding: 0, studio: 0 },
);