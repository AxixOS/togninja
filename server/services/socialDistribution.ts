// Shared helper: make sure a blog post has a Social Pack, generating + persisting one
// on demand. Used by the publish cron (auto path) and the admin distribute endpoint so
// the generation logic lives in exactly one place and matches the manual "Social Pack" button.
import { db } from '../db';
import { blogPosts } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { buildPreparedSocialPack, type PreparedSocialPack } from './socialSnippets.js';

interface PostLike {
  id: string;
  slug: string;
  title: string;
  excerpt?: string | null;
  content?: string | null;
  contentHtml?: string | null;
  tags?: string[] | null;
  ideaData?: any;
}

/**
 * Return the post's existing Social Pack, or generate + persist a fresh one.
 * Returns null when the post has no content yet (nothing to summarise).
 */
export async function ensureSocialPack(post: PostLike): Promise<PreparedSocialPack | null> {
  const ideaData: any = post.ideaData || {};
  if (ideaData.socialPack) return ideaData.socialPack as PreparedSocialPack;
  if (!post.contentHtml && !post.content) return null;

  const socialPack = await buildPreparedSocialPack({
    title: post.title,
    excerpt: post.excerpt || undefined,
    body: post.contentHtml || post.content || undefined,
    url: `${process.env.PUBLIC_SITE_URL || 'https://www.newagefotografie.com'}/blog/${post.slug}`,
    pillar: (post.tags || [])[0],
  });

  await db.update(blogPosts).set({ ideaData: { ...ideaData, socialPack } }).where(eq(blogPosts.id, post.id));
  return socialPack;
}
