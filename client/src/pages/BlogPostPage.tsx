import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { proxyImage } from '../lib/imageProxy';
// Supabase removed - blog data now served via Neon database API
import { Calendar, ArrowLeft, Clock } from 'lucide-react';
// react-helmet-async (NOT legacy react-helmet): the app wraps routes in
// react-helmet-async's HelmetProvider, so the legacy package's tags were
// never managed by it — blog meta could silently fail to render.
import { Helmet } from 'react-helmet-async';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { SITE } from '../config/site';
import { useLanguage } from '../context/LanguageContext';

// Older posts store raw Markdown (contentHtml empty); newer ones store real HTML.
// Detect HTML so we render each correctly instead of dumping raw "##" markdown.
const looksLikeHtml = (s: string) =>
  /<(p|h[1-6]|ul|ol|li|div|img|table|strong|em|blockquote|br|span|a)[\s>/]/i.test(s);

// Cluster → pillar uplink (pillar/cluster SEO architecture): pick the pillar
// page that matches THIS post's topic so every article passes authority to the
// right money page, instead of the same generic list on every post.
interface PillarLink { to: string; label: string; }
const PILLARS: Array<{ match: RegExp; pillar: PillarLink; siblings: PillarLink[] }> = [
  { match: /hochzeit|braut|trauung|standesamt/i,
    pillar: { to: '/hochzeitsfotografie-wien/', label: 'Hochzeitsfotografie Wien' },
    siblings: [
      { to: '/schwangerschaftsfotos-wien/', label: 'Paar- & Babybauch-Shooting' },
      { to: '/gewerbliche-fotografie-wien/', label: 'Eventfotografie & mehr' },
    ] },
  { match: /neugeboren|newborn/i,
    pillar: { to: '/neugeborenenfotos-wien/', label: 'Neugeborenenfotos Wien' },
    siblings: [
      { to: '/babyfotos-wien/', label: 'Babyfotos Wien' },
      { to: '/familienfotos-wien/', label: 'Familienfotos Wien' },
    ] },
  { match: /schwanger|babybauch|maternity/i,
    pillar: { to: '/schwangerschaftsfotos-wien/', label: 'Schwangerschaftsfotos Wien' },
    siblings: [
      { to: '/neugeborenenfotos-wien/', label: 'Neugeborenenfotos Wien' },
      { to: '/familienfotos-wien/', label: 'Familienfotos Wien' },
    ] },
  { match: /\bbaby|babyfoto/i,
    pillar: { to: '/babyfotos-wien/', label: 'Babyfotos Wien (3–12 Monate)' },
    siblings: [
      { to: '/neugeborenenfotos-wien/', label: 'Neugeborenenfotos Wien' },
      { to: '/kinder-fotografie-wien/', label: 'Kinder-Fotografie Wien' },
    ] },
  { match: /kinder|kids/i,
    pillar: { to: '/kinder-fotografie-wien/', label: 'Kinder-Fotografie Wien' },
    siblings: [
      { to: '/familienfotos-wien/', label: 'Familienfotos Wien' },
      { to: '/babyfotos-wien/', label: 'Babyfotos Wien' },
    ] },
  { match: /business|bewerbung|linkedin|portrait|headshot|team/i,
    pillar: { to: '/business-portrait-wien/', label: 'Business Portraits Wien' },
    siblings: [
      { to: '/gewerbliche-fotografie-wien/', label: 'Gewerbliche Fotografie Wien' },
      { to: '/teamfotos-wien/', label: 'Teamfotos Wien' },
    ] },
  { match: /produkt|immobilie|event|firmen/i,
    pillar: { to: '/gewerbliche-fotografie-wien/', label: 'Gewerbliche Fotografie Wien' },
    siblings: [
      { to: '/business-portrait-wien/', label: 'Business Portraits Wien' },
      { to: '/teamfotos-wien/', label: 'Teamfotos Wien' },
    ] },
];
const DEFAULT_PILLAR = {
  pillar: { to: '/familienfotos-wien/', label: 'Familienfotos Wien' },
  siblings: [
    { to: '/babyfotos-wien/', label: 'Babyfotos Wien' },
    { to: '/schwangerschaftsfotos-wien/', label: 'Schwangerschaftsfotos Wien' },
  ],
};
function pillarForPost(post: { title?: string; slug?: string; excerpt?: string | null }) {
  const haystack = `${post.title || ''} ${post.slug || ''} ${post.excerpt || ''}`;
  return PILLARS.find((p) => p.match.test(haystack)) || DEFAULT_PILLAR;
}

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  contentHtml: string;
  imageUrl: string | null;
  imageUrl2?: string | null;
  imageUrl3?: string | null;
  videoUrl?: string | null;
  publishedAt: string;
  excerpt: string | null;
  author: {
    email: string;
  } | null;
}

// Turn a YouTube/Vimeo watch URL into an embeddable URL. Returns null for
// direct video files (.mp4 etc.), which render in a <video> element instead.
function getVideoEmbedUrl(url: string): string | null {
  if (!url) return null;
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const vimeo = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  return null;
}

interface RelatedPost {
  id: string;
  title: string;
  slug: string;
  imageUrl: string | null;
}

const BlogPostPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { language } = useLanguage();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [relatedPosts, setRelatedPosts] = useState<RelatedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (slug) {
      fetchPost(slug);
    }
    // Refetch when the language changes so the post is (re)translated server-side.
  }, [slug, language]);

  const fetchPost = async (postSlug: string) => {
    try {
      setLoading(true);

      const response = await fetch(`/api/blog/posts/${postSlug}?language=${language}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          setError('Blog post not found');
        } else {
          setError('Failed to load blog post');
        }
        return;
      }
      
      const data = await response.json();
      setPost(data);
      
      // Fetch related posts
      fetchRelatedPosts(data.id);
    } catch (err) {
      // console.error removed
      setError('Failed to load blog post. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const fetchRelatedPosts = async (currentPostId: string) => {
    try {
      const response = await fetch(`/api/blog/posts?published=true&limit=3&exclude=${currentPostId}&language=${language}`);
      
      if (response.ok) {
        const data = await response.json();
        setRelatedPosts(data.posts || []);
      }
    } catch (err) {
      // console.error removed
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
        </div>
      </Layout>
    );
  }

  if (error || !post) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-lg p-8 text-center">
            <h1 className="text-2xl font-bold text-gray-800 mb-4">
              {error || 'Blog post not found'}
            </h1>
            <p className="text-gray-600 mb-6">
              The blog post you're looking for doesn't exist or has been removed.
            </p>
            <Link
              to="/blog"
              className="inline-flex items-center text-purple-600 hover:text-purple-700"
            >
              <ArrowLeft size={16} className="mr-2" />
              Back to blog
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Helmet>
        <title>{`${post.title} | ${SITE.name} Blog`}</title>
        <meta name="description" content={post.excerpt || `Read about ${post.title}`} />
        <meta property="og:title" content={post.title} />
        <meta property="og:description" content={post.excerpt || `Read about ${post.title}`} />
        {post.imageUrl && <meta property="og:image" content={post.imageUrl} />}
        <meta property="og:type" content="article" />
        <link rel="canonical" href={`${SITE.url}/blog/${post.slug}`} />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            "headline": post.title,
            "image": post.imageUrl ? [post.imageUrl] : [],
            "datePublished": post.publishedAt,
            "dateModified": post.publishedAt,
            "author": {
              "@type": "Person",
              "name": SITE.name
            },
            "publisher": {
              "@type": "Organization",
              "name": SITE.name,
              "logo": {
                "@type": "ImageObject",
                "url": SITE.logo || `${SITE.url}/logo.png`
              }
            },
            "description": post.excerpt || `Read about ${post.title}`
          })}
        </script>
      </Helmet>

      <div className="container mx-auto px-4 py-8">
        <Link
          to="/blog"
          className="inline-flex items-center text-purple-600 hover:text-purple-700 mb-6"
        >
          <ArrowLeft size={16} className="mr-2" />
          Back to blog
        </Link>

        <div className="max-w-4xl mx-auto">
          {/* Post Header */}
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {post.title}
            </h1>
            
            <div className="flex flex-wrap items-center text-gray-600 mb-6">
              <div className="flex items-center mr-6">
                <Calendar size={16} className="mr-1" />
                <span>{formatDate(post.publishedAt)}</span>
              </div>
              
              {post.author && (
                <div className="flex items-center">
                  <span>By {post.author.email.split('@')[0]}</span>
                </div>
              )}
            </div>
          </div>
          
          {/* Cover Image */}
          {post.imageUrl && (
            <div className="mb-8">
              <img
                src={proxyImage(post.imageUrl, { w: 1400 })}
                alt={post.title}
                // max-h keeps a portrait ("Hochformat") cover from dominating the
                // article; landscape covers still fill the column width.
                className="mx-auto block w-auto max-w-full max-h-[80vh] rounded-xl shadow-lg mb-8"
                loading="eager"
                decoding="async"
                {...{ fetchpriority: 'high' }}
                onError={(e) => {
                  // Try the original URL once before showing the placeholder.
                  if (post.imageUrl && e.currentTarget.src !== post.imageUrl) {
                    e.currentTarget.src = post.imageUrl;
                    return;
                  }
                  const parent = e.currentTarget.parentElement;
                  if (parent) {
                    parent.innerHTML = `
                      <div class="w-full h-48 bg-gradient-to-br from-purple-100 to-purple-200 rounded-xl shadow-lg flex items-center justify-center">
                        <div class="text-center">
                          <svg class="w-16 h-16 text-purple-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2V4a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2z"></path>
                          </svg>
                          <p class="text-purple-600 font-medium">${post.title}</p>
                        </div>
                      </div>
                    `;
                  }
                }}
              />
            </div>
          )}

          {/* Optional video — YouTube/Vimeo embed or a direct uploaded clip */}
          {post.videoUrl && (
            <div className="mb-8">
              {getVideoEmbedUrl(post.videoUrl) ? (
                <div className="relative w-full overflow-hidden rounded-xl shadow-lg" style={{ paddingTop: '56.25%' }}>
                  <iframe
                    src={getVideoEmbedUrl(post.videoUrl)!}
                    title={post.title}
                    className="absolute inset-0 h-full w-full"
                    frameBorder={0}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    loading="lazy"
                  />
                </div>
              ) : (
                <video
                  src={post.videoUrl}
                  controls
                  playsInline
                  preload="metadata"
                  className="mx-auto block w-full max-w-full rounded-xl shadow-lg"
                />
              )}
            </div>
          )}

          {/* Post Content */}
          <div className="bg-white rounded-lg shadow-lg p-6 md:p-8 mb-8">
            {(post.contentHtml || post.content) ? (
              <div className="max-w-none">
                {/* Enhanced CSS for blog content */}
                <style dangerouslySetInnerHTML={{__html: `
                  .blog-post-content {
                    line-height: 1.8;
                    color: #374151;
                  }
                  .blog-post-content h1 {
                    font-size: 2.25rem;
                    font-weight: bold;
                    color: #1f2937;
                    margin: 2rem 0 1rem 0;
                    padding-bottom: 0.5rem;
                    border-bottom: 3px solid #a855f7;
                  }
                  .blog-post-content h2 {
                    font-size: 1.875rem;
                    font-weight: bold;
                    color: #1f2937;
                    margin: 2rem 0 1rem 0;
                    padding: 1rem 1.5rem;
                    border-left: 4px solid #a855f7;
                    background: linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%);
                    border-radius: 8px;
                    box-shadow: 0 2px 4px rgba(168, 85, 247, 0.1);
                  }
                  .blog-post-content h3 {
                    font-size: 1.5rem;
                    font-weight: 600;
                    color: #374151;
                    margin: 1.5rem 0 0.75rem 0;
                  }
                  .blog-post-content p {
                    margin: 1rem 0;
                    text-align: justify;
                    line-height: 1.7;
                  }
                  .blog-post-content ul, .blog-post-content ol {
                    margin: 1rem 0;
                    padding-left: 2rem;
                  }
                  .blog-post-content ul {
                    list-style-type: disc;
                  }
                  .blog-post-content li {
                    margin: 0.5rem 0;
                    line-height: 1.6;
                  }
                  .blog-post-content img {
                    margin: 2rem auto;
                    border-radius: 12px;
                    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
                    max-width: 100%;
                    height: auto;
                    display: block;
                  }
                  .blog-post-content blockquote {
                    border-left: 4px solid #a855f7;
                    background: #faf5ff;
                    padding: 1rem 1.5rem;
                    margin: 1.5rem 0;
                    border-radius: 0 8px 8px 0;
                    font-style: italic;
                  }
                  .blog-post-content strong {
                    font-weight: 700;
                    color: #1f2937;
                  }
                  .blog-post-content a {
                    color: #a855f7;
                    text-decoration: underline;
                    transition: color 0.2s ease;
                  }
                  .blog-post-content a:hover {
                    color: #9333ea;
                  }
                  .section-divider {
                    height: 1px;
                    background: linear-gradient(to right, transparent, #e5e7eb, transparent);
                    margin: 3rem 0;
                  }
                `}} />
                
                {/* Render content with strategically placed images */}
                {(() => {
                  const htmlContent = post.contentHtml || post.content;

                  // Markdown posts (no HTML tags): render via react-markdown so
                  // headings/lists/tables/bold display correctly instead of raw "##".
                  if (htmlContent && !looksLikeHtml(htmlContent)) {
                    return (
                      <>
                        <div className="blog-post-content prose prose-purple max-w-none">
                          <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                            {htmlContent}
                          </ReactMarkdown>
                        </div>
                        {post.imageUrl2 && (
                          <div className="my-8">
                            <img src={post.imageUrl2} alt={post.title} className="w-full rounded-xl shadow-2xl" loading="lazy" />
                          </div>
                        )}
                        {post.imageUrl3 && (
                          <div className="my-8">
                            <img src={post.imageUrl3} alt={post.title} className="w-full rounded-xl shadow-2xl" loading="lazy" />
                          </div>
                        )}
                      </>
                    );
                  }

                  // If no additional images, render normally
                  if (!post.imageUrl2 && !post.imageUrl3) {
                    return (
                      <div 
                        className="blog-post-content prose prose-purple max-w-none"
                        dangerouslySetInnerHTML={{ __html: htmlContent }}
                      />
                    );
                  }
                  
                  // Split content intelligently
                  const sections = htmlContent.split(/<h2/i);
                  
                  if (sections.length <= 1) {
                    // No H2 tags, fall back to rendering full content with images at bottom
                    return (
                      <>
                        <div 
                          className="blog-post-content prose prose-purple max-w-none"
                          dangerouslySetInnerHTML={{ __html: htmlContent }}
                        />
                        {post.imageUrl2 && (
                          <div className="my-8">
                            <img
                              src={post.imageUrl2}
                              alt="Feature image 2"
                              className="w-full rounded-xl shadow-2xl"
                              loading="lazy"
                            />
                          </div>
                        )}
                        {post.imageUrl3 && (
                          <div className="my-8">
                            <img
                              src={post.imageUrl3}
                              alt="Feature image 3"
                              className="w-full rounded-xl shadow-2xl"
                              loading="lazy"
                            />
                          </div>
                        )}
                      </>
                    );
                  }
                  
                  // Calculate split points
                  const totalSections = sections.length;
                  const firstThird = Math.max(1, Math.floor(totalSections / 3));
                  const midPoint = Math.max(2, Math.floor(totalSections / 2));
                  
                  // Reconstruct sections
                  const firstPart = sections.slice(0, firstThird).join('<h2');
                  const secondPart = sections.slice(firstThird, midPoint).map((s, i) => i === 0 ? '<h2' + s : s).join('<h2');
                  const thirdPart = sections.slice(midPoint).map((s, i) => i === 0 ? '<h2' + s : s).join('<h2');
                  
                  return (
                    <>
                      {/* First section */}
                      <div 
                        className="blog-post-content prose prose-purple max-w-none"
                        dangerouslySetInnerHTML={{ __html: firstPart }}
                      />
                      
                      {/* Feature Image 2 after first section */}
                      {post.imageUrl2 && (
                        <div className="my-8">
                          <img
                            src={post.imageUrl2}
                            alt="Feature image 2"
                            className="w-full rounded-xl shadow-2xl"
                            loading="lazy"
                          />
                        </div>
                      )}
                      
                      {/* Second section */}
                      {secondPart && (
                        <div 
                          className="blog-post-content prose prose-purple max-w-none"
                          dangerouslySetInnerHTML={{ __html: secondPart }}
                        />
                      )}
                      
                      {/* Feature Image 3 mid-content */}
                      {post.imageUrl3 && (
                        <div className="my-8">
                          <img
                            src={post.imageUrl3}
                            alt="Feature image 3"
                            className="w-full rounded-xl shadow-2xl"
                            loading="lazy"
                          />
                        </div>
                      )}
                      
                      {/* Third section */}
                      {thirdPart && (
                        <div 
                          className="blog-post-content prose prose-purple max-w-none"
                          dangerouslySetInnerHTML={{ __html: thirdPart }}
                        />
                      )}
                    </>
                  );
                })()}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-gray-400 mb-4">
                  <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                  </svg>
                </div>
                <h3 className="text-xl font-medium text-gray-700 mb-2">Content Coming Soon</h3>
                <p className="text-gray-600 mb-4">
                  {post.excerpt || 'This blog post is being prepared. Please check back soon for the full content.'}
                </p>
                <Link 
                  to="/blog" 
                  className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  <ArrowLeft size={16} className="mr-2" />
                  Back to Blog
                </Link>
              </div>
            )}
          </div>

          {/* Cluster → pillar uplink: this post's PRIMARY pillar first (topic-
              matched), two sibling services, then the conversion layer. */}
          {(() => {
            const { pillar, siblings } = pillarForPost(post);
            return (
              <div className="mt-10 bg-purple-50 border border-purple-100 rounded-xl p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Passendes Fotoshooting</h3>
                <Link
                  to={pillar.to}
                  className="block bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg px-5 py-3 mb-4 transition-colors"
                >
                  → {pillar.label}: Infos, Pakete & Beispiele
                </Link>
                <ul className="grid sm:grid-cols-3 gap-3 mb-4">
                  {siblings.map((s) => (
                    <li key={s.to}>
                      <Link to={s.to} className="text-purple-700 hover:text-purple-900 font-medium underline underline-offset-2">
                        {s.label}
                      </Link>
                    </li>
                  ))}
                  <li>
                    <Link to="/vouchers" className="text-purple-700 hover:text-purple-900 font-medium underline underline-offset-2">
                      Geschenkgutscheine
                    </Link>
                  </li>
                </ul>
                <p className="text-gray-700">
                  <Link to="/preise/" className="text-purple-700 hover:text-purple-900 font-semibold underline underline-offset-2">Preise ansehen</Link>
                  <span className="mx-2 text-gray-400">·</span>
                  <Link to="/kundenstimmen/" className="text-purple-700 hover:text-purple-900 font-semibold underline underline-offset-2">4.9★ Kundenstimmen</Link>
                  <span className="mx-2 text-gray-400">·</span>
                  <Link to="/kontakt" className="text-purple-700 hover:text-purple-900 font-semibold underline underline-offset-2">Termin anfragen</Link>
                </p>
              </div>
            );
          })()}

          {/* Related Posts */}
          {relatedPosts.length > 0 && (
            <div className="mt-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Related Posts</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {relatedPosts.map(relatedPost => (
                  <Link
                    key={relatedPost.id}
                    to={`/blog/${relatedPost.slug}`}
                    className="bg-white rounded-lg shadow-lg overflow-hidden transform transition-transform hover:-translate-y-1"
                  >
                    <div className="h-40 overflow-hidden">
                      {relatedPost.imageUrl ? (
                        <img
                          src={relatedPost.imageUrl}
                          alt={relatedPost.title}
                          className="w-full h-full object-cover"
                          loading="lazy"
                          onError={(e) => {
                            // console.error removed
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.parentElement!.classList.add('bg-gray-200');
                            e.currentTarget.parentElement!.classList.add('flex');
                            e.currentTarget.parentElement!.classList.add('items-center');
                            e.currentTarget.parentElement!.classList.add('justify-center');
                          }}
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                          <Clock size={24} className="text-gray-400" />
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="font-bold text-gray-900 mb-2 line-clamp-2">
                        {relatedPost.title}
                      </h3>
                      <span className="text-purple-600 text-sm">Read more</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default BlogPostPage;