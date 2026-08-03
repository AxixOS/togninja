// Exports every locally-authored blog article (content/articles/*.md) into a
// single combined Markdown document, ordered by scheduled publish date. Useful
// for offline review/backup. Output: content/blog-articles-export.md
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'fs';

const DIR = 'content/articles';
const OUT = 'content/blog-articles-export.md';

const files = readdirSync(DIR)
  .filter(f => f.endsWith('.md') && !f.startsWith('_'));

type Entry = { slug: string; title: string; date: string; status: string; body: string };

const entries: Entry[] = files.map(f => {
  const slug = f.replace(/\.md$/, '');
  const body = readFileSync(`${DIR}/${f}`, 'utf8').trim();
  const jsonPath = `${DIR}/${slug}.json`;
  let title = slug, date = '', status = '';
  if (existsSync(jsonPath)) {
    try {
      const meta = JSON.parse(readFileSync(jsonPath, 'utf8'));
      title = meta.title || title;
      date = meta.publishAt || '';
      status = meta.status || '';
    } catch { /* ignore */ }
  }
  return { slug, title, date, status, body };
});

// Sort by publish date (dated first, in order), then the rest alphabetically.
entries.sort((a, b) => {
  if (a.date && b.date) return a.date.localeCompare(b.date);
  if (a.date) return -1;
  if (b.date) return 1;
  return a.slug.localeCompare(b.slug);
});

const lines: string[] = [];
lines.push('# New Age Fotografie — Blog Articles Export');
lines.push('');
lines.push(`Exported ${entries.length} articles. Ordered by scheduled publish date.`);
lines.push('');
lines.push('## Inhalt');
lines.push('');
entries.forEach((e, i) => {
  const d = e.date ? `${e.date} · ` : '';
  lines.push(`${i + 1}. ${d}**${e.title}** — \`/blog/${e.slug}\`${e.status ? ` (${e.status})` : ''}`);
});
lines.push('');

for (const e of entries) {
  lines.push('---');
  lines.push('');
  lines.push(`<!-- slug: ${e.slug} | publishAt: ${e.date || 'n/a'} | status: ${e.status || 'n/a'} -->`);
  lines.push('');
  lines.push(e.body);
  lines.push('');
}

writeFileSync(OUT, lines.join('\n'), 'utf8');
console.log(`✅ Exported ${entries.length} articles to ${OUT}`);
