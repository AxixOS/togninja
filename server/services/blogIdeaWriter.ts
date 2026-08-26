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
import { loadStudioVoice, voiceRules, type StudioVoice } from './blogStudioVoice.js';
import { loadCoverage, findConflicts, coverageRules } from './blogCoverage.js';
import { tenantOpenAI } from '../lib/openaiClient';

export interface IdeaImage {
  url?: string;
  vision?: VisionResult;
  exif?: ImageExif;
  altText?: string;
}

export interface WriterInput {
  title: string;
  primaryKeyword?: string;
  pillar?: string;          // the studio's own topic page, e.g. /maternity-photography
  tags?: string[];
  images: IdeaImage[];
  context: BlogContext;
}

export interface WriterOutput {
  excerpt: string;
  seoTitle: string;
  metaDescription: string;
  html: string;
  /** The FAQ block as data, so the page can emit FAQPage JSON-LD rather than only prose. */
  faq: Array<{ question: string; answer: string }>;
}

// Pages every install has. The studio's OWN pillar pages come from the Authority Map
// at write time and are added to these.
//
// This list used to be fifteen Viennese URLs — /familienfotos-wien/,
// /neugeborenenfotos-wien/, /hochzeitsfotografie-wien/ and so on — handed to the model
// as "internal links you may use". For any studio but the origin one, every single
// suggestion was a 404, and the model was being actively instructed to produce them.
const UNIVERSAL_LINKS = ['/vouchers', '/kontakt', '/contact', '/warteliste', '/waitlist'];

async function openai(): Promise<OpenAI | null> {
  // Blog writing is ongoing work a studio asked for, so it is theirs to fund. The
  // 'sk-not-configured' placeholder also produced an OpenAI auth error rather than an
  // honest "no key" — indistinguishable, in a log, from a key that had been revoked.
  //
  // NOT memoised. This held the resolved CLIENT in a module-level variable, which pinned the
  // payer for the life of the process: a studio whose first blog ran on the platform's
  // fallback key kept billing the platform after entering their own, until someone redeployed.
  // That is the precise bug — "a studio who entered their own key had no way to take over
  // their own spend" — that the whole billing split exists to remove, reintroduced one layer
  // down by a cache. Resolving per call costs nothing: config.get caches for 60s and the SDK
  // constructor is cached inside openaiClient.
  return tenantOpenAI('blog-ideas');
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

function buildContextPack(input: WriterInput, lang: 'de' | 'en' = 'de'): string {
  const de = lang === 'de';
  const { title, primaryKeyword, pillar, context, images } = input;
  const visions = images.map((im, i) => {
    const v = im.vision;
    if (!v) return '';
    return de
      ? `Bild ${i + 1}: ${v.description} (Stimmung: ${v.mood}; sichtbar: ${v.sceneKeywords.join(', ')})`
      : `Image ${i + 1}: ${v.description} (mood: ${v.mood}; visible: ${v.sceneKeywords.join(', ')})`;
  }).filter(Boolean);
  const cams = images.map(im => cameraSummary(im.exif)).filter(Boolean);

  const L = de
    ? {
        title: 'TITEL', kw: 'HAUPT-KEYWORD', pillar: 'PILLAR-SEITE (verlinken)',
        facts: '# 1) FAKTEN VOM KUNDEN (höchste Priorität — niemals widersprechen, niemals erfinden):',
        place: 'Ort', when: 'Zeit/Jahreszeit', who: 'Personen', why: 'Anlass', note: 'Anmerkungen des Fotografen',
        seen: '# 2) WAS AUF DEN FOTOS ZU SEHEN IST (für Beschreibung/Stimmung, keine Fakten):',
        noVision: '(keine Bildanalyse vorhanden)',
        cam: '# 3) KAMERA/AUTHENTIZITÄT (optional dezent einbauen):', noCam: '(keine Kameradaten)',
      }
    : {
        title: 'TITLE', kw: 'PRIMARY KEYWORD', pillar: 'PILLAR PAGE (link it)',
        facts: '# 1) FACTS FROM THE STUDIO (highest priority — never contradict, never invent):',
        place: 'Location', when: 'Time / season', who: 'People', why: 'Occasion', note: 'Photographer\u2019s notes',
        seen: '# 2) WHAT IS ACTUALLY VISIBLE IN THE PHOTOGRAPHS (for description and mood, not for facts):',
        noVision: '(no image analysis available)',
        cam: '# 3) CAMERA / AUTHENTICITY (weave in lightly, optional):', noCam: '(no camera data)',
      };

  return [
    `${L.title}: ${title}`,
    primaryKeyword ? `${L.kw}: ${primaryKeyword}` : '',
    pillar ? `${L.pillar}: ${pillar}` : '',
    '',
    L.facts,
    context.location ? `- ${L.place}: ${context.location}` : '',
    context.timing ? `- ${L.when}: ${context.timing}` : '',
    context.people ? `- ${L.who}: ${context.people}` : '',
    context.celebration ? `- ${L.why}: ${context.celebration}` : '',
    context.commentary ? `- ${L.note}: ${context.commentary}` : '',
    '',
    L.seen,
    visions.length ? visions.join('\n') : L.noVision,
    '',
    L.cam,
    cams.length ? cams.join(' | ') : L.noCam,
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
  const voice = await loadStudioVoice();

  // What the studio has already published. Two jobs: real internal link targets, and a
  // check that this article is not about to compete with one of the studio's own pages.
  const coverage = await loadCoverage();
  const conflicts = findConflicts(input.title, input.primaryKeyword, coverage, input.tags || []);
  const lang: 'de' | 'en' = voice.language === 'de' ? 'de' : 'en';
  const de = lang === 'de';

  // Only links that actually resolve for THIS studio.
  const links = Array.from(new Set([...voice.links, ...UNIVERSAL_LINKS])).filter(Boolean);

  const system = [
    // WHO IS SPEAKING, and what they may honestly claim. Everything here is derived
    // from the studio's own record — see blogStudioVoice.ts for why that matters more
    // than the prompt craft below.
    ...voiceRules(voice, lang),

    de
      ? 'STIMME: warm, persönlich, direkt. Klingt nach einem Menschen, der wirklich dabei war — NICHT nach generischem SEO-Text.'
      : 'VOICE: warm, personal, direct. It should read like someone who was actually there — NOT like generic SEO copy.',

    // E-E-A-T, but earned. The old prompt told the model to open sections with
    // "after thirteen years we know…" regardless of whether the studio had thirteen
    // years. Experience is now shown through the WORK, which every studio has.
    de
      ? 'ERFAHRUNG ZEIGEN (E-E-A-T): Zeige Kompetenz an der Arbeit selbst — an konkreten Entscheidungen bei DIESEM Shooting (Licht, Ablauf, Umgang mit Kindern, was schiefgehen kann und wie man es löst). Nur belegbare Kennzahlen nennen; ansonsten Können statt Bilanz.'
      : 'SHOW EXPERIENCE (E-E-A-T): Demonstrate competence through the work itself — concrete decisions made on THIS shoot (light, pacing, handling children, what tends to go wrong and how it is solved). Cite only verifiable metrics; otherwise show skill rather than a track record.',

    // NEW: ground the writing in what the vision pass actually saw. The images carry
    // real descriptions and this was never used — the model was free to describe
    // photographs it had not been told anything about.
    de
      ? 'BILDBEZUG (wichtig): Beziehe dich mindestens zweimal konkret auf das, was auf den Fotos WIRKLICH zu sehen ist (siehe Bildanalyse). Beschreibe kein Detail, das dort nicht vorkommt. Ein Artikel über diese Fotos schlägt einen Artikel über das Thema.'
      : 'GROUND IN THE PHOTOGRAPHS (important): Refer at least twice to what is ACTUALLY visible in the supplied images (see the vision notes). Never describe a detail that is not there. An article about these photographs beats an article about the topic.',

    de
      ? 'HALTUNG: Bezieht klar Position. Eine Marke mit Meinung wirkt stärker als eine, die alles gleich gut findet.'
      : 'TAKE A POSITION: State a clear point of view. A studio with an opinion reads stronger than one that finds every option equally good.',

    de
      ? 'PERSÖNLICHE NOTE: GENAU EIN kurzer Ich-Absatz aus Sicht der Fotografin/des Fotografen. Keine erfundenen Namen — nutze „ich/wir" oder einen im Kontext genannten Namen.'
      : 'PERSONAL NOTE: EXACTLY ONE short first-person paragraph from the photographer. No invented names — use "I/we" or a name given in the context.',

    de
      ? 'WICHTIG: Gründe den Artikel im echten Shooting laut Kontext. Erfinde KEINE Namen, Orte oder Anlässe über die Kundenfakten hinaus.'
      : 'IMPORTANT: Ground the article in the real shoot described in the context. Invent NO names, places or occasions beyond the customer facts.',

    de
      ? 'H2-ÜBERSCHRIFTEN als echte Suchfragen formulieren, mit Keyword + Ort. FAQ-Überschrift themenspezifisch.'
      : 'WRITE H2 HEADINGS as real search questions, including the keyword and the location. Make the FAQ heading topic-specific.',

    // NEW for 2026: the goal is no longer only to rank — it is to be QUOTED by an AI
    // answer. That rewards self-contained claims a machine can lift without the
    // surrounding paragraph.
    de
      ? 'ZITIERFÄHIGKEIT: Schreibe die Kernaussagen so, dass sie EINZELN zitierbar sind — ein Satz, der auch ohne den Absatz drumherum stimmt und vollständig ist. KI-Antworten übernehmen Sätze, keine Absätze.'
      : 'EXTRACTABILITY: Write the key claims so each stands ALONE — a sentence that is true and complete without the paragraph around it. AI answers quote sentences, not paragraphs.',

    de
      ? 'VERGLEICHSTABELLE: Bei einer Entscheidung im Thema (Studio vs. Outdoor, Paket A vs. B …) eine 2-spaltige <table> mit kurzen Stichworten einfügen.'
      : 'COMPARISON TABLE: If the topic contains a decision (studio vs outdoor, package A vs B …), include a two-column <table> of short points.',

    // Adjacent search terms, from the studio's OWN place. The old prompt named
    // Schönbrunn, the Prater, the Naschmarkt and the U4 — to every studio on earth.
    voice.place
      ? (de
          ? `KEYWORD-CAPTURE: Nenne benachbarte Suchbegriffe und bekannte Orte rund um ${voice.place}, wo es natürlich passt. Erfinde keine Ortsnamen — nur solche, die du sicher kennst.`
          : `KEYWORD CAPTURE: Mention adjacent search terms and well-known locations around ${voice.place} where they fit naturally. Invent no place names — only ones you are confident exist.`)
      : '',

    de
      ? 'EMOTIONALER ABSCHLUSS: Schließe VOR den CTA-Links mit einem menschlichen Satz. Emotion verkauft Portraits, nicht der Termin.'
      : 'EMOTIONAL CLOSE: End with a human sentence BEFORE the call-to-action links. Emotion sells portraits; the appointment does not.',

    'HTML: only <p> <h2> <h3> <ul> <ol> <li> <table> <strong> <em> <a> <blockquote>. No data-* attributes, no class, no <div>, no empty <p>.',

    // Real URLs from landing_pages and published posts, plus the no-cannibalisation
    // instruction when this article is close to something already live.
    ...coverageRules(coverage, conflicts, lang, links),

    // Only reached when the studio has published nothing at all.
    coverage.length
      ? ''
      : (de
          ? 'Dieses Studio hat noch keine Seiten veröffentlicht. Verlinke NICHTS intern — ein erfundener Link ist ein 404.'
          : 'This studio has published nothing yet. Do NOT add internal links — an invented one is a 404.'),

    de
      ? 'STRUKTUR (~700–900 Wörter): Einleitung mit Haupt-Keyword; 4–6 such-fokussierte <h2> (eines davon ggf. eine Vergleichstabelle); eine persönliche Notiz; ein FAQ-Abschnitt mit 3–4 <h3>+<p>; emotionaler Abschluss + CTA.'
      : 'STRUCTURE (~700–900 words): an introduction carrying the main keyword; 4–6 search-focused <h2> sections (one may be the comparison table); one personal note; an FAQ section with 3–4 <h3>+<p>; emotional close plus call to action.',

    // NEW: the FAQ block is already there; emitting it as structured data is what makes
    // it eligible for rich results and easier for an answer engine to lift.
    de
      ? 'FAQ-DATEN: Gib zusätzlich \"faq\" als Array aus [{question, answer}] — exakt die Fragen aus dem FAQ-Abschnitt, Antworten als reiner Text (1–3 Sätze).'
      : 'FAQ DATA: Also return "faq" as an array of {question, answer} — exactly the questions from the FAQ section, answers as plain text of one to three sentences.',

    de
      ? 'seoTitle soll mehrere Suchvarianten einfangen.'
      : 'The seoTitle should capture several search variants.',

    'Respond as JSON: { "excerpt": "...", "seoTitle": "...", "metaDescription": "...", "html": "...", "faq": [{ "question": "...", "answer": "..." }] }.',
  ].filter(Boolean).join('\n');

  const res = await (await openai())!.chat.completions.create({
    // gpt-4o was two generations behind by the time this shipped.
    model: process.env.BLOG_WRITER_MODEL || 'gpt-4o',
    temperature: 0.6,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: system },
      {
        role: 'user',
        content: de
          ? `Schreibe den Artikel auf Basis dieses Kontexts:\n\n${buildContextPack(input, lang)}`
          : `Write the article from this context:\n\n${buildContextPack(input, lang)}`,
      },
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
    // Defensive: the model is asked for this, and a model can always decline.
    faq: Array.isArray(p.faq)
      ? p.faq
          .map((f: any) => ({ question: String(f?.question || '').trim(), answer: String(f?.answer || '').trim() }))
          .filter((f: any) => f.question && f.answer)
      : [],
  };
}
