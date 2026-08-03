import { useState, useCallback, useEffect } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import type { LandingPageSectionKey } from '../../types/landingPageEditor.types';
import type { LandingPageGeneratedContent } from '../../types/landingPageGeneration.types';
import type { LandingPageSeoState, LandingPageSectionVisibilityMap, LandingPageSectionOrder, LandingPagePublishReadinessResult, LandingPageSectionAlignmentMap, LandingPageSectionAlignment } from '../../types/landingPageEditor.types';
import type { LandingPageRecord } from '../../types/landingPage.types';
import LandingPageEditorToolbar from './LandingPageEditorToolbar';
import LandingPageSectionSidebar from './LandingPageSectionSidebar';
import LandingPageEditorCanvas from './LandingPageEditorCanvas';
import LandingPageSeoPanel from './LandingPageSeoPanel';
import LandingPageSlugPanel from './LandingPageSlugPanel';
import LandingPageSettingsPanel from './LandingPageSettingsPanel';
import LandingPagePublishReadinessPanel from './LandingPagePublishReadinessPanel';
import LandingPageRevisionPanel from './LandingPageRevisionPanel';
import LandingPageDuplicateDialog from './LandingPageDuplicateDialog';
import LandingPageRegenerateSectionDialog from './LandingPageRegenerateSectionDialog';
import { GrowthInsightsPanel } from '../growth/GrowthInsightsPanel';
import { AnalyticsOverview } from '../growth/AnalyticsOverview';
import { ExperimentPanel } from '../growth/ExperimentPanel';
import { PromoPackPanel } from '../growth/PromoPackPanel';
import { LandingPageAutomationPanel } from '../automation/LandingPageAutomationPanel';
import { LandingPageExecutionPanel } from '../execution/LandingPageExecutionPanel';
import { useLandingPageRevisions } from '../../hooks/useLandingPageRevisions';
import type { LandingPageSectionRegenerationMode } from '../../types/landingPageRegeneration.types';

interface Props {
  page: LandingPageRecord;
  content: LandingPageGeneratedContent;
  seo: LandingPageSeoState;
  title: string;
  sectionOrder: LandingPageSectionKey[];
  visibility: LandingPageSectionVisibilityMap;
  alignment: LandingPageSectionAlignmentMap;
  activeSection: LandingPageSectionKey | null;
  readiness: LandingPagePublishReadinessResult;
  isDirty: boolean;
  isSaving: boolean;
  lastSavedAt: string | null;
  saveError: string | null;
  regeneratingSection: LandingPageSectionKey | null;
  // Publishing
  pageStatus: 'draft' | 'published' | 'archived';
  publishedUrl: string | null;
  isPublishing: boolean;
  isUnpublishing: boolean;
  // Actions
  setActiveSection: (key: LandingPageSectionKey | null) => void;
  updateSection: (key: LandingPageSectionKey, data: unknown) => void;
  updateTitle: (title: string) => void;
  updateSeoField: (field: keyof LandingPageSeoState, value: string) => void;
  moveSectionUp: (key: LandingPageSectionKey) => void;
  moveSectionDown: (key: LandingPageSectionKey) => void;
  toggleVisibility: (key: LandingPageSectionKey) => void;
  setAlignment: (key: LandingPageSectionKey, align: LandingPageSectionAlignment) => void;
  removeSection: (key: LandingPageSectionKey) => void;
  save: () => Promise<void>;
  onBack: () => void;
  // Duplicate
  onDuplicate: () => void;
  isDuplicating: boolean;
  // AI: suggest recommended/optional fields (fills empties only)
  onSuggestFields: () => void;
  isSuggesting: boolean;
  // Regenerate
  onRegenerateSection: (key: LandingPageSectionKey, mode: string, customInstruction?: string) => void;
  // Publish
  onPublish: () => void;
  onUnpublish: () => void;
  onPreviewLink: () => void;
}

export default function LandingPageEditorLayout({
  page,
  content,
  seo,
  title,
  sectionOrder,
  visibility,
  alignment,
  activeSection,
  readiness,
  isDirty,
  isSaving,
  lastSavedAt,
  saveError,
  regeneratingSection,
  setActiveSection,
  updateSection,
  updateTitle,
  updateSeoField,
  moveSectionUp,
  moveSectionDown,
  toggleVisibility,
  setAlignment,
  removeSection,
  save,
  onBack,
  onDuplicate,
  isDuplicating,
  onSuggestFields,
  isSuggesting,
  onRegenerateSection,
  pageStatus,
  publishedUrl,
  isPublishing,
  isUnpublishing,
  onPublish,
  onUnpublish,
  onPreviewLink,
}: Props) {
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [regenerateDialogSection, setRegenerateDialogSection] = useState<LandingPageSectionKey | null>(null);

  // Resizable right panel (drag the divider). Width persists across sessions.
  const [panelWidth, setPanelWidth] = useState<number>(() => {
    try {
      const saved = Number(localStorage.getItem('lpEditorPanelWidth'));
      return saved >= 280 && saved <= 700 ? saved : 320;
    } catch { return 320; }
  });
  const startPanelResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const onMove = (ev: MouseEvent) => {
      const w = Math.min(700, Math.max(280, window.innerWidth - ev.clientX));
      setPanelWidth(w);
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      setPanelWidth((w) => {
        try { localStorage.setItem('lpEditorPanelWidth', String(w)); } catch {}
        return w;
      });
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, []);
  const { revisions, isLoading: revisionsLoading } = useLandingPageRevisions(String(page.id));

  // Right-panel tab is controlled so selecting "SEO" in the left section nav
  // switches the panel to its SEO tab (the SEO editor lives here, not in the
  // scrollable canvas).
  const [rightTab, setRightTab] = useState<string>('settings');
  useEffect(() => {
    if (activeSection === 'seo') setRightTab('seo');
  }, [activeSection]);

  const handleRegenerate = useCallback((key: LandingPageSectionKey) => {
    setRegenerateDialogSection(key);
  }, []);

  // Empty-section "Generate with AI" → generate from scratch immediately, no
  // mode dialog (there's nothing to pick a "regenerate mode" for yet).
  const handleGenerateDirect = useCallback((key: LandingPageSectionKey) => {
    onRegenerateSection(key, 'rewrite');
  }, [onRegenerateSection]);

  const handleRegenerateConfirm = useCallback((mode: LandingPageSectionRegenerationMode, customInstruction?: string) => {
    if (regenerateDialogSection) {
      onRegenerateSection(regenerateDialogSection, mode, customInstruction);
    }
    setRegenerateDialogSection(null);
  }, [regenerateDialogSection, onRegenerateSection]);

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Top toolbar */}
      <LandingPageEditorToolbar
        title={title}
        isDirty={isDirty}
        isSaving={isSaving}
        lastSavedAt={lastSavedAt}
        saveError={saveError}
        readinessIsReady={readiness.isReady}
        readinessErrorCount={readiness.errors.length}
        pageStatus={pageStatus}
        publishedUrl={publishedUrl}
        slug={seo.slug}
        isPublishing={isPublishing}
        isUnpublishing={isUnpublishing}
        onSave={save}
        onDuplicate={() => setDuplicateDialogOpen(true)}
        onBack={onBack}
        onPublish={onPublish}
        onUnpublish={onUnpublish}
        onPreviewLink={onPreviewLink}
        onSuggestFields={onSuggestFields}
        isSuggesting={isSuggesting}
      />

      {/* Three-panel body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar — section navigator */}
        <aside className="w-56 shrink-0 border-r bg-white overflow-y-auto p-3">
          <LandingPageSectionSidebar
            sectionOrder={sectionOrder}
            visibility={visibility}
            alignment={alignment}
            activeSection={activeSection}
            onSelect={setActiveSection}
            onToggleVisibility={toggleVisibility}
            onSetAlignment={setAlignment}
            onRegenerate={handleRegenerate}
          />
        </aside>

        {/* Center — editor canvas */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-3xl mx-auto">
            <LandingPageEditorCanvas
              content={content}
              sectionOrder={sectionOrder}
              visibility={visibility}
              activeSection={activeSection}
              regeneratingSection={regeneratingSection}
              onActivateSection={setActiveSection}
              onUpdateSection={updateSection}
              onMoveSectionUp={moveSectionUp}
              onMoveSectionDown={moveSectionDown}
              onToggleVisibility={toggleVisibility}
              onRemoveSection={removeSection}
              onRegenerate={handleRegenerate}
              onGenerateDirect={handleGenerateDirect}
            />
          </div>
        </main>

        {/* Drag handle — resize the right panel */}
        <div
          onMouseDown={startPanelResize}
          title="Drag to resize"
          className="w-1.5 shrink-0 cursor-col-resize bg-gray-100 hover:bg-purple-300 active:bg-purple-400 transition-colors"
        />

        {/* Right sidebar — settings / SEO / readiness (resizable) */}
        <aside style={{ width: panelWidth }} className="shrink-0 border-l bg-white overflow-y-auto">
          <Tabs value={rightTab} onValueChange={setRightTab}>
            {/* flex-wrap + h-auto: with 7 tabs the single-row list overflowed
                a narrow panel and pushed Settings/SEO (incl. the hero-image
                upload) out of reach. */}
            <TabsList className="w-full h-auto flex-wrap justify-start gap-1 border-b rounded-none bg-gray-50 px-2 pt-2 pb-2">
              {[
                { value: 'settings', label: 'Settings' },
                { value: 'seo', label: 'SEO' },
                { value: 'readiness', label: 'Readiness' },
                { value: 'revisions', label: 'Revisions' },
                { value: 'growth', label: 'Growth' },
                { value: 'automation', label: 'Automation' },
                { value: 'execution', label: 'Execution' },
              ].map((t) => (
                <TabsTrigger
                  key={t.value}
                  value={t.value}
                  // Clear active state: filled purple pill so the current tab
                  // is unmistakable; inactive tabs are muted with a hover.
                  // ! (important) beats the base TabsTrigger's data-[state=active]:bg-background,
                  // which otherwise wins at equal specificity and left the active tab looking
                  // like a faint white box instead of a clear purple pill.
                  className="text-xs rounded-md px-2.5 py-1 text-gray-600 hover:bg-gray-200 data-[state=active]:!bg-purple-600 data-[state=active]:!text-white data-[state=active]:!font-semibold data-[state=active]:!shadow-sm"
                >
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>

            <div className="p-4">
              <TabsContent value="settings" className="mt-0">
                <div className="space-y-6">
                  <LandingPageSettingsPanel
                    page={page}
                    title={title}
                    onTitleChange={updateTitle}
                  />
                  <LandingPageSlugPanel
                    slug={seo.slug}
                    pageId={page.id}
                    onChange={val => updateSeoField('slug', val)}
                  />
                </div>
              </TabsContent>

              <TabsContent value="seo" className="mt-0">
                <LandingPageSeoPanel
                  seo={seo}
                  onUpdate={updateSeoField}
                />
              </TabsContent>

              <TabsContent value="readiness" className="mt-0">
                <LandingPagePublishReadinessPanel readiness={readiness} />
              </TabsContent>

              <TabsContent value="revisions" className="mt-0">
                <LandingPageRevisionPanel revisions={revisions} isLoading={revisionsLoading} />
              </TabsContent>

              <TabsContent value="growth" className="mt-0">
                <div className="space-y-6">
                  <GrowthInsightsPanel landingPageId={String(page.id)} />
                  <AnalyticsOverview landingPageId={String(page.id)} />
                  <ExperimentPanel landingPageId={String(page.id)} />
                  <PromoPackPanel landingPageId={String(page.id)} />
                </div>
              </TabsContent>

              <TabsContent value="automation" className="mt-0">
                <LandingPageAutomationPanel landingPageId={String(page.id)} />
              </TabsContent>

              <TabsContent value="execution" className="mt-0">
                <LandingPageExecutionPanel landingPageId={String(page.id)} />
              </TabsContent>
            </div>
          </Tabs>
        </aside>
      </div>

      {/* Dialogs */}
      <LandingPageDuplicateDialog
        open={duplicateDialogOpen}
        onClose={() => setDuplicateDialogOpen(false)}
        pageTitle={title}
        onConfirm={() => {
          onDuplicate();
          setDuplicateDialogOpen(false);
        }}
        isDuplicating={isDuplicating}
      />

      <LandingPageRegenerateSectionDialog
        open={regenerateDialogSection !== null}
        onClose={() => setRegenerateDialogSection(null)}
        sectionKey={regenerateDialogSection}
        isRegenerating={regeneratingSection !== null}
        onConfirm={handleRegenerateConfirm}
      />
    </div>
  );
}
