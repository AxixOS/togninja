/**
 * UnifiedSetupWizard — the single onboarding wizard.
 *
 * Runs the entire onboarding as ONE continuous flow at ONE URL (/setup),
 * composing the existing technical steps and creative phases in a logical order
 * with a single progress bar:
 *
 *   Your studio  : Welcome, Business basics
 *   Infrastructure: Domain, Email, Payments, Storage, AI & extras
 *   Account      : Admin account
 *   Content      : Integrations, Scan, Fix-first, Starter content
 *
 * Each sub-component still owns its own save/validation via its existing API
 * calls; this container just sequences them and tracks progress.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { CheckCircle2, Circle, ArrowRight, Sparkles } from 'lucide-react';

// Technical steps
import WelcomeStep from './technical/WelcomeStep';
import DomainStep from './technical/DomainStep';
import EmailStep from './technical/EmailStep';
import StripeStep from './technical/StripeStep';
import StorageStep from './technical/StorageStep';
import ExtrasStep from './technical/ExtrasStep';
import SecurityStep from './technical/SecurityStep';
// Creative phases
import LookPhase from './phases/LookPhase';
import BasicsPhase from './phases/BasicsPhase';
import CalendarPhase from './phases/CalendarPhase';
import LeadSourcesPhase from './phases/LeadSourcesPhase';
import IntegrationsPhase from './phases/IntegrationsPhase';
import ScanningPhase from './phases/ScanningPhase';
import SiteImagesPhase from './phases/SiteImagesPhase';
import FixFirstPhase from './phases/FixFirstPhase';
import DraftsPhase from './phases/DraftsPhase';

interface StepDef {
  key: string;
  group: string;
  label: string;
  render: () => JSX.Element;
  /**
   * Does a studio need this before they can see their own site?
   *
   * Only three do. Everything else asks for a credential in front of a feature the studio
   * has not been shown yet — four integrations of friction before the one moment that
   * sells this product, which is seeing their website rebuilt. The rest is reachable from
   * Settings, and every feature that needs one of those keys now says so at the moment it
   * is needed (server/lib/capabilities.ts).
   */
  essential?: boolean;
}

export default function UnifiedSetupWizard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  // Which step they are on, kept across a reload.
  //
  // This was useState(0), so anything that remounted the component — a route rematch, a
  // refresh, a crashed tab restored — sent a studio back to step 1 with every answer they
  // had typed still saved on the server and no way to tell. Onboarding is the one screen
  // where losing your place is most expensive, because it reads as "none of that worked".
  //
  // sessionStorage rather than the URL: the step is not a thing to link to or go back
  // through, and it belongs to this sitting rather than to the machine.
  const STEP_KEY = 'setupStepIndex';
  const [index, setIndex] = useState<number>(() => {
    try {
      const raw = sessionStorage.getItem(STEP_KEY);
      const n = raw === null ? 0 : Number(raw);
      return Number.isFinite(n) && n >= 0 ? n : 0;
    } catch {
      return 0;
    }
  });

  const { data: setupStatus } = useQuery<any>({
    queryKey: ['setup-status'],
    queryFn: () => fetch('/api/setup/status').then((r) => r.json()),
  });
  const { data: techStatus } = useQuery<any>({
    queryKey: ['technical-setup-status'],
    queryFn: () => fetch('/api/setup/technical/status').then((r) => r.json()),
  });

  // Written on every move so a reload resumes where they were. Clamped on read rather than
  // here, because VISIBLE changes length when the studio switches to the long path.
  useEffect(() => {
    try { sessionStorage.setItem(STEP_KEY, String(index)); } catch {}
  }, [index]);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['setup-status'] });
    queryClient.invalidateQueries({ queryKey: ['technical-setup-status'] });
  };

  /**
   * Is the studio doing the short version?
   *
   * Default yes. A studio arriving for the first time gets three steps and their site;
   * everything else is offered afterwards and reachable from Settings for ever. Somebody
   * who WANTS the long version can have it, which is what the toggle is for — but it is
   * not the path a new buyer is dropped into.
   */
  const [essentialsOnly, setEssentialsOnly] = useState(true);

  const goNext = () => {
    refresh();
    // Finishing the last step means finishing setup. Clamping meant the essentials path —
    // the default one — ended on a button that did nothing.
    if (safeIndex >= VISIBLE.length - 1) {
      void finish();
      return;
    }
    setIndex((i) => Math.min(i + 1, VISIBLE.length - 1));
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const goBack = () => setIndex((i) => Math.max(i - 1, 0));
  const finish = async () => {
    try {
      await fetch('/api/setup/technical/complete', { method: 'POST' });
      await fetch('/api/setup/complete', { method: 'POST' });
    } catch {
      /* redirect regardless */
    }
    navigate('/admin');
  };

  const STEPS: StepDef[] = [
    { key: 'welcome', group: 'Your studio', label: 'Welcome', render: () => <WelcomeStep status={techStatus} onComplete={goNext} /> },
    // FIRST, and essential. Setup used to open with twelve fields about VAT numbers and
    // timezones, and a photographer saw nothing that looked like a website until the last
    // step. Somebody buying a product for photographers should be asked what they want it to
    // LOOK like before they are asked for their company registration.
    { key: 'look', group: 'Your studio', label: 'Choose your look', essential: true, render: () => <LookPhase onComplete={goNext} /> },
    { key: 'basics', group: 'Your studio', label: 'Business basics', essential: true, render: () => <BasicsPhase initialData={setupStatus?.phases?.basics?.data} onComplete={goNext} /> },
    { key: 'domain', group: 'Infrastructure', label: 'Domain & URLs', render: () => <DomainStep onComplete={goNext} onBack={goBack} /> },
    { key: 'email', group: 'Infrastructure', label: 'Email', render: () => <EmailStep onComplete={goNext} onBack={goBack} /> },
    { key: 'stripe', group: 'Infrastructure', label: 'Payments', render: () => <StripeStep onComplete={goNext} onBack={goBack} /> },
    { key: 'storage', group: 'Infrastructure', label: 'File storage', render: () => <StorageStep onComplete={goNext} onBack={goBack} /> },
    { key: 'extras', group: 'Infrastructure', label: 'AI & extras', render: () => <ExtrasStep onComplete={goNext} onBack={goBack} /> },
    { key: 'calendar', group: 'Infrastructure', label: 'Calendar', render: () => <CalendarPhase onComplete={goNext} /> },
    // Photographs BEFORE the account step, and marked essential.
    //
    // Two reasons, and the second is the one that matters. First: every studio finished
    // onboarding with no images at all, because the images step was not essential and the
    // essentials path is the default — homepage_images had zero rows and every landing page
    // had a null hero, which is why a finished draft still looked like a template.
    //
    // Second: it starts the website read and then gets out of its way. The crawl, the
    // partner fallback and the generation take up to a few minutes, and the studio's own
    // hands are free for all of it. Two useful things at once, rather than one of them
    // being watched.
    //
    // Only the site-wide slots. The service slots cannot be NAMED before the Authority Map
    // exists, so they stay behind the crawl in the later step.
    // only="all", not "site". The service slots were rendered NOWHERE in the wizard — the
    // component has always supported them and the endpoint has always returned them, but this
    // step asked for the three site-wide ones and no later step asked for the rest. A studio
    // finished onboarding having been shown three of nine, and the other six were reachable
    // only by knowing Website Studio existed.
    //
    // Showing them here costs no waiting: the site slots render immediately and the service
    // block polls, filling itself in when the crawl names the pages. Which is the same reason
    // the split was made in the first place — it just never needed to hide them.
    { key: 'photographs', group: 'Your studio', label: 'Your photographs', essential: true, render: () => <SiteImagesPhase only="all" startScan onComplete={goNext} /> },
    { key: 'security', group: 'Account', label: 'Admin account', essential: true, render: () => <SecurityStep onComplete={goNext} onBack={goBack} /> },
    { key: 'lead_sources', group: 'Content', label: 'Lead sources', render: () => <LeadSourcesPhase onComplete={goNext} /> },
    { key: 'integrations', group: 'Content', label: 'Integrations', render: () => <IntegrationsPhase status={setupStatus?.phases?.integrations} features={setupStatus?.features} onComplete={goNext} /> },
    // "Scan content" read as a website crawl. This step reads the data already in the
    // CRM (blog posts, gallery images, products, clients) — on a new studio that is
    // empty and finishes instantly, which looked like a broken website scan. The
    // website analysis is a separate, earlier step; it is what produces the homepage.
    // isLast so the button can say what it will actually do. In the essentials path this
    // IS the last step, and it was promising to continue to a Fix-first step that path
    // never shows.
    { key: 'scanning', group: 'Content', label: 'Review CRM data', essential: true, render: () => <ScanningPhase onComplete={goNext} isLast={safeIndex >= VISIBLE.length - 1} /> },
    // Images come AFTER scanning because that step triggers the website crawl, and half
    // the slots are per-service — unknowable until the Authority Map exists. It is also
    // after Storage, without which there is nowhere to put an upload.
    // The half that needed the crawl. Its site-wide slots were asked for at the
    // photographs step above, so this one shows the services.
    // Kept, not deleted. The photographs step above now offers every slot, so this is no
    // longer where a studio first meets the service images — but it is still the entry in the
    // long path for going back to them on their own, and deleting a step because a shorter
    // route also covers it is precisely what the 'deferral, not removal' rule exists to stop.
    { key: 'site_images', group: 'Content', label: 'Revisit service photographs', render: () => <SiteImagesPhase only="pillar" onComplete={goNext} /> },
    { key: 'fix_first', group: 'Content', label: 'Fix-first', render: () => <FixFirstPhase onComplete={goNext} /> },
    { key: 'drafts', group: 'Content', label: 'Starter content', render: () => <DraftsPhase onComplete={finish} /> },
  ];

  // What this run of the wizard actually walks. STEPS remains the full catalogue — nothing
  // is deleted, and a studio who wants every step still has them.
  const VISIBLE = essentialsOnly ? STEPS.filter((st) => st.essential) : STEPS;

  // A stale index after toggling would render the wrong step or crash on undefined.
  const safeIndex = Math.min(index, Math.max(VISIBLE.length - 1, 0));
  const last = Math.max(VISIBLE.length - 1, 0);
  const current = VISIBLE[safeIndex] || VISIBLE[0];
  const progressPct = last > 0 ? Math.round((safeIndex / last) * 100) : 0;

  // Group step indices for the sidebar
  const groups: { name: string; steps: { def: StepDef; idx: number }[] }[] = [];
  VISIBLE.forEach((def, idx) => {
    let g = groups.find((x) => x.name === def.group);
    if (!g) {
      g = { name: def.group, steps: [] };
      groups.push(g);
    }
    g.steps.push({ def, idx });
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Top progress bar */}
      <div className="fixed top-0 left-0 right-0 z-50">
        <Progress value={progressPct} className="h-1 rounded-none" />
      </div>

      <header className="bg-white/80 backdrop-blur-sm border-b sticky top-1 z-40">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-6">
          <div className="flex items-center gap-3 min-w-0">
            {/*
              The product's own mark, not a generic sparkle in a gradient box.

              Setup is the first screen a buyer ever sees and it did not carry the logo the
              rest of the app carries, so the wizard read as a different piece of software
              than the one they had just paid for. The file was already in client/public and
              AdminLayout has been using it all along.
            */}
            <img
              src="/togninja-logo.png"
              alt="TogNinja"
              className="h-9 w-auto shrink-0"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
            />
            <div className="min-w-0">
              <h1 className="text-lg font-semibold text-gray-900 leading-tight">Studio Setup</h1>
              <p className="text-sm text-gray-500 truncate">
                Step {safeIndex + 1} of {VISIBLE.length} &mdash; {current?.label}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            {/*
              A segment per step rather than one continuous bar.

              A bar at 0% tells someone nothing except that they have not started. Segments
              show the shape of what is ahead — how many steps there are, which one they are
              standing on — which is the question people actually have when they land here.
            */}
            <div className="hidden sm:flex items-center gap-1" aria-hidden="true">
              {VISIBLE.map((_, i) => (
                <span
                  key={i}
                  className={cn(
                    'h-1.5 rounded-full transition-all duration-500',
                    i < safeIndex && 'w-6 bg-emerald-500',
                    i === safeIndex && 'w-10 bg-blue-600 animate-pulse',
                    i > safeIndex && 'w-6 bg-gray-200',
                  )}
                />
              ))}
            </div>
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-gray-900 tabular-nums">{progressPct}% complete</p>
              {/* The long version, for somebody who wants it. Nothing was removed — the extra
                  steps are the same ones, and every credential they ask for is also reachable
                  from Settings, surfaced by the feature that needs it. */}
              <button
                type="button"
                onClick={() => { setEssentialsOnly((v) => !v); setIndex(0); }}
                className="mt-0.5 text-xs text-gray-500 hover:text-gray-900 underline underline-offset-2"
              >
                {essentialsOnly
                  ? `Set everything up now (${STEPS.length} steps)`
                  : 'Just the essentials'}
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-12 gap-8">
          {/* Sidebar */}
          <aside className="col-span-12 md:col-span-3">
            <nav className="space-y-5 md:sticky md:top-28">
              {/* Says the thing that makes the sidebar useful. Without it people treat a
                  wizard as one-way and carry a mistake all the way to the end. */}
              {index > 0 && (
                <p className="text-xs text-gray-500 px-1 -mb-2">
                  Click any completed step to go back and change it — nothing is lost.
                </p>
              )}
              {groups.map((g) => (
                <div key={g.name}>
                  <div className="text-xs uppercase tracking-wider text-gray-400 font-semibold mb-2 px-1">{g.name}</div>
                  <div className="space-y-1">
                    {g.steps.map(({ def, idx }) => {
                      const done = idx < index;
                      const active = idx === index;
                      const visited = idx <= index;
                      return (
                        <button
                          key={def.key}
                          onClick={() => visited && setIndex(idx)}
                          disabled={!visited}
                          // A completed step has always been clickable, but nothing said
                          // so — no pointer, no hint — so someone who realised at step 13
                          // that they had skipped their address assumed the wizard was
                          // one-way. The cursor and the title now say it out loud.
                          title={done ? `Go back to "${def.label}" — your answers are kept` : undefined}
                          className={cn(
                            'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-left transition-all',
                            visited && !active && 'cursor-pointer',
                            active && 'bg-blue-600 text-white shadow-sm',
                            !active && done && 'text-green-700 hover:bg-green-50',
                            !active && !done && visited && 'text-gray-700 hover:bg-gray-50',
                            !visited && 'text-gray-400 cursor-not-allowed'
                          )}
                        >
                          {done ? (
                            <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-green-500" />
                          ) : active ? (
                            <ArrowRight className="w-4 h-4 flex-shrink-0" />
                          ) : (
                            <Circle className="w-4 h-4 flex-shrink-0 opacity-40" />
                          )}
                          <span className="truncate">{def.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </nav>
          </aside>

          {/* Main content */}
          <main className="col-span-12 md:col-span-9">
            {/* The travelling border marks the card as the live one. Purely decorative —
                everything it signals is also written on the card. */}
            <Card className="setup-card-active rounded-xl shadow-xl border-0 bg-white/90 backdrop-blur-sm min-h-[500px]">
              {current.render()}
            </Card>
          </main>
        </div>
      </div>
    </div>
  );
}
