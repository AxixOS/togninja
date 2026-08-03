import 'dotenv/config';
import { db } from './server/db';
import { manualPageContent } from './shared/schema';
import { eq, and } from 'drizzle-orm';

async function checkManualPageData() {
  try {
    console.log('🔍 Checking manual page content in database...\n');

    // Get all manual page content
    const allContent = await db
      .select()
      .from(manualPageContent)
      .where(eq(manualPageContent.pageId, 'produktfotografie'));

    if (allContent.length === 0) {
      console.log('❌ No content found for produktfotografie page');
      return;
    }

    for (const content of allContent) {
      console.log('📄 Page ID:', content.pageId);
      console.log('🌍 Language:', content.language);
      console.log('📊 Status:', content.status);
      console.log('📅 Published At:', content.publishedAt);
      console.log('📅 Updated At:', content.updatedAt);
      console.log('\n📝 DRAFT CONTENT:');
      console.log(JSON.stringify(content.draftContent, null, 2));
      console.log('\n✅ PUBLISHED CONTENT:');
      console.log(JSON.stringify(content.publishedContent, null, 2));
      console.log('\n' + '='.repeat(80) + '\n');

      // Check for hero images specifically
      const draftHeroImages = Object.keys(content.draftContent || {}).filter(k => k.includes('heroImage'));
      const publishedHeroImages = Object.keys(content.publishedContent || {}).filter(k => k.includes('heroImage'));

      if (draftHeroImages.length > 0) {
        console.log('🎨 Draft Hero Images Found:');
        draftHeroImages.forEach(key => {
          console.log(`  - ${key}: ${content.draftContent?.[key] ?? ''}`);
        });
      }

      if (publishedHeroImages.length > 0) {
        console.log('✅ Published Hero Images Found:');
        publishedHeroImages.forEach(key => {
          console.log(`  - ${key}: ${content.publishedContent?.[key] ?? ''}`);
        });
      } else {
        console.log('⚠️  NO PUBLISHED HERO IMAGES FOUND!');
        console.log('   This means you uploaded images but haven\'t clicked "Publish" yet.');
      }
      console.log('');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkManualPageData();
