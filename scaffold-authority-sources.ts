import { existsSync, writeFileSync } from 'fs';
import { AUTHORITY_CALENDAR, type AuthorityCalendarEntry } from './scripts/blogAuthorityCalendar.js';

const defaultCutoff = '2026-09-30';
const cutoffArg = process.argv.find((arg) => arg.startsWith('--through='));
const cutoff = (cutoffArg?.split('=')[1] || defaultCutoff).trim();
const shouldWrite = process.argv.includes('--write');

function excerptFor(entry: AuthorityCalendarEntry): string {
  const prefixByPillar: Record<AuthorityCalendarEntry['pillar'], string> = {
    family: 'Ein studio-basierter Guide für Familien in Wien',
    business: 'Ein klarer Praxis-Guide für starke Businessbilder in Wien',
    wedding: 'Ein ehrlicher Hochzeits-Guide für Wien',
    studio: 'Ein praxisnaher Studio-Guide aus Wien',
  };
  return `${prefixByPillar[entry.pillar]}: ${entry.title}.`;
}

function metaDescriptionFor(entry: AuthorityCalendarEntry): string {
  return `${entry.title} - ${entry.cluster} mit Fokus auf ${entry.intent} und klarer Wien-Positionierung. 13+ Jahre Erfahrung, 4,8★.`;
}

function tagsFor(entry: AuthorityCalendarEntry): string[] {
  return Array.from(new Set([
    'wien',
    entry.pillar,
    entry.intent,
    ...entry.slug.split('-').filter((part) => part.length >= 5).slice(0, 3),
  ])).slice(0, 6);
}

function htmlOutlineFor(entry: AuthorityCalendarEntry): string {
  const pillarNote = entry.pillar === 'wedding'
    ? 'Wedding content may reference on-location coverage.'
    : 'Keep this article studio-based and consistent with the core positioning.';

  return [
    `<p><strong>Draft scaffold.</strong> This outline is intentionally not publish-ready. Expand it into a full article before using publish-article.ts.</p>`,
    `<p><strong>Angle:</strong> ${entry.angle} &middot; <strong>Cluster:</strong> ${entry.cluster} &middot; <strong>Intent:</strong> ${entry.intent}</p>`,
    `<p><strong>Positioning note:</strong> ${pillarNote}</p>`,
    '',
    `<h2>Hook</h2>`,
    `<p>Open with a ${entry.angle === 'E' ? 'feeling-led observation' : entry.angle === 'S' ? 'real moment or short story' : entry.angle === 'C' ? 'defensible opinion' : entry.angle === 'N' ? 'memory or nostalgia cue' : entry.angle === 'K' ? 'decision-making contrast' : 'high-value practical question'} tied to ${entry.title.toLowerCase()}.</p>`,
    '',
    `<h2>What readers need to know</h2>`,
    `<p>Explain the main decision, process, or benefit in concrete Vienna-specific terms.</p>`,
    '',
    `<h2>Practical guidance</h2>`,
    `<ul>`,
    `  <li>Cover the most important preparation point.</li>`,
    `  <li>Add one studio-specific or workflow-specific detail.</li>`,
    `  <li>Link naturally to the pillar page and one sibling article.</li>`,
    `</ul>`,
    '',
    `<h2>FAQ</h2>`,
    `<h3>Question 1</h3>`,
    `<p>Answer with a concise, experience-based response.</p>`,
    `<h3>Question 2</h3>`,
    `<p>Answer with a concise, experience-based response.</p>`,
    `<h3>Question 3</h3>`,
    `<p>Answer with a concise, experience-based response.</p>`,
    '',
    `<h2>CTA</h2>`,
    `<p>Close with a natural next step to contact, pricing, waitlist, or the pillar page.</p>`,
  ].join('\n');
}

function inRange(entry: AuthorityCalendarEntry): boolean {
  return entry.publishAt <= cutoff;
}

const candidates = AUTHORITY_CALENDAR.filter(inRange).filter((entry) => {
  const jsonPath = `content/articles/${entry.slug}.json`;
  const htmlPath = `content/articles/${entry.slug}.html`;
  return !existsSync(jsonPath) || !existsSync(htmlPath);
});

console.log(`${shouldWrite ? 'APPLY' : 'DRY RUN'} authority source scaffold`);
console.log(`Through: ${cutoff}`);
console.log(`Candidates: ${candidates.length}`);

for (const entry of candidates) {
  console.log(`  ${entry.publishAt}  ${entry.slug}`);
  if (!shouldWrite) continue;

  const jsonPath = `content/articles/${entry.slug}.json`;
  const htmlPath = `content/articles/${entry.slug}.html`;

  if (!existsSync(jsonPath)) {
    const json = {
      title: entry.title,
      excerpt: excerptFor(entry),
      seoTitle: `${entry.title} | New Age Fotografie`,
      metaDescription: metaDescriptionFor(entry),
      tags: tagsFor(entry),
      status: 'DRAFT',
      publishAt: entry.publishAt,
    };
    writeFileSync(jsonPath, JSON.stringify(json, null, 2) + '\n', 'utf8');
  }

  if (!existsSync(htmlPath)) {
    writeFileSync(htmlPath, htmlOutlineFor(entry) + '\n', 'utf8');
  }
}

if (!shouldWrite) {
  console.log('Use --write to create missing DRAFT source files through the cutoff date.');
}