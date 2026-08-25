/**
 * UnifiedSetupWizard â€” the single onboarding wizard.
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

import { useState } from 'react';
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
  const [index, setIndex] = useState(0);

  const { data: setupStatus } = useQuery<any>({
    queryKey: ['setup-status'],
    queryFn: () => fetch('/api/setup/status').then((r) => r.json()),
  });
  const { data: techStatus } = useQuery<any>({
    queryKey: ['technical-setup-status'],
    queryFn: () => fetch('/api/setup/technical/status').then((r) => r.json()),
  });

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
    { key: 'basics', group: 'Your studio', label: 'Business basics', essential: true, render: () => <BasicsPhase initialData={setupStatus?.phases?.basics?.data} onComplete={goNext} /> },
    { key: 'domain', group: 'Infrastructure', label: 'Domain & URLs', render: () => <DomainStep onComplete={goNext} onBack={goBack} /> },
    { key: 'email', group: 'Infrastructure', label: 'Email', render: () => <EmailStep onComplete={goNext} onBack={goBack} /> },
    { key: 'stripe', group: 'Infrastructure', label: 'Payments', render: () => <StripeStep onComplete={goNext} onBack={goBack} /> },
    { key: 'storage', group: 'Infrastructure', label: 'File storage', render: () => <StorageStep onComplete={goNext} onBack={goBack} /> },
    { key: 'extras', group: 'Infrastructure', label: 'AI & extras', render: () => <ExtrasStep onComplete={goNext} onBack={goBack} /> },
    { key: 'calendar', group: 'Infrastructure', label: 'Calendar', render: () => <CalendarPhase onComplete={goNext} /> },
    { key: 'security', group: 'Account', label: 'Admin account', essential: true, render: () => <SecurityStep onComplete={goNext} onBack={goBack} /> },
    { key: 'lead_sources', group: 'Content', label: 'Lead sources', render: () => <LeadSourcesPhase onComplete={goNext} /> },
    { key: 'integrations', group: 'Content', label: 'Integrations', render: () => <IntegrationsPhase status={setupStatus?.phases?.integrations} features={setupStatus?.features} onComplete={goNext} /> },
    // "Scan content" read as a website crawl. This step reads the data already in the
    // CRM (blog posts, gallery images, products, clients) â€” on a new studio that is
    // empty and finishes instantly, which looked like a broken website scan. The
    // website analysis is a separate, earlier step; it is what produces the homepage.
    { key: 'scanning', group: 'Content', label: 'Review CRM data', essential: true, render: () => <ScanningPhase onComplete={goNext} /> },
    // Images come AFTER scanning because that step triggers the website crawl, and half
    // the slots are per-service â€” unknowable until the Authority Map exists. It is also
    // after Storage, without which there is nowhere to put an upload.
    { key: 'site_images', group: 'Content', label: 'Your photographs', render: () => <SiteImagesPhase onComplete={goNext} /> },
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
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Studio Setup</h1>
              <p className="text-sm text-gray-500">Step {safeIndex + 1} of {VISIBLE.length} — {current?.label}</p>
            </div>
          </div>
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-gray-900">{progressPct}% complete</p>
            <Progress value={progressPct} className="w-32 h-2" />
            {/* The long version, for somebody who wants it. Nothing was removed — the extra
                steps are the same ones, and every credential they ask for is also reachable
                from Settings, surfaced by the feature that needs it. */}
            <button
              type="button"
              onClick={() => { setEssentialsOnly((v) => !v); setIndex(0); }}
              className="mt-1 text-xs text-gray-500 hover:text-gray-800 underline"
            >
              {essentialsOnly
                ? `Set everything up now (${STEPS.length} steps)`
                : 'Just the essentials'}
            </button>
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
                  Click any completed step to go back and change it â€” nothing is lost.
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
                          // so â€” no pointer, no hint â€” so someone who realised at step 13
                          // that they had skipped their address assumed the wizard was
                          // one-way. The cursor and the title now say it out loud.
                          title={done ? `Go back to "${def.label}" â€” your answers are kept` : undefined}
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
            <Card className="shadow-xl border-0 bg-white/90 backdrop-blur-sm min-h-[500px]">
              {current.render()}
            </Card>
          </main>
        </div>
      </div>
    </div>
  );
}
