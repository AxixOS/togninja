/**
 * Public Landing Page — /lp/:slug
 *
 * Phase 4: Modular renderer with SEO metadata, JSON-LD schema,
 * canonical URLs, section visibility, preview token support, and CTA tracking.
 *
 * Language: German is the authoring language. A small DE/EN switch lets the
 * visitor read the page in English — the server deep-translates the copy on the
 * fly (?language=en) and caches it, so the studio only authors once.
 */
import { useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { PublicLandingPageRenderer } from '@/features/landing-pages/components/public/PublicLandingPageRenderer';
import { PublicLandingPageNotFound } from '@/features/landing-pages/components/public/PublicLandingPageNotFound';

type Lang = 'de' | 'en';

function LanguageSwitch({
  value,
  onChange,
  busy,
}: {
  value: Lang;
  onChange: (l: Lang) => void;
  busy: boolean;
}) {
  return (
    <div className="fixed top-3 right-3 z-50 flex items-center rounded-full border border-black/10 bg-white/90 backdrop-blur px-1 py-1 shadow-sm">
      {busy && <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-400 ml-1 mr-0.5" />}
      {(['de', 'en'] as Lang[]).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => onChange(l)}
          aria-pressed={value === l}
          className={`px-2.5 py-1 text-xs font-semibold rounded-full transition-colors ${
            value === l ? 'bg-gray-900 text-white' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

export default function PublicLandingPage({ slugOverride }: { slugOverride?: string } = {}) {
  const { slug: paramSlug } = useParams<{ slug: string }>();
  const slug = slugOverride || paramSlug;
  const [searchParams] = useSearchParams();
  const previewToken = searchParams.get('preview');
  // ?lang=en deep-links a visitor straight to the English rendering.
  const initialLang: Lang = searchParams.get('lang') === 'en' ? 'en' : 'de';
  const [language, setLanguage] = useState<Lang>(initialLang);

  const { data: page, isLoading, isFetching, error } = useQuery({
    queryKey: ['/api/lp', slug, previewToken, language],
    queryFn: () => {
      const params = new URLSearchParams();
      if (previewToken) params.set('preview', previewToken);
      if (language !== 'de') params.set('language', language);
      const qs = params.toString();
      return fetch(`/api/lp/${slug}${qs ? `?${qs}` : ''}`).then(r => {
        if (!r.ok) throw new Error('Page not found');
        return r.json();
      });
    },
    enabled: !!slug,
    placeholderData: keepPreviousData,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="h-8 w-8 text-purple-500 animate-spin" />
      </div>
    );
  }

  if (error || !page) {
    return <PublicLandingPageNotFound />;
  }

  const isPreview = !!page._isPreview;

  return (
    <>
      <LanguageSwitch value={language} onChange={setLanguage} busy={isFetching} />
      <PublicLandingPageRenderer
        page={page}
        isPreview={isPreview}
        previewExpiresAt={isPreview ? page.preview_token_expires_at : null}
      />
    </>
  );
}
