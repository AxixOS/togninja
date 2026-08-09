import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { Calendar, ChevronRight, Loader2, Star, Camera } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { SEOHead } from '../components/SEO/SEOHead';
import { Helmet } from 'react-helmet-async';
import { SITE } from '../config/site';

interface CaseStudyPost {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  imageUrl?: string;
  publishedAt?: string;
  tags?: string[];
}

// Case studies are ordinary blog posts carrying the "case-study" tag (see
// server/seed-case-studies.ts). This page is just a curated index over them, so
// they inherit the blog's SEO, sitemap, IndexNow and social-pack machinery.
const CASE_STUDY_TAG = 'case-study';

const CaseStudiesPage: React.FC = () => {
  const { language } = useLanguage();
  const de = language === 'de';
  const [posts, setPosts] = useState<CaseStudyPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          published: 'true',
          language,
          tag: CASE_STUDY_TAG,
          limit: '50',
        });
        const res = await fetch(`/api/blog/posts?${params.toString()}`);
        const data = res.ok ? await res.json() : { posts: [] };
        if (cancelled) return;
        // Defensive: also accept the German "fallstudie" tag in case a post was
        // tagged only in German.
        const list: CaseStudyPost[] = (data.posts || []).filter((p: CaseStudyPost) =>
          (p.tags || []).some((t) => /case[\s-]?study|fallstudie/i.test(t)),
        );
        setPosts(list.length ? list : data.posts || []);
      } catch {
        if (!cancelled) setPosts([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [language]);

  const formatDate = (d?: string) => {
    if (!d) return '';
    try {
      return new Date(d).toLocaleDateString(de ? 'de-AT' : 'en-GB', {
        year: 'numeric', month: 'long', day: 'numeric',
      });
    } catch { return ''; }
  };

  const heroTitle = de ? 'Fallstudien' : 'Case Studies';
  const heroSubtitle = de
    ? 'Echte Shootings, echte Familien, echte Ergebnisse – jede Fallstudie zeigt Ausgangslage, unseren Ansatz und das Resultat, belegt mit echten Google-Bewertungen.'
    : 'Real shoots, real families, real results — each case study shows the starting point, our approach and the outcome, backed by genuine Google reviews.';

  return (
    <Layout>
      <SEOHead
        title={de ? `Fallstudien | ${SITE.name}` : `Case Studies | ${SITE.name}`}
        description={de
          ? 'Fotografie-Fallstudien aus Wien: Familien-, Schwangerschafts- und Business-Shootings – Ausgangslage, Ablauf und Ergebnis, mit echten Kundenbewertungen.'
          : 'Photography case studies from Vienna: family, maternity and business shoots — the challenge, our approach and the result, with genuine client reviews.'}
        keywords={de
          ? 'Fallstudien Fotografie Wien, Familienshooting Beispiel, Business Portrait Fallstudie'
          : 'photography case studies Vienna, family shoot example, business portrait case study'}
        canonical="/case-studies/"
        ogImage={undefined}
        hreflang={[
          { lang: 'de', url: '/case-studies/' },
          { lang: 'en', url: '/en/case-studies/' },
          { lang: 'x-default', url: '/case-studies/' },
        ]}
      />

      {/* CollectionPage structured data */}
      <Helmet>
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            name: de ? 'Fallstudien' : 'Case Studies',
            url: `${SITE.url}/case-studies/`,
            isPartOf: { '@type': 'WebSite', name: SITE.name, url: SITE.url },
            about: { '@type': 'PhotoStudio', name: SITE.name, url: SITE.url },
          })}
        </script>
      </Helmet>

      {/* Hero */}
      <section className="bg-gradient-to-br from-purple-50 via-white to-pink-50 py-16 md:py-20">
        <div className="container mx-auto px-4 text-center max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full bg-purple-100 px-4 py-1.5 text-sm font-semibold text-purple-700 mb-4">
            <Camera className="h-4 w-4" /> {de ? 'Aus dem Studio' : 'From the studio'}
          </span>
          <h1 className="text-4xl md:text-5xl font-bold text-purple-900 mb-4">{heroTitle}</h1>
          <p className="text-lg text-gray-700">{heroSubtitle}</p>
        </div>
      </section>

      {/* List */}
      <section className="py-14">
        <div className="container mx-auto px-4 max-w-5xl">
          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-10 w-10 text-purple-600 animate-spin" />
            </div>
          ) : posts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {posts.map((post) => (
                <article
                  key={post.id}
                  className="bg-white rounded-lg shadow-md overflow-hidden transition-transform hover:shadow-lg hover:-translate-y-1"
                >
                  <Link to={`/blog/${post.slug}`} className="block aspect-[14/9] overflow-hidden bg-gray-100">
                    {post.imageUrl ? (
                      <img
                        src={post.imageUrl}
                        alt={post.title}
                        loading="lazy"
                        className="w-full h-full object-cover transition-transform hover:scale-105"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-purple-100 to-purple-200 flex items-center justify-center">
                        <Camera className="h-12 w-12 text-purple-400" />
                      </div>
                    )}
                  </Link>
                  <div className="p-6">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-purple-600 mb-3">
                      <Star className="h-3.5 w-3.5 fill-current text-yellow-400" />
                      {de ? 'Fallstudie' : 'Case Study'}
                    </span>
                    <h2 className="text-xl font-bold text-gray-800 mb-2 line-clamp-2">
                      <Link to={`/blog/${post.slug}`} className="hover:text-purple-600 transition-colors">
                        {post.title}
                      </Link>
                    </h2>
                    {post.excerpt && <p className="text-gray-600 mb-4 line-clamp-3">{post.excerpt}</p>}
                    {post.publishedAt && (
                      <div className="flex items-center text-sm text-gray-500 mb-3">
                        <Calendar size={14} className="mr-1" />
                        {formatDate(post.publishedAt)}
                      </div>
                    )}
                    <Link
                      to={`/blog/${post.slug}`}
                      className="text-purple-600 hover:text-purple-800 font-medium text-sm inline-flex items-center"
                    >
                      {de ? 'Fallstudie lesen' : 'Read the case study'}
                      <ChevronRight size={16} className="ml-1" />
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 max-w-xl mx-auto">
              <Camera className="h-12 w-12 text-purple-300 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-800 mb-2">
                {de ? 'Fallstudien folgen in Kürze' : 'Case studies coming soon'}
              </h2>
              <p className="text-gray-600 mb-6">
                {de
                  ? 'Wir bereiten gerade unsere ersten Fallstudien vor. In der Zwischenzeit sehen Sie unsere Arbeit im Blog.'
                  : 'We’re preparing our first case studies. In the meantime, see our work on the blog.'}
              </p>
              <Link
                to="/blog"
                className="inline-flex items-center rounded-full bg-purple-600 px-6 py-3 font-semibold text-white hover:bg-purple-700 transition-colors"
              >
                {de ? 'Zum Blog' : 'Visit the blog'}
              </Link>
            </div>
          )}

          {/* CTA */}
          <div className="mt-16 text-center bg-purple-50 rounded-2xl p-8">
            <h2 className="text-2xl font-bold text-purple-900 mb-2">
              {de ? 'Bereit für Ihr eigenes Shooting?' : 'Ready for your own shoot?'}
            </h2>
            <p className="text-gray-700 mb-6">
              {de
                ? 'Erzählen Sie uns von Ihrer Idee – wir melden uns in der Regel innerhalb 1 Stunde.'
                : 'Tell us about your idea — we typically reply within 1 hour.'}
            </p>
            <Link
              to="/warteliste"
              className="inline-flex items-center rounded-full bg-purple-600 px-8 py-3 font-semibold text-white hover:bg-purple-700 transition-colors"
            >
              {de ? 'Termin anfragen' : 'Book a session'}
            </Link>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default CaseStudiesPage;
