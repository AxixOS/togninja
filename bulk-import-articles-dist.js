const fs = require("fs");
const path = require("path");
const { db } = require("./dist-server/server/db.js");
const { blogPosts } = require("./dist-server/shared/schema.js");
const { eq } = require("drizzle-orm");

async function run() {
  const articlesPath = path.join(__dirname, "blog-articles.json");
  const raw = fs.readFileSync(articlesPath, "utf-8");
  const articles = JSON.parse(raw);

  let success = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < articles.length; i++) {
    const a = articles[i];
    const idx = i + 1;
    const publishedAtIso = new Date(a.publishedAt);

    try {
      const existing = await db
        .select()
        .from(blogPosts)
        .where(eq(blogPosts.slug, a.slug))
        .limit(1);

      if (existing && existing.length > 0) {
        console.log(`[${idx}/${articles.length}] SKIP existing: ${a.slug}`);
        skipped++;
        continue;
      }

      const payload = {
        title: a.title,
        slug: a.slug,
        content: a.content,
        excerpt: a.excerpt,
        author: a.author,
        category: a.category,
        tags: a.tags,
        keyphrase: a.keyphrase,
        seoTitle: a.seoTitle,
        metaDescription: a.metaDescription,
        published: true,
        publishedAt: publishedAtIso,
      };

      await db.insert(blogPosts).values(payload);
      console.log(`[${idx}/${articles.length}] OK inserted: ${a.slug}`);
      success++;
    } catch (e) {
      console.error(`[${idx}/${articles.length}] FAIL ${a.slug}:`, e && e.message ? e.message : e);
      failed++;
    }
  }

  console.log(`\nSummary: inserted=${success}, skipped=${skipped}, failed=${failed}, total=${articles.length}`);
}

run().catch((e) => {
  console.error("Fatal error:", e && e.message ? e.message : e);
  process.exit(1);
});
