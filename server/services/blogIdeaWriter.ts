// Context-first article writer for the idea-driven pipeline (Phase 3).
//
// Priority of truth (highest first):
//   1. User-supplied context (location, timing, people, occasion, commentary) — FACTS
//   2. Vision descriptions/keywords from the photos                          — TEXTURE
//   3. Website/brand context (studio positioning, pillar, internal links)    — FRAME
//   4. Camera/EXIF details                                                   — AUTHENTICITY
//
// The writer is told to ground the article in the real shoot, never invent
// facts beyond what the user gave, and keep the studio-based positioning.
import OpenAI from 'openai';
import type { BlogContext, VisionResult, ImageExif } from './blogImageAnalysis.js';

export interface IdeaImage {
  url?: string;
  vision?: VisionResult;
  exif?: ImageExif;
  altText?: string;
}

export interface WriterInput {
  title: string;
  primaryKeyword?: string;
  pillar?: string;          // e.g. /familienfotos-wien/
  tags?: string[];
  images: IdeaImage[];
  context: BlogContext;
}

export interface WriterOutput {
  excerpt: string;
  seoTitle: string;
  metaDescription: string;
  html: string;
}

const ALLOWED_LINKS = [
  '/familienfotos-wien/', '/neugeborenenfotos-wien/', '/babyfotos-wien/',
  '/schwangerschaftsfotos-wien/', '/kinder-fotografie-wien/', '/business-portrait-wien/',
  '/bewerbungsfotos-wien/', '/teamfotos-wien/', '/hochzeitsfotografie-wien/',
  '/eventfotografie-wien/', '/studio-fotografie-wien/', '/vouchers/', '/preise/',
  '/warteliste', '/kontakt',
];

let _openai: OpenAI | null = null;
function openai(): OpenAI {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || 'sk-not-configured' });
  return _openai;
}

function cameraSummary(exif?: ImageExif): string {
  if (!exif) return '';
  const parts: string[] = [];
  if (exif.make || exif.model) parts.push([exif.make, exif.model].filter(Boolean).join(' '));
  if (exif.lensModel) parts.push(exif.lensModel);
  if (exif.fNumber) parts.push(`f/${exif.fNumber}`);
  if (exif.focalLength) parts.push(`${exif.focalLength}mm`);
  if (exif.iso) parts.push(`ISO ${exif.iso}`);
  return parts.join(', ');
}

function buildContextPack(input: WriterInput): string {
  const { title, primaryKeyword, pillar, context, images } = input;
  const visions = images.map((im, i) => {
    const v = im.vision;
    if (!v) return '';
    return `Bild ${i + 1}: ${v.description} (Stimmung: ${v.mood}; sichtbar: ${v.sceneKeywords.join(', ')})`;
  }).filter(Boolean);
  const cams = images.map(im => cameraSummary(im.exif)).filter(Boolean);

  return [
    `TITEL: ${title}`,
    primaryKeyword ? `HAUPT-KEYWORD: ${primaryKeyword}` : '',
    pillar ? `PILLAR-SEITE (verlinken): ${pillar}` : '',
    '',
    '# 1) FAKTEN VOM KUNDEN (höchste Priorität — niemals widersprechen, niemals erfinden):',
    context.location ? `- Ort: ${context.location}` : '',
    context.timing ? `- Zeit/Jahreszeit: ${context.timing}` : '',
    context.people ? `- Personen: ${context.people}` : '',
    context.celebration ? `- Anlass: ${context.celebration}` : '',
    context.commentary ? `- Anmerkungen des Fotografen: ${context.commentary}` : '',
    '',
    '# 2) WAS AUF DEN FOTOS ZU SEHEN IST (für Beschreibung/Stimmung, keine Fakten):',
    visions.length ? visions.join('\n') : '(keine Bildanalyse vorhanden)',
    '',
    '# 3) KAMERA/AUTHENTIZITÄT (optional dezent einbauen):',
    cams.length ? cams.join(' | ') : '(keine Kameradaten)',
  ].filter((l) => l !== '').join('\n');
}

/**
 * Insert the shoot's photos into the generated HTML as <figure> blocks with
 * descriptive alt text (image SEO + the post actually shows its photos). Spreads
 * images after every other paragraph; appends any leftovers at the end.
 */
export function injectImages(html: string, images: IdeaImage[]): string {
  const imgs = images.filter((i) => i.url);
  if (!imgs.length) return html;
  const esc = (s: string) => (s || '').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  const fig = (im: IdeaImage) => {
    const alt = esc(im.altText || im.vision?.altText || im.vision?.description || '');
    const cap = im.altText || im.vision?.description || '';
    return `<figure><img src="${im.url}" alt="${alt}" loading="lazy" />${cap ? `<figcaption>${esc(cap)}</figcaption>` : ''}</figure>`;
  };
  let pCount = 0;
  let i = 0;
  let out = html.replace(/<\/p>/g, (m) => {
    pCount++;
    if (i < imgs.length && pCount % 2 === 1) return `${m}\n${fig(imgs[i++])}`;
    return m;
  });
  while (i < imgs.length) out += `\n${fig(imgs[i++])}`;
  return out;
}

export async function generateArticle(input: WriterInput): Promise<WriterOutput> {
  const system = [
    'Du bist erfahrene:r Texter:in für New Age Fotografie, ein Tageslichtstudio in Wien-Margareten (1050), nahe Naschmarkt.',
    'STUDIO-POSITIONIERUNG: Familien-, Baby-, Neugeborenen-, Schwangerschafts- und Kinderfotos entstehen IMMER im Studio.',
    'Nur Hochzeiten, Business/Team und Events werden on-location fotografiert. Empfiehl niemals Outdoor-Locations für Familien.',
    'STIMME: warm, persönlich, „ihr/euch", wir-Perspektive – klingt nach 13 Jahren echter Erfahrung, NICHT nach generischem SEO-Text.',
    'HALTUNG: Bezieht klar Position (warum das Studio für Familien die bessere Wahl ist). Eine Marke mit Meinung wirkt stärker. Baue mindestens ein „nur New Age"-Element ein (Tageslichtstudio, bewusste Studio-Entscheidung).',
    'ERFAHRUNG ZEIGEN (E-E-A-T): Beginne Abschnitte mit beobachteten Mustern aus echten Shootings, z.B. „Die meisten Familien sagen uns…", „Nach über 13 Jahren wissen wir…". Konkrete, erlebte Beispiele statt Allgemeinplätzen. 300+ Shootings / 4,8 ★ als gelebte Erfahrung, nicht als Werbefloskel.',
    'PERSÖNLICHE NOTE: Baue GENAU EINEN kurzen, ich-perspektivischen Absatz aus Fotografen-Sicht ein, der echte Erfahrung zeigt (kein erfundener Name – nutze „ich/wir" oder einen im Kontext genannten Namen).',
    'WICHTIG: Gründe den Artikel im echten Shooting laut Kontext. Erfinde KEINE Namen, Orte oder Anlässe über die Kundenfakten hinaus.',
    'H2-ÜBERSCHRIFTEN als echte Google-Suchfragen formulieren, mit Keyword + Ort, z.B. „Was anziehen für Familienfotos im Studio Wien?" statt „Vorbereitung & Outfits". FAQ-Überschrift themenspezifisch: „Häufige Fragen zu [Thema] in Wien".',
    'VERGLEICHSTABELLE: Wenn das Thema eine Entscheidung enthält (Studio vs. Outdoor, Paket A vs. B, …), füge eine 2-spaltige <table> mit kurzen Stichworten ein – solche Tabellen werden von Google-Snippets und KI-Antworten übernommen.',
    'KEYWORD-CAPTURE: Nenne relevante benachbarte Suchbegriffe / bekannte Wiener Orte (Schönbrunn, Stadtpark, Prater, Donauinsel, Naschmarkt, Margareten, U4) dort, wo es natürlich passt – und lenke die Logik dann zurück auf die Studio-Stärke.',
    'EMOTIONALER ABSCHLUSS: Schließe VOR den CTA-Links mit einem menschlichen, emotionalen Satz (Kinder werden größer, Familien verändern sich – ein gutes Portrait bleibt). Emotion verkauft Portraits, nicht der Termin.',
    'HTML-REGELN: nur <p> <h2> <h3> <ul> <ol> <li> <table> <strong> <em> <a> <blockquote>. Keine data-* Attribute, keine class, kein <div>, keine leeren <p>.',
    `Interne Links nur aus dieser Liste: ${ALLOWED_LINKS.join(', ')}. Verlinke die Pillar-Seite + 1–2 passende.`,
    'STRUKTUR (~700–900 Wörter): Einleitung mit Haupt-Keyword + Pillar-Link + Erfahrungs-/Trust-Signal; 4–6 such-fokussierte <h2> (eines davon eine Vergleichstabelle, wenn sinnvoll); eine persönliche Notiz; „Häufige Fragen zu … in Wien" mit 3–4 <h3>+<p>; emotionaler Abschluss + CTA mit /warteliste, /preise/, /kontakt; <blockquote> mit 4,8 ★.',
    'seoTitle soll mehrere Suchvarianten einfangen (z.B. „… in Wien – Studio oder Outdoor?").',
    'Antworte als JSON: { "excerpt": "...", "seoTitle": "...", "metaDescription": "...", "html": "..." }.',
  ].join('\n');

  const res = await openai().chat.completions.create({
    model: 'gpt-4o',
    temperature: 0.6,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: `Schreibe den Artikel auf Basis dieses Kontexts:\n\n${buildContextPack(input)}` },
    ],
  });

  const raw = res.choices[0]?.message?.content || '{}';
  let p: any = {};
  try { p = JSON.parse(raw); } catch { /* defaults below */ }
  return {
    excerpt: String(p.excerpt || ''),
    seoTitle: String(p.seoTitle || input.title),
    metaDescription: String(p.metaDescription || ''),
    html: String(p.html || ''),
  };
}
