/**
 * Case-study blog drafts seed (July 2026 SEO audit follow-up).
 *
 * The Infinite Authority audit called for case studies with outcomes. Three
 * "Fallstudie" articles live in content/articles/ (the content source of
 * truth), each grounded in a REAL Google review already published on the
 * site — no invented client details. This seed inserts them as DRAFTS the
 * first time each slug is missing, so they appear in the admin Blog list for
 * the studio to add photos ([FOTO: …] placeholders mark the spots) and
 * schedule.
 *
 * Idempotent per slug: never overwrites, never re-creates, never publishes.
 */

import fs from 'fs';
import path from 'path';
import { db } from './db';
import { blogPosts } from '../shared/schema';
import { eq } from 'drizzle-orm';

const CASE_STUDY_SLUGS = [
  'fallstudie-schwangerschaftsshooting-wien',
  'fallstudie-familienshooting-wien',
  'fallstudie-business-portrait-wien',
];

export async function seedCaseStudies(): Promise<void> {
  const articlesDir = path.resolve(process.cwd(), 'content', 'articles');

  for (const slug of CASE_STUDY_SLUGS) {
    try {
      const [existing] = await db
        .select({ id: blogPosts.id })
        .from(blogPosts)
        .where(eq(blogPosts.slug, slug))
        .limit(1);
      if (existing) continue;

      const htmlPath = path.join(articlesDir, `${slug}.html`);
      const jsonPath = path.join(articlesDir, `${slug}.json`);
      if (!fs.existsSync(htmlPath) || !fs.existsSync(jsonPath)) continue;

      const contentHtml = fs.readFileSync(htmlPath, 'utf8');
      const meta = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

      await db.insert(blogPosts).values({
        title: meta.title,
        slug,
        contentHtml,
        excerpt: meta.excerpt || null,
        seoTitle: meta.seoTitle || null,
        metaDescription: meta.metaDescription || null,
        tags: Array.isArray(meta.tags) ? meta.tags : [],
        status: 'DRAFT',
        published: false,
      });
      console.log(`✅ Seeded case-study draft: ${slug}`);
    } catch (err: any) {
      console.warn(`⚠️ Case-study seed skipped (${slug}):`, err.message);
    }
  }
}
