import { useEffect, useState } from 'react';
import { CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, Loader2, Palette } from 'lucide-react';
import { THEME_PRESETS } from '../../../../../shared/themePresets';
import { SITE_LAYOUTS, DEFAULT_LAYOUT_ID } from '../../../../../shared/siteLayouts';
import LookPreview from './LookPreview';

/**
 * The first thing a photographer is asked, and the first thing they see working.
 *
 * Until now setup opened with twelve form fields about VAT numbers and timezones, and the
 * studio did not see anything that looked like a website until the very last step — if they
 * got that far. Somebody buying a product for photographers should be asked what they want
 * it to LOOK like before they are asked for their company registration.
 *
 * Two questions, in the order that matters: the arrangement, then the palette. They are
 * genuinely independent (see shared/siteLayouts.ts), and both are changeable afterwards from
 * Settings, which the copy says out loud — a choice presented as permanent gets agonised over.
 *
 * Everything here is drawn from the same tokens the real site uses, so the previews are the
 * actual colours and the actual bones rather than an artist's impression that drifts.
 */

interface LookPhaseProps {
  onComplete: () => void;
}

export default function LookPhase({ onComplete }: LookPhaseProps) {
  const [layout, setLayout] = useState<string>(DEFAULT_LAYOUT_ID);
  const [theme, setTheme] = useState<string>('atelier');
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  // Whatever the studio already has, so re-entering this step does not silently reset it.
  useEffect(() => {
    fetch('/api/studio-config')
      .then((r) => r.json())
      .then((d) => {
        if (d?.siteTheme?.id) setTheme(d.siteTheme.id);
        if (d?.siteLayout?.id) setLayout(d.siteLayout.id);
      })
      .catch(() => { /* defaults stand */ })
      .finally(() => setLoaded(true));
  }, []);

  const save = async () => {
    setSaving(true);
    setProblem(null);
    try {
      // The SETUP endpoint, not the admin one it mirrors. /api/admin/site-layout and
      // /api/admin/site-theme are behind authenticateUser, and at this point in the wizard
      // there is no account yet — the admin user is created several steps later. Calling
      // those here would 401 on every save and silently keep the defaults.
      const r = await fetch('/api/setup/site-look', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ layout, theme }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || d?.ok === false) throw new Error('save failed');
      onComplete();
    } catch {
      // Not a blocker: both are changeable later, and stopping onboarding over a style
      // preference would be worse than carrying on with the default.
      setProblem('We could not save that just now — you can set it later under Settings, Style & homepage.');
    } finally {
      setSaving(false);
    }
  };

  if (!loaded) {
    return (
      <CardContent className="py-16 text-center text-sm text-gray-500">
        <Loader2 className="w-5 h-5 animate-spin mx-auto mb-3" />
        Loading&hellip;
      </CardContent>
    );
  }

  return (
    <>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center shrink-0">
            <Palette className="w-5 h-5 text-violet-600" />
          </div>
          <div>
            <CardTitle>Choose your look</CardTitle>
            <CardDescription>
              You can change either of these at any time &mdash; nothing here is permanent.
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-10">
        {/* ── What it will look like ──────────────────────────────────────
            First, and above both pickers, because it is the answer to the question the
            pickers ask. Two wireframes and nine type samples describe eighteen combinations
            without showing any of them, and a studio could only see one by finishing setup —
            so seeing all eighteen meant onboarding eighteen times. */}
        <section>
          <div className="flex items-baseline justify-between gap-4 mb-3">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Your site, as you choose</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Real pages, not a mock-up. Your own photographs and words replace these.
              </p>
            </div>
            <span className="text-xs text-gray-400 shrink-0">
              {SITE_LAYOUTS.find((l) => l.id === layout)?.name} · {THEME_PRESETS.find((t) => t.id === theme)?.name}
            </span>
          </div>
          <LookPreview themeId={theme} layoutId={layout} />
        </section>

        {/* ── Arrangement ─────────────────────────────────────────────────── */}
        <section>
          <h3 className="text-sm font-semibold text-gray-900">How your pages are put together</h3>
          <p className="text-xs text-gray-500 mt-0.5 mb-4">
            The bones of the page. Both work with every colour scheme below.
          </p>

          <div className="grid sm:grid-cols-2 gap-4">
            {SITE_LAYOUTS.map((l) => {
              const on = layout === l.id;
              return (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => setLayout(l.id)}
                  aria-pressed={on}
                  className={`text-left rounded-xl border-2 p-4 transition-all ${
                    on ? 'border-violet-500 bg-violet-50/40' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {/* A drawing of the composition, not a colour swatch — the palette is the
                      next question and mixing the two here would confuse them. */}
                  <div
                    aria-hidden="true"
                    className="h-24 rounded-lg bg-gray-100 p-2 mb-3 flex gap-1.5 overflow-hidden"
                  >
                    {l.id === 'editorial' ? (
                      <>
                        <div className="flex-1 bg-gray-400 rounded-sm" />
                        <div className="w-1/3 flex flex-col justify-end gap-1 pb-1">
                          <div className="h-2 bg-gray-400 rounded-sm" />
                          <div className="h-1 w-2/3 bg-gray-300 rounded-sm" />
                        </div>
                      </>
                    ) : (
                      <div className="flex-1 flex flex-col gap-1.5">
                        <div className="h-8 bg-gray-400 rounded-sm" />
                        <div className="flex-1 flex gap-1.5">
                          <div className="flex-1 bg-gray-300 rounded-sm" />
                          <div className="flex-1 bg-gray-300 rounded-sm" />
                          <div className="flex-1 bg-gray-300 rounded-sm" />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-gray-900">{l.name}</span>
                    {on && <Check className="w-4 h-4 text-violet-600 ml-auto" />}
                  </div>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">{l.description}</p>
                </button>
              );
            })}
          </div>
        </section>

        {/* ── Palette ─────────────────────────────────────────────────────── */}
        <section>
          <h3 className="text-sm font-semibold text-gray-900">Your colours</h3>
          <p className="text-xs text-gray-500 mt-0.5 mb-4">
            Shown as they will appear: ground, heading, and the colour your buttons use.
          </p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {THEME_PRESETS.map((t) => {
              const on = theme === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTheme(t.id)}
                  aria-pressed={on}
                  className={`text-left rounded-xl border-2 overflow-hidden transition-all ${
                    on ? 'border-violet-500' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {/* Rendered from the preset's real tokens, so what is shown here is what
                      the site will use rather than an approximation kept in step by hand. */}
                  <div className="p-4" style={{ background: t.colors.bg }}>
                    <div
                      className="text-sm font-semibold leading-tight"
                      style={{ color: t.colors.heading, fontFamily: t.fonts.heading }}
                    >
                      {t.name}
                    </div>
                    <div className="text-[0.7rem] mt-1 leading-snug" style={{ color: t.colors.muted }}>
                      Aa &mdash; the quick brown fox
                    </div>
                    <div className="flex items-center gap-1.5 mt-3">
                      <span
                        className="inline-block rounded px-2 py-1 text-[0.65rem] font-medium"
                        style={{ background: t.colors.primary, color: t.colors.onPrimary || '#fff' }}
                      >
                        Book now
                      </span>
                      <span
                        className="h-4 w-4 rounded-full shrink-0"
                        style={{ background: t.colors.accent }}
                      />
                    </div>
                  </div>
                  <div className="px-3 py-2 bg-white border-t border-gray-100 flex items-center gap-1.5">
                    <span className="text-[0.7rem] text-gray-500 truncate">{t.description.split('—')[0].trim()}</span>
                    {on && <Check className="w-3.5 h-3.5 text-violet-600 ml-auto shrink-0" />}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {problem && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            {problem}
          </div>
        )}
      </CardContent>

      <CardFooter className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onComplete} disabled={saving}>
          Skip for now
        </Button>
        <Button onClick={save} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          Continue
        </Button>
      </CardFooter>
    </>
  );
}
