// MarkdownCopySlot.tsx
// Safe content injection component for service pages
// Uses existing BlogMarkdown renderer, converts H1 to H2 to avoid duplicate H1s

import React from 'react';
import BlogMarkdown from './BlogMarkdown';

interface MarkdownCopySlotProps {
  content: string;
  className?: string;
}

/**
 * Converts any H1 (# heading) in markdown to H2 (## heading)
 * to ensure only one H1 per page (the hero H1)
 */
function convertH1ToH2(markdown: string): string {
  // Replace lines starting with single # (but not ## or more) with ##
  return markdown.replace(/^# /gm, '## ');
}

/**
 * Safe copy slot for injecting markdown content into service pages
 * - Wraps content with data-ia-copy-slot attribute for identification
 * - Converts H1 to H2 to maintain single H1 per page
 * - Uses existing BlogMarkdown component for consistent styling
 */
export default function MarkdownCopySlot({ content, className = '' }: MarkdownCopySlotProps) {
  const processedContent = convertH1ToH2(content);
  
  return (
    <section className={`py-12 bg-white ${className}`}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div data-ia-copy-slot="true" className="prose prose-lg max-w-none">
          <BlogMarkdown source={processedContent} />
        </div>
      </div>
    </section>
  );
}
