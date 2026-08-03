import fs from 'fs';
import path from 'path';
import { storage } from './server/storage.js';

const SITE_ORIGIN = 'https://www.newagefotografie.com';
const baseSitemapPath = path.resolve(process.cwd(), 'client', 'public', 'sitemap.xml');
const outputSitemapPath = path.resolve(process.cwd(), 'client', 'public', 'sitemap.xml');

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

async function main() {
  const base = fs.existsSync(baseSitemapPath)
    ? fs.readFileSync(baseSitemapPath, 'utf8')
    : '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n</urlset>';

  const existing = new Set(
    [...base.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]),
  );

  const posts = await storage.getBlogPosts(true);
  const blogUrls = posts
    .filter((post) => post.slug)
    .map((post) => {
      const loc = `${SITE_ORIGIN}/blog/${post.slug}`;
      if (existing.has(loc)) {
        return '';
      }

      const timestamp = post.updatedAt || post.publishedAt;
      const lastmod = timestamp ? new Date(timestamp).toISOString().slice(0, 10) : '';

      return [
        '  <url>',
        `    <loc>${xmlEscape(loc)}</loc>`,
        lastmod ? `    <lastmod>${lastmod}</lastmod>` : '',
        '    <changefreq>monthly</changefreq>',
        '    <priority>0.7</priority>',
        '  </url>',
      ].filter(Boolean).join('\n');
    })
    .filter(Boolean)
    .join('\n');

  const output = blogUrls
    ? base.replace('</urlset>', `${blogUrls}\n</urlset>`)
    : base;

  fs.writeFileSync(outputSitemapPath, output);
  console.log(`Wrote ${outputSitemapPath}`);
  console.log(`Included ${posts.length} published blog posts from the database.`);
}

main().catch((error) => {
  console.error('Failed to generate sitemap.xml');
  console.error(error);
  process.exit(1);
});