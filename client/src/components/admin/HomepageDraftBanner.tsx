import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, X, ArrowRight } from 'lucide-react';

/**
 * Post-onboarding handoff for the AI-generated homepage. During onboarding the wizard
 * (unauthenticated) crawls the studio's old site and creates a DRAFT landing page; this
 * banner surfaces it once the owner logs in, linking to the editor to review/publish and
 * set it as the homepage. Reads GET /api/admin/homepage-draft (returns {draftId} = null
 * when there's nothing to show). Hides itself once the draft is published AND live at "/".
 */
export default function HomepageDraftBanner() {
  const [draft, setDraft] = useState<any>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/admin/homepage-draft');
        if (res.ok && !cancelled) {
          const d = await res.json();
          setDraft(d);
          // Dismissal persists per-draft: a re-generated draft (new id) shows again.
          if (d?.draftId && localStorage.getItem(`homepageDraftDismissed:${d.draftId}`)) {
            setDismissed(true);
          }
        }
      } catch { /* no-op */ }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    if (draft?.draftId) localStorage.setItem(`homepageDraftDismissed:${draft.draftId}`, '1');
  };

  if (dismissed || !draft?.draftId) return null;
  if (draft.status === 'published' && draft.isHomepage) return null;

  const isPublished = draft.status === 'published';
  return (
    <div className="rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 p-4 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
          <Sparkles className="w-5 h-5 text-indigo-600" />
        </div>
        <div>
          <p className="font-semibold text-gray-900 text-sm">Your AI-generated homepage draft is ready</p>
          <p className="text-xs text-gray-600">
            {isPublished ? 'Review it and set it as your homepage.' : 'Review, edit and publish it, then set it as your homepage.'}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Link
          to={`/admin/landing-pages/${draft.draftId}`}
          className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-3 py-2 rounded-lg"
        >
          Review &amp; edit <ArrowRight className="w-4 h-4" />
        </Link>
        <button onClick={handleDismiss} className="text-gray-400 hover:text-gray-600 p-1" aria-label="Dismiss">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
