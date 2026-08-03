import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';

const components = {
  h1: ({node, ...props}: any) => <h1 className="text-3xl font-bold mb-6 text-gray-900" {...props} />,
  h2: ({node, ...props}: any) => (
    <h2 className="text-2xl font-semibold mt-10 mb-4 border-l-4 border-fuchsia-500 pl-3 text-gray-900" {...props} />
  ),
  h3: ({node, ...props}: any) => <h3 className="text-xl font-medium mt-8 mb-3 text-gray-800" {...props} />,
  img: ({node, ...props}: any) => (
    <img className="w-full rounded-xl shadow-md my-6" loading="lazy" {...props} />
  ),
  ul: ({node, ...props}: any) => <ul className="list-disc pl-6 space-y-2 my-4" {...props} />,
  ol: ({node, ...props}: any) => <ol className="list-decimal pl-6 space-y-2 my-4" {...props} />,
  li: ({node, ...props}: any) => <li className="leading-relaxed" {...props} />,
  p: ({node, ...props}: any) => <p className="mb-4 leading-relaxed text-gray-700" {...props} />,
  a: ({node, ...props}: any) => <a className="text-violet-600 hover:text-violet-800 underline" {...props} />,
  blockquote: ({node, ...props}: any) => (
    <blockquote className="border-l-4 border-purple-500 bg-purple-50 p-4 my-6 rounded-r-lg italic" {...props} />
  ),
  strong: ({node, ...props}: any) => <strong className="font-bold text-gray-900" {...props} />,
  em: ({node, ...props}: any) => <em className="italic text-gray-800" {...props} />,
  code: ({node, inline, ...props}: any) => 
    inline ? (
      <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono" {...props} />
    ) : (
      <code className="block bg-gray-100 p-4 rounded-lg text-sm font-mono overflow-x-auto" {...props} />
    ),
};

interface BlogMarkdownProps {
  source: string;
  sectionLabels?: {
    outline?: string;
    keyTakeaways?: string;
    article?: string;
    socialPosts?: string;
    reviews?: string;
  };
}

export default function BlogMarkdown({ source, sectionLabels }: BlogMarkdownProps) {
  // Remove duplicate image patterns from content
  const cleanSource = source.replace(/!\[.*?\]\(.*?\)\s*\n?/g, (match, offset) => {
    // Keep only the first occurrence of each image
    const beforeMatch = source.substring(0, offset);
    if (beforeMatch.includes(match.trim())) {
      return ''; // Remove duplicate
    }
    return match; // Keep first occurrence
  });

  return (
    <article className="prose prose-fuchsia prose-lg max-w-none">
      <ReactMarkdown
        components={components}
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, rehypeSanitize]}
      >
        {cleanSource}
      </ReactMarkdown>
    </article>
  );
}