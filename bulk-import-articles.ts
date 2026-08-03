import * as fs from "fs";
import * as path from "path";
import dotenv from "dotenv";

dotenv.config();

// Read articles from JSON file
const articlesPath = path.join(__dirname, "blog-articles.json");
const articlesData = JSON.parse(fs.readFileSync(articlesPath, "utf-8"));

interface BlogArticle {
  title: string;
  slug: string;
  publishedAt: string;
  category: string;
  tags: string[];
  keyphrase: string;
  seoTitle: string;
  metaDescription: string;
  author: string;
  excerpt: string;
  content: string;
}

async function importArticles() {
  console.log(`📚 Found ${articlesData.length} articles to import`);
  console.log("────────────────────────────────────");

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < articlesData.length; i++) {
    const article: BlogArticle = articlesData[i];
    const articleNum = i + 1;

    try {
      console.log(
        `\n[${articleNum}/${articlesData.length}] Importing: "${article.title}"`
      );

      // Convert to ISO date format
      const publishedAt = new Date(article.publishedAt).toISOString();

      // Prepare payload
      const payload = {
        title: article.title,
        slug: article.slug,
        content: article.content,
        excerpt: article.excerpt,
        author: article.author,
        category: article.category,
        tags: article.tags,
        keyphrase: article.keyphrase,
        seoTitle: article.seoTitle,
        metaDescription: article.metaDescription,
        published: true,
        publishedAt: publishedAt,
      };

      // Import via direct database connection
      const { db } = await import("./server/db");
      const { blogPosts } = await import("./shared/schema");

      const result = await db.insert(blogPosts).values({
        ...payload,
        publishedAt: new Date(publishedAt),
      });

      console.log(`✅ Successfully imported: ${article.slug}`);
      successCount++;
    } catch (error: any) {
      console.error(`❌ Failed to import: ${article.slug}`);
      console.error(`   Error: ${error.message}`);
      failCount++;
    }
  }

  console.log("\n────────────────────────────────────");
  console.log(`\n📊 Import Summary:`);
  console.log(`   ✅ Successful: ${successCount}`);
  console.log(`   ❌ Failed: ${failCount}`);
  console.log(`   📚 Total: ${articlesData.length}`);

  if (failCount === 0) {
    console.log("\n🎉 All articles imported successfully!");
  }
}

// Run the import
importArticles().catch((error) => {
  console.error("Fatal error during import:", error);
  process.exit(1);
});
