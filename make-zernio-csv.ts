// Build a Zernio bulk-import CSV from PUBLISHED blog posts (the link-back
// targets). One row per post, fanning out to Facebook / Instagram / Google
// Business / Pinterest / LinkedIn with per-channel captions + UTM link-back.
// Rows are is_draft=true so you review in Zernio before publishing.
//   npx tsx -r dotenv/config make-zernio-csv.ts
// Output: content/zernio-bulk-import.csv
import { writeFile } from 'fs/promises';
import { db, pool } from './server/db.js';
import { blogPosts } from './shared/schema.js';
import { eq, and, sql } from 'drizzle-orm';
import { generateSocialPack, withUtm } from './server/services/socialSnippets.js';
import { profilesFor } from './server/services/zernio.js';

const ORIGIN = 'https://www.newagefotografie.com';
const TZ = 'Europe/Vienna';
const PLATFORMS = process.env.ZERNIO_CHANNELS || 'facebook,instagram,googlebusiness,pinterest,linkedin';
const PROFILES = profilesFor(PLATFORMS) || 'REPLACE_WITH_PROFILE_IDS';

// Exact Zernio bulk-import column order.
const HEADER = ['post_content','platforms','profiles','schedule_time','schedule_time_twitter','schedule_time_instagram','schedule_time_facebook','schedule_time_youtube','schedule_time_linkedin','schedule_time_tiktok','schedule_time_threads','schedule_time_pinterest','schedule_time_reddit','schedule_time_bluesky','schedule_time_googlebusiness','schedule_time_telegram','tz','media_urls','is_draft','publish_now','use_queue','title','tags','hashtags','visibility','mentions','crossposting_enabled','metadata','youtube_title','youtube_description','youtube_first_comment','youtube_thumbnail_url','facebook_first_comment','linkedin_first_comment','instagram_content_type','instagram_collaborators','instagram_thumbnail_url','instagram_first_comment','tiktok_privacy','tiktok_allow_comments','tiktok_allow_duet','tiktok_allow_stitch','tiktok_commercial_content','tiktok_brand_partner','tiktok_organic_brand','tiktok_media_type','tiktok_description','tiktok_auto_add_music','twitter_thread_items','threads_thread_items','custom_content_twitter','custom_content_linkedin','custom_content_facebook','custom_content_instagram','custom_content_youtube','custom_content_tiktok','custom_content_threads','custom_content_googlebusiness','custom_content_telegram','custom_media_twitter','custom_media_linkedin','custom_media_facebook','custom_media_instagram','custom_media_youtube','custom_media_tiktok','custom_media_threads','custom_media_googlebusiness','custom_media_telegram','pinterest_title','pinterest_link','googlebusiness_cta_type','googlebusiness_cta_url','telegram_parse_mode','telegram_disable_web_page_preview','telegram_disable_notification','telegram_protect_content'];

const csvCell = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
const csvRow = (obj: Record<string, unknown>) => HEADER.map(h => csvCell(obj[h] ?? '')).join(',');

async function main() {
  // Published posts with a cover image (Instagram/Pinterest require media).
  const posts = await db.select().from(blogPosts)
    .where(and(eq(blogPosts.published, true), sql`${blogPosts.imageUrl} IS NOT NULL`));

  const rows: string[] = [HEADER.join(',')];
  let made = 0;
  for (const p of posts) {
    if (!p.imageUrl) continue;
    const url = `${ORIGIN}/blog/${p.slug}`;
    const media = [p.imageUrl, p.imageUrl2, p.imageUrl3].filter(Boolean).join(',');
    const pack = await generateSocialPack({ title: p.title, excerpt: p.excerpt || undefined, body: p.contentHtml || p.content || undefined, url });
    const tags = (p.tags || []).join(',');
    const hashtags = pack.hashtags.map(h => `#${h}`).join(',');

    rows.push(csvRow({
      post_content: pack.base,
      platforms: PLATFORMS,
      profiles: PROFILES,
      tz: TZ,
      media_urls: media,
      is_draft: 'true',           // review in Zernio before publishing
      publish_now: 'false',
      use_queue: 'false',
      title: p.title,
      tags,
      hashtags,
      visibility: 'public',
      crossposting_enabled: 'true',
      instagram_content_type: 'post',
      custom_content_facebook: `${pack.facebook}\n\n${withUtm(url, 'facebook')}`,
      custom_content_linkedin: `${pack.linkedin}\n\n${withUtm(url, 'linkedin')}`,
      custom_content_instagram: pack.instagram,                       // IG: no link in caption
      instagram_first_comment: `Mehr im Blog: ${withUtm(url, 'instagram')}`,
      custom_content_googlebusiness: pack.googlebusiness,
      pinterest_title: pack.pinterestTitle,
      pinterest_link: withUtm(url, 'pinterest'),
      googlebusiness_cta_type: 'LEARN_MORE',
      googlebusiness_cta_url: withUtm(url, 'googlebusiness'),
    }));
    made++;
    console.log(`✓ ${p.slug}`);
  }

  await writeFile('content/zernio-bulk-import.csv', rows.join('\n') + '\n', 'utf8');
  console.log(`\n✅ Wrote content/zernio-bulk-import.csv with ${made} posts (5 channels each).`);
  if (PROFILES === 'REPLACE_WITH_PROFILE_IDS') console.log('⚠️  Set your Zernio profile IDs (ZERNIO_PROFILES env or edit the CSV) before importing.');
  await pool.end();
  process.exit(0);
}
main().catch((e) => { console.error('❌', e); process.exit(1); });
