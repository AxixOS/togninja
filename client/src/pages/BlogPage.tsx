import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Layout from '../components/layout/Layout';
// Supabase removed - blog data now served via Neon database API
import { Calendar, ChevronRight, Tag, Search, Loader2 } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useManualPageContent } from '../hooks/useManualPageContent';
import { SEOHead } from '../components/SEO/SEOHead';
import { Helmet } from 'react-helmet-async';
import { SITE } from '../config/site';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  content: string;
  contentHtml?: string;
  imageUrl?: string;
  published: boolean;
  authorId: string;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
  tags?: string[];
}

interface BlogTag {
  id: string;
  name: string;
  slug: string;
}

// Newsletter signup form component
function NewsletterForm({ language }: { language: string }) {
  // Its copy is now translation keys, so it needs t() of its own — the page-scoped
  // t() lives in the BlogPage component below and is not in scope here.
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      setStatus('error');
      setMessage(t('blog.pleaseEnterAValid'));
      return;
    }
    setStatus('loading');
    try {
      const res = await fetch('/api/newsletter/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStatus('success');
        setMessage(data.message || (t('blog.thankYouCheckYour')));
        setEmail('');
      } else {
        setStatus('error');
        setMessage(data.error || (t('blog.anErrorOccurred')));
      }
    } catch {
      setStatus('error');
      setMessage(t('blog.anErrorOccurredPlease'));
    }
  };

  if (status === 'success') {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
        <p className="text-green-700 font-medium">{message}</p>
      </div>
    );
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <input
        type="email"
        value={email}
        onChange={(e) => { setEmail(e.target.value); if (status === 'error') setStatus('idle'); }}
        placeholder={t('blog.yourEmailAddress')}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-purple-600"
        disabled={status === 'loading'}
      />
      {status === 'error' && <p className="text-red-600 text-sm">{message}</p>}
      <button
        type="submit"
        disabled={status === 'loading'}
        className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white font-medium py-2 px-4 rounded-lg transition-colors"
      >
        {status === 'loading'
          ? (t('blog.sending'))
          : (t('blog.subscribe'))}
      </button>
    </form>
  );
}

const BlogPage: React.FC = () => {
  const { language } = useLanguage();
  const t = useManualPageContent('blog');
  const [searchParams, setSearchParams] = useSearchParams();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [tags, setTags] = useState<BlogTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalPosts, setTotalPosts] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // German → English tag translations (tags are stored in German in the DB)
  const TAG_DE_TO_EN: Record<string, string> = {
    // Capitalized SEO tags
    'Ablauf Familienfotos': 'Family Photo Process',
    'Baby Shooting Wien': 'Baby Photoshoot Vienna',
    'Babybauch Fotoshooting Wien': 'Baby Bump Photoshoot Vienna',
    'Babybauch Shooting Wien': 'Baby Bump Shoot Vienna',
    'Babyfotos Wien': 'Baby Photos Vienna',
    'Business Fotograf Wien': 'Business Photographer Vienna',
    'Business Shooting Wien': 'Business Shooting Vienna',
    'Businessfotos Wien': 'Business Photos Vienna',
    'Businessportraits Wien': 'Business Portraits Vienna',
    'Corporate Fotos Wien': 'Corporate Photos Vienna',
    'Familienfotograf Wien': 'Family Photographer Vienna',
    'Familienfotografie Tipps': 'Family Photography Tips',
    'Familienfotos Studio': 'Studio Family Photos',
    'Familienfotos Vergleich': 'Family Photos Comparison',
    'Familienfotos Wien': 'Family Photos Vienna',
    'Familienfotoshooting Wien': 'Family Photoshoot Vienna',
    'Familienportraits Wien': 'Family Portraits Vienna',
    'Farben Familienfoto': 'Family Photo Colors',
    'Firmenfotografie Wien': 'Corporate Photography Vienna',
    'Fotoshooting Wien': 'Photoshoot Vienna',
    'Fotostudio Wien': 'Photo Studio Vienna',
    'Headshots Wien': 'Headshots Vienna',
    'Kleidung Familienfotos': 'Family Photo Outfits',
    'Kleidung Schwangerschaftsshooting': 'Maternity Shoot Outfits',
    'Maternity Fotos Wien': 'Maternity Photos Vienna',
    'Maternity Tipps': 'Maternity Tips',
    'Neugeborenenfotograf Wien': 'Newborn Photographer Vienna',
    'Neugeborenenfotos Wien': 'Newborn Photos Vienna',
    'Newborn Fotografie Tipps': 'Newborn Photography Tips',
    'Newborn Shooting Wien': 'Newborn Shoot Vienna',
    'Outdoor Familienfotos Wien': 'Outdoor Family Photos Vienna',
    'Outfits Familienfotos': 'Family Photo Outfits',
    'Preise Familienfotos': 'Family Photo Prices',
    'Profilfoto Tipps': 'Profile Photo Tips',
    'Schwangerschaft Fotografie': 'Pregnancy Photography',
    'Schwangerschaftsfotograf Wien': 'Maternity Photographer Vienna',
    'Schwangerschaftsfotos Wien': 'Maternity Photos Vienna',
    'Studio Familienfotos Wien': 'Studio Family Photos Vienna',
    'Studio oder Outdoor Wien': 'Studio or Outdoor Vienna',
    'Styling für Fotoshootings': 'Photoshoot Styling',
    'Teamfotos Wien': 'Team Photos Vienna',
    'Vorbereitung Fotoshooting': 'Photoshoot Preparation',
    'Vorbereitung Neugeborenenfotos': 'Newborn Photo Preparation',
    'Wien Familienfotograf': 'Vienna Family Photographer',
    'Wien Fotograf': 'Vienna Photographer',
    'Wien Fotograf Business': 'Vienna Business Photographer',
    'Wien Fotograf Newborn': 'Vienna Newborn Photographer',
    // Lowercase tags
    'ablauf': 'process',
    'bildauswahl': 'image selection',
    'bildbearbeitung': 'photo editing',
    'druck': 'print',
    'emotionen': 'emotions',
    'erfahrung': 'experience',
    'erinnerungen': 'memories',
    'fallstudie': 'case study',
    'familie': 'family',
    'familienfotos': 'family photos',
    'familienfotoshooting': 'family photoshoot',
    'farben': 'colors',
    'fotografie philosophie': 'photography philosophy',
    'fotogutschein': 'photo voucher',
    'fotoshooting': 'photoshoot',
    'fotoshooting dauer': 'photoshoot duration',
    'fotoshooting erlebnis': 'photoshoot experience',
    'fotoshooting preise': 'photoshoot prices',
    'geschenk': 'gift',
    'großeltern': 'grandparents',
    'großfamilie': 'large family',
    'haustiere': 'pets',
    'ideen': 'ideas',
    'kinder': 'children',
    'kleidung': 'clothing',
    'kosten': 'costs',
    'mehrgenerationen': 'multi-generational',
    'natürlich': 'natural',
    'outfit fotoshooting': 'photoshoot outfit',
    'philosophie': 'philosophy',
    'planung': 'planning',
    'retusche': 'retouching',
    'studiofotografie': 'studio photography',
    'unternehmensfotografie': 'corporate photography',
    'vergleich': 'comparison',
    'vertrauen': 'trust',
    'vorbereitung': 'preparation',
    'wandbild': 'wall art',
    'wandbilder': 'wall art',
    'wert': 'value',
    'wien': 'Vienna',
    'zeit': 'time',
  };

  const translateTag = (tagName: string): string => {
    if (language === 'en' && TAG_DE_TO_EN[tagName]) return TAG_DE_TO_EN[tagName];
    return tagName;
  };
  
  // Get query parameters
  const page = parseInt(searchParams.get('page') || '1');
  const tag = searchParams.get('tag') || '';
  const search = searchParams.get('search') || '';
  
  useEffect(() => {
    fetchData();
  }, [page, tag, search]);

  // The imperative title/description/og block that used to live here is gone. It
  // duplicated the SEOHead below and then overwrote it, so the page ended up titled
  // "Blog - Photography Tips & Inspiration | New Age Photography Vienna" whatever
  // SEOHead had set. Its cleanup was worse: navigating AWAY from the blog set
  // document.title to "New Age Photography - Family Photographer Vienna", stamping
  // the origin studio's name onto whichever page the visitor went to next.
  //
  // SEOHead is the single owner of this page's head now.

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Build query parameters
      const params = new URLSearchParams();
      params.append('published', 'true');
      params.append('language', language);
      if (tag) params.append('tag', tag);
      if (search) params.append('search', search);
      params.append('page', page.toString());
      params.append('limit', '10');
      
      // Fetch posts from our backend API
      const response = await fetch(`/api/blog/posts?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch blog posts');
      }
      
      const data = await response.json();
      const postsData = data.posts || [];
      

      
      setPosts(postsData);
      setTotalPosts(data.count || 0);
      setTotalPages(Math.ceil((data.count || 0) / 10));
      
      // For now, we'll handle tags separately since we don't have a tags API yet
      if (tags.length === 0 && postsData.length > 0) {
        // Extract unique tags from posts
        const allTags: string[] = postsData.flatMap((post: any) => post.tags || []);
        const uniqueTags = Array.from(new Set(allTags)).map((tag: string) => ({ id: tag, name: tag, slug: tag }));
        setTags(uniqueTags);
      }
    } catch (err) {
      // console.error removed
      setError('Failed to load blog posts. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSearchParams = new URLSearchParams(searchParams);
    if (e.target.value) {
      newSearchParams.set('search', e.target.value);
    } else {
      newSearchParams.delete('search');
    }
    newSearchParams.set('page', '1'); // Reset to first page on new search
    setSearchParams(newSearchParams);
  };
  
  const handleTagClick = (tagSlug: string) => {
    const newSearchParams = new URLSearchParams(searchParams);
    if (tagSlug === tag) {
      newSearchParams.delete('tag');
    } else {
      newSearchParams.set('tag', tagSlug);
    }
    newSearchParams.set('page', '1'); // Reset to first page on tag change
    setSearchParams(newSearchParams);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <Layout>
      <SEOHead
        title={language === 'de' ? `Fotografie Blog | ${SITE.name}` : `Photography Blog | ${SITE.name}`}
        description={t('blog.tipsInspirationAndNews')}
        keywords={t('blog.photographyBlogViennaPhotoshoot')}
        canonical="/blog/"
        ogImage={undefined}
      />
      
      <Helmet>
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Blog",
            "name": `${SITE.name} Blog`,
            "description": language === 'de' ? "Fotografie-Tipps, Behind-the-Scenes und Inspiration für Fotoshootings in Wien" : "Photography tips, behind-the-scenes and inspiration for photoshoots in Vienna",
            "url": "https://newagefotografie.at/blog/",
            "publisher": {
              "@type": "Organization",
              "name": SITE.name,
              "logo": {
                "@type": "ImageObject",
                "url": "https://newagefotografie.at/logo.png"
              }
            },
            "inLanguage": language === 'de' ? "de-AT" : "en",
            "blogPost": posts.slice(0, 5).map(post => ({
              "@type": "BlogPosting",
              "headline": post.title,
              "description": post.excerpt || post.content?.substring(0, 160),
              "image": post.imageUrl || undefined,
              "datePublished": post.publishedAt || post.createdAt,
              "dateModified": post.updatedAt,
              "author": {
                "@type": "Organization",
                "name": SITE.name
              },
              "publisher": {
                "@type": "Organization",
                "name": SITE.name,
                "logo": {
                  "@type": "ImageObject",
                  "url": "https://newagefotografie.at/logo.png"
                }
              },
              "mainEntityOfPage": {
                "@type": "WebPage",
                "@id": `https://newagefotografie.at/blog/${post.slug}`
              }
            }))
          })}
        </script>

        {/* Additive FAQPage schema – mirrors visible FAQ below */}
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: (language === 'de' ? [
              { q: 'Was soll ich für ein Familienfotoshooting anziehen?', a: 'Neutrale Töne und abgestimmte Outfits wirken bei zeitlosen Familienportraits in Wien am besten.' },
              { q: 'Wann ist der beste Zeitpunkt für ein Neugeborenen-Shooting?', a: 'Ideal sind die ersten 10–14 Tage nach der Geburt für natürliche, entspannte Posen.' },
              { q: 'Bieten Sie Studio- und Outdoor-Fotografie an?', a: 'Ja, je nach Wunsch bieten wir sowohl Studio- als auch Outdoor-Fotoshootings an.' }
            ] : [
              { q: 'What should I wear for a family photoshoot?', a: 'Neutral tones and coordinated outfits work best for timeless family portraits in Vienna.' },
              { q: 'When is the best time for a newborn photoshoot?', a: 'The ideal time is within the first 10–14 days after birth for natural, relaxed poses.' },
              { q: 'Do you offer studio and outdoor photography?', a: 'Yes, we offer both studio and outdoor photoshoots depending on your preference.' }
            ]).map(({ q, a }) => ({
              '@type': 'Question',
              name: q,
              acceptedAnswer: { '@type': 'Answer', text: a }
            }))
          })}
        </script>
      </Helmet>

      {/* Hero Section */}
      <section className="bg-gradient-to-r from-purple-600 to-purple-800 py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              {t('blog.title')}
            </h1>
            <p className="text-purple-100 text-lg">
              {t('blog.subtitle')}
            </p>
          </div>
        </div>
      </section>

      {/* Additive SEO intro + topic cluster – between hero and blog grid */}
      <section className="bg-white border-b border-gray-100" aria-labelledby="blog-intro-heading">
        <div className="container mx-auto px-4 py-10 max-w-5xl">
          <h2 id="blog-intro-heading" className="text-2xl md:text-3xl font-bold text-purple-900 mb-3">
            {t('blog.photographyTipsIdeasGuides')}
          </h2>
          <p className="text-gray-700 leading-relaxed mb-8">
            {language === 'de' ? (
              <>
                Unser Fotografie-Blog bietet Experten-Tipps rund um{' '}
                <Link to="/fotoshootings" className="text-purple-700 underline hover:text-purple-900">Familienfotoshootings</Link>,{' '}
                <Link to="/fotoshootings" className="text-purple-700 underline hover:text-purple-900">Neugeborenenfotografie</Link>, Schwangerschafts-Sessions und{' '}
                <Link to="/fotoshootings" className="text-purple-700 underline hover:text-purple-900">professionelle Headshots</Link>{' '}in Wien. Ob Sie sich auf Ihr erstes Shooting vorbereiten oder Inspiration suchen – hier finden Sie praxisnahe Tipps und Beispiele aus unserem Studio.
              </>
            ) : (
              <>
                Our photography blog covers expert advice on{' '}
                <Link to="/fotoshootings" className="text-purple-700 underline hover:text-purple-900">family photoshoots</Link>,{' '}
                <Link to="/fotoshootings" className="text-purple-700 underline hover:text-purple-900">newborn photography</Link>, maternity sessions, and{' '}
                <Link to="/fotoshootings" className="text-purple-700 underline hover:text-purple-900">professional headshots</Link>{' '}in Vienna. Whether you're preparing for your first shoot or looking for inspiration, you'll find practical tips and real examples from our studio.
              </>
            )}
          </p>

          <h2 className="text-xl md:text-2xl font-bold text-purple-900 mb-4">
            {t('blog.explorePhotographyTopics')}
          </h2>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <li>
              <Link to="/fotoshootings" className="block py-2 px-4 rounded-lg text-purple-700 hover:bg-purple-50 hover:text-purple-900 font-medium transition-colors">
                {t('blog.familyPhotographyTips')}
              </Link>
            </li>
            <li>
              <Link to="/fotoshootings" className="block py-2 px-4 rounded-lg text-purple-700 hover:bg-purple-50 hover:text-purple-900 font-medium transition-colors">
                {t('blog.newbornPhotographyAdvice')}
              </Link>
            </li>
            <li>
              <Link to="/fotoshootings" className="block py-2 px-4 rounded-lg text-purple-700 hover:bg-purple-50 hover:text-purple-900 font-medium transition-colors">
                {t('blog.maternityPhotoshootIdeas')}
              </Link>
            </li>
            <li>
              <Link to="/fotoshootings" className="block py-2 px-4 rounded-lg text-purple-700 hover:bg-purple-50 hover:text-purple-900 font-medium transition-colors">
                {t('blog.businessHeadshotGuides')}
              </Link>
            </li>
          </ul>
        </div>
      </section>

      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Search Bar */}
            <div className="mb-8 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder={t('blog.searchPlaceholder')}
                value={search}
                onChange={handleSearchChange}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>

            {loading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 text-purple-600 animate-spin" />
                <span className="ml-2 text-gray-600">{t('blog.loadingPosts')}</span>
              </div>
            ) : error ? (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            ) : posts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {posts.map(post => (
                  <article 
                    key={post.id}
                    className="bg-white rounded-lg shadow-md overflow-hidden transition-transform hover:shadow-lg hover:-translate-y-1"
                  >
                    <Link to={`/blog/${post.slug}`} className="block aspect-[14/9] overflow-hidden bg-gray-100">
                      {post.imageUrl ? (
                        <img 
                          src={post.imageUrl} 
                          alt={post.title}
                          className="w-full h-full object-contain transition-transform hover:scale-105"
                          loading="lazy"
                          onError={(e) => {
                            // console.error removed
                            // Hide broken image and show placeholder
                            e.currentTarget.style.display = 'none';
                            const parent = e.currentTarget.parentElement;
                            if (parent && !parent.querySelector('.placeholder-shown')) {
                              parent.innerHTML = `
                                <div class="placeholder-shown w-full h-full bg-gradient-to-br from-purple-100 to-purple-200 flex items-center justify-center">
                                  <div class="text-center">
                                    <svg class="w-12 h-12 text-purple-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                                    </svg>
                                    <p class="text-purple-600 text-sm font-medium">${post.title.substring(0, 30)}...</p>
                                  </div>
                                </div>
                              `;
                            }
                          }}
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-purple-100 to-purple-200 flex items-center justify-center">
                          <div className="text-center">
                            <svg className="w-12 h-12 text-purple-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                            </svg>
                            <p className="text-purple-600 text-sm font-medium">{post.title.substring(0, 30)}...</p>
                          </div>
                        </div>
                      )}
                    </Link>
                    
                    <div className="p-6">
                      {post.tags && post.tags.length > 0 && (
                        <div className="flex items-center mb-3">
                          <Tag size={16} className="text-purple-600 mr-2" />
                          <div className="flex flex-wrap gap-2">
                            {post.tags.map((tagName, index) => {
                              const tagObj = tags.find(t => t.name === tagName);
                              return tagObj ? (
                                <span 
                                  key={index}
                                  className="text-sm text-purple-600 cursor-pointer hover:text-purple-800"
                                  onClick={() => handleTagClick(tagObj.slug)}
                                >
                                  {translateTag(tagName)}
                                  {index < post.tags!.length - 1 && ", "}
                                </span>
                              ) : null;
                            })}
                          </div>
                        </div>
                      )}
                      
                      <h2 className="text-xl font-bold text-gray-800 mb-2 line-clamp-2">
                        <Link to={`/blog/${post.slug}`} className="hover:text-purple-600 transition-colors">
                          {post.title}
                        </Link>
                      </h2>
                      
                      {post.excerpt && (
                        <p className="text-gray-600 mb-4 line-clamp-3">
                          {post.excerpt}
                        </p>
                      )}
                      
                      <div className="flex flex-wrap items-center text-sm text-gray-500 mb-3 gap-4">
                        {post.publishedAt && (
                          <div className="flex items-center">
                            <Calendar size={14} className="mr-1" />
                            {formatDate(post.publishedAt)}
                          </div>
                        )}
                      </div>
                      
                      <Link 
                        to={`/blog/${post.slug}`}
                        className="text-purple-600 hover:text-purple-800 font-medium text-sm inline-flex items-center"
                      >
                        {t('blog.readMore')}
                        <ChevronRight size={16} className="ml-1" />
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-lg p-8 text-center">
                <h2 className="text-xl font-semibold text-gray-800 mb-2">{t('blog.noPostsFound')}</h2>
                <p className="text-gray-600 mb-4">
                  {search || tag 
                    ? t('blog.noPostsMatchCriteria')
                    : t('blog.noPostsYet')}
                </p>
                {(search || tag) && (
                  <button
                    onClick={() => {
                      setSearchParams(new URLSearchParams());
                    }}
                    className="text-purple-600 hover:text-purple-700 font-medium"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-8 flex justify-center">
                <nav className="inline-flex rounded-md shadow">
                  <button
                    onClick={() => {
                      if (page > 1) {
                        const newSearchParams = new URLSearchParams(searchParams);
                        newSearchParams.set('page', (page - 1).toString());
                        setSearchParams(newSearchParams);
                      }
                    }}
                    disabled={page === 1}
                    className={`px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-l-md hover:bg-gray-50 ${
                      page === 1 ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    Previous
                  </button>
                  
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => (
                    <button
                      key={pageNum}
                      onClick={() => {
                        const newSearchParams = new URLSearchParams(searchParams);
                        newSearchParams.set('page', pageNum.toString());
                        setSearchParams(newSearchParams);
                      }}
                      className={`px-4 py-2 text-sm font-medium ${
                        pageNum === page
                          ? 'bg-purple-600 text-white border border-purple-600'
                          : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  ))}
                  
                  <button
                    onClick={() => {
                      if (page < totalPages) {
                        const newSearchParams = new URLSearchParams(searchParams);
                        newSearchParams.set('page', (page + 1).toString());
                        setSearchParams(newSearchParams);
                      }
                    }}
                    disabled={page === totalPages}
                    className={`px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-r-md hover:bg-gray-50 ${
                      page === totalPages ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    Next
                  </button>
                </nav>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            {/* Tags */}
            <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
              <h2 className="text-xl font-bold text-gray-800 mb-4">{t('blog.categories')}</h2>
              <ul className="space-y-2">
                <li>
                  <button
                    onClick={() => handleTagClick('')}
                    className={`flex items-center text-gray-600 hover:text-purple-600 transition-colors ${
                      tag === '' ? 'text-purple-600 font-medium' : ''
                    }`}
                  >
                    <ChevronRight size={16} className="mr-2" />
                    {t('blog.allCategories')}
                  </button>
                </li>
                {tags.map((tagItem) => (
                  <li key={tagItem.id}>
                    <button
                      onClick={() => handleTagClick(tagItem.slug)}
                      className={`flex items-center text-gray-600 hover:text-purple-600 transition-colors ${
                        tag === tagItem.slug ? 'text-purple-600 font-medium' : ''
                      }`}
                    >
                      <ChevronRight size={16} className="mr-2" />
                      {translateTag(tagItem.name)}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Newsletter Signup */}
            <div className="bg-purple-50 rounded-lg shadow-lg p-6 mb-8">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Newsletter</h2>
              <p className="text-gray-600 mb-4">
                {t('blog.stayUpdatedWithOur')}
              </p>
              <NewsletterForm language={language} />
            </div>

            {/* Popular Services */}
            <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
              <h2 className="text-xl font-bold text-gray-800 mb-4">{t('blog.popularServices')}</h2>
              <ul className="space-y-3">
                <li>
                  <Link to="/fotoshootings" className="flex items-center text-gray-600 hover:text-purple-600 transition-colors">
                    <ChevronRight size={16} className="mr-2 text-purple-600" />
                    {t('blog.familyPhotosVienna')}
                  </Link>
                </li>
                <li>
                  <Link to="/fotoshootings" className="flex items-center text-gray-600 hover:text-purple-600 transition-colors">
                    <ChevronRight size={16} className="mr-2 text-purple-600" />
                    {t('blog.newbornPhotos')}
                  </Link>
                </li>
                <li>
                  <Link to="/fotoshootings" className="flex items-center text-gray-600 hover:text-purple-600 transition-colors">
                    <ChevronRight size={16} className="mr-2 text-purple-600" />
                    {t('blog.babyPhotosVienna')}
                  </Link>
                </li>
                <li>
                  <Link to="/fotoshootings" className="flex items-center text-gray-600 hover:text-purple-600 transition-colors">
                    <ChevronRight size={16} className="mr-2 text-purple-600" />
                    Business Portraits
                  </Link>
                </li>
                <li>
                  <Link to="/fotoshootings" className="flex items-center text-gray-600 hover:text-purple-600 transition-colors">
                    <ChevronRight size={16} className="mr-2 text-purple-600" />
                    {t('blog.weddingPhotography')}
                  </Link>
                </li>
              </ul>
            </div>

            {/* Voucher CTA */}
            <div className="bg-gradient-to-br from-purple-600 to-purple-800 rounded-lg shadow-lg p-6 text-white">
              <h2 className="text-xl font-bold mb-3">{t('blog.giftIdea')}</h2>
              <p className="text-purple-100 mb-4 text-sm">
                {t('blog.giveUnforgettableMomentsWith')}
              </p>
              <Link 
                to="/vouchers" 
                className="inline-block bg-white text-purple-600 px-4 py-2 rounded-lg font-medium hover:bg-purple-50 transition-colors"
              >
                {t('blog.discoverVouchers')}
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Additive: Plan your photoshoot internal link block */}
      <section className="bg-gray-50 border-t border-gray-100" aria-labelledby="blog-plan-heading">
        <div className="container mx-auto px-4 py-10 max-w-4xl">
          <h3 id="blog-plan-heading" className="text-xl md:text-2xl font-bold text-purple-900 mb-3">
            {t('blog.planYourPhotoshootIn')}
          </h3>
          <p className="text-gray-700 leading-relaxed">
            {language === 'de' ? (
              <>
                Nach unseren Fotografie-Tipps geht's weiter: Sehen Sie unsere{' '}
                <Link to="/preise" className="text-purple-700 underline hover:text-purple-900">Preise</Link>, stöbern Sie im{' '}
                <Link to="/portfolio" className="text-purple-700 underline hover:text-purple-900">Portfolio</Link>{' '}oder{' '}
                <Link to="/kontakt" className="text-purple-700 underline hover:text-purple-900">kontaktieren Sie uns</Link>, um Ihre Session zu buchen.
              </>
            ) : (
              <>
                After exploring our photography tips, take the next step by viewing our{' '}
                <Link to="/preise" className="text-purple-700 underline hover:text-purple-900">pricing options</Link>, browsing our{' '}
                <Link to="/portfolio" className="text-purple-700 underline hover:text-purple-900">portfolio</Link>, or{' '}
                <Link to="/kontakt" className="text-purple-700 underline hover:text-purple-900">contacting us</Link>{' '}to book your session.
              </>
            )}
          </p>
        </div>
      </section>

      {/* Additive: FAQ section */}
      <section className="bg-white border-t border-gray-100" aria-labelledby="blog-faq-heading">
        <div className="container mx-auto px-4 py-12 max-w-3xl">
          <h2 id="blog-faq-heading" className="text-2xl md:text-3xl font-bold text-purple-900 mb-6 text-center">
            {t('blog.frequentlyAskedQuestionsAbout')}
          </h2>
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-purple-900 mb-2">
                {t('blog.whatShouldIWear')}
              </h3>
              <p className="text-gray-700">
                {t('blog.neutralTonesAndCoordinated')}
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-purple-900 mb-2">
                {t('blog.whenIsTheBest')}
              </h3>
              <p className="text-gray-700">
                {t('blog.theIdealTimeIs')}
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-purple-900 mb-2">
                {t('blog.doYouOfferStudio')}
              </h3>
              <p className="text-gray-700">
                {t('blog.yesWeOfferBoth')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Additive: pre-footer CTA */}
      <section className="bg-purple-50/40 border-t border-gray-100">
        <div className="container mx-auto px-4 py-8 max-w-3xl text-center">
          <p className="text-gray-700">
            {language === 'de' ? (
              <>
                Bereit für Ihre eigenen professionellen Fotos? Sehen Sie unsere{' '}
                <Link to="/preise" className="text-purple-700 underline hover:text-purple-900 font-medium">Pakete</Link>{' '}oder{' '}
                <Link to="/kontakt" className="text-purple-700 underline hover:text-purple-900 font-medium">kontaktieren Sie uns</Link>, um Ihre Session zu planen.
              </>
            ) : (
              <>
                Ready to create your own professional photos? Explore our{' '}
                <Link to="/preise" className="text-purple-700 underline hover:text-purple-900 font-medium">packages</Link>{' '}or{' '}
                <Link to="/kontakt" className="text-purple-700 underline hover:text-purple-900 font-medium">get in touch</Link>{' '}to plan your session.
              </>
            )}
          </p>
        </div>
      </section>
    </Layout>
  );
};

export default BlogPage;