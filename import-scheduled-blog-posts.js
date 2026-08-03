/**
 * Blog Post Import Script
 * 
 * This script imports scheduled blog posts from the content file
 * into the database with proper scheduling.
 * 
 * Usage: node import-scheduled-blog-posts.js
 */

import { db } from './server/db/index.js';
import { blogPosts } from './shared/schema.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the content file
const contentFilePath = path.join(__dirname, 'content 2026.txt');
const contentData = JSON.parse(fs.readFileSync(contentFilePath, 'utf-8'));

// Define the blog posts with their scheduled dates
const scheduledPosts = [
  {
    key: '2025-11-04-homepage',
    scheduledFor: new Date('2025-11-04T09:00:00Z'),
  },
  {
    key: '2025-11-08-galerie',
    scheduledFor: new Date('2025-11-08T09:00:00Z'),
  },
  {
    key: '2025-11-12-fotoshootings',
    scheduledFor: new Date('2025-11-12T09:00:00Z'),
  },
  {
    key: '2025-11-17-preise',
    scheduledFor: new Date('2025-11-17T09:00:00Z'),
  },
  {
    key: '2025-11-21-blog',
    scheduledFor: new Date('2025-11-21T09:00:00Z'),
  },
  {
    key: '2025-12-02-die-besten-outfits-fuer-familienfotos-in-wien',
    scheduledFor: new Date('2025-12-02T09:00:00Z'),
  },
  {
    key: '2025-12-08-tipps-fuer-neugeborenenfotos-wien',
    scheduledFor: new Date('2025-12-08T09:00:00Z'),
  },
  {
    key: '2025-12-15-businessfotografie-wien-guide',
    scheduledFor: new Date('2025-12-15T09:00:00Z'),
  },
  {
    key: '2025-12-22-die-bedeutung-von-familienfotos',
    scheduledFor: new Date('2025-12-22T09:00:00Z'),
  },
  {
    key: '2026-01-06-wiener-familienfotoshooting-tipps',
    scheduledFor: new Date('2026-01-06T09:00:00Z'),
  },
];

// Function to generate slug from title
function generateSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 60);
}

// Function to convert markdown-style content to basic HTML
function convertToHtml(body) {
  let html = body;
  
  // Convert ## headings to h2
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  
  // Convert ### headings to h3
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  
  // Convert **bold** to <strong>
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  
  // Convert bullet lists
  html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');
  
  // Wrap paragraphs
  const lines = html.split('\n\n');
  html = lines.map(line => {
    if (line.trim() && !line.startsWith('<h') && !line.startsWith('<ul>') && !line.startsWith('<li>')) {
      return `<p>${line.trim()}</p>`;
    }
    return line;
  }).join('\n');
  
  return html;
}

// Function to extract excerpt from body
function extractExcerpt(body, maxLength = 280) {
  const plainText = body.replace(/[#*\-\[\]()]/g, '').replace(/\n+/g, ' ');
  const firstSentences = plainText.split('.').slice(0, 2).join('.');
  return firstSentences.length > maxLength 
    ? firstSentences.substring(0, maxLength) + '...'
    : firstSentences + '.';
}

async function importBlogPosts() {
  console.log('🚀 Starting blog post import...\n');
  
  let imported = 0;
  let skipped = 0;
  
  for (const post of scheduledPosts) {
    const contentItem = contentData[post.key];
    
    if (!contentItem) {
      console.log(`⚠️  Content not found for: ${post.key}`);
      skipped++;
      continue;
    }
    
    const slug = generateSlug(contentItem.title);
    
    // Check if post already exists
    const existingPosts = await db
      .select()
      .from(blogPosts)
      .where(blogPosts.slug.eq(slug))
      .limit(1);
    
    if (existingPosts.length > 0) {
      console.log(`⏭️  Skipping (already exists): ${contentItem.title}`);
      skipped++;
      continue;
    }
    
    const contentHtml = convertToHtml(contentItem.body);
    const excerpt = extractExcerpt(contentItem.body);
    
    const blogPostData = {
      title: contentItem.title,
      slug: slug,
      content: contentItem.body, // Plain text
      contentHtml: contentHtml, // HTML version
      excerpt: excerpt,
      imageUrl: null, // To be added later by user
      imageUrl2: null,
      imageUrl3: null,
      status: 'SCHEDULED',
      published: false,
      publishedAt: null,
      scheduledFor: post.scheduledFor,
      seoTitle: contentItem.seo?.title || contentItem.title,
      metaDescription: contentItem.seo?.description || excerpt,
      tags: contentItem.tags || ['photography', 'vienna'],
      authorId: null, // Will be set by admin
    };
    
    try {
      await db.insert(blogPosts).values(blogPostData);
      console.log(`✅ Imported: ${contentItem.title}`);
      console.log(`   📅 Scheduled for: ${post.scheduledFor.toISOString()}`);
      console.log(`   🔗 Slug: ${slug}\n`);
      imported++;
    } catch (error) {
      console.error(`❌ Failed to import: ${contentItem.title}`);
      console.error(`   Error: ${error.message}\n`);
      skipped++;
    }
  }
  
  console.log('\n📊 Import Summary:');
  console.log(`   ✅ Imported: ${imported}`);
  console.log(`   ⏭️  Skipped: ${skipped}`);
  console.log(`   📝 Total: ${scheduledPosts.length}`);
  console.log('\n✨ Import complete!');
  console.log('\n💡 Next steps:');
  console.log('   1. Run the database migration: psql $DATABASE_URL -f migrations/add-blog-additional-images.sql');
  console.log('   2. Log into admin panel at /admin/blog');
  console.log('   3. Add hero images and feature images to each post');
  console.log('   4. The cron job will auto-publish posts at their scheduled time\n');
}

// Run the import
importBlogPosts()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Import failed:', error);
    process.exit(1);
  });
