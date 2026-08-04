import React from 'react';
import { useSearchParams } from 'react-router-dom';
import AdminLayout from '../../components/admin/AdminLayout';
import WebsiteWizard from './WebsiteWizard';
import ManualWebsiteUpdatePage from './ManualWebsiteUpdatePage';
import AuthorityMapPanel from '../../components/admin/AuthorityMapPanel';
import ThemesPanel from '../../components/admin/ThemesPanel';
import { Search, PencilRuler, Palette } from 'lucide-react';

/**
 * Website Studio — the single home for the site tools (was Website Wizard + Website
 * Analyzer + Manual Website Update). Tabs:
 *   Analyse   — scan/analyse the studio's site (feeds the Authority Map + content).
 *   Customise — edit pages, copy and images (the manual editor).
 *   Themes    — token style presets (coming soon; deferred).
 * Each tool renders `embedded` so only this page's AdminLayout wraps everything.
 */
type TabKey = 'analyse' | 'customise' | 'themes';
const TABS: { key: TabKey; label: string; icon: React.ComponentType<{ size?: number; className?: string }> }[] = [
  { key: 'analyse', label: 'Analyse', icon: Search },
  { key: 'customise', label: 'Customise', icon: PencilRuler },
  { key: 'themes', label: 'Themes', icon: Palette },
];

const WebsiteStudioPage: React.FC = () => {
  const [params, setParams] = useSearchParams();
  const raw = (params.get('tab') || 'analyse') as TabKey;
  const active: TabKey = TABS.some((t) => t.key === raw) ? raw : 'analyse';

  const setTab = (key: TabKey) => setParams((p) => { p.set('tab', key); return p; }, { replace: true });

  return (
    <AdminLayout>
      <div className="mb-4">
        <h1 className="text-2xl font-semibold text-gray-900">Website Studio</h1>
        <p className="text-gray-600">Analyse your site, customise every page, and (soon) switch styles — in one place.</p>
      </div>

      {/* Tab bar */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-1" aria-label="Website Studio tabs">
          {TABS.map((t) => {
            const Icon = t.icon;
            const on = active === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  on
                    ? 'border-purple-600 text-purple-700'
                    : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'
                }`}
                aria-current={on ? 'page' : undefined}
              >
                <Icon size={16} />
                {t.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab body */}
      {active === 'analyse' && (
        <>
          <AuthorityMapPanel />
          <WebsiteWizard />
        </>
      )}
      {active === 'customise' && <ManualWebsiteUpdatePage embedded />}
      {active === 'themes' && <ThemesPanel />}
    </AdminLayout>
  );
};

export default WebsiteStudioPage;
